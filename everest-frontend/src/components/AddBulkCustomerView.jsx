import React, { useState, useRef } from 'react';
import './ModuleBoilerplate.css';

const AddBulkCustomerView = () => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewRows] = useState([
    { sno: 1, name: 'Priya Sharma', center: 'Ward 3', loanAmount: 10000 },
    { sno: 2, name: 'Rekha Devi', center: 'Sector 2', loanAmount: 15000 },
    { sno: 3, name: 'Lalitha Bai', center: 'Village 1', loanAmount: 8000 },
  ]);
  const fileRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadedFile(file);
  };

  return (
    <div className="module-view">
      <div className="module-header">
        <div>
          <h2>📥 Add Bulk Customer</h2>
          <p>Upload a CSV or Excel file to onboard multiple customers simultaneously.</p>
        </div>
        <button className="module-primary-btn">Download Template</button>
      </div>

      {/* Drop Zone */}
      <div
        className={`bulk-dropzone ${dragOver ? 'drag-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => setUploadedFile(e.target.files[0])}
        />
        <div className="dropzone-icon">📄</div>
        {uploadedFile ? (
          <>
            <p className="dropzone-filename">{uploadedFile.name}</p>
            <p className="dropzone-sub">Click to replace</p>
          </>
        ) : (
          <>
            <p className="dropzone-title">Drag & drop your CSV / Excel file here</p>
            <p className="dropzone-sub">or click to browse files</p>
          </>
        )}
      </div>

      {/* Accepted format hints */}
      <div className="bulk-format-hints">
        <span>Accepted: .csv, .xlsx, .xls</span>
        <span>Max size: 5 MB</span>
        <span>Max rows: 500</span>
      </div>

      {/* Preview Table */}
      <div className="module-section-label">Preview (Sample)</div>
      <div className="module-table-wrapper">
        <table className="module-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Customer Name</th>
              <th>Center</th>
              <th>Loan Amount</th>
              <th>Validation</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map(r => (
              <tr key={r.sno}>
                <td className="muted">{r.sno}</td>
                <td><strong>{r.name}</strong></td>
                <td className="muted">{r.center}</td>
                <td>₹{r.loanAmount.toLocaleString('en-IN')}</td>
                <td><span className="module-pill pill-green">✓ Valid</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="module-footer-actions">
        <button className="module-primary-btn" disabled={!uploadedFile}>
          Upload & Process
        </button>
      </div>

      <div className="module-placeholder-note">
        🔧 CSV parsing, field mapping, and server-side ingestion will be configured in the next update.
      </div>
    </div>
  );
};

export default AddBulkCustomerView;
