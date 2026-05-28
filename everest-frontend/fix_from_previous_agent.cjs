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
    if (!content.startsWith('"')) {
        let wrapped = '"' + content + '"';
        try {
            let fixed = JSON.parse(wrapped);
            fs.writeFileSync(file, fixed);
            console.log('Successfully JSON.parsed and fixed by wrapping in quotes:', file);
        } catch(e) {
            console.log('Failed to wrap and parse:', file, e.message);
        }
    }
  }
}
