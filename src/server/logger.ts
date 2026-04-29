import { pino } from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  base: { service: 'pulsefile-pulse' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function newRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}
