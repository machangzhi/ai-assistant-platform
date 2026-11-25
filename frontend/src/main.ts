/**
 * 前端应用入口
 * ------------------------------------------------------------
 * 职责：
 * 1. 创建 Vue 应用实例；
 * 2. 安装 Pinia（全局状态管理）；
 * 3. 安装 Element Plus（UI 组件库及其样式）；
 * 4. 挂载到 index.html 中的 #app 节点。
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

const app = createApp(App)

// 注册 Pinia：之后组件中可通过 useXxxStore() 访问全局状态
app.use(createPinia())
// 全量注册 Element Plus 组件（项目规模较小时更省事，按需引入可减小包体积）
app.use(ElementPlus)

app.mount('#app')
