import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBCxMXDAv5rqIogTaLHFnbTPTqQeI0d1Ag",
  authDomain: "everest-finance-demo.firebaseapp.com",
  projectId: "everest-finance-demo",
  storageBucket: "everest-finance-demo.firebasestorage.app",
  messagingSenderId: "554236541872",
  appId: "1:554236541872:web:1068c45b0501fc87863475"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateData() {
  console.log("Starting Migration to Vathalagundu...");
  const newBranchName = "Vathalagundu";
  const newBranchId = "vathalagundu";

  // 1. Ensure Vathalagundu branch exists in /branches
  const branchRef = doc(db, 'branches', newBranchId);
  await setDoc(branchRef, {
    name: newBranchName,
    branchId: newBranchId,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log("Vathalagundu branch created/verified.");

  const collectionsToUpdate = [
    'staff', 'users', 'customers', 'applications', 
    'loans', 'collections', 'recycle_bin', 'land_survey'
  ];

  for (const col of collectionsToUpdate) {
    console.log(`Querying ${col} for 'Main Branch' records...`);
    const docsToUpdate = new Map();

    const q1 = query(collection(db, col), where('branch', '==', 'Main Branch'));
    const s1 = await getDocs(q1);
    s1.forEach(d => {
      if (d.data().role !== 'admin') {
        docsToUpdate.set(d.id, d.ref);
      }
    });

    const q2 = query(collection(db, col), where('branchId', '==', 'main'));
    const s2 = await getDocs(q2);
    s2.forEach(d => {
      if (d.data().role !== 'admin') {
        docsToUpdate.set(d.id, d.ref);
      }
    });

    const q3 = query(collection(db, col), where('branch', '==', 'main'));
    const s3 = await getDocs(q3);
    s3.forEach(d => {
      if (d.data().role !== 'admin') {
        docsToUpdate.set(d.id, d.ref);
      }
    });

    console.log(`Found ${docsToUpdate.size} records in ${col} to migrate.`);

    let batch = writeBatch(db);
    let count = 0;
    for (const [id, ref] of docsToUpdate) {
      batch.update(ref, {
        branch: newBranchName,
        branchName: newBranchName,
        branchId: newBranchId,
        updatedAt: new Date().toISOString()
      });
      count++;
      if (count === 400) {
        await batch.commit();
        console.log(`Committed 400 records in ${col}...`);
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
      console.log(`Committed remaining ${count} records in ${col}.`);
    }
  }
  
  console.log("Migration Complete!");
  process.exit(0);
}

migrateData().catch(console.error);
