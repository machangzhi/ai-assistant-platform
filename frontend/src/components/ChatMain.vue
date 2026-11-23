<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import ChatInput from './ChatInput.vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import { Loading } from '@element-plus/icons-vue'

const chatStore = useChatStore()

// 消息列表 DOM 容器
const messageListRef = ref<HTMLElement | null>(null)

// 当前会话消息
const messages = computed(() => {
  return chatStore.currentConversation?.messages ?? []
})

// 滚动到底部
async function scrollToBottom(force = false) {
  await nextTick()

  const container = messageListRef.value

  if (!container) return

  if (force || isNearBottom.value) {
    container.scrollTop = container.scrollHeight
  }
}

// 监听消息变化
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
// 是否接近底部
const isNearBottom = ref(true)

function handleScroll() {
  const container = messageListRef.value

  if (!container) return

  const distance =
    container.scrollHeight -
    container.scrollTop -
    container.clientHeight

  isNearBottom.value = distance < 80
}
</script>

<template>
  <main class="chat-main">
    <div v-if="!chatStore.currentConversation" class="welcome">
      <h1>你好，我是 AI 助手</h1>
      <p>有什么技术问题可以帮你解决？</p>
    </div>

    <div v-else class="message-list" ref="messageListRef" @scroll="handleScroll">
      <div v-for="message in chatStore.currentConversation.messages" :key="message.id" class="message"
        :class="message.role">
        <strong>
          {{ message.role === 'user' ? '你' : 'AI 助手' }}
        </strong>
        <div class="message-content">
          <MarkdownRenderer v-if="message.role === 'assistant'" :content="message.content" />

          <span v-else>{{ message.content }}</span>
        </div>
      </div>
    </div>
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
    <ChatInput />
  </main>
</template>

<style scoped>
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

.welcome {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

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

/* 用户消息 */
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