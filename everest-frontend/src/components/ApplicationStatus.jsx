import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PdfPreviewModal from './PdfPreviewModal';
import AddCustomerModal from './AddCustomerModal';
import ApprovalDetailsModal from './ApprovalDetailsModal';
import OfflineImage from './OfflineImage';
import { Eye } from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const defaultAvatar = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMWUyOTNiIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGYxNzJhIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImF2YXRhciIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzY0NzQ4YiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJ1cmwoI2JnKSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE2IiBmaWxsPSJ1cmwoI2F2YXRhcikiLz48cGF0aCBkPSJNNTAgNjJDMzAgNjIgMTYgNzggMTYgOTVDMjYgOTggMzcgMTAwIDUwIDEwMEM2MyAxMDAgNzQgOTggODQgOTVDODQgNzggNzAgNjIgNTAgNjJaIiBmaWxsPSJ1cmwoI2F2YXRhcikiLz48L3N2Zz4=";


const ApplicationStatus = ({ applications = [], onUpdateStatus, onDeleteApp, onUpdateCustomer, activeBranch, isStaff }) => {
  const isMainBranch = activeBranch?.id === 'main' || activeBranch?.name === 'Main Branch';
  const [activeTab, setActiveTab] = useState(isStaff ? 'Draft' : 'Pending');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [activePdfApp, setActivePdfApp] = useState(null);
  const [pdfAutoMode, setPdfAutoMode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPendingApp, setSelectedPendingApp] = useState(null);
  const [centers, setCenters] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'centers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedCenters = [];
      snapshot.forEach(doc => loadedCenters.push({ id: doc.id, ...doc.data() }));
      setCenters(loadedCenters);
    });
    return () => unsubscribe();
  }, []);

  const resolveCustomerStaff = (customer, centersList) => {
    // 1. IF CUSTOMER BELONGS TO A CENTER: Master Center staff ALWAYS wins!
    if (customer.centerName && customer.centerName.trim() !== '') {
      const parentCenter = centersList?.find(
        c => c.centerName?.trim().toLowerCase() === customer.centerName?.trim().toLowerCase() &&
             (!customer.branchName || !c.branchName || c.branchName?.trim().toLowerCase() === customer.branchName?.trim().toLowerCase())
      );
      if (parentCenter?.staffName) {
        return parentCenter.staffName;
      }
    }

    // 2. ONLY FOR INDIVIDUAL CUSTOMERS (No Center): Read their direct assigned staff
    const directStaff = 
      (typeof customer.staffName === 'string' && customer.staffName !== 'Staff Unassigned' && customer.staffName !== 'Unassigned' && customer.staffName.trim()) ? customer.staffName :
      (typeof customer.assignedStaff === 'string' && customer.assignedStaff.trim()) ? customer.assignedStaff :
      customer.staff?.name ||
      customer.assignedStaff?.name ||
      customer.createdByStaffName ||
      customer.centerStaffName ||
      null;

    return directStaff || 'Staff Unassigned';
  };

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe || isRightSwipe) {
      const currentTabIndex = tabs.findIndex(t => t.id === activeTab);
      if (isLeftSwipe && currentTabIndex < tabs.length - 1) {
        setActiveTab(tabs[currentTabIndex + 1].id);
      } else if (isRightSwipe && currentTabIndex > 0) {
        setActiveTab(tabs[currentTabIndex - 1].id);
      }
    }
  };

  const adminTabs = [
    { id: 'Pending', label: 'Pending', activeClass: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm' },
    { id: 'Approved', label: 'Approved', activeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' },
    { id: 'Rejected', label: 'Rejected', activeClass: 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm' }
  ];

  const staffTabs = [
    { id: 'Draft', label: 'Drafts', activeClass: 'bg-slate-50 text-slate-700 border border-slate-200 shadow-sm' },
    { id: 'Pending', label: 'Pending', activeClass: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm' },
    { id: 'Approved_Rejected', label: 'Approved / Rejected', activeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' }
  ];

  const tabs = isStaff ? staffTabs : adminTabs;

  const currentApps = applications.filter(app => {
    if (activeTab === 'Approved_Rejected') {
      return app.status === 'Approved' || app.status === 'Rejected';
    }
    return app.status === activeTab;
  });

  const toggleMenu = (id, e) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const updateStatus = (id, newStatus, extraData = {}) => {
    if (onUpdateStatus) onUpdateStatus(id, newStatus, extraData);
    setActiveMenuId(null);
  };

  const deleteApp = (id) => {
    if (onDeleteApp) onDeleteApp(id);
    setActiveMenuId(null);
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Format Date Logic
  const formatDate = (dateString) => {
    // If it's already DD-MM-YYYY format, just return
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) return dateString;
    const d = new Date(dateString);
    if (isNaN(d)) return dateString;
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  return (
    <div className="w-full flex-1 max-w-4xl md:max-w-none mx-auto bg-white min-h-full flex flex-col animate-in fade-in duration-300 relative md:px-6 md:py-6">
      
      {/* Header & Tabs */}
      <div className="px-4 py-3 border-b border-slate-200 sticky top-0 bg-white z-20">
        
        <div className="flex gap-2">
          {tabs.map(tab => {
            const count = applications.filter(a => a.status === tab.id).length;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 px-2 font-bold text-[13px] transition-all flex flex-row items-center justify-center gap-1.5 rounded-lg ${
                  isActive 
                    ? tab.activeClass
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent scale-95'
                }`}
              >
                <span>{tab.label}</span>
                <span>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Data Table / List Cards */}
      <div 
        className="p-2 w-full flex-1 overflow-y-auto"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="w-full pb-32">
          <table className="w-full text-left whitespace-nowrap table-fixed">
            <thead className="text-[10px] font-bold text-black uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-2 w-12 md:w-[5%] text-left md:pl-6">S.no</th>
                <th className="p-2 w-24 md:w-[10%] text-left">{activeTab === 'Approved' ? 'Appr. Date' : 'Apply Date'}</th>
                <th className="p-2 text-left w-auto md:w-[20%]">CUSTOMER</th>
                <th className="p-2 text-left hidden md:table-cell md:w-[15%]">BRANCH</th>
                <th className="p-2 text-left hidden md:table-cell md:w-[15%]">GROUP NAME</th>
                <th className="p-2 text-left hidden md:table-cell md:w-[12%]">LOAN TYPE</th>
                <th className="p-2 text-left hidden md:table-cell md:w-[11%]">LOAN AMOUNT</th>
                <th className="p-2 text-left hidden md:table-cell md:w-[12%]">{isMainBranch ? 'STATUS' : 'ACTIONS'}</th>
                <th className="p-2 w-16 md:hidden text-right pr-2">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {currentApps.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-slate-500 text-sm">No applications in this status.</td>
                </tr>
              ) : currentApps.map((app, index) => {
                console.log("Customer Record in AppStatus:", app);
                return (
                <tr 
                  key={app.id || index} 
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors w-full`}
                >
                  <td className="p-2 font-bold text-slate-800 text-sm text-left md:pl-6">{index + 1}</td>
                  <td className="p-2 font-semibold text-slate-600 text-xs">
                    {activeTab === 'Approved' ? formatDate(app.approvalDate || app.appDate) : formatDate(app.appDate)}
                  </td>
                  <td className="p-2 truncate overflow-hidden">
                    <div className="flex items-center gap-2">
                      <OfflineImage 
                        src={app.photoUrl || app.photo || app.image || app.applicantPhoto || app.profileImage || app.avatar_url || defaultAvatar}
                        fallback={defaultAvatar}
                        alt={app.customerName} 
                        className={`w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm transition-transform flex-shrink-0 cursor-pointer hover:scale-105`}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setFullscreenImage(app.photoUrl || app.photo || app.image || app.applicantPhoto || app.profileImage || app.avatar_url || defaultAvatar); 
                        }}
                      />
                      <div className="truncate flex flex-col">
                        <div className="font-bold text-slate-800 text-sm truncate">{app.customerName}</div>
                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5 tracking-tight truncate md:hidden">
                          {isMainBranch ? (app.branch || app.branchName || 'Main') : `Staff: ${resolveCustomerStaff(app, centers)}`}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5 tracking-tight truncate hidden md:block">
                          ID: {app.customerId?.startsWith('EMF') ? app.customerId : (app.applicationNumber?.startsWith('EMF') ? app.applicationNumber : (app.id && app.id.startsWith('EMF') ? app.id : 'EMF-PENDING'))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 hidden md:table-cell text-sm font-bold text-brand-blue truncate">
                    {app.branch || app.branchName || 'Main'}
                  </td>
                  <td className="p-2 hidden md:table-cell text-xs font-semibold text-slate-600 truncate">
                    {app.groupName || app.centerName || 'Individual / N/A'}
                  </td>
                  <td className="p-2 hidden md:table-cell text-xs font-semibold text-slate-600 truncate">
                    {app.loanType || app.scheme || 'N/A'}
                  </td>
                  <td className="p-2 hidden md:table-cell text-sm font-bold text-slate-800">
                    ₹{Number(app.loanAmount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-2 hidden md:table-cell relative">
                    {isMainBranch ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                        activeTab === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        activeTab === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {app.status === 'Draft' ? 'DRAFT' : activeTab === 'Approved_Rejected' ? app.status.toUpperCase() : activeTab.toUpperCase()}
                      </span>
                    ) : isStaff ? (
                      <div className="flex items-center gap-2">
                        {(app.status === 'Pending' || app.status === 'Approved' || app.status === 'Rejected') ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                            app.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            app.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {app.status.toUpperCase()}
                          </span>
                        ) : null}
                        {app.status === 'Draft' && (
                          <div className="flex gap-2 items-center">
                            <button onClick={(e) => toggleMenu(app.id, e)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                            {activeMenuId === app.id && (
                              <div 
                                className="absolute right-0 top-10 w-56 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-100 z-[99] animate-in fade-in zoom-in-95 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button 
                                  onClick={() => { updateStatus(app.id, 'Pending'); }}
                                  className="w-full text-left px-4 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 border-b border-slate-50"
                                >
                                  <span>🚀</span> Submit for Approval
                                </button>
                                <button 
                                  onClick={() => { setIsEditing(app); setActiveMenuId(null); }}
                                  className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                                >
                                  <span>✏️</span> Edit Details
                                </button>
                                <button 
                                  onClick={() => { setActivePdfApp(app); setActiveMenuId(null); }}
                                  className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                                >
                                  <span>📄</span> View PDF
                                </button>
                                <button onClick={() => deleteApp(app.id)} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-3">
                                  <span>🗑️</span> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {activeTab === 'Pending' && (
                          <button onClick={(e) => { e.stopPropagation(); setSelectedPendingApp(app); }} className="w-7 h-7 rounded bg-emerald-50 text-emerald-500 flex items-center justify-center hover:bg-emerald-100 border border-emerald-100 transition-colors" title="Review & Approve">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                        {(activeTab === 'Approved' || activeTab === 'Rejected') && (
                          <button onClick={(e) => { e.stopPropagation(); updateStatus(app.id, 'Pending'); }} className="w-7 h-7 rounded bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 border border-amber-100 transition-colors" title="Move to Pending">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                        <button onClick={(e) => toggleMenu(app.id, e)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {activeMenuId === app.id && (
                          <div 
                            className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-100 z-[99] animate-in fade-in zoom-in-95 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button 
                              onClick={() => { setIsEditing(app); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                            >
                              <span>✏️</span> Edit Details
                            </button>
                            <button 
                              onClick={() => { setActivePdfApp(app); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                            >
                              <span>📄</span> View PDF
                            </button>
                            <button onClick={() => deleteApp(app.id)} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-3">
                              <span>🗑️</span> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-2 flex items-center justify-center md:hidden relative h-full min-h-[48px]">
                    {isMainBranch ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedPendingApp(app); }} 
                        className="p-1.5 text-blue-500 hover:text-blue-700 transition-colors rounded-lg hover:bg-blue-50 bg-blue-50/50"
                      >
                        <Eye size={20} />
                      </button>
                    ) : isStaff ? (
                      <div className="flex gap-1.5 items-center relative">
                        {app.status === 'Draft' && (
                          <>
                            <button onClick={(e) => toggleMenu(app.id, e)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                            {activeMenuId === app.id && (
                              <div 
                                className="absolute right-8 top-8 w-56 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-100 z-[99] animate-in fade-in zoom-in-95 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button 
                                  onClick={() => { updateStatus(app.id, 'Pending'); setActiveMenuId(null); }}
                                  className="w-full text-left px-4 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 border-b border-slate-50"
                                >
                                  <span>🚀</span> Submit for Approval
                                </button>
                                <button 
                                  onClick={() => { setIsEditing(app); setActiveMenuId(null); }}
                                  className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                                >
                                  <span>✏️</span> Edit Details
                                </button>
                                <button 
                                  onClick={() => { setActivePdfApp(app); setActiveMenuId(null); }}
                                  className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                                >
                                  <span>📄</span> View PDF
                                </button>
                                <button 
                                  onClick={() => deleteApp(app.id)} 
                                  className="w-full text-left px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-3"
                                >
                                  <span>🗑️</span> Delete
                                </button>
                              </div>
                            )}
                          </>
                        )}
                        {app.status === 'Pending' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border bg-amber-50 text-amber-600 border-amber-100">
                            PENDING
                          </span>
                        )}
                        {app.status === 'Approved' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-100">
                            APPROVED
                          </span>
                        )}
                        {app.status === 'Rejected' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border bg-rose-50 text-rose-600 border-rose-100">
                            REJECTED
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-1.5 items-center relative">
                        {/* Green Checkmark for Pending Apps */}
                        {activeTab === 'Pending' && (
                          <button onClick={(e) => { e.stopPropagation(); setSelectedPendingApp(app); }} className="w-7 h-7 rounded bg-emerald-50 text-emerald-500 flex items-center justify-center hover:bg-emerald-100 border border-emerald-100 transition-colors shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                        {/* Three-Dot Menu Button */}
                        <button onClick={(e) => toggleMenu(app.id, e)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>

                        {/* Embedded Dropdown Menu */}
                        {activeMenuId === app.id && (
                          <div 
                            className="absolute right-8 top-8 w-48 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-100 z-[99] animate-in fade-in zoom-in-95 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button 
                              onClick={() => { setIsEditing(app); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                            >
                              <span>✏️</span> Edit Details
                            </button>
                            <button 
                              onClick={() => { setActivePdfApp(app); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                            >
                              <span>📄</span> View PDF
                            </button>
                            <button 
                              onClick={() => { setPdfAutoMode('share'); setActivePdfApp(app); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                            >
                              <span>🔗</span> Share
                            </button>
                            <button 
                              onClick={() => deleteApp(app.id)} 
                              className="w-full text-left px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-3"
                            >
                              <span>🗑️</span> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>



      {/* Full-Screen Image Modal Overlay */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
          onClick={() => setFullscreenImage(null)}
        >
          <button className="absolute top-6 right-6 text-white bg-black/50 p-2 rounded-full hover:bg-white/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img 
            src={fullscreenImage} 
            alt="Customer Fullscreen" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* PDF Preview Modal Overlay */}
      {activePdfApp && (
        <PdfPreviewModal 
          application={activePdfApp} 
          onClose={() => { setActivePdfApp(null); setPdfAutoMode(null); }} 
          autoMode={pdfAutoMode}
        />
      )}

      {/* Edit Details Modal Overlay */}
      {isEditing && (
        <AddCustomerModal 
          initialData={isEditing} 
          onAddCustomer={onUpdateCustomer}
          onClose={() => setIsEditing(null)} 
          activeBranch={activeBranch}
        />
      )}

      {/* Approval Details Modal Overlay */}
      {selectedPendingApp && (
        <ApprovalDetailsModal
          application={selectedPendingApp}
          centers={centers}
          isReadOnly={isMainBranch}
          onClose={() => setSelectedPendingApp(null)}
          onApprove={(id, popupData) => {
            updateStatus(id, 'Approved', popupData);
            setSelectedPendingApp(null);
          }}
          onReject={(id) => {
            updateStatus(id, 'Rejected');
            setSelectedPendingApp(null);
          }}
          onStayPending={() => setSelectedPendingApp(null)}
        />
      )}
    </div>
  );
};

export default ApplicationStatus;
