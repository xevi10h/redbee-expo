// Quick test script to verify translations are loading correctly
const fs = require('fs');
const path = require('path');

console.log('Testing translation files...\n');

const languages = ['es_ES', 'en_US', 'ca_ES', 'fr_FR', 'it_IT', 'pt_PT'];
const testKeys = [
    'auth.welcome',
    'navigation.home',
    'profile.editProfile', 
    'settings.language',
    'common.save'
];

let allTestsPassed = true;

languages.forEach(lang => {
    console.log(`🔍 Testing ${lang}...`);
    
    try {
        const filePath = path.join(__dirname, 'locales', `${lang}.json`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`❌ File ${lang}.json not found`);
            allTestsPassed = false;
            return;
        }

        const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Test specific keys
        testKeys.forEach(keyPath => {
            const keys = keyPath.split('.');
            let value = translations;
            
            for (const key of keys) {
                value = value[key];
                if (!value) break;
            }
            
            if (!value) {
                console.log(`❌ Missing key: ${keyPath}`);
                allTestsPassed = false;
            }
        });
        
        // Check structure matches Spanish (reference)
        if (lang !== 'es_ES') {
            const esPath = path.join(__dirname, 'locales', 'es_ES.json');
            const esTranslations = JSON.parse(fs.readFileSync(esPath, 'utf8'));
            
            const checkStructure = (obj1, obj2, path = '') => {
                for (const key in obj1) {
                    const currentPath = path ? `${path}.${key}` : key;
                    if (!(key in obj2)) {
                        console.log(`❌ Missing section: ${currentPath}`);
                        allTestsPassed = false;
                    } else if (typeof obj1[key] === 'object' && obj1[key] !== null) {
                        checkStructure(obj1[key], obj2[key], currentPath);
                    }
                }
            };
            
            checkStructure(esTranslations, translations);
        }
        
        console.log(`✅ ${lang} - OK`);
        
    } catch (error) {
        console.log(`❌ ${lang} - Error: ${error.message}`);
        allTestsPassed = false;
    }
    
    console.log('');
});

if (allTestsPassed) {
    console.log('🎉 All translation tests passed!');
    console.log('\nAvailable languages:');
    languages.forEach(lang => {
        const filePath = path.join(__dirname, 'locales', `${lang}.json`);
        const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const langName = translations.settings?.languages?.[lang] || lang;
        console.log(`  • ${lang}: ${langName}`);
    });
    
    // Cleanup
    setTimeout(() => {
        fs.unlinkSync(__filename);
        console.log('\n🧹 Test file cleaned up');
    }, 100);
} else {
    console.log('❌ Some tests failed. Please check the issues above.');
}