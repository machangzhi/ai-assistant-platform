import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Conversation, ChatMessage, GenerationStatus } from '../types/chat'
import { streamChat } from '../api/chat'
import { getStorage, setStorage } from '../utils/storage'

export const useChatStore = defineStore('chat', () => {
  // 所有会话
  const conversations = ref<Conversation[]>(getStorage<Conversation[]>([]))

  // 当前会话 ID
  const currentConversationId = ref<string | null>(null)

  // 是否正在生成
  const isGenerating = ref(false)
  const generationStatus = ref<GenerationStatus>('idle')

  // 当前会话
  const currentConversation = computed(() => {
    return conversations.value.find((item) => item.id === currentConversationId.value) ?? null
  })
  watch(
    conversations,
    (newValue) => {
      setStorage(newValue)
    },
    {
      deep: true,
    },
  )

  // 创建会话
  function createConversation() {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
    }

    conversations.value.unshift(conversation)
    currentConversationId.value = conversation.id

    return conversation
  }

  // 切换会话
  function switchConversation(id: string) {
    currentConversationId.value = id
  }
  /**
   * 删除指定会话
   */
  function deleteConversation(id: string) {
    const index = conversations.value.findIndex((item) => item.id === id)

    if (index === -1) return

    const isCurrent = currentConversationId.value === id

    conversations.value.splice(index, 1)

    if (isCurrent) {
      currentConversationId.value = conversations.value[0]?.id ?? null
    }
  }
  /**
   * 清空所有会话
   */
  function clearConversations() {
    if (isGenerating.value) return

    conversations.value = []
    currentConversationId.value = null
  }

  let abortController: AbortController | null = null

  // 发送消息
  async function sendMessage(content: string) {
    if (isGenerating.value) return

    // 没有当前会话时，先创建会话
    if (!currentConversation.value) {
      createConversation()
    }
    // 从 Pinia 响应式状态中重新获取 Proxy 对象
    const conversation = currentConversation.value

    if (!conversation) {
      throw new Error('获取当前会话失败')
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }

    conversation.messages.push(userMessage)

    // 自动设置会话标题
    if (conversation.messages.length === 1) {
      conversation.title = content.slice(0, 20)
    }

    // 创建 AI 消息占位符
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      loading: true,
    }

    conversation.messages.push(assistantMessage)

    // 从响应式数组中重新获取消息对象
    const reactiveAssistantMessage = conversation.messages[conversation.messages.length - 1]

    isGenerating.value = true
    generationStatus.value = 'connecting'
    abortController = new AbortController()

    try {
      const messages = conversation.messages
        .filter((item) => item.content.trim())
        .filter((item) => item.id !== assistantMessage.id)
        .map(({ role, content }) => ({ role, content }))

      await streamChat({
        messages,
        signal: abortController.signal,
        onMessage(chunk) {
          generationStatus.value = 'streaming'
          reactiveAssistantMessage.content += chunk
        },
      })
      // 正常结束
      generationStatus.value = 'completed'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        generationStatus.value = 'stopped'
      } else {
        generationStatus.value = 'error'
        reactiveAssistantMessage.content ||= 'AI 请求失败，请稍后重试。'
        console.error('AI 请求失败：', error)
      }
    } finally {
      reactiveAssistantMessage.loading = false
      isGenerating.value = false
      abortController = null
    }
  }

  // 停止生成
  function stopGeneration() {
    abortController?.abort()
  }

  return {
    conversations,
    currentConversationId,
    currentConversation,
    isGenerating,
    createConversation,
    switchConversation,
    deleteConversation,
    clearConversations,
    sendMessage,
    stopGeneration,
    generationStatus,
  }
})
