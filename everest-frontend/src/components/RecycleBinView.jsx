import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const RecycleBinView = ({ customers = [], onRestore, onPermanentDelete, onRestoreEntry, onPermanentDeleteEntry }) => {
  const [activeTab, setActiveTab] = useState('customers');
  const [recycledStaff, setRecycledStaff] = useState([]);
  
  const recycledCustomers = customers.filter(c => c.status === 'Recycled');
  const recycledEntries = customers.flatMap(c => 
    (c.deletedInstallments || []).map(entry => ({
      ...entry,
      customerId: c.id,
      customerName: c.name || c.customerName
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
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Recycle Bin
        </h2>
        <p className="text-sm text-slate-500 mt-1">Manage deleted records and ledger entries. Permanently deleted items cannot be recovered.</p>
      </div>

      <div className="flex gap-2 mb-4 bg-slate-200/50 p-1 rounded-xl w-fit">
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

      {activeTab === 'customers' ? (
        recycledCustomers.length === 0 ? (
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
              {recycledCustomers.map((customer, index) => (
                <div key={customer.id} className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-slate-50 transition-colors">
                  <div className="col-span-2 text-center text-sm font-semibold text-slate-400">
                    {index + 1}
                  </div>
                  <div className="col-span-3 text-left text-xs font-medium text-slate-600">
                    {formatDate(customer.lastUpdated || customer.deletedAt)}
                  </div>
                  <div className="col-span-4 text-left text-sm font-bold text-slate-800 truncate">
                    {customer.name?.replace(/^(Mr\.|Mrs\.|Miss)\s*/i, '').trim() || customer.customerName?.replace(/^(Mr\.|Mrs\.|Miss)\s*/i, '').trim()}
                  </div>
                  <div className="col-span-3 flex justify-center gap-2">
                    <button 
                      onClick={() => onRestore(customer.id, customer.previousStatus || 'Pending')}
                      className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"
                      title="Restore Profile"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button 
                      onClick={() => {
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
        recycledEntries.length === 0 ? (
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
              {recycledEntries.map((entry) => (
                <div key={`${entry.customerId}-${entry.id}`} className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-slate-50 transition-colors">
                  <div className="col-span-3 text-left text-[11px] font-bold text-slate-700 truncate pl-2">
                    {entry.customerName?.replace(/^(Mr\.|Mrs\.|Miss)\s*/i, '').trim()}
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
                      onClick={() => onRestoreEntry(entry.customerId, entry.id)}
                      className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"
                      title="Restore Entry"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button 
                      onClick={() => {
                        if(window.confirm('Permanently delete this entry?')) onPermanentDeleteEntry(entry.customerId, entry.id);
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
        recycledStaff.length === 0 ? (
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
              {recycledStaff.map((staff, index) => (
                <div key={staff.id} className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-slate-50 transition-colors">
                  <div className="col-span-2 text-center text-sm font-semibold text-slate-400">
                    {index + 1}
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
                      onClick={(e) => handleRestoreStaff(e, staff)}
                      className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"
                      title="Restore Staff"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button 
                      onClick={(e) => handlePermanentDeleteStaff(e, staff)}
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
