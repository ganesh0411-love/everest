import React, { useState, useEffect, useRef } from 'react';
import logo from '../assets/logo.png';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Pencil, LayoutDashboard, Users, Building2, UserPlus, UserCheck, ClipboardList, ShieldCheck, Trash2, Download } from 'lucide-react';

const Header = ({ currentView, setCurrentView, branches = [], activeBranch = { id: 'main', name: 'Main Branch' }, onBranchChange, onAddBranch, onEditBranch, userProfile, isCollectionReportOpen }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const menuRef = useRef(null);
  const branchDropdownRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
        setIsSettingsOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (view) => {
    setCurrentView(view);
    setIsMenuOpen(false);
    setIsSettingsOpen(false);
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await signOut(auth);
        localStorage.removeItem('everest_user_profile');
        localStorage.removeItem('everest_customers');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  };

  const menuItems = [
    { name: 'Dashboard Overview', view: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Customer Management', view: 'Customer', icon: <Users className="w-5 h-5" /> },
    { name: 'Center Management', view: 'Centers', icon: <Building2 className="w-5 h-5" /> },
    { name: 'Add Bulk Customer', view: 'Add Bulk Customer', icon: <UserPlus className="w-5 h-5" /> },
    { name: 'Staff Management', view: 'Staff Management', icon: <UserCheck className="w-5 h-5" /> },
    { name: 'Customer KYC Update', view: 'Customer KYC Update', icon: <ShieldCheck className="w-5 h-5" /> },
    { name: 'Application Status', view: 'Application Status', icon: <ClipboardList className="w-5 h-5" /> },
    { name: 'Recycle Bin', view: 'Recycle Bin', icon: <Trash2 className="w-5 h-5" /> }
  ].filter(item => {
    const permissions = userProfile?.permissions || {};
    const isAdmin = userProfile?.role === 'admin';

    if (item.name === 'Dashboard Overview') return isAdmin || permissions.dashboardOverview === true;
    if (item.name === 'Customer Management') return isAdmin || permissions.customerManagement === true;
    if (item.name === 'Center Management') return isAdmin || permissions.centerManagement === true;
    if (item.name === 'Staff Management') return isAdmin || permissions.staffManagement === true;
    if (item.name === 'Application Status') return isAdmin || permissions.applicationStatus === true;
    if (item.name === 'Add Bulk Customer') return true;
    if (item.name === 'Customer KYC Update') return isAdmin || permissions.customerManagement === true;
    if (item.name === 'Recycle Bin') return isAdmin || permissions.recycleBin === true;

    return isAdmin; // Only admin can access the rest by default unless specified
  });

  const getDisplayBranch = () => {
    if (userProfile?.role === 'staff') {
      const staffBranch = userProfile?.branch || userProfile?.branchName || userProfile?.branchId;
      if (staffBranch?.toLowerCase() === 'main' || staffBranch?.toLowerCase() === 'main branch') return 'Main Branch';
      return staffBranch || 'Main Branch';
    }
    return activeBranch?.name || 'Main Branch';
  };

  return (
    <header className={`w-full px-4 shadow-sm relative z-50 flex-col max-w-4xl mx-auto md:max-w-none md:mx-0 bg-[#eaf5f4] md:py-4 ${(currentView === 'Application Status' || currentView === 'Customer') ? 'py-2' : 'pt-2 pb-1'} ${currentView === 'Staff Management' ? 'hidden md:flex' : 'flex'}`}>
      <div className={`flex justify-between relative ${(currentView === 'Customer') ? 'items-center pb-1' : 'items-start'}`}>
          {/* Always show Logo & Branch on Left */}
          <div className="flex items-center gap-2 md:gap-4">
            <img src={logo} alt="Everest Logo" className="w-10 h-10 md:w-12 md:h-12 object-contain magic-crop mix-blend-multiply" />
            <div className="flex flex-col justify-center items-start gap-0.5 md:gap-2 mt-1 md:mt-0">
              <div className="flex items-center gap-2">
                <div className="relative inline-flex items-center" ref={branchDropdownRef}>
                  <span className="font-bold text-[14px] text-slate-900">{getDisplayBranch()}</span>
                  {userProfile?.role !== 'staff' && (
                    <>
                      <span className="ml-1 text-[10px] text-slate-400">▼</span>
                      
                      {/* Invisible overlay button to toggle custom dropdown */}
                      <div 
                        className="absolute inset-0 w-full h-full cursor-pointer z-10"
                        onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                      />
                      
                      {/* Custom Dropdown Menu */}
                      {isBranchDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-100 z-50 py-1 max-h-64 overflow-y-auto">
                          <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">
                            Select Branch
                          </div>
                          
                          {branches.filter(b => b.isVisibleInDropdown !== false).map((b) => {
                            const branchName = typeof b === 'string' ? b : b.name;
                            const isMain = branchName.toLowerCase() === 'main branch' || branchName.toLowerCase() === 'main';

                            return (
                              <div
                                key={b.id || branchName}
                                onClick={() => { 
                                  const branchObj = typeof b === 'string' ? branches.find(br => br.name === b) : b;
                                  if (branchObj) onBranchChange?.(branchObj);
                                  setIsBranchDropdownOpen(false); 
                                }}
                                className="flex items-center justify-between px-3 py-2.5 mx-1 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer rounded-md transition-colors"
                              >
                                <span className={`font-medium truncate ${activeBranch?.id === b.id ? 'text-brand-blue' : ''}`}>{branchName}</span>

                                {/* Show pencil icon for all editable branches */}
                                {!isMain && (
                                  <button
                                    type="button"
                                    title={`Edit ${branchName}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsBranchDropdownOpen(false);
                                      onBranchChange?.(b);
                                      onEditBranch?.(b);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded transition-colors ml-2 flex-shrink-0"
                                  >
                                    <Pencil className="w-3.5 h-3.5"/>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          
                          <div className="h-px bg-slate-100 my-1"></div>
                          
                          <div
                            onClick={() => {
                              setIsBranchDropdownOpen(false);
                              onAddBranch?.();
                            }}
                            className="flex items-center px-3 py-2.5 mx-1 text-sm font-bold text-brand-blue hover:bg-blue-50 cursor-pointer rounded-md transition-colors"
                          >
                            + Add Branch
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* The global pencil icon is removed since we now have it inside the dropdown per requirement */}
              </div>
              <div className="hidden md:block">
                <h1 className="text-[18px] font-black text-slate-900 tracking-tight leading-none" style={{ fontFamily: 'Georgia, serif' }}>
                  Everest Micro<span style={{ fontSize: '15px' }}>Finance</span>
                </h1>
              </div>
            </div>
          </div>

          {/* Centered Page Title when viewing Collection Report */}
          {isCollectionReportOpen && (currentView === 'Home' || currentView === 'Collection Report' || currentView === 'Collection') && (
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 items-center justify-center pointer-events-none">
              <h1 className="text-base md:text-lg font-black text-slate-900 tracking-wider uppercase">
                Collection Report
              </h1>
            </div>
          )}

        <div className="flex items-center gap-2 relative" ref={menuRef}>
            {/* Header Action: Download Icon when Collection Report is open */}
            {isCollectionReportOpen && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window.handleDownloadCollectionReport === 'function') {
                    window.handleDownloadCollectionReport();
                  }
                }}
                title="Download Report"
                className="flex w-9 h-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {userProfile?.role === 'staff' ? (
              <div className="flex items-center gap-1.5">
                {(() => {
                  const staffPhoto = userProfile.photoBase64 || userProfile.photoUrl || userProfile.profileImage || userProfile.photo;
                  return (
                    <>
                      {/* Circular Avatar Container */}
                      <div className="w-8 h-8 rounded-full border border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                        {staffPhoto ? (
                          <img
                            src={staffPhoto}
                            alt={userProfile?.name || "Staff Avatar"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to initials only if image fails to load
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-xs font-bold text-gray-700">
                            {(userProfile?.name || 'S').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Staff Name & ID */}
                      <div className="flex flex-col text-left leading-tight">
                        <span className="text-xs font-bold text-gray-800 truncate max-w-[85px]">
                          {userProfile?.name || 'Staff'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {userProfile?.staffId || userProfile?.id || ''}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
            <span className="text-[#1ca3a6] font-black tracking-widest text-xs mb-0 drop-shadow-sm">ADMIN</span>
          )}
          <button 
            className="md:hidden p-1 text-slate-500 hover:text-slate-700 transition-colors shrink-0"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Admin Menu Dropdown */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-12 right-0 w-64 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-black py-3 px-4 text-center border-b-4 border-yellow-400">
                <h3 className="text-yellow-400 font-bold text-sm tracking-wider">ADMIN DASHBOARD</h3>
              </div>
              <div className="py-2 max-h-[60vh] overflow-y-auto">
                {menuItems.map((item) => (
                  <button 
                    key={item.name}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors ${currentView === item.view ? 'bg-blue-50 text-brand-blue font-semibold' : 'text-slate-700'}`}
                    onClick={() => handleMenuClick(item.view)}
                  >
                    <span className="text-lg opacity-80 flex items-center">{item.icon}</span>
                    <span className="text-[15px]">{item.name}</span>
                  </button>
                ))}
                
                {/* Settings Toggle */}
                <button 
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors border-t border-slate-100"
                  onClick={() => handleMenuClick('Settings')}
                >
                  <span className="text-lg opacity-80">⚙️</span>
                  <span className="text-[15px] flex-1">Settings</span>
                </button>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full text-center px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold flex items-center justify-center gap-2 transition-colors border-t border-red-100 mt-1"
              >
                <span>[→</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Centered Desktop Title across main content */}
      <div className="hidden md:flex absolute top-1/2 left-[calc(50%+144px)] lg:left-[calc(50%+160px)] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
        {currentView === 'Customer' && (
          <h1 className="text-[24px] font-black text-slate-900 tracking-wider leading-tight whitespace-nowrap" style={{ fontFamily: 'Georgia, serif' }}>
            CUSTOMER LIST
          </h1>
        )}
        {currentView === 'Application Status' && (
          <div className="flex flex-col items-center">
            <span className="font-black text-[24px] text-slate-900 leading-tight tracking-wider">APPLICATION STATUS</span>
            <span className="text-emerald-600 text-[11px] font-black tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>Track & Manage Loan Requests</span>
          </div>
        )}
        {currentView === 'Staff Management' && (
          <div className="flex flex-col items-center">
            <span className="font-black text-[24px] text-slate-900 leading-tight tracking-wider">STAFF MANAGEMENT</span>
            <span className="text-blue-600 text-[11px] font-black tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>Manage & Monitor Staff Profiles</span>
          </div>
        )}
        {currentView !== 'Customer' && currentView !== 'Application Status' && currentView !== 'Staff Management' && currentView !== 'Home' && currentView !== 'HOME' && currentView !== 'Dashboard Overview' && !isCollectionReportOpen && (
          <h1 className="text-[24px] font-black text-slate-900 tracking-wider leading-tight whitespace-nowrap uppercase" style={{ fontFamily: 'Georgia, serif' }}>
            {currentView}
          </h1>
        )}
      </div>

      {/* Unified Mobile Title / Brand */}
      <div className="md:hidden w-full flex justify-center mt-1 pb-1">
        {isCollectionReportOpen ? (
          <div className="w-full flex items-center justify-center relative min-h-[36px]">
            <h1 className="text-[20px] font-black text-slate-900 tracking-wider uppercase leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              Collection Report
            </h1>
            <button
              type="button"
              onClick={() => {
                if (typeof window.handleDownloadCollectionReport === 'function') {
                  window.handleDownloadCollectionReport();
                }
              }}
              title="Download Report"
              className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        ) : (currentView === 'Home' || currentView === 'HOME') ? (
          <h1 className="text-[24px] font-black text-slate-900 tracking-tight leading-none" style={{ fontFamily: 'Georgia, serif' }}>
            Everest Micro<span style={{ fontSize: '19px' }}>Finance</span>
          </h1>
        ) : currentView === 'Customer' ? (
          <h1 className="text-[18px] font-black text-slate-900 tracking-wider leading-tight whitespace-nowrap uppercase" style={{ fontFamily: 'Georgia, serif' }}>
            CUSTOMER LIST
          </h1>
        ) : currentView === 'Application Status' ? (
          <div className="flex flex-col items-center">
            <span className="font-black text-[18px] text-slate-900 leading-tight tracking-wider uppercase">APPLICATION STATUS</span>
            <span className="text-emerald-600 text-[10px] font-black tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>Track & Manage Loan Requests</span>
          </div>
        ) : currentView === 'Center Detail' ? (
          <div className="flex items-center w-full relative">
            <h1 className="text-[18px] font-black text-slate-900 tracking-wider leading-tight whitespace-nowrap uppercase mx-auto" style={{ fontFamily: 'Georgia, serif' }}>
              CENTERS
            </h1>
          </div>
        ) : (
          <h1 className="text-[18px] font-black text-slate-900 tracking-wider leading-tight whitespace-nowrap uppercase" style={{ fontFamily: 'Georgia, serif' }}>
            {currentView}
          </h1>
        )}
      </div>
    </header>
  );
};

export default Header;
