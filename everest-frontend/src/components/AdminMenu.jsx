import React from 'react';
import './AdminMenu.css';

const AdminMenu = ({ pendingCount = 0, onSelectMenu }) => {
  const menuItems = [
    { name: 'Customer', icon: '👤' },
    { name: 'Groups', icon: '👥' },
    { name: 'Add Bulk Customer', icon: '📥' },
    { name: 'Expenses', icon: '🧾' },
    { name: 'Cash Book', icon: '📒' },
    { name: 'Staff Management', icon: '👔' },
    { name: 'Dashboard Overview', icon: '📊' },
    { name: 'Customer KYC Update', icon: '🛡️' },
    { name: 'Application Status', icon: '📝', count: pendingCount },
    { name: 'Recycle Bin', icon: '🗑️' },
    { name: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="admin-menu">
      <div className="admin-menu-header">
        <h3>Admin Dashboard</h3>
      </div>
      <div className="admin-menu-list">
        {menuItems.map((item, idx) => (
          <div key={idx} className="admin-menu-item clickable" onClick={() => onSelectMenu && onSelectMenu(item.name)}>
            <span className="admin-menu-icon">{item.icon}</span>
            <span className="admin-menu-text">{item.name}</span>
            {item.count > 0 && <span className="admin-menu-badge">{item.count}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminMenu;
