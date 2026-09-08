import React, { useState, useEffect, useRef } from 'react';
import { compressImage, uploadImageToStorage } from '../utils/storageUpload';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ChevronLeft, Trash2, Camera, User, Hash, Calendar, 
  Briefcase, Lock, Eye, EyeOff, Phone, MapPin, Shield, Check, X, Image as ImageIcon, AlertTriangle
} from 'lucide-react';

const AddStaffForm = ({ onBack, onSubmit, editingStaff = null, onDelete, staffCount = 0 }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  
  // Refs for hidden file inputs
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  
  // Initialize form state
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    id: '',
    joiningDate: new Date().toISOString().split('T')[0],
    designation: 'Collection Agent',
    username: '',
    password: '',
    mobileNumber: '',
    address: '',
    permission: '',
    avatarColor: 'bg-blue-100', // Default
    photoFile: null,
    photoPreview: null,
    photoBase64: null
  });

  // Setup initial state and history listener for hardware back button
  useEffect(() => {
    // Intercept hardware/browser back button
    const handlePopState = (e) => {
      e.preventDefault();
      onBack();
    };
    
    // Push a dummy state so the back button can be intercepted
    window.history.pushState({ formOpen: true }, '');
    window.addEventListener('popstate', handlePopState);

    // Populate data
    if (editingStaff) {
      setFormData({
        ...formData,
        name: editingStaff.name || '',
        dob: editingStaff.dob || '',
        id: editingStaff.id || '',
        designation: editingStaff.designation || 'Collection Agent',
        avatarColor: editingStaff.avatarColor || 'bg-blue-100',
        joiningDate: editingStaff.joiningDate || new Date().toISOString().split('T')[0],
        username: editingStaff.username || '',
        password: editingStaff.password || '',
        mobileNumber: editingStaff.mobileNumber || '',
        address: editingStaff.address || '',
        permission: editingStaff.permission || '',
        photoPreview: editingStaff.photoBase64 || null,
        photoBase64: editingStaff.photoBase64 || null
      });
    } else {
      // Auto-generate a global 7-digit numeric unique Staff ID
      const generateUniqueId = async () => {
        let isUnique = false;
        let newId = '';
        while (!isUnique) {
          // Generate a random 7-digit number between 1000000 and 9999999
          newId = Math.floor(1000000 + Math.random() * 9000000).toString();
          try {
            const q = query(collection(db, 'staff'), where('id', '==', newId));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
              isUnique = true;
            }
          } catch (e) {
            console.error("Error generating unique ID:", e);
            // Fallback just in case
            isUnique = true; 
          }
        }
        return newId;
      };

      generateUniqueId().then(generatedId => {
        setFormData(prev => ({ ...prev, id: generatedId }));
      });
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingStaff, staffCount]);

  useEffect(() => {
    const checkPhone = async () => {
      if (formData.mobileNumber && formData.mobileNumber.length === 10) {
        if (editingStaff && (editingStaff.mobileNumber === formData.mobileNumber || editingStaff.phone === formData.mobileNumber)) {
          setPhoneError('');
          return;
        }
        try {
          const q = query(collection(db, 'staff'), where('phone', '==', formData.mobileNumber));
          const snap = await getDocs(q);
          
          let duplicateActive = false;
          snap.forEach(doc => {
            const data = doc.data();
            if (data.status !== 'Deleted' && data.status !== 'Recycled') {
              duplicateActive = true;
            }
          });

          if (duplicateActive) {
            setPhoneError('This mobile number already exists.');
          } else {
            setPhoneError('');
          }
        } catch (err) {
          console.error("Phone validation error", err);
        }
      } else {
        setPhoneError('');
      }
    };
    
    const timeoutId = setTimeout(checkPhone, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.mobileNumber, editingStaff]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({
      ...prev,
      mobileNumber: val,
      username: val // Auto-fills Username with Mobile Number
    }));
  };

  const handleDobChange = (e) => {
    const rawDob = e.target.value; // e.g. "1997-12-22"
    let formattedPassword = '';
    
    if (rawDob) {
      // Strip hyphens, slashes, or dots and rearrange YYYY-MM-DD to DDMMYYYY if necessary
      const parts = rawDob.split(/[-/.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // Format: YYYY-MM-DD -> DDMMYYYY
          formattedPassword = `${parts[2]}${parts[1]}${parts[0]}`;
        } else {
          // Format: DD-MM-YYYY -> DDMMYYYY
          formattedPassword = `${parts[0]}${parts[1]}${parts[2]}`;
        }
      } else {
        formattedPassword = rawDob.replace(/\D/g, '');
      }
    }

    setFormData((prev) => ({
      ...prev,
      dob: rawDob,
      password: formattedPassword // Auto-fills Password with continuous digits
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setShowPhotoSheet(false);
    setIsUploadingPhoto(true);

    try {
      // Compress the image
      const compressedBlob = await compressImage(file, 800, 0.7);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ 
          ...prev, 
          photoFile: compressedBlob, 
          photoPreview: reader.result,
          photoBase64: reader.result
        }));
        setIsUploadingPhoto(false);
      };
      reader.readAsDataURL(compressedBlob);
    } catch (error) {
      console.error('Error compressing image:', error);
      setIsUploadingPhoto(false);
      alert('Failed to process image. Please try another.');
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ 
      ...prev, 
      photoFile: null, 
      photoPreview: null,
      photoBase64: null 
    }));
    setShowPhotoSheet(false);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      let finalPhotoUrl = formData.photoBase64;
      
      // Upload to Storage if there is a new photo file
      if (formData.photoFile) {
        finalPhotoUrl = await uploadImageToStorage(formData.photoFile, 'staff_profiles', formData.id);
      }

      // Submit even if partial, as requested
      const newStaff = {
        ...(editingStaff || {}),
        ...formData,
        role: 'staff',
        phone: formData.mobileNumber,
        status: 'Active', // Default status for new staff
        photoFile: undefined,
        photoBase64: finalPhotoUrl, // URL instead of Base64
        photoPreview: null // Don't persist DataURL to Firestore
      };
      
      // Go back in history stack safely to maintain integrity before unmounting
      window.history.back();
      onSubmit(newStaff);
    } catch (error) {
      console.error("Staff Save Error:", error);
      alert("Failed to upload photo and save staff. Please try again.");
      setIsSaving(false);
    }
  };

  const handleSafeBack = () => {
    window.history.back();
    onBack();
  };

  const handleConfirmDelete = () => {
    if (onDelete && editingStaff) {
      window.history.back();
      onDelete(editingStaff.id);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden z-[100]">
      
      {/* STATIC TOP SECTION: Header */}
      <div className="shrink-0 flex flex-col z-20">
        {/* Curved Gradient Header */}
        <div className="bg-gradient-to-br from-purple-500 to-blue-500 pb-6 md:pb-12 pt-6 px-4 relative z-0">
          <div className="flex items-center justify-between mb-2 md:mb-4 mt-2">
            <button 
              onClick={handleSafeBack}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-purple-600 shadow-sm shrink-0"
            >
              <ChevronLeft size={24} strokeWidth={2.5} className="-ml-0.5" />
            </button>
            <div className="text-center flex-1 px-2 pr-10">
              <h1 className="text-xl font-bold text-white tracking-wide">{editingStaff ? 'Edit Staff' : 'Add Staff'}</h1>
              <p className="text-white/80 text-xs mt-1">{editingStaff ? 'Update staff details' : 'Create a new staff account'}</p>
            </div>
            {/* Delete button removed from header as per request */}
          </div>
        </div>
      </div>

      {/* SCROLLABLE FORM AREA */}
      <div className="flex-1 bg-white rounded-t-[1.5rem] md:rounded-t-[2.5rem] -mt-4 md:-mt-8 z-10 flex flex-col shadow-[0_-4px_10px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 pt-5 md:pt-8 pb-28 space-y-5">
          
          {/* Profile Photo */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Profile Photo</label>
            <div 
              onClick={() => !isUploadingPhoto && setShowPhotoSheet(true)}
              className={`border-2 border-dashed border-purple-200 rounded-2xl bg-purple-50/50 flex flex-col items-center justify-center ${isUploadingPhoto ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-purple-50'} transition-colors w-full max-w-[200px] mx-auto overflow-hidden relative aspect-square`}
            >
              {isUploadingPhoto ? (
                <div className="flex flex-col items-center justify-center p-6 space-y-3">
                  <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  <span className="text-purple-600 font-bold text-sm">Processing...</span>
                </div>
              ) : formData.photoPreview ? (
                <img src={formData.photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center p-6">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-purple-600 mb-3">
                    <Camera size={20} />
                  </div>
                  <span className="text-purple-700 font-bold text-sm">Tap to Upload</span>
                  <span className="text-slate-400 text-xs mt-1">JPG, PNG up to 5MB</span>
                </div>
              )}
            </div>
          </div>

          {/* Hidden inputs for photo actions */}
          <input 
            type="file" 
            accept="image/png, image/jpeg" 
            className="hidden" 
            ref={galleryInputRef} 
            onChange={handlePhotoUpload} 
          />
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={cameraInputRef} 
            onChange={handlePhotoUpload} 
          />

          {/* Name & DOB (2-Column Layout) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter staff name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">DOB</label>
              <div className="relative">
                <input 
                  type="date" 
                  name="dob"
                  value={formData.dob}
                  onChange={handleDobChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow text-slate-700 appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Mobile Number (Strict 10-digit validation) */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">Mobile Number</label>
            <div className="relative">
              <Phone className={`absolute left-3.5 top-1/2 transform -translate-y-1/2 ${phoneError ? 'text-red-400' : 'text-slate-400'}`} size={18} />
              <input 
                type="tel" 
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handlePhoneChange}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="Enter mobile number"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${phoneError ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-purple-400'} bg-white text-sm focus:outline-none focus:ring-2 transition-shadow`}
              />
            </div>
            {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
          </div>

          {/* Staff ID */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              Staff ID 
              <span className="text-slate-400 border border-slate-300 rounded-full w-4 h-4 flex items-center justify-center text-[10px] italic">i</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                name="id"
                value={formData.id}
                onChange={handleInputChange}
                placeholder="Enter staff ID"
                className="w-full pl-10 pr-16 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow font-medium text-slate-700"
              />
              <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-600 text-xs font-bold flex items-center gap-1">
                <span>✏️</span> Edit
              </button>
            </div>
          </div>

          {/* Joining Date */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">Joining Date</label>
            <div className="relative">
              <input 
                type="date" 
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow text-slate-700 appearance-none"
              />
            </div>
          </div>

          {/* Designation */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">Designation</label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                name="designation"
                value={formData.designation}
                onChange={handleInputChange}
                placeholder="Enter designation"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow"
              />
            </div>
          </div>

          {/* Username & Password Block */}
          <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4">
            <h3 className="text-purple-700 font-bold text-sm flex items-center gap-2 mb-4">
              <Lock size={16} />
              Set Username & Password
            </h3>
            
            <div className="space-y-4">
              {/* Username (Disabled autofill) */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder=""
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow"
                  />
                </div>
              </div>

              {/* Password (Disabled autofill) */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder=""
                    autoComplete="new-password"
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>



          {/* Address */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter full address"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow"
              />
            </div>
          </div>

          {/* Permission */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">Permission</label>
            <div className="relative">
              <Shield className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                name="permission"
                value={formData.permission}
                onChange={handleInputChange}
                placeholder="Select permission"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow cursor-pointer"
                readOnly
              />
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold">&gt;</span>
            </div>
          </div>

          {/* RELOCATED: Delete Staff Button (Visible only in Edit Mode) */}
          {editingStaff && (
            <div className="pt-4">
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-4 rounded-xl border border-rose-200 bg-rose-50 flex items-center justify-center gap-2 text-rose-600 font-bold hover:bg-rose-100 transition-colors"
              >
                <Trash2 size={18} strokeWidth={2.5} />
                <span>Delete Staff Account</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ACTION BUTTONS (Static Bottom Flow instead of absolute overlay) */}
      <div className="shrink-0 w-full bg-white border-t border-slate-100 p-4 pb-safe z-50 flex gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <button 
          onClick={handleSafeBack}
          disabled={isSaving}
          className="flex-1 py-3.5 rounded-xl border-2 border-rose-100 text-rose-500 font-bold flex items-center justify-center gap-2 bg-rose-50/30 hover:bg-rose-50 transition-colors disabled:opacity-50"
        >
          <X size={18} strokeWidth={2.5} />
          <span>Cancel</span>
        </button>
        <button 
          onClick={handleSubmit}
          disabled={isSaving || phoneError}
          className={`flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-shadow disabled:opacity-50 ${isSaving || phoneError ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-purple-500/30'}`}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving details...</span>
            </>
          ) : (
            <>
              <Check size={18} strokeWidth={2.5} />
              <span>Submit</span>
            </>
          )}
        </button>
      </div>

      {/* PHOTO ACTION BOTTOMSHEET */}
      {showPhotoSheet && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
          {/* Invisible overlay for clicking out */}
          <div className="absolute inset-0" onClick={() => setShowPhotoSheet(false)} />
          
          <div className="bg-white rounded-t-3xl p-6 relative z-10 shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Profile Photo</h3>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center gap-3 w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-slate-700 font-semibold"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <ImageIcon size={20} />
                </div>
                Choose from Gallery
              </button>
              
              <button 
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-3 w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-slate-700 font-semibold"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Camera size={20} />
                </div>
                Take a Photo
              </button>
              
              {formData.photoPreview && (
                <button 
                  onClick={handleRemovePhoto}
                  className="flex items-center gap-3 w-full p-4 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors text-rose-600 font-semibold"
                >
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                    <Trash2 size={20} />
                  </div>
                  Remove Photo
                </button>
              )}
            </div>

            <button 
              onClick={() => setShowPhotoSheet(false)}
              className="mt-4 w-full py-3.5 rounded-xl bg-white border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* DOUBLE CONFIRMATION MODAL FOR DELETE */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Account?</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete this staff account? This action cannot be undone.
            </p>
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="flex-1 py-3.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/30"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddStaffForm;
