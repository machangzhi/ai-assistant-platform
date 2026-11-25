<script setup lang="ts">
/**
 * 根组件
 * ------------------------------------------------------------
 * 采用左右布局：左侧会话列表（ChatSidebar），右侧聊天主区（ChatMain）。
 * 挂载后调用 store.initialize() 从后端加载会话列表与当前会话历史消息。
 */

import ChatSidebar from './components/ChatSidebar.vue'
import ChatMain from './components/ChatMain.vue'
import { onMounted } from 'vue'
import { useChatStore } from './stores/chat'

const chatStore = useChatStore()

// 首屏加载：初始化失败时只记录日志，避免整个页面白屏
onMounted(async () => {
  try {
    await chatStore.initialize()
  } catch (error) {
    console.error('聊天数据初始化失败：', error)
  }
})
</script>

<template>
  <!-- 整体布局容器：flex 横向排列 -->
  <div class="app-layout">
    <ChatSidebar />
    <ChatMain />
  </div>
</template>

<style>
/* 全局样式（非 scoped）：重置默认间距，让布局铺满视口 */
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

/* 左右两栏布局，禁止整页滚动（滚动交由内部消息区处理） */
.app-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
