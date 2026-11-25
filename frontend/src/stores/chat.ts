import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Conversation, ChatMessage, GenerationStatus } from '../types/chat'
import {
  streamChat,
  getConversations as getConversationsApi,
  createConversation as createConversationApi,
  getMessages as getMessagesApi,
  renameConversation as renameConversationApi,
  deleteConversation as deleteConversationApi,
} from '../api/chat'

export const useChatStore = defineStore('chat', () => {
  // 所有会话
  const conversations = ref<Conversation[]>([])

  // 当前会话 ID
  const currentConversationId = ref<string | null>(null)

  // 是否正在生成
  const isGenerating = ref(false)
  const generationStatus = ref<GenerationStatus>('idle')

  // 当前会话
  const currentConversation = computed(() => {
    return conversations.value.find((item) => item.id === currentConversationId.value) ?? null
  })
  // 加载指定会话的历史消息
  async function loadMessages(conversationId: string) {
    const conversation = conversations.value.find((item) => item.id === conversationId)

    if (!conversation) return

    try {
      const data = await getMessagesApi(conversationId)

      conversation.messages = data.map((item) => ({
        id: item.id,
        role: item.role,
        content: item.content,
      }))
    } catch (error) {
      console.error('加载历史消息失败：', error)
      throw error
    }
  }
  // 从后端加载会话列表
  async function loadConversations() {
    try {
      const data = await getConversationsApi()

      conversations.value = data.map((item) => ({
        id: item.id,
        title: item.title,
        createdAt: new Date(item.created_at).getTime(),
        messages: [],
      }))

      if (
        currentConversationId.value &&
        !conversations.value.some((item) => item.id === currentConversationId.value)
      ) {
        currentConversationId.value = null
      }

      if (!currentConversationId.value && conversations.value.length) {
        currentConversationId.value = conversations.value[0].id
      }
    } catch (error) {
      console.error('加载会话列表失败：', error)
      throw error
    }
  }

  // 初始化聊天数据
  async function initialize() {
    // 1. 加载会话列表
    await loadConversations()

    // 2. 获取当前会话
    const conversation = currentConversation.value

    // 3. 加载当前会话历史消息
    if (conversation) {
      await loadMessages(conversation.id)
    }
  }

  // 创建会话
  async function createConversation() {
    const data = await createConversationApi()

    const conversation: Conversation = {
      id: data.id,
      title: data.title,
      messages: [],
      createdAt: new Date(data.created_at).getTime(),
    }

    conversations.value.unshift(conversation)
    currentConversationId.value = conversation.id

    return conversation
  }

  // 切换会话并加载历史消息
  async function switchConversation(id: string) {
    currentConversationId.value = id

    const conversation = conversations.value.find((item) => item.id === id)

    if (!conversation) return

    // 已经加载过消息，就不重复请求
    if (conversation.messages.length > 0) return

    await loadMessages(id)
  }
  /**
   * 删除指定会话
   */
  async function deleteConversation(id: string) {
    if (isGenerating.value) {
      console.warn('AI 正在生成，暂时不能删除会话')
      return
    }

    const index = conversations.value.findIndex((item) => item.id === id)

    if (index === -1) return

    try {
      // 1. 先删除数据库中的会话
      await deleteConversationApi(id)

      // 2. 数据库删除成功后，再更新前端状态
      const isCurrent = currentConversationId.value === id

      conversations.value.splice(index, 1)

      if (isCurrent) {
        currentConversationId.value = conversations.value[0]?.id ?? null

        // 加载新选中会话的历史消息
        if (currentConversationId.value) {
          await loadMessages(currentConversationId.value)
        }
      }
    } catch (error) {
      console.error('删除会话失败：', error)
      throw error
    }
  }
  /**
   * 清空所有会话
   */
  async function clearConversations() {
    if (isGenerating.value) {
      console.warn('AI 正在生成，暂时不能清空会话')
      return
    }

    try {
      // 逐个删除数据库中的会话
      for (const conversation of [...conversations.value]) {
        await deleteConversationApi(conversation.id)
      }

      // 数据库删除成功后，清空前端状态
      conversations.value = []
      currentConversationId.value = null
    } catch (error) {
      console.error('清空会话失败：', error)

      // 重新从数据库同步会话列表，避免前端状态不一致
      await loadConversations()

      throw error
    }
  }

  let abortController: AbortController | null = null

  // 发送消息
  async function sendMessage(content: string) {
    if (isGenerating.value) return

    // 初始化生成状态，避免重复提交
    isGenerating.value = true
    generationStatus.value = 'connecting'
    abortController = new AbortController()

    let reactiveAssistantMessage: ChatMessage | null = null

    try {
      // 获取当前会话
      let conversation = currentConversation.value

      // 如果没有会话，先请求后端创建
      if (!conversation) {
        conversation = await createConversation()
      }

      // 添加用户消息到前端
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
      }

      conversation.messages.push(userMessage)

      // 首次提问时，生成并保存会话标题
      if (conversation.messages.length === 1) {
        const title = content.trim().slice(0, 20)

        conversation.title = title

        try {
          const updatedConversation = await renameConversationApi(conversation.id, title)

          conversation.title = updatedConversation.title
        } catch (error) {
          console.error('会话标题更新失败：', error)
        }
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
      reactiveAssistantMessage = conversation.messages[conversation.messages.length - 1]

      // 调用后端：只发送当前用户消息
      await streamChat({
        conversationId: conversation.id,
        content,
        signal: abortController.signal,
        onMessage(chunk) {
          generationStatus.value = 'streaming'
          if (reactiveAssistantMessage) {
            reactiveAssistantMessage.content += chunk
          }
        },
      })

      generationStatus.value = 'completed'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        generationStatus.value = 'stopped'
      } else {
        generationStatus.value = 'error'

        if (reactiveAssistantMessage) {
          reactiveAssistantMessage.content ||= 'AI 请求失败，请稍后重试。'
        }

        console.error('AI 请求失败：', error)
      }
    } finally {
      if (reactiveAssistantMessage) {
        reactiveAssistantMessage.loading = false
      }

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
    loadConversations,
    loadMessages,
    initialize,
  }
})
