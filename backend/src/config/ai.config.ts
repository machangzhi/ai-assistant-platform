/**
 * AI 服务配置
 * ------------------------------------------------------------
 * 统一从环境变量读取 DeepSeek 相关配置，避免在业务代码中散落硬编码。
 * 注意：本文件在模块加载时就会读取 process.env，
 * 因此必须保证入口文件已提前执行 `dotenv/config`（app.ts 中已处理）。
 */

export const aiConfig = {
  // DeepSeek API Key，缺失时调用模型会直接抛错（见 ai/models/deepseek.ts）
  apiKey: process.env.DEEPSEEK_API_KEY,

  // DeepSeek 接口基础地址，例如 https://api.deepseek.com
  baseURL: process.env.DEEPSEEK_BASE_URL,

  // 使用的模型名称，未配置时默认使用 deepseek-chat
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
}
