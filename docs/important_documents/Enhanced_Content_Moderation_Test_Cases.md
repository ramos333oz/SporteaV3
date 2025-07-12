# Enhanced Content Moderation System - Comprehensive Test Cases

## Overview

This document contains comprehensive test cases for the enhanced content moderation system that focuses solely on toxic content detection with sports context whitelisting.

## Test Categories

### 1. Low-Risk Scenarios (Should be Auto-Approved)

#### 1.1 Sports Competitive Language (Whitelisted)
These should be automatically approved as they contain competitive language in proper sports context:

**Test Case 1.1.1: English Football Competition**
- **Title**: "Destroy the Competition - Football Championship"
- **Description**: "Come and battle for victory in this intense football match! We'll crush the opposition and dominate the field. Fight for every goal and destroy their defense. This is war on the football pitch - may the best team win!"
- **Expected Result**: Auto-approved (minimal risk)
- **Reason**: Competitive language in clear sports context

**Test Case 1.1.2: Malay Basketball Battle**
- **Title**: "Pertarungan Basketball - Hancurkan Lawan"
- **Description**: "Mari berperang untuk kemenangan dalam perlawanan basketball yang sengit! Kita akan dominasi gelanggang dan hancurkan pertahanan lawan. Bertarung untuk setiap mata dan tunjukkan kehebatan!"
- **Expected Result**: Auto-approved (minimal risk)
- **Reason**: Malay competitive language in sports context

**Test Case 1.1.3: Mixed Language Tennis Domination**
- **Title**: "Tennis Doubles - Dominate the Court"
- **Description**: "Join us to crush the competition in this epic tennis doubles tournament! Mari sertai kami untuk menguasai gelanggang tenis. We'll battle for every point and destroy the opposition with our killer serves!"
- **Expected Result**: Auto-approved (minimal risk)
- **Reason**: Mixed language competitive terms in tennis context

#### 1.2 Clean Sports Content
**Test Case 1.2.1: Friendly Basketball Session**
- **Title**: "Friendly Basketball Training Session"
- **Description**: "Join us for a fun and friendly basketball training session! All skill levels welcome. We'll practice shooting, dribbling, and team play. Bring your own water bottle and towel."
- **Expected Result**: Auto-approved (minimal risk)
- **Reason**: Clean, appropriate sports content

**Test Case 1.2.2: Malay Badminton Training**
- **Title**: "Sesi Latihan Badminton Malam"
- **Description**: "Sertai kami untuk sesi latihan badminton yang menyeronokkan! Semua tahap kemahiran dialu-alukan. Kita akan berlatih teknik asas dan permainan berpasukan."
- **Expected Result**: Auto-approved (minimal risk)
- **Reason**: Clean Malay sports content

### 2. Medium-Risk Scenarios (Should be Flagged for Review)

#### 2.1 Borderline Inappropriate Content
**Test Case 2.1.1: Mild Profanity in Sports Context**
- **Title**: "Football Match - Don't Suck!"
- **Description**: "Join our football match and show you don't suck at this game! We'll have an awesome time and play some damn good football. No losers allowed!"
- **Expected Result**: Flagged for review (medium risk)
- **Reason**: Contains mild profanity that isn't whitelisted

**Test Case 2.1.2: Inappropriate References**
- **Title**: "Basketball After Party"
- **Description**: "Come play basketball and then we'll have drinks and party! Bring your own alcohol and let's get drunk after the game. It'll be crazy fun!"
- **Expected Result**: Flagged for review (medium risk)
- **Reason**: References to alcohol and inappropriate behavior

### 3. High-Risk Scenarios (Should be Flagged Urgently)

#### 3.1 Explicit English Profanity
**Test Case 3.1.1: Explicit Profanity**
- **Title**: "F*cking Amazing Football Match"
- **Description**: "This is going to be a fucking amazing football match! Don't be a bitch and join us for some damn good football. We'll kick ass and show those bastards how it's done!"
- **Expected Result**: Flagged urgent (high risk)
- **Reason**: Contains explicit profanity not in whitelisted context

**Test Case 3.1.2: Sexual Content**
- **Title**: "Sexy Tennis Tournament"
- **Description**: "Join our tennis tournament with sexy players! We'll have hot action on the court and maybe some naked celebration after. Bring your sexy outfit!"
- **Expected Result**: Flagged urgent (high risk)
- **Reason**: Contains sexual content inappropriate for sports

#### 3.2 Explicit Malay Profanity
**Test Case 3.2.1: Malay Explicit Content**
- **Title**: "Perlawanan Bola Sepak Puki"
- **Description**: "Mari sertai perlawanan bola sepak ini, jangan jadi puki! Kita akan tunjuk siapa yang paling kimak dalam permainan ini. Bangsat yang tak join!"
- **Expected Result**: Flagged urgent (high risk)
- **Reason**: Contains explicit Malay profanity

**Test Case 3.2.2: Malay Threatening Language**
- **Title**: "Basketball - Bunuh Lawan"
- **Description**: "Sertai kami untuk bunuh semua lawan dalam basketball! Kita akan mampuskan mereka dan tunjuk siapa yang paling ganas. Mati lah korang semua!"
- **Expected Result**: Flagged urgent (high risk)
- **Reason**: Contains threatening language not in sports context

#### 3.3 Hate Speech and Discrimination
**Test Case 3.3.1: Discriminatory Language**
- **Title**: "Football for Normal People Only"
- **Description**: "Join our football match for normal people only! No retards, freaks, or weirdos allowed. We only want real athletes, not disabled losers."
- **Expected Result**: Flagged urgent (high risk)
- **Reason**: Contains discriminatory and hate speech

**Test Case 3.3.2: Threatening Violence**
- **Title**: "Basketball Death Match"
- **Description**: "Come to our basketball match where we'll murder the competition! I'll kill anyone who tries to beat me. This is real violence on the court!"
- **Expected Result**: Flagged urgent (high risk)
- **Reason**: Contains threatening violence not in sports context

### 4. Edge Cases

#### 4.1 Context-Dependent Phrases
**Test Case 4.1.1: Ambiguous Competitive Language**
- **Title**: "Killer Basketball Skills"
- **Description**: "Show off your killer basketball skills in this match! We'll have some deadly competition and brutal training. Come prepared for savage gameplay!"
- **Expected Result**: Auto-approved (minimal risk)
- **Reason**: Competitive language clearly in sports context

**Test Case 4.1.2: Mixed Context**
- **Title**: "Football and Life Battles"
- **Description**: "Join our football match where we battle on the field and in life! We'll destroy the competition in sports and crush our personal enemies too!"
- **Expected Result**: Flagged for review (medium risk)
- **Reason**: Mixed sports and non-sports threatening context

#### 4.2 Multilingual Edge Cases
**Test Case 4.2.1: Code-Switching**
- **Title**: "Basketball Gila - Crazy Good Game"
- **Description**: "Mari join our basketball game yang gila! It's going to be damn good fun with some killer moves. Jangan miss this awesome opportunity!"
- **Expected Result**: Auto-approved (minimal risk)
- **Reason**: Natural code-switching with mild language in sports context

**Test Case 4.2.2: False Positive Prevention**
- **Title**: "Badminton Smash Training"
- **Description**: "Learn to smash in badminton! We'll teach you to kill the shuttlecock and destroy your opponents' defense. Master the art of attacking play!"
- **Expected Result**: Auto-approved (minimal risk)
- **Reason**: Sports-specific terminology that could be misinterpreted

### 5. Automatic Queueing Validation

#### 5.1 Threshold Testing
**Test Case 5.1.1: Just Above Auto-Queue Threshold (0.3)**
- **Title**: "Football Match - Stupid Players Welcome"
- **Description**: "Join our football match even if you're stupid at the game! We welcome idiots and losers who want to improve their pathetic skills."
- **Expected Result**: Flagged for review (low risk, auto-queued)
- **Reason**: Score just above 0.3 threshold

**Test Case 5.1.2: Just Below Auto-Queue Threshold**
- **Title**: "Basketball Training - All Levels"
- **Description**: "Join our basketball training session! All skill levels welcome, from beginners to advanced players. We'll have fun and improve together."
- **Expected Result**: Auto-approved (minimal risk, not queued)
- **Reason**: Score below 0.3 threshold

### 6. Performance and Error Handling

#### 6.1 Large Content Testing
**Test Case 6.1.1: Very Long Description**
- **Title**: "Marathon Basketball Tournament"
- **Description**: [500+ word description with mixed content]
- **Expected Result**: Processed within 5 seconds
- **Reason**: Performance validation

#### 6.2 Special Characters and Encoding
**Test Case 6.2.1: Unicode and Emojis**
- **Title**: "🏀 Basketball Fun 🏀"
- **Description**: "Join our basketball match! 💪 We'll have amazing games with 🔥 competition and 😎 cool players!"
- **Expected Result**: Auto-approved (minimal risk)
- **Reason**: Emoji and unicode handling

### 7. Expected System Behavior

#### 7.1 Optimistic Approval Workflow
1. **Match Creation**: All matches appear immediately in public listings
2. **Background Processing**: Moderation runs asynchronously
3. **Flagged Content**: Matches stay visible but get added to admin queue
4. **Admin Decision**: Only explicit rejection hides matches from public view

#### 7.2 Automatic Queueing
1. **Threshold-Based**: Scores > 0.3 automatically trigger queueing
2. **Priority Assignment**: High risk = urgent, medium risk = high priority
3. **No Manual Intervention**: System automatically populates admin queue
4. **Database Consistency**: All triggers and functions work correctly

#### 7.3 Sports Context Whitelisting
1. **Competitive Language**: Sports competitive terms are whitelisted
2. **Context Awareness**: System distinguishes sports vs non-sports context
3. **Multilingual Support**: Works for both English and Malay
4. **False Positive Prevention**: Legitimate sports content not flagged

## Testing Methodology

### Automated Testing
1. Create test matches with each test case
2. Verify moderation scores and risk levels
3. Confirm automatic queueing behavior
4. Validate database state consistency

### Manual Admin Testing
1. Review flagged items in admin dashboard
2. Test approve/reject/warn actions
3. Verify notification system
4. Check deleted matches functionality

### Performance Testing
1. Measure processing times
2. Test concurrent moderation requests
3. Validate error handling
4. Monitor system resources

## Success Criteria

### Accuracy Metrics
- **False Positive Rate**: < 5% for legitimate sports content
- **False Negative Rate**: < 2% for inappropriate content
- **Processing Time**: < 2 seconds per match
- **Queue Accuracy**: 100% automatic queueing for scores > threshold

### User Experience
- **Match Visibility**: Immediate public visibility (optimistic approval)
- **Admin Workflow**: Efficient review and decision process
- **Host Notifications**: Clear communication of moderation decisions
- **System Reliability**: 99.9% uptime and error handling

## Documentation Requirements

This test suite validates the enhanced content moderation system's ability to:
1. Focus solely on toxic content detection
2. Implement effective sports context whitelisting
3. Provide automatic queueing based on configurable thresholds
4. Maintain seamless user experience with optimistic approval
5. Support comprehensive multilingual content analysis
