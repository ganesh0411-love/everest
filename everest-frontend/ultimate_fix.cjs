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
    
    // The previous agent's script added actual newlines while the string itself had \\n
    // Let's remove actual newlines, because the real newlines are encoded as \\n
    content = content.replace(/\r?\n/g, '');
    
    // Now wrap in quotes and parse
    let wrapped = '"' + content + '"';
    try {
        let fixed = JSON.parse(wrapped);
        fs.writeFileSync(file, fixed);
        console.log('Successfully JSON.parsed and fixed:', file);
    } catch(e) {
        console.log('Failed to parse after stripping newlines:', file, e.message);
        // Fallback manual replace
        content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        fs.writeFileSync(file, content);
        console.log('Manually fixed:', file);
    }
  }
}
