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

    // 1. Globally change any Fredoka or Fredoka-Bold to Fredoka-Regular
    content = content.replace(/fontFamily:\s*['"]Fredoka(-Bold)?['"]/g, "fontFamily: 'Fredoka-Regular'");

    // 2. We want to explicitly apply Fredoka-Bold to specific styles like usernames and tags
    const boldStyles = ['authorName', 'username', 'commentUsername', 'categoryText', 'categoryLabel', 'name', 'userName', 'tabLabel'];
    
    const styleSheetRegex = /StyleSheet\.create\(\{([\s\S]*?)\}\);/g;
    
    content = content.replace(styleSheetRegex, (match, body) => {
        const styleBlockRegex = /([a-zA-Z0-9_]+)\s*:\s*\{([^}]+)\}/g;
        
        const newBody = body.replace(styleBlockRegex, (blockMatch, styleName, styleBody) => {
            // If the style is one of the bold ones and it has a fontFamily
            if (boldStyles.includes(styleName) && /fontFamily\s*:\s*['"][^'"]+['"]/.test(styleBody)) {
                // Change it to Fredoka-Bold
                styleBody = styleBody.replace(/fontFamily\s*:\s*['"][^'"]+['"]/g, "fontFamily: 'Fredoka-Bold'");
            }
            return `${styleName}: {${styleBody}}`;
        });
        
        return `StyleSheet.create({${newBody}});`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
});
