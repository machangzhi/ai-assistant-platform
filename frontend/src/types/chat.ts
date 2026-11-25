/**
 * 聊天相关的类型定义
 * ------------------------------------------------------------
 * 这些类型是前端内部使用的视图模型（ViewModel），
 * 与后端返回的 DTO 字段命名不同（后端为下划线，前端为驼峰），
 * 转换工作统一放在 api/chat.ts 或 store 中完成。
 */

/** 消息角色：用户 / AI 助手 */
export type MessageRole = 'user' | 'assistant'

/** 单条聊天消息（前端视图模型） */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  // 是否处于加载中（AI 占位消息在流式返回期间为 true）
  loading?: boolean
}

/** 会话（前端视图模型） */
export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  // 创建时间（毫秒时间戳，便于排序与展示）
  createdAt: number
}

/**
 * AI 生成状态机
 * idle      空闲（未发起请求）
 * connecting 已发起请求，等待首个数据块
 * streaming 正在接收流式内容
 * completed 正常完成
 * stopped   用户主动停止
 * error     请求失败
 */
export type GenerationStatus =
  'idle' | 'connecting' | 'streaming' | 'completed' | 'stopped' | 'error'
