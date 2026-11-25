<script setup lang="ts">
import ChatSidebar from './components/ChatSidebar.vue'
import ChatMain from './components/ChatMain.vue'
import { onMounted } from 'vue'
import { useChatStore } from './stores/chat'

const chatStore = useChatStore()

onMounted(async () => {
  try {
    await chatStore.initialize()
  } catch (error) {
    console.error('聊天数据初始化失败：', error)
  }
})
</script>

<template>
  <div class="app-layout">
    <ChatSidebar />
    <ChatMain />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
}

.app-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
