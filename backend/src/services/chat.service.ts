import { callDeepSeek, streamDeepSeek } from '../ai/models/deepseek.js'
import * as messageService from './message.service.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

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

export async function chatWithAI(messages: ChatMessage[]) {
  const result = await callDeepSeek([systemMessage, ...messages])

  return {
    answer: result.choices[0]?.message.content ?? '',
    model: result.model,
    usage: result.usage,
  }
}
export async function* chatWithAIStream(messages: ChatMessage[], signal?: AbortSignal) {
  const allMessages = [systemMessage, ...messages]

  for await (const chunk of streamDeepSeek(allMessages, signal)) {
    yield chunk
  }
}

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

  // 2. 查询最近 20 条消息
  const history = await messageService.getRecentMessages(conversationId, 20)

  // 3. 转换成 AI 所需格式
  const messages: ChatMessage[] = history.map((item) => ({
    role: item.role,
    content: item.content,
  }))

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
