/**
 * 会话控制器
 * ------------------------------------------------------------
 * 提供会话的创建、列表、详情、删除与标题更新。
 * 错误映射约定：
 * - 参数非法 -> 400
 * - Service 抛出"会话不存在" -> 404
 * - 其他异常 -> 500 并记录日志
 */

import type { Request, Response } from 'express'
import * as conversationService from '../services/conversation.service.js'

/**
 * 从路由参数中提取会话 ID
 * 路由参数类型可能是 string | string[]，这里做归一化与空值校验
 * @returns 合法 ID 字符串；非法时返回 null
 */
function getConversationId(req: Request): string | null {
  const id = req.params.id

  if (typeof id !== 'string' || !id.trim()) {
    return null
  }

  return id
}

/**
 * 创建会话
 * POST /api/conversations
 * 请求体可选：{ title?: string }
 */
export async function create(req: Request, res: Response) {
  try {
    const { title } = req.body

    const conversation = await conversationService.createConversation(title)

    // 标注意义上应为 201，但响应体 code 沿用 200 的约定（与项目其他接口保持一致）
    res.status(201).json({
      code: 200,
      message: '会话创建成功',
      data: conversation,
    })
  } catch (error) {
    console.error('创建会话失败：', error)

    res.status(500).json({
      code: 500,
      message: '创建会话失败',
    })
  }
}

/**
 * 获取会话列表
 * GET /api/conversations
 * 说明：参数以下划线开头表示"有意不使用"，避免 ESLint 未使用变量告警
 */
export async function list(_req: Request, res: Response) {
  try {
    const conversations = await conversationService.getConversations()

    res.json({
      code: 200,
      message: '获取会话列表成功',
      data: conversations,
    })
  } catch (error) {
    console.error('获取会话列表失败：', error)

    res.status(500).json({
      code: 500,
      message: '获取会话列表失败',
    })
  }
}

/**
 * 获取会话详情
 * GET /api/conversations/:id
 */
export async function detail(req: Request, res: Response) {
  try {
    const id = getConversationId(req)

    if (!id) {
      res.status(400).json({
        code: 400,
        message: '无效的会话 ID',
      })
      return
    }

    const conversation = await conversationService.getConversationById(id)

    res.json({
      code: 200,
      message: '获取会话详情成功',
      data: conversation,
    })
  } catch (error) {
    // Service 层用错误信息表达"业务上的不存在"，这里转换为 404
    if (error instanceof Error && error.message === '会话不存在') {
      res.status(404).json({
        code: 404,
        message: '会话不存在',
      })
      return
    }

    console.error('获取会话详情失败：', error)

    res.status(500).json({
      code: 500,
      message: '获取会话详情失败',
    })
  }
}

/**
 * 删除会话
 * DELETE /api/conversations/:id
 */
export async function remove(req: Request, res: Response) {
  try {
    const id = getConversationId(req)

    if (!id) {
      res.status(400).json({
        code: 400,
        message: '无效的会话 ID',
      })
      return
    }

    await conversationService.removeConversation(id)

    res.json({
      code: 200,
      message: '会话删除成功',
    })
  } catch (error) {
    if (error instanceof Error && error.message === '会话不存在') {
      res.status(404).json({
        code: 404,
        message: '会话不存在',
      })
      return
    }

    console.error('删除会话失败：', error)

    res.status(500).json({
      code: 500,
      message: '删除会话失败',
    })
  }
}

/**
 * 更新会话标题
 * PATCH /api/conversations/:id/title
 * 请求体：{ title: string }
 */
export async function rename(req: Request, res: Response) {
  try {
    const id = getConversationId(req)

    if (!id) {
      res.status(400).json({
        code: 400,
        message: '无效的会话 ID',
      })
      return
    }

    const { title } = req.body

    // 标题必填且不能是纯空白
    if (typeof title !== 'string' || !title.trim()) {
      res.status(400).json({
        code: 400,
        message: '会话标题不能为空',
      })
      return
    }

    const conversation = await conversationService.renameConversation(id, title)

    res.json({
      code: 200,
      message: '会话标题更新成功',
      data: conversation,
    })
  } catch (error) {
    if (error instanceof Error && error.message === '会话不存在') {
      res.status(404).json({
        code: 404,
        message: '会话不存在',
      })
      return
    }

    console.error('更新会话标题失败：', error)

    res.status(500).json({
      code: 500,
      message: '更新会话标题失败',
    })
  }
}
