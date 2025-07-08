// Generate vector for the basketball test match
function generateDeterministicEmbedding(match) {
  // Create a 384-dimensional vector (same as all-MiniLM-L6-v2)
  const vector = new Array(384).fill(0)
  
  // Sport encoding (dimensions 0-49)
  const sportMap = {
    'futsal': 0, 'football': 10, 'basketball': 20, 'badminton': 30, 
    'volleyball': 40, 'tennis': 50, 'hockey': 60, 'rugby': 70
  }
  const sportName = match.sport?.toLowerCase() || 'unknown'
  const sportIndex = sportMap[sportName] || 0
  for (let i = 0; i < 10; i++) {
    vector[sportIndex + i] = 0.8 + (i * 0.02) // Strong sport signal
  }
  
  // Skill level encoding (dimensions 50-99)
  const skillMap = { 'beginner': 50, 'intermediate': 65, 'advanced': 80, 'professional': 95 }
  const skillLevel = match.skill_level?.toLowerCase() || 'intermediate'
  const skillIndex = skillMap[skillLevel] || 65
  for (let i = 0; i < 15; i++) {
    vector[skillIndex + i] = 0.7 + (i * 0.015) // Skill level signal
  }
  
  // Location encoding (dimensions 100-149)
  const locationName = match.location?.toLowerCase() || ''
  const locationHash = locationName.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0)
  const locationIndex = 100 + (locationHash % 50)
  for (let i = 0; i < 10; i++) {
    vector[locationIndex + i] = 0.6 + (i * 0.03) // Location signal
  }
  
  // Time-based encoding (dimensions 150-199)
  const startTime = new Date(match.start_time)
  const hour = startTime.getHours()
  const dayOfWeek = startTime.getDay()
  
  // Hour of day (0-23 mapped to 150-173)
  const hourIndex = 150 + Math.floor(hour / 4) * 2 // Group hours into 6 periods
  vector[hourIndex] = 0.9
  vector[hourIndex + 1] = 0.8
  
  // Day of week (0-6 mapped to 174-180)
  vector[174 + dayOfWeek] = 0.85
  
  // Duration encoding (dimensions 200-249)
  const duration = new Date(match.end_time).getTime() - new Date(match.start_time).getTime()
  const durationHours = duration / (1000 * 60 * 60)
  const durationIndex = 200 + Math.min(Math.floor(durationHours * 10), 49)
  vector[durationIndex] = 0.75
  
  // Capacity encoding (dimensions 250-299)
  const capacity = match.max_participants || 8
  const capacityIndex = 250 + Math.min(capacity - 1, 49)
  vector[capacityIndex] = 0.7
  
  // Title/description semantic encoding (dimensions 300-383)
  const title = match.title?.toLowerCase() || ''
  const description = match.description?.toLowerCase() || ''
  const combinedText = title + ' ' + description
  
  // Simple hash-based encoding for semantic similarity
  for (let i = 0; i < combinedText.length && i < 84; i++) {
    const charCode = combinedText.charCodeAt(i)
    vector[300 + i] = (charCode % 100) / 100 // Normalize to 0-1
  }
  
  // Normalize the vector to unit length for cosine similarity
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude
    }
  }
  
  return vector
}

// Badminton match data (high-similarity test)
const badmintonMatch = {
  id: '9b90fb9c-6753-423a-9eb4-f54b57cbe444',
  title: 'Casual Badminton Fun - High Similarity Test',
  description: 'Friendly badminton session for casual players! Perfect for beginners and anyone looking to have fun while getting some exercise. No pressure, just good vibes and great games. Come join us for an enjoyable afternoon of badminton! (Court A1)',
  sport: 'badminton',
  skill_level: 'beginner',
  location: 'Court Budisiswa Badminton',
  start_time: '2025-07-06T07:00:55.826+00:00',
  end_time: '2025-07-06T08:00:55.826+00:00',
  max_participants: 8
}

// Generate vector
const vector = generateDeterministicEmbedding(badmintonMatch)

console.log('Badminton match vector generated successfully!')
console.log('Vector length:', vector.length)
console.log('Vector magnitude:', Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)).toFixed(6))
console.log('Sport encoding (badminton, dims 30-39):', vector.slice(30, 40).map(v => v.toFixed(4)))
console.log('Skill encoding (beginner, dims 50-64):', vector.slice(50, 65).map(v => v.toFixed(4)))

// Generate SQL update statement
const vectorString = '[' + vector.join(',') + ']'
console.log('\nSQL UPDATE statement:')
console.log(`UPDATE matches SET characteristic_vector = '${vectorString}' WHERE id = '${badmintonMatch.id}';`)
