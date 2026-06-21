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

const files = walk('/home/aarya_balan/My Space/react-native/LetItOut/app');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Replace Georgia/serif inline logic with Ribeye everywhere
    content = content.replace(/fontFamily:\s*Platform\.OS === ['"]ios['"] \? ['"]Georgia['"] : ['"]serif['"]/g, "fontFamily: 'Ribeye'");
    content = content.replace(/fontFamily:\s*['"]AutourOne['"]/g, "fontFamily: 'Ribeye'");

    // 2. Add Ribeye to specific stylesheet objects and strip fontWeight
    const styleRegex = /(headerTitle|title|commentsSectionTitle|postTitleLarge|postTitle):\s*\{([^}]+)\}/g;
    
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
        return `${p1}: {${body}}`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
});
