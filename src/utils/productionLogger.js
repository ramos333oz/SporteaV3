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

// Enhanced log level configuration with performance considerations
const CURRENT_LOG_LEVEL = (() => {
  // Check for URL parameter override (for debugging in production)
  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('debug');

  if (debugParam === 'true' && isProduction) {
    console.warn('[Sportea] Debug mode enabled in production via URL parameter');
    return LOG_LEVELS.WARN; // Limited debug in production
  }

  return isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR; // More restrictive in production
})();

// Performance-optimized logging configuration
const LOGGING_CONFIG = {
  // Reduce real-time logging frequency
  realtimeThrottleMs: isDev ? 0 : 5000, // Throttle real-time logs to every 5 seconds in production

  // Batch console operations to reduce performance impact
  batchSize: isDev ? 1 : 10,
  batchTimeoutMs: isDev ? 0 : 1000,

  // Limit recommendation system logging
  recommendationLogLimit: isDev ? Infinity : 1, // Only log first recommendation in production

  // Connection status logging limits
  maxConnectionLogs: isDev ? Infinity : 5, // Limit connection status logs

  // Memory monitoring frequency
  memoryCheckIntervalMs: isDev ? 30000 : 300000, // Check memory every 5 minutes in production
};

/**
 * Production-safe logger
 */
class ProductionLogger {
  constructor() {
    this.startTime = Date.now();
    this.logCount = 0;
    this.errorCount = 0;

    // Throttling and batching state
    this.throttleTimers = new Map();
    this.logBatch = [];
    this.batchTimer = null;
    this.logCounters = new Map(); // Track log frequency by category

    // Performance monitoring
    this.lastMemoryCheck = 0;
    this.connectionLogCount = 0;
    this.recommendationLogCount = 0;
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
   * Optimized memory usage logging with throttling
   */
  memory(label) {
    if (!performance.memory) return;

    const now = Date.now();

    // Throttle memory checks based on environment
    if (now - this.lastMemoryCheck < LOGGING_CONFIG.memoryCheckIntervalMs) {
      return;
    }

    this.lastMemoryCheck = now;

    const memory = performance.memory;
    const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);

    // Only log if memory usage is concerning or in development
    if (isDev || usedMB > 50) { // Alert if over 50MB in production
      this.debug(`Memory [${label}]:`, {
        used: `${usedMB}MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
      });
    }
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
   * Throttled realtime connection logging
   */
  realtime(event, data) {
    // Limit connection logs in production
    if (isProduction && this.connectionLogCount >= LOGGING_CONFIG.maxConnectionLogs) {
      return;
    }

    const throttleKey = `realtime-${event}`;
    if (this.shouldThrottle(throttleKey, LOGGING_CONFIG.realtimeThrottleMs)) {
      return;
    }

    if (isDev || CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      this.connectionLogCount++;
      this.debug(`Realtime [${event}]:`, data);
    }
  }

  /**
   * Throttled recommendation system logging
   */
  recommendation(message, data) {
    // Limit recommendation logs in production
    if (isProduction && this.recommendationLogCount >= LOGGING_CONFIG.recommendationLogLimit) {
      return;
    }

    if (isDev || CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      this.recommendationLogCount++;
      this.debug(`Recommendation: ${message}`, data);
    }
  }

  /**
   * Throttling helper method
   */
  shouldThrottle(key, intervalMs) {
    if (intervalMs === 0) return false;

    const now = Date.now();
    const lastLog = this.throttleTimers.get(key);

    if (!lastLog || now - lastLog >= intervalMs) {
      this.throttleTimers.set(key, now);
      return false;
    }

    return true;
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
export const logRecommendation = (message, data) => logger.recommendation(message, data);
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
