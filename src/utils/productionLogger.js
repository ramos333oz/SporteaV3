/**
 * Production Logger Utility
 * 
 * PERFORMANCE IMPROVEMENTS:
 * - Disables excessive logging in production
 * - Reduces CPU overhead from console operations
 * - Maintains error logging for debugging
 * - Implements log levels and filtering
 * 
 * Based on production performance best practices
 */

// Environment detection
const isDev = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level based on environment
const CURRENT_LOG_LEVEL = isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;

/**
 * Production-safe logger
 */
class ProductionLogger {
  constructor() {
    this.startTime = Date.now();
    this.logCount = 0;
    this.errorCount = 0;
  }

  /**
   * Error logging (always enabled)
   */
  error(...args) {
    this.errorCount++;
    console.error('[Sportea Error]', ...args);
    
    // In production, could send to error tracking service
    if (isProduction) {
      this.sendToErrorTracking('error', args);
    }
  }

  /**
   * Warning logging (production + dev)
   */
  warn(...args) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
      console.warn('[Sportea Warn]', ...args);
    }
  }

  /**
   * Info logging (dev only)
   */
  info(...args) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      this.logCount++;
      console.log('[Sportea Info]', ...args);
    }
  }

  /**
   * Debug logging (dev only)
   */
  debug(...args) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      this.logCount++;
      console.log('[Sportea Debug]', ...args);
    }
  }

  /**
   * Performance logging
   */
  perf(label, fn) {
    if (!isDev) {
      // In production, just execute without timing
      return fn();
    }

    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    this.debug(`Performance [${label}]:`, `${(end - start).toFixed(2)}ms`);
    return result;
  }

  /**
   * Async performance logging
   */
  async perfAsync(label, fn) {
    if (!isDev) {
      return await fn();
    }

    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    this.debug(`Performance [${label}]:`, `${(end - start).toFixed(2)}ms`);
    return result;
  }

  /**
   * Memory usage logging (dev only)
   */
  memory(label) {
    if (!isDev || !performance.memory) return;

    const memory = performance.memory;
    this.debug(`Memory [${label}]:`, {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
    });
  }

  /**
   * Network request logging
   */
  network(method, url, status, duration) {
    if (status >= 400) {
      this.error(`Network Error [${method}] ${url}:`, status, `${duration}ms`);
    } else if (isDev) {
      this.debug(`Network [${method}] ${url}:`, status, `${duration}ms`);
    }
  }

  /**
   * Realtime connection logging
   */
  realtime(event, data) {
    if (isDev) {
      this.debug(`Realtime [${event}]:`, data);
    }
  }

  /**
   * Component lifecycle logging (dev only)
   */
  component(name, event, data) {
    if (isDev) {
      this.debug(`Component [${name}] ${event}:`, data);
    }
  }

  /**
   * Get logging statistics
   */
  getStats() {
    return {
      uptime: Date.now() - this.startTime,
      logCount: this.logCount,
      errorCount: this.errorCount,
      environment: isDev ? 'development' : 'production',
      logLevel: Object.keys(LOG_LEVELS)[CURRENT_LOG_LEVEL]
    };
  }

  /**
   * Send errors to tracking service (production)
   */
  sendToErrorTracking(level, args) {
    // Placeholder for error tracking service integration
    // Could integrate with Sentry, LogRocket, etc.
    if (isProduction) {
      // Example: Sentry.captureException(new Error(args.join(' ')));
    }
  }

  /**
   * Batch logging for performance
   */
  batch(logs) {
    if (!isDev) return;

    console.group('[Sportea Batch Logs]');
    logs.forEach(({ level, message, data }) => {
      switch (level) {
        case 'error':
          this.error(message, data);
          break;
        case 'warn':
          this.warn(message, data);
          break;
        case 'info':
          this.info(message, data);
          break;
        case 'debug':
          this.debug(message, data);
          break;
      }
    });
    console.groupEnd();
  }
}

// Create singleton instance
const logger = new ProductionLogger();

// Export convenience methods
export const logError = (...args) => logger.error(...args);
export const logWarn = (...args) => logger.warn(...args);
export const logInfo = (...args) => logger.info(...args);
export const logDebug = (...args) => logger.debug(...args);
export const logPerf = (label, fn) => logger.perf(label, fn);
export const logPerfAsync = (label, fn) => logger.perfAsync(label, fn);
export const logMemory = (label) => logger.memory(label);
export const logNetwork = (method, url, status, duration) => logger.network(method, url, status, duration);
export const logRealtime = (event, data) => logger.realtime(event, data);
export const logComponent = (name, event, data) => logger.component(name, event, data);

// Export logger instance
export default logger;

/**
 * Replace console.log in existing code
 * Usage: import { log } from './utils/productionLogger';
 */
export const log = isDev ? console.log : () => {};

/**
 * Performance monitoring wrapper
 */
export const withPerformanceMonitoring = (Component, name) => {
  if (!isDev) return Component;

  return function PerformanceMonitoredComponent(props) {
    logger.component(name, 'render-start');
    
    const result = Component(props);
    
    logger.component(name, 'render-end');
    return result;
  };
};

/**
 * Memory leak detection (dev only)
 */
export const detectMemoryLeaks = () => {
  if (!isDev || !performance.memory) return;

  const checkMemory = () => {
    const memory = performance.memory;
    const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    
    if (usedMB > 100) { // Alert if over 100MB
      logWarn('High memory usage detected:', `${usedMB.toFixed(2)}MB`);
    }
  };

  // Check every 30 seconds in dev
  setInterval(checkMemory, 30000);
};

/**
 * Initialize production logging
 */
export const initializeProductionLogging = () => {
  if (isDev) {
    logInfo('Production logger initialized in development mode');
    detectMemoryLeaks();
  } else {
    // In production, override console methods to reduce noise
    const originalConsoleLog = console.log;
    console.log = () => {}; // Disable console.log in production

    // Note: logInfo and logDebug are constants and cannot be reassigned
    // They will still work in production but with reduced output
  }
  
  logInfo('Sportea logging system initialized', logger.getStats());
};
