const winston = require('winston');
const path = require('path');

class Logger {
  constructor(context = 'App') {
    this.context = context;
    
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          const logObj = {
            timestamp,
            level,
            context: context || this.context,
            message,
            ...meta
          };
          return JSON.stringify(logObj);
        })
      ),
      defaultMeta: { service: 'centrika-api', context: this.context },
      transports: [
        new winston.transports.File({ 
          filename: path.join(logsDir, 'error.log'), 
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({ 
          filename: path.join(logsDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });

    // Add console transport for non-production environments
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} ${level} [${context || this.context}]: ${message}${metaStr}`;
          })
        )
      }));
    }
  }

  info(message, meta = {}) {
    this.logger.info(message, { ...meta, context: this.context });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, { ...meta, context: this.context });
  }

  error(message, meta = {}) {
    this.logger.error(message, { ...meta, context: this.context });
  }

  debug(message, meta = {}) {
    this.logger.debug(message, { ...meta, context: this.context });
  }

  // Create child logger with additional context
  child(additionalContext) {
    const childLogger = new Logger(`${this.context}:${additionalContext}`);
    return childLogger;
  }
}

const LogLevel = {
  ERROR: 'error',
  WARN: 'warn', 
  INFO: 'info',
  DEBUG: 'debug'
};

module.exports = { Logger, LogLevel };