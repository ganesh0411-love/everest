const fs = require('fs');

function fixFile(filepath) {
  if (fs.existsSync(filepath)) {
    let content = fs.readFileSync(filepath, 'utf8').trim();
    if (content.startsWith('"') && content.endsWith('"')) {
      try {
        let fixed = JSON.parse(content);
        fs.writeFileSync(filepath, fixed);
        console.log('Fixed', filepath);
      } catch (e) {
        console.log('Failed to parse', filepath, e.message);
      }
    }
  }
}

fixFile('src/App.jsx');
const comps = fs.readdirSync('src/components');
for (let c of comps) fixFile('src/components/' + c);
if (fs.existsSync('src/utils')) {
  const utils = fs.readdirSync('src/utils');
  for (let u of utils) fixFile('src/utils/' + u);
}
