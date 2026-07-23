const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const replaceAll = (str, oldStr, newStr) => str.split(oldStr).join(newStr);

const oldFilter = `const filteredOptions = options.filter(opt => opt && String(opt).toLowerCase().includes(searchTerm.toLowerCase()));`;
const newFilter = `const filteredOptions = (options || []).filter(opt => opt && String(opt).toLowerCase().includes(String(searchTerm || '').toLowerCase()));`;

content = replaceAll(content, oldFilter, newFilter);

fs.writeFileSync(file, content);
console.log('Fixed options.filter crash in SearchableDropdown');
