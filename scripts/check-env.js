#!/usr/bin/env node

/**
 * Script to validate required environment variables before build
 * Run this before deploying to catch missing variables early
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SECRET_KEY',
  'NEXT_PUBLIC_SITE_URL'
];

const optionalEnvVars = [
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET'
];

console.log('🔍 Checking environment variables...\n');

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('Required variables:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ❌ ${varName} - MISSING`);
    hasErrors = true;
  } else {
    // Show first 20 chars for security
    const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
    console.log(`  ✅ ${varName} - ${preview}`);
  }
});

console.log('\nOptional variables:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ⚠️  ${varName} - NOT SET (optional)`);
    hasWarnings = true;
  } else {
    const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
    console.log(`  ✅ ${varName} - ${preview}`);
  }
});

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('\n❌ ERROR: Missing required environment variables!');
  console.log('Please set them in .env.local (local) or Vercel settings (production)\n');
  process.exit(1);
}

if (hasWarnings) {
  console.log('\n⚠️  WARNING: Some optional variables are not set.');
  console.log('The app will work but some features may be limited.\n');
}

if (!hasErrors && !hasWarnings) {
  console.log('\n✅ All environment variables are set correctly!\n');
}

console.log('Tip: For Vercel deployment, make sure to set these in:');
console.log('  Settings → Environment Variables → Add for all environments\n');
