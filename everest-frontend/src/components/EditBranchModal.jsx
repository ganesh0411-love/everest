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

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!branchName.trim() || branchName.trim() === activeBranch.name) {
      onClose();
      return;
    }

    const newBranchName = branchName.trim();
    setIsSubmitting(true);
    
    try {
      const batch = writeBatch(db);

      // 1. Update the branch doc
      const branchRef = doc(db, 'branches', activeBranch.id);
      batch.update(branchRef, { name: newBranchName, updatedAt: new Date().toISOString() });

      // Helper function to query and queue batch updates
      const queueBatchUpdates = async (collectionName, fieldName) => {
        const q = query(collection(db, collectionName), where(fieldName, '==', activeBranch.name));
        const snap = await getDocs(q);
        snap.forEach(document => {
          batch.update(document.ref, { [fieldName]: newBranchName, updatedAt: new Date().toISOString() });
        });
      };

      // 2. Update references across collections
      await queueBatchUpdates('staff', 'branch');
      await queueBatchUpdates('customers', 'branch');
      await queueBatchUpdates('applications', 'branch');
      await queueBatchUpdates('loans', 'branch');
      await queueBatchUpdates('collections', 'branch');

      await batch.commit();

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
      const batch = writeBatch(db);

      // Helper function to query and queue batch deletes
      const queueBatchDeletes = async (collectionName, fieldName) => {
        const q = query(collection(db, collectionName), where(fieldName, '==', activeBranch.name));
        const snap = await getDocs(q);
        snap.forEach(document => {
          batch.delete(document.ref);
        });
      };

      // 1. Queue deletion of associated records
      await queueBatchDeletes('staff', 'branch');
      await queueBatchDeletes('customers', 'branch');
      await queueBatchDeletes('applications', 'branch');
      await queueBatchDeletes('loans', 'branch');
      await queueBatchDeletes('collections', 'branch');

      // 2. Delete the actual branch document
      const branchRef = doc(db, 'branches', activeBranch.id);
      batch.delete(branchRef);

      await batch.commit();

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
