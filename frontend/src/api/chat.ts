/**
 * 聊天相关 API 封装
 * ------------------------------------------------------------
 * 统一收敛与后端的 HTTP 交互：
 * - 会话：列表 / 创建 / 改名 / 删除；
 * - 消息：按会话查询历史；
 * - 聊天：SSE 流式请求并逐段回调。
 *
 * 约定：
 * - 后端统一响应体为 { code, message, data }；
 * - 本文件对外返回 `data`，把 HTTP/业务细节挡在 API 层内；
 * - 后端字段是下划线命名（created_at），交由调用方按需转换。
 */

/** 会话 DTO：后端返回的原始结构 */
export interface ConversationDTO {
  id: string
  title: string
  created_at: string
  updated_at: string
}

/** 后端统一响应体 */
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** SSE 中每个 data 事件解析后的结构 */
interface StreamChunk {
  content: string
}

/** 流式聊天参数 */
interface StreamOptions {
  conversationId: string
  content: string
  signal?: AbortSignal
  onMessage: (content: string) => void
}

/**
 * 获取会话列表
 * GET /api/conversations
 * @returns 会话数组（后端已按 updated_at 倒序）
 */
export async function getConversations() {
  const response = await fetch('/api/conversations')

  if (!response.ok) {
    throw new Error(`获取会话列表失败：HTTP ${response.status}`)
  }

  const result = (await response.json()) as ApiResponse<ConversationDTO[]>

  return result.data
}

/** 消息 DTO：后端返回的原始结构 */
export interface MessageDTO {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

/**
 * 获取指定会话的历史消息
 * GET /api/conversations/:id/messages
 * @returns 按时间正序排列的消息数组
 */
export async function getMessages(conversationId: string) {
  const response = await fetch(`/api/conversations/${conversationId}/messages`)

  if (!response.ok) {
    throw new Error('获取历史消息失败')
  }

  const result = (await response.json()) as ApiResponse<MessageDTO[]>

  return result.data
}

/**
 * 创建会话
 * POST /api/conversations
 * @param title 可选标题；不传时后端会使用默认标题
 */
export async function createConversation(title?: string) {
  const response = await fetch('/api/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  })

  if (!response.ok) {
    throw new Error(`创建会话失败：HTTP ${response.status}`)
  }

  const result = (await response.json()) as ApiResponse<ConversationDTO>

  return result.data
}

/**
 * 更新会话标题
 * PATCH /api/conversations/:id/title
 */
export async function renameConversation(conversationId: string, title: string) {
  const response = await fetch(`/api/conversations/${conversationId}/title`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  })

  if (!response.ok) {
    throw new Error('更新会话标题失败')
  }

  const result = (await response.json()) as ApiResponse<ConversationDTO>

  return result.data
}

/**
 * 删除会话
 * DELETE /api/conversations/:id
 */
export async function deleteConversation(id: string) {
  const response = await fetch(`/api/conversations/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`删除会话失败：HTTP ${response.status}`)
  }
}

/**
 * 流式聊天
 * POST /api/conversations/:id/chat/stream
 *
 * 实现要点：
 * 1. 使用 fetch 读取 ReadableStream，而不是 EventSource
 *    （EventSource 只支持 GET，无法携带请求体与自定义头）；
 * 2. SSE 事件以空行 \n\n 分隔，需要自行解析；
 * 3. 网络分片可能与事件边界不一致，因此要用 buffer 缓存半截数据；
 * 4. 收到 [DONE] 标记说明生成结束；
 * 5. 通过 options.signal 支持"停止生成"。
 *
 * @param options.conversationId 会话 ID
 * @param options.content 本次用户输入
 * @param options.signal 取消信号（用户点击停止时触发 abort）
 * @param options.onMessage 每收到一段增量文本时的回调
 */
export async function streamChat(options: StreamOptions) {
  const response = await fetch(`/api/conversations/${options.conversationId}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 声明期望的响应类型为 SSE
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      content: options.content,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(`请求失败：HTTP ${response.status}`)
  }

  // 流式响应必须可读
  if (!response.body) {
    throw new Error('浏览器不支持读取流式响应')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  // 缓存尚未构成完整事件的残余数据
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      // stream: true 保证多字节字符（中文）跨分片时不被截断
      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')

      // 按空行切分事件；最后一段可能不完整，留回 buffer
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        // 提取所有 data: 行并拼接
        const data = event
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n')

        if (!data) continue

        // 结束标记
        if (data === '[DONE]') return

        const chunk = JSON.parse(data) as StreamChunk

        if (typeof chunk.content === 'string') {
          options.onMessage(chunk.content)
        }
      }
    }
  } finally {
    // 释放读取锁，避免流未正常结束时的资源泄漏
    reader.releaseLock()
  }
}
