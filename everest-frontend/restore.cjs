const fs = require('fs');
const path = require('path');
const files = require('./reconstructed_files.json');

const targetDir = 'C:\\Users\\DELL\\Desktop\\Everest\\everest-frontend\\src';

for (let key of Object.keys(files)) {
    let cleanKey = key.replace(/^\"|\"$/g, '').replace(/\\\\/g, '\\').replace(/\//g, '\\');
    if (cleanKey.toLowerCase().includes('everest-frontend\\src\\')) {
        const srcIndex = cleanKey.toLowerCase().indexOf('everest-frontend\\src\\');
        const relativePath = cleanKey.substring(srcIndex + 21);
        const absoluteDest = path.join(targetDir, relativePath);
        
        let content = files[key];
        if (typeof content === 'string' && content.startsWith('"') && content.endsWith('"')) {
            content = content.substring(1, content.length - 1)
                             .replace(/\\n/g, '\n')
                             .replace(/\\"/g, '"')
                             .replace(/\\\\/g, '\\');
        }
        
        fs.mkdirSync(path.dirname(absoluteDest), { recursive: true });
        fs.writeFileSync(absoluteDest, content);
        console.log('Restored: ' + relativePath);
    }
}
