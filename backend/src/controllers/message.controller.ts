import type { Request, Response } from 'express'
import * as messageService from '../services/message.service'

function getConversationId(req: Request): string | null {
  const id = req.params.id

  if (typeof id !== 'string' || !id.trim()) {
    return null
  }

  return id
}

/**
 * 保存消息
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
 * 获取消息列表
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
 * 清空消息
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
