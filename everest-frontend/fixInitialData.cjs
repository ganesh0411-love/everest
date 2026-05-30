const fs = require('fs');
const file = 'C:/Users/DELL/Desktop/Everest/everest-frontend/src/components/AddCustomerModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace missing initialData bindings
content = content.replace(
  /const \[gender, setGender\] = useState\('Female'\);/,
  "const [gender, setGender] = useState(initialData?.gender || 'Female');"
);
content = content.replace(
  /const \[dob, setDob\] = useState\(''\);/,
  "const [dob, setDob] = useState(initialData?.dob || '');"
);
content = content.replace(
  /const \[age, setAge\] = useState\(''\);/,
  "const [age, setAge] = useState(initialData?.age || '');"
);
content = content.replace(
  /const \[occupation, setOccupation\] = useState\(''\);/,
  "const [occupation, setOccupation] = useState(initialData?.occupation || '');"
);
content = content.replace(
  /const \[maritalStatus, setMaritalStatus\] = useState\('Married'\);/,
  "const [maritalStatus, setMaritalStatus] = useState(initialData?.maritalStatus || 'Married');"
);
content = content.replace(
  /const \[nomineeName, setNomineeName\] = useState\(''\);/,
  "const [nomineeName, setNomineeName] = useState(initialData?.nomineeName || '');"
);
content = content.replace(
  /const \[nomineeRelation, setNomineeRelation\] = useState\('Husband'\);/,
  "const [nomineeRelation, setNomineeRelation] = useState(initialData?.nomineeRelation || 'Husband');"
);

content = content.replace(
  /const \[address, setAddress\] = useState\(''\);/,
  "const [address, setAddress] = useState(initialData?.address || '');"
);
content = content.replace(
  /const \[pincode, setPincode\] = useState\(Array\(6\)\.fill\(''\)\);/,
  "const [pincode, setPincode] = useState(initialData?.pincode ? initialData.pincode.split('').slice(0, 6) : Array(6).fill(''));"
);
content = content.replace(
  /const \[locationUrl, setLocationUrl\] = useState\(''\);/,
  "const [locationUrl, setLocationUrl] = useState(initialData?.locationUrl || '');"
);

content = content.replace(
  /const \[idsChecked, setIdsChecked\] = useState\(\{\s*aadhaar: false, pan: false, voter: false, smartCard: false\s*\}\);/,
  "const [idsChecked, setIdsChecked] = useState(initialData?.idsChecked || { aadhaar: false, pan: false, voter: false, smartCard: false });"
);

content = content.replace(
  /const \[kycDocs, setKycDocs\] = useState\(\{\}\);/,
  "const [kycDocs, setKycDocs] = useState(initialData?.kycDocs || {});"
);

fs.writeFileSync(file, content);
console.log('Update AddCustomerModal complete.');
