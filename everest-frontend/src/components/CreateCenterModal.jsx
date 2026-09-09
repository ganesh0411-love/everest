import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
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
    location: ''
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        branchName: bName === 'Main Branch' || bName === 'All Branches / All Centers' ? '' : bName,
        branchId: bId === 'main' || bId === 'all' ? '' : bId,
        staffName: userProfile?.name || userProfile?.staffName || '',
        location: ''
      });
    }
  }, [isOpen, userProfile, activeBranch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
          location: `${position.coords.latitude}, ${position.coords.longitude}`
        }));
        setIsLocating(false);
      },
      (error) => {
        alert("Unable to retrieve your location: " + error.message);
        setIsLocating(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.leaderName || !formData.centerName || !formData.villageName || !formData.groupName) {
      alert("Please fill in all required fields.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        leader: formData.leaderName,
        leaderId: formData.leaderId,
        centerName: formData.centerName,
        group: formData.groupName,
        village: formData.villageName,
        branchName: formData.branchName,
        branchId: formData.branchId,
        staffName: formData.staffName,
        location: formData.location,
        status: 'Active',
        members: 0,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Create New Center</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Leader Name <span className="text-rose-500">*</span></label>
              <input type="text" name="leaderName" value={formData.leaderName} onChange={handleChange} required placeholder="e.g. Selvi R" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Leader Customer ID</label>
              <input type="text" name="leaderId" value={formData.leaderId} onChange={handleChange} placeholder="e.g. EMF123456" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Center Name <span className="text-rose-500">*</span></label>
              <input type="text" name="centerName" value={formData.centerName} onChange={handleChange} required placeholder="e.g. Center North" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Group Name <span className="text-rose-500">*</span></label>
              <input type="text" name="groupName" value={formData.groupName} onChange={handleChange} required placeholder="e.g. Green Valley Group" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Village Name <span className="text-rose-500">*</span></label>
              <input type="text" name="villageName" value={formData.villageName} onChange={handleChange} required placeholder="e.g. Muthur Village" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Branch Name</label>
              <input type="text" name="branchName" value={formData.branchName} onChange={handleChange} placeholder="Select or type branch" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 focus:outline-none" readOnly={userProfile?.role === 'staff'} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Staff Name</label>
              <input type="text" name="staffName" value={formData.staffName} onChange={handleChange} placeholder="Assigned staff name" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 focus:outline-none" readOnly={userProfile?.role === 'staff'} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">GPS Location</label>
              <div className="flex gap-2">
                <input type="text" name="location" value={formData.location} readOnly placeholder="Latitude, Longitude" className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 focus:outline-none font-mono text-sm" />
                <button type="button" onClick={handleGetLocation} disabled={isLocating} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors whitespace-nowrap disabled:opacity-70">
                  <MapPin size={18} />
                  {isLocating ? 'Locating...' : 'Get Location'}
                </button>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-medium shadow-sm transition-colors disabled:opacity-70">
              {isSubmitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
