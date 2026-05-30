const fs = require('fs');
const file = 'C:/Users/DELL/Desktop/Everest/everest-frontend/src/components/PdfPreviewModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Application Number
content = content.replace(
  /const appNo = application\?\.serialNo \? String\(application\.serialNo\)\.padStart\(2, '0'\) : '01';/,
  "const appNo = application?.appNumber ? String(application.appNumber).padStart(2, '0') : '01';"
);

// 2. Header Text and Alignment
content = content.replace(
  /<div className=\"flex items-center mb-4 px-4 relative\">\s*{\/\* Logo Area \*\/}\s*<div className=\"w-24 h-24 flex-shrink-0 relative flex items-center justify-center p-2\">\s*<img src={logo} alt=\"Logo\" className=\"w-full h-full object-contain\" \/>\s*<\/div>\s*{\/\* Header Text \*\/}\s*<div className=\"ml-4 flex-1 flex flex-col items-center\">\s*<h1 className=\"text-3xl font-black tracking-widest uppercase m-0 leading-none\" style={{ color: darkBlue, fontFamily: 'Arial Black, Impact, sans-serif' }}>\s*EVEREST MICRO FINANCE CENTER\s*<\/h1>\s*<h2 className=\"text-lg font-bold tracking-widest mt-1 uppercase\" style={{ color: darkBlue }}>\s*APPLICATION FORM\s*<\/h2>\s*<\/div>\s*<\/div>/,
  `<div className="flex items-center justify-center mb-4 px-4 relative h-24">
              {/* Logo Area */}
              <div className="absolute left-4 w-24 h-24 flex items-center justify-center p-2">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>

              {/* Header Text */}
              <div className="flex flex-col items-center">
                <h1 className="text-3xl font-black tracking-widest uppercase m-0 leading-none" style={{ color: darkBlue, fontFamily: 'Arial Black, Impact, sans-serif' }}>
                  EVEREST MICROFINANCE
                </h1>
                <h2 className="text-lg font-bold tracking-widest mt-1 uppercase" style={{ color: darkBlue }}>
                  APPLICATION FORM
                </h2>
              </div>
            </div>`
);

// 3. Date & Day Alignment
content = content.replace(
  /<div className=\"text-right text-\[#1e204d\] font-bold text-\[13px\] leading-tight mr-8\" style={{ color: darkBlue }}>\s*<div>Date <span className=\"mx-2\">:<\/span> {appDate}<\/div>\s*<div>Day <span className=\"mx-2\">:<\/span> {appDay}<\/div>\s*<\/div>/,
  `<table className="text-[#1e204d] font-bold text-[13px] leading-tight mr-8" style={{ color: darkBlue }}>
                <tbody>
                  <tr><td className="text-left pr-2">Date</td><td className="px-1">:</td><td className="text-left">{appDate}</td></tr>
                  <tr><td className="text-left pr-2">Day</td><td className="px-1">:</td><td className="text-left">{appDay}</td></tr>
                </tbody>
              </table>`
);

// 4. Global Date Format in PDF
content = content.replace(
  /const appDate = application\?\.appDate \|\| '26\.05\.2026';\s*const appDay = application\?\.appDay \|\| 'Wednesday';\s*const customerName = application\?\.customerName \|\| 'MR\. JOSEPH VIJAY';\s*const customerId = application\?\.id \|\| 'EMF00001';\s*const gender = application\?\.gender \|\| 'MALE';\s*const dob = \(application\?\.dob \|\| ''\)\.replace\(\/\\D\/g, ''\)\.padEnd\(8, ' '\);/,
  `const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) {
        return \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
      }
    }
    return dateStr;
  };

  const appDate = formatDateToDDMMYYYY(application?.appDate) || '26-05-2026';
  const appDay = application?.appDay || 'Wednesday';
  const customerName = application?.customerName || 'MR. JOSEPH VIJAY';
  const customerId = application?.id || 'EMF00001';
  const gender = application?.gender || 'MALE';
  const rawDob = formatDateToDDMMYYYY(application?.dob) || '';
  const dob = rawDob.replace(/\\D/g, '').padEnd(8, ' ');`
);

// 5. Dynamic KYC Fields
content = content.replace(
  /<div className=\"flex items-center gap-4 mt-2\">\s*<span className=\"w-28 uppercase\">AADHAR NO<\/span>\s*<div className=\"flex gap-\[2px\]\">\s*{aadhaar\.split\(''\)\.map\(\(char, i\) => \(\s*<div key={`aadhaar-\${i}`} className=\"w-\[18px\] h-\[24px\] border flex items-center justify-center font-normal text-xs\" style={{ borderColor: darkBlue }}>{char\.trim\(\)}<\/div>\s*\)\)}\s*<\/div>\s*<span className=\"ml-8 font-bold uppercase\">PAN<\/span>\s*<div className=\"w-\[150px\] h-\[24px\] border px-2 flex items-center font-normal text-xs\" style={{ borderColor: darkBlue }}>{pan}<\/div>\s*<\/div>/,
  `<div className="flex flex-wrap items-center gap-y-4 gap-x-8 mt-2">
                  {[
                    { label: 'AADHAAR NO', value: (application?.aadhaar || ''), isBoxes: true, boxCount: 12 },
                    { label: 'PAN NO', value: application?.pan, isBoxes: false },
                    { label: 'VOTER ID', value: application?.voterId, isBoxes: false },
                    { label: 'SMART CARD', value: application?.smartCard, isBoxes: false }
                  ].filter(doc => doc.value && doc.value.trim().length > 0).map((kyc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="uppercase">{kyc.label}</span>
                      {kyc.isBoxes ? (
                         <div className="flex gap-[2px]">
                           {kyc.value.padEnd(kyc.boxCount, ' ').split('').map((char, i) => (
                             <div key={i} className="w-[18px] h-[24px] border flex items-center justify-center font-bold text-xs" style={{ borderColor: darkBlue }}>{char.trim()}</div>
                           ))}
                         </div>
                      ) : (
                         <div className="min-w-[150px] h-[24px] border px-2 flex items-center font-bold text-xs uppercase" style={{ borderColor: darkBlue }}>{kyc.value}</div>
                      )}
                    </div>
                  ))}
                </div>`
);

// 6. Footer Address Layout
content = content.replace(
  /<div className=\"mt-auto flex justify-between items-end relative z-20 px-8 pb-4\">\s*<div className=\"border-l-\[4px\] pl-4 text-xs font-bold leading-relaxed\" style={{ borderColor: darkBlue, color: darkBlue }}>/,
  `<div className="mt-auto flex justify-between items-end relative z-20 px-12 pb-8">
              <div className="border-l-[4px] pl-4 text-[10px] font-bold leading-relaxed bg-white/50 p-2 rounded" style={{ borderColor: darkBlue, color: darkBlue }}>`
);

// 7. Font Weight (replace font-normal with font-bold for filled data boxes globally)
content = content.replace(/font-normal text-xs/g, 'font-bold text-xs');

fs.writeFileSync(file, content);
console.log('Update complete.');
