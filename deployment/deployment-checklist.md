# Sportea Production Deployment Checklist

## Pre-Deployment Checklist

### 1. Code Quality & Security
- [ ] Run `npm run lint:fix` to fix all linting issues
- [ ] Remove all console.log statements from production code
- [ ] Ensure no hardcoded secrets in code
- [ ] Update all dependencies to latest stable versions
- [ ] Run security audit: `npm audit fix`

### 2. Environment Configuration
- [ ] Create `.env.production` with production values
- [ ] Verify all environment variables are set
- [ ] Test build process: `npm run build:prod`
- [ ] Verify bundle size is optimized

### 3. Database Preparation
- [ ] Run all pending migrations
- [ ] Enable RLS on all tables
- [ ] Set up production indexes
- [ ] Configure backup strategy
- [ ] Test database connection from production environment

### 4. Supabase Edge Functions
- [ ] Deploy all edge functions: `npm run supabase:deploy`
- [ ] Test edge function endpoints
- [ ] Verify JWT verification settings
- [ ] Check function logs for errors

## Deployment Steps

### Step 1: Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
npm run deploy:vercel
```

### Step 2: Configure Environment Variables in Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all variables from `.env.production`
3. Set Environment to "Production"
4. Redeploy if needed

### Step 3: Custom Domain Setup
1. In Vercel Dashboard → Domains
2. Add your custom domain (e.g., sportea.app)
3. Configure DNS records as instructed
4. SSL certificate will be auto-provisioned

### Step 4: Performance Optimization
- [ ] Enable Vercel Analytics
- [ ] Configure caching headers
- [ ] Set up CDN for static assets
- [ ] Enable compression

## Post-Deployment Verification

### 1. Functionality Testing
- [ ] User registration/login works
- [ ] Match creation and joining works
- [ ] Real-time notifications work
- [ ] File uploads work
- [ ] All API endpoints respond correctly

### 2. Performance Testing
- [ ] Page load times < 3 seconds
- [ ] Lighthouse score > 90
- [ ] Mobile responsiveness verified
- [ ] Cross-browser compatibility tested

### 3. Security Testing
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] No sensitive data exposed
- [ ] Rate limiting works
- [ ] Authentication flows secure

### 4. Monitoring Setup
- [ ] Error tracking configured (Sentry)
- [ ] Performance monitoring active
- [ ] Database monitoring enabled
- [ ] Uptime monitoring configured

## Rollback Plan
1. Keep previous deployment available
2. Database backup before deployment
3. Quick rollback procedure documented
4. Emergency contact information ready
