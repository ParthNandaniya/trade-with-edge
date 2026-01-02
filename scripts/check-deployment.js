#!/usr/bin/env node

/**
 * Pre-deployment Checklist
 * 
 * Checks if everything is ready for Firebase deployment
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const checks = [];
let hasErrors = false;

function check(condition, message, error = false) {
  checks.push({ condition, message, error });
  if (!condition) {
    console.log(`${error ? '❌' : '⚠️ '} ${message}`);
    if (error) hasErrors = true;
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('\n🔍 Checking deployment readiness...\n');

// Check Firebase configuration
check(
  existsSync(join(rootDir, 'firebase.json')),
  'firebase.json exists',
  true
);

check(
  existsSync(join(rootDir, '.firebaserc')),
  '.firebaserc exists',
  true
);

// Check .firebaserc has project ID
if (existsSync(join(rootDir, '.firebaserc'))) {
  try {
    const firebaserc = JSON.parse(readFileSync(join(rootDir, '.firebaserc'), 'utf-8'));
    const projectId = firebaserc.projects?.default;
    check(
      projectId && projectId !== 'YOUR_PROJECT_ID',
      `.firebaserc has valid project ID: ${projectId}`,
      !projectId || projectId === 'YOUR_PROJECT_ID'
    );
  } catch (e) {
    check(false, '.firebaserc is valid JSON', true);
  }
}

// Check dashboard build
check(
  existsSync(join(rootDir, 'dashboard', 'package.json')),
  'Dashboard package.json exists',
  true
);

// Check functions
check(
  existsSync(join(rootDir, 'functions', 'package.json')),
  'Functions package.json exists',
  true
);

check(
  existsSync(join(rootDir, 'functions', 'src', 'index.ts')),
  'Functions index.ts exists',
  true
);

// Check API config
check(
  existsSync(join(rootDir, 'dashboard', 'src', 'config', 'api.ts')),
  'API config file exists',
  true
);

// Check environment files (warnings only)
check(
  existsSync(join(rootDir, 'dashboard', '.env')) || existsSync(join(rootDir, 'dashboard', '.env.example')),
  'Dashboard .env or .env.example exists',
  false
);

check(
  existsSync(join(rootDir, 'functions', '.env')) || existsSync(join(rootDir, 'functions', '.env.example')),
  'Functions .env or .env.example exists',
  false
);

// Check API config doesn't have placeholder
if (existsSync(join(rootDir, 'dashboard', 'src', 'config', 'api.ts'))) {
  const apiConfig = readFileSync(join(rootDir, 'dashboard', 'src', 'config', 'api.ts'), 'utf-8');
  check(
    !apiConfig.includes('YOUR_PROJECT_ID') || !import.meta.env.PROD,
    'API config has valid project ID (check in production)',
    false
  );
}

console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('\n❌ Deployment check failed! Please fix the errors above.\n');
  process.exit(1);
} else {
  console.log('\n✅ All critical checks passed! Ready to deploy.\n');
  console.log('Next steps:');
  console.log('1. Update .firebaserc with your project ID');
  console.log('2. Set environment variables');
  console.log('3. Run: npm run build');
  console.log('4. Run: firebase deploy\n');
  process.exit(0);
}

