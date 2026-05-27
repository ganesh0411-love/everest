import React from 'react';
import './BottomNav.css';

const BottomNav = ({ activeView = 'dashboard', onNavigate, userRole = 'Admin' }) => {
  const nav = (view) => onNavigate && onNavigate(view);

  if (userRole === 'User') {
    return null;
  }

  return (
    <div className="bottom-nav">
      <button
        className={`nav-item clickable ${activeView === 'dashboard' ? 'active' : ''}`}
        onClick={() => nav('dashboard')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Home</span>
      </button>

      {userRole === 'Admin' && (
        <button
          className={`nav-item clickable ${activeView === 'groups' ? 'active' : ''}`}
          onClick={() => nav('groups')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Groups</span>
        </button>
      )}

      {(userRole === 'Admin' || userRole === 'Staff') && (
        <button
          className={`nav-item clickable ${activeView === 'application-status' ? 'active' : ''}`}
          onClick={() => nav('application-status')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <span>Status</span>
        </button>
      )}
    </div>
  );
};

export default BottomNav;
