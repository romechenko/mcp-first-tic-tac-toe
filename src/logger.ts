// Create an in-memory log store
export type LogEntry = {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
};

export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 100;

  log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    // Log to console as well
    console.log(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
    
    // Add to in-memory store
    this.logs.unshift(entry);
    
    // Trim logs if needed
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  getLogs(count: number = this.maxLogs): LogEntry[] {
    return this.logs.slice(0, count);
  }
}

// Create logger instance
export const logger = new Logger();
