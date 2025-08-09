#!/usr/bin/env node

/**
 * Custom build script that patches problematic modules before building for web
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Preparing web build...');

// Create temporary patches for Stripe modules
const stripePatches = [
  'node_modules/@stripe/stripe-react-native/lib/commonjs/components/CardField.js',
  'node_modules/@stripe/stripe-react-native/lib/commonjs/components/CardForm.js',
  'node_modules/@stripe/stripe-react-native/lib/module/components/CardField.js',
  'node_modules/@stripe/stripe-react-native/lib/module/components/CardForm.js',
];

const mockContent = `
// Web-compatible mock for Stripe components
module.exports = {
  default: function MockStripeComponent() {
    console.warn('Stripe components are not available on web platform');
    return null;
  },
  CardField: function MockCardField() {
    console.warn('CardField is not available on web platform');
    return null;
  },
  CardForm: function MockCardForm() {
    console.warn('CardForm is not available on web platform');
    return null;
  }
};
`;

// Backup and patch files
const backups = [];

stripePatches.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const backupPath = filePath + '.backup';
    console.log(`📦 Backing up: ${filePath}`);
    
    // Create backup
    fs.copyFileSync(filePath, backupPath);
    backups.push({ original: filePath, backup: backupPath });
    
    // Patch with mock
    fs.writeFileSync(filePath, mockContent);
  }
});

console.log('🚀 Starting Expo web build...');

try {
  // Run the expo export command
  execSync('NODE_ENV=production expo export --platform web', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('✅ Web build completed successfully!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} finally {
  // Restore backups
  console.log('🔄 Restoring original files...');
  backups.forEach(({ original, backup }) => {
    if (fs.existsSync(backup)) {
      fs.copyFileSync(backup, original);
      fs.unlinkSync(backup);
      console.log(`✅ Restored: ${original}`);
    }
  });
}

console.log('🎉 Build process completed!');