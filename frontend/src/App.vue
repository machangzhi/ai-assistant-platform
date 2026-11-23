<script setup lang="ts">
import ChatSidebar from './components/ChatSidebar.vue'
import ChatMain from './components/ChatMain.vue'
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