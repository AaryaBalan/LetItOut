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

    // Remove inline fontWeight where fontFamily Ribeye is defined
    content = content.replace(/(fontFamily:\s*['"]Ribeye['"][^}]*)fontWeight:\s*['"][^'"]+['"]\s*,?/g, "$1");
    content = content.replace(/fontWeight:\s*['"][^'"]+['"]\s*,?([^}]*fontFamily:\s*['"]Ribeye['"])/g, "$1");

    // Broaden the regex to capture ANY style name that ends with Title, or is exactly Header/Head, etc.
    // e.g. heroTitle, sectionTitle, bentoTitle, anythingTitle
    const styleRegex = /([a-zA-Z0-9_]*(?:Title|Header|Heading|Headline)):\s*\{([^}]+)\}/g;
    
    content = content.replace(styleRegex, (match, p1, p2) => {
        let body = p2;
        
        // Remove fontWeight
        body = body.replace(/\s*fontWeight:\s*['"][^'"]+['"]\s*,?/g, '');
        
        // Add fontFamily if not there
        if (!body.includes('fontFamily:')) {
            // Ensure proper formatting
            body = body.replace(/\n(\s*)$/, ",\n$1  fontFamily: 'Ribeye',\n$1");
        } else {
            // Replace existing
            body = body.replace(/fontFamily:\s*['"][^'"]+['"]/g, "fontFamily: 'Ribeye'");
        }
        
        // Clean up double commas if any
        body = body.replace(/,,/g, ',');
        
        return `${p1}: {${body}}`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
});
