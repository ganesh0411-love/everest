import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';

const EditBranchModal = ({ isOpen, onClose, activeBranch, onBranchUpdated, onBranchDeleted }) => {
  const [branchName, setBranchName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && activeBranch) {
      setBranchName(activeBranch.name || '');
    }
  }, [isOpen, activeBranch]);

  if (!isOpen || !activeBranch) return null;
  if (activeBranch.id === 'main' || activeBranch.name.toLowerCase() === 'main branch') return null;


  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!branchName.trim() || branchName.trim() === activeBranch.name) {
      onClose();
      return;
    }

    const newBranchName = branchName.trim();
    setIsSubmitting(true);
    
    try {
      const oldBranchName = activeBranch.name.trim();
      const legacyAliases = [oldBranchName, "Theni", "Periyakulam"].filter(Boolean);

      const updateCollectionRecords = async (collectionName, oldNames, newName) => {
        const docsToUpdate = new Map();

        for (const name of oldNames) {
          if (!name) continue;
          const q1 = query(collection(db, collectionName), where('branch', '==', name));
          const s1 = await getDocs(q1);
          s1.forEach(d => docsToUpdate.set(d.id, d.ref));

          const q2 = query(collection(db, collectionName), where('branchName', '==', name));
          const s2 = await getDocs(q2);
          s2.forEach(d => docsToUpdate.set(d.id, d.ref));
        }

        let batch = writeBatch(db);
        let count = 0;

        for (const [id, ref] of docsToUpdate) {
          batch.update(ref, {
            branch: newName,
            branchName: newName,
            updatedAt: new Date().toISOString()
          });
          count++;
          if (count === 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      };

      const collectionsToUpdate = ['staff', 'users', 'customers', 'applications', 'loans', 'collections'];
      for (const col of collectionsToUpdate) {
        await updateCollectionRecords(col, legacyAliases, newBranchName);
      }

      // Update the branch document itself
      const branchRef = doc(db, 'branches', activeBranch.id);
      const branchBatch = writeBatch(db);
      branchBatch.update(branchRef, { name: newBranchName, updatedAt: new Date().toISOString() });
      await branchBatch.commit();

      onBranchUpdated({ ...activeBranch, name: newBranchName });
      onClose();
    } catch (error) {
      console.error("Error updating branch and cascading changes: ", error);
      alert("Failed to update branch. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm(`Are you sure you want to delete branch '${activeBranch.name}'? All associated trial staff, applications, and loan records will be permanently removed.`);
    if (!confirmDelete) return;

    setIsSubmitting(true);
    try {
      const oldBranchName = activeBranch.name.trim();

      // Collect all document references to delete
      const docsToDelete = [];
      const collectionsToDelete = ['staff', 'users', 'customers', 'applications', 'loans', 'collections'];
      
      for (const col of collectionsToDelete) {
        // Query by branch
        const q1 = query(collection(db, col), where('branch', '==', oldBranchName));
        const snap1 = await getDocs(q1);
        snap1.forEach(d => {
          if (!docsToDelete.some(item => item.ref.id === d.ref.id && item.col === col)) {
             docsToDelete.push({ ref: d.ref, col });
          }
        });

        // Query by branchName
        const q2 = query(collection(db, col), where('branchName', '==', oldBranchName));
        const snap2 = await getDocs(q2);
        snap2.forEach(d => {
          if (!docsToDelete.some(item => item.ref.id === d.ref.id && item.col === col)) {
             docsToDelete.push({ ref: d.ref, col });
          }
        });
      }

      // Add the branch document itself
      const branchRef = doc(db, 'branches', activeBranch.id);
      docsToDelete.push({ ref: branchRef, col: 'branches' });

      // Chunk execution (Firestore limit is 500)
      const chunkSize = 450;
      for (let i = 0; i < docsToDelete.length; i += chunkSize) {
        const chunk = docsToDelete.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach(item => {
          batch.delete(item.ref);
        });
        await batch.commit();
      }

      onBranchDeleted(activeBranch.id);
      onClose();
    } catch (error) {
      console.error("Error deleting branch and cascading deletes: ", error);
      alert("Failed to delete branch. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-black text-slate-800">Edit Branch</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleUpdate} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Branch Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all font-medium text-slate-800 placeholder:text-slate-400"
              placeholder="e.g. Madurai, Trichy"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex-1 px-3 py-2.5 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-colors text-sm"
            >
              Delete
            </button>
            <button
              type="submit"
              disabled={!branchName.trim() || isSubmitting}
              className="flex-[1.2] px-3 py-2.5 rounded-xl bg-brand-blue text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBranchModal;
