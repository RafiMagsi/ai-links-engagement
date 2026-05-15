import { pino, type Logger } from 'pino';

let logger: Logger;

export function initializeLogger(level: string = 'info'): Logger {
  logger = pino({
    level,
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
  });

  return logger;
}

export function getLogger(): Logger {
  if (!logger) {
    return initializeLogger();
  }
  return logger;
}
