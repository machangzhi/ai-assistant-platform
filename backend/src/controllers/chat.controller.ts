import type { Request, Response, NextFunction } from 'express'

import { chatWithAI } from '../services/chat.service.js'
import { streamDeepSeek } from '../ai/models/deepseek.js'

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
