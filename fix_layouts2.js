const fs = require('fs');
const files = [
  'c:/Users/DELL/Desktop/Everest/everest-frontend/src/components/CustomerList.jsx',
  'c:/Users/DELL/Desktop/Everest/everest-frontend/src/components/ApplicationStatusView.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  const fixRegex = /\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>\s*\);\s*\};\s*export default .*?;/s;
  
  const buttonsHtml = `
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
    </div>
  );
};`;

  let componentName = file.split('/').pop().replace('.jsx', '');
  
  if (fixRegex.test(content)) {
    content = content.replace(fixRegex, buttonsHtml + '\n\nexport default ' + componentName + ';');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed ' + file);
  } else {
    console.log('Could not match fixRegex in ' + file);
  }
});
