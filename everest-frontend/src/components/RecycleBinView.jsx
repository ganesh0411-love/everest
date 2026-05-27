import React from 'react';

const RecycleBinView = ({ recycledCustomers = [], onRestore, onPermanentDelete }) => {
  const daysLeft = (deletedTimestamp) => {
    if (!deletedTimestamp) return 180;
    const elapsedMs = Date.now() - deletedTimestamp;
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    const left = 180 - elapsedDays;
    return left > 0 ? left : 0;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  return (
    <div className="application-status-view recycle-bin-view" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem 1.5rem' }}>
      <div className="status-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <h2>Recycle Bin Subsystem</h2>
        <p>Manage deleted customer accounts. Items are safely held for a strict 180-day lifecycle holding period.</p>
      </div>

      {recycledCustomers.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🗑️</div>
          <p>The Recycle Bin is empty. No deleted profiles found.</p>
        </div>
      ) : (
        <div className="table-wrapper" style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <table className="status-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customer Name</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Original Status</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deletion Date</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Holding Days Remaining</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recycledCustomers.map((app, idx) => (
                <tr key={app.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem 0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', overflow: 'hidden' }}>
                        {app.details?.imageUri ? (
                          <img src={app.details.imageUri} alt="Customer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span>{app.name?.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>{app.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {app.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 0.8rem', fontSize: '0.85rem' }}>
                    <span className={`status-pill ${app.pendingStatus?.toLowerCase() || 'pending'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: app.pendingStatus === 'APPROVED' ? 'rgba(16,185,129,0.15)' : app.pendingStatus === 'REJECTED' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: app.pendingStatus === 'APPROVED' ? '#10B981' : app.pendingStatus === 'REJECTED' ? '#EF4444' : '#F59E0B' }}>
                      {app.pendingStatus || 'PENDING'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.8rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>{formatDate(app.deletedTimestamp)}</td>
                  <td style={{ padding: '0.75rem 0.8rem', fontSize: '0.85rem', fontWeight: 700, color: '#F59E0B' }}>
                    ⏱️ {daysLeft(app.deletedTimestamp)} days left
                  </td>
                  <td style={{ padding: '0.75rem 0.8rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button 
                        onClick={() => onRestore(app)}
                        style={{ padding: '0.4rem 0.85rem', background: 'rgba(16, 185, 129, 0.15)', border: 'none', color: '#10B981', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s' }}
                        className="clickable"
                      >
                        🔄 Restore
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Are you absolutely sure you want to permanently delete ${app.name}? This action CANNOT be undone.`)) {
                            onPermanentDelete(app);
                          }
                        }}
                        style={{ padding: '0.4rem 0.85rem', background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: '#EF4444', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s' }}
                        className="clickable"
                      >
                        🚨 Hard Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecycleBinView;
