const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.jsx')) results.push(file);
        }
    });
    return results;
}

const dirs = [
    '/home/aarya_balan/My Space/react-native/LetItOut/app',
    '/home/aarya_balan/My Space/react-native/LetItOut/components'
];

let files = [];
dirs.forEach(dir => {
    files = files.concat(walk(dir));
});

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Handle inline styles where fontFamily: 'Fredoka' is present
    content = content.replace(/(fontFamily:\s*['"]Fredoka['"][^}]*)fontWeight:\s*['"][^'"]+['"]/g, "$1fontWeight: '400'");
    content = content.replace(/fontWeight:\s*['"][^'"]+['"]([^}]*fontFamily:\s*['"]Fredoka['"])/g, "fontWeight: '400'$1");

    // 2. Handle StyleSheet definitions
    // Look for any style block `{ ... }`
    const styleBlockRegex = /([a-zA-Z0-9_]+)\s*:\s*\{([^}]+)\}/g;
    
    content = content.replace(styleBlockRegex, (blockMatch, styleName, styleBody) => {
        // Check if it has fontFamily: 'Fredoka'
        if (/fontFamily\s*:\s*['"]Fredoka['"]/.test(styleBody)) {
            // Replace any fontWeight with '400'
            // If it has fontWeight, replace it
            if (/fontWeight\s*:/.test(styleBody)) {
                styleBody = styleBody.replace(/fontWeight\s*:\s*['"][^'"]+['"]/g, "fontWeight: '400'");
            }
        }
        return `${styleName}: {${styleBody}}`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
});
