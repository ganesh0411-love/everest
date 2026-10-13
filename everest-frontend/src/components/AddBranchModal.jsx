import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Building2, X, Phone, MapPin, RotateCcw } from 'lucide-react';

const AddBranchModal = ({ isOpen, onClose, onBranchAdded }) => {
  const [branchName, setBranchName] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState(null); // { lat: number, lng: number }
  const [isPinningLocation, setIsPinningLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setBranchName('');
    setOfficePhone('');
    setAddress('');
    setLocation(null);
    setIsPinningLocation(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    setIsSubmitting(true);
    try {
      const newPhone = officePhone.trim();
      const newAddress = address.trim();
      const newLocation = location ? { lat: Number(location.lat), lng: Number(location.lng) } : null;

      const branchPayload = {
        name: branchName.trim(),
        phone: newPhone,
        officePhone: newPhone,
        address: newAddress,
        location: newLocation,
        latitude: newLocation ? newLocation.lat : null,
        longitude: newLocation ? newLocation.lng : null,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'branches'), branchPayload);
      
      const newBranch = { id: docRef.id, ...branchPayload };
      onBranchAdded(newBranch);
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error adding branch: ", error);
      alert("Failed to add branch. Please try again.");
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
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Add New Branch</h2>
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
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all"
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
                className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 resize-none transition-all leading-snug"
              placeholder="Full door no, street, locality, landmark & pincode"
            />
          </div>

          {/* Row 4: GPS Coordinates Pinning */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              GPS Location
            </label>
            {location ? (
              <div className="flex items-center justify-between p-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs">
                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-emerald-900 truncate text-[11px] sm:text-xs">
                    Lat: {Number(location.lat).toFixed(5)}, Lng: {Number(location.lng).toFixed(5)}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handlePinLocation}
                    disabled={isPinningLocation}
                    title="Re-pin current location"
                    className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
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
                <MapPin className={`w-3.5 h-3.5 text-emerald-600 ${isPinningLocation ? 'animate-bounce' : ''}`} />
                <span>{isPinningLocation ? 'Acquiring GPS Signal...' : 'Pin Current Location'}</span>
              </button>
            )}
          </div>
          
          {/* Action Footer */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-xs sm:text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!branchName.trim() || isSubmitting}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xs sm:text-sm cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Create Branch'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBranchModal;
