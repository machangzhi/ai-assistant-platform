import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'

import 'highlight.js/styles/atom-one-dark.css'

// 初始化 Markdown 渲染器
const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
})

// 自定义代码块渲染规则
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]

  const language = token.info.trim().split(/\s+/)[0] || 'text'
  const code = token.content

  let highlightedCode = md.utils.escapeHtml(code)

  if (hljs.getLanguage(language)) {
    try {
      highlightedCode = hljs.highlight(code, {
        language,
        ignoreIllegals: true,
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

// Markdown 转 HTML，并进行 XSS 清理
export function renderMarkdown(content: string): string {
  const html = md.render(content)

  return DOMPurify.sanitize(html)
}
