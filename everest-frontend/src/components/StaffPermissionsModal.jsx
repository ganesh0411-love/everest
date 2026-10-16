import React, { useState, useEffect } from 'react';

export const defaultPermissions = {
  // Empty for now as per UI ONLY requirement
};

const StaffPermissionsModal = ({ isOpen, onClose, onSave, initialPermissions }) => {
  const [permissions, setPermissions] = useState({
    allPermissions: false,
    
    // Module Access Items
    dashboardOverview: false,
    dashboardOverviewMode: 'Staff',
    customerManagement: false,
    customerManagementMode: 'Staff',
    centerManagement: false,
    staffManagement: false,
    staffManagementRole: 'Staff', // 'Staff' or 'Admin'
    applicationStatus: false,
    applicationStatusRole: 'Staff', // 'Staff' or 'Admin'
    collectionReport: false,
    collectionReportRole: 'Staff', // 'Staff' or 'Admin'
    attendance: false,
    attendanceRole: 'Staff', // 'Staff' or 'Admin'
    expansion: false,
    expenses: false,
    cashBook: false,
    recycleBin: false,

    // Dashboard Cards
    dashboardStaffCard: false,
    dashboardLandSurveyCard: false,

    // Customer Profile Settings
    userSettings: false
  });

  useEffect(() => {
    if (isOpen) {
      setPermissions(prev => ({ 
        ...prev, 
        ...(initialPermissions || {}) 
      }));
    }
  }, [isOpen, initialPermissions]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    setPermissions(prev => {
      const newState = { ...prev, [key]: !prev[key] };
      if (!newState[key]) {
        newState.allPermissions = false;
      }
      return newState;
    });
  };

  const handleRoleChange = (key, role) => {
    setPermissions(prev => ({ ...prev, [key]: role }));
  };

  const handleAllToggle = (e) => {
    const isChecked = e.target.checked;
    setPermissions(prev => ({
      ...prev,
      allPermissions: isChecked,
      dashboardOverview: isChecked,
      customerManagement: isChecked,
      centerManagement: isChecked,
      staffManagement: isChecked,
      applicationStatus: isChecked,
      recycleBin: isChecked,
      dashboardStaffCard: isChecked,
      dashboardLandSurveyCard: isChecked,
      userSettings: isChecked
    }));
  };

  return (
    <div className="fixed inset-0 md:absolute md:inset-0 z-[100] flex flex-col bg-white md:rounded-[24px] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 md:rounded-t-[24px]">
        <h2 className="text-lg font-bold text-slate-800">Staff Permissions Configuration</h2>
        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-sm font-bold text-slate-700">All Permissions</span>
          <input 
            type="checkbox" 
            className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
            checked={permissions.allPermissions}
            onChange={handleAllToggle}
          />
        </label>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 overflow-y-auto space-y-6">
        
        {/* Module Access Items */}
        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Module Access Items</h3>
          <div className="space-y-3">
            {/* Dashboard Overview */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-xl transition-colors gap-3 sm:gap-0 ${permissions.dashboardOverview ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <label className="flex items-center cursor-pointer flex-1">
                <input 
                  type="checkbox"
                  className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  checked={permissions.dashboardOverview}
                  onChange={() => handleToggle('dashboardOverview')}
                />
                <span className="text-sm font-bold text-slate-700">Dashboard Overview</span>
              </label>
              <div className={`flex items-center gap-4 sm:pl-4 sm:border-l border-slate-200 ml-7 sm:ml-0 ${!permissions.dashboardOverview ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="dashboardOverviewRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.dashboardOverviewMode === 'Staff'}
                    onChange={() => handleRoleChange('dashboardOverviewMode', 'Staff')}
                  />
                  <span className="font-medium text-slate-600">Staff</span>
                </label>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="dashboardOverviewRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.dashboardOverviewMode === 'Admin'}
                    onChange={() => handleRoleChange('dashboardOverviewMode', 'Admin')}
                  />
                  <span className="font-medium text-slate-600">Admin</span>
                </label>
              </div>
            </div>

            {/* Customer Management */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-xl transition-colors gap-3 sm:gap-0 ${permissions.customerManagement ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <label className="flex items-center cursor-pointer flex-1">
                <input 
                  type="checkbox"
                  className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  checked={permissions.customerManagement}
                  onChange={() => handleToggle('customerManagement')}
                />
                <span className="text-sm font-bold text-slate-700">Customer Management</span>
              </label>
              <div className={`flex items-center gap-4 sm:pl-4 sm:border-l border-slate-200 ml-7 sm:ml-0 ${!permissions.customerManagement ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="customerManagementRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.customerManagementMode === 'Staff'}
                    onChange={() => handleRoleChange('customerManagementMode', 'Staff')}
                  />
                  <span className="font-medium text-slate-600">Staff</span>
                </label>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="customerManagementRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.customerManagementMode === 'Admin'}
                    onChange={() => handleRoleChange('customerManagementMode', 'Admin')}
                  />
                  <span className="font-medium text-slate-600">Admin</span>
                </label>
              </div>
            </div>

            {/* Center Management */}
            <div className="flex items-center p-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors">
              <label className="flex items-center cursor-pointer flex-1">
                <input 
                  type="checkbox"
                  className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  checked={permissions.centerManagement}
                  onChange={() => handleToggle('centerManagement')}
                />
                <span className="text-sm font-bold text-slate-700">Center Management</span>
              </label>
            </div>

            {/* Staff Management */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-xl transition-colors gap-3 sm:gap-0 ${permissions.staffManagement ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <label className="flex items-center cursor-pointer flex-1">
                <input 
                  type="checkbox"
                  className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  checked={permissions.staffManagement}
                  onChange={() => handleToggle('staffManagement')}
                />
                <span className="text-sm font-bold text-slate-700">Staff Management</span>
              </label>
              <div className={`flex items-center gap-4 sm:pl-4 sm:border-l border-slate-200 ml-7 sm:ml-0 ${!permissions.staffManagement ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="staffRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.staffManagementRole === 'Staff'}
                    onChange={() => handleRoleChange('staffManagementRole', 'Staff')}
                  />
                  <span className="font-medium text-slate-600">Staff</span>
                </label>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="staffRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.staffManagementRole === 'Admin'}
                    onChange={() => handleRoleChange('staffManagementRole', 'Admin')}
                  />
                  <span className="font-medium text-slate-600">Admin</span>
                </label>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="staffRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.staffManagementRole === 'Tracking'}
                    onChange={() => handleRoleChange('staffManagementRole', 'Tracking')}
                  />
                  <span className="font-medium text-slate-600">Duty Tracking</span>
                </label>
              </div>
            </div>

            {/* Application Status */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-xl transition-colors gap-3 sm:gap-0 ${permissions.applicationStatus ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <label className="flex items-center cursor-pointer flex-1">
                <input 
                  type="checkbox"
                  className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  checked={permissions.applicationStatus}
                  onChange={() => handleToggle('applicationStatus')}
                />
                <span className="text-sm font-bold text-slate-700">Application Status</span>
              </label>
              <div className={`flex items-center gap-4 sm:pl-4 sm:border-l border-slate-200 ml-7 sm:ml-0 ${!permissions.applicationStatus ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="appRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.applicationStatusRole === 'Staff'}
                    onChange={() => handleRoleChange('applicationStatusRole', 'Staff')}
                  />
                  <span className="font-medium text-slate-600">Staff</span>
                </label>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="appRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.applicationStatusRole === 'Admin'}
                    onChange={() => handleRoleChange('applicationStatusRole', 'Admin')}
                  />
                  <span className="font-medium text-slate-600">Admin</span>
                </label>
              </div>
            </div>

            {/* Collection Report */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-xl transition-colors gap-3 sm:gap-0 ${permissions.collectionReport ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <label className="flex items-center cursor-pointer flex-1">
                <input 
                  type="checkbox"
                  className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  checked={permissions.collectionReport}
                  onChange={() => handleToggle('collectionReport')}
                />
                <span className="text-sm font-bold text-slate-700">Collection Report</span>
              </label>
              <div className={`flex items-center gap-4 sm:pl-4 sm:border-l border-slate-200 ml-7 sm:ml-0 ${!permissions.collectionReport ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="collectionRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.collectionReportRole === 'Staff'}
                    onChange={() => handleRoleChange('collectionReportRole', 'Staff')}
                  />
                  <span className="font-medium text-slate-600">Staff</span>
                </label>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="collectionRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.collectionReportRole === 'Admin'}
                    onChange={() => handleRoleChange('collectionReportRole', 'Admin')}
                  />
                  <span className="font-medium text-slate-600">Admin</span>
                </label>
              </div>
            </div>

            {/* Attendance */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-xl transition-colors gap-3 sm:gap-0 ${permissions.attendance ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <label className="flex items-center cursor-pointer flex-1">
                <input 
                  type="checkbox"
                  className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  checked={permissions.attendance}
                  onChange={() => handleToggle('attendance')}
                />
                <span className="text-sm font-bold text-slate-700">Attendance</span>
              </label>
              <div className={`flex items-center gap-4 sm:pl-4 sm:border-l border-slate-200 ml-7 sm:ml-0 ${!permissions.attendance ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="attendanceRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.attendanceRole === 'Staff'}
                    onChange={() => handleRoleChange('attendanceRole', 'Staff')}
                  />
                  <span className="font-medium text-slate-600">Staff</span>
                </label>
                <label className="flex items-center cursor-pointer text-sm">
                  <input 
                    type="radio"
                    name="attendanceRole"
                    className="w-3.5 h-3.5 mr-1.5 text-purple-600 border-slate-300 focus:ring-purple-500"
                    checked={permissions.attendanceRole === 'Admin'}
                    onChange={() => handleRoleChange('attendanceRole', 'Admin')}
                  />
                  <span className="font-medium text-slate-600">Admin</span>
                </label>
              </div>
            </div>

            {/* Expansion */}
            <div className={`flex items-center p-3 border rounded-xl transition-colors ${permissions.expansion || permissions.expenses ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <label className="flex items-center cursor-pointer flex-1">
                <input 
                  type="checkbox"
                  className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  checked={Boolean(permissions.expansion || permissions.expenses)}
                  onChange={() => {
                    const nextVal = !(permissions.expansion || permissions.expenses);
                    setPermissions(prev => ({ ...prev, expansion: nextVal, expenses: nextVal }));
                  }}
                />
                <span className="text-sm font-bold text-slate-700">Expansion</span>
              </label>
            </div>

            {/* Cash Book */}
            <div className={`flex items-center p-3 border rounded-xl transition-colors ${permissions.cashBook ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <label className="flex items-center cursor-pointer flex-1">
                <input 
                  type="checkbox"
                  className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  checked={permissions.cashBook}
                  onChange={() => handleToggle('cashBook')}
                />
                <span className="text-sm font-bold text-slate-700">Cash Book</span>
              </label>
            </div>

            {/* Recycle Bin */}
            <div className="flex items-center p-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors">
              <label className="flex items-center cursor-pointer flex-1">
                <input 
                  type="checkbox"
                  className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  checked={permissions.recycleBin}
                  onChange={() => handleToggle('recycleBin')}
                />
                <span className="text-sm font-bold text-slate-700">Recycle Bin</span>
              </label>
            </div>
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Dashboard Cards Visibility */}
        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Dashboard Cards Visibility</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox"
                className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                checked={permissions.dashboardStaffCard}
                onChange={() => handleToggle('dashboardStaffCard')}
              />
              <span className="text-sm font-medium text-slate-700">Dashboard Staff Management Card</span>
            </label>
            <label className="flex items-center p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox"
                className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                checked={permissions.dashboardLandSurveyCard}
                onChange={() => handleToggle('dashboardLandSurveyCard')}
              />
              <span className="text-sm font-medium text-slate-700">Dashboard Land Survey Card</span>
            </label>
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Customer Profile Settings */}
        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Customer Profile Settings</h3>
          <div className="grid grid-cols-1 gap-3">
            <label className="flex items-center p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox"
                className="w-4 h-4 mr-3 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                checked={permissions.userSettings}
                onChange={() => handleToggle('userSettings')}
              />
              <span className="text-sm font-medium text-slate-700">User Settings (Inside Customer Profile)</span>
            </label>
          </div>
        </section>

      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3 md:rounded-b-[24px]">
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
            
            // Trigger clear toast notification
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-[9999] text-sm font-bold animate-in slide-in-from-bottom-5 duration-300';
            toast.innerText = 'Permissions updated successfully';
            document.body.appendChild(toast);
            setTimeout(() => {
              toast.classList.add('animate-out', 'fade-out', 'duration-300');
              setTimeout(() => toast.remove(), 300);
            }, 3000);

            onClose();
          }}
          className="flex-1 px-6 py-2.5 rounded-xl bg-[#1ca3a6] hover:bg-[#158f92] text-white font-bold shadow-md shadow-[#1ca3a6]/20 transition-all active:scale-95"
        >
          Save Permissions
        </button>
      </div>
    </div>
  );
};

export default StaffPermissionsModal;
