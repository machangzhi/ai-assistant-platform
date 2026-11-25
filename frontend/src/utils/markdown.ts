/**
 * Markdown 渲染工具
 * ------------------------------------------------------------
 * 使用 markdown-it 将 Markdown 文本转换为 HTML，
 * 使用 highlight.js 做代码高亮，最后用 DOMPurify 清理 HTML 防止 XSS。
 *
 * 安全提示：即使 markdown-it 关闭了 html 选项，
 * 仍建议对最终 HTML 做一次 sanitize，因为链接、属性等仍可能被注入。
 */

import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'

import 'highlight.js/styles/atom-one-dark.css'

/**
 * 初始化 Markdown 渲染器
 * html: false      —— 不解析原始 HTML 标签（第一道 XSS 防线）
 * breaks: true     —— 单个换行也渲染为 <br>，更符合聊天场景
 * linkify: true    —— 自动识别并转换 URL 为链接
 * typographer: true —— 启用智能标点替换（引号、破折号等）
 */
const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
})

/**
 * 自定义围栏代码块（```lang）的渲染规则
 * 默认渲染只输出 <pre><code>，这里额外包一层带语言标签和"复制"按钮的工具栏。
 *
 * 复制按钮本身不在此处绑定事件，而是在 MarkdownRenderer.vue 中
 * 通过事件委托（点击 .copy-code）统一处理。
 */
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]

  // token.info 例如 "ts title=xx"，只取第一个单词作为语言名
  const language = token.info.trim().split(/\s+/)[0] || 'text'
  const code = token.content

  // 默认先转义为纯文本，保证高亮失败时也不会注入 HTML
  let highlightedCode = md.utils.escapeHtml(code)

  // 仅对 highlight.js 支持的语言做高亮
  if (hljs.getLanguage(language)) {
    try {
      highlightedCode = hljs.highlight(code, {
        language,
        ignoreIllegals: true, // 容忍不严格符合语法的代码
      }).value
    } catch {
      // 高亮失败时使用普通文本
    }
  }

  return `
    <div class="code-block">
      <div class="code-toolbar">
        <span>${md.utils.escapeHtml(language)}</span>
        <button type="button" class="copy-code">
          复制
        </button>
      </div>
      <pre class="hljs"><code>${highlightedCode}</code></pre>
    </div>
  `
}

/**
 * 将 Markdown 文本渲染为安全的 HTML
 * @param content Markdown 原文
 * @returns 已清理的 HTML 字符串，可直接用于 v-html
 */
export function renderMarkdown(content: string): string {
  const html = md.render(content)

  // DOMPurify 会移除危险的标签/属性（如 <script>、onerror 等）
  return DOMPurify.sanitize(html)
}
