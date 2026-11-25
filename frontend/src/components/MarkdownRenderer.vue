<script setup lang="ts">
/**
 * Markdown 渲染组件
 * ------------------------------------------------------------
 * 将 Markdown 文本渲染为 HTML（v-html），并支持代码块"一键复制"。
 *
 * 安全说明：
 * - HTML 由 utils/markdown.ts 中的 DOMPurify.sanitize 清理过，
 *   因此这里可以安全使用 v-html；
 * - 不要把未经清洗的用户内容直接传给 v-html。
 */

import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdown'

const props = defineProps<{
  content: string
}>()

// 内容变化时重新渲染（computed 会缓存，避免重复解析）
const renderedContent = computed(() => {
  return renderMarkdown(props.content)
})

/**
 * 复制代码块内容
 * 使用"事件委托"：只在容器上监听一次点击，
 * 通过 closest 判断是否点中了复制按钮，
 * 避免为每个代码块单独绑定事件（尤其流式渲染时 DOM 频繁变化）。
 */
async function handleCopy(event: MouseEvent) {
  const target = event.target as HTMLElement

  const button = target.closest('.copy-code')

  if (!button) return

  // 从按钮向上找到代码块容器，再取出 code 文本
  const codeBlock = button.closest('.code-block')
  const code = codeBlock?.querySelector('code')?.textContent

  if (code === undefined) return

  try {
    await navigator.clipboard.writeText(code)
    // 给用户即时反馈（简单起见不做过期还原）
    button.textContent = '已复制'
  } catch (error) {
    console.error('复制失败：', error)
  }
}
</script>

<template>
  <!-- v-html 内容已在上游完成 XSS 清理 -->
  <div class="markdown-body" v-html="renderedContent" @click="handleCopy" />
</template>

<style scoped>
.markdown-body {
  line-height: 1.8;
  font-size: 14px;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

/* 标题层级间距 */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 20px 0 12px;
  font-weight: 600;
}

.markdown-body :deep(p) {
  margin: 10px 0;
}

/* 行内代码与代码块的通用样式 */
.markdown-body :deep(pre) {
  padding: 16px;
  overflow-x: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 8px;
}

.markdown-body :deep(code) {
  font-family: Consolas, Monaco, monospace;
}

/* 仅行内代码加背景，避免和代码块重复 */
.markdown-body :deep(:not(pre) > code) {
  padding: 2px 5px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 24px;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 8px 12px;
  border: 1px solid var(--el-border-color);
}

/* 自定义代码块：工具栏 + 复制按钮（由 utils/markdown.ts 生成对应 DOM） */
.markdown-body :deep(.code-block) {
  margin: 16px 0;
  overflow: hidden;
  border-radius: 8px;
  background: #282c34;
}

.markdown-body :deep(.code-toolbar) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  color: #abb2bf;
  background: #21252b;
  font-size: 12px;
}

.markdown-body :deep(.copy-code) {
  padding: 4px 10px;
  color: #abb2bf;
  background: transparent;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
}

.markdown-body :deep(.copy-code:hover) {
  color: #fff;
  border-color: #999;
}

/* 代码块内部不再重复留白与背景（由外层 .code-block 控制） */
.markdown-body :deep(.code-block pre) {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  background: transparent;
}
</style>
