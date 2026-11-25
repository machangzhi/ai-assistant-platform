/**
 * 用户相关的请求参数校验规则（Zod）
 * ------------------------------------------------------------
 * Zod 的核心思想：用声明式 schema 描述数据结构，
 * 再通过 safeParse / parse 得到校验结果与类型推导。
 */

import { z } from 'zod'

/**
 * 创建用户的校验规则
 * - username：去除首尾空格后必填，长度 1~50
 * - email：去除首尾空格后必须是合法邮箱，长度不超过 100
 */
export const createUserSchema = z.object({
  username: z.string().trim().min(1, '用户名不能为空').max(50, '用户名不能超过50个字符'),

  email: z.string().trim().email({ message: '邮箱格式不正确' }).max(100, '邮箱不能超过100个字符'),
})

/**
 * 更新用户的校验规则
 * `.partial()` 会保留每个字段原有的校验规则，但把所有字段变为可选（optional），
 * 因此既支持只改 username，也支持只改 email，或两者同时修改。
 */
export const updateUserSchema = createUserSchema.partial()
