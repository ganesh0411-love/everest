import React, { useState, useEffect } from 'react';

const visibilityKeys = [
  { key: 'topCardVisible', label: 'Top Card' },
  { key: 'collectionCardVisible', label: 'Collection Card' },
  { key: 'centerOverviewVisible', label: 'Center Overview' },
  { key: 'emiCalculatorVisible', label: 'EMI Calculator' },
  { key: 'businessOverviewVisible', label: 'Business Overview' },
  { key: 'landSurveyVisible', label: 'Land Survey' },
];

const granularKeys = [
  { key: 'customerManagement', label: 'Customer Management' },
  { key: 'staffManagement', label: 'Staff Management' },
  { key: 'applicationStatus', label: 'Application Status' },
  { key: 'collectionReport', label: 'Collection Report' },
  { key: 'centerManagement', label: 'Center Management' },
  { key: 'customerKycUpdate', label: 'Customer KYC Update' },
  { key: 'recycleBin', label: 'Recycle Bin' },
];

export const defaultPermissions = {
  // Simple Booleans
  topCardVisible: false,
  collectionCardVisible: false,
  centerOverviewVisible: false,
  emiCalculatorVisible: false,
  businessOverviewVisible: false,
  landSurveyVisible: false,

  // Granular Controls
  customerManagement: { enabled: false, accessLevel: 'view_only' },
  staffManagement: { enabled: false, accessLevel: 'view_only' },
  applicationStatus: { enabled: false, accessLevel: 'view_only' },
  collectionReport: { enabled: false, accessLevel: 'view_only' },
  centerManagement: { enabled: false, accessLevel: 'view_only' },
  customerKycUpdate: { enabled: false, accessLevel: 'view_only' },
  recycleBin: { enabled: false, accessLevel: 'view_only' },
  
  // Legacy
  canDeleteCustomer: false,
  canEditLedger: true
};

const StaffPermissionsModal = ({ isOpen, onClose, onSave, initialPermissions }) => {
  const [permissions, setPermissions] = useState(defaultPermissions);
  
  useEffect(() => {
    if (isOpen) {
      setPermissions({ ...defaultPermissions, ...(initialPermissions || {}) });
    }
  }, [isOpen, initialPermissions]);

  if (!isOpen) return null;

  const handleAllToggle = (e) => {
    const isChecked = e.target.checked;
    const newPerms = { ...permissions };
    
    visibilityKeys.forEach(v => {
      newPerms[v.key] = isChecked;
    });
    
    granularKeys.forEach(g => {
      newPerms[g.key] = { enabled: isChecked, accessLevel: isChecked ? 'editable' : 'view_only' };
    });
    
    setPermissions(newPerms);
  };

  const isAllSelected = () => {
    const allVis = visibilityKeys.every(v => permissions[v.key]);
    const allGran = granularKeys.every(g => permissions[g.key]?.enabled && permissions[g.key]?.accessLevel === 'editable');
    return allVis && allGran;
  };

  const handleVisToggle = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGranularToggle = (key) => {
    setPermissions(prev => {
      const current = prev[key] || { enabled: false, accessLevel: 'view_only' };
      return {
        ...prev,
        [key]: {
          ...current,
          enabled: !current.enabled
        }
      };
    });
  };

  const handleAccessLevelChange = (key, level) => {
    setPermissions(prev => {
      const current = prev[key] || { enabled: false, accessLevel: 'view_only' };
      return {
        ...prev,
        [key]: {
          ...current,
          accessLevel: level
        }
      };
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Staff Permissions Configuration</h2>
          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-sm font-bold text-slate-700">All Permissions</span>
            <input 
              type="checkbox" 
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
              checked={isAllSelected()}
              onChange={handleAllToggle}
            />
          </label>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          
          {/* Section A: Visibility Toggle Only */}
          <section>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Visibility Only</h3>
            <div className="grid grid-cols-2 gap-3">
              {visibilityKeys.map(item => (
                <label key={item.key} className="flex items-center p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                    checked={!!permissions[item.key]}
                    onChange={() => handleVisToggle(item.key)}
                  />
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section B: Granular Access Controls */}
          <section>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Granular Access Controls</h3>
            <div className="space-y-3">
              {granularKeys.map(item => {
                const config = permissions[item.key] || { enabled: false, accessLevel: 'view_only' };
                return (
                  <div key={item.key} className={`flex items-center justify-between p-3 border rounded-xl transition-colors ${config.enabled ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200 bg-white'}`}>
                    <label className="flex items-center cursor-pointer flex-1">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                        checked={config.enabled}
                        onChange={() => handleGranularToggle(item.key)}
                      />
                      <span className="text-sm font-bold text-slate-700">{item.label}</span>
                    </label>

                    <div className={`flex flex-col gap-1 pl-4 border-l border-slate-200 ${!config.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                      <label className="flex items-center cursor-pointer text-xs">
                        <input 
                          type="radio"
                          name={`access_${item.key}`}
                          className="w-3 h-3 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                          checked={config.accessLevel === 'view_only'}
                          onChange={() => handleAccessLevelChange(item.key, 'view_only')}
                        />
                        <span className="font-medium text-slate-600">View Only</span>
                      </label>
                      <label className="flex items-center cursor-pointer text-xs">
                        <input 
                          type="radio"
                          name={`access_${item.key}`}
                          className="w-3 h-3 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                          checked={config.accessLevel === 'editable'}
                          onChange={() => handleAccessLevelChange(item.key, 'editable')}
                        />
                        <span className="font-medium text-slate-600">Editable</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => {
              onSave(permissions);
              onClose();
            }}
            className="flex-1 px-6 py-2.5 rounded-xl bg-[#1ca3a6] hover:bg-[#158f92] text-white font-bold shadow-md shadow-[#1ca3a6]/20 transition-all active:scale-95"
          >
            Save Permissions
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffPermissionsModal;
