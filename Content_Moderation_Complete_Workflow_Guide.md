# Content Moderation System - Complete Workflow Guide

## 📋 **System Overview**

The Content Moderation System provides ML-powered administrative oversight for match content in the Sportea platform. It uses a hybrid approach combining XLM-RoBERTa ML model with enhanced lexicon fallback to detect toxic content and ensure community safety.

### **Core Technology Stack**
- **Primary Algorithm**: XLM-RoBERTa ML Model + Enhanced Lexicon Fallback
- **Main Implementation**: `src/services/contentModerationService.js`
- **Edge Function**: `supabase/functions/moderate-match-content/index.ts`
- **Database Tables**: `content_moderation_results`, `admin_review_queue`, `host_notifications`
- **UI Integration**: Admin Dashboard + Host Notifications

### **Risk-Based Decision System**
- **HIGH (≥60%)**: Auto-reject + admin alert
- **MEDIUM (30-59%)**: Queue for manual review
- **LOW (15-29%)**: Auto-approve with monitoring
- **MINIMAL (<15%)**: Auto-approve

---

## 🔍 **Complete Moderation Journey: From Content Submission to Decision**

### **The Complete Content Safety Journey**
The system takes user-submitted match content (title + description) and processes it through multiple layers of analysis to determine if it's safe for the community, requiring human review, or should be automatically rejected.

---

## **Phase 1: Content Submission & Initial Processing**
**Files**: `src/services/contentModerationService.js` → Edge Function
**Function**: `moderateContent(title, description, matchData)`

### **Process Overview**
When a user creates a match, their title and description are immediately sent to the content moderation system for safety analysis before the match becomes visible to other users.

### **Content Flow Visualization**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   User Creates  │───▶│  Content Capture │───▶│   Moderation Queue  │
│   Match Content │    │                  │    │                     │
└─────────────────┘    └──────────────────┘    │ Title: "Football"   │
                                               │ Desc: "Join us..."  │
                                               │ Match ID: 123       │
                                               └─────────────────────┘
```

### **Simple Code Example**
```javascript
// User submits match content
async function submitMatchContent(matchData) {
  const { title, description, id } = matchData;
  
  // Send to moderation system
  const moderationResult = await moderateContent(title, description, { id });
  
  return {
    matchId: id,
    title: title,                    // "Football match at Shah Alam"
    description: description,        // "Join us for friendly football..."
    status: 'pending_moderation'     // Waiting for safety check
  };
}
```

**Simple Explanation**: Capture user's match title and description and send them to the moderation system for safety analysis before making the match public.

---

## **Phase 2: ML-Powered Toxic Content Detection**
**File**: `supabase/functions/moderate-match-content/index.ts`
**Function**: XLM-RoBERTa Model Analysis + Enhanced Lexicon Fallback

### **Process Overview**
The system uses advanced ML models to analyze the content for toxic language, inappropriate terms, and community guideline violations. It supports both English and Malay languages with cultural context awareness.

### **ML Analysis Flow**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    ML Content Analysis Pipeline                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Step 1: XLM-RoBERTa Model (Primary)                               │
│ ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐         │
│ │ "Join us    │───▶│ ML Analysis  │───▶│ Toxicity: 15%   │         │
│ │ for football"│    │ (Multilingual)│    │ Confidence: High│         │
│ └─────────────┘    └──────────────┘    └─────────────────┘         │
│                                                                     │
│ Step 2: Enhanced Lexicon Fallback (If ML Fails)                   │
│ ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐         │
│ │ Text Content│───▶│ Keyword Scan │───▶│ Flagged Words   │         │
│ │             │    │ (EN + Malay) │    │ Risk Score      │         │
│ └─────────────┘    └──────────────┘    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

### **Simple Code Example**
```javascript
// ML-powered content analysis
async function analyzeContent(title, description) {
  // Call edge function with ML model
  const { data: result } = await supabase.functions.invoke('moderate-match-content', {
    body: { title, description }
  });
  
  return {
    toxicityScore: result.inappropriate_score,    // 0.15 = 15% toxic
    riskLevel: result.overall_risk_level,         // "low"
    flaggedWords: result.flagged_content.toxic_words,  // ["badword1"]
    modelUsed: result.flagged_content.model_used,      // "XLM-RoBERTa"
    confidence: result.model_confidence.toxic_detection // "high"
  };
}
```

**Simple Explanation**: Use advanced AI to scan the content for inappropriate language, toxic behavior, and community guideline violations in both English and Malay.

---

## **Phase 3: Risk Assessment & Decision Logic**
**File**: `src/services/contentModerationService.js`
**Function**: Risk level calculation and action determination

### **Process Overview**
Based on the ML analysis results, the system calculates an overall risk score and determines the appropriate action: auto-approve, queue for review, or auto-reject.

### **Risk Decision Matrix**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    Risk-Based Decision System                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Toxicity Score    Risk Level    Action           Admin Required     │
│ ┌─────────────┬─────────────┬─────────────┬─────────────────────┐   │
│ │ 0-15%       │ MINIMAL     │ Auto-Approve│ No                  │   │
│ │ 15-30%      │ LOW         │ Auto-Approve│ Monitor Only        │   │
│ │ 30-60%      │ MEDIUM      │ Manual Review│ Yes - Queue        │   │
│ │ 60%+        │ HIGH        │ Auto-Reject │ Yes - Alert         │   │
│ └─────────────┴─────────────┴─────────────┴─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### **Simple Code Example**
```javascript
// Risk assessment and decision logic
function determineAction(toxicityScore) {
  let riskLevel, action, requiresReview;
  
  if (toxicityScore >= 0.6) {          // 60%+ toxic
    riskLevel = 'high';
    action = 'auto_reject';
    requiresReview = true;             // Admin alert
  } else if (toxicityScore >= 0.3) {   // 30-59% toxic
    riskLevel = 'medium'; 
    action = 'manual_review';
    requiresReview = true;             // Queue for admin
  } else if (toxicityScore >= 0.15) {  // 15-29% toxic
    riskLevel = 'low';
    action = 'auto_approve_monitor';
    requiresReview = false;            // Approve but monitor
  } else {                             // <15% toxic
    riskLevel = 'minimal';
    action = 'auto_approve';
    requiresReview = false;            // Safe to approve
  }
  
  return { riskLevel, action, requiresReview };
}
```

**Simple Explanation**: Based on how toxic the content is, decide whether to approve it immediately, send it to human reviewers, or reject it automatically.

---

## **Phase 4: Admin Review Queue Management**
**File**: `src/services/contentModerationService.js`
**Functions**: `addToAdminQueue()`, `getModerationQueue()`, `getPendingReviews()`

### **Process Overview**
Content that requires human review is added to an admin queue with priority levels. Admins can view, review, and make decisions on flagged content through the admin dashboard.

### **Admin Queue Workflow**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    Admin Review Queue System                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Priority Assignment:                                                │
│ ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐         │
│ │ HIGH Risk   │───▶│ Priority: 3  │───▶│ Urgent Review   │         │
│ │ MEDIUM Risk │───▶│ Priority: 2  │───▶│ Standard Review │         │
│ │ LOW Risk    │───▶│ Priority: 1  │───▶│ Low Priority    │         │
│ └─────────────┘    └──────────────┘    └─────────────────┘         │
│                                                                     │
│ Admin Dashboard View:                                               │
│ ┌─────────────────────────────────────────────────────────────┐     │
│ │ Queue ID | Match Title    | Risk  | Flagged Words | Action │     │
│ ├─────────────────────────────────────────────────────────────┤     │
│ │ 001      | "Football..."  | HIGH  | [badword]     | Review │     │
│ │ 002      | "Basketball.." | MED   | [spam]        | Review │     │
│ └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### **Simple Code Example**
```javascript
// Add content to admin review queue
async function addToAdminQueue(matchId, moderationResultId, riskLevel) {
  const priority = riskLevel === 'high' ? 3 : riskLevel === 'medium' ? 2 : 1;

  const queueItem = await supabase
    .from('admin_review_queue')
    .insert({
      match_id: matchId,
      moderation_result_id: moderationResultId,
      priority: priority,                    // 3 = urgent, 2 = high, 1 = low
      status: 'pending'                      // Waiting for admin review
    });

  console.log(`Added match ${matchId} to admin queue with priority ${priority}`);
  return queueItem;
}

// Get pending reviews for admin dashboard
async function getPendingReviews() {
  const reviews = await supabase
    .from('admin_review_queue')
    .select(`
      *,
      matches(title, description),
      content_moderation_results(*)
    `)
    .eq('status', 'pending')
    .order('priority', { ascending: false });  // Highest priority first

  return reviews; // Returns list of content waiting for admin review
}
```

**Simple Explanation**: Put content that needs human review into a priority queue where admins can see the most urgent items first and make approve/reject decisions.

---

## **Phase 5: Admin Decision Processing**
**File**: `src/services/contentModerationService.js`
**Functions**: `approveMatch()`, `rejectMatch()`, `sendEnhancedHostNotification()`

### **Process Overview**
Admins review flagged content and make approve/reject decisions. The system then updates match status, notifies the host, and applies the decision across the platform.

### **Admin Decision Flow**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    Admin Decision Processing                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Admin Reviews Content:                                              │
│ ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐         │
│ │ View Match  │───▶│ Make Decision│───▶│ Process Action  │         │
│ │ Details     │    │ (Approve/    │    │ Update Status   │         │
│ │ + Risk Info │    │  Reject)     │    │ Notify Host     │         │
│ └─────────────┘    └──────────────┘    └─────────────────┘         │
│                                                                     │
│ Approval Path:                                                      │
│ ┌─────────────────────────────────────────────────────────────┐     │
│ │ Match Status: upcoming → moderation_status: approved        │     │
│ │ Host Notification: "✅ Match Approved - Ready for Players" │     │
│ │ Public Visibility: YES                                      │     │
│ └─────────────────────────────────────────────────────────────┘     │
│                                                                     │
│ Rejection Path:                                                     │
│ ┌─────────────────────────────────────────────────────────────┐     │
│ │ Match Status: cancelled → moderation_status: rejected       │     │
│ │ Host Notification: "🚨 Match Rejected - Policy Violation"  │     │
│ │ Public Visibility: NO                                       │     │
│ └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### **Simple Code Example**
```javascript
// Admin approves content
async function approveMatch(queueId, adminId, notes) {
  // Update queue status
  await supabase
    .from('admin_review_queue')
    .update({
      status: 'approved',
      admin_decision: 'approve',
      admin_notes: notes,
      completed_at: new Date().toISOString()
    })
    .eq('id', queueId);

  // Make match public
  await supabase
    .from('matches')
    .update({
      status: 'upcoming',              // Ready for participants
      moderation_status: 'approved'    // Passed moderation
    })
    .eq('id', matchId);

  // Notify host
  await sendHostNotification(matchId, 'approved',
    '✅ Match Approved - Ready for Participants');

  return { success: true, message: 'Match approved successfully' };
}

// Admin rejects content
async function rejectMatch(queueId, adminId, reason, notes) {
  // Update queue status
  await supabase
    .from('admin_review_queue')
    .update({
      status: 'rejected',
      admin_decision: 'reject',
      admin_action_reason: reason,     // "Inappropriate language"
      admin_notes: notes,
      completed_at: new Date().toISOString()
    })
    .eq('id', queueId);

  // Hide match from public
  await supabase
    .from('matches')
    .update({
      status: 'cancelled',             // Remove from listings
      moderation_status: 'rejected'    // Failed moderation
    })
    .eq('id', matchId);

  // Notify host with detailed reason
  await sendHostNotification(matchId, 'rejected',
    '🚨 Match Rejected - Content Policy Violation', reason);

  return { success: true, message: 'Match rejected successfully' };
}
```

**Simple Explanation**: When admins approve content, make it public and notify the host. When they reject it, hide it from users and explain why to the host.

---

## **Phase 6: Host Notification & Feedback Loop**
**File**: `src/services/contentModerationService.js`
**Function**: `sendEnhancedHostNotification()`, Host Dashboard Integration

### **Process Overview**
The system sends detailed notifications to match hosts about moderation decisions, providing clear feedback on why content was approved or rejected, helping users understand community guidelines.

### **Notification System Flow**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    Host Notification System                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Approval Notification:                                              │
│ ┌─────────────────────────────────────────────────────────────┐     │
│ │ Title: "✅ Match Approved - Ready for Participants"        │     │
│ │ Message: "Your match 'Football at Shah Alam' has been      │     │
│ │          approved and is now live for other users to join" │     │
│ │ Action: Match becomes visible to all users                 │     │
│ └─────────────────────────────────────────────────────────────┘     │
│                                                                     │
│ Rejection Notification:                                             │
│ ┌─────────────────────────────────────────────────────────────┐     │
│ │ Title: "🚨 Match Rejected - Content Policy Violation"      │     │
│ │ Message: "Your match was rejected due to inappropriate     │     │
│ │          language. Flagged words: [badword1, badword2]"    │     │
│ │ Action: Match hidden, host can create new appropriate one  │     │
│ └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### **Simple Code Example**
```javascript
// Send detailed notification to host
async function sendHostNotification(matchId, type, title, details) {
  // Get host information
  const { data: match } = await supabase
    .from('matches')
    .select('host_id, title')
    .eq('id', matchId)
    .single();

  // Create notification
  const notification = await supabase
    .from('host_notifications')
    .insert({
      host_id: match.host_id,
      match_id: matchId,
      notification_type: type,           // 'approved' or 'rejected'
      title: title,                      // "✅ Match Approved"
      message: details,                  // Detailed explanation
      is_read: false,
      created_at: new Date().toISOString()
    });

  console.log(`Notification sent to host ${match.host_id}: ${type}`);
  return notification;
}
```

**Simple Explanation**: Send clear, detailed messages to match hosts explaining whether their content was approved or rejected, helping them understand community guidelines for future posts.

---

## 🎯 **Complete Journey Summary**

### **Data Transformation Flow**
```
User Content → ML Analysis → Risk Assessment → Admin Review (if needed) →
Decision Processing → Host Notification → Public Visibility

Result: "Safe content goes live, unsafe content is blocked, hosts learn guidelines!"
```

### **Key Functions in Live System**
- **`moderateContent(title, description, matchData)`**: Main entry point for content analysis
- **`analyzeContent()`**: ML-powered toxic content detection
- **`addToAdminQueue()`**: Queue flagged content for human review
- **`approveMatch()`**: Admin approval workflow with notifications
- **`rejectMatch()`**: Admin rejection workflow with detailed feedback
- **`sendEnhancedHostNotification()`**: Comprehensive host communication

### **Database Tables**
- **`content_moderation_results`**: Stores ML analysis results and risk scores
- **`admin_review_queue`**: Manages content waiting for human review
- **`host_notifications`**: Delivers moderation decisions to users

### **Performance Characteristics**
- **Primary Model**: XLM-RoBERTa (multilingual toxic content detection)
- **Fallback System**: Enhanced lexicon with English + Malay keywords
- **Risk Thresholds**: 15% (low), 30% (medium), 60% (high)
- **Response Time**: <2s for ML analysis, instant for cached results
- **Languages Supported**: English + Bahasa Malaysia

---

## 📊 **Technical Implementation Notes**

### **Why ML + Lexicon Hybrid?**
- **ML Accuracy**: XLM-RoBERTa provides sophisticated context understanding
- **Cultural Awareness**: Enhanced lexicon covers Malaysian context and slang
- **Reliability**: Fallback system ensures no content goes unmoderated
- **Performance**: Edge function deployment for fast response times

### **System Scalability**
- **Edge Function**: Serverless ML processing for high throughput
- **Caching Strategy**: Results cached to prevent re-analysis
- **Priority Queue**: Urgent content gets faster admin attention
- **Batch Processing**: Multiple items can be reviewed simultaneously

### **Integration Points**
- **Match Creation**: Automatic moderation on content submission
- **Admin Dashboard**: Queue management and decision interface
- **Host Notifications**: Real-time feedback system
- **Public Listings**: Moderation status controls visibility

This completes the comprehensive Content Moderation System workflow guide, documenting the actual ML-powered implementation from content submission to final decision delivery.
