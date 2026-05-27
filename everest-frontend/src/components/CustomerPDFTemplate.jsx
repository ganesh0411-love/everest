import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './CustomerPDFTemplate.css';

export const generateAndOpenPDF = async (elementId, customerName) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.style.display = 'block';
  
  try {
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    window.open(pdf.output('bloburl'), '_blank');
  } catch (err) {
    console.error("PDF Gen Failed", err);
    alert("Error generating PDF");
  } finally {
    element.style.display = 'none';
  }
};

const CustomerPDFTemplate = ({ customer, status = 'PENDING', id = 'pdf-template' }) => {
  if (!customer) return null;

  let watermarkColor = 'rgba(0, 0, 0, 0.05)';
  if (status === 'APPROVED') watermarkColor = 'rgba(16, 185, 129, 0.05)'; // Green
  if (status === 'REJECTED') watermarkColor = 'rgba(239, 68, 68, 0.05)'; // Red

  return (
    <div id={id} className="pdf-template-wrapper">
      <div className="pdf-watermark" style={{ color: watermarkColor }}>{status}</div>
      <div className="pdf-header">
        <h1>Customer Application Report</h1>
        <p><strong>App Number:</strong> {customer.details.appNumber} | <strong>Center:</strong> {customer.details.center}</p>
      </div>
      <div className="pdf-profile-row">
        {customer.details.imageUri ? (
          <img src={customer.details.imageUri} alt="Avatar" className="pdf-avatar" crossOrigin="anonymous" />
        ) : (
          <div className="pdf-avatar-placeholder">No Image</div>
        )}
        <div className="pdf-profile-info">
          <h2>{customer.name}</h2>
          <p><strong>ID:</strong> {customer.id}</p>
          <p><strong>Date:</strong> {customer.details.dateOfApp}</p>
        </div>
      </div>
      <table className="pdf-table">
        <tbody>
          <tr><td><strong>Gender</strong></td><td>{customer.details.gender}</td><td><strong>Status</strong></td><td>{customer.details.status}</td></tr>
          <tr><td><strong>DOB</strong></td><td>{customer.details.dob} (Age: {customer.details.age})</td><td><strong>Marital Status</strong></td><td>{customer.details.maritalStatus}</td></tr>
          <tr><td><strong>Occupation</strong></td><td>{customer.details.occupation}</td><td><strong>Address</strong></td><td>{customer.details.address} ({customer.details.pincode})</td></tr>
          <tr><td><strong>Nominee</strong></td><td>{customer.details.nomineeName} ({customer.details.nomineeRelation})</td><td><strong>PAN</strong></td><td>{customer.details.pan}</td></tr>
          <tr><td><strong>Aadhaar</strong></td><td colSpan="3">{customer.details.aadhaar}</td></tr>
        </tbody>
      </table>
      <h3 className="pdf-section-title">Financial Details</h3>
      <table className="pdf-table">
        <tbody>
          <tr><td><strong>Loan Type</strong></td><td>{customer.details.loanType}</td><td><strong>Tenure</strong></td><td>{customer.details.tenure} {customer.details.tenureUnit}</td></tr>
          <tr><td><strong>Loan Amount</strong></td><td>₹{customer.details.loanAmount}</td><td><strong>Interest</strong></td><td>{customer.details.interest}%</td></tr>
        </tbody>
      </table>
    </div>
  );
};

export default CustomerPDFTemplate;
