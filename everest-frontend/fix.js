const fs = require('fs');
let f = fs.readFileSync('src/components/PdfPreviewModal.jsx', 'utf8');
f = f.replace(/className="leading-normal m-0 p-0"/g, "style={{ lineHeight: 'normal', margin: 0, padding: 0 }}");
f = f.replace(/box-border"/g, 'box-border py-0"');
fs.writeFileSync('src/components/PdfPreviewModal.jsx', f);
