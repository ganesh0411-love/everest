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
    let content = fs.readFileSync(file, 'utf8').trim();
    if (content.startsWith('"') && content.endsWith('"')) {
      try {
        let fixed = JSON.parse(content);
        if (typeof fixed === 'string' && fixed.startsWith('"')) {
           try { fixed = JSON.parse(fixed); } catch(e) {}
        }
        fs.writeFileSync(file, fixed);
        console.log('Successfully JSON.parsed and fixed:', file);
      } catch (e) {
        console.log('Failed JSON parse for', file, e.message);
      }
    } else {
        console.log('File does not start and end with quotes after trim:', file);
    }
  }
}
