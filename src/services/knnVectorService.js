import { supabase } from './supabase';

/**
 * KNN Vector Building Service
 * 
 * Implements 142-element user vector construction based on User_Vector_Specification.md
 * Vector components: Sport-Skills(33) + Faculty(7) + Campus(13) + Gender(4) + PlayStyle(2) + TimeSlots(49) + Facilities(29) + Padding(5)
 * 
 * Uses unweighted Euclidean distance following TEMPLATE.md methodology for Phase 1 implementation
 */

const DEBUG_MODE = process.env.NODE_ENV !== 'production';
const LOG_PREFIX = '[KNN Vector Service]';

// Vector component mappings based on actual database data
const SPORT_SKILL_MAPPING = {
  // Basketball (positions 0-2)
  'Basketball_Beginner': 0, 'Basketball_Intermediate': 1, 'Basketball_Advanced': 2,
  // Badminton (positions 3-5)
  'Badminton_Beginner': 3, 'Badminton_Intermediate': 4, 'Badminton_Advanced': 5,
  // Football (positions 6-8)
  'Football_Beginner': 6, 'Football_Intermediate': 7, 'Football_Advanced': 8,
  // Frisbee (positions 9-11)
  'Frisbee_Beginner': 9, 'Frisbee_Intermediate': 10, 'Frisbee_Advanced': 11,
  // Futsal (positions 12-14)
  'Futsal_Beginner': 12, 'Futsal_Intermediate': 13, 'Futsal_Advanced': 14,
  // Hockey (positions 15-17)
  'Hockey_Beginner': 15, 'Hockey_Intermediate': 16, 'Hockey_Advanced': 17,
  // Rugby (positions 18-20)
  'Rugby_Beginner': 18, 'Rugby_Intermediate': 19, 'Rugby_Advanced': 20,
  // Squash (positions 21-23)
  'Squash_Beginner': 21, 'Squash_Intermediate': 22, 'Squash_Advanced': 23,
  // Table Tennis (positions 24-26)
  'Table Tennis_Beginner': 24, 'Table Tennis_Intermediate': 25, 'Table Tennis_Advanced': 26,
  // Tennis (positions 27-29)
  'Tennis_Beginner': 27, 'Tennis_Intermediate': 28, 'Tennis_Advanced': 29,
  // Volleyball (positions 30-32)
  'Volleyball_Beginner': 30, 'Volleyball_Intermediate': 31, 'Volleyball_Advanced': 32
};

const FACULTY_MAPPING = {
  'COMPUTER SCIENCES': 0, 'ENGINEERING': 1, 'ARTS': 2,
  'MASSCOM': 3, 'SPORT SCIENCES AND RECREATION': 4, 'LANGUAGE': 5, 'APB': 6
};

const STATE_MAPPING = {
  'SELANGOR': 0, 'SARAWAK': 1, 'SABAH': 2, 'JOHOR': 3, 'KEDAH': 4,
  'KELANTAN': 5, 'PAHANG': 6, 'PERAK': 7, 'PERLIS': 8, 'MELAKA': 9,
  'TERENGGANU': 10, 'PENANG': 11, 'NEGERI SEMBILAN': 12
};

const GENDER_MAPPING = {
  'Male': 0, 'Female': 1, 'Other': 2, 'Prefer not to say': 3
};

const PLAY_STYLE_MAPPING = {
  'casual': 0, 'competitive': 1
};

// Facility ID to index mapping (will be populated from database)
let FACILITY_MAPPING = {};

// Helper logging functions
function log(...args) {
  if (DEBUG_MODE) {
    console.log(LOG_PREFIX, ...args);
  }
}

function logError(...args) {
  console.error(LOG_PREFIX, ...args);
}

/**
 * Initialize facility mapping from database
 */
async function initializeFacilityMapping() {
  try {
    const { data: facilities, error } = await supabase
      .from('locations')
      .select('id, name')
      .order('name');

    if (error) throw error;

    // Create mapping from facility ID to index
    facilities.forEach((facility, index) => {
      FACILITY_MAPPING[facility.id] = index;
    });

    log(`Initialized facility mapping with ${facilities.length} facilities`);
  } catch (error) {
    logError('Error initializing facility mapping:', error);
    throw error;
  }
}

/**
 * Build sport-specific skill levels vector (Elements 0-32)
 * Based on Sport-Specific Skill Level Encoding methodology
 */
function buildSportSkillVector(sportPreferences) {
  const sportSkillVector = new Array(33).fill(0);

  if (sportPreferences && Array.isArray(sportPreferences)) {
    sportPreferences.forEach(sport => {
      const sportName = sport.name;
      const skillLevel = sport.level;

      // Create sport-skill combination key
      const sportSkillKey = `${sportName}_${skillLevel}`;
      const index = SPORT_SKILL_MAPPING[sportSkillKey];

      if (index !== undefined) {
        sportSkillVector[index] = 1;
      }
    });
  }

  return sportSkillVector;
}

/**
 * Build faculty vector (Elements 33-39)
 */
function buildFacultyVector(faculty) {
  const facultyVector = new Array(7).fill(0);
  const index = FACULTY_MAPPING[faculty];
  if (index !== undefined) {
    facultyVector[index] = 1;
  }
  return facultyVector;
}

/**
 * Build campus/state vector (Elements 40-52)
 */
function buildStateVector(campus) {
  const stateVector = new Array(13).fill(0);
  const index = STATE_MAPPING[campus];
  if (index !== undefined) {
    stateVector[index] = 1;
  }
  return stateVector;
}

/**
 * Build gender vector (Elements 53-56)
 */
function buildGenderVector(gender) {
  const genderVector = new Array(4).fill(0);
  const index = GENDER_MAPPING[gender];
  if (index !== undefined) {
    genderVector[index] = 1;
  }
  return genderVector;
}

/**
 * Build play style vector (Elements 57-58)
 */
function buildPlayStyleVector(playStyle) {
  const playStyleVector = new Array(2).fill(0);
  const index = PLAY_STYLE_MAPPING[playStyle];
  if (index !== undefined) {
    playStyleVector[index] = 1;
  }
  return playStyleVector;
}

/**
 * Build day-specific time slots vector (Elements 59-107)
 * Follows TEMPLATE_2.md flattened day-hour vector approach
 */
function buildTimeAvailabilityVector(availableHours) {
  const timeVector = new Array(49).fill(0);

  // Days mapping (TEMPLATE_2.md structure)
  const dayMapping = {
    'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
    'friday': 4, 'saturday': 5, 'sunday': 6
  };

  // Time slots mapping (TEMPLATE_2.md time slots: 7 slots per day)
  const timeSlotMapping = {
    '9-11': 0, '11-13': 1, '13-15': 2, '15-17': 3,
    '17-19': 4, '19-21': 5, '21-23': 6
  };

  // Process day-specific availability as per TEMPLATE_2.md
  if (availableHours && typeof availableHours === 'object') {
    Object.keys(availableHours).forEach(day => {
      const dayIndex = dayMapping[day.toLowerCase()];
      if (dayIndex !== undefined) {
        const daySlots = availableHours[day];
        
        // Handle both array of strings and array of objects
        if (Array.isArray(daySlots)) {
          daySlots.forEach(slot => {
            let timeSlot;
            
            // Handle different data formats
            if (typeof slot === 'string') {
              timeSlot = slot;
            } else if (typeof slot === 'object' && slot.start && slot.end) {
              // Convert start/end time objects to slot format
              const startHour = parseInt(slot.start.split(':')[0]);
              const endHour = parseInt(slot.end.split(':')[0]);
              
              // Map time ranges to our slot format
              if (startHour >= 9 && endHour <= 11) timeSlot = '9-11';
              else if (startHour >= 11 && endHour <= 13) timeSlot = '11-13';
              else if (startHour >= 13 && endHour <= 15) timeSlot = '13-15';
              else if (startHour >= 15 && endHour <= 17) timeSlot = '15-17';
              else if (startHour >= 17 && endHour <= 19) timeSlot = '17-19';
              else if (startHour >= 19 && endHour <= 21) timeSlot = '19-21';
              else if (startHour >= 21 && endHour <= 23) timeSlot = '21-23';
            }
            
            const slotIndex = timeSlotMapping[timeSlot];
            if (slotIndex !== undefined) {
              // Calculate vector position: dayIndex * 7 + slotIndex (TEMPLATE_2.md formula)
              const vectorIndex = dayIndex * 7 + slotIndex;
              timeVector[vectorIndex] = 1;
            }
          });
        }
      }
    });
  }

  return timeVector;
}

/**
 * Build preferred facilities vector (Elements 108-136)
 */
function buildFacilitiesVector(preferredFacilities) {
  const facilitiesVector = new Array(29).fill(0);

  if (preferredFacilities && Array.isArray(preferredFacilities)) {
    preferredFacilities.forEach(facilityId => {
      const index = FACILITY_MAPPING[facilityId];
      if (index !== undefined && index < 29) {
        facilitiesVector[index] = 1;
      }
    });
  }

  return facilitiesVector;
}

/**
 * Main function to build 142-element user vector
 * Following User_Vector_Specification.md structure
 */
async function buildUserVector(userId) {
  try {
    // Initialize facility mapping if not done
    if (Object.keys(FACILITY_MAPPING).length === 0) {
      await initializeFacilityMapping();
    }

    // Fetch user data from users table
    const { data: userData, error } = await supabase
      .from('users')
      .select(`
        sport_preferences,
        faculty,
        campus,
        gender,
        play_style,
        available_hours,
        preferred_facilities
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;

    log(`Building vector for user ${userId}`);

    // Initialize 142-element vector
    const vector = new Array(142).fill(0);

    // Build sport-specific skill levels vector (0-32)
    const sportSkillVector = buildSportSkillVector(userData.sport_preferences);
    vector.splice(0, 33, ...sportSkillVector);

    // Build faculty vector (33-39)
    const facultyVector = buildFacultyVector(userData.faculty);
    vector.splice(33, 7, ...facultyVector);

    // Build state vector (40-52)
    const stateVector = buildStateVector(userData.campus);
    vector.splice(40, 13, ...stateVector);

    // Build gender vector (53-56)
    const genderVector = buildGenderVector(userData.gender);
    vector.splice(53, 4, ...genderVector);

    // Build play style vector (57-58)
    const playStyleVector = buildPlayStyleVector(userData.play_style);
    vector.splice(57, 2, ...playStyleVector);

    // Build day-specific time slots vector (59-107) - TEMPLATE_2.md methodology
    const timeVector = buildTimeAvailabilityVector(userData.available_hours);
    vector.splice(59, 49, ...timeVector);

    // Build preferred facilities vector (108-136)
    const facilitiesVector = buildFacilitiesVector(userData.preferred_facilities);
    vector.splice(108, 29, ...facilitiesVector);

    // Padding elements (137-141) remain 0

    // Calculate completeness score based on meaningful elements only (excluding padding)
    const meaningfulElements = vector.slice(0, 137); // Elements 0-136 (137 total)
    const nonZeroMeaningfulElements = meaningfulElements.filter(x => x !== 0).length;
    const completenessScore = nonZeroMeaningfulElements / 137;

    log(`Vector built: ${nonZeroMeaningfulElements}/137 non-zero elements (${Math.round(completenessScore * 100)}% complete)`);

    return {
      vector,
      completenessScore,
      metadata: {
        userId,
        nonZeroElements: nonZeroMeaningfulElements,
        totalElements: 137, // Only meaningful elements
        completenessScore
      }
    };

  } catch (error) {
    logError('Error building user vector:', error);
    throw error;
  }
}

/**
 * Store or update user vector in database
 */
async function storeUserVector(userId, vectorData, completenessScore) {
  try {
    // Get user data for hash calculations
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('sport_preferences, available_hours, campus, preferred_facilities')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Calculate hashes for performance optimization
    const timeHash = await calculateTimeHash(userData.available_hours);
    const sportsHash = await calculateSportsHash(userData.sport_preferences);
    const stateHash = await calculateStateHash(userData.campus);
    const facilitiesHash = await calculateFacilitiesHash(userData.preferred_facilities);

    // Upsert vector data
    const { data, error } = await supabase
      .from('user_vectors_knn')
      .upsert({
        user_id: userId,
        vector_data: vectorData,
        time_availability_hash: timeHash,
        sports_hash: sportsHash,
        state_hash: stateHash,
        facilities_hash: facilitiesHash,
        completeness_score: completenessScore,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;

    log(`Vector stored for user ${userId} with completeness ${Math.round(completenessScore * 100)}%`);
    return data;

  } catch (error) {
    logError('Error storing user vector:', error);
    throw error;
  }
}

/**
 * Get user vector from database
 */
async function getUserVector(userId) {
  try {
    const { data, error } = await supabase
      .from('user_vectors_knn')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;

  } catch (error) {
    logError('Error getting user vector:', error);
    throw error;
  }
}

/**
 * Build and store user vector (main function)
 */
async function buildAndStoreUserVector(userId) {
  try {
    const vectorResult = await buildUserVector(userId);
    const storedVector = await storeUserVector(userId, vectorResult.vector, vectorResult.completenessScore);

    return {
      ...vectorResult,
      stored: storedVector
    };

  } catch (error) {
    logError('Error building and storing user vector:', error);
    throw error;
  }
}

/**
 * Hash calculation functions (using database functions)
 */
async function calculateTimeHash(availableHours) {
  try {
    const { data, error } = await supabase.rpc('calculate_time_availability_hash', {
      available_hours: availableHours
    });
    if (error) throw error;
    return data;
  } catch (error) {
    logError('Error calculating time hash:', error);
    return 'error_hash';
  }
}

async function calculateSportsHash(sportPreferences) {
  try {
    const { data, error } = await supabase.rpc('calculate_sports_hash', {
      sport_preferences: sportPreferences
    });
    if (error) throw error;
    return data;
  } catch (error) {
    logError('Error calculating sports hash:', error);
    return 'error_hash';
  }
}

async function calculateStateHash(campus) {
  try {
    const { data, error } = await supabase.rpc('calculate_state_hash', {
      campus: campus
    });
    if (error) throw error;
    return data;
  } catch (error) {
    logError('Error calculating state hash:', error);
    return 'error_hash';
  }
}

async function calculateFacilitiesHash(preferredFacilities) {
  try {
    const { data, error } = await supabase.rpc('calculate_facilities_hash', {
      preferred_facilities: preferredFacilities
    });
    if (error) throw error;
    return data;
  } catch (error) {
    logError('Error calculating facilities hash:', error);
    return 'error_hash';
  }
}

export {
  buildUserVector,
  buildAndStoreUserVector,
  storeUserVector,
  getUserVector,
  buildSportSkillVector,
  buildFacultyVector,
  buildStateVector,
  buildGenderVector,
  buildPlayStyleVector,
  buildTimeAvailabilityVector,
  buildFacilitiesVector,
  initializeFacilityMapping,
  calculateTimeHash,
  calculateSportsHash,
  calculateStateHash,
  calculateFacilitiesHash
};
