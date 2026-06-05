import React from 'react';
import { X, Building2, User, UserCircle, Phone, FileBadge, FileText, IdCard, ChevronRight } from 'lucide-react';

const ApprovalDetailsModal = ({ application, onClose, onApprove, onReject, onStayPending }) => {
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
      title: 'Center Details',
      subtitle: `Branch: ${application.branch || 'Anna Nagar'}`,
      icon: <Building2 size={20} className="text-emerald-600" />,
      bg: 'bg-emerald-100',
    },
    {
      title: 'Staff',
      subtitle: `Staff Name: ${application.staffName || 'Ramesh'}`,
      icon: <User size={20} className="text-rose-500" />,
      bg: 'bg-rose-100',
    },
    {
      title: 'Personal Details',
      subtitle: `DOB: ${application.dob || '12-04-1998'}`,
      icon: <UserCircle size={20} className="text-amber-500" />,
      bg: 'bg-amber-100',
    },
    {
      title: 'Contact',
      subtitle: `Phone: +91 ${application.phone || '9988776655'}`,
      icon: <Phone size={20} className="text-blue-500" />,
      bg: 'bg-blue-100',
    },
    {
      title: 'Nominee Details',
      subtitle: `Nominee: ${application.nomineeName || 'Geetha'}`,
      icon: <FileBadge size={20} className="text-purple-600" />,
      bg: 'bg-purple-100',
    },
    {
      title: 'Previous Record',
      subtitle: `Past Loans: ${application.pastLoans || '2 (Closed)'}`,
      icon: <FileText size={20} className="text-rose-600" />,
      bg: 'bg-rose-100',
    },
    {
      title: 'KYC Details',
      subtitle: `Aadhar: ${maskedAadhar}`,
      icon: <IdCard size={20} className="text-indigo-600" />,
      bg: 'bg-indigo-100',
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[#f8fafc] w-full max-w-sm rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom-8 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Profile Section */}
        <div className="p-4 bg-white relative rounded-t-3xl shadow-sm z-10 flex items-start gap-4 pt-6 pb-4">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
          
          <div className="w-20 h-24 rounded-2xl overflow-hidden shadow-md flex-shrink-0 border border-slate-100 bg-slate-50">
            {application.image ? (
              <img src={application.image} alt={application.customerName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <UserCircle size={40} />
              </div>
            )}
          </div>
          
          <div className="flex-1 pt-1">
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              {application.customerName || 'Vignesh K'}
            </h2>
            <p className="text-[13px] text-slate-700 mt-1 font-medium">
              Employee ID: - {application.employeeId || 'F00672'}
            </p>
          </div>

          <div className="flex flex-col items-end pt-1 pr-8">
            <span className="text-[11px] font-medium text-emerald-600">Apply Date:</span>
            <span className="text-[13px] font-semibold text-emerald-600">{formatDate(application.appDate)}</span>
          </div>
        </div>

        {/* Scrollable Info Rows */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#f8fafc] scrollbar-hide">
          {infoRows.map((row, index) => (
            <div key={index} className="bg-white rounded-2xl p-3 flex items-center gap-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] border border-slate-50 cursor-pointer active:scale-[0.98] transition-transform">
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

        {/* Bottom Action Buttons */}
        <div className="p-4 bg-white rounded-t-3xl shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.05)] border-t border-slate-100 flex gap-2 justify-between z-10 pb-safe">
          <button 
            onClick={() => onApprove && onApprove(application.id)}
            className="flex-1 py-3.5 bg-[#4ade80] hover:bg-[#22c55e] text-white rounded-xl font-bold text-[13px] transition-colors shadow-sm tracking-wide"
          >
            APPROVE
          </button>
          <button 
            onClick={() => onReject && onReject(application.id)}
            className="flex-1 py-3.5 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl font-bold text-[13px] transition-colors shadow-sm tracking-wide"
          >
            REJECT
          </button>
          <button 
            onClick={() => onStayPending && onStayPending(application.id)}
            className="flex-1 py-3.5 bg-slate-500 hover:bg-slate-600 text-white rounded-xl font-bold text-[13px] transition-colors shadow-sm tracking-wide whitespace-nowrap px-2"
          >
            STAY PENDING
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDetailsModal;
