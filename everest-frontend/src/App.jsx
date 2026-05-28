import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import NetBalanceCard from './components/NetBalanceCard';
import SearchBar from './components/SearchBar';
import EmptyState from './components/EmptyState';
import FloatingActionButton from './components/FloatingActionButton';
import Footer from './components/Footer';
import { 
  Centers, 
  AddBulkCustomer, 
  StaffManagement, 
  DashboardOverview, 
  CustomerKYCUpdate, 
  RecycleBin 
} from './components/Placeholders';
import ApplicationStatus from './components/ApplicationStatus';
import AddCustomerModal from './components/AddCustomerModal';

function App() {
  const [customers, setCustomers] = useState([]);
  const [isDbLoading, setIsDbLoading] = useState(true);

  useEffect(() => {
    // ASYNCHRONOUS DATABASE LOAD & SAFE NULL CHECK
    const initDatabase = async () => {
      // Small artificial delay to show the splash screen smoothly
      await new Promise(resolve => setTimeout(resolve, 800));
      
      try {
        const dbVersion = localStorage.getItem('everest_db_version');
        const REQUIRED_VERSION = '1.0.6';

        if (dbVersion !== REQUIRED_VERSION) {
          // HARD RESET LOCAL STORAGE BIAS: Clear corrupt legacy keys/schemas
          localStorage.removeItem('everest_customers');
          localStorage.setItem('everest_db_version', REQUIRED_VERSION);
          setCustomers([]);
        } else {
          const saved = localStorage.getItem('everest_customers');
          if (saved) {
            const parsed = JSON.parse(saved);
            // Strictly ensure it's an array to prevent white screen crashes
            if (Array.isArray(parsed)) {
              setCustomers(parsed);
            } else {
              setCustomers([]);
            }
          } else {
            setCustomers([]);
          }
        }
      } catch (error) {
        console.error("Database Init Error Caught:", error);
        setCustomers([]);
      } finally {
        setIsDbLoading(false);
      }
    };

    initDatabase();
  }, []);

  useEffect(() => {
    if (!isDbLoading) {
      localStorage.setItem('everest_customers', JSON.stringify(customers));
    }
  }, [customers, isDbLoading]);

  const [currentView, setCurrentView] = useState('Customer');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [activeHomeMenuId, setActiveHomeMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveHomeMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  // Filter & Sort State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSort, setActiveSort] = useState('Recent');
  
  // Temp state for the modal before applying
  const [tempCategory, setTempCategory] = useState('All');
  const [tempSort, setTempSort] = useState('Recent');

  const handleScroll = (e) => {
    if (e.target.scrollTop > 50) {
      if (!isScrolled) setIsScrolled(true);
    } else {
      if (isScrolled) setIsScrolled(false);
    }
  };

  const openFilter = () => {
    setTempCategory(activeCategory);
    setTempSort(activeSort);
    setIsFilterOpen(true);
  };

  const applyFilter = () => {
    setActiveCategory(tempCategory);
    setActiveSort(tempSort);
    setIsFilterOpen(false);
  };

  const clearFilter = () => {
    setActiveCategory('All');
    setActiveSort('Recent');
    setIsFilterOpen(false);
  };

  // Process Customers List
  const processedCustomers = useMemo(() => {
    let filtered = [...customers];
    
    if (activeCategory !== 'All') {
      filtered = filtered.filter(c => c.category === activeCategory);
    }

    filtered.sort((a, b) => {
      switch (activeSort) {
        case 'Recent':
          return new Date(b.date) - new Date(a.date);
        case 'Oldest':
          return new Date(a.date) - new Date(b.date);
        case 'Highest Amount':
          return b.loanAmount - a.loanAmount;
        case 'Least Amount':
          return a.loanAmount - b.loanAmount;
        case 'By Name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [activeCategory, activeSort]);

  // Aggregate Financials (Dynamic Based on UI Stream)
  const { totalLoan, totalOutstanding } = useMemo(() => {
    const activeStream = processedCustomers.filter(c => c.status !== 'Rejected' && c.status !== 'Recycled');
    return activeStream.reduce((acc, curr) => {
      const repay = parseFloat(curr.repayAmount) || 0;
      acc.totalLoan += repay;
      acc.totalOutstanding += repay;
      return acc;
    }, { totalLoan: 0, totalOutstanding: 0 });
  }, [processedCustomers]);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d)) return dateString;
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const renderView = () => {
    switch(currentView) {
      case 'Centers': return <div className="flex-1 overflow-y-auto"><Centers /></div>;
      case 'Add Bulk Customer': return <div className="flex-1 overflow-y-auto"><AddBulkCustomer /></div>;
      case 'Staff Management': return <div className="flex-1 overflow-y-auto"><StaffManagement /></div>;
      case 'Dashboard Overview': return <div className="flex-1 overflow-y-auto"><DashboardOverview /></div>;
      case 'Customer KYC Update': return <div className="flex-1 overflow-y-auto"><CustomerKYCUpdate /></div>;
      case 'Application Status': 
        return (
          <div className="flex-1 overflow-y-auto">
            <ApplicationStatus 
              applications={customers}
              onUpdateStatus={(id, newStatus) => {
                setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
              }}
              onDeleteApp={(id) => {
                if (window.confirm('Are you sure you want to delete this application?')) {
                  setCustomers(prev => prev.filter(c => c.id !== id));
                }
              }}
              onUpdateCustomer={(updatedCustomer) => {
                setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
              }}
            />
          </div>
        );
      case 'Recycle Bin': return <div className="flex-1 overflow-y-auto"><RecycleBin /></div>;
      case 'Change Password':
      case 'Change Phone Number':
        return (
          <div className="flex-1 overflow-y-auto p-6 text-center">
            <h2 className="text-xl font-bold">{currentView}</h2>
            <p className="mt-2 text-slate-500">Settings placeholder view.</p>
          </div>
        );
      case 'Customer':
      default:
        return (
          <>
            <div className="flex-shrink-0 z-30 bg-[#f8fafc] pb-2">
              <NetBalanceCard loanAmount={totalLoan} outstanding={totalOutstanding} />
              <SearchBar onFilterClick={openFilter} />
            </div>
            
            <main 
              className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto bg-white"
              onScroll={handleScroll}
            >
              {processedCustomers.filter(c => c.status !== 'Rejected').length > 0 ? (
                <div className="p-2 space-y-2 pb-24">
                  {processedCustomers.filter(c => c.status !== 'Rejected' && c.status !== 'Recycled').map(customer => (
                    <div key={customer.id} className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm flex justify-between items-center hover:bg-slate-50 transition-colors relative">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">
                          <img src={customer.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&background=random`} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight">{customer.name}</h4>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">{customer.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right min-w-[70px]">
                          <div className="text-sm font-bold text-red-600">₹{customer.repayAmount?.toLocaleString('en-IN') || '0'}</div>
                        </div>
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setActiveHomeMenuId(activeHomeMenuId === customer.id ? null : customer.id); }} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          {activeHomeMenuId === customer.id && (
                            <div className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-lg border border-slate-100 z-50 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => {
                                  setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, status: 'Recycled' } : c));
                                  setActiveHomeMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </main>
            
            <div onClick={() => setIsAddCustomerOpen(true)}>
              <FloatingActionButton isScrolled={isScrolled} />
            </div>
          </>
        );
    }
  };

  if (isDbLoading) {
    return (
      <div className="h-[100dvh] bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
        {/* Abstract Corporate Background Elements */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-brand-blue/20 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full"></div>
        
        {/* Core Splash Content */}
        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-2xl flex items-center justify-center mb-6 border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-1 tracking-wider text-white">EVEREST</h1>
          <p className="text-slate-400 text-sm mb-12 font-medium tracking-widest uppercase">Micro Finance</p>
          
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-3 border-slate-700 border-t-emerald-400 rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-widest animate-pulse">Initializing Database...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-[#f8fafc] flex flex-col overflow-hidden relative">
      <Header currentView={currentView} setCurrentView={setCurrentView} />
      
      {renderView()}

      {/* Filter Modal Overlay */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex flex-col justify-end animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Filter & Sort</h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">FILTER BY CATEGORY</h4>
                <div className="flex flex-wrap gap-2">
                  {['All', 'Settled', 'Due Date', 'Upcoming'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setTempCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${tempCategory === cat ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">SORT BY VALUES</h4>
                <div className="flex flex-col gap-2">
                  {['Recent', 'Oldest', 'Highest Amount', 'Least Amount', 'By Name'].map(sort => (
                    <label key={sort} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                      <span className="text-sm font-semibold text-slate-700">{sort}</span>
                      <input 
                        type="radio" 
                        name="sort" 
                        checked={tempSort === sort} 
                        onChange={() => setTempSort(sort)} 
                        className="w-4 h-4 text-brand-blue"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex gap-3 pb-safe bg-white">
              <button 
                onClick={clearFilter}
                className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Clear Filter
              </button>
              <button 
                onClick={applyFilter}
                className="flex-[2] py-3 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddCustomerOpen && (
        <AddCustomerModal 
          onClose={() => setIsAddCustomerOpen(false)} 
          onAddCustomer={(newCustomer) => {
            setCustomers(prev => [newCustomer, ...prev]);
          }}
        />
      )}

      {/* Adjust footer to not overlap with bottom content by rendering it directly in the flex column */}
      <div className="flex-shrink-0 z-40 relative">
        <Footer currentView={currentView} setCurrentView={setCurrentView} />
      </div>
    </div>
  );
}

export default App;
