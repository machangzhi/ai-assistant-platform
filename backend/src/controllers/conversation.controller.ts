import type { Request, Response } from 'express'
import * as conversationService from '../services/conversation.service'
function getConversationId(req: Request): string | null {
  const id = req.params.id

  if (typeof id !== 'string' || !id.trim()) {
    return null
  }

  return id
}

/**
 * 创建会话
 */
export async function create(req: Request, res: Response) {
  try {
    const { title } = req.body

    const conversation = await conversationService.createConversation(title)

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
