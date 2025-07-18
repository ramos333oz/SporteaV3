#!/usr/bin/env node

/**
 * Tailwind v4 Readiness Checker
 * Monitors v4 stability and ecosystem readiness
 */

import { execSync } from 'child_process';
import fs from 'fs';

const DEPENDENCIES_TO_CHECK = [
  'tailwindcss',
  '@tailwindcss/postcss', 
  'tailwindcss-animate',
  '@radix-ui/react-tabs',
  'class-variance-authority'
];

const CRITICAL_PLUGINS = [
  'tailwindcss-animate',
  '@tailwindcss/typography',
  '@tailwindcss/forms'
];

async function checkV4Readiness() {
  console.log('🔍 Checking Tailwind v4 Readiness...\n');
  
  const results = {
    v4Status: await checkV4Status(),
    shadcnCompatibility: await checkShadcnCompatibility(),
    pluginEcosystem: await checkPluginEcosystem(),
    migrationTool: await checkMigrationTool(),
    recommendation: ''
  };
  
  // Generate recommendation
  const readyCount = Object.values(results).filter(r => r === true).length;
  
  if (readyCount >= 3) {
    results.recommendation = '✅ READY: Consider planning v4 migration';
  } else if (readyCount >= 2) {
    results.recommendation = '⚠️ ALMOST: Monitor closely, prepare for migration';
  } else {
    results.recommendation = '🔴 NOT READY: Stay with v3, continue monitoring';
  }
  
  displayResults(results);
  saveResults(results);
}

async function checkV4Status() {
  try {
    const output = execSync('npm view tailwindcss versions --json', { encoding: 'utf8' });
    const versions = JSON.parse(output);
    const latestV4 = versions.filter(v => v.startsWith('4.')).pop();
    
    if (!latestV4) {
      console.log('❌ v4 Status: No stable v4 release found');
      return false;
    }
    
    const isStable = !latestV4.includes('alpha') && !latestV4.includes('beta');
    console.log(`${isStable ? '✅' : '⚠️'} v4 Status: ${latestV4} ${isStable ? '(STABLE)' : '(PRE-RELEASE)'}`);
    return isStable;
  } catch (error) {
    console.log('❌ v4 Status: Error checking versions');
    return false;
  }
}

async function checkShadcnCompatibility() {
  try {
    // Check if shadcn/ui has v4 support
    const output = execSync('npm view @shadcn/ui versions --json 2>/dev/null || echo "[]"', { encoding: 'utf8' });
    const hasV4Support = output.includes('v4') || output.includes('4.');
    
    console.log(`${hasV4Support ? '✅' : '❌'} shadcn/ui: ${hasV4Support ? 'v4 compatible' : 'No v4 support yet'}`);
    return hasV4Support;
  } catch (error) {
    console.log('❌ shadcn/ui: Error checking compatibility');
    return false;
  }
}

async function checkPluginEcosystem() {
  let compatibleCount = 0;
  
  for (const plugin of CRITICAL_PLUGINS) {
    try {
      const output = execSync(`npm view ${plugin} versions --json`, { encoding: 'utf8' });
      const versions = JSON.parse(output);
      const hasV4Support = versions.some(v => v.includes('4.') || v.includes('v4'));
      
      if (hasV4Support) compatibleCount++;
      console.log(`${hasV4Support ? '✅' : '❌'} ${plugin}: ${hasV4Support ? 'v4 ready' : 'No v4 support'}`);
    } catch (error) {
      console.log(`❌ ${plugin}: Error checking compatibility`);
    }
  }
  
  const isReady = compatibleCount >= CRITICAL_PLUGINS.length * 0.8;
  console.log(`${isReady ? '✅' : '❌'} Plugin Ecosystem: ${compatibleCount}/${CRITICAL_PLUGINS.length} ready`);
  return isReady;
}

async function checkMigrationTool() {
  try {
    const output = execSync('npm view @tailwindcss/upgrade versions --json', { encoding: 'utf8' });
    const versions = JSON.parse(output);
    const hasStableTool = versions.some(v => !v.includes('alpha') && !v.includes('beta'));
    
    console.log(`${hasStableTool ? '✅' : '❌'} Migration Tool: ${hasStableTool ? 'Stable available' : 'Pre-release only'}`);
    return hasStableTool;
  } catch (error) {
    console.log('❌ Migration Tool: Not available');
    return false;
  }
}

function displayResults(results) {
  console.log('\n📊 READINESS SUMMARY');
  console.log('='.repeat(50));
  console.log(`v4 Stable Release: ${results.v4Status ? '✅' : '❌'}`);
  console.log(`shadcn/ui Compatible: ${results.shadcnCompatibility ? '✅' : '❌'}`);
  console.log(`Plugin Ecosystem: ${results.pluginEcosystem ? '✅' : '❌'}`);
  console.log(`Migration Tool: ${results.migrationTool ? '✅' : '❌'}`);
  console.log('\n🎯 RECOMMENDATION');
  console.log(results.recommendation);
  console.log('\n📅 Next Check: Run this script monthly');
}

function saveResults(results) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    ...results,
    nextCheckDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
  
  fs.writeFileSync('docs/v4-readiness-report.json', JSON.stringify(report, null, 2));
  console.log('\n💾 Report saved to docs/v4-readiness-report.json');
}

// Run the check
checkV4Readiness().catch(console.error);
