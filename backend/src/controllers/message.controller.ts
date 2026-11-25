/**
 * 消息控制器
 * ------------------------------------------------------------
 * 以会话为父资源，提供消息的保存、查询与清空。
 * Service 层通过抛出带语义的错误信息表达业务异常，
 * 这里统一映射为对应的 HTTP 状态码。
 */

import type { Request, Response } from 'express'
import * as messageService from '../services/message.service.js'

/**
 * 从路由参数中提取会话 ID
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
 * 保存消息
 * POST /api/conversations/:id/messages
 * 请求体：{ role: 'user' | 'assistant', content: string }
 */
export async function create(req: Request, res: Response) {
  try {
    const conversationId = getConversationId(req)

    if (!conversationId) {
      res.status(400).json({
        code: 400,
        message: '无效的会话 ID',
      })
      return
    }

    const { role, content } = req.body

    const message = await messageService.createMessage({
      conversationId,
      role,
      content,
    })

    res.status(201).json({
      code: 200,
      message: '消息保存成功',
      data: message,
    })
  } catch (error) {
    // 按业务错误类型映射状态码：
    // - 会话不存在 -> 404
    // - 内容为空 / 角色不支持 -> 400
    if (error instanceof Error) {
      if (error.message === '会话不存在') {
        res.status(404).json({
          code: 404,
          message: error.message,
        })
        return
      }

      if (error.message === '消息内容不能为空' || error.message === '不支持的消息角色') {
        res.status(400).json({
          code: 400,
          message: error.message,
        })
        return
      }
    }

    console.error('保存消息失败：', error)

    res.status(500).json({
      code: 500,
      message: '保存消息失败',
    })
  }
}

/**
 * 查询消息列表
 * GET /api/conversations/:id/messages
 */
export async function list(req: Request, res: Response) {
  try {
    const conversationId = getConversationId(req)

    if (!conversationId) {
      res.status(400).json({
        code: 400,
        message: '无效的会话 ID',
      })
      return
    }

    const messages = await messageService.getMessages(conversationId)

    res.json({
      code: 200,
      message: '获取消息列表成功',
      data: messages,
    })
  } catch (error) {
    if (error instanceof Error && error.message === '会话不存在') {
      res.status(404).json({
        code: 404,
        message: '会话不存在',
      })
      return
    }

    console.error('获取消息列表失败：', error)

    res.status(500).json({
      code: 500,
      message: '获取消息列表失败',
    })
  }
}

/**
 * 清空会话消息
 * DELETE /api/conversations/:id/messages
 */
export async function clear(req: Request, res: Response) {
  try {
    const conversationId = getConversationId(req)

    if (!conversationId) {
      res.status(400).json({
        code: 400,
        message: '无效的会话 ID',
      })
      return
    }

    await messageService.clearMessages(conversationId)

    res.json({
      code: 200,
      message: '消息清空成功',
    })
  } catch (error) {
    if (error instanceof Error && error.message === '会话不存在') {
      res.status(404).json({
        code: 404,
        message: '会话不存在',
      })
      return
    }

    console.error('清空消息失败：', error)

    res.status(500).json({
      code: 500,
      message: '清空消息失败',
    })
  }
}
