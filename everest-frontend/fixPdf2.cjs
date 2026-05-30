const fs = require('fs');
const file = 'C:/Users/DELL/Desktop/Everest/everest-frontend/src/components/PdfPreviewModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Account Status Fetching Fix
content = content.replace(
  /const isNew = application\?\.status === 'Pending';/,
  "const isNew = application?.customerStatus === 'New';"
);

// 2. DOB Box Alignment Fix
content = content.replace(
  /<td className=\"py-1 flex items-center gap-2 whitespace-nowrap\">\s*&nbsp;&nbsp;\s*<div className=\"flex gap-\[2px\]\">([\s\S]*?)<span className=\"ml-4\">Age<\/span>([\s\S]*?)<\/td>/,
  `<td className="py-1 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            &nbsp;&nbsp;
                            <div className="flex gap-[2px]">$1<span className="ml-4">Age</span>$2</div>
                        </td>`
);

// 3. Bottom Left Address Spacing (Add ml-6)
content = content.replace(
  /<div className=\"border-l-\[4px\] pl-4 text-\[10px\] font-bold leading-relaxed bg-white\/50 p-2 rounded\" style={{ borderColor: darkBlue, color: darkBlue }}>/,
  `<div className="border-l-[4px] pl-4 text-[10px] font-bold leading-relaxed bg-white/50 p-2 rounded ml-12" style={{ borderColor: darkBlue, color: darkBlue }}>`
);

// 4. Watermark Optimization (Reduce font size and adjust transform)
content = content.replace(
  /fontSize: '9rem',\s*color: cyanBlue,\s*transform: 'rotate\(-45deg\)',/,
  `fontSize: '7rem',
                color: cyanBlue,
                transform: 'rotate(-45deg) translateY(-150px)',`
);

fs.writeFileSync(file, content);
console.log('Update 2 complete.');
