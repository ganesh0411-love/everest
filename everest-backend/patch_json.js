const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/tn_master.json'));

const missingDistricts = [
  'Chengalpattu', 'Kallakurichi', 'Tenkasi', 'Tirupathur', 
  'Ranipet', 'Mayiladuthurai', 'Tiruppur'
];

for (const d of missingDistricts) {
  if (!data[d]) {
    data[d] = {
      'Headquarters': ['Sample Village 1', 'Sample Village 2']
    };
  }
}

// Patch Dindigul
if (data['Dindigul']) {
  data['Dindigul']['Athoor'] = ['Ayyampalayam', 'Sitharevu', 'Athoor Village 1', 'Athoor Village 2'];
  data['Dindigul']['Dindigul East'] = data['Dindigul']['Dindigul'] || ['East Village 1'];
  data['Dindigul']['Dindigul West'] = ['West Village 1'];
  data['Dindigul']['Gujiliyamparai'] = ['Gujiliyamparai Village'];
  delete data['Dindigul']['Dindigul']; // Replace with East/West
  
  // Combine Nilakkottai
  if (data['Dindigul']['Nilakottai']) {
      data['Dindigul']['Nilakkottai'] = [...new Set([...(data['Dindigul']['Nilakkottai'] || []), ...data['Dindigul']['Nilakottai']])].sort();
      delete data['Dindigul']['Nilakottai'];
  }
}

const finalMaster = {};
Object.keys(data).sort().forEach(dist => {
  finalMaster[dist] = {};
  Object.keys(data[dist]).sort().forEach(taluk => {
    finalMaster[dist][taluk] = data[dist][taluk].sort();
  });
});

fs.writeFileSync('data/tn_master.json', JSON.stringify(finalMaster, null, 2));
console.log('Patched to ' + Object.keys(finalMaster).length + ' districts');
