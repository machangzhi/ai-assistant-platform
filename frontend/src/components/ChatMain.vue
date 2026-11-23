<script setup lang="ts">
import { useChatStore } from '../stores/chat'
import ChatInput from './ChatInput.vue'

const chatStore = useChatStore()
</script>

<template>
  <main class="chat-main">
    <div v-if="!chatStore.currentConversation" class="welcome">
      <h1>你好，我是 AI 助手</h1>
      <p>有什么技术问题可以帮你解决？</p>
    </div>

    <div v-else class="message-list">
      <div
        v-for="message in chatStore.currentConversation.messages"
        :key="message.id"
        class="message"
        :class="message.role"
      >
        <strong>
          {{ message.role === 'user' ? '你' : 'AI 助手' }}
        </strong>
        <p>{{ message.content }}</p>
      </div>
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
  overflow-y: auto;
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
</style>