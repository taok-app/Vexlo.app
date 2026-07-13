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
    // Serialize errors properly
    const serializedData = data ? this.serializeData(data) : undefined

    const entry: LogEntry = {
      level,
      timestamp: new Date(),
      module: this.module,
      message,
      data: serializedData,
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
        serializedData ? JSON.stringify(serializedData, null, 2) : '',
      )
    } else {
      // In production, use structured logging
      console.log(JSON.stringify(entry))
    }
  }

  private serializeData(data: Record<string, unknown>): Record<string, unknown> {
    const serialized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Error) {
        serialized[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack,
        }
      } else if (value && typeof value === 'object') {
        try {
          // Try to serialize complex objects
          serialized[key] = JSON.parse(JSON.stringify(value))
        } catch {
          // If serialization fails, convert to string
          serialized[key] = String(value)
        }
      } else {
        serialized[key] = value
      }
    }

    return serialized
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
