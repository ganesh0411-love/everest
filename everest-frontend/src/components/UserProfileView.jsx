import React from 'react';
import './UserProfileView.css';

const UserProfileView = ({ user, onLogout, customers }) => {
  // Look up customer record in database
  const matchingCustomer = customers?.find(c => 
    c.id === user.email || 
    c.details?.phone === user.email || 
    c.details?.altPhone === user.email ||
    c.details?.email === user.email ||
    c.name.toLowerCase().includes(user.email.split('@')[0].toLowerCase())
  );

  const mockUserAccount = matchingCustomer ? {
    id: matchingCustomer.id,
    name: matchingCustomer.name,
    email: matchingCustomer.details?.email || user.email,
    center: matchingCustomer.details?.center || "Ward No 4",
    loanType: matchingCustomer.details?.loanType || "Micro Finance",
    loanAmount: matchingCustomer.details?.loanAmount || 10000,
    repayAmount: matchingCustomer.amount || 12600,
    interest: matchingCustomer.details?.interest || 26,
    tenure: `${matchingCustomer.details?.tenure ?? '12'} ${matchingCustomer.details?.tenureUnit ?? 'Weeks'}`,
    pincode: matchingCustomer.details?.pincode || "110001",
    aadhaar: matchingCustomer.details?.aadhaar ? matchingCustomer.details.aadhaar.replace(/(\d{4})/g, '$1 ').trim() : "",
    pan: matchingCustomer.details?.pan || "",
    voterId: matchingCustomer.details?.voterId || "",
    smartCard: matchingCustomer.details?.smartCard || "",
    aadhaarFile: matchingCustomer.details?.aadhaarFile || null,
    panFile: matchingCustomer.details?.panFile || null,
    voterIdFile: matchingCustomer.details?.voterIdFile || null,
    smartCardFile: matchingCustomer.details?.smartCardFile || null,
    address: matchingCustomer.details?.address || "123 Main Street, Sector 4, Ward No 4",
    status: matchingCustomer.pendingStatus || "APPROVED",
    statement: [
      { id: "TXN-001", date: matchingCustomer.details?.dateOfApp || "2026-05-01", desc: "Principal Disbursed", amount: matchingCustomer.details?.loanAmount || 10000, type: "credit" },
      { id: "TXN-002", date: "2026-05-08", desc: "Week 1 Repayment (Paid)", amount: Number(((matchingCustomer.amount || 12600) / 12).toFixed(2)), type: "debit", status: "Completed" },
      { id: "TXN-003", date: "2026-05-15", desc: "Week 2 Repayment (Paid)", amount: Number(((matchingCustomer.amount || 12600) / 12).toFixed(2)), type: "debit", status: "Completed" },
      { id: "TXN-004", date: "2026-05-22", desc: "Week 3 Repayment (Paid)", amount: Number(((matchingCustomer.amount || 12600) / 12).toFixed(2)), type: "debit", status: "Completed" },
      { id: "TXN-005", date: "2026-05-29", desc: "Week 4 Repayment (Upcoming)", amount: Number(((matchingCustomer.amount || 12600) / 12).toFixed(2)), type: "debit", status: "Pending" }
    ]
  } : {
    id: "USR-9948",
    name: "Mr. Demo Customer",
    email: user.email,
    center: "Ward No 4",
    loanType: "Microfinance Weekly",
    loanAmount: 10000,
    repayAmount: 12600,
    interest: 26,
    tenure: "12 Weeks",
    pincode: "110001",
    aadhaar: "1234 5678 9012",
    pan: "ABCDE1234F",
    voterId: "",
    smartCard: "",
    aadhaarFile: null,
    panFile: null,
    voterIdFile: null,
    smartCardFile: null,
    address: "123 Main Street, Sector 4, Ward No 4",
    status: "APPROVED",
    statement: [
      { id: "TXN-001", date: "2026-05-01", desc: "Principal Disbursed", amount: 10000, type: "credit" },
      { id: "TXN-002", date: "2026-05-08", desc: "Week 1 Repayment (Paid)", amount: 1050, type: "debit", status: "Completed" },
      { id: "TXN-003", date: "2026-05-15", desc: "Week 2 Repayment (Paid)", amount: 1050, type: "debit", status: "Completed" },
      { id: "TXN-004", date: "2026-05-22", desc: "Week 3 Repayment (Paid)", amount: 1050, type: "debit", status: "Completed" },
      { id: "TXN-005", date: "2026-05-29", desc: "Week 4 Repayment (Upcoming)", amount: 1050, type: "debit", status: "Pending" }
    ]
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="user-profile-view">
      <div className="user-header">
        <div className="user-profile-top">
          <div className="user-avatar-large">
            {getInitials(mockUserAccount.name)}
          </div>
          <div>
            <h2>{mockUserAccount.name}</h2>
            <p className="user-id">Customer ID: {mockUserAccount.id} · <span className="status-badge-approved">✓ ACTIVE</span></p>
          </div>
        </div>
        <button className="btn-logout-header" onClick={onLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>

      <div className="user-metrics">
        <div className="user-card-stat border-positive">
          <span className="stat-label">Disbursed Principal</span>
          <span className="stat-val text-positive">₹{mockUserAccount.loanAmount.toLocaleString('en-IN')}</span>
          <span className="stat-sub">Interest rate: {mockUserAccount.interest}%</span>
        </div>
        <div className="user-card-stat border-negative">
          <span className="stat-label">Outstanding Balance</span>
          <span className="stat-val text-negative">₹{mockUserAccount.repayAmount.toLocaleString('en-IN')}</span>
          <span className="stat-sub">Tenure: {mockUserAccount.tenure}</span>
        </div>
      </div>

      <div className="user-section-title">KYC & Account Details</div>
      <div className="user-info-grid">
        <div className="info-item"><span>Email</span><strong>{mockUserAccount.email}</strong></div>
        <div className="info-item"><span>Center</span><strong>{mockUserAccount.center}</strong></div>
        {mockUserAccount.aadhaar && <div className="info-item"><span>Aadhaar</span><strong>{mockUserAccount.aadhaar}</strong></div>}
        {mockUserAccount.pan && <div className="info-item"><span>PAN Card</span><strong>{mockUserAccount.pan}</strong></div>}
        {mockUserAccount.voterId && <div className="info-item"><span>Voter ID</span><strong>{mockUserAccount.voterId}</strong></div>}
        {mockUserAccount.smartCard && <div className="info-item"><span>Smart Card</span><strong>{mockUserAccount.smartCard}</strong></div>}
        <div className="info-item info-full"><span>Residential Address</span><strong>{mockUserAccount.address} (Pincode: {mockUserAccount.pincode})</strong></div>
      </div>

      {(mockUserAccount.aadhaarFile || mockUserAccount.panFile || mockUserAccount.voterIdFile || mockUserAccount.smartCardFile) && (
        <>
          <div className="user-section-title">KYC Uploaded Documents</div>
          <div className="user-docs-tray" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem', marginTop: '0.75rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}>
            {mockUserAccount.aadhaarFile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Aadhaar Card</span>
                <img src={mockUserAccount.aadhaarFile} alt="Aadhaar KYC" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
              </div>
            )}
            {mockUserAccount.panFile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>PAN Card</span>
                <img src={mockUserAccount.panFile} alt="PAN KYC" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
              </div>
            )}
            {mockUserAccount.voterIdFile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Voter ID</span>
                <img src={mockUserAccount.voterIdFile} alt="Voter ID KYC" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
              </div>
            )}
            {mockUserAccount.smartCardFile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Smart Card</span>
                <img src={mockUserAccount.smartCardFile} alt="Smart Card KYC" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
              </div>
            )}
          </div>
        </>
      )}

      <div className="user-section-title">Personal Statement Ledger</div>
      <div className="statement-table-wrapper">
        <table className="statement-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {mockUserAccount.statement.map((tx) => (
              <tr key={tx.id}>
                <td className="tx-date">{tx.date}</td>
                <td className="tx-desc">{tx.desc}</td>
                <td className={`tx-amt ${tx.type === 'credit' ? 'text-positive' : 'text-negative'}`}>
                  ₹{tx.amount.toLocaleString('en-IN')}
                </td>
                <td className="tx-type">{tx.type.toUpperCase()}</td>
                <td className="tx-status">
                  <span className={`status-pill-user ${tx.status === 'Completed' ? 'success' : tx.status === 'Pending' ? 'pending' : 'neutral'}`}>
                    {tx.status || 'Processed'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserProfileView;
