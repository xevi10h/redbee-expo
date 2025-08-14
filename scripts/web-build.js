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
  
  // Copy .well-known files for deep links
  console.log('📋 Copying .well-known files for deep links...');
  
  const distDir = 'dist';
  const wellKnownDir = path.join(distDir, '.well-known');
  
  // Create .well-known directory in dist
  if (!fs.existsSync(wellKnownDir)) {
    fs.mkdirSync(wellKnownDir, { recursive: true });
  }
  
  // Copy assetlinks.json for Android
  const assetlinksSource = 'website-files/.well-known/assetlinks.json';
  const assetlinksTarget = path.join(wellKnownDir, 'assetlinks.json');
  
  if (fs.existsSync(assetlinksSource)) {
    fs.copyFileSync(assetlinksSource, assetlinksTarget);
    console.log('✅ Copied assetlinks.json for Android deep links');
  } else {
    console.warn('⚠️  assetlinks.json not found at', assetlinksSource);
  }
  
  // Copy apple-app-site-association for iOS
  const appleSource = 'website-files/.well-known/apple-app-site-association';
  const appleTarget = path.join(wellKnownDir, 'apple-app-site-association');
  
  if (fs.existsSync(appleSource)) {
    fs.copyFileSync(appleSource, appleTarget);
    console.log('✅ Copied apple-app-site-association for iOS deep links');
  } else {
    console.warn('⚠️  apple-app-site-association not found at', appleSource);
  }
  
  // Copy waiting list page
  console.log('📋 Copying waiting list files...');
  
  const waitingListSource = 'website-files/waiting-list/index.html';
  const waitingListDir = path.join(distDir, 'waiting-list');
  const waitingListTarget = path.join(waitingListDir, 'index.html');
  
  if (fs.existsSync(waitingListSource)) {
    // Create waiting-list directory in dist
    if (!fs.existsSync(waitingListDir)) {
      fs.mkdirSync(waitingListDir, { recursive: true });
    }
    
    fs.copyFileSync(waitingListSource, waitingListTarget);
    console.log('✅ Copied waiting list page');
  } else {
    console.warn('⚠️  waiting list page not found at', waitingListSource);
  }
  
  // Copy legal pages (terms and privacy)
  console.log('📋 Copying legal pages...');
  
  const legalPages = [
    { source: 'website-files/terms/es_ES/index.html', target: path.join(distDir, 'terms', 'es_ES', 'index.html') },
    { source: 'website-files/terms/en_US/index.html', target: path.join(distDir, 'terms', 'en_US', 'index.html') },
    { source: 'website-files/privacy/es_ES/index.html', target: path.join(distDir, 'privacy', 'es_ES', 'index.html') },
    { source: 'website-files/privacy/en_US/index.html', target: path.join(distDir, 'privacy', 'en_US', 'index.html') }
  ];
  
  legalPages.forEach(({ source, target }) => {
    if (fs.existsSync(source)) {
      const targetDir = path.dirname(target);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      fs.copyFileSync(source, target);
      console.log(`✅ Copied ${path.basename(path.dirname(source))}/${path.basename(source)} to ${target}`);
    } else {
      console.warn('⚠️  legal page not found at', source);
    }
  });
  
  // Copy icon assets for waiting list
  console.log('📋 Copying icon assets...');
  
  const iconSource = 'assets/images/icon.png';
  const iconTarget = path.join(distDir, 'icon.png');
  
  if (fs.existsSync(iconSource)) {
    fs.copyFileSync(iconSource, iconTarget);
    console.log('✅ Copied icon.png for waiting list logo');
  } else {
    console.warn('⚠️  icon.png not found at', iconSource);
  }
  
  const faviconSource = 'assets/images/favicon.png';
  const faviconTarget = path.join(distDir, 'favicon.png');
  
  if (fs.existsSync(faviconSource)) {
    fs.copyFileSync(faviconSource, faviconTarget);
    console.log('✅ Copied favicon.png');
  } else {
    console.warn('⚠️  favicon.png not found at', faviconSource);
  }
  
  // Copy _redirects file for Netlify
  console.log('📋 Copying _redirects file...');
  
  const redirectsSource = 'website-files/_redirects';
  const redirectsTarget = path.join(distDir, '_redirects');
  
  if (fs.existsSync(redirectsSource)) {
    fs.copyFileSync(redirectsSource, redirectsTarget);
    console.log('✅ Copied _redirects file for Netlify routing');
  } else {
    console.warn('⚠️  _redirects file not found at', redirectsSource);
  }
  
  console.log('🔗 Deep links, legal pages, and routing ready for deployment!');
  
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