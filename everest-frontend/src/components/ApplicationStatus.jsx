import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PdfPreviewModal from './PdfPreviewModal';
import AddCustomerModal from './AddCustomerModal';

const ApplicationStatus = ({ applications = [], onUpdateStatus, onDeleteApp, onUpdateCustomer }) => {
  const [activeTab, setActiveTab] = useState('Pending');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [activePdfApp, setActivePdfApp] = useState(null);
  const [pdfAutoMode, setPdfAutoMode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const tabs = [
    { id: 'Pending', label: 'Pending', activeClass: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm' },
    { id: 'Approved', label: 'Approved', activeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' },
    { id: 'Rejected', label: 'Rejected', activeClass: 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm' }
  ];

  const currentApps = applications.filter(app => app.status === activeTab);

  const toggleMenu = (id, e) => {
    e.stopPropagation();
    if (activeMenuId === id) {
      setActiveMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPosition({
        top: rect.top,
        left: rect.left - 200 // Approx width of dropdown + margin
      });
      setActiveMenuId(id);
    }
  };

  const updateStatus = (id, newStatus) => {
    if (onUpdateStatus) onUpdateStatus(id, newStatus);
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
    <div className="w-full flex-1 max-w-4xl mx-auto bg-white min-h-full flex flex-col animate-in fade-in duration-300 relative">
      
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
      <div className="p-2 w-full flex-1 overflow-y-auto">
        <div className="w-full pb-32">
          <table className="w-full text-left whitespace-nowrap table-fixed">
            <thead className="text-[10px] font-bold text-black uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-2 w-12 text-center">SI NO</th>
                <th className="p-2 w-24">Apply Date</th>
                <th className="p-2 text-left truncate">CUSTOMER</th>
                <th className="p-2 w-16 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {currentApps.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-slate-500 text-sm">No applications in this status.</td>
                </tr>
              ) : currentApps.map((app, index) => (
                <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors w-full overflow-hidden">
                  <td className="p-2 font-bold text-slate-800 text-sm text-center">{index + 1}</td>
                  <td className="p-2 font-semibold text-slate-600 text-xs">{formatDate(app.appDate)}</td>
                  <td className="p-2 truncate overflow-hidden">
                    <div className="flex items-center gap-2">
                      <img 
                        src={app.image} 
                        alt={app.customerName} 
                        className={`w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm transition-transform flex-shrink-0 cursor-pointer hover:scale-105`}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setFullscreenImage(app.image); 
                        }}
                      />
                      <div className="truncate">
                        <div className="font-bold text-slate-800 text-sm truncate">{app.customerName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 flex items-center justify-center relative">
                    
                    {/* Three-Dot Menu Button */}
                    <button onClick={(e) => toggleMenu(app.id, e)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    {/* Action Triggers based on Tab */}
                    {activeTab === 'Pending' && (
                      <>
                        <button onClick={() => updateStatus(app.id, 'Approved')} className="w-7 h-7 rounded bg-emerald-50 text-emerald-500 flex items-center justify-center hover:bg-emerald-100 border border-emerald-100 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button onClick={() => updateStatus(app.id, 'Rejected')} className="w-7 h-7 rounded bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 border border-rose-100 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </>
                    )}

                    {(activeTab === 'Approved' || activeTab === 'Rejected') && (
                      <button onClick={() => updateStatus(app.id, 'Pending')} className="w-7 h-7 rounded bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 border border-amber-100 transition-colors" title="Move to Pending">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Portal for Three-Dot Menu to prevent clipping */}
      {activeMenuId && createPortal(
        <div 
          className="fixed w-48 bg-white rounded-xl shadow-2xl border border-slate-100 z-[9999] animate-in fade-in zoom-in-95 overflow-hidden"
          style={{ top: menuPosition.top, left: menuPosition.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => {
              const appToEdit = applications.find(a => a.id === activeMenuId);
              setIsEditing(appToEdit);
              setActiveMenuId(null);
            }}
            className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
          >
            <span>✏️</span> Edit Details
          </button>
          <button 
            onClick={() => {
              const appToView = applications.find(a => a.id === activeMenuId);
              setActivePdfApp(appToView);
              setActiveMenuId(null);
            }}
            className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
          >
            <span>📄</span> View PDF
          </button>
            <button 
              onClick={() => {
                setPdfAutoMode('share');
                setActivePdfApp(applications.find(a => a.id === activeMenuId));
                setActiveMenuId(null);
              }}
              className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
            >
              <span>🔗</span> Share
            </button>
            <button 
              onClick={() => {
                setPdfAutoMode('print');
                setActivePdfApp(applications.find(a => a.id === activeMenuId));
                setActiveMenuId(null);
              }}
              className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
            >
              <span>🖨️</span> Print PDF
            </button>
          <button onClick={() => deleteApp(activeMenuId)} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-3">
            <span>🗑️</span> Delete
          </button>
        </div>,
        document.body
      )}

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
        />
      )}
    </div>
  );
};

export default ApplicationStatus;
