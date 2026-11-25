/**
 * DeepSeek 模型调用封装
 * ============================================================
 * 本文件只负责与 DeepSeek 的 Chat Completions HTTP 接口通信，
 * 不包含业务逻辑（如拼接系统提示词、落库等），方便复用与替换模型。
 *
 * 提供两种调用方式：
 * 1. callDeepSeek：一次性返回完整回答（stream: false）；
 * 2. streamDeepSeek：以异步生成器的方式逐段返回内容（stream: true），
 *    适合 SSE 流式输出，能显著降低用户等待、改善体验。
 *
 * 接口协议参考：POST {baseURL}/chat/completions
 */

import { aiConfig } from '../../config/ai.config.js'

/**
 * 单条对话消息（与 OpenAI/DeepSeek 的消息结构保持一致）
 * - system：系统提示词，用于约束模型角色与行为；
 * - user：用户输入；
 * - assistant：模型历史回复。
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 非流式接口的响应结构（仅声明本项目用到的字段）
 * 注意：真实响应字段更多，这里只保留必要部分，避免过度类型约束。
 */
interface DeepSeekResponse {
  id: string // 本次请求 ID
  model: string // 实际使用的模型名
  choices: {
    message: {
      role: string
      content: string
    }
    // 结束原因，例如 stop、length 等
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number // 输入 token 数
    completion_tokens: number // 输出 token 数
    total_tokens: number // 总 token 数
  }
}

/**
 * 非流式调用：等待模型生成完整回答后一次性返回
 * @param messages 完整对话上下文（含 system 消息）
 * @returns DeepSeek 原始响应
 * @throws 未配置 API Key、HTTP 请求失败时抛出错误
 */
export async function callDeepSeek(messages: ChatMessage[]): Promise<DeepSeekResponse> {
  // 配置缺失属于部署问题，尽早失败并给出明确提示
  if (!aiConfig.apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置')
  }

  const response = await fetch(`${aiConfig.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 使用 Bearer Token 方式鉴权
      Authorization: `Bearer ${aiConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: aiConfig.model,
      messages,
      stream: false,
    }),
    // 60 秒超时，避免请求长时间挂起占用连接
    signal: AbortSignal.timeout(60000),
  })

  // HTTP 状态码非 2xx 时，读取响应文本以保留服务端错误信息，便于排查
  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(`DeepSeek API 请求失败：${response.status} ${errorText}`)
  }

  return response.json() as Promise<DeepSeekResponse>
}

/**
 * 流式调用：以异步生成器逐段产出增量文本
 * @param messages 完整对话上下文（含 system 消息）
 * @param signal 可选的取消信号，用于客户端断开连接时中止上游请求
 * @yields 模型返回的增量文本片段（delta）
 *
 * 为什么用 AsyncGenerator？
 * - 调用方可以用 `for await (const chunk of ...)` 逐段消费；
 * - 生产者（fetch 流）与消费者（HTTP 响应写入）解耦，代码更直观。
 */
export async function* streamDeepSeek(
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (!aiConfig.apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置')
  }

  const response = await fetch(`${aiConfig.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: aiConfig.model,
      messages,
      // 开启流式返回，服务端会以 SSE 形式持续推送数据
      stream: true,
    }),
    // 优先使用调用方传入的取消信号，否则退化为 60 秒超时
    signal: signal ?? AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek API 请求失败：${response.status} ${errorText}`)
  }

  // 流式响应必须存在 body，否则无法读取
  if (!response.body) {
    throw new Error('DeepSeek 未返回流式数据')
  }

  // reader 用于按块读取原始字节流；decoder 用于将字节解码为字符串
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  // buffer 保存"尚未构成完整事件"的残余数据
  // 原因：网络分片不保证按 SSE 事件边界切分，一个事件可能被拆到多次 read 中
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      // 流结束
      if (done) break

      // stream: true 表示允许跨块解码多字节字符（避免中文/emoji 被截断）
      buffer += decoder.decode(value, { stream: true })
      // 统一换行符，便于后续按 \n\n 切分事件
      buffer = buffer.replace(/\r\n/g, '\n')

      // SSE 事件之间用空行（\n\n）分隔
      // 最后一个片段可能不完整，先留在 buffer 中等待下一次读取
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        // 一个事件可能包含多行 data:，按协议用换行拼接
        const data = event
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n')

        // 跳过空事件与结束标记
        if (!data || data === '[DONE]') continue

        const parsed = JSON.parse(data)

        // 流式响应的增量内容位于 choices[0].delta.content
        const content = parsed.choices?.[0]?.delta?.content

        if (typeof content === 'string' && content) {
          yield content
        }
      }
    }

    // 流结束后刷新 decoder 内部缓冲，并处理 buffer 中最后一个可能未以 \n\n 结尾的事件
    buffer += decoder.decode()

    if (buffer.trim()) {
      const data = buffer
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n')

      if (data && data !== '[DONE]') {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content

        if (typeof content === 'string' && content) {
          yield content
        }
      }
    }
  } finally {
    // 无论正常结束还是异常/取消，都释放读取锁，避免资源泄漏
    reader.releaseLock()
  }
}
