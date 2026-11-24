<script setup lang="ts">
import { ElMessageBox, ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'

const chatStore = useChatStore()

function handleCreate() {
  chatStore.createConversation()
}
async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm('删除后将无法恢复，确定删除这个会话吗？', '删除会话', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    chatStore.deleteConversation(id)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消删除
  }
}
async function handleClear() {
  if (chatStore.isGenerating) {
    ElMessage.warning('AI 正在生成，请先停止生成')
    return
  }

  if (!chatStore.conversations.length) {
    ElMessage.info('当前没有会话')
    return
  }

  try {
    await ElMessageBox.confirm('清空后所有聊天记录将无法恢复，确定继续吗？', '清空历史', {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning',
    })

    chatStore.clearConversations()
    ElMessage.success('历史记录已清空')
  } catch {
    // 用户取消操作
  }
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>AI Assistant</h2>
      <el-button type="primary" @click="handleCreate"> 新建对话 </el-button>
      <el-button type="danger" @click="handleClear"> 清空历史 </el-button>
    </div>

    <div class="conversation-list">
      <div
        v-for="item in chatStore.conversations"
        :key="item.id"
        class="conversation-item"
        :class="{
          active: item.id === chatStore.currentConversationId,
        }"
      >
        <span class="conversation-title" @click="chatStore.switchConversation(item.id)">
          {{ item.title }}
        </span>

        <el-button link type="danger" @click.stop="handleDelete(item.id)">
          <el-icon>
            <Delete />
          </el-icon>
        </el-button>
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

.sidebar-header :deep(.el-button) {
  width: 100%;
  margin-left: 0;
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
