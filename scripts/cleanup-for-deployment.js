#!/usr/bin/env node

/**
 * Cleanup Script for Sportea Deployment
 * Identifies files that should be cleaned up before deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return (stats.size / 1024).toFixed(2) + ' KB';
  } catch {
    return 'N/A';
  }
}

function scanDirectory(dir, extensions = [], maxDepth = 3, currentDepth = 0) {
  const results = [];
  
  if (currentDepth >= maxDepth) return results;
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // Skip certain directories
        if (['node_modules', '.git', 'dist'].includes(item)) continue;
        
        results.push(...scanDirectory(itemPath, extensions, maxDepth, currentDepth + 1));
      } else if (stats.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (extensions.length === 0 || extensions.includes(ext)) {
          results.push({
            path: itemPath,
            name: item,
            size: stats.size,
            relativePath: path.relative(projectRoot, itemPath)
          });
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return results;
}

function analyzeProjectFiles() {
  log('\n🧹 SPORTEA PROJECT CLEANUP ANALYSIS', 'cyan');
  log('=====================================', 'cyan');
  
  // Find potentially unused files
  log('\n🔍 POTENTIALLY UNUSED FILES:', 'yellow');
  
  const unusedPatterns = [
    { pattern: /\.test\.(js|jsx|ts|tsx)$/, description: 'Test files' },
    { pattern: /\.spec\.(js|jsx|ts|tsx)$/, description: 'Spec files' },
    { pattern: /debug.*\.js$/, description: 'Debug files' },
    { pattern: /test.*\.js$/, description: 'Test scripts' },
    { pattern: /\.backup$/, description: 'Backup files' },
    { pattern: /\.old$/, description: 'Old files' },
    { pattern: /\.tmp$/, description: 'Temporary files' },
    { pattern: /~$/, description: 'Temporary files' }
  ];
  
  const allFiles = scanDirectory(projectRoot);
  
  for (const pattern of unusedPatterns) {
    const matchingFiles = allFiles.filter(file => pattern.pattern.test(file.name));
    
    if (matchingFiles.length > 0) {
      log(`\n📁 ${pattern.description}:`, 'yellow');
      matchingFiles.forEach(file => {
        log(`  ❓ ${file.relativePath} (${getFileSize(file.path)})`, 'yellow');
      });
    }
  }
  
  // Find large files
  log('\n📊 LARGE FILES (>100KB):', 'blue');
  const largeFiles = allFiles
    .filter(file => file.size > 100 * 1024)
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);
  
  if (largeFiles.length > 0) {
    largeFiles.forEach(file => {
      log(`  📦 ${file.relativePath} (${getFileSize(file.path)})`, 'blue');
    });
  } else {
    log('  ✅ No large files found', 'green');
  }
  
  // Check for development-only files
  log('\n🛠️  DEVELOPMENT-ONLY FILES:', 'cyan');
  const devFiles = [
    '.env.local',
    '.env.development',
    'debug.log',
    'npm-debug.log',
    'yarn-debug.log',
    'yarn-error.log',
    '.DS_Store',
    'Thumbs.db'
  ];
  
  const foundDevFiles = devFiles.filter(file => 
    fs.existsSync(path.join(projectRoot, file))
  );
  
  if (foundDevFiles.length > 0) {
    foundDevFiles.forEach(file => {
      log(`  🔧 ${file}`, 'cyan');
    });
  } else {
    log('  ✅ No development-only files found', 'green');
  }
}

function showGitignoreRecommendations() {
  log('\n📝 RECOMMENDED .gitignore ADDITIONS:', 'green');
  log('=====================================', 'green');
  
  const gitignoreRecommendations = [
    '# Build outputs',
    'dist/',
    'build/',
    '',
    '# Environment files',
    '.env.local',
    '.env.development.local',
    '.env.test.local',
    '.env.production.local',
    '',
    '# Debug files',
    'debug*.js',
    'test-*.js',
    '*.log',
    '',
    '# OS generated files',
    '.DS_Store',
    '.DS_Store?',
    '._*',
    '.Spotlight-V100',
    '.Trashes',
    'ehthumbs.db',
    'Thumbs.db',
    '',
    '# Backup files',
    '*.backup',
    '*.old',
    '*.tmp',
    '*~',
    '',
    '# IDE files',
    '.vscode/',
    '.idea/',
    '*.swp',
    '*.swo'
  ];
  
  log('Add these to your .gitignore file:', 'green');
  gitignoreRecommendations.forEach(line => {
    log(`  ${line}`, 'green');
  });
}

function showCleanupCommands() {
  log('\n🧽 CLEANUP COMMANDS:', 'blue');
  log('=====================================', 'blue');
  
  log('Safe cleanup (removes build artifacts):', 'blue');
  log('  rm -rf dist/', 'blue');
  log('  rm -rf node_modules/', 'blue');
  log('  npm install', 'blue');
  log('', 'blue');
  
  log('Remove common temporary files:', 'blue');
  log('  find . -name "*.log" -delete', 'blue');
  log('  find . -name "*.tmp" -delete', 'blue');
  log('  find . -name "*~" -delete', 'blue');
  log('', 'blue');
  
  log('Check what Git will include:', 'blue');
  log('  git ls-files', 'blue');
  log('  git status --ignored', 'blue');
  log('', 'blue');
  
  log('See what would be deployed:', 'blue');
  log('  npm run build', 'blue');
  log('  ls -la dist/', 'blue');
}

function showDeploymentBestPractices() {
  log('\n✅ DEPLOYMENT BEST PRACTICES:', 'green');
  log('=====================================', 'green');
  
  const practices = [
    '1. Clean build before deployment:',
    '   rm -rf dist/ && npm run build',
    '',
    '2. Commit all changes before deploying:',
    '   git add . && git commit -m "Ready for deployment"',
    '',
    '3. Use environment-specific configs:',
    '   .env.production for production settings',
    '',
    '4. Test build locally first:',
    '   npm run preview',
    '',
    '5. Check bundle size:',
    '   npm run build:analyze',
    '',
    '6. Verify version tracking:',
    '   node scripts/version-tracker.js',
    '',
    '7. Deploy with confidence:',
    '   vercel --prod'
  ];
  
  practices.forEach(practice => {
    log(`  ${practice}`, 'green');
  });
}

// Run the analysis
analyzeProjectFiles();
showGitignoreRecommendations();
showCleanupCommands();
showDeploymentBestPractices();

log('\n🎯 SUMMARY:', 'cyan');
log('• Only files in dist/ get deployed to production', 'cyan');
log('• Your source code stays safe on your computer', 'cyan');
log('• Clean up temporary files but keep your source code', 'cyan');
log('• Use .gitignore to exclude files from version control', 'cyan');
log('• Test your build locally before deploying', 'cyan');
