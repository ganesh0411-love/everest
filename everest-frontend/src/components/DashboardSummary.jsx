import React from 'react';
import './DashboardSummary.css';

const DashboardSummary = ({ customers }) => {
  // EXCLUDE ALL PENDING/REJECTED records from cumulative math! Only APPROVED records contribute.
  const approvedCustomers = (customers || []).filter(c => c.status === 'Approved');
  // Loan Amount card = cumulative Re-pay Amount (the repayment total, not principal disbursed)
  const totalLoanAmount = approvedCustomers.reduce((sum, c) => sum + (parseFloat(c.loanAmount) || 0), 0);
  const totalOutstanding = approvedCustomers.reduce((sum, c) => sum + (parseFloat(c.repayAmount) || 0), 0);

  return (
    <div className="summary-container">
      <div className="summary-card">
        <div className="summary-header">
          <div className="title-group">
            <h2 className="summary-title">Net Balance:</h2>
            <button className="report-btn clickable">
              View Report
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="summary-stats">
          <div className="stat-box give">
            <span className="stat-label">Loan Amount</span>
            <span className="stat-amount text-positive">₹ {totalLoanAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-box get">
            <span className="stat-label">Outstanding</span>
            <span className="stat-amount text-negative">₹ {totalOutstanding.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSummary;
