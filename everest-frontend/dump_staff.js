import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit } from 'firebase/firestore';

// Get config from everest-frontend
import fs from 'fs';
const appCode = fs.readFileSync('C:/Users/DELL/Desktop/Everest/everest-frontend/src/firebase.js', 'utf8');

// The file has firebaseConfig. We can parse it out.
const configMatch = appCode.match(/const firebaseConfig = ({[\s\S]*?});/);
if (configMatch) {
  const configStr = configMatch[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/'/g, '"');
  // It might fail parsing if there are unquoted keys or trailing commas, let's just evaluate it
  const firebaseConfig = eval('(' + configMatch[1] + ')');
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  async function test() {
    const snap = await getDocs(collection(db, 'staff'));
    snap.docs.slice(0, 3).forEach(doc => {
      console.log('--- STAFF DOC:', doc.id, '---');
      console.log(JSON.stringify(doc.data(), null, 2));
    });
    process.exit(0);
  }
  
  test().catch(console.error);
} else {
  console.log('Could not find firebaseConfig');
}
