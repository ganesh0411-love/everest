import React, { useState, useEffect, useRef } from 'react';
import AdminMenu from './AdminMenu';
import './Header.css';

const Header = ({ branches, activeBranch, onSelectBranch, onAddBranch, user, onLogout, cloudSyncStatus, onSelectMenu }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const settingsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleBranchSelect = (id) => {
    onSelectBranch(id);
    setDropdownOpen(false);
  };

  const handleAddClick = () => {
    setDropdownOpen(false);
    const name = window.prompt("Enter new branch name:");
    if (name) {
      onAddBranch(name);
    }
  };

  return (
    <header className="app-header">
      <div className="header-top">
        <div className="user-profile clickable" ref={dropdownRef} onClick={() => { setDropdownOpen(!dropdownOpen); setSettingsOpen(false); }}>
          <div className="avatar">
            <img src="./logo.jpeg" alt="Branch Logo" className="avatar-img" />
          </div>
          <div className="business-info">
            <span className="business-name">{activeBranch?.name || 'Branch'}</span>
            <span className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`}>▼</span>
          </div>
          
          {dropdownOpen && (
            <div className="branch-dropdown">
              {branches.map(branch => (
                <div 
                  key={branch.id} 
                  className={`dropdown-item ${branch.id === activeBranch?.id ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleBranchSelect(branch.id); }}
                >
                  {branch.name}
                </div>
              ))}
              <div className="dropdown-divider"></div>
              <div 
                className="dropdown-item add-branch"
                onClick={(e) => { e.stopPropagation(); handleAddClick(); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Branch
              </div>
            </div>
          )}
        </div>
        
        <div className="header-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
          {user && (
            <div className="user-profile-badge" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="admin-glow">{user.role}</span>
            </div>
          )}

          {user && (user.role === 'Admin' || user.role === 'Staff') && (
            <div className="settings-wrapper" ref={settingsRef} style={{ marginTop: '0.1rem' }}>
              <button className="icon-btn clickable" aria-label="Settings" onClick={() => { setSettingsOpen(!settingsOpen); setDropdownOpen(false); }} style={{ width: '30px', height: '30px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
              {settingsOpen && (
                <div className="settings-dropdown" style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {user.role === 'Admin' ? (
                    <>
                      <AdminMenu onSelectMenu={(menuName) => {
                        setSettingsOpen(false);
                        onSelectMenu && onSelectMenu(menuName);
                      }} />
                      <button className="btn-settings-logout" onClick={onLogout} style={{ width: '100%', padding: '0.85rem', background: 'rgba(239, 68, 68, 0.08)', border: 'none', borderTop: '1px solid var(--border)', color: '#EF4444', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Logout
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <button 
                        onClick={() => { setSettingsOpen(false); onSelectMenu && onSelectMenu('Recycle Bin'); }}
                        style={{ width: '100%', padding: '0.85rem', border: 'none', background: 'none', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)' }}
                        className="clickable"
                      >
                        🗑️ Recycle Bin
                      </button>
                      <button 
                        className="btn-settings-logout" 
                        onClick={onLogout} 
                        style={{ width: '100%', padding: '0.85rem', background: 'rgba(239, 68, 68, 0.08)', border: 'none', color: '#EF4444', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="app-branding" style={{ marginTop: '-0.3rem' }}>
        <h1 className="app-title" style={{ margin: 0 }}>Everest Micro Finance</h1>
      </div>
    </header>
  );
};

export default Header;
