export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

const _format = (level: LogLevel, scope: string, message: string): string =>
  `[${new Date().toISOString()}] [${level}] [${scope}] ${message}`;

const _isDebug = (): boolean => !!process.env.DEBUGGER;

export const logger = {
  debug: (scope: string, message: string, ...meta: unknown[]) => {
    if (!_isDebug()) return;
    console.debug(_format(LogLevel.DEBUG, scope, message), ...meta);
  },
  info: (scope: string, message: string, ...meta: unknown[]) => {
    console.info(_format(LogLevel.INFO, scope, message), ...meta);
  },
  warn: (scope: string, message: string, ...meta: unknown[]) => {
    console.warn(_format(LogLevel.WARN, scope, message), ...meta);
  },
  error: (scope: string, message: string, ...meta: unknown[]) => {
    console.error(_format(LogLevel.ERROR, scope, message), ...meta);
  },
};
