/**
 * Vite 配置
 * ------------------------------------------------------------
 * - plugins：启用 Vue 单文件组件支持；
 * - server.port：开发服务器端口；
 * - server.proxy：将 /api 请求代理到后端，避免开发期跨域问题。
 *
 * 代理说明：前端代码里写 fetch('/api/xxx') 即可，
 * 浏览器实际请求的是 http://localhost:5173/api/xxx，
 * 由 Vite 转发到 http://localhost:3001/api/xxx。
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  server: {
    port: 5173,

    proxy: {
      '/api': {
        // 后端服务地址（与 backend/.env 中的 PORT 保持一致）
        target: 'http://localhost:3001',
        // 修改请求头中的 Host，避免后端做域名/来源校验时被拒绝
        changeOrigin: true,
      },
    },
  },
})
