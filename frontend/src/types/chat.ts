export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  loading?: boolean
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
}

export type GenerationStatus =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'completed'
  | 'stopped'
  | 'error'