# Supabase Production Database Setup

## 1. Production Database Configuration

### Enable Production Features
```sql
-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

-- Enable SSL enforcement
ALTER SYSTEM SET ssl = on;

-- Set up connection pooling
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
```

### Database Optimization
```sql
-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_start_time ON matches(start_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_sport_location ON matches(sport_id, location_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_match_user ON participants(match_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_gamification_xp ON user_gamification(total_xp DESC);

-- Enable query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

## 2. Security Configuration

### Network Restrictions
- Enable IP restrictions in Supabase Dashboard
- Add your domain to allowed origins
- Configure CORS properly

### API Key Management
- Rotate service role keys monthly
- Use environment-specific keys
- Never expose service role key to client

## 3. Backup Strategy

### Automated Backups
- Enable daily automated backups
- Set retention period to 30 days
- Test restore procedures monthly

### Manual Backup Commands
```bash
# Export schema
supabase db dump --schema-only > schema.sql

# Export data
supabase db dump --data-only > data.sql

# Full backup
supabase db dump > full-backup.sql
```

## 4. Monitoring Setup

### Performance Monitoring
```sql
-- Monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Set up Alerts
- Database CPU usage > 80%
- Connection count > 80
- Storage usage > 80%
- Failed authentication attempts > 10/minute
