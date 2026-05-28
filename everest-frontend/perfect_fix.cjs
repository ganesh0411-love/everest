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
    
    // 1. Strip all actual newlines that were incorrectly added by the previous agent's array join
    content = content.replace(/\r?\n/g, '');
    
    // 2. Escape literal tabs which cause "Bad control character" in JSON.parse
    content = content.replace(/\t/g, '\\t');
    
    // 3. Wrap in quotes to make it a valid JSON string
    let wrapped = '"' + content + '"';
    
    try {
        let fixed = JSON.parse(wrapped);
        // It might be double-encoded
        if (typeof fixed === 'string' && fixed.startsWith('"')) {
            try { fixed = JSON.parse(fixed); } catch(e) {}
        }
        fs.writeFileSync(file, fixed);
        console.log('Successfully JSON.parsed and fixed:', file);
    } catch(e) {
        console.log('Failed to parse:', file, e.message);
    }
  }
}
