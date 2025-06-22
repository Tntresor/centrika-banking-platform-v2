const fs = require('fs');
const path = require('path');

// Log levels
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor(context = 'App', level = LogLevel.INFO) {
    this.context = context;
    this.level = level;
    this.logDir = path.join(process.cwd(), 'logs');
    
    // Ensure logs directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  _formatMessage(level, message, meta = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: Object.keys(LogLevel)[level],
      context: this.context,
      message,
      meta,
      pid: process.pid
    };
  }

  _writeLog(level, message, meta = {}) {
    if (level > this.level) return;

    const logEntry = this._formatMessage(level, message, meta);
    const logString = JSON.stringify(logEntry);

    // Console output with colors
    const colors = {
      [LogLevel.ERROR]: '\x1b[31m',  // Red
      [LogLevel.WARN]: '\x1b[33m',   // Yellow
      [LogLevel.INFO]: '\x1b[36m',   // Cyan
      [LogLevel.DEBUG]: '\x1b[37m'   // White
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || reset;
    
    console.log(`${color}[${logEntry.timestamp}] ${logEntry.level} [${this.context}]: ${message}${reset}`);
    
    if (meta && Object.keys(meta).length > 0) {
      console.log(`${color}Meta:${reset}`, meta);
    }

    // File output
    const logFileName = `${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(this.logDir, logFileName);
    
    try {
      fs.appendFileSync(logFilePath, logString + '\n');
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  error(message, meta = {}) {
    this._writeLog(LogLevel.ERROR, message, meta);
  }

  warn(message, meta = {}) {
    this._writeLog(LogLevel.WARN, message, meta);
  }

  info(message, meta = {}) {
    this._writeLog(LogLevel.INFO, message, meta);
  }

  debug(message, meta = {}) {
    this._writeLog(LogLevel.DEBUG, message, meta);
  }
}

module.exports = { Logger, LogLevel };