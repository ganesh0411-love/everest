const fs = require('fs');

const files = [
  'c:/Users/DELL/Desktop/Everest/everest-frontend/src/components/AddCustomerModal.jsx',
  'c:/Users/DELL/Desktop/Everest/everest-frontend/src/components/CustomerList.jsx',
  'c:/Users/DELL/Desktop/Everest/everest-frontend/src/components/ApplicationStatusView.jsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // 1. Remove Zoom states and logic
  content = content.replace(/const \[zoomFactor, setZoomFactor\] = useState\(1\);\n\s*const touchStartZoomRef = useRef\(1\);/, '');
  content = content.replace(/onTouchStart=\{.*?\}\n\s*onTouchMove=\{.*?\}/gs, '');

  // 2. Viewport Panning (touchAction: pan-x pan-y)
  content = content.replace(/touchAction:\s*'none'/g, `touchAction: 'pan-x pan-y'`);
  
  // Also remove transform: scale(previewScale * zoomFactor)
  content = content.replace(/transform:\s*`scale\(\$\{previewScale \* zoomFactor\}\)`/g, "transform: `scale(${previewScale})`");

  // 3. Header Layout Fixes
  content = content.replace(/EVEREST MICRO FINANCE/g, 'EVEREST MICROFINANCE');
  
  const headerBlockRegex = /<div style=\{\{ color: '#03a9f4'.*?APPLICATION NO : .*?<\/div>\s*<span style=\{\{ fontSize: 'clamp\(1\.2rem, 4vw, 2\.0rem\)'.*?EVEREST MICROFINANCE\s*<\/span>\s*<h2 style=\{\{ margin: '4px 0 0 0'.*?CENTER : .*?<\/h2>/s;
  
  content = content.replace(headerBlockRegex, 
    `<div style={{ color: '#03a9f4', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase', fontFamily: 'sans-serif', letterSpacing: '0.5px', textAlign: 'center', width: '100%' }}>
                    APPLICATION NO : {String(previewCustomer.details?.appNumber ?? '01').padStart(2, '0')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%', position: 'relative' }}>
                    <span style={{ fontSize: 'clamp(1.4rem, 4.5vw, 2.2rem)', fontWeight: 'bold', color: '#1b2a60', letterSpacing: '0.5px', fontFamily: 'sans-serif', lineHeight: '1.1', whiteSpace: 'nowrap' }}>
                      EVEREST MICROFINANCE
                    </span>
                    <h2 style={{ margin: '0 0 3px 15px', color: '#1b2a60', fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '0.5px', fontFamily: 'sans-serif', position: 'absolute', right: '0', bottom: '0' }}>
                      CENTER : {String(previewCustomer.details?.center || 'ANNA NAGAR').toUpperCase()}
                    </h2>
                  </div>`);

  // 4. Phone Number Side-by-Side
  const phoneRegex = /\{\/\*\s*Phone Number\s*\*\/\}.*?\{\/\*\s*Alternate Phone Number\s*\*\/\}.*?<\/div>\s*<\/div>/s;
  const newPhoneHtml = `{/* Phone & Alt Phone */}
                      <div style={{ width: '100%', display: 'flex', gap: '20px', alignItems: 'center', color: '#1b2a60', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <span style={{ width: '150px', flexShrink: 0 }}>PHONE NUMBER</span>
                          <span style={{ width: '15px', flexShrink: 0 }}>:</span>
                          <div style={{ flex: 1, height: '22px', border: '1px solid #1b2a60', padding: '0 8px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#1b2a60', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                            {previewCustomer.details?.phone || ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <span style={{ width: '160px', flexShrink: 0, paddingLeft: '10px' }}>ALT PHONE NUMBER</span>
                          <span style={{ width: '15px', flexShrink: 0 }}>:</span>
                          <div style={{ flex: 1, height: '22px', border: '1px solid #1b2a60', padding: '0 8px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#1b2a60', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                            {previewCustomer.details?.altPhone || ''}
                          </div>
                        </div>
                      </div>`;
  content = content.replace(phoneRegex, newPhoneHtml);

  // 5. Watermark Color Update
  const wmRegex = /let wmColor = 'rgba\\(240, 240, 240, 0\.8\\)';.*?wmColor = 'rgba\\(220, 245, 235, 0\.8\\)';.*?wmColor = 'rgba\\(254, 235, 235, 0\.8\\)';/s;
  const newWmLogic = `let wmColor = 'rgba(255, 222, 173, 0.9)'; // Orange for PENDING
                        if (previewCustomerStatus === 'APPROVED') wmColor = 'rgba(144, 238, 144, 0.9)'; // Green
                        else if (previewCustomerStatus === 'REJECTED') wmColor = 'rgba(255, 182, 193, 0.9)'; // Red`;
  content = content.replace(wmRegex, newWmLogic);

  // 6. Strip Manual Zoom Buttons
  const zoomBtnRegex = /\{\/\*\s*Zoom Level Indicator and Controls\s*\*\/\}.*?<\/div>\s*<\/div>/s;
  content = content.replace(zoomBtnRegex, '');

  // 7. Update handleDownloadPreviewPDF to always save
  const downloadHookRegex = /const shared = await sharePDF\(doc, fileName\);\s*if \(\!shared\) \{\s*doc\.save\(fileName\);\s*\}/s;
  const newDownloadHook = `await sharePDF(doc, fileName);
      // Seamlessly write and save generated PDF to local device
      doc.save(fileName);`;
  content = content.replace(downloadHookRegex, newDownloadHook);

  // 8. Update handlePrintPreviewPDF timeout
  const printHookRegex = /setTimeout\(\(\) => \{ document\.body\.removeChild\(iframe\); \}, 1000\);/g;
  content = content.replace(printHookRegex, `setTimeout(() => { document.body.removeChild(iframe); }, 15000);`);
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Processed ' + file);
});
