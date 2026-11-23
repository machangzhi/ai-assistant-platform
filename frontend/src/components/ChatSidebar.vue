<script setup lang="ts">
import { useChatStore } from '../stores/chat'

const chatStore = useChatStore()

function handleCreate() {
  chatStore.createConversation()
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>AI Assistant</h2>
      <el-button type="primary" @click="handleCreate">
        新建对话
      </el-button>
    </div>

    <div class="conversation-list">
      <div
        v-for="item in chatStore.conversations"
        :key="item.id"
        class="conversation-item"
        :class="{
          active: item.id === chatStore.currentConversationId
        }"
        @click="chatStore.switchConversation(item.id)"
      >
        {{ item.title }}
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background: #f7f7f8;
  border-right: 1px solid #e5e7eb;
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conversation-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
}

.conversation-item:hover,
.conversation-item.active {
  background: #e5e7eb;
}
</style>