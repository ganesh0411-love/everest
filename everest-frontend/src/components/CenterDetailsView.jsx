import React, { useState, useMemo } from 'react';
import { X, Image as ImageIcon, Phone, Star } from 'lucide-react';
import { doc, updateDoc, addDoc, collection, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import AddCustomerModal from './AddCustomerModal';
import CreateCenterModal from './CreateCenterModal';

export default function CenterDetailsView({ center, customers, userProfile, activeBranch, onBack, onCenterUpdate }) {
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [addCustomerContext, setAddCustomerContext] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const totalMembers = Number(center?.totalMembers || center?.noOfCustomers || center?.members || 0);
  
  // Filter and strictly sort customers matching this center
  const centerCustomers = useMemo(() => {
    const filtered = (customers || []).filter(cust => {
      if (cust.centerId && center?.id) {
        return cust.centerId === center.id;
      }
      return cust.centerName?.trim().toLowerCase() === center?.centerName?.trim().toLowerCase() &&
             (cust.branchName?.trim().toLowerCase() === center?.branchName?.trim().toLowerCase() || !cust.branchName);
    });
    
    // Strict ascending sort by slotIndex, falling back to creation time, with Leader forcibly prioritized
    return filtered.sort((a, b) => {
      const isALeader = a.customerId === (center?.leaderId || center?.leaderCustomerId) || a.customerName?.trim().toLowerCase() === (center?.leader || center?.leaderName)?.trim().toLowerCase();
      const isBLeader = b.customerId === (center?.leaderId || center?.leaderCustomerId) || b.customerName?.trim().toLowerCase() === (center?.leader || center?.leaderName)?.trim().toLowerCase();

      if (isALeader && !isBLeader) return -1;
      if (!isALeader && isBLeader) return 1;

      if (a.slotIndex !== undefined && b.slotIndex !== undefined) {
        return a.slotIndex - b.slotIndex;
      }
      if (a.slotIndex !== undefined) return -1;
      if (b.slotIndex !== undefined) return 1;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
  }, [customers, center]);

  const totalCenterLoanAmount = useMemo(() => {
    return centerCustomers.reduce((sum, cust) => {
      const amt = Number(cust.loanAmount || cust.appliedAmount || cust.amount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [centerCustomers]);

  const displayLoanAmount = totalCenterLoanAmount > 0 
    ? `₹${totalCenterLoanAmount.toLocaleString('en-IN')}` 
    : '-';

  // 1. Resolve selected branch directly from global state / storage:
  const resolvedBranch = (
    (typeof activeBranch === 'string' ? activeBranch : (activeBranch?.name || activeBranch?.branchName || '')) ||
    localStorage.getItem('selectedBranch') || 
    localStorage.getItem('activeBranch') || 
    userProfile?.branch || 
    userProfile?.branchName || 
    userProfile?.branchType ||
    ''
  ).trim().toLowerCase();

  const resolvedRole = (
    userProfile?.role || 
    localStorage.getItem('userRole') || 
    'admin'
  ).trim().toLowerCase();

  // 2. Strict check for Main Branch Admin:
  const isMainBranchAdmin = Boolean(
    resolvedRole === 'admin' && (
      resolvedBranch === 'main branch' ||
      resolvedBranch.includes('main') ||
      resolvedBranch === 'all' ||
      resolvedBranch === ''
    )
  );

  // 3. Write-action gate:
  const canManageCenter = !isMainBranchAdmin;

  const safeCenter = center || {};
  const safeCustomers = Array.isArray(centerCustomers) ? centerCustomers : [];
  const targetCapacity = Number(safeCenter.totalMembers || safeCenter.noOfCustomers || safeCenter.members || 5);

  const handleRemoveMember = async (customer) => {
    if (window.confirm(`Are you sure you want to remove ${customer.firstName || customer.name || 'this member'} from this center?`)) {
      try {
        await updateDoc(doc(db, 'customers', customer.id), {
          centerName: '',
          groupId: '',
          groupName: '',
          status: 'Draft',
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error removing member:", error);
        alert("Failed to remove member");
      }
    }
  };


  const handleAddClick = (slotNumber) => {
    setAddCustomerContext({
      slotIndex: slotNumber,
      center: center?.centerName || '',
      city: center?.villageName || center?.village || '',
      district: center?.district || '',
      centerLeaderName: center?.leader || center?.leaderName || '',
      leaderCustomerId: center?.leaderId || '',
      groupName: center?.groupName || center?.group || '',
      branchName: center?.branchName || '',
      branchId: center?.branchId || '',
      staffName: center?.staffName || '',
      staffId: center?.staffId || '',
      centerLocationUrl: center?.locationUrl || center?.gpsLocation || center?.location || ''
    });
    setIsAddCustomerOpen(true);
  };

  const getAge = (dob) => {
    if (!dob) return 'N/A';
    let dobDate;
    if (dob.includes('/')) {
      const parts = dob.split('/');
      if (parts[2].length === 4) dobDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else if (dob.includes('-') && dob.split('-')[0].length === 2) {
      const parts = dob.split('-');
      dobDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      dobDate = new Date(dob);
    }
    
    if (isNaN(dobDate)) return 'N/A';
    const diff_ms = Date.now() - dobDate.getTime();
    const age_dt = new Date(diff_ms); 
    return Math.abs(age_dt.getUTCFullYear() - 1970) + ' Yrs';
  };

  const formatName = (name) => {
    if (!name) return '';
    return name.replace(/^(Mr\.|Mrs\.|Miss)\s*/i, '').trim();
  };

  const formatDOB = (dob) => {
    if (!dob) return '-';
    // Handles both "YYYY-MM-DD" and existing standard date formats
    const parts = dob.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // Format from YYYY-MM-DD to DD/MM/YYYY
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
      return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
    }
    return dob;
  };

  const handleDelete = async () => {
    if (center.status === 'Deleted' || center.isDeleted) {
      if (window.confirm("Permanently delete this center from the database? This cannot be undone.")) {
        try {
          await deleteDoc(doc(db, 'centers', center.id));
          onBack();
        } catch (error) {
          console.error("Error deleting center permanently:", error);
          alert("Failed to permanently delete center.");
        }
      }
    } else {
      if (window.confirm("Are you sure you want to delete this center?")) {
        try {
          await updateDoc(doc(db, 'centers', center.id), { 
            status: 'Deleted',
            isDeleted: true,
            recentlyRestored: false 
          });
          onBack();
        } catch (error) {
          console.error("Error deleting center:", error);
          alert("Failed to delete center.");
        }
      }
    }
  };

  const handleAddCustomer = async (customerData) => {
    try {
      const payload = {
        ...customerData,
        centerName: center.centerName || '',
        centerId: center.id || '',
        branchName: center.branchName || '',
        branchId: center.branchId || '',
        slotIndex: addCustomerContext?.slotIndex || customerData.slotIndex || centerCustomers.length + 1
      };

      if (customerData.id && centerCustomers.find(c => c.id === customerData.id)) {
        await updateDoc(doc(db, 'customers', customerData.id), {
          ...payload,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          ...payload,
          status: 'Draft',
          createdAt: new Date().toISOString()
        });
      }
      setIsAddCustomerOpen(false);
    } catch (error) {
      console.error("Error saving customer to center:", error);
      throw error;
    }
  };

  const handleBatchPublish = async () => {
    try {
      setIsPublishing(true);
      const draftCustomers = centerCustomers.filter(c => c.status === 'Draft');
      if (draftCustomers.length === 0) {
        alert("All customers are already published!");
        return;
      }
      
      const batch = writeBatch(db);
      draftCustomers.forEach(c => {
        if (c.id) {
          batch.update(doc(db, 'customers', c.id), { status: 'Pending' });
        }
      });
      await batch.commit();
      
    } catch (error) {
      console.error("Error publishing customers:", error);
      alert("Failed to publish customers. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const visibleSlots = Math.min(totalMembers, centerCustomers.length + 1);

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MOBILE VIEW (Visible on < 1024px, unchanged)                           */}
      {/* ========================================================================= */}
    <div className="flex flex-col min-h-screen bg-slate-50 w-full overflow-hidden lg:hidden pb-36">
      {/* 1. TOP SUMMARY HEADER (FROZEN) */}
      <div className="shrink-0 z-40 sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-1 flex gap-3 relative pt-4 px-3 pb-3 shadow-sm">
          {/* Left Side: Avatar */}
          <div className="shrink-0 w-24 h-28 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden relative shadow-sm">
            {center?.leaderPhoto ? (
              <img src={center.leaderPhoto} alt="Leader" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="text-slate-300" size={32} />
            )}
          </div>
          
          {/* Center Section: Metadata */}
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] sm:text-xs">
              <span className="font-semibold text-slate-600">Leader Name</span>
              <span className="font-bold text-slate-900 truncate">{center?.leader || center?.leaderName || '-'}</span>
              
              <span className="font-semibold text-slate-600">Customer ID</span>
              <span className="font-bold text-slate-900 truncate">{center?.leaderId || '-'}</span>
              
              <span className="font-semibold text-slate-600">Center Name</span>
              <span className="font-bold text-slate-900 truncate">{center?.centerName || '-'}</span>
              
              <span className="font-semibold text-slate-600">No.of . Customer</span>
              <span className="font-bold text-slate-900 truncate">{totalMembers}</span>
              
              <span className="font-semibold text-slate-600">Loan Amount</span>
              <span className="text-emerald-600 font-bold text-sm tracking-tight truncate">{displayLoanAmount}</span>
            </div>
          </div>

          {/* Right Action Buttons */}
          {canManageCenter && (
            <div className="shrink-0 flex flex-col items-end pt-1">
              <button 
                onClick={() => setIsEditOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full transition-colors shadow-sm w-[64px]"
              >
                UPDATE
              </button>
              <button 
                onClick={handleDelete}
                className="bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full transition-colors shadow-sm mt-1.5 w-[64px]"
              >
                DELETE
              </button>
            </div>
          )}
        </div>

      {/* 2. DYNAMIC MEMBER SLOT CARDS (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-3 py-2 pb-40">
        <div className="space-y-3">
          {(centerCustomers || []).map((customerInSlot, idx) => {
            const slotNumber = idx + 1;
            const paddedIdx = String(slotNumber).padStart(2, '0');
            const isLeaderSlot = idx === 0;

            return (
              <div key={idx} className={`border-2 rounded-2xl flex overflow-hidden relative p-2 min-h-[100px] mb-3 ${isLeaderSlot ? 'border-amber-400 bg-amber-50/50 shadow-md shadow-amber-100' : 'border-black bg-white'}`}>
                {/* Left Index Box */}
                <div className={`w-14 sm:w-16 shrink-0 border-r-2 flex flex-col items-center justify-center bg-transparent gap-1 ${isLeaderSlot ? 'border-amber-400' : 'border-black'}`}>
                  {isLeaderSlot && <Star size={14} className="text-amber-500 fill-amber-500" />}
                  <span className={`font-black text-2xl ${isLeaderSlot ? 'text-amber-500' : 'text-black'}`}>{paddedIdx}</span>
                </div>
                
                {/* Main Details Area */}
                <div className="flex-1 pl-2 sm:pl-3 flex flex-col justify-between min-w-0 pr-8">
                  
                  <div className="flex items-start">
                    {/* Col A */}
                    <div className="flex flex-col min-w-0 flex-1 pr-1">
                      <span className="font-bold text-black text-xs sm:text-[13px] truncate">{customerInSlot.name || customerInSlot.customerName || '-'}</span>
                      <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.customerId || customerInSlot.emfId || customerInSlot.applicationNumber || '-'}</span>
                      <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.dob || customerInSlot.dateOfBirth ? customerInSlot.dob || customerInSlot.dateOfBirth : 'DOB'}</span>
                      <span className="font-bold text-sky-600 text-[10px] sm:text-[11px] truncate">{center?.staffName || customerInSlot.staffName || '-'}</span>
                    </div>
                    
                    {/* Vertical Partition */}
                    <div className="w-px bg-black mx-1 sm:mx-2 self-stretch"></div>
                    
                    {/* Col B */}
                    <div className="flex flex-col min-w-0 flex-1 pl-1 shrink-0">
                      <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.gender || '-'}</span>
                      <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.maritalStatus || '-'}</span>
                      <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.age ? `${customerInSlot.age} Yrs` : (customerInSlot.dob ? 'Yrs' : '-')}</span>
                      <span className="font-bold text-sky-600 text-[10px] sm:text-[11px] truncate">{customerInSlot.branchName || center?.branchName || '-'}</span>
                    </div>

                    {/* Photo Preview */}
                    <div className="w-14 h-14 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 ml-1">
                       {customerInSlot.photoBase64 || customerInSlot.photoUrl || customerInSlot.image ? (
                         <img src={customerInSlot.photoBase64 || customerInSlot.photoUrl || customerInSlot.image} alt="Customer" className="w-full h-full object-cover" />
                       ) : (
                         <ImageIcon className="text-slate-300" size={16} />
                       )}
                    </div>
                  </div>

                  {/* Bottom Action Strip: Strictly Single Line, Zero Wrap */}
                  <div className="flex items-center justify-between gap-1.5 mt-2 pt-1.5 border-t border-gray-100 w-full flex-nowrap min-w-0">
                    
                    {/* 1. Phone Number (Compact with Left Alignment) */}
                    <div className="flex items-center gap-1 shrink min-w-0">
                      <span className="text-emerald-700 text-xs shrink-0">📞</span>
                      <span className="text-xs font-semibold text-gray-800 truncate tracking-tight">
                        {customerInSlot.phone || customerInSlot.mobileNumber || '-'}
                      </span>
                    </div>

                    {/* 2. Fixed-Width Centered Status Badge Slot (Prevents Layout Shifts) */}
                    <div className="w-[74px] shrink-0 flex items-center justify-center">
                      {customerInSlot.status?.toLowerCase() === 'approved' ? (
                        <span className="w-full text-center py-0.5 text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full whitespace-nowrap">
                          APPROVED
                        </span>
                      ) : customerInSlot.status?.toLowerCase() === 'rejected' ? (
                        <span className="w-full text-center py-0.5 text-[9px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-300 rounded-full whitespace-nowrap">
                          REJECTED
                        </span>
                      ) : customerInSlot.status?.toLowerCase() === 'draft' ? (
                        <span className="w-full text-center py-0.5 text-[9px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-300 rounded-full whitespace-nowrap">
                          DRAFT
                        </span>
                      ) : (
                        <span className="w-full text-center py-0.5 text-[9px] font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-300 rounded-full whitespace-nowrap">
                          PENDING
                        </span>
                      )}
                    </div>

                    {/* 3. Action Button (Anchored to the Right) */}
                    {canManageCenter && (
                      <button 
                        onClick={() => {
                          setAddCustomerContext(customerInSlot);
                          setIsAddCustomerOpen(true);
                        }}
                        className="shrink-0 bg-purple-600 hover:bg-purple-700 active:scale-95 transition-transform text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap"
                      >
                        EDIT
                      </button>
                    )}
                  </div>

                </div>
                
                {/* Top Right Close */}
                {canManageCenter && (
                  <button 
                    onClick={() => handleRemoveMember(customerInSlot)}
                    className="absolute top-2 right-2 text-red-500 font-bold hover:bg-red-50 rounded-full p-0.5 transition-colors z-10"
                  >
                    <X size={16} strokeWidth={3} />
                  </button>
                )}
              </div>
            );
          })}
          
          {canManageCenter && (centerCustomers?.length || 0) < totalMembers && (
            <div className="flex justify-center pt-2 pb-4">
              <button 
                onClick={() => handleAddClick((centerCustomers?.length || 0) + 1)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-sm active:scale-95 transition-all"
              >
                <span className="text-base">+</span> ADD CUSTOMER ({(centerCustomers?.length || 0)} / {totalMembers})
              </button>
            </div>
          )}
          
          {canManageCenter && centerCustomers.length === totalMembers && centerCustomers.some(c => c.status === 'Draft') && (
            <div className="pt-2 pb-6 flex justify-center">
              <button 
                onClick={handleBatchPublish} 
                disabled={isPublishing}
                className="w-full sm:w-auto bg-[#10a37f] hover:bg-[#0e906f] text-white font-bold text-base py-3 px-8 rounded-xl shadow-lg shadow-[#10a37f]/30 transition-all flex items-center justify-center gap-2"
              >
                {isPublishing ? 'PUBLISHING...' : 'DONE'}
              </button>
            </div>
          )}
          
          {totalMembers === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200 border-dashed">
              Customer limit is set to 0. Please edit the center to assign slots.
            </div>
          )}
        </div>
      </div>


      </div>
      {/* ========================================================================= */}
      {/* 2. DESKTOP VIEW (Visible on >= 1024px, Single Column Layout)        */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex max-w-7xl mx-auto gap-8 p-6 items-start h-[calc(100vh-80px)] overflow-hidden">
        
        {/* LEFT COLUMN: Sticky Leader & Center Details Sidebar */}
        <div className="w-[340px] shrink-0 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-0">
          <div className="flex items-start justify-between gap-4 mb-6">
            <img 
              src={center?.leaderPhoto || center?.leaderPhotoUrl || '/placeholder-leader.png'} 
              alt={center?.leader || center?.leaderName || 'Leader'} 
              className="w-24 h-24 rounded-xl object-cover border border-gray-200 shadow-sm"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Leader'; }}
            />
            {canManageCenter && (
              <div className="flex flex-col gap-2 shrink-0">
                <button 
                  onClick={() => setIsEditOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-6 py-2 rounded-full uppercase tracking-wider shadow-sm transition-colors"
                >
                  EDIT
                </button>
                <button 
                  onClick={handleDelete}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-6 py-2 rounded-full uppercase tracking-wider shadow-sm transition-colors"
                >
                  DELETE
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-500">Leader Name</span>
              <span className="font-bold text-gray-900">{center?.leader || center?.leaderName || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-500">Customer ID</span>
              <span className="font-bold text-gray-900">{center?.leaderId || center?.leaderCustomerId || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-500">Center / Area</span>
              <span className="font-bold text-gray-900 text-right max-w-[150px] truncate">{center?.centerName || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-500">Group Name</span>
              <span className="font-bold text-gray-900 text-right truncate max-w-[150px]">{center?.groupName || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-500">Staff Assigned</span>
              <span className="font-bold text-gray-900">{center?.staffName || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-500">Branch</span>
              <span className="font-bold text-gray-900">{center?.branchName || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-500">No. of Customer</span>
              <span className="font-bold text-gray-900">{totalMembers || center?.noOfCustomers || 0}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="font-semibold text-gray-500">Loan Amount</span>
              <span className="font-bold text-emerald-600 text-base">{displayLoanAmount || '-'}</span>
            </div>
          </div>
        </div>

        {/* VERTICAL DIVIDER */}
        <div className="w-[1px] bg-gray-200 self-stretch" />

        {/* RIGHT PANEL: Scrollable Full-Width Single-Column Cards */}
        <div className="flex-1 h-full overflow-y-auto pr-2 flex flex-col gap-4 pb-20">
          {(centerCustomers || []).map((customer, idx) => {
            const slotNumber = String(idx + 1).padStart(2, '0');

            return (
              <div 
                key={customer.id || idx} 
                className="w-full bg-white rounded-2xl p-4 border border-gray-200 shadow-sm relative flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                {/* 1. Corner Soft-Delete Button */}
                {canManageCenter && (
                  <button 
                    onClick={() => handleRemoveMember(customer)}
                    className="absolute top-3 right-3 text-rose-500 hover:text-rose-700 font-bold text-sm w-7 h-7 flex items-center justify-center rounded-full hover:bg-rose-50 transition-colors z-10"
                    title="Remove member"
                  >
                    ✕
                  </button>
                )}

                <div className="flex items-center gap-4 w-full pr-8">
                  {/* Slot Index */}
                  <div className="shrink-0 w-8 text-center">
                    <span className="text-xl font-extrabold text-gray-800">{slotNumber}</span>
                  </div>

                  {/* Left Column: 4 items */}
                  <div className="w-48 shrink-0 pr-3 border-r border-gray-200 space-y-1 text-xs">
                    <h4 className="font-bold text-gray-900 text-sm truncate">{customer.name || customer.customerName}</h4>
                    <p className="font-semibold text-gray-500">{customer.customerId || customer.customId || customer.applicationNumber || 'EMF-'}</p>
                    <p className="text-gray-600">{formatDOB(customer.dob || customer.dateOfBirth) || 'DOB'}</p>
                    <p className="text-purple-700 font-bold">{customer.staffName || center?.staffName || '-'}</p>
                  </div>

                  {/* Right Column: 4 items (Parallel Alignment) */}
                  <div className="w-44 shrink-0 pl-2 space-y-1 text-xs text-gray-700">
                    <p className="font-semibold text-gray-800">{customer.gender || 'Female'}</p>
                    <p>{customer.maritalStatus || 'Married'}</p>
                    <p className="text-gray-600 font-semibold">{customer.age ? `${customer.age} Yrs` : (getAge(customer.dob || customer.dateOfBirth) ? `${getAge(customer.dob || customer.dateOfBirth)} Yrs` : '-')}</p>
                    <p className="text-sky-700 font-bold truncate">{customer.villageCity || customer.villageName || customer.village || customer.area || center?.villageName || '-'}</p>
                  </div>

                  {/* Customer Photo Frame: Clean, No LOCA artifacts */}
                  <div className="ml-auto shrink-0">
                    {customer.photoUrl || customer.photoBase64 || customer.image || customer.photo ? (
                      <img 
                        src={customer.photoUrl || customer.photoBase64 || customer.image || customer.photo} 
                        alt={customer.name} 
                        className="w-14 h-14 rounded-xl object-cover border border-gray-200 shadow-sm"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/60?text=User'; }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-xl">
                        👤
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 w-full">
                  <span className="text-xs font-semibold text-gray-800">📞 {customer.phone || customer.mobileNumber || customer.mobile || '-'}</span>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-0.5 text-[10px] font-bold rounded-full border uppercase ${
                        (customer.status || '').toLowerCase() === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                        (customer.status || '').toLowerCase() === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                        (customer.status || '').toLowerCase() === 'draft' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                        'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      {customer.status || 'DRAFT'}
                    </span>
                    {canManageCenter && (
                      <button 
                        onClick={() => {
                          setAddCustomerContext(customer);
                          setIsAddCustomerOpen(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-1 rounded-full shadow-sm"
                      >
                        EDIT
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ADD CUSTOMER BUTTON (Only if under capacity) */}
          {canManageCenter && (centerCustomers?.length || 0) < totalMembers && (
            <div className="flex justify-center pt-2">
              <button 
                onClick={() => handleAddClick((centerCustomers?.length || 0) + 1)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-sm active:scale-95 transition-all"
              >
                <span className="text-base">+</span> ADD CUSTOMER ({(centerCustomers?.length || 0)} / {totalMembers})
              </button>
            </div>
          )}

          {/* DONE / PUBLISH BUTTON */}
          {canManageCenter && centerCustomers?.length === totalMembers && centerCustomers.some(c => c.status === 'Draft') && (
            <div className="pt-8 pb-6 flex justify-center">
              <button 
                onClick={handleBatchPublish}
                disabled={isPublishing}
                className="bg-[#10a37f] hover:bg-[#0e906f] text-white font-bold text-base py-3 px-10 rounded-xl shadow-lg transition-all"
              >
                {isPublishing ? 'PUBLISHING...' : 'DONE'}
              </button>
            </div>
          )}
        </div>
      </div>

      {Boolean(isAddCustomerOpen) && (
        <AddCustomerModal 
          isOpen={isAddCustomerOpen} 
          onClose={() => setIsAddCustomerOpen(false)} 
          userProfile={userProfile} 
          activeBranch={activeBranch}
          initialData={addCustomerContext}
          onAddCustomer={handleAddCustomer}
        />
      )}

      {Boolean(isEditOpen) && (
        <CreateCenterModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          userProfile={userProfile}
          activeBranch={activeBranch}
          editCenter={center}
          currentFilledCapacity={centerCustomers.length}
          onSuccess={(updatedData) => {
             if (onCenterUpdate) onCenterUpdate(updatedData);
             setIsEditOpen(false);
          }}
        />
      )}
    </>
  );
}
