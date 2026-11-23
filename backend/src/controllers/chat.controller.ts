import type {
  Request,
  Response,
  NextFunction
} from 'express';

import { chatWithAI } from '../services/chat.service.js';

export async function chat(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { message } = req.body;

    if (
      typeof message !== 'string' ||
      !message.trim()
    ) {
      res.status(400).json({
        code: 400,
        message: '请输入有效的问题'
      });
      return;
    }

    const result = await chatWithAI(message.trim());

    res.json({
      code: 200,
      message: 'AI 回答成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
}