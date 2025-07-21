# Sportea Production Monitoring & Analytics Setup

## 1. Error Tracking with Sentry

### Installation
```bash
npm install @sentry/react @sentry/tracing
```

### Configuration
```javascript
// src/lib/sentry.js
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_APP_ENV,
  integrations: [
    new BrowserTracing({
      tracingOrigins: ["localhost", /^https:\/\/.*\.vercel\.app$/],
    }),
  ],
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter out development errors
    if (import.meta.env.DEV) {
      return null;
    }
    return event;
  },
});

export default Sentry;
```

### Usage in Components
```javascript
import Sentry from '@/lib/sentry';

// Capture exceptions
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error);
  throw error;
}

// Add breadcrumbs
Sentry.addBreadcrumb({
  message: 'User joined match',
  category: 'user-action',
  data: { matchId, userId }
});
```

## 2. Performance Monitoring

### Web Vitals Tracking
```javascript
// src/lib/analytics.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
}

// Measure all Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Lighthouse CI Configuration
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['https://sportea.vercel.app'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

## 3. Database Monitoring

### Supabase Monitoring Queries
```sql
-- Monitor database performance
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;

-- Check slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  stddev_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor connection usage
SELECT 
  state,
  COUNT(*) as connection_count
FROM pg_stat_activity
GROUP BY state;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;
```

### Database Alerts Setup
```javascript
// scripts/db-monitoring.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDatabaseHealth() {
  const checks = [
    {
      name: 'Connection Count',
      query: `SELECT COUNT(*) as count FROM pg_stat_activity`,
      threshold: 80,
      alert: 'High connection count detected'
    },
    {
      name: 'Slow Queries',
      query: `SELECT COUNT(*) as count FROM pg_stat_statements WHERE mean_time > 1000`,
      threshold: 5,
      alert: 'Multiple slow queries detected'
    },
    {
      name: 'Database Size',
      query: `SELECT pg_database_size(current_database()) as size`,
      threshold: 1000000000, // 1GB
      alert: 'Database size approaching limit'
    }
  ];

  for (const check of checks) {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: check.query
    });

    if (error) {
      console.error(`Check ${check.name} failed:`, error);
      continue;
    }

    const value = data[0]?.count || data[0]?.size || 0;
    if (value > check.threshold) {
      // Send alert (implement your alerting mechanism)
      console.warn(`ALERT: ${check.alert} - Value: ${value}`);
    }
  }
}

// Run every 5 minutes
setInterval(checkDatabaseHealth, 5 * 60 * 1000);
```

## 4. Uptime Monitoring

### UptimeRobot Configuration
```javascript
// Endpoints to monitor
const endpoints = [
  'https://sportea.vercel.app',
  'https://sportea.vercel.app/api/health',
  'https://fcwwuiitsghknsvnsrxp.supabase.co/rest/v1/',
];

// Health check endpoint
// api/health.js
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VITE_APP_VERSION,
    environment: process.env.NODE_ENV
  });
}
```

## 5. User Analytics

### Google Analytics 4 Setup
```javascript
// src/lib/gtag.js
export const GA_TRACKING_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Initialize GA
export const gtag = (...args) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
};

// Track page views
export const pageview = (url) => {
  gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};

// Track events
export const event = ({ action, category, label, value }) => {
  gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};
```

### Custom Event Tracking
```javascript
// Track user interactions
import { event } from '@/lib/gtag';

// Match creation
event({
  action: 'create_match',
  category: 'engagement',
  label: 'sport_type',
  value: 1
});

// User registration
event({
  action: 'sign_up',
  category: 'user',
  label: 'registration_method',
  value: 1
});

// Match joining
event({
  action: 'join_match',
  category: 'engagement',
  label: 'match_type',
  value: 1
});
```

## 6. Log Management

### Structured Logging
```javascript
// src/lib/logger.js
class Logger {
  constructor() {
    this.environment = import.meta.env.VITE_APP_ENV;
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: this.environment,
      ...data
    };

    if (this.environment === 'production') {
      // Send to external logging service
      this.sendToLogService(logEntry);
    } else {
      console.log(JSON.stringify(logEntry, null, 2));
    }
  }

  info(message, data) {
    this.log('info', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  error(message, data) {
    this.log('error', message, data);
  }

  sendToLogService(logEntry) {
    // Implement your log aggregation service
    // Examples: LogRocket, DataDog, Splunk
  }
}

export default new Logger();
```

## 7. Alert Configuration

### Slack Notifications
```javascript
// scripts/alerts.js
async function sendSlackAlert(message, severity = 'warning') {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  
  const payload = {
    text: `🚨 Sportea Alert - ${severity.toUpperCase()}`,
    attachments: [
      {
        color: severity === 'error' ? 'danger' : 'warning',
        fields: [
          {
            title: 'Message',
            value: message,
            short: false
          },
          {
            title: 'Environment',
            value: process.env.NODE_ENV,
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date().toISOString(),
            short: true
          }
        ]
      }
    ]
  };

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```
