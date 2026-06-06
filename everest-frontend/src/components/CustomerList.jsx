import React, { useState, useEffect } from 'react';
import AddCustomerModal from './AddCustomerModal';
import './CustomerList.css';

const CustomerList = ({ customers, onSubmitApplication, activeBranch }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const totalPrincipal = customers.reduce((sum, c) => sum + (Number(c.loanAmount) || 0), 0);
  const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.repayAmount) || 0), 0);

  const filteredCustomers = customers.filter(c => {
    // Strictly show only approved profiles
    const isApproved = c.status === 'approved' || c.applicationStatus === 'approved' || c.status === 'Approved';
    if (!isApproved) return false;

    return (c.customerName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
           (c.customerId?.toString().includes(searchQuery)) ||
           (c.phone?.toString().includes(searchQuery));
  });

  return (
    <div className="customer-list-container">
      <div className="dashboard-top-section">
        <div className="net-balance-box">
          <div className="net-balance-header">
            <span className="net-balance-label">Net Balance:</span>
            <button className="view-report-btn">View Report &gt;</button>
          </div>
          <div className="net-balance-metrics">
            <div className="metric">
              <span className="metric-title">Principal</span>
              <span className="metric-value green">₹{totalPrincipal.toLocaleString()}</span>
            </div>
            <div className="metric">
              <span className="metric-title">Outstanding</span>
              <span className="metric-value red">₹{totalOutstanding.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="search-bar-container">
        <input 
          type="text" 
          placeholder="Search Customer" 
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="customer-data-list">
        {filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <img src="/src/assets/hero.png" alt="No Customers" className="empty-state-img" />
          </div>
        ) : (
          <table className="customer-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Loan Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c, i) => (
                <tr key={i}>
                  <td>{c.customerId}</td>
                  <td>{c.customerName}</td>
                  <td>₹{c.loanAmount}</td>
                  <td style={{ position: 'relative' }}>
                    <button onClick={() => setOpenDropdownId(openDropdownId === c.customerId ? null : c.customerId)}>
                      ...
                    </button>
                    {openDropdownId === c.customerId && (
                      <div className="three-dot-dropdown" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 9999, background: 'white', border: '1px solid #ccc', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                        <button style={{ display: 'block', width: '100%', padding: '8px' }}>Edit</button>
                        <button style={{ display: 'block', width: '100%', padding: '8px', color: 'red' }}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button 
        className={`fab-add-customer ${isScrolled ? 'fab-scrolled' : ''}`} 
        onClick={() => setIsAddModalOpen(true)}
      >
        {isScrolled ? '+' : '+ Add Customer'}
      </button>

      {isAddModalOpen && (
        <AddCustomerModal 
          onClose={() => setIsAddModalOpen(false)} 
          onSubmit={(data) => {
            onSubmitApplication({ ...data, branch: activeBranch });
            setIsAddModalOpen(false);
            alert("Success! Waiting for Approval");
          }} 
        />
      )}
    </div>
  );
};

export default CustomerList;