# Vector Encoding System - Critical Issue Analysis

## 🚨 **CRITICAL DISCOVERY: Data Structure Mismatch**

**Date:** 2025-07-07 16:15:00  
**Status:** URGENT - Vector regeneration is WORSENING similarity scores  
**Impact:** Basketball: 16% → 12% (-4%), Volleyball: 13% → 2% (-11%)

## **Root Cause Identified**

### **Issue: Edge Function Data Structure Mismatch**

The `generate-user-embeddings-v2` edge function is expecting sport preferences from a `user_sport_preferences` table with this structure:
```sql
sport_preferences:user_sport_preferences(
  preference_strength,
  sport:sports(name)
)
```

**However, the actual data is stored in the `users.sport_preferences` JSONB column:**
```json
[
  {"id": 1, "name": "Volleyball", "level": "Beginner"},
  {"id": 2, "name": "Badminton", "level": "Intermediate"}, 
  {"id": 4, "name": "Football", "level": "Beginner"},
  {"id": "1751901489686", "name": "Basketball", "level": "Beginner"}
]
```

### **Consequence**
- Edge function receives `null` for sport preferences
- Vector generation defaults to empty/minimal encoding
- Similarity scores decrease instead of improve
- System fails to encode Football, Basketball, Volleyball properly

## **Immediate Action Required**

### **Option 1: Fix Edge Function (RECOMMENDED)**
Update `generate-user-embeddings-v2` to read from `users.sport_preferences` JSONB column instead of non-existent `user_sport_preferences` table.

### **Option 2: Migrate Data Structure**
Create `user_sport_preferences` table and migrate existing data, but this requires database schema changes.

## **Evidence**

### **Before Vector Regeneration:**
- Basketball: 16% similarity
- Volleyball: 13% similarity

### **After Vector Regeneration (BROKEN):**
- Basketball: 12% similarity (-4%)
- Volleyball: 2% similarity (-11%)

### **User Data (Azmil - 0debd257-a63a-4ccf-83a8-6c3ee17a2bf2):**
```json
{
  "sport_preferences": [
    {"id": 1, "name": "Volleyball", "level": "Beginner"},
    {"id": 2, "name": "Badminton", "level": "Intermediate"}, 
    {"id": 4, "name": "Football", "level": "Beginner"},
    {"id": "1751901489686", "name": "Basketball", "level": "Beginner"}
  ],
  "skill_levels": {},
  "play_style": "casual"
}
```

## **Next Steps**

1. **URGENT:** Fix edge function to read correct data structure
2. **Deploy:** Updated edge function immediately
3. **Test:** Verify vector regeneration with correct data
4. **Validate:** Confirm similarity scores improve to 70-90% range
5. **Document:** Results for academic defense

## **Expected Results After Fix**

With proper data encoding:
- **Football matches:** 80-95% similarity (currently N/A)
- **Basketball matches:** 70-85% similarity (currently 12%)
- **Volleyball matches:** 70-85% similarity (currently 2%)
- **Badminton matches:** 70-85% similarity (if available)

## **Technical Details**

The edge function query needs to be updated from:
```sql
sport_preferences:user_sport_preferences(
  preference_strength,
  sport:sports(name)
)
```

To directly access:
```sql
sport_preferences
```

And parse the JSONB array in the vector generation function.
