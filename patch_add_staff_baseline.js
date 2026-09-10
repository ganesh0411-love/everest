const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'everest-frontend', 'src', 'components', 'AddStaffForm.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update handleChange
const handleChangeTarget = `  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };`;

const handleChangeReplacement = `  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updates = { [name]: value };
      if (name === 'dob' && value) {
        const parts = value.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          updates.password = \`\${day}\${month}\${year}\`;
        }
      }
      return { ...prev, ...updates };
    });
  };`;

content = content.replace(handleChangeTarget, handleChangeReplacement);

// 2. Update handleMobileChange
const handleMobileChangeTarget = `  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, mobileNumber: val }));
  };`;

const handleMobileChangeReplacement = `  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\\D/g, '').slice(0, 10);
    setFormData(prev => ({ 
      ...prev, 
      mobileNumber: val,
      username: val 
    }));
  };`;

content = content.replace(handleMobileChangeTarget, handleMobileChangeReplacement);

// 3. Update handleSubmit payload
const submitTarget = `      // Submit even if partial, as requested
      const newStaff = {
        ...formData,
        status: 'Active', // Default status for new staff
        photoBase64: finalPhotoUrl, // URL instead of Base64
        photoFile: null, // Don't persist Blob to Firestore
        photoPreview: null // Don't persist DataURL to Firestore
      };`;

const submitReplacement = `      // Submit even if partial, as requested
      const newStaff = {
        ...formData,
        role: 'staff',
        phone: formData.mobileNumber,
        status: 'Active', // Default status for new staff
        photoBase64: finalPhotoUrl, // URL instead of Base64
        photoFile: null, // Don't persist Blob to Firestore
        photoPreview: null // Don't persist DataURL to Firestore
      };`;

content = content.replace(submitTarget, submitReplacement);

// 4. Move Mobile Number JSX
const mobileNumberJSX = `          {/* Mobile Number (Strict 10-digit validation) */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="tel" 
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleMobileChange}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="Enter mobile number"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow"
              />
            </div>
          </div>\n\n`;

content = content.replace(mobileNumberJSX, ''); // Remove from old location

const insertAfterDOB = `          </div>\n\n          {/* Staff ID */}`;
content = content.replace(insertAfterDOB, `          </div>\n\n` + mobileNumberJSX + `          {/* Staff ID */}`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched AddStaffForm.jsx successfully.');
