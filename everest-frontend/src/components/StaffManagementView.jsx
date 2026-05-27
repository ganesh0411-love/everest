import React, { useState } from 'react';
import './ModuleBoilerplate.css';

const StaffManagementView = () => {
  const [staff] = useState([
    { id: 'S001', name: 'Rajesh Kumar', role: 'Field Officer', center: 'Ward 4', assigned: 14, status: 'Active' },
    { id: 'S002', name: 'Meena Patel', role: 'Loan Officer', center: 'Sector 5', assigned: 9, status: 'Active' },
    { id: 'S003', name: 'Suresh Yadav', role: 'Recovery Agent', center: 'Village 2', assigned: 6, status: 'On Leave' },
    { id: 'S004', name: 'Anita Singh', role: 'Branch Manager', center: 'Main Branch', assigned: 30, status: 'Active' },
  ]);

  return (
    <div className="module-view">
      <div className="module-header">
        <div>
          <h2>👔 Staff Management</h2>
          <p>Manage field officers, loan officers, and their customer allocations.</p>
        </div>
        <button className="module-primary-btn">+ Add Staff</button>
      </div>

      <div className="module-stats-row">
        <div className="module-stat-card">
          <span className="stat-value">4</span>
          <span className="stat-label">Total Staff</span>
        </div>
        <div className="module-stat-card">
          <span className="stat-value">3</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="module-stat-card">
          <span className="stat-value">59</span>
          <span className="stat-label">Customers Assigned</span>
        </div>
      </div>

      <div className="module-table-wrapper">
        <table className="module-table">
          <thead>
            <tr>
              <th>Staff ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Center</th>
              <th>Customers Assigned</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id}>
                <td className="muted">{s.id}</td>
                <td>
                  <div className="staff-name-cell">
                    <div className="staff-avatar">{s.name.charAt(0)}</div>
                    <strong>{s.name}</strong>
                  </div>
                </td>
                <td className="muted">{s.role}</td>
                <td className="muted">{s.center}</td>
                <td>{s.assigned}</td>
                <td>
                  <span className={`module-pill ${
                    s.status === 'Active' ? 'pill-green' :
                    s.status === 'On Leave' ? 'pill-yellow' : 'pill-grey'
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  <div className="module-action-row">
                    <button className="mod-btn mod-btn-ghost">View</button>
                    <button className="mod-btn mod-btn-ghost">Assign</button>
                    <button className="mod-btn mod-btn-danger">Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="module-placeholder-note">
        🔧 Staff allocation engine, route mapping, and performance reports will be configured in the next update.
      </div>
    </div>
  );
};

export default StaffManagementView;
