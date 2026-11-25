<script setup lang="ts">
/**
 * 聊天主区域
 * ------------------------------------------------------------
 * 负责：
 * - 没有会话时展示欢迎页；
 * - 展示当前会话的消息列表（AI 消息用 Markdown 渲染）；
 * - 流式生成期间展示状态提示；
 * - 自动滚动到底部（用户手动上滑查看历史时不强制滚动）。
 */

import { computed, nextTick, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import ChatInput from './ChatInput.vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import { Loading } from '@element-plus/icons-vue'

const chatStore = useChatStore()

// 消息列表 DOM 容器，用于控制滚动位置
const messageListRef = ref<HTMLElement | null>(null)

// 当前会话消息（会话切换时自动更新）
const messages = computed(() => {
  return chatStore.currentConversation?.messages ?? []
})

/**
 * 滚动到底部
 * @param force 是否强制滚动（忽略"用户是否在底部"的判断）
 *
 * nextTick 确保 DOM 已根据最新消息更新完成，否则 scrollHeight 是旧值。
 */
async function scrollToBottom(force = false) {
  await nextTick()

  const container = messageListRef.value

  if (!container) return

  // 只有用户本来就在底部附近，或显式要求时才自动滚动，
  // 避免用户正在向上翻看历史时被强行拉回底部
  if (force || isNearBottom.value) {
    container.scrollTop = container.scrollHeight
  }
}

/**
 * 监听消息变化：内容增长（流式输出）或新增消息时自动滚动
 * - deep: true 监听消息对象内部 content 的变化；
 * - flush: 'post' 在 DOM 更新后再执行；
 * - immediate: true 首次进入时也滚动到底部。
 */
watch(
  messages,
  () => {
    scrollToBottom()
  },
  {
    deep: true,
    flush: 'post',
    immediate: true,
  },
)

// 用户当前是否接近列表底部
const isNearBottom = ref(true)

/**
 * 滚动事件处理：计算距离底部的像素值
 * 阈值 80px 内视为"在底部附近"
 */
function handleScroll() {
  const container = messageListRef.value

  if (!container) return

  const distance = container.scrollHeight - container.scrollTop - container.clientHeight

  isNearBottom.value = distance < 80
}
</script>

<template>
  <main class="chat-main">
    <!-- 空状态：还没有选中任何会话 -->
    <div v-if="!chatStore.currentConversation" class="welcome">
      <h1>你好，我是 AI 助手</h1>
      <p>有什么技术问题可以帮你解决？</p>
    </div>

    <!-- 消息列表 -->
    <div v-else class="message-list" ref="messageListRef" @scroll="handleScroll">
      <div
        v-for="message in chatStore.currentConversation.messages"
        :key="message.id"
        class="message"
        :class="message.role"
      >
        <strong>
          {{ message.role === 'user' ? '你' : 'AI 助手' }}
        </strong>
        <div class="message-content">
          <!-- AI 回复支持 Markdown；用户输入按纯文本展示（避免误渲染） -->
          <MarkdownRenderer v-if="message.role === 'assistant'" :content="message.content" />

          <span v-else>{{ message.content }}</span>
        </div>
      </div>
    </div>

    <!-- 生成状态提示：按状态机分支展示 -->
    <div v-if="chatStore.generationStatus === 'connecting'" class="generation-status">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      正在连接 AI...
    </div>

    <div v-else-if="chatStore.generationStatus === 'streaming'" class="generation-status">
      AI 正在思考并生成回答...
    </div>

    <div v-else-if="chatStore.generationStatus === 'stopped'" class="generation-status">
      已停止生成
    </div>

    <div v-else-if="chatStore.generationStatus === 'error'" class="generation-status error">
      生成失败，请重试
    </div>

    <!-- 底部输入框 -->
    <ChatInput />
  </main>
</template>

<style scoped>
/* 主区域占满剩余空间，内部纵向布局 */
.chat-main {
  flex: 1;
  min-width: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 40px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* 欢迎页居中 */
.welcome {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 消息列表：占据剩余空间并独立滚动 */
.message-list {
  max-width: 900px;
  margin: 0 auto;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 24px;
}

.message {
  padding: 20px;
  margin-bottom: 16px;
  border-radius: 12px;
}

/* 用户消息浅灰底，AI 消息白底 + 边框，形成视觉区分 */
.message.user {
  background: #f3f4f6;
}

.message.assistant {
  background: #fff;
  border: 1px solid #e5e7eb;
}

.message p {
  white-space: pre-wrap;
}

.message-content {
  max-width: 100%;
  min-width: 0;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

/* 用户消息保留换行与长单词换行 */
.message-content span {
  white-space: pre-wrap;
  word-break: break-word;
}

.generation-status {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.generation-status.error {
  color: var(--el-color-danger);
}
</style>
