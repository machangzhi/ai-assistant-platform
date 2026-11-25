<script setup lang="ts">
/**
 * 左侧会话栏
 * ------------------------------------------------------------
 * 提供：
 * - 新建对话；
 * - 清空历史（带二次确认）；
 * - 会话列表切换；
 * - 单个会话删除（带二次确认）。
 *
 * 交互细节：
 * - 删除按钮使用 @click.stop，避免冒泡触发行点击（切换会话）；
 * - 使用 ElMessageBox.confirm 做危险操作确认，
 *   用户取消时 confirm 会 reject，因此用 try/catch 吞掉取消异常。
 */

import { ElMessageBox, ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'

const chatStore = useChatStore()

/** 新建对话：请求后端创建后自动选中 */
function handleCreate() {
  chatStore.createConversation()
}

/**
 * 删除单个会话
 * @param id 会话 ID
 */
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

/** 清空全部会话：需先停止生成，且存在会话时才允许操作 */
async function handleClear() {
  // AI 生成过程中清空会导致请求与状态更新冲突，直接拦截
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
    <!-- 顶部操作区 -->
    <div class="sidebar-header">
      <h2>AI Assistant</h2>
      <el-button type="primary" @click="handleCreate"> 新建对话 </el-button>
      <el-button type="danger" @click="handleClear"> 清空历史 </el-button>
    </div>

    <!-- 会话列表 -->
    <div class="conversation-list">
      <div
        v-for="item in chatStore.conversations"
        :key="item.id"
        class="conversation-item"
        :class="{
          active: item.id === chatStore.currentConversationId,
        }"
      >
        <!-- 点击标题切换会话（异步加载历史消息） -->
        <span class="conversation-title" @click="chatStore.switchConversation(item.id)">
          {{ item.title }}
        </span>

        <!-- .stop 阻止冒泡，避免删除时同时触发切换 -->
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
/* 侧边栏固定宽度，占满视口高度 */
.sidebar {
  width: 260px;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background: #f7f7f8;
  border-right: 1px solid #e5e7eb;
}

/* 纵向排列标题与操作按钮 */
.sidebar-header {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

/* :deep 穿透 scoped，让 Element Plus 内部按钮样式生效 */
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

/* 悬停与选中态使用同一背景色 */
.conversation-item:hover,
.conversation-item.active {
  background: #e5e7eb;
}
</style>
