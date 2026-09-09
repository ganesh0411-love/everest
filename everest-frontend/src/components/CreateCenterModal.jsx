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
    location: '',
    totalMembers: ''
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
        branchName: bName === 'Main Branch' || bName === 'All Center' ? '' : bName,
        branchId: bId === 'main' || bId === 'all' ? '' : bId,
        staffName: userProfile?.name || userProfile?.staffName || '',
        location: '',
        totalMembers: ''
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
        centerName: formData.centerName,
        group: formData.groupName || 'N/A',
        village: formData.villageName,
        branchName: formData.branchName,
        branchId: formData.branchId,
        staffName: formData.staffName,
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col justify-between">
        
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              
              <div className="space-y-0.5">
                <label className="text-xs font-semibold mb-0.5 text-gray-700">Leader Name <span className="text-rose-500">*</span></label>
                <input type="text" name="leaderName" value={formData.leaderName} onChange={handleChange} required placeholder="e.g. Selvi R" className="w-full px-3 py-1.5 text-sm h-9 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>

              <div className="space-y-0.5">
                <label className="text-xs font-semibold mb-0.5 text-gray-700">Leader Customer ID</label>
                <input type="text" name="leaderId" value={formData.leaderId} onChange={handleChange} placeholder="e.g. EMF123456" className="w-full px-3 py-1.5 text-sm h-9 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono" />
              </div>

              <div className="space-y-0.5">
                <label className="text-xs font-semibold mb-0.5 text-gray-700">Center Name <span className="text-rose-500">*</span></label>
                <input type="text" name="centerName" value={formData.centerName} onChange={handleChange} required placeholder="e.g. Center North" className="w-full px-3 py-1.5 text-sm h-9 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>

              <div className="space-y-0.5">
                <label className="text-xs font-semibold mb-0.5 text-gray-700">Group Name</label>
                <input type="text" name="groupName" value={formData.groupName} onChange={handleChange} placeholder="e.g. Green Valley Group" className="w-full px-3 py-1.5 text-sm h-9 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>

              <div className="space-y-0.5">
                <label className="text-xs font-semibold mb-0.5 text-gray-700">Village Name <span className="text-rose-500">*</span></label>
                <input type="text" name="villageName" value={formData.villageName} onChange={handleChange} required placeholder="e.g. Muthur Village" className="w-full px-3 py-1.5 text-sm h-9 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>

              <div className="space-y-0.5">
                <label className="text-xs font-semibold mb-0.5 text-gray-700">Number of Customers</label>
                <input type="number" name="totalMembers" value={formData.totalMembers} onChange={handleChange} placeholder="e.g. 10" className="w-full px-3 py-1.5 text-sm h-9 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>

              <div className="space-y-0.5">
                <label className="text-xs font-semibold mb-0.5 text-gray-700">Branch Name</label>
                <input type="text" name="branchName" value={formData.branchName} onChange={handleChange} placeholder="Select or type branch" className="w-full px-3 py-1.5 text-sm h-9 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 focus:outline-none" readOnly={userProfile?.role === 'staff'} />
              </div>

              <div className="space-y-0.5">
                <label className="text-xs font-semibold mb-0.5 text-gray-700">Staff Name</label>
                <input type="text" name="staffName" value={formData.staffName} onChange={handleChange} placeholder="Assigned staff name" className="w-full px-3 py-1.5 text-sm h-9 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 focus:outline-none" readOnly={userProfile?.role === 'staff'} />
              </div>

              <div className="space-y-0.5 md:col-span-2">
                <label className="text-xs font-semibold mb-0.5 text-gray-700">GPS Location</label>
                <div className="flex gap-2">
                  <input type="text" name="location" value={formData.location} readOnly placeholder="Google Maps URL" className="flex-1 px-3 py-1.5 text-sm h-9 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 focus:outline-none font-mono" />
                  <button type="button" onClick={handleGetLocation} disabled={isLocating} className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 text-sm h-9 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-70 shrink-0">
                    <MapPin size={14} />
                    {isLocating ? 'Locating...' : 'Get Location'}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Footer (Pinned) */}
          <div className="shrink-0 flex justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-white">
            <button type="button" onClick={onClose} className="px-5 py-1.5 text-sm h-9 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 text-sm h-9 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-70">
              {isSubmitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
