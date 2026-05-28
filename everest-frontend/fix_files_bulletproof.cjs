const fs = require('fs');

const filesToFix = [
  'src/App.jsx',
  'src/components/CustomerList.jsx',
  'src/components/ApplicationStatusView.jsx',
  'src/components/AddCustomerModal.jsx',
  'src/utils/pdfGenerator.js'
];

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // If the file starts with a quote, we assume it's a JSON encoded string
    if (content.startsWith('"') && content.endsWith('"')) {
      try {
        let fixed = JSON.parse(content);
        // It might be double-encoded
        if (typeof fixed === 'string' && fixed.startsWith('"')) {
          try {
            fixed = JSON.parse(fixed);
          } catch(e) {}
        }
        fs.writeFileSync(file, fixed);
        console.log('Fixed', file);
      } catch (e) {
        console.log('Failed to parse JSON for', file);
        // Alternative manual unescape:
        content = content.replace(/^"|"$/g, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
        fs.writeFileSync(file, content);
        console.log('Manually fixed', file);
      }
    } else if (content.startsWith('"')) {
        console.log('File started with quote but didnt end with one:', file);
        content = content.replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
        fs.writeFileSync(file, content);
        console.log('Manually fixed', file);
    }
  }
}
