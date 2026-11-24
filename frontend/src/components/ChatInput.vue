<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '../stores/chat'

const chatStore = useChatStore()

const input = ref('')

function handleSend() {
  const content = input.value.trim()

  if (!content || chatStore.isGenerating) return

  input.value = ''
  chatStore.sendMessage(content)
}
</script>

<template>
  <div class="chat-input">
    <el-input
      v-model="input"
      type="textarea"
      :rows="3"
      resize="none"
      placeholder="向 AI 助手发送消息..."
      @keydown.ctrl.enter="handleSend"
    />

    <div class="actions">
      <el-button v-if="chatStore.isGenerating" type="danger" @click="chatStore.stopGeneration">
        停止生成
      </el-button>

      <el-button v-else type="primary" :disabled="!input.trim()" @click="handleSend">
        发送
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.chat-input {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
