import React, { useState } from 'react';
import './ModuleBoilerplate.css';

const CustomerGroupsView = () => {
  const [groups] = useState([
    { id: 1, name: 'Group A – Ward 4', center: 'Ward 4', members: 12, meetingDay: 'Monday', status: 'Active' },
    { id: 2, name: 'Group B – Sector 5', center: 'Sector 5', members: 8, meetingDay: 'Wednesday', status: 'Active' },
    { id: 3, name: 'Group C – Village 2', center: 'Village 2', members: 15, meetingDay: 'Friday', status: 'Inactive' },
  ]);

  return (
    <div className="module-view">
      <div className="module-header">
        <div>
          <h2>👥 Customer Groups</h2>
          <p>Manage and sort customer groups by center, meeting schedule, and membership.</p>
        </div>
        <button className="module-primary-btn">+ Create Group</button>
      </div>

      <div className="module-stats-row">
        <div className="module-stat-card">
          <span className="stat-value">3</span>
          <span className="stat-label">Total Groups</span>
        </div>
        <div className="module-stat-card">
          <span className="stat-value">35</span>
          <span className="stat-label">Total Members</span>
        </div>
        <div className="module-stat-card">
          <span className="stat-value">2</span>
          <span className="stat-label">Active Groups</span>
        </div>
      </div>

      <div className="module-table-wrapper">
        <table className="module-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Group Name</th>
              <th>Center</th>
              <th>Members</th>
              <th>Meeting Day</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g, idx) => (
              <tr key={g.id}>
                <td className="muted">{idx + 1}</td>
                <td><strong>{g.name}</strong></td>
                <td className="muted">{g.center}</td>
                <td>{g.members}</td>
                <td>{g.meetingDay}</td>
                <td>
                  <span className={`module-pill ${g.status === 'Active' ? 'pill-green' : 'pill-grey'}`}>
                    {g.status}
                  </span>
                </td>
                <td>
                  <div className="module-action-row">
                    <button className="mod-btn mod-btn-ghost">View</button>
                    <button className="mod-btn mod-btn-ghost">Edit</button>
                    <button className="mod-btn mod-btn-danger">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="module-placeholder-note">
        🔧 Group sorting, assignment, and center-level filtering will be configured in the next update.
      </div>
    </div>
  );
};

export default CustomerGroupsView;
