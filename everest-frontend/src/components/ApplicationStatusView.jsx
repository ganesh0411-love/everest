import React, { useState } from 'react';
import { generateCustomerPDF } from '../utils/pdfGenerator';
import './ApplicationStatusView.css';

const ApplicationStatusView = ({ applications, onApprove, onReject, onMoveToPending }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [previewApp, setPreviewApp] = useState(null);

  const filteredApps = applications.filter(a => a.status === activeTab);

  const renderTable = () => (
    <table className="app-status-table">
      <thead>
        <tr>
          <th>Serial No</th>
          <th>Customer Name</th>
          <th>Center</th>
          <th>Staff Name</th>
          <th>Loan Amount</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {filteredApps.map((app, index) => (
          <tr key={app.id}>
            <td>{index + 1}</td>
            <td>{app.customerName}</td>
            <td>{app.center}</td>
            <td>Admin</td>
            <td>₹{app.loanAmount}</td>
            <td className="actions-cell">
              <button onClick={() => setPreviewApp(app)}>👁️ Preview</button>
              {activeTab !== 'approved' && <button className="accept-btn" onClick={() => onApprove(app.id)}>✅ Accept</button>}
              {activeTab !== 'rejected' && <button className="reject-btn" onClick={() => onReject(app.id)}>❌ Reject</button>}
              {activeTab !== 'pending' && <button className="pending-btn" onClick={() => onMoveToPending(app.id)}>⏳ Pending</button>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="application-status-container">
      <div className="status-tabs">
        <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>
          Pending Queue
        </button>
        <button className={activeTab === 'approved' ? 'active' : ''} onClick={() => setActiveTab('approved')}>
          Approved Queue
        </button>
        <button className={activeTab === 'rejected' ? 'active' : ''} onClick={() => setActiveTab('rejected')}>
          Rejected Queue
        </button>
      </div>
      
      <div className="table-container">
        {filteredApps.length === 0 ? <p>No applications in this queue.</p> : renderTable()}
      </div>

      {previewApp && (
        <div className="pdf-modal-overlay">
          <div className="pdf-modal">
            <div className="pdf-actions">
              <button onClick={() => generateCustomerPDF('pdf-preview-content')}>Download PDF</button>
              <button onClick={() => setPreviewApp(null)}>Close</button>
            </div>
            <div id="pdf-preview-content" className={`pdf-content watermark-${previewApp.status}`} style={{
              width: '210mm', height: '297mm', position: 'relative', padding: '20px', backgroundColor: 'white', boxSizing: 'border-box'
            }}>
              <div className="watermark">{previewApp.status.toUpperCase()}</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 10 }}>
                <img src="/src/assets/hero.png" alt="Logo" style={{ height: '60px', background: 'transparent' }} />
                <div style={{ textAlign: 'right', fontWeight: 'bold' }}>APPLICATION NO: {previewApp.appNumber}</div>
              </div>

              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <div style={{ background: '#333', color: 'white', padding: '10px 20px', borderRadius: '20px', display: 'inline-block', fontWeight: 'bold' }}>
                  APPLICATION FORM
                </div>
                <div style={{ marginTop: '5px', fontSize: '14px' }}>Date: {previewApp.dateOfApp}</div>
              </div>
              
              <div style={{ display: 'flex' }}>
                <div style={{ flex: 1 }}>
                  {[
                    ['Customer Name', previewApp.title + ' ' + previewApp.customerName],
                    ['Customer ID', previewApp.customerId],
                    ['Gender', previewApp.gender],
                    ['Date of Birth', previewApp.dob],
                    ['Age', previewApp.age],
                    ['Occupation', previewApp.occupation],
                    ['Marital status', previewApp.maritalStatus],
                    ['Account status', previewApp.status],
                    ['Phone Number', previewApp.phoneNumber],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', marginBottom: '8px' }}>
                      <div style={{ width: '150px', fontWeight: 'bold' }}>{label}</div>
                      <div style={{ width: '15px' }}>:</div>
                      <div style={{ flex: 1, borderBottom: '1px solid #ccc' }}>{val}</div>
                    </div>
                  ))}
                  
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Alternate Phone Number:</div>
                    <div style={{ border: '1px solid #ccc', padding: '8px' }}>{previewApp.altPhoneNumber}</div>
                  </div>
                </div>
                <div style={{ width: '150px', marginLeft: '20px' }}>
                  {previewApp.profileImage ? (
                    <img src={previewApp.profileImage} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }} alt="Profile" />
                  ) : (
                    <div style={{ width: '120px', height: '120px', border: '1px solid #ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Photo</div>
                  )}
                </div>
              </div>

              <div style={{ position: 'absolute', bottom: '65px', left: '20px', right: '20px' }}>
                {previewApp.locationUrl && (
                  <a href={previewApp.locationUrl} target="_blank" rel="noreferrer" style={{ color: 'lightblue', textDecoration: 'underline', display: 'block', marginBottom: '10px' }}>
                    📍 Click here to view Customer Location on Google Maps
                  </a>
                )}
                <div style={{ borderTop: '2px solid #000', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>Signature of Applicant</div>
                  <div>Signature of Center Manager</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationStatusView;