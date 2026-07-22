const fs = require('fs');
let c = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
if (!c.includes('android:usesCleartextTraffic="true"')) {
    c = c.replace('<application', '<application\n        android:usesCleartextTraffic="true"');
    fs.writeFileSync('android/app/src/main/AndroidManifest.xml', c);
    console.log('Fixed AndroidManifest.xml cleartext');
} else {
    console.log('Cleartext already enabled');
}
