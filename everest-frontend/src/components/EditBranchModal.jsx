import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { Building2, X, Phone, MapPin, RotateCcw } from 'lucide-react';

const resolveInitialLocation = (b) => {
  if (!b) return null;
  if (b.location && typeof b.location.lat === 'number' && typeof b.location.lng === 'number') {
    return { lat: b.location.lat, lng: b.location.lng };
  }
  if (b.location && typeof b.location.latitude === 'number' && typeof b.location.longitude === 'number') {
    return { lat: b.location.latitude, lng: b.location.longitude };
  }
  if (typeof b.lat === 'number' && typeof b.lng === 'number') {
    return { lat: b.lat, lng: b.lng };
  }
  if (typeof b.latitude === 'number' && typeof b.longitude === 'number') {
    return { lat: b.latitude, lng: b.longitude };
  }
  return null;
};

const EditBranchModal = ({ isOpen, onClose, activeBranch, onBranchUpdated, onBranchDeleted }) => {
  const [branchName, setBranchName] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState(null); // { lat: number, lng: number }
  const [isPinningLocation, setIsPinningLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && activeBranch) {
      setBranchName(activeBranch.name || '');
      setOfficePhone(activeBranch.officePhone || activeBranch.phone || '');
      setAddress(activeBranch.address || '');
      setLocation(resolveInitialLocation(activeBranch));
      setIsPinningLocation(false);
    }
  }, [isOpen, activeBranch]);

  if (!isOpen || !activeBranch) return null;
  if (activeBranch.id === 'main' || (activeBranch.name && activeBranch.name.toLowerCase() === 'main branch')) return null;

  const handlePinLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser or device.");
      return;
    }
    setIsPinningLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setLocation({ lat, lng });
        setIsPinningLocation(false);
      },
      (error) => {
        console.warn("Error acquiring GPS position:", error);
        alert("Unable to acquire GPS coordinates. Please check your location permissions.");
        setIsPinningLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleClearLocation = () => {
    setLocation(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    const newBranchName = branchName.trim();
    const newPhone = officePhone.trim();
    const newAddress = address.trim();
    const newLocation = location ? { lat: Number(location.lat), lng: Number(location.lng) } : null;

    const oldName = (activeBranch.name || '').trim();
    const oldPhone = (activeBranch.officePhone || activeBranch.phone || '').trim();
    const oldAddress = (activeBranch.address || '').trim();
    const oldLoc = resolveInitialLocation(activeBranch);
    const locChanged = (
      (newLocation && !oldLoc) ||
      (!newLocation && oldLoc) ||
      (newLocation && oldLoc && (newLocation.lat !== oldLoc.lat || newLocation.lng !== oldLoc.lng))
    );

    // If nothing changed, dismiss cleanly
    if (newBranchName === oldName && newPhone === oldPhone && newAddress === oldAddress && !locChanged) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    
    try {
      const isNameChanged = newBranchName !== oldName;

      // Cascade branch rename across linked collections if name was modified
      if (isNameChanged) {
        const legacyAliases = [oldName, "Theni", "Periyakulam"].filter(Boolean);

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
      }

      // Update the branch document itself
      const branchRef = doc(db, 'branches', activeBranch.id);
      const branchBatch = writeBatch(db);
      const updatedFields = {
        name: newBranchName,
        phone: newPhone,
        officePhone: newPhone,
        address: newAddress,
        location: newLocation,
        latitude: newLocation ? newLocation.lat : null,
        longitude: newLocation ? newLocation.lng : null,
        updatedAt: new Date().toISOString()
      };

      branchBatch.update(branchRef, updatedFields);
      await branchBatch.commit();

      onBranchUpdated({
        ...activeBranch,
        ...updatedFields
      });
      onClose();
    } catch (error) {
      console.error("Error updating branch: ", error);
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

      const docsToDelete = [];
      const collectionsToDelete = ['staff', 'users', 'customers', 'applications', 'loans', 'collections'];
      
      for (const col of collectionsToDelete) {
        const q1 = query(collection(db, col), where('branch', '==', oldBranchName));
        const snap1 = await getDocs(q1);
        snap1.forEach(d => {
          if (!docsToDelete.some(item => item.ref.id === d.ref.id && item.col === col)) {
             docsToDelete.push({ ref: d.ref, col });
          }
        });

        const q2 = query(collection(db, col), where('branchName', '==', oldBranchName));
        const snap2 = await getDocs(q2);
        snap2.forEach(d => {
          if (!docsToDelete.some(item => item.ref.id === d.ref.id && item.col === col)) {
             docsToDelete.push({ ref: d.ref, col });
          }
        });
      }

      const branchRef = doc(db, 'branches', activeBranch.id);
      docsToDelete.push({ ref: branchRef, col: 'branches' });

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm sm:max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Edit Branch</h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Form Body */}
        <form onSubmit={handleUpdate} className="p-4 space-y-3">
          {/* Row 1: Branch Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Branch Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all"
              placeholder="e.g. Madurai, Trichy, Dindigul"
            />
          </div>

          {/* Row 2: Office Phone */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Office Phone
            </label>
            <div className="relative flex items-center">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="tel"
                value={officePhone}
                onChange={(e) => setOfficePhone(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all"
                placeholder="e.g. +91 98765 43210"
              />
            </div>
          </div>

          {/* Row 3: Full Address */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Office Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 resize-none transition-all leading-snug"
              placeholder="Full door no, street, locality, landmark & pincode"
            />
          </div>

          {/* Row 4: GPS Coordinates Pinning */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              GPS Location
            </label>
            {location ? (
              <div className="flex items-center justify-between p-2 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs">
                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold text-blue-900 truncate text-[11px] sm:text-xs">
                    Lat: {Number(location.lat).toFixed(5)}, Lng: {Number(location.lng).toFixed(5)}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handlePinLocation}
                    disabled={isPinningLocation}
                    title="Re-pin current location"
                    className="p-1 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isPinningLocation ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearLocation}
                    title="Remove coordinates"
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePinLocation}
                disabled={isPinningLocation}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-all cursor-pointer select-none active:scale-98"
              >
                <MapPin className={`w-3.5 h-3.5 text-blue-600 ${isPinningLocation ? 'animate-bounce' : ''}`} />
                <span>{isPinningLocation ? 'Acquiring GPS Signal...' : 'Pin Current Location'}</span>
              </button>
            )}
          </div>
          
          {/* Action Footer: Delete, Cancel, Save Changes */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 font-bold hover:bg-rose-100 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer shrink-0"
            >
              Delete Branch
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!branchName.trim() || isSubmitting}
              className="flex-[1.2] py-2 px-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xs sm:text-sm cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBranchModal;
