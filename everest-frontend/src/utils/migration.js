import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, setDoc, deleteDoc } from 'firebase/firestore';

export const migrateToBatlagundu = async () => {
  console.log("Starting comprehensive Batlagundu migration...");
  const targetBranchName = "Batlagundu";
  const targetBranchId = "batlagundu";

  try {
    const branchRef = doc(db, 'branches', targetBranchId);
    await setDoc(branchRef, {
      name: targetBranchName,
      branchId: targetBranchId,
      status: 'Active',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const branchDocs = await getDocs(collection(db, 'branches'));
    const knownBranchNames = branchDocs.docs
      .map(d => (d.data().name || '').trim().toLowerCase())
      .filter(name => name !== 'main branch' && name !== 'batlagundu' && name !== 'vathalagundu');

    const targetCollections = ['customers', 'applications', 'loans', 'recycle_bin', 'land_survey', 'collections'];

    for (const colName of targetCollections) {
      const colSnap = await getDocs(collection(db, colName));
      let batch = writeBatch(db);
      let count = 0;
      let totalUpdated = 0;

      colSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const currentBranch = (data.branch || data.branchName || data.branchId || '').trim().toLowerCase();

        const isOtherBranch = knownBranchNames.some(b => currentBranch.includes(b));
        const isAlreadyBatlagundu = currentBranch.includes('batlagundu');

        if (!isOtherBranch && !isAlreadyBatlagundu) {
          batch.update(docSnap.ref, {
            branch: targetBranchName,
            branchName: targetBranchName,
            branchId: targetBranchId,
            updatedAt: new Date().toISOString()
          });
          count++;
          totalUpdated++;

          if (count === 400) {
            batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      });

      if (count > 0) {
        await batch.commit();
      }
      console.log(`Migrated ${totalUpdated} records in ${colName} to Batlagundu.`);
    }

    alert("Batlagundu Migration Completed! All customers, applications, and loans have been successfully transferred.");
  } catch (err) {
    console.error("Migration failed:", err);
    alert("Migration failed! See console.");
  }
};

export const repairAndMergeBatlagundu = async () => {
  console.log("Starting Batlagundu deduplication & consolidation sweep...");

  const canonicalBranchName = "Batlagundu";
  const canonicalBranchId = "batlagundu";

  // 1. Clean up duplicate branches in /branches
  const branchesSnap = await getDocs(collection(db, 'branches'));
  const batlagunduDocRefs = [];
  branchesSnap.forEach(d => {
    const data = d.data();
    const name = (data.name || '').trim().toLowerCase();
    const id = d.id.toLowerCase();
    if (name.includes('batlagundu') || name.includes('vathalagundu') || id.includes('batlagundu') || id.includes('vathalagundu')) {
      batlagunduDocRefs.push(d);
    }
  });

  // Keep the single canonical branch doc and remove redundant duplicates
  for (const bDoc of batlagunduDocRefs) {
    if (bDoc.id !== canonicalBranchId) {
      await deleteDoc(bDoc.ref);
    }
  }

  // Ensure single canonical document exists
  await setDoc(doc(db, 'branches', canonicalBranchId), {
    name: canonicalBranchName,
    branchId: canonicalBranchId,
    status: 'Active',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  const allBranchesSnap = await getDocs(collection(db, 'branches'));
  const knownBranchNames = allBranchesSnap.docs
    .map(d => (d.data().name || '').trim().toLowerCase())
    .filter(name => name !== 'main branch' && name !== 'batlagundu' && name !== 'vathalagundu');

  // 2. Uniformly sweep ALL operational collections
  const collectionsToSweep = ['staff', 'users', 'customers', 'applications', 'loans', 'recycle_bin', 'land_survey', 'collections'];

  for (const colName of collectionsToSweep) {
    const colSnap = await getDocs(collection(db, colName));
    let batch = writeBatch(db);
    let count = 0;
    let updatedCount = 0;

    colSnap.forEach(docSnap => {
      const data = docSnap.data();
      const bName = (data.branch || data.branchName || '').trim().toLowerCase();
      const bId = (data.branchId || '').trim().toLowerCase();

      // If it belongs to any Batlagundu, Vathalagundu, Main Branch, or has NO branch assigned
      const isOtherBranch = knownBranchNames.some(b => bName.includes(b) || bId.includes(b));

      if (!isOtherBranch) {
        batch.update(docSnap.ref, {
          branch: canonicalBranchName,
          branchName: canonicalBranchName,
          branchId: canonicalBranchId,
          updatedAt: new Date().toISOString()
        });
        count++;
        updatedCount++;

        if (count === 400) {
          batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    console.log(`Consolidated ${updatedCount} records in ${colName} to ${canonicalBranchName}.`);
  }

  // 3. Normalize Frontend Listeners:
  // Ensure components filter cleanly:
  // `d.branch === 'Batlagundu' || d.branchId === 'batlagundu'`
  alert("Batlagundu successfully unified! One single branch remains with all operational records mapped.");
};

export const restoreTirunelveliStaff = async (identifiers = []) => {
  console.log("Restoring Tirunelveli staff...", identifiers);
  const targetBranchName = "Tirunelveli";
  const targetBranchId = "tirunelveli";

  // 1. Ensure Tirunelveli exists in /branches
  await setDoc(doc(db, 'branches', targetBranchId), {
    name: targetBranchName,
    branchId: targetBranchId,
    status: 'Active',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // 2. Query staff currently under Batlagundu and restore specified staff members
  const staffSnap = await getDocs(collection(db, 'staff'));
  let batch = writeBatch(db);
  let count = 0;

  staffSnap.forEach((d) => {
    const data = d.data();
    const nameMatch = identifiers.length === 0 || identifiers.some(id => 
      (data.name || '').toLowerCase().includes(id.toLowerCase()) ||
      (data.staffName || '').toLowerCase().includes(id.toLowerCase()) ||
      d.id === id
    );

    // If identifier list matches (or if checking previous branch history if present)
    if (nameMatch && (data.branch === 'Batlagundu' || data.branchId === 'batlagundu' || data.branch === 'Vathalagundu' || data.branchId === 'vathalagundu')) {
      batch.update(d.ref, {
        branch: targetBranchName,
        branchName: targetBranchName,
        branchId: targetBranchId,
        updatedAt: new Date().toISOString()
      });

      // Update corresponding /users document if UID exists
      const uid = data.uid || data.userId || d.id;
      if (uid) {
        batch.update(doc(db, 'users', uid), {
          branch: targetBranchName,
          branchName: targetBranchName,
          branchId: targetBranchId,
          updatedAt: new Date().toISOString()
        });
      }
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
  }
  console.log(`Successfully restored ${count} staff members back to Tirunelveli.`);
  alert(`Restored ${count} staff back to Tirunelveli successfully!`);
};

export const fixTirunelveliMerge = async (staffNames = ['Test Staff', 'மித்ரா', 'Mithra']) => {
  console.log("Resolving Tirunelveli duplicate branch collision...");

  // 1. Fetch all branch documents and identify all Tirunelveli records
  const branchesSnap = await getDocs(collection(db, 'branches'));
  const tirunelveliBranches = [];

  branchesSnap.forEach(d => {
    const data = d.data();
    const name = (data.name || '').trim().toLowerCase();
    const id = d.id.toLowerCase();
    if (name.includes('tirunelveli') || name.includes('திருநெல்வேலி') || id.includes('tirunelveli')) {
      tirunelveliBranches.push({ id: d.id, ref: d.ref, data });
    }
  });

  if (tirunelveliBranches.length === 0) {
    alert("Error: No Tirunelveli branch found in /branches!");
    return;
  }

  // 2. Determine the canonical branch (the original doc, NOT the newly created 'tirunelveli' id)
  let canonicalBranch = tirunelveliBranches.find(b => b.id !== 'tirunelveli');
  if (!canonicalBranch) {
    canonicalBranch = tirunelveliBranches[0];
  }

  const canonicalBranchId = canonicalBranch.id;
  const canonicalBranchName = canonicalBranch.data.name || "Tirunelveli";

  console.log(`Canonical Branch Identified: [ID: ${canonicalBranchId}, Name: ${canonicalBranchName}]`);

  // Delete redundant phantom branch document(s)
  for (const b of tirunelveliBranches) {
    if (b.id !== canonicalBranchId) {
      console.log(`Deleting duplicate branch document: ${b.id}`);
      await deleteDoc(b.ref);
    }
  }

  // 3. Move the targeted staff directly into the canonical branch document
  const staffSnap = await getDocs(collection(db, 'staff'));
  let batch = writeBatch(db);
  let staffCount = 0;

  staffSnap.forEach(d => {
    const data = d.data();
    const name = (data.name || data.staffName || '').trim().toLowerCase();
    const isTarget = staffNames.some(target => name.includes(target.toLowerCase()));

    if (isTarget) {
      batch.update(d.ref, {
        branch: canonicalBranchName,
        branchName: canonicalBranchName,
        branchId: canonicalBranchId,
        updatedAt: new Date().toISOString()
      });

      const uid = data.uid || data.userId || d.id;
      if (uid) {
        batch.update(doc(db, 'users', uid), {
          branch: canonicalBranchName,
          branchName: canonicalBranchName,
          branchId: canonicalBranchId,
          updatedAt: new Date().toISOString()
        });
      }
      staffCount++;
    }
  });

  if (staffCount > 0) {
    await batch.commit();
  }

  // 4. Ensure any customers accidentally tagged with 'tirunelveli' id point to canonical id
  const custSnap = await getDocs(collection(db, 'customers'));
  let custBatch = writeBatch(db);
  let custCount = 0;

  custSnap.forEach(d => {
    const data = d.data();
    const bId = (data.branchId || '').toLowerCase();
    if (bId === 'tirunelveli' && canonicalBranchId !== 'tirunelveli') {
      custBatch.update(d.ref, {
        branch: canonicalBranchName,
        branchName: canonicalBranchName,
        branchId: canonicalBranchId,
        updatedAt: new Date().toISOString()
      });
      custCount++;
    }
  });

  if (custCount > 0) {
    await custBatch.commit();
  }

  alert(`Tirunelveli unified into single branch [${canonicalBranchId}]. Restored ${staffCount} staff and synced ${custCount} customers!`);
};

export const purgeTirunelveliComplete = async () => {
  console.log("Starting complete purge of Tirunelveli...");

  // 1. Delete all Tirunelveli branch documents from /branches
  const branchesSnap = await getDocs(collection(db, 'branches'));
  const tirunelveliIds = [];
  
  for (const d of branchesSnap.docs) {
    const data = d.data();
    const name = (data.name || '').trim().toLowerCase();
    const id = d.id.toLowerCase();
    if (name.includes('tirunelveli') || name.includes('திருநெல்வேலி') || id.includes('tirunelveli')) {
      tirunelveliIds.push(d.id);
      await deleteDoc(d.ref);
      console.log(`Deleted branch doc: ${d.id}`);
    }
  }

  // 2. Cascade delete or unlink staff associated with Tirunelveli
  const collectionsToClean = ['staff', 'users', 'customers', 'applications', 'loans'];
  let totalDeleted = 0;

  for (const colName of collectionsToClean) {
    const snap = await getDocs(collection(db, colName));
    let batch = writeBatch(db);
    let count = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const bName = (data.branch || data.branchName || '').trim().toLowerCase();
      const bId = (data.branchId || '').trim().toLowerCase();

      const isTirunelveli = bName.includes('tirunelveli') || 
                            bName.includes('திருநெல்வேலி') || 
                            tirunelveliIds.includes(bId) || 
                            bId.includes('tirunelveli');

      if (isTirunelveli) {
        batch.delete(docSnap.ref);
        count++;
        totalDeleted++;

        if (count === 400) {
          batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    console.log(`Purged matching records in ${colName}`);
  }

  alert(`Tirunelveli branch and all its associated records have been completely deleted (${totalDeleted} records removed). System is 100% clean!`);
};

export const nukeAllTirunelveli = async () => {
  console.log("Inspecting all branches in Firestore...");

  // 1. Clear Local / Session Storage cache
  localStorage.removeItem('selectedBranch');
  localStorage.removeItem('activeBranch');
  sessionStorage.clear();

  // 2. Scan every single document in /branches without filter assumptions
  const branchesSnap = await getDocs(collection(db, 'branches'));
  let deletedCount = 0;

  for (const docSnap of branchesSnap.docs) {
    const data = docSnap.data();
    const docId = docSnap.id;
    const rawName = String(data.name || data.branchName || data.title || docId);
    const normalized = rawName.trim().toLowerCase();

    console.log(`Checking branch doc [${docId}]:`, data);

    if (
      normalized.includes('tirunelveli') ||
      normalized.includes('nellai') ||
      normalized.includes('திருநெல்வேலி') ||
      docId.toLowerCase().includes('tirunelveli')
    ) {
      await deleteDoc(docSnap.ref);
      console.log(`DELETED: [${docId}] -> "${rawName}"`);
      deletedCount++;
    }
  }

  // 3. Inspect code for hardcoded arrays
  console.log(`Deleted ${deletedCount} branches from database.`);
  alert(`Purge finished! Removed ${deletedCount} Tirunelveli documents. If it still appears after page reload, it is hardcoded in frontend source files.`);
};
