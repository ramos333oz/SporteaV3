// Create a high-similarity test match based on AZMIL'S preference vector
// This will generate a characteristic vector that closely matches Azmil's preferences

// Azmil's preference vector (from database - the test user)
const azmilPreferenceVector = [-0.040166933,0.9613633,-0.3983906,-0.8448358,0.7276021,-0.054761954,-0.61112726,-0.69360125,0.8755603,0.10575064,-0.82269824,0.3767989,-0.51804197,-0.07695318,-0.7310592,-0.3038473,0.37756175,-0.7663667,0.2590587,0.74985325,-0.037915464,-0.20926863,0.8566458,-0.4938715,0.46935895,0.75258064,0.5664121,0.90099543,-0.7879626,-0.6504269,0.34161606,0.34751776,0.3644797,-0.7854996,-0.1963666,0.25925204,-0.5690954,-0.23345686,0.468276,0.3596276,0.18831386,0.9559342,-0.03929589,-0.8935524,-0.6864595,0.033521563,0.34340787,-0.8126573,-0.5005406,0.052520677,0.049560368,0.41160744,-0.14236227,-0.9799734,0.5785906,-0.94786817,-0.57935905,0.6677141,-0.10423623,0.5295056,-0.41491413,-0.8408867,-0.6609162,0.3762058,-0.6530442,-0.8194771,-0.3429648,0.23766944,0.37450513,-0.34316054,0.24858508,0.03774722,-0.93314004,0.29166868,-0.6393851,-0.46781236,-0.55909985,0.81036365,0.4691392,0.48691222,-0.75472856,0.28084874,-0.95838004,0.49447873,-0.6489285,-0.71353084,-0.90111375,-0.57545185,-0.19592944,0.07224914,0.8937409,-0.7924639,0.4023777,-0.3638928,0.55414206,-0.24459745,-0.40643862,0.93718404,-0.43209696,-0.5132848,0.2847924,-0.41287163,0.7996166,-0.43843248,0.58071434,-0.54308826,0.081376426,-0.105659544,0.36700067,0.733583,0.10815501,-0.25093126,0.6565943,-0.9842175,-0.2624005,-0.21898168,-0.6095247,0.7362329,0.7723799,-0.9701175,-0.75422573,-0.25312942,0.5195209,-0.787567,0.1288956,-0.47329313,-0.39758143,0.20985927,-0.70114833,-0.5692661,0.6334867,0.027849054,0.63726366,0.8629438,-0.2774085,-0.7760077,-0.45749378,-0.34584594,-0.084135205,0.6203275,-0.2799361,0.093619846,0.50154185,-0.4142921,-0.6945389,0.73422474,0.34679183,0.8423506,0.44426084,0.56198657,-0.9990717,-0.031662527,-0.44559973,-0.8951072,0.71828973,0.99539477,-0.1507489,-0.7596649,0.8695849,-0.83883715,0.5894373,-0.6266911,0.6550949,-0.5375779,0.7028659,-0.38121542,0.13117814,0.9369975,-0.59475964,-0.13126309,0.9343981,0.08098175,-0.13125776,0.9128547,0.8243817,0.76132965,0.79009485,0.61055535,-0.10007516,0.4230156,0.2042974,0.35724747,-0.7594864,0.2248805,-0.668866,-0.17432597,0.49216342,0.24273045,0.5219157,-0.7443439,0.82678056,-0.50934577,-0.4598186,-0.6452752,-0.60462326,0.83087325,-0.9686726,0.1570369,0.04915788,-0.006923812,-0.35965618,0.08086673,0.25551617,-0.5733559,-0.76759255,-0.72405195,-0.42812145,-0.7037391,-0.5653474,-0.272767,-0.30251902,-0.98485684,-0.6331581,0.20741956,-0.7401978,0.97275,0.7366955,-0.10203569,0.122654706,0.54548365,0.6467706,-0.29823822,-0.80304587,-0.5867585,-0.90500826,0.4377445,0.82197434,-0.42430922,-0.62156403,-0.910184,-0.5872688,-0.45567882,-0.47077674,-0.13190617,-0.41816488,-0.94883054,0.97101754,0.96023035,-0.13956083,0.015690824,0.34471446,-0.7316277,0.074228056,0.47361234,-0.7025883,-0.5476089,0.02076283,-0.4577086,0.48109543,-0.79209185,0.3982282,-0.5058187,0.7146743,0.7493871,-0.9895263,0.9060305,0.04722586,-0.92020804,-0.18793656,0.61300105,0.7432147,-0.8166776,-0.47212398,0.07426402,0.73131514,-0.89599246,-0.0414172,-0.17603251,0.90730834,0.82795465,-0.6012723,-0.61906385,0.7260596,-0.9778421,0.30323827,0.70545304,-0.4493541,-0.4521053,-0.27537718,-0.42202106,0.81508327,0.67313206,0.92503184,-0.35170186,-0.7269155,-0.11670494,-0.6517528,-0.4952502,-0.2718045,-0.66748184,0.0723598,-0.43054917,-0.23400506,0.95395464,0.017757678,0.24013755,0.7741759,-0.760208,-0.11354552,-0.12876058,-0.4370605,0.62200165,0.9445106,-0.7984335,-0.0880538,-0.9223579,0.40202945,-0.818903,-0.7930799,0.13049737,0.72414356,-0.8564655,-0.6521661,-0.618665,0.8337581,0.820597,-0.2264072,-0.8806952,0.033154465,0.5672026,-0.66911256,0.9099218,-0.29027903,0.6382412,-0.30840352,-0.678464,0.86493456,-0.43258512,-0.8061541,-0.33988476,-0.3008239,0.86380243,0.4161675,0.8298442,0.1396193,-0.114309065,0.16389237,-0.01563368,0.053030834,-0.31044802,-0.17617305,0.51011086,-0.8014911,0.4500161,-0.45111778,0.29417905,-0.0552145,-0.82662374,-0.30283326,0.8330352,0.6058303,-0.8181984,0.2984823,0.36136082,-0.97373724,-0.95531017,-0.34499565,-0.17760152,0.43909895,0.5173671,-0.93166673,0.050673556,0.9733771,0.22144505,0.22613192,0.9349165,0.12889719,0.19462943,-0.16874018,0.7215894,0.65270627,-0.6507687,0.7327288,-0.15502295,0.8891166,0.7744762,-0.7494108,0.6432705,-0.41966826,0.36598092,-0.030926801,-0.2675923,-0.52965236,-0.68994063];

// Generate a high-similarity vector (95% similar to Azmil's preferences)
function generateHighSimilarityVector(baseVector, similarityTarget = 0.95) {
  const highSimilarityVector = [];
  
  for (let i = 0; i < baseVector.length; i++) {
    // Create high similarity by using mostly the base vector with tiny random variations
    const randomVariation = (Math.random() - 0.5) * 0.1; // Very small random variation
    const similarComponent = baseVector[i] * similarityTarget;
    const randomComponent = randomVariation * (1 - similarityTarget);
    highSimilarityVector[i] = similarComponent + randomComponent;
  }
  
  // Normalize to unit length for cosine similarity
  const magnitude = Math.sqrt(highSimilarityVector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < highSimilarityVector.length; i++) {
      highSimilarityVector[i] /= magnitude;
    }
  }
  
  return highSimilarityVector;
}

// Calculate cosine similarity for verification
function calculateCosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    magnitude1 += vec1[i] * vec1[i];
    magnitude2 += vec2[i] * vec2[i];
  }
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

// Generate the high-similarity vector based on Azmil's preferences
const highSimilarityVector = generateHighSimilarityVector(azmilPreferenceVector, 0.95);

// Calculate and verify similarity
const similarity = calculateCosineSimilarity(azmilPreferenceVector, highSimilarityVector);
const similarityPercentage = (similarity * 100).toFixed(2);

console.log('🎯 AZMIL High-Similarity Test Match Vector Generated!');
console.log('Vector length:', highSimilarityVector.length);
console.log('Calculated similarity with Azmil:', similarityPercentage + '%');
console.log('Expected to exceed 1% threshold:', similarity > 0.01 ? 'YES ✅' : 'NO ❌');
console.log('Expected to exceed 10% threshold:', similarity > 0.10 ? 'YES ✅' : 'NO ❌');
console.log('Expected to exceed 50% threshold:', similarity > 0.50 ? 'YES ✅' : 'NO ❌');

// Generate SQL statements for updating the existing test matches
const vectorString = '[' + highSimilarityVector.join(',') + ']';

console.log('\n=== SQL STATEMENTS FOR AZMIL HIGH-SIMILARITY TEST ===');
console.log('\n1. Update the first high-similarity match:');
console.log(`UPDATE matches SET characteristic_vector = '${vectorString}' WHERE id = 'fca24a30-dd07-45c8-9ba5-4a42cc259159';`);

console.log('\n2. Update the second high-similarity match:');
console.log(`UPDATE matches SET characteristic_vector = '${vectorString}' WHERE id = 'b782da26-e2ea-43a3-b33f-49b2fb4d7a11';`);

console.log('\n3. Verify the matches were updated:');
console.log(`SELECT id, title, characteristic_vector IS NOT NULL as has_vector FROM matches WHERE id IN ('fca24a30-dd07-45c8-9ba5-4a42cc259159', 'b782da26-e2ea-43a3-b33f-49b2fb4d7a11');`);
