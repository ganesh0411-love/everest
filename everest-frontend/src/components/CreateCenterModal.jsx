import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Camera, Image as ImageIcon, Trash2, User } from 'lucide-react';
import { addDoc, collection, doc, updateDoc, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function CreateCenterModal({ isOpen, onClose, userProfile, activeBranch, editCenter, onSuccess }) {
  const [formData, setFormData] = useState({
    leaderName: '',
    leaderId: '',
    centerName: '',
    groupName: '',
    villageName: '',
    branchName: '',
    branchId: '',
    staffName: '',
    staffId: '',
    location: '',
    totalMembers: '',
    city: '',
    district: ''
  });
  const [leaderPhoto, setLeaderPhoto] = useState(null);
  const [showPhotoActionSheet, setShowPhotoActionSheet] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const actionSheetRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (editCenter) {
        setFormData({
          leaderName: editCenter.leaderName || editCenter.leader || '',
          leaderId: editCenter.leaderCustomerId || editCenter.customerId || editCenter.leaderId || '',
          centerName: editCenter.centerName || '',
          groupName: editCenter.groupName || editCenter.group || '',
          villageName: editCenter.villageName || editCenter.village || '',
          branchName: editCenter.branchName || '',
          branchId: editCenter.branchId || '',
          staffName: editCenter.staffName || '',
          staffId: editCenter.staffId || '',
          location: editCenter.locationUrl || editCenter.gpsLocation || editCenter.location || '',
          totalMembers: editCenter.noOfCustomers || editCenter.totalMembers || editCenter.members || '',
          city: editCenter.city || '',
          district: editCenter.district || ''
        });
        if (editCenter.leaderPhoto) {
          setLeaderPhoto(editCenter.leaderPhoto);
        } else {
          setLeaderPhoto(null);
        }
      } else {
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
          staffName: userProfile?.role === 'staff' ? (userProfile?.name || userProfile?.staffName || '') : '',
          staffId: userProfile?.role === 'staff' ? (userProfile?.id || userProfile?.staffId || '') : '',
          location: '',
          totalMembers: '',
          city: '',
          district: ''
        });
        setLeaderPhoto(null);
      }
      setShowPhotoActionSheet(false);
    }
  }, [isOpen, editCenter, userProfile, activeBranch]);

  useEffect(() => {
    if (isOpen && userProfile?.role === 'admin') {
      const q = activeBranch?.id && activeBranch.id !== 'main' 
        ? query(collection(db, 'staff'), where('branchId', '==', activeBranch.id))
        : collection(db, 'staff');
      const unsub = onSnapshot(q, (snap) => {
        setStaffList(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
      return () => unsub();
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
      const centerData = {
        leaderName: formData.leaderName,
        leaderId: formData.leaderId,
        centerName: formData.centerName,
        groupName: formData.groupName,
        villageName: formData.villageName,
        branchName: formData.branchName,
        branchId: formData.branchId,
        staffName: formData.staffName,
        staffId: formData.staffId,
        location: formData.location,
        totalMembers: parseInt(formData.totalMembers) || 0,
        city: formData.city,
        district: formData.district,
        leaderPhoto,
        updatedAt: new Date().toISOString()
      };

      if (editCenter) {
        await updateDoc(doc(db, 'centers', editCenter.id), centerData);
        
        // Cascade staff update to all customers in this center
        try {
          const q = query(collection(db, 'customers'), where('centerName', '==', editCenter.centerName));
          const snapshot = await getDocs(q);
          const updatePromises = snapshot.docs.map(docSnap => 
            updateDoc(doc(db, 'customers', docSnap.id), {
              staffName: centerData.staffName,
              staffId: centerData.staffId
            })
          );
          await Promise.all(updatePromises);
        } catch (cascadeError) {
          console.error("Error cascading staff update to customers:", cascadeError);
        }

        alert('Center updated successfully!');
        if (onSuccess) onSuccess(centerData);
      } else {
        await addDoc(collection(db, 'centers'), {
          ...centerData,
          status: 'Active',
          createdAt: new Date().toISOString(),
          createdByStaffId: userProfile?.id || 'Admin',
        });
        alert('Center created successfully!');
      }
      
      setIsSubmitting(false);
      onClose();
    } catch (error) {
      console.error("Error saving center:", error);
      alert("Failed to save center: " + error.message);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col justify-between">
        
        {/* Header (Pinned) */}
        <div className="flex shrink-0 items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">{editCenter ? 'Edit Center' : 'Create New Center'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
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

            <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4">
              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold text-gray-700">Group Name</label>
                <input type="text" name="groupName" value={formData.groupName} onChange={handleChange} placeholder="e.g. Green Valley Group" className="w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 placeholder:font-normal" />
              </div>
              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold text-gray-700">Village / City <span className="text-rose-500">*</span></label>
                <input type="text" name="villageName" value={formData.villageName} onChange={handleChange} required placeholder="e.g. Muthur" className="w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 placeholder:font-normal" />
              </div>
              
              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold text-gray-700">District</label>
                <input type="text" name="district" value={formData.district} onChange={handleChange} placeholder="e.g. Dindigul" className="w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 placeholder:font-normal" />
              </div>

              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold text-gray-700">Number of Customers</label>
                <input type="number" name="totalMembers" value={formData.totalMembers} onChange={handleChange} placeholder="e.g. 10" className="w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 placeholder:font-normal" />
              </div>
              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold text-gray-700">Branch Name</label>
                <input type="text" name="branchName" value={formData.branchName} onChange={handleChange} placeholder="Branch" className={`w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border transition-all placeholder:text-gray-400 placeholder:font-normal ${userProfile?.role === 'staff' ? 'bg-gray-100 border-gray-300 outline-none' : 'bg-slate-50 border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`} readOnly={userProfile?.role === 'staff'} />
              </div>

              <div className="space-y-0.5 relative">
                <label className="text-[11px] font-semibold text-gray-700">Staff Assigned</label>
                {userProfile?.role === 'admin' ? (
                  <div className="h-8 flex items-center">
                    {formData.staffName ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{formData.staffName}</span>
                        <button type="button" onClick={() => setIsAssignStaffOpen(!isAssignStaffOpen)} className="text-[10px] text-blue-600 font-semibold hover:underline bg-blue-50 px-2 py-0.5 rounded">
                          Edit / Reassign
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setIsAssignStaffOpen(!isAssignStaffOpen)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                        <User size={14} /> Assign Staff
                      </button>
                    )}
                    
                    {isAssignStaffOpen && (
                      <div className="absolute bottom-full mb-1 left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto origin-bottom">
                        {staffList.length > 0 ? staffList.map(staff => (
                          <div 
                            key={staff.id} 
                            onClick={() => {
                              setFormData(prev => ({ ...prev, staffName: staff.name, staffId: staff.id }));
                              setIsAssignStaffOpen(false);
                            }}
                            className="px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 last:border-0"
                          >
                            {staff.name}
                          </div>
                        )) : (
                          <div className="px-3 py-2 text-xs text-gray-500 italic">No staff found in this branch</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <input type="text" name="staffName" value={formData.staffName} onChange={handleChange} placeholder="Staff" className="w-full px-2.5 py-1 text-xs font-semibold text-gray-900 h-8 rounded-lg border bg-gray-100 border-gray-300 outline-none transition-all placeholder:text-gray-400 placeholder:font-normal" readOnly />
                )}
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
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (editCenter ? 'Updating...' : 'Creating...') : (editCenter ? 'Update Center' : 'Create Center')}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}
