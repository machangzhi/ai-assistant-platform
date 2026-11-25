/**
 * 数据库连接配置（MySQL 连接池）
 * ------------------------------------------------------------
 * 使用 mysql2/promise 提供的 Promise 版本 API，便于在 async/await 中调用。
 * 这里创建的是「连接池」而不是单个连接：
 * - 连接池会复用连接、控制并发数量，避免频繁创建/销毁连接带来的开销；
 * - waitForConnections 为 true 时，连接耗尽后新请求会排队等待而不是直接报错。
 */

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

// 显式加载 .env，确保本文件被单独引用时也能拿到环境变量
// （重复调用 dotenv.config() 是安全的，不会覆盖已存在的变量）
dotenv.config()

export const pool = mysql.createPool({
  // 数据库主机地址
  host: process.env.DB_HOST || 'localhost',
  // 数据库端口，环境变量是字符串，需要转换为数字
  port: Number(process.env.DB_PORT) || 3306,
  // 登录用户名
  user: process.env.DB_USER || 'root',
  // 登录密码（本地开发可为空）
  password: process.env.DB_PASSWORD || '',
  // 默认数据库名
  database: process.env.DB_NAME || 'ai_assistant',

  // 连接池相关配置
  waitForConnections: true, // 无可用连接时排队等待
  connectionLimit: 10, // 池中最大连接数
  queueLimit: 0, // 排队上限，0 表示不限制

  // 字符集使用 utf8mb4，可完整支持中文与 emoji（utf8 在 MySQL 中并不完整）
  charset: 'utf8mb4',
})
