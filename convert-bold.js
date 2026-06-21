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

    // Match fontWeight > 400 or bold. Includes string '500' and number 500
    const fwRegex = /fontWeight:\s*(['"](?:500|600|700|800|900|bold)['"]|(500|600|700|800|900))\s*,?/g;
    
    // Replace with fontFamily: 'Fredoka-Bold'
    content = content.replace(fwRegex, "fontFamily: 'Fredoka-Bold', ");
    
    // Remove duplicate fontFamilies that might occur if Fredoka-Regular was also present in the same block
    content = content.replace(/fontFamily:\s*['"]Fredoka-Bold['"]\s*,\s*fontFamily:\s*['"]Fredoka-Regular['"]/g, "fontFamily: 'Fredoka-Bold'");
    content = content.replace(/fontFamily:\s*['"]Fredoka-Regular['"]\s*,\s*fontFamily:\s*['"]Fredoka-Bold['"]/g, "fontFamily: 'Fredoka-Bold'");
    
    // Fix any trailing/double commas created by the replacement
    content = content.replace(/,\s*,/g, ',');
    content = content.replace(/,\s*\}/g, ' }');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
});
