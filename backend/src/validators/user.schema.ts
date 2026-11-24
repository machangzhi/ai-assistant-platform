import { z } from 'zod'

export const createUserSchema = z.object({
  username: z.string().trim().min(1, '用户名不能为空').max(50, '用户名不能超过50个字符'),

  email: z.string().trim().email({ message: '邮箱格式不正确' }).max(100, '邮箱不能超过100个字符'),
})

// `.partial()` 是 Zod 的方法，作用是：把 object schema 里的 所有字段变成可选（optional） ，但 保留每个字段原有的校验规则 。
export const updateUserSchema = createUserSchema.partial()
