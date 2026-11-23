
interface StreamChunk {
  content: string
}

interface StreamMessage {
  role: 'user' | 'assistant'
  content: string
}

interface StreamOptions {
  messages: StreamMessage[]
  signal?: AbortSignal
  onMessage: (content: string) => void
}

export async function streamChat(options: StreamOptions) {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      messages: options.messages.map(({ role, content }) => ({
        role,
        content,
      })),
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
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
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