import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DashboardSummary from './components/DashboardSummary';
import CustomerList from './components/CustomerList';
import BottomNav from './components/BottomNav';
import FloatingActionButton from './components/FloatingActionButton';
import AdminMenu from './components/AdminMenu';
import SplashVideo from './components/SplashVideo';
import AddCustomerModal from './components/AddCustomerModal';
import ApplicationStatusView from './components/ApplicationStatusView';
import CustomerGroupsView from './components/CustomerGroupsView';
import AddBulkCustomerView from './components/AddBulkCustomerView';
import StaffManagementView from './components/StaffManagementView';
import LoginScreen from './components/LoginScreen';
import UserProfileView from './components/UserProfileView';
import RecycleBinView from './components/RecycleBinView';
import usePersistentState from './hooks/usePersistentState';
import { saveToCloud, loadFromCloud } from './services/cloudSync';
import { App as CapApp } from '@capacitor/app';
import './index.css';
import './App.css';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [branches, setBranches] = useState([{ id: 1, name: 'Main Branch' }]);
  const [activeBranchId, setActiveBranchId] = useState(1);
  const [activeView, setActiveView] = useState('dashboard');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // ── USER AUTH STATE ───────────────────────────────────────────────
  const [user, setUser] = usePersistentState('everest_user', null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('synced');

  // Back button exit constraint states
  const [backToast, setBackToast] = useState('');
  const [lastBackPress, setLastBackPress] = useState(0);

  // ── PERSISTENT STATE (survives APK rebuilds & reloads) ──────────
  const [customers, setCustomers] = usePersistentState('everest_customers', []);
  const [pendingApplications, setPendingApplications] = usePersistentState('everest_pending', []);
  const [approvedApplications, setApprovedApplications] = usePersistentState('everest_approved', []);
  const [rejectedApplications, setRejectedApplications] = usePersistentState('everest_rejected', []);
  const [recycledCustomers, setRecycledCustomers] = usePersistentState('everest_recycled', []);

  const activeBranch = branches.find(b => b.id === activeBranchId) || branches[0];

  const handleAddBranch = (branchName) => {
    if (!branchName || branchName.trim() === '') return;
    const newBranch = { id: Date.now(), name: branchName.trim() };
    setBranches([...branches, newBranch]);
    setActiveBranchId(newBranch.id);
  };

  // ── CLOUD SYNC ON LOGIN ─────────────────────────────────────────
  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'Admin') {
      setCloudSyncStatus('syncing');
      loadFromCloud(loggedInUser.email)
        .then((cloudData) => {
          if (cloudData) {
            if (cloudData.customers) setCustomers(cloudData.customers);
            if (cloudData.pending) setPendingApplications(cloudData.pending);
            if (cloudData.approved) setApprovedApplications(cloudData.approved);
            if (cloudData.rejected) setRejectedApplications(cloudData.rejected);
          }
          setCloudSyncStatus('synced');
        })
        .catch((err) => {
          console.error("Cloud data pull failed:", err);
          setCloudSyncStatus('error');
        });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveView('dashboard');
  };

  // ── REAL-TIME CLOUD AUTO-SYNC (DEBOUNCED) ──────────────────────
  useEffect(() => {
    if (user?.role === 'Admin') {
      setCloudSyncStatus('syncing');
      const syncTimeout = setTimeout(() => {
        saveToCloud(user.email, {
          customers,
          pending: pendingApplications,
          approved: approvedApplications,
          rejected: rejectedApplications
        })
          .then((res) => {
            if (res) setCloudSyncStatus('synced');
            else setCloudSyncStatus('error');
          })
          .catch((err) => {
            console.error("Cloud sync save failed:", err);
            setCloudSyncStatus('error');
          });
      }, 1000); // 1-second debounce
      return () => clearTimeout(syncTimeout);
    }
  }, [customers, pendingApplications, approvedApplications, rejectedApplications, user]);

  // Enforce operational view restriction for Staff (dashboard, application-status, recycle-bin are allowed)
  useEffect(() => {
    const allowedStaffViews = ['dashboard', 'application-status', 'recycle-bin'];
    if (user?.role === 'Staff' && !allowedStaffViews.includes(activeView)) {
      setActiveView('dashboard');
    }
  }, [user, activeView]);

  // Back Button exit constraints and Home redirection
  useEffect(() => {
    let toastTimeout;
    if (backToast) {
      toastTimeout = setTimeout(() => {
        setBackToast('');
      }, 2000);
    }
    return () => clearTimeout(toastTimeout);
  }, [backToast]);

  useEffect(() => {
    if (!CapApp) return;

    const handleBackButton = async () => {
      // 1. If AddCustomerModal is open, close it first
      if (isAddCustomerOpen) {
        setIsAddCustomerOpen(false);
        setEditingCustomer(null);
        return;
      }

      // 2. If user is on any other page than dashboard (Home Page), redirect to dashboard first
      if (activeView !== 'dashboard') {
        setActiveView('dashboard');
        return;
      }

      // 3. If user is on Home Page, double-tap back button to exit
      const now = Date.now();
      if (now - lastBackPress < 2000) {
        CapApp.exitApp();
      } else {
        setLastBackPress(now);
        setBackToast('Press again to exit');
      }
    };

    let sub;
    try {
      sub = CapApp.addListener('backButton', handleBackButton);
    } catch (err) {
      console.warn("Capacitor BackButton listener not active in web browser environment:", err);
    }

    return () => {
      if (sub) {
        sub.then(listener => listener.remove()).catch(() => {});
      }
    };
  }, [activeView, isAddCustomerOpen, lastBackPress]);

  const handleSavePendingCustomer = (newCustomer) => {
    const existingRecord = customers.find(c => c.id === newCustomer.id);
    if (existingRecord) {
      // EDIT MODE: Preserve the original pendingStatus — do NOT reset to PENDING
      const updatedCustomer = {
        ...newCustomer,
        pendingStatus: newCustomer.pendingStatus || existingRecord.pendingStatus || 'PENDING'
      };
      setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      setPendingApplications(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      setApprovedApplications(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      setRejectedApplications(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    } else {
      // NEW RECORD: Assign initial PENDING status
      const customerWithStatus = { ...newCustomer, pendingStatus: 'PENDING' };
      setPendingApplications(prev => [...prev, customerWithStatus]);
      setCustomers(prev => [customerWithStatus, ...prev]);
    }
    setEditingCustomer(null);
  };

  const handleApprove = (customer) => {
    const approved = { ...customer, pendingStatus: 'APPROVED' };
    setPendingApplications(prev => prev.filter(c => c.id !== customer.id));
    setApprovedApplications(prev => [...prev, approved]);
    setCustomers(prev => prev.map(c => c.id === customer.id ? approved : c));
  };

  const handleReject = (customer) => {
    const rejected = { ...customer, pendingStatus: 'REJECTED' };
    setPendingApplications(prev => prev.filter(c => c.id !== customer.id));
    setRejectedApplications(prev => [...prev, rejected]);
    setCustomers(prev => prev.map(c => c.id === customer.id ? rejected : c));
  };

  const handleMoveToRePending = (customer) => {
    const rePending = { ...customer, pendingStatus: 'PENDING' };
    // Remove from both approved and rejected queues
    setApprovedApplications(prev => prev.filter(c => c.id !== customer.id));
    setRejectedApplications(prev => prev.filter(c => c.id !== customer.id));
    // Add back to pending queue
    setPendingApplications(prev => [rePending, ...prev.filter(c => c.id !== customer.id)]);
    setCustomers(prev => prev.map(c => c.id === customer.id ? rePending : c));
  };

  const handleMoveToApproved = (customer) => {
    const approved = { ...customer, pendingStatus: 'APPROVED' };
    // Remove from rejected queue
    setRejectedApplications(prev => prev.filter(c => c.id !== customer.id));
    setPendingApplications(prev => prev.filter(c => c.id !== customer.id));
    setApprovedApplications(prev => [approved, ...prev.filter(c => c.id !== customer.id)]);
    setCustomers(prev => prev.map(c => c.id === customer.id ? approved : c));
  };

  const handleDeleteCustomer = (customer) => {
    const recycledObj = {
      ...customer,
      deletedTimestamp: Date.now()
    };
    setRecycledCustomers(prev => [recycledObj, ...prev]);

    setCustomers(prev => prev.filter(c => c.id !== customer.id));
    setPendingApplications(prev => prev.filter(c => c.id !== customer.id));
    setApprovedApplications(prev => prev.filter(c => c.id !== customer.id));
    setRejectedApplications(prev => prev.filter(c => c.id !== customer.id));
  };

  const handleRestoreCustomer = (customer) => {
    setRecycledCustomers(prev => prev.filter(c => c.id !== customer.id));

    const restoredCustomer = { ...customer };
    delete restoredCustomer.deletedTimestamp;

    setCustomers(prev => [restoredCustomer, ...prev]);
    
    if (restoredCustomer.pendingStatus === 'APPROVED') {
      setApprovedApplications(prev => [restoredCustomer, ...prev]);
    } else if (restoredCustomer.pendingStatus === 'REJECTED') {
      setRejectedApplications(prev => [restoredCustomer, ...prev]);
    } else {
      restoredCustomer.pendingStatus = restoredCustomer.pendingStatus || 'PENDING';
      setPendingApplications(prev => [restoredCustomer, ...prev]);
    }
  };

  const handlePermanentDeleteCustomer = (customer) => {
    setRecycledCustomers(prev => prev.filter(c => c.id !== customer.id));
  };

  const handleMenuSelect = (menuName) => {
    const map = {
      'Customer': 'dashboard',
      'Application Status': 'application-status',
      'Groups': 'groups',
      'Add Bulk Customer': 'bulk-customer',
      'Staff Management': 'staff-management',
      'Recycle Bin': 'recycle-bin',
      'Dashboard Overview': 'dashboard',
      'Customer KYC Update': 'dashboard',
      'Settings': 'dashboard'
    };
    if (map[menuName]) {
      setActiveView(map[menuName]);
    }
  };

  const activeCustomers = customers.filter(c => 
    c.branchId === activeBranchId && 
    (c.pendingStatus === 'APPROVED' || c.pendingStatus === 'PENDING')
  );

  // If splash is loading, show splash only
  if (showSplash) {
    return <SplashVideo onComplete={() => setShowSplash(false)} />;
  }

  // If no active session, show Login Screen
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <Header
        branches={branches}
        activeBranch={activeBranch}
        onSelectBranch={setActiveBranchId}
        onAddBranch={handleAddBranch}
        user={user}
        onLogout={handleLogout}
        cloudSyncStatus={cloudSyncStatus}
        onSelectMenu={handleMenuSelect}
      />
      <div className="main-content">
        {user.role === 'User' ? (
          <UserProfileView user={user} onLogout={handleLogout} customers={customers} />
        ) : (
          <div className="dashboard-grid" style={{ gridTemplateColumns: user.role === 'Admin' ? '260px 1fr' : '1fr' }}>
            {user.role === 'Admin' && (
              <div className="summary-section desktop-only">
                <AdminMenu
                  pendingCount={pendingApplications.length}
                  onSelectMenu={handleMenuSelect}
                />
              </div>
            )}
            <div className="ledger-section" style={{ width: '100%', maxWidth: '100%' }}>
              {activeView === 'dashboard' && (
                <>
                  <DashboardSummary customers={activeCustomers} />
                  <CustomerList 
                    customers={activeCustomers} 
                    onScrollChange={setIsScrolled} 
                    onEditCustomer={(customer) => { setEditingCustomer(customer); setIsAddCustomerOpen(true); }}
                    onDeleteCustomer={handleDeleteCustomer}
                  />
                </>
              )}
              {activeView === 'application-status' && (user.role === 'Admin' || user.role === 'Staff') && (
                <ApplicationStatusView
                  pendingApplications={pendingApplications}
                  approvedApplications={approvedApplications}
                  rejectedApplications={rejectedApplications}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onMoveToRePending={handleMoveToRePending}
                  onMoveToApproved={handleMoveToApproved}
                  onEditCustomer={(customer) => { setEditingCustomer(customer); setIsAddCustomerOpen(true); }}
                  onDeleteCustomer={handleDeleteCustomer}
                  userRole={user.role}
                />
              )}
              {activeView === 'recycle-bin' && (user.role === 'Admin' || user.role === 'Staff') && (
                <RecycleBinView
                  recycledCustomers={recycledCustomers}
                  onRestore={handleRestoreCustomer}
                  onPermanentDelete={handlePermanentDeleteCustomer}
                  userRole={user.role}
                />
              )}
              {activeView === 'groups' && user.role === 'Admin' && <CustomerGroupsView />}
              {activeView === 'bulk-customer' && user.role === 'Admin' && <AddBulkCustomerView />}
              {activeView === 'staff-management' && user.role === 'Admin' && <StaffManagementView />}
            </div>
          </div>
        )}
        
        {/* Floating Action Button - Only visible on Home Page, collapses on scroll, restricted to Admin & Staff */}
        {activeView === 'dashboard' && user.role !== 'User' && (
          <FloatingActionButton 
            onClick={() => setIsAddCustomerOpen(true)} 
            isScrolled={isScrolled} 
          />
        )}
        
        <BottomNav
          activeView={activeView}
          onNavigate={setActiveView}
          userRole={user.role}
        />
      </div>

      {isAddCustomerOpen && (
        <AddCustomerModal
          onClose={() => {
            setIsAddCustomerOpen(false);
            setEditingCustomer(null);
            setActiveView('dashboard');
          }}
          onSave={handleSavePendingCustomer}
          customers={customers}
          editCustomer={editingCustomer}
        />
      )}

      {backToast && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(27, 42, 96, 0.95)',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '24px',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 9999999,
          border: '1.5px solid #03a9f4',
          fontFamily: 'sans-serif',
          letterSpacing: '0.5px'
        }}>
          {backToast}
        </div>
      )}
    </div>
  );
}

export default App;
