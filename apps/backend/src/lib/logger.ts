import pino from 'pino';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug'),
  ...(IS_PRODUCTION
    ? {} // JSON output in production for log aggregation
    : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});
