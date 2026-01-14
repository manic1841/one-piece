type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
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
    // 1. 開發環境：印出到控制台
    if (import.meta.env.DEV) {
      console[entry.level](
        `[${entry.timestamp}] [${entry.context}]: ${entry.message}`,
        entry.metadata,
      );
    }

    // 2. 生產環境：緩衝並發送到遠端日誌伺服器 (如 ELK, Sentry, Datadog)
    // if (entry.level === 'error' || entry.level === 'warn') {
    //   this.sendToRemote(entry);
    // }
  }

  //   private sendToRemote(entry: LogEntry) {
  //     // 實作發送到 API 的邏輯（建議使用 Queue 或是 Batch 處理，避免影響效能）
  //     console.log('Sending log to remote server:', entry);
  //   }

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
