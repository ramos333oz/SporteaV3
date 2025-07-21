#!/usr/bin/env node

/**
 * Deployment Analysis Script for Sportea
 * Shows exactly what gets deployed vs what stays local
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

function analyzeProjectStructure() {
  log('\n🔍 SPORTEA DEPLOYMENT ANALYSIS', 'cyan');
  log('=====================================', 'cyan');

  // Files that get deployed (in dist folder after build)
  log('\n✅ FILES THAT GET DEPLOYED TO PRODUCTION:', 'green');
  log('These are the compiled/optimized files in the dist/ folder:', 'green');
  
  const deployedFiles = [
    'dist/index.html - Main HTML file with optimized asset links',
    'dist/assets/*.js - Compiled and minified JavaScript bundles',
    'dist/assets/*.css - Compiled and minified CSS files',
    'dist/images/ - Optimized images and static assets',
    'dist/manifest.json - PWA manifest file',
    'vercel.json - Deployment configuration (if using Vercel)'
  ];

  deployedFiles.forEach(file => log(`  📦 ${file}`, 'green'));

  // Files that DON'T get deployed
  log('\n❌ FILES THAT STAY ON YOUR COMPUTER (NOT DEPLOYED):', 'red');
  log('These source files are used to BUILD the production files:', 'red');
  
  const localFiles = [
    'src/ - All your React source code (.jsx files)',
    'node_modules/ - Dependencies (rebuilt on server if needed)',
    'package.json - Used for dependency info, not deployed directly',
    'vite.config.js - Build configuration, not deployed',
    '.env - Environment variables (values copied to hosting platform)',
    'docs/ - Documentation files',
    'test files - Any testing files',
    'README.md - Documentation',
    '.git/ - Version control history',
    'backups/ - Your backup folders'
  ];

  localFiles.forEach(file => log(`  🏠 ${file}`, 'red'));

  // Build process explanation
  log('\n🔄 BUILD PROCESS EXPLANATION:', 'blue');
  log('When you run "npm run build", here\'s what happens:', 'blue');
  
  const buildSteps = [
    '1. Vite reads your src/ files and package.json',
    '2. Compiles JSX → JavaScript, TypeScript → JavaScript',
    '3. Bundles all JavaScript into optimized chunks',
    '4. Processes CSS and optimizes it',
    '5. Optimizes images and static assets',
    '6. Creates dist/ folder with production-ready files',
    '7. Only dist/ folder contents get deployed to hosting'
  ];

  buildSteps.forEach(step => log(`  ${step}`, 'blue'));
}

function analyzeBuildOutput() {
  log('\n📊 BUILD OUTPUT ANALYSIS:', 'yellow');
  
  const distPath = path.join(projectRoot, 'dist');
  
  if (!fs.existsSync(distPath)) {
    log('❌ No dist/ folder found. Run "npm run build" first!', 'red');
    return;
  }

  log('Contents of your dist/ folder (what gets deployed):', 'yellow');
  
  function listDirectory(dir, prefix = '') {
    try {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          log(`${prefix}📁 ${item}/`, 'yellow');
          listDirectory(itemPath, prefix + '  ');
        } else {
          const size = getFileSize(itemPath);
          log(`${prefix}📄 ${item} (${size})`, 'yellow');
        }
      });
    } catch (error) {
      log(`Error reading directory: ${error.message}`, 'red');
    }
  }
  
  listDirectory(distPath);
}

function showVersionInfo() {
  log('\n🏷️  VERSION TRACKING INFO:', 'cyan');
  
  // Check if git is available
  try {
    const { execSync } = await import('child_process');
    
    const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const gitDate = execSync('git log -1 --format=%cd --date=iso', { encoding: 'utf8' }).trim();
    
    log(`Current Git Commit: ${gitCommit.substring(0, 8)}`, 'cyan');
    log(`Current Branch: ${gitBranch}`, 'cyan');
    log(`Last Commit Date: ${gitDate}`, 'cyan');
    
    // Show how to embed version in build
    log('\n💡 TIP: Add this to your build to track versions in production:', 'blue');
    log('In your vite.config.js, add:', 'blue');
    log(`define: {
  __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  __GIT_COMMIT__: JSON.stringify('${gitCommit.substring(0, 8)}'),
  __BUILD_DATE__: JSON.stringify(new Date().toISOString())
}`, 'blue');
    
  } catch (error) {
    log('Git not available or not in a git repository', 'red');
  }
}

// Run the analysis
analyzeProjectStructure();
analyzeBuildOutput();
showVersionInfo();

log('\n🎯 QUICK COMMANDS TO UNDERSTAND YOUR DEPLOYMENT:', 'cyan');
log('1. npm run build          - Build your app and see dist/ folder', 'cyan');
log('2. npm run preview        - Preview your built app locally', 'cyan');
log('3. du -sh dist/           - See total size of deployed files', 'cyan');
log('4. ls -la dist/assets/    - See your compiled JavaScript/CSS files', 'cyan');
log('5. vercel --prod          - Deploy to production', 'cyan');
