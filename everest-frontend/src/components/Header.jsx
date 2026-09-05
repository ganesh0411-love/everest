import React, { useState, useEffect, useRef } from 'react';
import logo from '../assets/logo.png';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const Header = ({ currentView, setCurrentView, branches = [], activeBranch = { id: 'main', name: 'Main Branch' }, onBranchChange, onAddBranch, userProfile }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
        setIsSettingsOpen(false);
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
    { name: 'Customer', icon: '👤' },
    { name: 'Centers', icon: '👥' },
    { name: 'Add Bulk Customer', icon: '📥' },
    { name: 'Staff Management', icon: '👔' },
    { name: 'Dashboard Overview', icon: '📊' },
    { name: 'Customer KYC Update', icon: '🛡️' },
    { name: 'Application Status', icon: '📝' },
    { name: 'Recycle Bin', icon: '🗑️' }
  ];

  const getDisplayBranch = () => {
    if (userProfile?.role === 'staff') {
      const staffBranch = userProfile?.branch || userProfile?.branchName || userProfile?.branchId;
      return staffBranch?.toLowerCase() === 'theni' ? 'Theni Branch' : 'Main Branch';
    }
    return activeBranch?.name || 'Main Branch';
  };

  return (
    <header className={`w-full px-4 shadow-sm relative z-50 flex flex-col max-w-4xl mx-auto md:max-w-none md:mx-0 bg-[#eaf5f4] ${(currentView === 'Application Status' || currentView === 'Customer') ? 'py-2' : 'pt-2 pb-1'}`}>
      <div className={`flex justify-between relative ${(currentView === 'Customer') ? 'items-center pb-1' : 'items-start'}`}>
          {/* Always show Logo & Branch on Left */}
          <div className="flex items-center gap-2">
            <img src={logo} alt="Everest Logo" className="w-10 h-10 object-contain magic-crop mix-blend-multiply" />
            <div className="flex flex-col justify-center items-start">
              <div className="relative inline-flex items-center">
                <span className="font-bold text-[14px] text-slate-900">{getDisplayBranch()}</span>
                {userProfile?.role !== 'staff' && (
                  <>
                    <span className="ml-1 text-[10px] text-slate-400">▼</span>
                    <select 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      value={activeBranch?.id || 'main'}
                      onChange={(e) => {
                        if (e.target.value === 'add') {
                          onAddBranch?.();
                        } else {
                          const branch = branches.find(b => b.id === e.target.value);
                          if (branch) onBranchChange?.(branch);
                        }
                      }}
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id} className="text-slate-800">{b.name}</option>
                      ))}
                      <option value="add" className="text-slate-800 font-bold text-brand-blue">+ Add Branch</option>
                    </select>
                  </>
                )}
              </div>
              <div className="hidden md:block">
                <h1 className="text-[18px] font-black text-slate-900 tracking-tight leading-none" style={{ fontFamily: 'Georgia, serif' }}>
                  Everest Micro<span style={{ fontSize: '15px' }}>Finance</span>
                </h1>
              </div>
            </div>
          </div>
        <div className="flex flex-col items-end relative" ref={menuRef}>
            {userProfile?.role === 'staff' ? (
              <div className="flex items-center gap-2.5 mr-1 mt-1">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                  {userProfile.photoUrl ? (
                    <img src={userProfile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400 font-bold text-sm">
                      {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'S'}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[#1ca3a6] font-bold text-[13px] leading-tight mb-0 truncate max-w-[150px]">{userProfile.name}</span>
                  <span className="text-slate-500 font-mono text-[10px] tracking-wider leading-none">{userProfile.staffId}</span>
                </div>
              </div>
            ) : (
            <span className="text-[#1ca3a6] font-black tracking-widest text-xs mb-0 drop-shadow-sm">ADMIN</span>
          )}
          <button 
            className="md:hidden p-1 text-slate-500 hover:text-slate-700 transition-colors"
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
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors ${currentView === item.name ? 'bg-blue-50 text-brand-blue font-semibold' : 'text-slate-700'}`}
                    onClick={() => handleMenuClick(item.name)}
                  >
                    <span className="text-lg opacity-80">{item.icon}</span>
                    <span className="text-[15px]">{item.name}</span>
                  </button>
                ))}
                
                {/* Settings Submenu Toggle */}
                <div className="relative">
                  <button 
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors"
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  >
                    <span className="text-lg opacity-80">⚙️</span>
                    <span className="text-[15px] flex-1">Settings</span>
                    <span className={`text-xs transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  
                  {isSettingsOpen && (
                    <div className="bg-slate-50 border-y border-slate-100">
                      <button 
                        className="w-full text-left pl-12 pr-4 py-2 hover:bg-slate-100 text-sm text-slate-600"
                        onClick={() => handleMenuClick('Change Password')}
                      >
                        Change Password
                      </button>
                      <button 
                        className="w-full text-left pl-12 pr-4 py-2 hover:bg-slate-100 text-sm text-slate-600"
                        onClick={() => handleMenuClick('Change Phone Number')}
                      >
                        Change Phone Number
                      </button>
                    </div>
                  )}
                </div>
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
        {currentView !== 'Customer' && currentView !== 'Application Status' && currentView !== 'Home' && currentView !== 'HOME' && currentView !== 'Dashboard Overview' && (
          <h1 className="text-[24px] font-black text-slate-900 tracking-wider leading-tight whitespace-nowrap uppercase" style={{ fontFamily: 'Georgia, serif' }}>
            {currentView}
          </h1>
        )}
      </div>

      {/* Unified Mobile Title / Brand */}
      <div className="md:hidden w-full flex justify-center mt-1 pb-1">
        {(currentView === 'Home' || currentView === 'HOME') ? (
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
