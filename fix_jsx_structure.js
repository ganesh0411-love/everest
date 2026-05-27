const fs = require('fs');

function fixFile(file, componentName, isFragment) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Find the exact last occurrence of })()}
  const target = '})()}';
  const index = content.lastIndexOf(target);
  if (index === -1) {
    console.log('Could not find ' + target + ' in ' + file);
    return;
  }
  
  // Keep everything up to and including })()}
  let top = content.substring(0, index + target.length);
  
  // Construct the correct ending
  const buttonsHtml = `
            </div>
          </div>
          
          {/* Action Buttons (Fixed Bottom) */}
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '15px',
            zIndex: 1000,
            background: 'white',
            padding: '10px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <button
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: '#e0e0e0',
                color: '#333',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              onClick={() => { setPreviewCustomer(null); setPreviewCustomerStatus(null); }}
            >
              Close
            </button>
            <button
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: '#03a9f4',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              onClick={() => handleDownloadPreviewPDF(previewCustomer, previewCustomerStatus)}
            >
              \uD83D\uDCE5 Download PDF
            </button>
            <button
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: '#1b2a60',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              onClick={() => handlePrintPreviewPDF(previewCustomer, previewCustomerStatus)}
            >
              \uD83D\uDDA8\uFE0F Print PDF
            </button>
          </div>
        </div>
      </div>
    )}
  `;
  
  const end = isFragment 
    ? `\n    </>\n  );\n};\n\nexport default ${componentName};`
    : `\n    </div>\n  );\n};\n\nexport default ${componentName};`;
    
  fs.writeFileSync(file, top + buttonsHtml + end, 'utf8');
  console.log('Fixed ' + file);
}

fixFile('c:/Users/DELL/Desktop/Everest/everest-frontend/src/components/AddCustomerModal.jsx', 'AddCustomerModal', true);
fixFile('c:/Users/DELL/Desktop/Everest/everest-frontend/src/components/CustomerList.jsx', 'CustomerList', false);
fixFile('c:/Users/DELL/Desktop/Everest/everest-frontend/src/components/ApplicationStatusView.jsx', 'ApplicationStatusView', false);
