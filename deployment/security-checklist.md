# Sportea Security Configuration Checklist

## 1. Environment Variables Security

### Production Environment Variables Setup
```bash
# In Vercel Dashboard → Settings → Environment Variables

# Public variables (safe to expose to client)
VITE_SUPABASE_URL=https://fcwwuiitsghknsvnsrxp.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_APP_ENV=production
VITE_APP_NAME=Sportea

# Private variables (server-side only)
SUPABASE_SERVICE_KEY=your_service_key_here
HUGGINGFACE_API_KEY=your_hf_key_here
SUPABASE_DB_PASSWORD=your_db_password_here
```

### Security Rules
- ✅ Never expose service role keys to client
- ✅ Use VITE_ prefix only for client-safe variables
- ✅ Rotate API keys monthly
- ✅ Use different keys for staging/production

## 2. Supabase Security Configuration

### Row Level Security (RLS) Policies
```sql
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON users
FOR SELECT USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE USING (auth.uid() = id);

-- Matches are visible to all authenticated users
CREATE POLICY "Authenticated users can view matches" ON matches
FOR SELECT TO authenticated USING (true);

-- Only hosts can update their matches
CREATE POLICY "Hosts can update own matches" ON matches
FOR UPDATE USING (auth.uid() = host_id);

-- Participants can view their own participation
CREATE POLICY "Users can view own participation" ON participants
FOR SELECT USING (auth.uid() = user_id);
```

### Database Security Settings
```sql
-- Enable SSL enforcement
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = 'server.crt';
ALTER SYSTEM SET ssl_key_file = 'server.key';

-- Set secure authentication
ALTER SYSTEM SET password_encryption = 'scram-sha-256';

-- Limit connections
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET superuser_reserved_connections = 3;
```

## 3. Application Security Headers

### Content Security Policy
```javascript
// In vercel.json or _headers file
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.huggingface.co;"
}
```

### Security Headers Checklist
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy: camera=(), microphone=()

## 4. Authentication Security

### Supabase Auth Configuration
```javascript
// In Supabase Dashboard → Authentication → Settings

// Email confirmation required
email_confirm_required: true

// Strong password requirements
password_min_length: 8
password_require_uppercase: true
password_require_lowercase: true
password_require_numbers: true
password_require_symbols: true

// Session settings
session_timeout: 3600 // 1 hour
refresh_token_rotation: true
```

### Rate Limiting
```sql
-- Implement rate limiting for sensitive operations
CREATE OR REPLACE FUNCTION rate_limit_check(
  user_id UUID,
  action_type TEXT,
  max_attempts INTEGER DEFAULT 5,
  window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM rate_limit_log
  WHERE user_id = $1
    AND action_type = $2
    AND created_at > NOW() - INTERVAL '1 minute' * window_minutes;
    
  RETURN attempt_count < max_attempts;
END;
$$ LANGUAGE plpgsql;
```

## 5. Data Protection

### Sensitive Data Handling
- ✅ Hash passwords using bcrypt
- ✅ Encrypt PII data at rest
- ✅ Use HTTPS for all communications
- ✅ Implement data retention policies
- ✅ Regular security audits

### GDPR Compliance
- ✅ Data processing consent
- ✅ Right to be forgotten implementation
- ✅ Data portability features
- ✅ Privacy policy updates
- ✅ Data breach notification procedures

## 6. Monitoring & Alerting

### Security Monitoring
```sql
-- Monitor failed login attempts
SELECT 
  email,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM auth.audit_log_entries
WHERE event_type = 'user_signinup_failed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) > 5;
```

### Alert Configuration
- ✅ Failed authentication attempts > 10/hour
- ✅ Unusual database access patterns
- ✅ High error rates in applications
- ✅ Suspicious user behavior patterns
- ✅ SSL certificate expiration warnings
