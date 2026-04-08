export const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug',
} as const;

interface LogEntry {
  level: (typeof LogLevel)[keyof typeof LogLevel];
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  userId?: string;
}

class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) Logger.instance = new Logger();
    return Logger.instance;
  }

  private log(entry: LogEntry) {
    if (import.meta.env.DEV) {
      console[entry.level](
        `[${entry.timestamp}] [${entry.context}]: ${entry.message}`,
        entry.metadata,
      );
    }
  }

  public info(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.log({ level: 'info', message, context, metadata, timestamp: new Date().toISOString() });
  }

  public warn(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.log({ level: 'warn', message, context, metadata, timestamp: new Date().toISOString() });
  }

  public error(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.log({ level: 'error', message, context, metadata, timestamp: new Date().toISOString() });
  }

  public debug(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.log({ level: 'debug', message, context, metadata, timestamp: new Date().toISOString() });
  }
}

export const logger = Logger.getInstance();
