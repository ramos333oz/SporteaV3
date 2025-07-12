# Content Moderation System - Confidence Score Thresholds & Rules

## Overview

This document defines the confidence score thresholds, risk levels, and automatic action rules for the SporteaV3 content moderation system.

## ML Model Configuration

### Model Weights
- **Toxic Content Detection**: 60% (Primary concern for user safety)
- **Title-Description Consistency**: 25% (Content quality and relevance)
- **Sports Terminology Validation**: 15% (Domain-specific accuracy)

### Model Details

#### 1. Toxic Content Detection
- **Model**: `unitary/toxic-bert` (Primary) or `martin-ha/toxic-comment-model` (Fallback)
- **Purpose**: Detect inappropriate, toxic, or harmful content
- **Output**: Confidence score 0.0-1.0 (higher = more toxic)
- **Weight**: 60%

#### 2. Title-Description Consistency
- **Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Purpose**: Validate that match title and description are semantically consistent
- **Output**: Similarity score 0.0-1.0 (higher = more consistent)
- **Weight**: 25%
- **Note**: Score is inverted for risk calculation (low consistency = high risk)

#### 3. Sports Terminology Validation
- **Model**: Rule-based system with sports keyword dictionary
- **Purpose**: Ensure content contains appropriate sports terminology
- **Output**: Validation score 0.0-1.0 (higher = more sports-related)
- **Weight**: 15%
- **Note**: Score is inverted for risk calculation (low sports relevance = higher risk)

## Risk Level Calculation

### Overall Risk Score Formula
```
overall_risk_score = (
  (toxic_score * 0.60) + 
  ((1 - consistency_score) * 0.25) + 
  ((1 - sports_validation_score) * 0.15)
)
```

### Risk Level Thresholds

#### High Risk (>= 0.80)
- **Characteristics**: 
  - High toxicity detected (>0.75)
  - OR Very low title-description consistency (<0.30)
  - OR Completely unrelated to sports (<0.20)
- **Automatic Actions**:
  - ❌ **Auto-reject match creation**
  - 🚨 **Immediate admin alert (urgent priority)**
  - 📧 **Send policy violation email to user**
  - 📝 **Log detailed violation report**
- **Admin Review**: Required within 2 hours
- **User Impact**: Match creation blocked, clear feedback provided

#### Medium Risk (0.50 - 0.79)
- **Characteristics**:
  - Moderate toxicity detected (0.40-0.75)
  - OR Moderate consistency issues (0.30-0.60)
  - OR Questionable sports relevance (0.20-0.50)
- **Automatic Actions**:
  - ⏸️ **Queue for manual review (high priority)**
  - 📝 **Create admin review task**
  - ⏳ **Temporary hold on match visibility**
- **Admin Review**: Required within 24 hours
- **User Impact**: Match created but not visible until approved

#### Low Risk (0.20 - 0.49)
- **Characteristics**:
  - Minor content concerns (0.20-0.40 toxicity)
  - OR Slight consistency issues (0.60-0.80)
  - OR Adequate sports relevance (0.50-0.70)
- **Automatic Actions**:
  - 📋 **Queue for review (medium priority)**
  - ✅ **Allow match creation**
  - 👁️ **Enhanced monitoring**
- **Admin Review**: Required within 72 hours
- **User Impact**: Match goes live, flagged for review

#### Minimal Risk (< 0.20)
- **Characteristics**:
  - Very low toxicity (<0.20)
  - AND High consistency (>0.80)
  - AND Strong sports relevance (>0.70)
- **Automatic Actions**:
  - ✅ **Auto-approve immediately**
  - 📊 **Log for analytics only**
- **Admin Review**: Not required
- **User Impact**: Normal match creation flow

## Special Rules & Edge Cases

### Sports Terminology Exceptions
- **Competitive terms**: "beat", "crush", "destroy", "kill" are acceptable in sports context
- **Intensity words**: "aggressive", "fierce", "brutal" are acceptable for sports descriptions
- **Team names**: Common team names and mascots are whitelisted

### Consistency Validation Rules
- **Minimum similarity threshold**: 0.30 (below this triggers medium risk)
- **Language detection**: Non-English content gets lower consistency penalties
- **Length consideration**: Very short descriptions (<20 words) get reduced penalties

### Performance Safeguards
- **Maximum processing time**: 5 seconds
- **Fallback behavior**: If ML models fail, default to manual review (medium risk)
- **Rate limiting**: Maximum 100 moderations per minute per user

## Admin Dashboard Priority System

### Queue Priority Mapping
- **Urgent**: High risk content (immediate attention required)
- **High**: Medium risk content (24-hour SLA)
- **Medium**: Low risk content (72-hour SLA)
- **Low**: System-generated reviews and appeals

### Admin Actions Available
1. **Approve**: Allow match to go live
2. **Reject**: Block match with reason
3. **Request Changes**: Send feedback to user for revision
4. **Escalate**: Forward to senior admin
5. **Add to Whitelist**: Approve and add user/content to trusted list

## Notification System Integration

### User Notifications
- **High Risk Rejection**: Immediate email + in-app notification
- **Medium Risk Hold**: In-app notification about review process
- **Low Risk Flag**: Optional notification about enhanced monitoring

### Admin Notifications
- **Urgent Queue Items**: Real-time alerts
- **Daily Summary**: Queue status and metrics
- **Weekly Report**: Trends and system performance

## Performance Monitoring

### Key Metrics
- **Processing Time**: Target <2 seconds, alert if >5 seconds
- **False Positive Rate**: Target <5% for sports content
- **Admin Response Time**: Track SLA compliance
- **User Appeal Rate**: Monitor for threshold tuning

### Threshold Adjustment Triggers
- **False Positive Rate >10%**: Lower sensitivity
- **High Admin Workload**: Adjust medium risk threshold
- **User Complaints**: Review specific model weights

## Configuration Management

### Environment-Specific Settings

#### Development
- **Strict Mode**: Disabled
- **Auto-rejection**: Disabled (all go to review)
- **Logging**: Verbose

#### Staging
- **Strict Mode**: Enabled
- **Auto-rejection**: Enabled for high risk only
- **Logging**: Standard

#### Production
- **Strict Mode**: Configurable via admin panel
- **Auto-rejection**: Full automation enabled
- **Logging**: Optimized for performance

### Feature Flags
- `CONTENT_MODERATION_ENABLED`: Master switch
- `AUTO_REJECTION_ENABLED`: Allow automatic rejections
- `STRICT_MODE_ENABLED`: Lower thresholds for all risk levels
- `SPORTS_VALIDATION_ENABLED`: Enable sports terminology checking
- `CONSISTENCY_CHECK_ENABLED`: Enable title-description validation

## Implementation Notes

### Model Loading Strategy
- **Lazy Loading**: Models loaded on first use
- **Caching**: Models cached for 24 hours
- **Fallback**: If primary model fails, use secondary or skip that component

### Error Handling
- **Model Timeout**: Default to manual review
- **Network Issues**: Retry 3 times, then manual review
- **Invalid Input**: Log error, allow creation with flag

### Security Considerations
- **Model Integrity**: Verify model checksums
- **Input Sanitization**: Clean input before processing
- **Rate Limiting**: Prevent abuse of moderation system
- **Audit Logging**: Track all moderation decisions
