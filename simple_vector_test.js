console.log('Testing vector generation...');

// Azmil's preference vector (first 10 elements for testing)
const azmilVector = [-0.040166933,0.9613633,-0.3983906,-0.8448358,0.7276021,-0.054761954,-0.61112726,-0.69360125,0.8755603,0.10575064];

console.log('Azmil vector length:', azmilVector.length);
console.log('First 5 elements:', azmilVector.slice(0, 5));

// Generate high similarity vector
const highSim = azmilVector.map(val => val * 0.95 + (Math.random() - 0.5) * 0.01);

console.log('High similarity vector generated');
console.log('First 5 elements:', highSim.slice(0, 5));

// Calculate similarity
let dotProduct = 0;
let mag1 = 0;
let mag2 = 0;

for (let i = 0; i < azmilVector.length; i++) {
  dotProduct += azmilVector[i] * highSim[i];
  mag1 += azmilVector[i] * azmilVector[i];
  mag2 += highSim[i] * highSim[i];
}

const similarity = dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
console.log('Similarity:', (similarity * 100).toFixed(2) + '%');
console.log('Above 1% threshold:', similarity > 0.01 ? 'YES' : 'NO');
