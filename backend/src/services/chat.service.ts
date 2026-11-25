/**
 * AI 对话业务服务
 * ------------------------------------------------------------
 * 负责把"模型调用"与"业务编排"组合起来：
 * - chatWithAI：一次性回答（自动附加系统提示词）；
 * - chatWithAIStream：流式回答（自动附加系统提示词）；
 * - chatWithConversation：按会话持久化的流式回答，
 *   负责保存用户消息、读取历史上下文、流式生成并最终落库 AI 回答。
 *
 * 分层说明：本层不应直接写 HTTP 细节（res/req），只处理业务数据。
 */

import { callDeepSeek, streamDeepSeek } from '../ai/models/deepseek.js'
import * as messageService from './message.service.js'

/**
 * 对话消息结构（与模型接口保持一致）
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 全局系统提示词
 * 定义模型的身份、职责与回答约束。
 * 抽成常量可避免在多个方法中重复维护同一段文本。
 */
const systemMessage: ChatMessage = {
  role: 'system',
  content: `
你是一个 AI 技术助手，通过 DeepSeek API 提供服务。

你的主要职责是帮助用户解决前端、后端和人工智能应用开发问题。

请遵守以下规则：
1. 使用中文回答。
2. 不得声称自己是 Claude、GPT 或其他模型。
3. 不确定的信息必须明确说明。
4. 回答技术问题时，尽量解释原理并提供可运行的代码。
5. 不要编造自己的知识截止日期或技术能力。
`,
}

/**
 * 非流式对话
 * @param messages 前端传入的对话历史（不含 system）
 * @returns 规范化后的结果：answer / model / usage
 */
export async function chatWithAI(messages: ChatMessage[]) {
  const result = await callDeepSeek([systemMessage, ...messages])

  return {
    // 正常情况下 choices 至少有一项；使用可选链兜底，避免异常响应导致崩溃
    answer: result.choices[0]?.message.content ?? '',
    model: result.model,
    usage: result.usage,
  }
}

/**
 * 流式对话（无状态）
 * 将系统提示词拼接在消息列表最前面，再透传模型返回的增量文本。
 *
 * 为什么用 async generator？
 * - 调用方可以逐段消费，配合 SSE 实时写给浏览器；
 * - 便于在 for-await 循环中统一处理取消信号。
 *
 * @param messages 前端传入的对话历史（不含 system）
 * @param signal 取消信号，透传给底层 fetch
 */
export async function* chatWithAIStream(messages: ChatMessage[], signal?: AbortSignal) {
  const allMessages = [systemMessage, ...messages]

  for await (const chunk of streamDeepSeek(allMessages, signal)) {
    yield chunk
  }
}

/**
 * 会话内流式对话（持久化）
 * 执行流程：
 * 1. 校验输入非空；
 * 2. 先把用户消息写入数据库；
 * 3. 读取该会话最近 20 条消息作为上下文（此时已包含刚写入的用户消息）；
 * 4. 流式生成回答，边生成边 yield 给控制器；
 * 5. 无论成功、异常还是被取消，都在 finally 中把已生成的内容写入数据库。
 *
 * 为什么要放 finally？
 * - 用户在生成中途点击"停止"时，已经生成的部分内容也应保留；
 * - 发生异常时同样保留已有片段，避免上下文断裂。
 * - 内容为空（完全没有生成）时不写入，避免出现空消息。
 *
 * @param conversationId 会话 ID
 * @param content 本次用户输入
 * @param signal 取消信号
 */
export async function* chatWithConversation(
  conversationId: string,
  content: string,
  signal?: AbortSignal,
) {
  if (!content.trim()) {
    throw new Error('消息内容不能为空')
  }

  // 1. 保存用户消息
  await messageService.createMessage({
    conversationId,
    role: 'user',
    content,
  })

  // 2. 查询最近 20 条消息（按时间正序返回，便于直接构造成上下文）
  const history = await messageService.getRecentMessages(conversationId, 20)

  // 3. 转换成 AI 所需格式（去掉数据库额外字段，如 id/created_at）
  const messages: ChatMessage[] = history.map((item) => ({
    role: item.role,
    content: item.content,
  }))

  // 用于聚合完整回答，便于最终落库
  let answer = ''

  try {
    for await (const chunk of chatWithAIStream(messages, signal)) {
      answer += chunk
      yield chunk
    }
  } finally {
    if (answer.trim()) {
      await messageService.createMessage({
        conversationId,
        role: 'assistant',
        content: answer,
      })
    }
  }
}
