import type { Request, Response, NextFunction } from 'express'

import { chatWithAI } from '../services/chat.service.js'
import { streamDeepSeek } from '../ai/models/deepseek.js'
import * as conversationChatService from '../services/chat.service.js'

export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const { messages } = req.body

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      !messages.every(
        (item) =>
          item &&
          ['user', 'assistant'].includes(item.role) &&
          typeof item.content === 'string' &&
          item.content.trim().length > 0,
      )
    ) {
      res.status(400).json({
        code: 400,
        message: '请输入有效的问题',
      })
      return
    }

    const result = await chatWithAI(messages)

    res.json({
      code: 200,
      message: 'AI 回答成功',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function streamChat(req: Request, res: Response, next: NextFunction) {
  const { messages } = req.body

  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    !messages.every(
      (item) =>
        item &&
        ['user', 'assistant'].includes(item.role) &&
        typeof item.content === 'string' &&
        item.content.trim().length > 0,
    )
  ) {
    res.status(400).json({
      code: 400,
      message: '请输入有效的对话消息',
    })
    return
  }

  const systemMessage = {
    role: 'system' as const,
    content: `
                你是一个 AI 技术助手，通过 DeepSeek API 提供服务。

                你的主要职责是帮助用户解决前端、后端和人工智能应用开发问题。

                请遵守以下规则：
                1. 使用中文回答。
                2. 不得声称自己是 Claude、GPT 或其他模型。
                3. 不确定的信息必须明确说明。
                4. 回答技术问题时，尽量解释原理并提供可运行的代码。
                5. 不要编造自己的知识截止日期或技术能力。
            `,
  }

  const abortController = new AbortController()

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  res.flushHeaders()

  const onClose = () => {
    if (!res.writableEnded) {
      abortController.abort()
    }
  }

  res.on('close', onClose)

  try {
    for await (const content of streamDeepSeek(
      [systemMessage, ...messages],
      abortController.signal,
    )) {
      if (res.destroyed || res.writableEnded) break

      res.write(`data: ${JSON.stringify({ content })}\n\n`)
    }

    if (!res.destroyed && !res.writableEnded) {
      res.write('data: [DONE]\n\n')
      res.end()
    }
  } catch (error) {
    if (!res.destroyed && !res.writableEnded) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: error instanceof Error ? error.message : 'AI 服务异常',
        })}\n\n`,
      )
      res.end()
    } else {
      next(error)
    }
  } finally {
    res.off('close', onClose)
  }
}

export async function chatWithConversation(req: Request, res: Response) {
  const conversationId = req.params.id
  const content = req.body?.content

  if (typeof conversationId !== 'string' || !conversationId.trim()) {
    return res.status(400).json({
      code: 400,
      message: '会话 ID 不合法',
    })
  }

  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({
      code: 400,
      message: '消息内容不能为空',
    })
  }
  //   这里有一个细节：
  // - 正常生成完成时，执行 res.end()，writableEnded 会变成 true。
  // - 如果客户端提前关闭连接，writableEnded 通常仍然是 false，这时才取消上游请求。
  const abortController = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort()
    }
  })

  try {
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    res.flushHeaders()

    let answer = ''

    for await (const chunk of conversationChatService.chatWithConversation(
      conversationId,
      content,
      abortController.signal,
    )) {
      answer += chunk

      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    console.error('会话聊天失败：', error)
    if (abortController.signal.aborted) {
      return
    }
    if (!res.headersSent) {
      return res.status(500).json({
        code: 500,
        message: '聊天请求失败',
      })
    }

    res.write(
      `event: error\ndata: ${JSON.stringify({
        message: 'AI 生成失败',
      })}\n\n`,
    )

    res.end()
  }
}
