/**
 * Optimized Logger Service
 * Provides environment-based logging with performance considerations
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

const LOG_LEVEL_NAMES = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG',
  4: 'TRACE'
};

class Logger {
  constructor() {
    // Set log level based on environment
    this.logLevel = this.getLogLevel();
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Performance monitoring
    this.performanceMarks = new Map();
    
    // Error tracking
    this.errorCount = 0;
    this.maxErrors = 100; // Prevent memory leaks
    this.recentErrors = [];
  }

  /**
   * Get log level from environment
   */
  getLogLevel() {
    const envLevel = process.env.REACT_APP_LOG_LEVEL;
    
    if (envLevel && LOG_LEVELS[envLevel.toUpperCase()] !== undefined) {
      return LOG_LEVELS[envLevel.toUpperCase()];
    }
    
    // Default levels by environment
    switch (process.env.NODE_ENV) {
      case 'production':
        return LOG_LEVELS.ERROR; // Only errors in production
      case 'test':
        return LOG_LEVELS.WARN;
      case 'development':
      default:
        return LOG_LEVELS.DEBUG;
    }
  }

  /**
   * Check if log level should be output
   */
  shouldLog(level) {
    return level <= this.logLevel;
  }

  /**
   * Format log message with timestamp and context
   */
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    
    if (this.isDevelopment) {
      return {
        timestamp,
        level: levelName,
        message,
        context
      };
    }
    
    // Simplified format for production
    return `[${timestamp}] ${levelName}: ${message}`;
  }

  /**
   * Error logging with stack trace
   */
  error(message, error = null, context = {}) {
    if (!this.shouldLog(LOG_LEVELS.ERROR)) return;
    
    const logData = this.formatMessage(LOG_LEVELS.ERROR, message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      } : undefined
    });

    console.error(logData);
    
    // Track errors for monitoring
    this.trackError(message, error, context);
  }

  /**
   * Warning logging
   */
  warn(message, context = {}) {
    if (!this.shouldLog(LOG_LEVELS.WARN)) return;
    
    const logData = this.formatMessage(LOG_LEVELS.WARN, message, context);
    console.warn(logData);
  }

  /**
   * Info logging
   */
  info(message, context = {}) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;
    
    const logData = this.formatMessage(LOG_LEVELS.INFO, message, context);
    console.info(logData);
  }

  /**
   * Debug logging (development only)
   */
  debug(message, context = {}) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    
    const logData = this.formatMessage(LOG_LEVELS.DEBUG, message, context);
    console.debug(logData);
  }

  /**
   * Trace logging (development only)
   */
  trace(message, context = {}) {
    if (!this.shouldLog(LOG_LEVELS.TRACE)) return;
    
    const logData = this.formatMessage(LOG_LEVELS.TRACE, message, context);
    console.trace(logData);
  }

  /**
   * Performance timing start
   */
  timeStart(label) {
    if (!this.isDevelopment) return;
    
    this.performanceMarks.set(label, performance.now());
    console.time(label);
  }

  /**
   * Performance timing end
   */
  timeEnd(label) {
    if (!this.isDevelopment) return;
    
    const startTime = this.performanceMarks.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.performanceMarks.delete(label);
      console.timeEnd(label);
      
      // Log if duration is significant
      if (duration > 100) {
        this.warn(`Performance: ${label} took ${duration.toFixed(2)}ms`, {
          duration,
          label
        });
      }
    }
  }

  /**
   * Track errors for monitoring
   */
  trackError(message, error, context) {
    this.errorCount++;
    
    const errorInfo = {
      timestamp: Date.now(),
      message,
      error: error ? {
        name: error.name,
        message: error.message
      } : null,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.recentErrors.push(errorInfo);
    
    // Keep only recent errors to prevent memory leaks
    if (this.recentErrors.length > this.maxErrors) {
      this.recentErrors = this.recentErrors.slice(-this.maxErrors);
    }
    
    // In production, you might want to send errors to a monitoring service
    if (this.isProduction && window.gtag) {
      window.gtag('event', 'exception', {
        description: message,
        fatal: false
      });
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      totalErrors: this.errorCount,
      recentErrors: this.recentErrors.slice(-10), // Last 10 errors
      errorRate: this.recentErrors.length / Math.max(1, (Date.now() - (this.recentErrors[0]?.timestamp || Date.now())) / 60000) // errors per minute
    };
  }

  /**
   * Clear error history
   */
  clearErrors() {
    this.recentErrors = [];
    this.errorCount = 0;
  }

  /**
   * Group related logs
   */
  group(label, collapsed = false) {
    if (!this.isDevelopment) return;
    
    if (collapsed) {
      console.groupCollapsed(label);
    } else {
      console.group(label);
    }
  }

  /**
   * End log group
   */
  groupEnd() {
    if (!this.isDevelopment) return;
    console.groupEnd();
  }

  /**
   * Log API calls for debugging
   */
  api(method, url, data = null, response = null) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    
    this.debug(`API ${method.toUpperCase()} ${url}`, {
      method,
      url,
      data,
      response: response ? {
        status: response.status,
        statusText: response.statusText
      } : null
    });
  }

  /**
   * Log component lifecycle events
   */
  component(name, event, props = {}) {
    if (!this.shouldLog(LOG_LEVELS.TRACE)) return;
    
    this.trace(`Component ${name} ${event}`, {
      component: name,
      event,
      props: Object.keys(props)
    });
  }
}

// Create singleton instance
const logger = new Logger();

// Export convenience methods
export const logError = (message, error, context) => logger.error(message, error, context);
export const logWarn = (message, context) => logger.warn(message, context);
export const logInfo = (message, context) => logger.info(message, context);
export const logDebug = (message, context) => logger.debug(message, context);
export const logTrace = (message, context) => logger.trace(message, context);

export const timeStart = (label) => logger.timeStart(label);
export const timeEnd = (label) => logger.timeEnd(label);

export const logApi = (method, url, data, response) => logger.api(method, url, data, response);
export const logComponent = (name, event, props) => logger.component(name, event, props);

export default logger;
