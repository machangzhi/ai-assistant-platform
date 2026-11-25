/**
 * 聊天全局状态（Pinia Store）
 * ------------------------------------------------------------
 * 采用 Pinia 的 setup 语法（与 Vue 组合式 API 一致）。
 *
 * 负责管理：
 * 1. 会话列表与当前会话；
 * 2. 生成状态（连接中/流式中/完成/停止/失败）；
 * 3. 与后端的所有数据同步（初始化、切换、增删、发送消息）。
 *
 * 数据流概览：
 *   组件 -> store 方法 -> api/chat.ts -> 后端
 *   后端 -> api/chat.ts -> store 状态更新 -> 组件自动重新渲染
 */

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
  // 所有会话（按后端返回顺序，最近活跃的在前）
  const conversations = ref<Conversation[]>([])

  // 当前会话 ID；null 表示尚未选择/没有会话
  const currentConversationId = ref<string | null>(null)

  // 是否正在生成（用于防止重复提交、禁用删除等操作）
  const isGenerating = ref(false)
  // 更细粒度的生成状态，用于界面提示
  const generationStatus = ref<GenerationStatus>('idle')

  /**
   * 当前会话（计算属性）
   * 根据 ID 从会话数组中查找，找不到时返回 null。
   * 使用 computed 可以保证依赖变化时自动更新，并避免在组件里重复查找。
   */
  const currentConversation = computed(() => {
    return conversations.value.find((item) => item.id === currentConversationId.value) ?? null
  })

  /**
   * 加载指定会话的历史消息
   * @param conversationId 会话 ID
   *
   * 注意：这里直接给 conversation.messages 赋新数组，
   * 赋值的是响应式对象的属性，因此视图会自动更新。
   */
  async function loadMessages(conversationId: string) {
    const conversation = conversations.value.find((item) => item.id === conversationId)

    if (!conversation) return

    try {
      const data = await getMessagesApi(conversationId)

      // DTO 转视图模型：去除 created_at 等暂时用不到的字段
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

  /**
   * 从后端加载会话列表
   * 同时负责"修正当前会话 ID"：
   * - 当前 ID 已不存在（被删除）时置空；
   * - 当前 ID 为空但存在会话时，默认选中第一个。
   */
  async function loadConversations() {
    try {
      const data = await getConversationsApi()

      // 后端字段为下划线命名，这里转换成本地视图模型
      conversations.value = data.map((item) => ({
        id: item.id,
        title: item.title,
        createdAt: new Date(item.created_at).getTime(),
        messages: [],
      }))

      // 当前选中的会话已被删除（例如在其他标签页删除）
      if (
        currentConversationId.value &&
        !conversations.value.some((item) => item.id === currentConversationId.value)
      ) {
        currentConversationId.value = null
      }

      // 没有选中项时，默认选中第一个会话
      if (!currentConversationId.value && conversations.value.length) {
        currentConversationId.value = conversations.value[0].id
      }
    } catch (error) {
      console.error('加载会话列表失败：', error)
      throw error
    }
  }

  /**
   * 初始化聊天数据
   * 在 App.vue 的 onMounted 中调用一次，完成首屏数据加载。
   */
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

  /**
   * 创建会话
   * 先请求后端创建（拿到数据库生成的 id 与时间），再插入本地列表顶部并选中。
   * @returns 新建的会话对象
   */
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

  /**
   * 切换会话并按需加载历史消息
   * @param id 目标会话 ID
   *
   * 优化：若该会话已有消息（之前加载过），直接切换而不重复请求。
   */
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
   * 执行顺序很重要：先删数据库，成功后再更新前端状态，
   * 避免"界面没了但数据库还在"的不一致。
   *
   * 若删除的是当前会话，会自动切换到列表中剩余的第一个会话并加载其消息。
   */
  async function deleteConversation(id: string) {
    // 生成过程中不允许删除，避免请求与状态更新相互干扰
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
   * 逐个调用删除接口；任一步失败都会重新拉取列表，
   * 保证前端状态与数据库一致。
   */
  async function clearConversations() {
    if (isGenerating.value) {
      console.warn('AI 正在生成，暂时不能清空会话')
      return
    }

    try {
      // 逐个删除数据库中的会话
      // 使用副本 [...conversations.value] 遍历，避免遍历过程中数组被修改
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

  // 当前流式请求的取消控制器；未生成时为 null
  let abortController: AbortController | null = null

  /**
   * 发送消息
   * 完整流程：
   * 1. 置为生成中并创建 AbortController（支持停止）；
   * 2. 没有会话时先创建；
   * 3. 本地追加用户消息；
   * 4. 首次提问时用前 20 字作为标题并同步到后端；
   * 5. 追加 AI 占位消息；
   * 6. 发起流式请求，每收到一段就追加到占位消息；
   * 7. 根据结果更新生成状态，finally 中清理 loading 标志。
   *
   * @param content 用户输入内容
   */
  async function sendMessage(content: string) {
    if (isGenerating.value) return

    // 初始化生成状态，避免重复提交
    isGenerating.value = true
    generationStatus.value = 'connecting'
    abortController = new AbortController()

    // 用变量保存"响应式后的占位消息"，供流式回调写入内容
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
      // 说明：此时 messages 已包含刚追加的用户消息，所以长度为 1 代表第一条
      if (conversation.messages.length === 1) {
        const title = content.trim().slice(0, 20)

        // 先本地更新，界面立即生效
        conversation.title = title

        try {
          const updatedConversation = await renameConversationApi(conversation.id, title)

          // 用后端返回值覆盖，保证与数据库一致
          conversation.title = updatedConversation.title
        } catch (error) {
          // 标题保存失败不影响聊天主流程
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

      // 从响应式数组中重新获取消息对象（拿到 Proxy 引用）
      reactiveAssistantMessage = conversation.messages[conversation.messages.length - 1]

      // 调用后端：只发送当前用户消息，历史上下文由后端自行读取
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
      // fetch 被 abort 时抛出的错误 name 为 AbortError
      if (error instanceof Error && error.name === 'AbortError') {
        generationStatus.value = 'stopped'
      } else {
        generationStatus.value = 'error'

        // 占位消息仍为空时给用户一个兜底提示
        if (reactiveAssistantMessage) {
          reactiveAssistantMessage.content ||= 'AI 请求失败，请稍后重试。'
        }

        console.error('AI 请求失败：', error)
      }
    } finally {
      // 结束 loading 动画
      if (reactiveAssistantMessage) {
        reactiveAssistantMessage.loading = false
      }

      isGenerating.value = false
      abortController = null
    }
  }

  /**
   * 停止生成
   * 触发 abort 后，fetch 会抛出 AbortError，
   * sendMessage 的 catch 会将其识别为"已停止"。
   */
  function stopGeneration() {
    abortController?.abort()
  }

  // 暴露给组件使用的状态与方法
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
