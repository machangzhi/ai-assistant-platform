<script setup lang="ts">
/**
 * 消息输入框
 * ------------------------------------------------------------
 * - 使用 textarea 支持多行输入；
 * - Ctrl + Enter 快捷发送；
 * - 生成中显示"停止生成"，否则显示"发送"；
 * - 输入为空时禁用发送按钮。
 */

import { ref } from 'vue'
import { useChatStore } from '../stores/chat'

const chatStore = useChatStore()

// 输入框内容
const input = ref('')

/** 发送消息：去掉首尾空白后交给 store，发送后清空输入框 */
function handleSend() {
  const content = input.value.trim()

  // 空内容或正在生成时直接忽略
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
      <!-- 生成中：可停止；否则：可发送 -->
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
/* 输入区与消息列表同宽，保持视觉一致 */
.chat-input {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

/* 按钮右对齐 */
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
