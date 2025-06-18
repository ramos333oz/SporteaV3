/**
 * Fix script for Map display and List View alignment issues
 * 
 * This script will:
 * 1. Add the necessary Leaflet imports to FindGames.jsx
 * 2. Fix the grid alignment between recommended and available matches
 * 3. Remove unused filter from search bar
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the FindGames.jsx file
const findGamesPath = path.join(__dirname, 'src', 'pages', 'Find', 'FindGames.jsx');

// Read the current file
let content = fs.readFileSync(findGamesPath, 'utf8');

// 1. Add Leaflet imports if not already present
if (!content.includes('import \'leaflet/dist/leaflet.css\'')) {
  // Find the first import statement
  const firstImportIndex = content.indexOf('import');
  // Add Leaflet imports after the first import
  const leafletImports = `
// Import Leaflet CSS directly
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});
`;
  content = content.slice(0, firstImportIndex) + 
            content.slice(firstImportIndex).replace(/\nimport/, imports => `${leafletImports}\nimport`);
}

// 2. Fix grid alignment in List View by making grid breakpoints consistent
// Replace sm={6} lg={4} with sm={6} md={4} for recommended matches
content = content.replace(
  /<Grid item xs={12} sm={6} lg={4} key={(`|")skeleton-rec-/g, 
  '<Grid item xs={12} sm={6} md={4} key=$1skeleton-rec-'
);
content = content.replace(
  /<Grid item xs={12} sm={6} lg={4} key={match\.id}>/g, 
  '<Grid item xs={12} sm={6} md={4} key={match.id}>'
);

// 3. Remove any unused filter dropdown from search bar in MapView component
// This is a simplified approach - if the structure is different, it may need adjustment
content = content.replace(
  /<IconButton[^>]*>\s*<FilterListIcon[^>]*>\s*<\/IconButton>/g, 
  ''
);

// Write the changes back to the file
fs.writeFileSync(findGamesPath, content, 'utf8');

console.log('✅ Fixed map display and grid alignment issues in FindGames.jsx'); 