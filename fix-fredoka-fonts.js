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

    // We look for any style property in StyleSheet that looks like text (has fontSize, fontWeight, lineHeight, textAlign, or letterSpacing)
    // and does NOT have fontFamily.
    
    // We can use a replacer function on the whole file to find StyleSheet.create({ ... })
    // and then parse its top-level properties.
    
    const styleSheetRegex = /StyleSheet\.create\(\{([\s\S]*?)\}\);/g;
    
    content = content.replace(styleSheetRegex, (match, body) => {
        // body contains the styles. We need to find individual style blocks.
        // A naive regex to find keys and their object bodies.
        const styleBlockRegex = /([a-zA-Z0-9_]+)\s*:\s*\{([^}]+)\}/g;
        
        const newBody = body.replace(styleBlockRegex, (blockMatch, styleName, styleBody) => {
            // Check if it's text-related
            const isText = /(fontSize|fontWeight|lineHeight|textAlign|letterSpacing)\s*:/.test(styleBody);
            // Check if it already has a fontFamily
            const hasFontFamily = /fontFamily\s*:/.test(styleBody);
            
            if (isText && !hasFontFamily) {
                // Add fontFamily: 'Fredoka'
                let updatedBody = styleBody.replace(/\n(\s*)$/, ",\n$1  fontFamily: 'Fredoka',\n$1");
                // Clean up double commas
                updatedBody = updatedBody.replace(/,,/g, ',');
                return `${styleName}: {${updatedBody}}`;
            }
            return blockMatch;
        });
        
        return `StyleSheet.create({${newBody}});`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
});
