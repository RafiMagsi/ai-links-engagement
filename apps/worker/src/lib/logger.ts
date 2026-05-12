import pino from 'pino';

let logger: pino.Logger;

export function initializeLogger(level: string = 'info'): pino.Logger {
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

export function getLogger(): pino.Logger {
  if (!logger) {
    return initializeLogger();
  }
  return logger;
}
