import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = req.requestId || 'unknown';

  if (err instanceof AppError) {
    logger.warn({ requestId, statusCode: err.statusCode, error: err.message }, 'App error');
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  logger.error({ requestId, error: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
