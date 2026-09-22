import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Settings as SettingsIcon, Building2, MapPin, Eye, EyeOff, Calculator } from 'lucide-react';

const Settings = ({ branches = [] }) => {
  // We only list sub-branches (exclude Main Branch from configuration).
  const subBranches = branches.filter(b => b.id !== 'main' && b.name?.toLowerCase() !== 'main branch');
  const [toastMsg, setToastMsg] = useState(null);

  const handleToggle = async (branchId, field, currentValue) => {
    try {
      const branchRef = doc(db, 'branches', branchId);
      await updateDoc(branchRef, {
        [field]: !currentValue
      });
      // Show toast
      const label = field === 'isVisibleInDropdown' ? 'Dropdown visibility' : 'Consolidated totals';
      setToastMsg(`${label} updated successfully.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (error) {
      console.error(`Error updating branch ${field}:`, error);
      alert('Failed to update branch settings.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 min-h-[100dvh] md:min-h-0 relative">
      <div className="max-w-4xl mx-auto pb-24 md:pb-0">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <SettingsIcon className="w-7 h-7 text-brand-blue" />
              Settings
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Branch Visibility & Consolidation Controls
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-xs font-bold text-blue-700">Main Branch Root</span>
          </div>
        </div>

        {/* Configuration Card (Desktop Table / Mobile Stacked) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Active Sub-Branches ({subBranches.length})
            </h2>
          </div>

          <div className="flex flex-col">
            {subBranches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-medium">No sub-branches found.</div>
            ) : (
              subBranches.map((branch, idx) => {
                const isVisible = branch.isVisibleInDropdown !== false; // Default true
                const isIncluded = branch.includeInConsolidatedTotals !== false; // Default true

                return (
                  <div key={branch.id} className={`p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 ${idx !== subBranches.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50/50 transition-colors`}>
                    
                    {/* Branch Info */}
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-800">{branch.name}</h3>
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {branch.branchCode || branch.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {branch.location || 'Location unassigned'}
                      </div>
                    </div>

                    {/* Toggles Container */}
                    <div className="flex flex-col md:flex-row gap-3 md:gap-8">
                      
                      {/* Toggle 1: Show in Dropdown */}
                      <div className="flex items-center justify-between md:justify-end gap-3 md:w-48 bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl border border-slate-100 md:border-none">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            {isVisible ? <Eye className="w-4 h-4 text-blue-500" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                            Dropdown Menu
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium hidden md:block">Show in top header</span>
                        </div>
                        <button 
                          onClick={() => handleToggle(branch.id, 'isVisibleInDropdown', isVisible)}
                          className={`w-[44px] h-[24px] rounded-full flex items-center transition-colors shrink-0 ${isVisible ? 'bg-blue-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-[20px] h-[20px] bg-white rounded-full shadow-sm transform transition-transform mx-[2px] ${isVisible ? 'translate-x-[20px]' : 'translate-x-0'}`}></div>
                        </button>
                      </div>

                      {/* Toggle 2: Include in Totals */}
                      <div className="flex items-center justify-between md:justify-end gap-3 md:w-56 bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl border border-slate-100 md:border-none">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            <Calculator className={`w-4 h-4 ${isIncluded ? 'text-emerald-500' : 'text-slate-400'}`} />
                            Main Totals
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium hidden md:block">Include in dashboard</span>
                        </div>
                        <button 
                          onClick={() => handleToggle(branch.id, 'includeInConsolidatedTotals', isIncluded)}
                          className={`w-[44px] h-[24px] rounded-full flex items-center transition-colors shrink-0 ${isIncluded ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-[20px] h-[20px] bg-white rounded-full shadow-sm transform transition-transform mx-[2px] ${isIncluded ? 'translate-x-[20px]' : 'translate-x-0'}`}></div>
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
