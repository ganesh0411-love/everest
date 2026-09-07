import React, { useState, useEffect } from 'react';
import { X, Building2, User, UserCircle, Phone, FileBadge, FileText, IdCard, ChevronRight, ArrowLeft, MapPin, Wallet, CheckCircle2, Eye, XCircle, Settings, Trash2 } from 'lucide-react';
import { App } from '@capacitor/app';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import OfflineImage from './OfflineImage';

const defaultAvatar = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMWUyOTNiIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGYxNzJhIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImF2YXRhciIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzY0NzQ4YiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJ1cmwoI2JnKSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE2IiBmaWxsPSJ1cmwoI2F2YXRhcikiLz48cGF0aCBkPSJNNTAgNjJDMzAgNjIgMTYgNzggMTYgOTVDMjYgOTggMzcgMTAwIDUwIDEwMEM2MyAxMDAgNzQgOTggODQgOTVDODQgNzggNzAgNjIgNTAgNjJaIiBmaWxsPSJ1cmwoI2F2YXRhcikiLz48L3N2Zz4=";

const ApprovalDetailsModal = ({ application, onClose, onApprove, onReject, onStayPending, isReadOnly, onDelete }) => {
  const [activeView, setActiveView] = useState('main'); // 'main' | 'centerDetails'
  const [toastMsg, setToastMsg] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isNomineeOk, setIsNomineeOk] = useState(false);

  // Approval Popup State
  const [showApprovalPopup, setShowApprovalPopup] = useState(false);
  const [approvalDate, setApprovalDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [overrideDueDate, setOverrideDueDate] = useState('');

  // User Settings State
  const [usernameInput, setUsernameInput] = useState(application?.phone || application?.mobile || '');
  const [passwordInput, setPasswordInput] = useState(() => {
    const rawDob = application?.dob || '';
    if (!rawDob) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
      const parts = rawDob.split('-');
      return `${parts[2]}${parts[1]}${parts[0]}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(rawDob)) {
      const parts = rawDob.split('-');
      return `${parts[0]}${parts[1]}${parts[2]}`;
    }
    const d = new Date(rawDob);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}${mm}${yyyy}`;
    }
    return rawDob.replace(/[^0-9]/g, '');
  });

  const handleCredentialChange = async () => {
    if (application?.id) {
      try {
        const appRef = doc(db, 'customers', application.id);
        await updateDoc(appRef, {
          phone: usernameInput,
          dob: passwordInput,
          password: passwordInput
        });
        setToastMsg('Credentials updated successfully!');
        setTimeout(() => setToastMsg(''), 3000);
      } catch (err) {
        console.error('Error updating credentials:', err);
        setToastMsg('Failed to update credentials.');
        setTimeout(() => setToastMsg(''), 3000);
      }
    }
  };


  // Auto-calculate 7 days from approvalDate
  const nextDueDate = React.useMemo(() => {
    if (!approvalDate) return '';
    const date = new Date(approvalDate);
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }, [approvalDate]);

  const viewSequence = isReadOnly 
    ? ['loanDetails', 'centerDetails', 'staff', 'personal', 'nominee', 'pastLoans', 'kyc', 'userSettings']
    : ['loanDetails', 'centerDetails', 'staff', 'personal', 'nominee', 'pastLoans', 'kyc'];

  const syncNomineeData = async () => {
    if (activeView === 'nominee' && application?.id) {
      try {
        const appRef = doc(db, 'customers', application.id);
        await updateDoc(appRef, {
          nomineeDob: nomineeDob,
          nomineeMaritalStatus: nomineeMaritalStatus,
          nomineeAge: nomineeAge
        });
      } catch (err) {
        console.error('Error syncing nominee data:', err);
      }
    }
  };

  const handleNextView = () => {
    if (!isReadOnly && activeView === 'nominee' && !isNomineeOk) {
      setToastMsg('Please click OK to save Nominee Details first.');
      setTimeout(() => setToastMsg(''), 3000);
      return;
    }
    syncNomineeData();
    const currentIndex = viewSequence.indexOf(activeView);
    if (currentIndex >= 0 && currentIndex < viewSequence.length - 1) {
      setActiveView(viewSequence[currentIndex + 1]);
    } else if (currentIndex === viewSequence.length - 1) {
      setActiveView('main');
    }
  };

  const handlePrevView = () => {
    syncNomineeData();
    const currentIndex = viewSequence.indexOf(activeView);
    if (currentIndex > 0) {
      setActiveView(viewSequence[currentIndex - 1]);
    } else {
      setActiveView('main');
    }
  };

  const parseDateToInput = (dateString) => {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      const [dd, mm, yyyy] = dateString.split('-');
      return `${yyyy}-${mm}-${dd}`;
    }
    const d = new Date(dateString);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
    return '';
  };

  const handleOpenDoc = (docs) => {
    if (!docs || docs.length === 0) {
      setToastMsg('No document file attached.');
      setTimeout(() => setToastMsg(''), 3000);
      return;
    }
    const doc = docs[0];
    const url = typeof doc === 'string' ? doc : doc.url || doc.fileUrl || doc.preview;
    if (url) {
      window.open(url, '_blank');
    } else {
      setToastMsg('Document file cannot be read.');
      setTimeout(() => setToastMsg(''), 3000);
    }
  };

  const [nomineeDob, setNomineeDob] = useState(parseDateToInput(application?.nomineeDob));
  const [nomineeMaritalStatus, setNomineeMaritalStatus] = useState(application?.nomineeMaritalStatus || 'Single');
  const [nomineeAge, setNomineeAge] = useState(application?.nomineeAge || '');

  useEffect(() => {
    if (nomineeDob) {
      const dobDate = new Date(nomineeDob);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      const ageStr = age >= 0 ? age.toString() : '0';
      setNomineeAge(ageStr);
      if (application) application.nomineeAge = ageStr;
    }
  }, [nomineeDob, application]);

  useEffect(() => {
    let listener = null;
    const setupBackButton = async () => {
      listener = await App.addListener('backButton', () => {
        if (activeView !== 'main') {
          // If in sub-view, go back to main menu inside modal
          setActiveView('main');
        } else {
          // If in main menu, close the modal entirely
          onClose();
        }
      });
    };
    
    setupBackButton();
    
    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [activeView, onClose]);

  if (!application) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) return dateString;
    const d = new Date(dateString);
    if (isNaN(d)) return dateString;
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const aadhar = application.aadhaar || '000000001234';
  const maskedAadhar = `****${aadhar.slice(-4)}`;

  const infoRows = [
    {
      id: 'loanDetails',
      title: 'Loan Details',
      subtitle: <span className="ml-10 inline-flex items-baseline whitespace-nowrap"><span className="text-[13px] text-slate-600 mr-1.5">Amount :</span><span className="text-emerald-600 font-extrabold text-[20px] tracking-tight leading-none" style={{ fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace" }}>₹{application.loanAmount ? Number(application.loanAmount).toLocaleString('en-IN') : '0'}</span></span>,
      icon: <Wallet size={20} className="text-blue-600" />,
      bg: 'bg-blue-100',
    },
    {
      id: 'centerDetails',
      title: 'Center Details',
      subtitle: `Branch : ${application.branch || application.branchName || 'N/A'}`,
      icon: <Building2 size={20} className="text-emerald-600" />,
      bg: 'bg-emerald-100',
    },
    {
      id: 'staff',
      title: 'Staff',
      subtitle: `Staff Name : ${application.assignedStaff || application.staffName || 'N/A'}`,
      icon: <User size={20} className="text-rose-500" />,
      bg: 'bg-rose-100',
    },
    {
      id: 'personal',
      title: 'Personal & Contact Details',
      subtitle: `DOB : ${application.dob ? formatDate(application.dob) : '--'}`,
      icon: <UserCircle size={20} className="text-amber-500" />,
      bg: 'bg-amber-100',
    },
    (application.nomineeName && application.nomineeName.trim() !== '') ? {
        id: 'nominee',
        title: 'Nominee & Contact Details',
        subtitle: `Nominee : ${application.nomineeName}`,
        icon: <FileBadge size={20} className="text-purple-600" />,
        bg: 'bg-purple-100',
      } : null,
    {
      id: 'pastLoans',
      title: 'Previous Record',
      subtitle: (Array.isArray(application.pastLoans) && application.pastLoans.length > 0) 
        ? `Past Loans : ${application.pastLoans.length} (${application.pastLoans[0].status || 'Closed'})`
        : 'No Records Found',
      icon: <FileText size={20} className="text-rose-600" />,
      bg: 'bg-rose-100',
    },
    {
      id: 'kyc',
      title: 'KYC Details',
      subtitle: `Aadhar : ${maskedAadhar}`,
      icon: <IdCard size={20} className="text-indigo-600" />,
      bg: 'bg-indigo-100',
    },
    ...(isReadOnly ? [{
      id: 'userSettings',
      title: 'User Setting',
      subtitle: 'Manage account & deletion',
      icon: <Settings size={20} className="text-slate-600" />,
      bg: 'bg-slate-200',
    }] : [])
  ].filter(Boolean);

  const handleRowClick = (rowId) => {
    if (rowId === 'loanDetails') {
      setActiveView('loanDetails');
    } else if (rowId === 'centerDetails') {
      setActiveView('centerDetails');
    } else if (rowId === 'staff') {
      setActiveView('staff');
    } else if (rowId === 'personal') {
      setActiveView('personal');
    } else if (rowId === 'nominee') {
      setActiveView('nominee');
    } else if (rowId === 'pastLoans') {
      setActiveView('pastLoans');
    } else if (rowId === 'kyc') {
      setActiveView('kyc');
    } else if (rowId === 'userSettings') {
      setActiveView('userSettings');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[#f8fafc] w-full max-w-sm rounded-3xl overflow-hidden flex flex-col h-[85vh] shadow-2xl animate-in slide-in-from-bottom-8 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Profile Section - Stationary */}
        <div className="p-4 bg-white relative rounded-t-3xl shadow-sm z-10 pt-6 pb-4 shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-600 hover:text-emerald-800 transition-colors z-20"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-20 h-24 rounded-2xl overflow-hidden shadow-md flex-shrink-0 border border-slate-100 bg-slate-50">
              <OfflineImage src={application.photoUrl || application.photo || application.image || application.applicantPhoto || application.profileImage || application.avatar_url || defaultAvatar} fallback={defaultAvatar} alt={application.customerName} className="w-full h-full object-cover" />
            </div>
            
            <div className="flex flex-col h-24 flex-1 min-w-0 relative">
              <div className="absolute top-0 right-7 flex flex-col items-end">
                <span className="text-[11px] font-medium text-emerald-600 leading-tight">{isReadOnly ? 'Approval Date:' : 'Applied Date:'}</span>
                <span className="text-[13px] font-semibold text-blue-700">{formatDate(isReadOnly ? (application.approvalDate || application.appDate) : application.appDate)}</span>
              </div>
              
              <div className="mt-auto flex flex-col pr-20 min-w-0 pb-[1px]">
                <h2 className="text-[22px] uppercase font-bold text-slate-900 leading-none truncate mb-1">
                  {application.customerName || 'Vignesh K'}
                </h2>
                <p className="text-[13px] text-slate-700 font-bold whitespace-nowrap truncate">
                  ID: {application.customerId?.startsWith('EMF') ? application.customerId : (application.applicationNumber?.startsWith('EMF') ? application.applicationNumber : (application.id && application.id.startsWith('EMF') ? application.id : 'EMF-PENDING'))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Center Area Container */}
        <div className="flex-1 relative overflow-hidden bg-[#f8fafc]">
          
          {/* Main View List */}
          <div className={`absolute inset-0 w-full h-full overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide transition-transform duration-300 ease-in-out ${activeView === 'main' ? 'translate-x-0' : '-translate-x-full'}`}>
            {infoRows.map((row, index) => (
              <div 
                key={index} 
                onClick={() => handleRowClick(row.id)}
                className="bg-white rounded-2xl p-3 flex items-center gap-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] border border-slate-50 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${row.bg}`}>
                  {row.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-slate-900 leading-tight mb-0.5">{row.title}</h3>
                  <p className="text-[13px] text-slate-600 font-medium">{row.subtitle}</p>
                </div>
                <div className="text-blue-600 flex-shrink-0 pr-1">
                  <ChevronRight size={22} strokeWidth={2.5} />
                </div>
              </div>
            ))}
          </div>

          {/* Sub-View: Loan Details */}
          <div className={`absolute inset-0 w-full h-full bg-white px-5 py-4 overflow-y-auto scrollbar-hide transition-transform duration-300 ease-in-out ${activeView === 'loanDetails' ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
              <button 
                onClick={() => setActiveView('main')} 
                className="p-1.5 -ml-1.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-700 shrink-0"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <h2 className="text-[17px] font-extrabold text-slate-800 tracking-tight">1. Loan Details</h2>
            </div>

            <div className="space-y-3.5 text-[14px] text-slate-800 font-medium tracking-tight">
              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Loan Apply Date</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.appDate ? formatDate(application.appDate) : '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Application Number</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.appNumber || '--'}</span>
              </div>
              
              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Loan Type</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.loanType || '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Tenure</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.tenureVal ? `${application.tenureVal} ${application.tenureUnit || 'Weeks'}` : (application.weeks || application.tenure ? `${application.weeks || application.tenure} Weeks` : '--')}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Disbursement Amount</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">₹{application.disbursementAmount || application.disbursedAmount || application.loanAmount || '0'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Interest Rate</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.interestPercent ? `${application.interestPercent}%` : '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Loan Amount</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">₹{application.repayAmount || '0'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Payable Amount</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">₹{application.repayAmount || '0'}</span>
              </div>
            </div>
          </div>

          {/* Sub-View: Center Details */}
          <div className={`absolute inset-0 w-full h-full bg-white px-5 py-4 overflow-y-auto scrollbar-hide transition-transform duration-300 ease-in-out ${activeView === 'centerDetails' ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
              <button 
                onClick={() => setActiveView('main')} 
                className="p-1.5 -ml-1.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-700 shrink-0"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <h2 className="text-[17px] font-extrabold text-slate-800 tracking-tight">2. Center Details</h2>
            </div>

            <div className="space-y-3.5 text-[14px] text-slate-800 font-medium tracking-tight">
              
              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Branch Name</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.branch || application.branchName || 'N/A'}</span>
              </div>
              
              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Group Leader</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.centerLeaderName || '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>ID</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.leaderCustomerId || '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Center Name</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.center || '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Group Name</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.groupName || '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Total Member</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">NIL</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-center">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Center Location</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <div className="flex items-center">
                  {application.centerLocationUrl ? (
                    <a href={application.centerLocationUrl} target="_blank" rel="noreferrer" className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm border border-emerald-100 inline-flex">
                      <MapPin size={18} strokeWidth={2.5} />
                    </a>
                  ) : (
                    <button 
                      onClick={() => {
                        setToastMsg('GPS data is not available for this center.');
                        setTimeout(() => setToastMsg(''), 3000);
                      }}
                      className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors shadow-sm border border-rose-100 inline-flex active:scale-95"
                    >
                      <MapPin size={18} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sub-View: Staff Details */}
          <div className={`absolute inset-0 w-full h-full bg-white px-5 py-4 overflow-y-auto scrollbar-hide transition-transform duration-300 ease-in-out ${activeView === 'staff' ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
              <button 
                onClick={() => setActiveView('main')} 
                className="p-1.5 -ml-1.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-700 shrink-0"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <h2 className="text-[17px] font-extrabold text-slate-800 tracking-tight">3. Staff</h2>
            </div>

            <div className="space-y-3.5 text-[14px] text-slate-800 font-medium tracking-tight">
              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Staff ID</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.staffId || application.staffCode || 'N/A'}</span>
              </div>
              
              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Staff Name</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.assignedStaff || application.staffName || 'N/A'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Designation</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.staffDesignation || application.designation || 'N/A'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Contact Number</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.staffContact || application.contactNumber || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Sub-View: Personal Details */}
          <div className={`absolute inset-0 w-full h-full bg-white px-5 py-4 overflow-y-auto scrollbar-hide transition-transform duration-300 ease-in-out ${activeView === 'personal' ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
              <button 
                onClick={() => setActiveView('main')} 
                className="p-1.5 -ml-1.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-700 shrink-0"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <h2 className="text-[17px] font-extrabold text-slate-800 tracking-tight">4. Personal & Contact Details</h2>
            </div>

            <div className="space-y-3.5 text-[14px] text-slate-800 font-medium tracking-tight">
              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Customer Name</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.customerName || '--'}</span>
              </div>
              
              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Date of Birth</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.dob ? formatDate(application.dob) : '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Age</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.age || '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Marital Status</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.maritalStatus || '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Occupation</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.occupation || '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Phone</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.phone || '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Address</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px] leading-tight pr-2">
                  {application.address ? `${application.address}, ${application.city || ''}, ${application.district || ''} - ${application.pincode || ''}` : '--'}
                </span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-center">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Location</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <div className="flex items-center">
                  {(application.customerLocationUrl || application.locationUrl) ? (
                    <a href={application.customerLocationUrl || application.locationUrl} target="_blank" rel="noreferrer" className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm border border-emerald-100 inline-flex">
                      <MapPin size={18} strokeWidth={2.5} />
                    </a>
                  ) : (
                    <button 
                      onClick={() => {
                        setToastMsg('GPS data is not available for this customer.');
                        setTimeout(() => setToastMsg(''), 3000);
                      }}
                      className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors shadow-sm border border-rose-100 inline-flex active:scale-95"
                    >
                      <MapPin size={18} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sub-View: Nominee & Contact Details */}
          <div className={`absolute inset-0 w-full h-full bg-white px-5 py-4 overflow-y-auto scrollbar-hide transition-transform duration-300 ease-in-out ${activeView === 'nominee' ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
              <button 
                onClick={() => setActiveView('main')} 
                className="p-1.5 -ml-1.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-700 shrink-0"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <h2 className="text-[17px] font-extrabold text-slate-800 tracking-tight">5. Nominee & Contact Details</h2>
            </div>

            <div className="space-y-3.5 text-[14px] text-slate-800 font-medium tracking-tight">
              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Nominee Name</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.nomineeName || '--'}</span>
              </div>
              
              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Relationship</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.nomineeRelation || '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-center">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Marital Status</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[14px] text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={nomineeMaritalStatus}
                  onChange={(e) => {
                    setNomineeMaritalStatus(e.target.value);
                    if (application) application.nomineeMaritalStatus = e.target.value;
                  }}
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widow">Widow</option>
                  <option value="Divorced">Divorced</option>
                </select>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-center">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Date of Birth</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <input 
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[14px] text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={nomineeDob}
                  onChange={(e) => {
                    setNomineeDob(e.target.value);
                    if (application) application.nomineeDob = e.target.value;
                  }}
                />
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-center">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Age</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <input 
                  type="text"
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-[14px] font-bold text-slate-500 cursor-not-allowed"
                  value={nomineeAge}
                  placeholder="Auto-calculated"
                />
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Occupation</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.nomineeOccupation || '--'}</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Phone</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px]">{application.altPhone || '--'}</span>
              </div>

              {/* Scope 1: Customer Profile Save Button */}
              {isReadOnly && (
                <div className="pt-4 border-t border-slate-200 mt-4">
                  <button 
                    onClick={async () => {
                      await syncNomineeData();
                      setToastMsg('Nominee details saved successfully!');
                      setTimeout(() => setToastMsg(''), 3000);
                    }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[14px] shadow-sm tracking-wide transition-colors"
                  >
                    Save
                  </button>
                </div>
              )}

              {/* Scope 2: Pending List OK Button */}
              {!isReadOnly && (
                <div className="pt-4 border-t border-slate-200 mt-4 flex gap-3">
                  <button 
                    onClick={async () => {
                      await syncNomineeData();
                      setIsNomineeOk(true);
                      setToastMsg('Nominee locked securely!');
                      setTimeout(() => setToastMsg(''), 3000);
                    }}
                    className={`flex-1 py-3 rounded-xl font-bold text-[14px] shadow-sm tracking-wide transition-colors ${isNomineeOk ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                  >
                    {isNomineeOk ? 'LOCKED' : 'OK'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sub-View: Previous Record */}
          <div className={`absolute inset-0 w-full h-full bg-white px-5 py-4 overflow-y-auto scrollbar-hide transition-transform duration-300 ease-in-out ${activeView === 'pastLoans' ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
              <button 
                onClick={() => setActiveView('main')} 
                className="p-1.5 -ml-1.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-700 shrink-0"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <h2 className="text-[17px] font-extrabold text-slate-800 tracking-tight">6. Previous Record</h2>
            </div>

            <div className="space-y-3.5 text-[14px] text-slate-800 font-medium tracking-tight">
              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Previous Loans</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px] font-bold text-slate-500">{(Array.isArray(application.pastLoans) && application.pastLoans.length > 0) ? application.pastLoans.length : 'No Record Found'}</span>
              </div>
              
              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Apply Date</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px] text-slate-400">- - -</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Loan Type</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px] text-slate-400">- - -</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Principal</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px] text-slate-400">- - -</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Loan Amount</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px] text-slate-400">- - -</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Overdue Status</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px] text-slate-400">- - -</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Account Status</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px] text-slate-400">- - -</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Installment History</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px] text-slate-400">- - -</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Repayment Track</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px] text-slate-400">- - -</span>
              </div>

              <div className="grid grid-cols-[150px_15px_1fr] items-start">
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>Closed Date</span>
                <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                <span className="pt-[1px] text-slate-400">- - -</span>
              </div>
            </div>
          </div>
          
          {/* Sub-View: KYC Details */}
          <div className={`absolute inset-0 w-full h-full bg-white px-5 py-4 overflow-y-auto scrollbar-hide transition-transform duration-300 ease-in-out ${activeView === 'kyc' ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
              <button 
                onClick={() => setActiveView('main')} 
                className="p-1.5 -ml-1.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-700 shrink-0"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <h2 className="text-[17px] font-extrabold text-slate-800 tracking-tight">7. KYC Details</h2>
            </div>

            <div className="space-y-5 text-[14px] text-slate-800 font-medium tracking-tight pb-6">
              
              {/* Customer KYC Section */}
              <div className="space-y-3.5">
                <div className="font-extrabold text-[13px] text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Customer KYC</div>
                
                <div className="grid grid-cols-[150px_15px_1fr] items-start">
                  <span className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: '#23b3e3' }}>
                    {application.aadhaar ? <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={3} /> : <XCircle size={16} className="text-rose-500" strokeWidth={3} />} 
                    Aadhar
                  </span>
                  <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                  <div className="flex items-center justify-between min-h-[28px]">
                    <span className="pt-[1px]">{application.aadhaar ? application.aadhaar : <span className="text-slate-500">Not Provided</span>}</span>
                    {application.kycDocs?.aadhaar && (
                      <button className="text-slate-400 hover:text-blue-500 transition-colors p-1" onClick={() => handleOpenDoc(application.kycDocs?.aadhaar)}>
                        <Eye size={18} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[150px_15px_1fr] items-start">
                  <span className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: '#23b3e3' }}>
                    {application.pan ? <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={3} /> : <XCircle size={16} className="text-rose-500" strokeWidth={3} />} 
                    PAN
                  </span>
                  <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                  <div className="flex items-center justify-between min-h-[28px]">
                    <span className="pt-[1px]">{application.pan ? application.pan : <span className="text-slate-500">Not Provided</span>}</span>
                    {application.kycDocs?.pan && (
                      <button className="text-slate-400 hover:text-blue-500 transition-colors p-1" onClick={() => handleOpenDoc(application.kycDocs?.pan)}>
                        <Eye size={18} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[150px_15px_1fr] items-start">
                  <span className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: '#23b3e3' }}>
                    {application.voterId ? <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={3} /> : <XCircle size={16} className="text-rose-500" strokeWidth={3} />} 
                    Voter ID
                  </span>
                  <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                  <div className="flex items-center justify-between min-h-[28px]">
                    <span className="pt-[1px]">{application.voterId ? application.voterId : <span className="text-slate-500">Not Provided</span>}</span>
                    {application.kycDocs?.voter && (
                      <button className="text-slate-400 hover:text-blue-500 transition-colors p-1" onClick={() => handleOpenDoc(application.kycDocs?.voter)}>
                        <Eye size={18} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[150px_15px_1fr] items-start">
                  <span className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: '#23b3e3' }}>
                    {application.smartCard ? <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={3} /> : <XCircle size={16} className="text-rose-500" strokeWidth={3} />} 
                    Smart Card
                  </span>
                  <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                  <div className="flex items-center justify-between min-h-[28px]">
                    <span className="pt-[1px]">{application.smartCard ? application.smartCard : <span className="text-slate-500">Not Provided</span>}</span>
                    {application.kycDocs?.smartCard && (
                      <button className="text-slate-400 hover:text-blue-500 transition-colors p-1" onClick={() => handleOpenDoc(application.kycDocs?.smartCard)}>
                        <Eye size={18} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Nominee KYC Section */}
              <div className="space-y-3.5 pt-2">
                <div className="font-extrabold text-[13px] text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Nominee KYC</div>
                
                <div className="grid grid-cols-[150px_15px_1fr] items-start">
                  <span className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: '#23b3e3' }}>
                    {application.nomineeAadhaar ? <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={3} /> : <XCircle size={16} className="text-rose-500" strokeWidth={3} />} 
                    Aadhar
                  </span>
                  <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                  <div className="flex items-center justify-between min-h-[28px]">
                    <span className="pt-[1px]">{application.nomineeAadhaar ? application.nomineeAadhaar : <span className="text-slate-500">Not Provided</span>}</span>
                    {application.nomineeKycDocs?.aadhaar && (
                      <button className="text-slate-400 hover:text-blue-500 transition-colors p-1" onClick={() => handleOpenDoc(application.nomineeKycDocs?.aadhaar)}>
                        <Eye size={18} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[150px_15px_1fr] items-start">
                  <span className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: '#23b3e3' }}>
                    {application.nomineePan ? <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={3} /> : <XCircle size={16} className="text-rose-500" strokeWidth={3} />} 
                    PAN
                  </span>
                  <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                  <div className="flex items-center justify-between min-h-[28px]">
                    <span className="pt-[1px]">{application.nomineePan ? application.nomineePan : <span className="text-slate-500">Not Provided</span>}</span>
                    {application.nomineeKycDocs?.pan && (
                      <button className="text-slate-400 hover:text-blue-500 transition-colors p-1" onClick={() => handleOpenDoc(application.nomineeKycDocs?.pan)}>
                        <Eye size={18} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[150px_15px_1fr] items-start">
                  <span className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: '#23b3e3' }}>
                    {application.nomineeVoterId ? <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={3} /> : <XCircle size={16} className="text-rose-500" strokeWidth={3} />} 
                    Voter ID
                  </span>
                  <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                  <div className="flex items-center justify-between min-h-[28px]">
                    <span className="pt-[1px]">{application.nomineeVoterId ? application.nomineeVoterId : <span className="text-slate-500">Not Provided</span>}</span>
                    {application.nomineeKycDocs?.voter && (
                      <button className="text-slate-400 hover:text-blue-500 transition-colors p-1" onClick={() => handleOpenDoc(application.nomineeKycDocs?.voter)}>
                        <Eye size={18} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[150px_15px_1fr] items-start">
                  <span className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: '#23b3e3' }}>
                    {application.nomineeSmartCard ? <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={3} /> : <XCircle size={16} className="text-rose-500" strokeWidth={3} />} 
                    Smart Card
                  </span>
                  <span className="font-bold text-[15px]" style={{ color: '#23b3e3' }}>:</span>
                  <div className="flex items-center justify-between min-h-[28px]">
                    <span className="pt-[1px]">{application.nomineeSmartCard ? application.nomineeSmartCard : <span className="text-slate-500">Not Provided</span>}</span>
                    {application.nomineeKycDocs?.smartCard && (
                      <button className="text-slate-400 hover:text-blue-500 transition-colors p-1" onClick={() => handleOpenDoc(application.nomineeKycDocs?.smartCard)}>
                        <Eye size={18} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
          {/* User Settings Sub-View */}
          <div className={`absolute inset-0 w-full h-full bg-[#f8fafc] px-5 py-4 overflow-y-auto scrollbar-hide transition-transform duration-300 ease-in-out ${activeView === 'userSettings' ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="mb-6 flex items-center gap-3 border-b border-slate-200 pb-3">
              <button 
                onClick={() => setActiveView('main')} 
                className="p-1.5 -ml-1.5 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors text-slate-700 shrink-0"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <h2 className="text-[17px] font-extrabold text-slate-800 tracking-tight">User Setting</h2>
            </div>

            <div className="flex flex-col gap-6 mt-4 pb-10">
              {/* Customer Criteria / User Matrix */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-[15px] font-extrabold text-slate-800 mb-4 border-b border-slate-100 pb-2">Customer Criteria / User</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">Username</label>
                    <input 
                      type="text" 
                      value={usernameInput} 
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[15px] font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                    <input 
                      type="text" 
                      value={passwordInput} 
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[15px] font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  
                  <button 
                    onClick={handleCredentialChange}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[14px] shadow-sm tracking-wide transition-colors mt-2"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Delete Account Anchor */}
              <div className="flex flex-col items-center justify-center mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Account</h3>
                <p className="text-center text-[13px] text-slate-600 font-medium mb-6 max-w-[250px]">
                  This will soft-delete the customer profile and move all their data to the Recycle Bin.
                </p>
                
                <button 
                  onClick={() => onDelete && onDelete(application.id)}
                  className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-[14px] shadow-sm tracking-wide transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} strokeWidth={2.5} /> DELETE ACCOUNT
                </button>
              </div>
            </div>
          </div>
          
        </div>

        {/* Bottom Action Buttons - Stationary */}
        {!isReadOnly && (
          <div className="p-4 bg-white rounded-t-3xl shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.05)] border-t border-slate-100 flex flex-col gap-3 z-10 pb-safe shrink-0">
            {activeView === 'main' ? (
              <>
                <div className="flex items-center gap-2.5 px-2">
                  <input 
                    type="checkbox" 
                    id="verifyData" 
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                  />
                  <label htmlFor="verifyData" className="text-[13px] font-bold text-slate-700 leading-snug cursor-pointer select-none">
                    I have read and verified all the data above
                  </label>
                </div>
                <div className="flex gap-2 justify-between w-full">
                  <button 
                    onClick={() => setShowApprovalPopup(true)}
                    disabled={!isVerified}
                    className={`flex-1 py-3.5 rounded-xl font-bold text-[13px] transition-colors shadow-sm tracking-wide ${isVerified ? 'bg-[#4ade80] hover:bg-[#22c55e] text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    APPROVE
                  </button>
                  <button 
                    onClick={() => onReject && onReject(application.id)}
                    disabled={!isVerified}
                    className={`flex-1 py-3.5 rounded-xl font-bold text-[13px] transition-colors shadow-sm tracking-wide ${isVerified ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    REJECT
                  </button>
                </div>
              </>
            ) : (
            <div className="flex justify-between w-full">
              <button
                onClick={handlePrevView}
                className="p-3.5 bg-rose-50 text-rose-600 rounded-xl shadow-sm hover:bg-rose-100 transition-colors flex items-center justify-center border border-rose-100"
                title="Previous Step"
              >
                <ArrowLeft size={20} strokeWidth={3} />
              </button>
                <button
                  onClick={handleNextView}
                  className="py-3.5 px-10 bg-blue-600 text-white rounded-xl font-bold text-[14px] shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  NEXT <ChevronRight size={18} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Custom Toast Notification Overlay */}
        {toastMsg && (
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="bg-slate-900 text-white px-5 py-3 rounded-full shadow-lg text-sm font-medium whitespace-nowrap tracking-wide border border-slate-700">
              {toastMsg}
            </div>
          </div>
        )}
      </div>

      {/* Approval Popup Modal */}
      {showApprovalPopup && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowApprovalPopup(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-[18px] tracking-tight">Confirm Approval</h3>
              <button onClick={() => setShowApprovalPopup(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-full shadow-sm">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Approval Date</label>
                <input 
                  type="date" 
                  value={approvalDate}
                  onChange={(e) => setApprovalDate(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[15px] font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
                <label className="block text-[13px] font-bold text-blue-700 mb-1">Next Due Date :</label>
                <div className="text-[16px] font-mono font-bold text-blue-600">{nextDueDate}</div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Set Date : (Override)</label>
                <input 
                  type="date" 
                  value={overrideDueDate}
                  onChange={(e) => setOverrideDueDate(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[15px] font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowApprovalPopup(false);
                }}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-[14px] rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowApprovalPopup(false);
                  onApprove && onApprove(application.id, { 
                    approvalDate, 
                    nextDueDate: overrideDueDate || nextDueDate 
                  });
                }}
                className="flex-1 py-3 bg-emerald-500 text-white font-bold text-[14px] rounded-xl shadow-sm shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalDetailsModal;
