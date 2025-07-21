#!/usr/bin/env node

/**
 * Version Tracking Script for Sportea
 * Helps you understand what version is deployed vs local
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

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

function getGitInfo() {
  try {
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const shortCommit = commit.substring(0, 8);
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const lastCommitDate = execSync('git log -1 --format=%cd --date=iso', { encoding: 'utf8' }).trim();
    const lastCommitMessage = execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim();
    const isDirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim() !== '';
    
    return {
      commit,
      shortCommit,
      branch,
      lastCommitDate,
      lastCommitMessage,
      isDirty
    };
  } catch (error) {
    return null;
  }
}

function getPackageInfo() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description
    };
  } catch (error) {
    return null;
  }
}

function showCurrentVersion() {
  log('\n🏷️  CURRENT LOCAL VERSION INFO', 'cyan');
  log('=====================================', 'cyan');
  
  const gitInfo = getGitInfo();
  const packageInfo = getPackageInfo();
  
  if (packageInfo) {
    log(`📦 Project: ${packageInfo.name} v${packageInfo.version}`, 'blue');
    log(`📝 Description: ${packageInfo.description}`, 'blue');
  }
  
  if (gitInfo) {
    log(`🌿 Branch: ${gitInfo.branch}`, 'green');
    log(`📋 Commit: ${gitInfo.shortCommit} (${gitInfo.commit})`, 'green');
    log(`📅 Date: ${gitInfo.lastCommitDate}`, 'green');
    log(`💬 Message: "${gitInfo.lastCommitMessage}"`, 'green');
    
    if (gitInfo.isDirty) {
      log(`⚠️  Status: You have uncommitted changes!`, 'yellow');
      log(`   Run 'git status' to see what's changed`, 'yellow');
    } else {
      log(`✅ Status: Clean working directory`, 'green');
    }
  } else {
    log('❌ Git information not available', 'red');
  }
}

function showDeploymentCommands() {
  log('\n🚀 DEPLOYMENT TRACKING COMMANDS', 'cyan');
  log('=====================================', 'cyan');
  
  log('Before deploying:', 'blue');
  log('  git add .', 'blue');
  log('  git commit -m "Deploy: Add new feature"', 'blue');
  log('  git push origin main', 'blue');
  log('', 'blue');
  
  log('Deploy with version info:', 'blue');
  log('  npm run build', 'blue');
  log('  vercel --prod', 'blue');
  log('', 'blue');
  
  log('Check what\'s deployed:', 'blue');
  log('  vercel ls', 'blue');
  log('  vercel logs', 'blue');
  log('', 'blue');
  
  log('See deployment history:', 'blue');
  log('  vercel list sportea', 'blue');
  log('  git log --oneline -10', 'blue');
}

function createVersionFile() {
  const gitInfo = getGitInfo();
  const packageInfo = getPackageInfo();
  
  if (!gitInfo || !packageInfo) {
    log('❌ Cannot create version file - missing git or package info', 'red');
    return;
  }
  
  const versionInfo = {
    name: packageInfo.name,
    version: packageInfo.version,
    commit: gitInfo.commit,
    shortCommit: gitInfo.shortCommit,
    branch: gitInfo.branch,
    buildDate: new Date().toISOString(),
    lastCommitDate: gitInfo.lastCommitDate,
    lastCommitMessage: gitInfo.lastCommitMessage,
    isDirty: gitInfo.isDirty
  };
  
  // Create version file for deployment
  fs.writeFileSync('public/version.json', JSON.stringify(versionInfo, null, 2));
  
  log('\n📄 Created public/version.json for deployment tracking', 'green');
  log('This file will be available at: https://your-domain.com/version.json', 'green');
  log('', 'green');
  log('Contents:', 'green');
  log(JSON.stringify(versionInfo, null, 2), 'yellow');
}

function showVersionCheckInstructions() {
  log('\n🔍 HOW TO CHECK PRODUCTION VERSION', 'cyan');
  log('=====================================', 'cyan');
  
  log('1. Add version tracking to your app:', 'blue');
  log('   Create public/version.json (done above)', 'blue');
  log('', 'blue');
  
  log('2. Check production version:', 'blue');
  log('   curl https://your-domain.vercel.app/version.json', 'blue');
  log('   # or visit in browser: https://your-domain.vercel.app/version.json', 'blue');
  log('', 'blue');
  
  log('3. Compare with local version:', 'blue');
  log('   node scripts/version-tracker.js', 'blue');
  log('', 'blue');
  
  log('4. See Vercel deployment history:', 'blue');
  log('   vercel list', 'blue');
  log('   # Shows all deployments with timestamps and commit info', 'blue');
  log('', 'blue');
  
  log('5. Rollback if needed:', 'blue');
  log('   vercel rollback [deployment-url]', 'blue');
}

// Run the version tracker
showCurrentVersion();
createVersionFile();
showDeploymentCommands();
showVersionCheckInstructions();

log('\n💡 TIP: Run this script before each deployment to track versions!', 'cyan');
