export interface ConversationDTO {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface StreamChunk {
  content: string
}

interface StreamOptions {
  conversationId: string
  content: string
  signal?: AbortSignal
  onMessage: (content: string) => void
}

// 获取会话列表
export async function getConversations() {
  const response = await fetch('/api/conversations')

  if (!response.ok) {
    throw new Error(`获取会话列表失败：HTTP ${response.status}`)
  }

  const result = (await response.json()) as ApiResponse<ConversationDTO[]>

  return result.data
}
// 消息数据类型
export interface MessageDTO {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// 获取指定会话的历史消息
export async function getMessages(conversationId: string) {
  const response = await fetch(`/api/conversations/${conversationId}/messages`)

  if (!response.ok) {
    throw new Error('获取历史消息失败')
  }

  const result = (await response.json()) as ApiResponse<MessageDTO[]>

  return result.data
}

// 创建会话
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
// 删除会话
export async function deleteConversation(id: string) {
  const response = await fetch(`/api/conversations/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`删除会话失败：HTTP ${response.status}`)
  }
}

// 流式聊天
export async function streamChat(options: StreamOptions) {
  const response = await fetch(`/api/conversations/${options.conversationId}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

  if (!response.body) {
    throw new Error('浏览器不支持读取流式响应')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')

      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        const data = event
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n')

        if (!data) continue

        if (data === '[DONE]') return

        const chunk = JSON.parse(data) as StreamChunk

        if (typeof chunk.content === 'string') {
          options.onMessage(chunk.content)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
