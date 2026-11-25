/**
 * AI 聊天控制器
 * ------------------------------------------------------------
 * 提供三种对话能力：
 * 1. chat：非流式一次性回答（前端携带完整 messages，服务端不落库）；
 * 2. streamChat：无状态流式回答（同样由前端携带完整 messages）；
 * 3. chatWithConversation：按会话持久化的流式回答，
 *    用户消息与 AI 回答都会写入数据库，上下文由服务端根据历史消息构建。
 *
 * SSE（Server-Sent Events）约定：
 * - 响应头 Content-Type: text/event-stream
 * - 每个事件使用 `data: <json>\n\n` 分隔
 * - 结束标记：`data: [DONE]\n\n`
 * - 异常事件：`event: error\ndata: {...}\n\n`
 */

import type { Request, Response, NextFunction } from 'express'

import { chatWithAI } from '../services/chat.service.js'
import { streamDeepSeek } from '../ai/models/deepseek.js'
import * as conversationChatService from '../services/chat.service.js'

/**
 * 非流式对话
 * POST /api/chat
 * 请求体：{ messages: [{ role, content }] }
 */
export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const { messages } = req.body

    // 校验消息数组：
    // - 必须是数组且非空；
    // - 每一项 role 只能是 user / assistant（不允许前端传 system）；
    // - content 必须是非空字符串。
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

/**
 * 无状态流式对话
 * POST /api/chat/stream
 * 请求体：{ messages: [{ role, content }] }
 *
 * 特点：
 * - 不落库，适合轻量演示；
 * - 客户端断开连接时，通过 AbortController 中止上游 DeepSeek 请求，
 *   避免继续消耗 token 与连接资源。
 */
export async function streamChat(req: Request, res: Response, next: NextFunction) {
  const { messages } = req.body

  // 与非流式接口相同的入参校验
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

  // 系统提示词：约束模型角色、语言与回答风格
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

  // 用于在客户端断开时取消上游请求
  const abortController = new AbortController()

  // 设置 SSE 必需响应头
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  // 关闭 Nginx 等反向代理的缓冲，确保内容能实时下发
  res.setHeader('X-Accel-Buffering', 'no')

  // 立即发送响应头，让客户端尽早进入流式读取状态
  res.flushHeaders()

  /**
   * 连接关闭回调
   * 只有"客户端提前断开"时 writableEnded 才是 false；
   * 正常生成结束时服务端已调用 res.end()，不需要也不应该再中止。
   */
  const onClose = () => {
    if (!res.writableEnded) {
      abortController.abort()
    }
  }

  res.on('close', onClose)

  try {
    // 逐段消费模型输出并转发给客户端
    for await (const content of streamDeepSeek(
      [systemMessage, ...messages],
      abortController.signal,
    )) {
      // 双保险：连接已销毁/已结束时立即停止写入
      if (res.destroyed || res.writableEnded) break

      res.write(`data: ${JSON.stringify({ content })}\n\n`)
    }

    // 正常结束：发送结束标记并关闭响应
    if (!res.destroyed && !res.writableEnded) {
      res.write('data: [DONE]\n\n')
      res.end()
    }
  } catch (error) {
    // 已开始推送时无法改状态码，只能用 SSE error 事件通知前端
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
    // 事件监听器必须移除，避免同一响应对象被重复处理或内存泄漏
    res.off('close', onClose)
  }
}

/**
 * 会话内流式对话（落库）
 * POST /api/conversations/:id/chat/stream
 * 请求体：{ content: string }
 *
 * 与 streamChat 的区别：
 * - 前端只发送本次用户输入，上下文由服务端读取最近 N 条历史构建；
 * - 用户消息与完整 AI 回答都会持久化（由 Service 层负责）。
 */
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

    // 聚合完整回答（虽然 Service 内部也会聚合落库，这里主要用于兜底与调试）
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
    // 主动取消（客户端断开）属于预期内的结束，不需要再响应
    if (abortController.signal.aborted) {
      return
    }
    // 还未发送响应头时，可以正常返回 JSON 错误
    if (!res.headersSent) {
      return res.status(500).json({
        code: 500,
        message: '聊天请求失败',
      })
    }

    // 已进入流式响应阶段，只能用 SSE error 事件通知
    res.write(
      `event: error\ndata: ${JSON.stringify({
        message: 'AI 生成失败',
      })}\n\n`,
    )

    res.end()
  }
}
