import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Camera, Image as ImageIcon, Trash2, User } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

export default function CreateCenterModal({ isOpen, onClose, userProfile, activeBranch }) {
  const [formData, setFormData] = useState({
    leaderName: '',
    leaderId: '',
    centerName: '',
    groupName: '',
    villageName: '',
    branchName: '',
    branchId: '',
    staffName: '',
    location: '',
    totalMembers: ''
  });
  const [leaderPhoto, setLeaderPhoto] = useState(null);
  const [showPhotoActionSheet, setShowPhotoActionSheet] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const actionSheetRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-generate ID
      const generatedId = `EMF${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Determine Branch
      let bName = '';
      let bId = '';
      if (userProfile?.role === 'staff') {
        bName = userProfile.branchName || userProfile.branch || '';
        bId = userProfile.branchId || '';
      } else {
        bName = activeBranch?.name || '';
        bId = activeBranch?.id || '';
      }

      setFormData({
        leaderName: '',
        leaderId: generatedId,
        centerName: '',
        groupName: '',
        villageName: '',
        branchName: bName === 'Main Branch' || bName === 'All Center' ? '' : bName,
        branchId: bId === 'main' || bId === 'all' ? '' : bId,
        staffName: userProfile?.name || userProfile?.staffName || '',
        location: '',
        totalMembers: ''
      });
      setLeaderPhoto(null);
      setShowPhotoActionSheet(false);
    }
  }, [isOpen, userProfile, activeBranch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionSheetRef.current && !actionSheetRef.current.contains(event.target)) {
        setShowPhotoActionSheet(false);
      }
    };
    if (showPhotoActionSheet) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPhotoActionSheet]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLeaderPhoto(reader.result);
        setShowPhotoActionSheet(false);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setLeaderPhoto(null);
    setShowPhotoActionSheet(false);
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          location: `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`
        }));
        setIsLocating(false);
      },
      (error) => {
        alert("Unable to retrieve your location: " + error.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.leaderName || !formData.centerName || !formData.villageName) {
      alert("Please fill in all required fields.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        leader: formData.leaderName,
        leaderId: formData.leaderId,
        leaderPhoto: leaderPhoto || null,
        centerName: formData.centerName,
        group: formData.groupName || 'N/A',
        village: formData.villageName,
        branchName: formData.branchName,
        branchId: formData.branchId,
        staffName: formData.staffName,
        createdByStaffId: userProfile?.id || '',
        location: formData.location,
        status: 'Active',
        totalMembers: parseInt(formData.totalMembers) || 0,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'centers'), payload);
      setIsSubmitting(false);
      onClose();
    } catch (error) {
      console.error("Error creating center:", error);
      alert("Failed to create center: " + error.message);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col justify-between">
        
        {/* Header (Pinned) */}
        <div className="flex shrink-0 items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Create New Center</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
          <div className="p-4 md:p-5 overflow-y-auto">
            
            {/* Top Row: Photo & 3 Fields */}
            <div className="flex gap-4 items-start">
              
              {/* Photo Upload Box */}
              <div className="shrink-0 flex flex-col items-center relative" ref={actionSheetRef}>
                <div 
                  onClick={() => setShowPhotoActionSheet(!showPhotoActionSheet)}
                  className="w-24 h-28 sm:w-28 sm:h-32 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
                >
                  {leaderPhoto ? (
                    <img src={leaderPhoto} alt="Leader" className="object-cover w-full h-full" />
                  ) : (
                    <>
                      <User size={24} className="text-gray-400 mb-1" />
                      <span className="text-[10px] font-medium text-gray-500">Add Photo</span>
                    </>
                  )}
                </div>
                
                {/* Action Sheet */}
                {showPhotoActionSheet && (
                  <div className="absolute z-10 top-[105%] left-0 w-44 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden py-1">
                    {!leaderPhoto ? (
                      <>
                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Camera size={14} className="text-gray-500" /> Take Photo
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                          <ImageIcon size={14} className="text-gray-500" /> Choose from Gallery
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Camera size={14} className="text-gray-500" /> Change Photo
                        </button>
                        <button type="button" onClick={handleRemovePhoto} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-red-50 text-red-600 flex items-center gap-2 border-b border-gray-100">
                          <Trash2 size={14} /> Remove Photo
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => setShowPhotoActionSheet(false)} className="w-full text-center px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 font-medium">
                      Cancel
                    </button>
                  </div>
                )}
                
                {/* Hidden File Inputs */}
                <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handlePhotoUpload} />
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoUpload} />
              </div>

              {/* Stacked Fields matching photo height */}
              <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 justify-between">
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-gray-700">Leader Name <span className="text-rose-500">*</span></label>
                  <input type="text" name="leaderName" value={formData.leaderName} onChange={handleChange} required placeholder="e.g. Selvi R" className="w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 placeholder:font-normal" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-gray-700">Leader Customer ID</label>
                  <input type="text" name="leaderId" value={formData.leaderId} onChange={handleChange} placeholder="e.g. EMF123456" className="w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border border-gray-300 bg-gray-100 focus:outline-none transition-all font-mono placeholder:text-gray-400 placeholder:font-normal" readOnly />
                </div>
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-gray-700">Center Name <span className="text-rose-500">*</span></label>
                  <input type="text" name="centerName" value={formData.centerName} onChange={handleChange} required placeholder="e.g. Center North" className="w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 placeholder:font-normal" />
                </div>
              </div>
            </div>

            {/* Lower Section 2-Column Grid */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4">
              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold text-gray-700">Group Name</label>
                <input type="text" name="groupName" value={formData.groupName} onChange={handleChange} placeholder="e.g. Green Valley Group" className="w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 placeholder:font-normal" />
              </div>
              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold text-gray-700">Village Name <span className="text-rose-500">*</span></label>
                <input type="text" name="villageName" value={formData.villageName} onChange={handleChange} required placeholder="e.g. Muthur" className="w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 placeholder:font-normal" />
              </div>
              
              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold text-gray-700">Number of Customers</label>
                <input type="number" name="totalMembers" value={formData.totalMembers} onChange={handleChange} placeholder="e.g. 10" className="w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 placeholder:font-normal" />
              </div>
              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold text-gray-700">Branch Name</label>
                <input type="text" name="branchName" value={formData.branchName} onChange={handleChange} placeholder="Branch" className={`w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border transition-all placeholder:text-gray-400 placeholder:font-normal ${userProfile?.role === 'staff' ? 'bg-gray-100 border-gray-300 outline-none' : 'bg-slate-50 border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`} readOnly={userProfile?.role === 'staff'} />
              </div>

              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold text-gray-700">Staff Name</label>
                <input type="text" name="staffName" value={formData.staffName} onChange={handleChange} placeholder="Staff" className={`w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border transition-all placeholder:text-gray-400 placeholder:font-normal ${userProfile?.role === 'staff' ? 'bg-gray-100 border-gray-300 outline-none' : 'bg-slate-50 border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`} readOnly={userProfile?.role === 'staff'} />
              </div>
              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold text-gray-700">GPS Location</label>
                <div className="flex gap-1.5 h-8">
                  <input type="text" name="location" value={formData.location} readOnly placeholder="Google Maps URL" className="flex-1 px-2.5 py-1 text-[10px] font-semibold text-gray-900 rounded-lg border border-gray-300 bg-gray-100 focus:outline-none font-mono placeholder:text-gray-400 placeholder:font-normal min-w-0" />
                  <button type="button" onClick={handleGetLocation} disabled={isLocating} className="bg-slate-800 hover:bg-slate-900 text-white px-2 py-1 text-[10px] sm:text-xs rounded-lg font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap disabled:opacity-70 shrink-0">
                    <MapPin size={12} />
                    {isLocating ? 'Locating...' : 'Get Location'}
                  </button>
                </div>
              </div>
            </div>
            
          </div>

          {/* Footer (Pinned) */}
          <div className="shrink-0 flex justify-end gap-3 px-5 py-3 border-t border-slate-100 bg-white">
            <button type="button" onClick={onClose} className="px-5 py-1.5 text-sm h-9 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 text-sm h-9 rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-70">
              {isSubmitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
