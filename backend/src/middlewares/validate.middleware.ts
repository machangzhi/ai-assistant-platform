
import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        code: 400,
        message: '请求参数校验失败',
        errors: result.error.issues.map(item => ({
          field: item.path.join('.'),
          message: item.message
        }))
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
