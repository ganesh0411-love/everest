import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { Search, X, CheckSquare, Square, Trash2, ListChecks, RefreshCcw } from 'lucide-react';

const RecycleBinView = ({ customers = [], onRestore, onPermanentDelete, onRestoreEntry, onPermanentDeleteEntry }) => {
  const [activeTab, setActiveTab] = useState('customers');
  const [recycledStaff, setRecycledStaff] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  
  const recycledCustomers = customers.filter(c => c.status === 'Recycled' || c.isDeleted === true);
  const recycledEntries = customers.flatMap(c => 
    (c.deletedInstallments || []).map(entry => ({
      ...entry,
      customerId: c.id,
      customerName: c.name || c.customerName,
      entryId: entry.id
    }))
  ).sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));

  useEffect(() => {
    const q = query(collection(db, 'staff'), where('status', '==', 'Recycled'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      staffList.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));
      setRecycledStaff(staffList);
    });
    return () => unsubscribe();
  }, []);

  const filteredCustomers = recycledCustomers.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (c.customerName && c.customerName.toLowerCase().includes(q)) || (c.name && c.name.toLowerCase().includes(q)) || (c.fileNo && c.fileNo.toLowerCase().includes(q)) || (c.mobile && String(c.mobile).includes(q));
  });

  const filteredEntries = recycledEntries.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (e.customerName && e.customerName.toLowerCase().includes(q)) || (e.receiptNo && String(e.receiptNo).toLowerCase().includes(q));
  });

  const filteredStaff = recycledStaff.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name && s.name.toLowerCase().includes(q);
  });

  const currentData = activeTab === 'customers' ? filteredCustomers : (activeTab === 'entries' ? filteredEntries : filteredStaff);

  const handleBulkRestore = async () => {
    if (selectedItems.length === 0) return;
    if (activeTab === 'customers') {
      for (const id of selectedItems) {
        const c = recycledCustomers.find(x => x.id === id);
        if (c) await onRestore(id, c.previousStatus || 'Pending');
      }
    } else if (activeTab === 'entries') {
      for (const id of selectedItems) {
        const e = recycledEntries.find(x => x.entryId === id);
        if (e) await onRestoreEntry(e.customerId, e.entryId);
      }
    } else if (activeTab === 'staff') {
      for (const id of selectedItems) {
        const staff = recycledStaff.find(x => x.id === id);
        if (staff) {
          const targetDocId = staff.docId || staff.uid || staff.id;
          await updateDoc(doc(db, 'staff', targetDocId), {
            status: staff.previousStatus || 'Active',
            deletedAt: null
          });
        }
      }
      setRecycledStaff(prev => prev.filter(s => !selectedItems.includes(s.id)));
    }
    setSelectedItems([]);
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm('Permanently delete selected items?')) return;
    if (activeTab === 'customers') {
      for (const id of selectedItems) {
        await onPermanentDelete(id);
      }
    } else if (activeTab === 'entries') {
      for (const id of selectedItems) {
        const e = recycledEntries.find(x => x.entryId === id);
        if (e) await onPermanentDeleteEntry(e.customerId, e.entryId);
      }
    } else if (activeTab === 'staff') {
      for (const id of selectedItems) {
        const staff = recycledStaff.find(x => x.id === id);
        if (staff) {
          const targetDocId = staff.docId || staff.uid || staff.id;
          await deleteDoc(doc(db, 'staff', targetDocId));
          await deleteDoc(doc(db, 'users', targetDocId)).catch(() => {});
        }
      }
      setRecycledStaff(prev => prev.filter(s => !selectedItems.includes(s.id)));
    }
    setSelectedItems([]);
    setIsSelectionMode(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const d = new Date(timestamp);
    if (isNaN(d)) return timestamp;
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const handleRestoreStaff = async (e, staff) => {
    e.stopPropagation();
    const targetDocId = staff.docId || staff.uid || staff.id;
    try {
      await updateDoc(doc(db, 'staff', targetDocId), {
        status: staff.previousStatus || 'Active',
        deletedAt: null
      });
      setRecycledStaff(prev => prev.filter(s => (s.docId || s.uid || s.id) !== targetDocId));
      alert('Staff restored successfully.');
    } catch (err) {
      console.error('Restore failed:', err);
      alert(`Failed to restore: ${err.message}`);
    }
  };

  const handlePermanentDeleteStaff = async (e, staff) => {
    e.stopPropagation();
    if (!window.confirm(`Permanently delete ${staff.name}? This cannot be undone.`)) return;

    const targetDocId = staff.docId || staff.uid || staff.id;
    try {
      await deleteDoc(doc(db, 'staff', targetDocId));
      await deleteDoc(doc(db, 'users', targetDocId)).catch(() => {});
      setRecycledStaff(prev => prev.filter(s => (s.docId || s.uid || s.id) !== targetDocId));
      alert('Staff deleted permanently.');
    } catch (err) {
      console.error('Delete failed:', err);
      alert(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="w-full flex-1 max-w-4xl mx-auto bg-[#f8fafc] min-h-full flex flex-col p-4 animate-in fade-in duration-300">
      {/* Top Header / Action Bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-4 sticky top-0 bg-[#f8fafc] z-20 py-2">
        {/* Tab Buttons */}
        <div className="flex gap-2 bg-slate-200/50 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'customers' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Customer Profiles
          </button>
          <button 
            onClick={() => setActiveTab('entries')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'entries' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Ledger Entries
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'staff' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Staff Profiles
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 md:ml-auto w-full md:w-auto h-10">
          {!isSelectionMode ? (
            <div className="flex items-center justify-between w-full md:w-auto">
              {/* Search Toggle */}
              <div className="flex-1 relative flex items-center md:justify-end">
                <div className={`flex items-center bg-slate-100 rounded-full transition-all duration-300 overflow-hidden ${isSearchActive ? 'w-full md:w-64 px-3 py-1.5' : 'w-10 h-10 justify-center cursor-pointer hover:bg-slate-200'}`}>
                  <Search 
                    className={`w-5 h-5 text-slate-500 ${!isSearchActive && 'hover:text-slate-800'}`} 
                    onClick={() => !isSearchActive && setIsSearchActive(true)}
                  />
                  {isSearchActive && (
                    <>
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Search..." 
                        className="bg-transparent border-none outline-none text-sm font-semibold text-slate-800 ml-2 w-full placeholder-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <button onClick={() => { setIsSearchActive(false); setSearchQuery(''); }} className="p-1 hover:bg-slate-200 rounded-full ml-1 shrink-0">
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setIsSelectionMode(true)}
                className="ml-3 flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-slate-200"
              >
                <ListChecks className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 w-full bg-indigo-50 md:bg-transparent p-2 md:p-0 rounded-xl md:rounded-none h-10 animate-in slide-in-from-top-2">
              <button 
                onClick={() => { setIsSelectionMode(false); setSelectedItems([]); }}
                className="text-sm font-bold text-slate-600 hover:text-slate-800 md:mr-2 shrink-0"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (selectedItems.length === currentData.length && currentData.length > 0) {
                    setSelectedItems([]);
                  } else {
                    setSelectedItems(currentData.map(item => item.id || item.entryId));
                  }
                }}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
              >
                {selectedItems.length === currentData.length && currentData.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
              
              {selectedItems.length > 0 && (
                <div className="flex gap-2 ml-auto">
                  <button 
                    onClick={handleBulkRestore}
                    className="flex items-center justify-center w-10 h-10 md:w-auto md:px-3 md:py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors shadow-sm shrink-0"
                    title="Restore Selected"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    <span className="hidden md:inline ml-1.5">Restore</span>
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center justify-center w-10 h-10 md:w-auto md:px-3 md:py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-bold transition-colors shadow-sm shrink-0"
                    title="Delete Permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden md:inline ml-1.5">Delete</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'customers' ? (
        filteredCustomers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <p className="font-semibold text-slate-500">No deleted customer profiles</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
              <div className="col-span-2 text-center">S.No</div>
              <div className="col-span-3 text-left">Deleted Date</div>
              <div className="col-span-4 text-left">Customer Name</div>
              <div className="col-span-3 text-center"></div>
            </div>
            
            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto pb-32">
              {filteredCustomers.map((customer, index) => (
                <div 
                  key={customer.id} 
                  className={`grid grid-cols-12 gap-2 p-3 items-center transition-colors select-none ${selectedItems.includes(customer.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'} ${isSelectionMode ? 'cursor-pointer' : ''}`}
                  onClick={(e) => {
                    if (isSelectionMode) {
                      e.stopPropagation();
                      setSelectedItems(prev => prev.includes(customer.id) ? prev.filter(id => id !== customer.id) : [...prev, customer.id]);
                    }
                  }}
                >
                  <div className="col-span-2 flex items-center justify-center text-sm font-semibold text-slate-400" onClick={(e) => {
                    if (!isSelectionMode) { e.stopPropagation(); setIsSelectionMode(true); setSelectedItems([customer.id]); }
                  }}>
                    {isSelectionMode ? (
                      selectedItems.includes(customer.id) ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-slate-300" />
                    ) : (index + 1)}
                  </div>
                  <div className="col-span-3 text-left text-xs font-medium text-slate-600">
                    {formatDate(customer.lastUpdated || customer.deletedAt)}
                  </div>
                  <div className="col-span-4 text-left text-sm font-bold text-slate-800 truncate">
                    {customer.name?.replace(/^(Mr\.|Mrs\.|Miss)\s*/i, '').trim() || customer.customerName?.replace(/^(Mr\.|Mrs\.|Miss)\s*/i, '').trim()}
                  </div>
                  <div className="col-span-3 flex justify-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRestore(customer.id, customer.previousStatus || 'Pending'); }}
                      className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"
                      title="Restore Profile"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if(window.confirm('Permanently delete this customer?')) onPermanentDelete(customer.id);
                      }}
                      className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded transition-colors"
                      title="Permanent Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : activeTab === 'entries' ? (
        filteredEntries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <p className="font-semibold text-slate-500">No deleted ledger entries</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
              <div className="col-span-3 text-left pl-2">Customer</div>
              <div className="col-span-4 text-left">Log Info</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-3 text-center"></div>
            </div>
            
            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto pb-32">
              {filteredEntries.map((entry) => (
                <div 
                  key={`${entry.customerId}-${entry.entryId}`} 
                  className={`grid grid-cols-12 gap-2 p-3 items-center transition-colors select-none ${selectedItems.includes(entry.entryId) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'} ${isSelectionMode ? 'cursor-pointer' : ''}`}
                  onClick={(e) => {
                    if (isSelectionMode) {
                      e.stopPropagation();
                      setSelectedItems(prev => prev.includes(entry.entryId) ? prev.filter(id => id !== entry.entryId) : [...prev, entry.entryId]);
                    }
                  }}
                >
                  <div className="col-span-3 text-left text-[11px] font-bold text-slate-700 truncate pl-2 flex items-center gap-2" onClick={(e) => {
                    if (!isSelectionMode) { e.stopPropagation(); setIsSelectionMode(true); setSelectedItems([entry.entryId]); }
                  }}>
                    {isSelectionMode && (
                      selectedItems.includes(entry.entryId) ? <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" /> : <Square className="w-5 h-5 text-slate-300 shrink-0" />
                    )}
                    <span className="truncate">{entry.customerName?.replace(/^(Mr\.|Mrs\.|Miss)\s*/i, '').trim()}</span>
                  </div>
                  <div className="col-span-4 text-left flex flex-col">
                    <span className="text-[12px] font-bold text-slate-800">{entry.date}</span>
                    <span className="text-[10px] font-medium text-slate-500">Inst: {entry.number}</span>
                  </div>
                  <div className="col-span-2 text-right text-[12px] font-black text-slate-800">
                    ₹{entry.amount || 0}
                  </div>
                  <div className="col-span-3 flex justify-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRestoreEntry(entry.customerId, entry.entryId); }}
                      className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"
                      title="Restore Entry"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if(window.confirm('Permanently delete this entry?')) onPermanentDeleteEntry(entry.customerId, entry.entryId);
                      }}
                      className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded transition-colors"
                      title="Permanent Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        filteredStaff.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <p className="font-semibold text-slate-500">No deleted staff profiles</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
              <div className="col-span-2 text-center">S.No</div>
              <div className="col-span-3 text-left">Deleted Date</div>
              <div className="col-span-4 text-left">Staff Name</div>
              <div className="col-span-3 text-center"></div>
            </div>
            
            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto pb-32">
              {filteredStaff.map((staff, index) => (
                <div 
                  key={staff.id} 
                  className={`grid grid-cols-12 gap-2 p-3 items-center transition-colors select-none ${selectedItems.includes(staff.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'} ${isSelectionMode ? 'cursor-pointer' : ''}`}
                  onClick={(e) => {
                    if (isSelectionMode) {
                      e.stopPropagation();
                      setSelectedItems(prev => prev.includes(staff.id) ? prev.filter(id => id !== staff.id) : [...prev, staff.id]);
                    }
                  }}
                >
                  <div className="col-span-2 flex items-center justify-center text-sm font-semibold text-slate-400" onClick={(e) => {
                    if (!isSelectionMode) { e.stopPropagation(); setIsSelectionMode(true); setSelectedItems([staff.id]); }
                  }}>
                    {isSelectionMode ? (
                      selectedItems.includes(staff.id) ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-slate-300" />
                    ) : (index + 1)}
                  </div>
                  <div className="col-span-3 text-left text-xs font-medium text-slate-600 flex flex-col">
                    <span>{formatDate(staff.deletedAt)}</span>
                  </div>
                  <div className="col-span-4 text-left flex flex-col truncate">
                    <span className="text-sm font-bold text-slate-800 truncate">{staff.name || 'Unknown'}</span>
                    <span className="text-[10px] font-medium text-slate-500 truncate">{staff.mobileNumber || staff.phone || staff.designation || 'Staff'}</span>
                  </div>
                  <div className="col-span-3 flex justify-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRestoreStaff(e, staff); }}
                      className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"
                      title="Restore Staff"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePermanentDeleteStaff(e, staff); }}
                      className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded transition-colors"
                      title="Permanent Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default RecycleBinView;
