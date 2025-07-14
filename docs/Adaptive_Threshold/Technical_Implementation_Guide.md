# Technical Implementation Guide
## Adaptive Threshold Learning for SporteaV3 Content Moderation

### Overview

This guide provides step-by-step technical instructions for implementing the Adaptive Threshold Learning enhancement to SporteaV3's content moderation system. Follow these instructions sequentially to ensure proper integration and functionality.

## Prerequisites

- SporteaV3 development environment set up
- Supabase project with existing content moderation tables
- Node.js 18+ and npm/yarn package manager
- Admin access to Supabase dashboard
- Basic understanding of PostgreSQL and JavaScript/TypeScript

## Implementation Steps

### Step 1: Database Schema Implementation

**1.1 Execute Database Migration**

```bash
# Navigate to your SporteaV3 project directory
cd /path/to/SporteaV3

# Apply the adaptive learning schema
supabase db reset
supabase migration new adaptive_threshold_learning
```

**1.2 Copy Schema Content**

Copy the complete SQL content from `docs/Content_Moderation/Database_Schema_Adaptive_Learning.sql` into your new migration file:

```bash
# Edit the migration file
nano supabase/migrations/[timestamp]_adaptive_threshold_learning.sql
```

**1.3 Apply Migration**

```bash
# Apply the migration
supabase db push

# Verify tables were created
supabase db diff
```

**1.4 Verify Database Setup**

```sql
-- Check that all new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%adaptive%' OR table_name LIKE '%learning%' OR table_name LIKE '%threshold%';

-- Expected tables:
-- adaptive_threshold_history
-- user_behavior_patterns  
-- learning_parameters
-- threshold_contexts
-- learning_feedback_signals
```

### Step 2: Adaptive Threshold Service Implementation

**2.1 Create Service Directory**

```bash
mkdir -p src/services/adaptive-learning
```

**2.2 Install Service File**

Copy `docs/Content_Moderation/Adaptive_Threshold_Service.js` to:
```bash
cp docs/Content_Moderation/Adaptive_Threshold_Service.js src/services/adaptive-learning/adaptiveThresholdService.js
```

**2.3 Update Import Paths**

Edit the service file to match your project structure:

```javascript
// Update this line in adaptiveThresholdService.js
import { supabase } from '../supabase.js'; // Adjust path as needed
```

**2.4 Test Service Installation**

```javascript
// Create test file: src/services/adaptive-learning/test.js
import { adaptiveThresholdService } from './adaptiveThresholdService.js';

async function testService() {
  try {
    const thresholds = await adaptiveThresholdService.getAdaptiveThresholds({
      sport_id: 'football'
    });
    console.log('Service working:', thresholds);
  } catch (error) {
    console.error('Service error:', error);
  }
}

testService();
```

### Step 3: Edge Function Integration

**3.1 Backup Current Edge Function**

```bash
cp supabase/functions/moderate-match-content/index.ts supabase/functions/moderate-match-content/index.ts.backup
```

**3.2 Add Adaptive Threshold Imports**

Add these imports to the top of `supabase/functions/moderate-match-content/index.ts`:

```typescript
// Add after existing imports
interface AdaptiveThresholds {
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  context_id: string | null;
  learning_enabled: boolean;
}

interface LearningContext {
  sport_id: string;
  user_id: string;
  title: string;
  description: string;
  content_length: number;
  language_mix: string;
  time_period: string;
}
```

**3.3 Integrate Adaptive Functions**

Copy the adaptive threshold functions from `docs/Content_Moderation/Integration_Code_Examples.md` into your edge function. Key functions to add:

- `getAdaptiveThresholds()`
- `findBestContextMatch()`
- `calculateRiskLevelAdaptive()`
- `getUserReputationLevel()`
- `detectLanguageMix()`
- `getCurrentTimePeriod()`

**3.4 Modify Main Moderation Function**

Replace the existing `moderateMatchContent` function with the adaptive version from the integration examples.

**3.5 Deploy Edge Function**

```bash
# Deploy the updated edge function
npx supabase functions deploy moderate-match-content
```

### Step 4: Content Moderation Service Integration

**4.1 Backup Current Service**

```bash
cp src/services/contentModerationService.js src/services/contentModerationService.js.backup
```

**4.2 Add Adaptive Learning Functions**

Add these functions to `src/services/contentModerationService.js`:

```javascript
// Add imports
import { adaptiveThresholdService } from './adaptive-learning/adaptiveThresholdService.js';

// Add the functions from Integration_Code_Examples.md:
// - processAdminFeedback()
// - calculateSignalStrength()
// - processLearningSignal()
// - calculateThresholdAdjustment()
// - applyThresholdAdjustment()
```

**4.3 Update Exports**

```javascript
// Add to exports at bottom of file
export {
  // ... existing exports
  processAdminFeedback,
  processLearningSignal
};
```

### Step 5: Admin Dashboard Integration

**5.1 Update Admin Dashboard**

Add the adaptive learning components to `src/pages/AdminDashboard.jsx`:

```jsx
// Add imports
import { processAdminFeedback } from '../services/contentModerationService';

// Add state management
const [adaptiveLearningMetrics, setAdaptiveLearningMetrics] = useState(null);

// Add the functions from Integration_Code_Examples.md:
// - loadAdaptiveLearningMetrics()
// - handleApproveMatch() (modified)
// - handleRejectMatch() (modified)
// - AdaptiveLearningMetrics component
```

**5.2 Add Metrics Display**

Insert the `AdaptiveLearningMetrics` component in the content moderation tab:

```jsx
{currentSection === 'content-moderation' && (
  <>
    <AdaptiveLearningMetrics />
    <ContentModerationTab adminUser={adminUser} />
  </>
)}
```

### Step 6: Configuration Setup

**6.1 Enable Adaptive Learning**

```sql
-- Enable adaptive learning in settings
UPDATE content_moderation_settings 
SET adaptive_learning_enabled = true,
    learning_rate = 0.1000,
    exploration_rate = 0.2000,
    min_feedback_threshold = 10,
    max_threshold_adjustment = 0.0500
WHERE id = (SELECT id FROM content_moderation_settings LIMIT 1);
```

**6.2 Verify Configuration**

```sql
-- Check configuration
SELECT 
    adaptive_learning_enabled,
    learning_rate,
    exploration_rate,
    min_feedback_threshold,
    max_threshold_adjustment
FROM content_moderation_settings;
```

### Step 7: Testing and Validation

**7.1 Run Unit Tests**

```bash
# Create test file
cat > src/services/adaptive-learning/test-integration.js << 'EOF'
import { adaptiveThresholdService } from './adaptiveThresholdService.js';

async function runIntegrationTests() {
  console.log('Testing adaptive threshold service...');
  
  // Test 1: Get thresholds
  const thresholds = await adaptiveThresholdService.getAdaptiveThresholds({
    sport_id: 'football'
  });
  console.log('✓ Thresholds retrieved:', thresholds);
  
  // Test 2: Performance metrics
  const metrics = await adaptiveThresholdService.getPerformanceMetrics();
  console.log('✓ Performance metrics:', metrics);
  
  console.log('All tests passed!');
}

runIntegrationTests().catch(console.error);
EOF

# Run tests
node src/services/adaptive-learning/test-integration.js
```

**7.2 Test Edge Function**

```bash
# Test edge function deployment
curl -X POST 'https://your-project.supabase.co/functions/v1/moderate-match-content' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "matchId": "test-match-id",
    "title": "Test competitive match",
    "description": "Crush the opponents with aggressive defense"
  }'
```

### Step 8: Production Deployment

**8.1 Environment Variables**

Set required environment variables in Supabase:

```bash
# In Supabase dashboard > Settings > Environment Variables
ADAPTIVE_LEARNING_ENABLED=true
LEARNING_RATE=0.1000
EXPLORATION_RATE=0.2000
MAX_THRESHOLD_ADJUSTMENT=0.0500
```

**8.2 Deploy to Production**

```bash
# Deploy all changes
npm run build
supabase db push --linked
npx supabase functions deploy moderate-match-content
```

**8.3 Monitor Deployment**

```sql
-- Monitor learning activity
SELECT 
    COUNT(*) as total_adjustments,
    AVG(ABS(new_value - old_value)) as avg_adjustment_magnitude,
    MAX(created_at) as last_adjustment
FROM adaptive_threshold_history
WHERE created_at > NOW() - INTERVAL '24 hours';
```

## Troubleshooting Common Issues

### Issue 1: Database Migration Fails

**Symptoms**: Migration errors during `supabase db push`

**Solution**:
```bash
# Check for conflicts
supabase db diff

# Reset if needed
supabase db reset
supabase db push
```

### Issue 2: Edge Function Deployment Fails

**Symptoms**: Function deployment errors

**Solution**:
```bash
# Check function logs
supabase functions logs moderate-match-content

# Redeploy with verbose output
npx supabase functions deploy moderate-match-content --debug
```

### Issue 3: Adaptive Learning Not Working

**Symptoms**: No threshold adjustments observed

**Solution**:
```sql
-- Check if learning is enabled
SELECT adaptive_learning_enabled FROM content_moderation_settings;

-- Check for learning signals
SELECT COUNT(*) FROM learning_feedback_signals WHERE processed = false;

-- Check learning parameters
SELECT * FROM learning_parameters;
```

### Issue 4: Performance Degradation

**Symptoms**: Slow response times

**Solution**:
```sql
-- Check database indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename LIKE '%threshold%' OR tablename LIKE '%learning%';

-- Monitor query performance
EXPLAIN ANALYZE SELECT * FROM threshold_contexts WHERE learning_enabled = true;
```

## Performance Optimization

### Database Optimization

```sql
-- Add additional indexes if needed
CREATE INDEX CONCURRENTLY idx_learning_signals_unprocessed 
ON learning_feedback_signals(created_at) 
WHERE processed = false;

-- Vacuum and analyze tables
VACUUM ANALYZE adaptive_threshold_history;
VACUUM ANALYZE learning_feedback_signals;
```

### Caching Strategy

```javascript
// Add caching to adaptive threshold service
const thresholdCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedThresholds(context) {
  const cacheKey = JSON.stringify(context);
  const cached = thresholdCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const thresholds = await getAdaptiveThresholds(context);
  thresholdCache.set(cacheKey, {
    data: thresholds,
    timestamp: Date.now()
  });
  
  return thresholds;
}
```

## Monitoring and Maintenance

### Daily Monitoring Queries

```sql
-- Daily learning activity
SELECT 
    DATE(created_at) as date,
    COUNT(*) as adjustments,
    AVG(ABS(new_value - old_value)) as avg_change
FROM adaptive_threshold_history 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Learning effectiveness
SELECT 
    context_type,
    COUNT(*) as total_contexts,
    AVG(high_risk_threshold) as avg_high_threshold,
    AVG(medium_risk_threshold) as avg_medium_threshold
FROM threshold_contexts 
WHERE learning_enabled = true
GROUP BY context_type;
```

### Weekly Maintenance Tasks

1. **Performance Review**: Check response times and accuracy metrics
2. **Threshold Analysis**: Review threshold drift and stability
3. **Safety Audit**: Verify educational compliance maintained
4. **Database Cleanup**: Archive old learning signals (>30 days)

```sql
-- Archive old learning signals
DELETE FROM learning_feedback_signals 
WHERE created_at < NOW() - INTERVAL '30 days' 
AND processed = true;
```

This technical implementation guide provides all necessary steps to successfully deploy the Adaptive Threshold Learning enhancement to your SporteaV3 content moderation system.
