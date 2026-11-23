<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdown'

const props = defineProps<{
  content: string
}>()

const renderedContent = computed(() => {
  return renderMarkdown(props.content)
})

async function handleCopy(event: MouseEvent) {
  const target = event.target as HTMLElement

  const button = target.closest('.copy-code')

  if (!button) return

  const codeBlock = button.closest('.code-block')
  const code = codeBlock?.querySelector('code')?.textContent

  if (code === undefined) return

  try {
    await navigator.clipboard.writeText(code)
    button.textContent = '已复制'
  } catch (error) {
    console.error('复制失败：', error)
  }
}
</script>

<template>
  <div
    class="markdown-body"
    v-html="renderedContent"
    @click="handleCopy"
  />
</template>

<style scoped>
.markdown-body {
  line-height: 1.8;
  font-size: 14px;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 20px 0 12px;
  font-weight: 600;
}

.markdown-body :deep(p) {
  margin: 10px 0;
}

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

.markdown-body :deep(.code-block pre) {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  background: transparent;
}
</style>