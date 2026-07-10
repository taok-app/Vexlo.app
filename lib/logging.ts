/**
 * Structured Logging
 * 
 * Provides a consistent logging interface across the application.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  timestamp: Date
  module: string
  message: string
  data?: Record<string, unknown>
}

/**
 * Logger instance
 */
export class Logger {
  constructor(private module: string) {}

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      timestamp: new Date(),
      module: this.module,
      message,
      data,
    }

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      const color = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m', // Green
        warn: '\x1b[33m', // Yellow
        error: '\x1b[31m', // Red
      }[level]
      const reset = '\x1b[0m'
      console.log(
        `${color}[${entry.timestamp.toISOString()}] ${level.toUpperCase()} ${entry.module}${reset}`,
        message,
        data ? JSON.stringify(data, null, 2) : '',
      )
    } else {
      // In production, use structured logging
      console.log(JSON.stringify(entry))
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data)
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data)
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data)
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data)
  }
}

/**
 * Create a logger instance
 */
export function createLogger(module: string): Logger {
  return new Logger(module)
}
