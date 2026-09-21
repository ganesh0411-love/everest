import React, { useState, useMemo } from 'react';
import { X, Image as ImageIcon, Phone, Star } from 'lucide-react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
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
    if (window.confirm("Are you sure you want to delete this center?")) {
      try {
        await updateDoc(doc(db, 'centers', center.id), { status: 'Deleted' });
        onBack();
      } catch (error) {
        console.error("Error deleting center:", error);
        alert("Failed to delete center.");
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
      
      await Promise.all(draftCustomers.map(async (c) => {
        if (c.id) {
          await updateDoc(doc(db, 'customers', c.id), { status: 'Pending' });
        }
      }));
      
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
        </div>

      {/* 2. DYNAMIC MEMBER SLOT CARDS (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-3 py-2 pb-40">
        <div className="space-y-3">
          {Array.from({ length: visibleSlots }).map((_, idx) => {
            const slotNumber = idx + 1;
            const customerInSlot = centerCustomers[idx]; // Match sequentially
            const paddedIdx = String(slotNumber).padStart(2, '0');
            const isLeaderSlot = idx === 0;

            if (customerInSlot) {
              // FILLED SLOT STATE
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
                        <span className="font-bold text-black text-xs sm:text-[13px] truncate">{formatName(customerInSlot.name || customerInSlot.customerName)}</span>
                        <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.customerId || customerInSlot.emfId || customerInSlot.applicationNumber || '-'}</span>
                        <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{formatDOB(customerInSlot.dob || customerInSlot.dateOfBirth)}</span>
                        <span className="font-bold text-sky-600 text-[10px] sm:text-[11px] truncate">{center?.staffName || customerInSlot.staffName || '-'}</span>
                      </div>
                      
                      {/* Vertical Partition */}
                      <div className="w-px bg-black mx-1 sm:mx-2 self-stretch"></div>
                      
                      {/* Col B */}
                      <div className="flex flex-col min-w-0 flex-1 pl-1 shrink-0">
                        <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.gender || '-'}</span>
                        <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.maritalStatus || '-'}</span>
                        <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.age ? `${customerInSlot.age} Yrs` : getAge(customerInSlot.dob || customerInSlot.dateOfBirth)}</span>
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
                          {customerInSlot.phone || '9876543210'}
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
                        ) : (
                          <span className="w-full text-center py-0.5 text-[9px] font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-300 rounded-full whitespace-nowrap">
                            PENDING
                          </span>
                        )}
                      </div>

                      {/* 3. Action Button (Anchored to the Right) */}
                      <button 
                        onClick={() => {
                          setAddCustomerContext(customerInSlot);
                          setIsAddCustomerOpen(true);
                        }}
                        className="shrink-0 bg-purple-600 hover:bg-purple-700 active:scale-95 transition-transform text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap"
                      >
                        EDIT
                      </button>
                    </div>

                  </div>
                  
                  {/* Top Right Close */}
                  <button 
                    onClick={() => handleRemoveMember(customerInSlot)}
                    className="absolute top-2 right-2 text-red-500 font-bold hover:bg-red-50 rounded-full p-0.5 transition-colors z-10"
                  >
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>
              );
            }

            // EMPTY SLOT STATE
            return (
              <div key={idx} className={`border-2 rounded-2xl flex overflow-hidden min-h-[100px] relative p-2 mb-3 ${isLeaderSlot ? 'border-amber-400 bg-amber-50/50 shadow-md shadow-amber-100' : 'border-black bg-white'}`}>
                {/* Left Index Box */}
                <div className={`w-14 sm:w-16 shrink-0 border-r-2 flex flex-col items-center justify-center bg-transparent gap-1 ${isLeaderSlot ? 'border-amber-400' : 'border-black'}`}>
                  {isLeaderSlot && <Star size={14} className="text-amber-500 fill-amber-500" />}
                  <span className={`font-black text-2xl ${isLeaderSlot ? 'text-amber-500' : 'text-black'}`}>{paddedIdx}</span>
                </div>
                
                {/* Main Area (Empty) */}
                <div className="flex-1 flex flex-col items-center justify-center py-2 relative min-w-0 pr-8">
                  <div className="w-14 h-14 rounded-xl bg-sky-50 flex items-center justify-center mb-1 relative overflow-hidden">
                    <ImageIcon className="text-sky-200" size={24} />
                    {/* Tiny decorative landscape curve inside sky box */}
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-lime-500/20 rounded-b-xl border-t border-sky-200" style={{ clipPath: 'ellipse(70% 100% at 50% 100%)' }}></div>
                  </div>
                  <button onClick={() => handleAddClick(slotNumber)} className="bg-[#c276f0] hover:bg-purple-500 active:bg-purple-600 text-white text-[10px] font-bold py-1 px-5 rounded-full transition-colors shadow-sm tracking-wide">
                    ADD
                  </button>
                </div>
                
                {/* Top Right Close */}
                <button className="absolute top-2 right-2 text-red-500 font-bold hover:bg-red-50 rounded-full p-0.5 transition-colors z-10">
                  <X size={16} strokeWidth={3} />
                </button>
              </div>
            );
          })}
          
          {centerCustomers.length === totalMembers && centerCustomers.some(c => c.status === 'Draft') && (
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
      {/* 2. DESKTOP VIEW (Visible on >= 1024px, 2-Column Landscape Layout)        */}
      {/* ========================================================================= */}
      <div className="hidden lg:block w-full min-h-screen bg-gray-50/50 p-8">
        <div className="max-w-7xl mx-auto flex flex-row gap-8 items-start">
          
          {/* LEFT COLUMN: Sticky Leader & Center Details Sidebar */}
          <div className="w-[360px] shrink-0 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <img 
                src={center?.leaderPhoto || center?.leaderPhotoUrl || '/placeholder-leader.png'} 
                alt={center?.leader || center?.leaderName || 'Leader'} 
                className="w-24 h-24 rounded-xl object-cover border border-gray-200 shadow-sm"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Leader'; }}
              />
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
                <span className="font-semibold text-gray-500">Center Name</span>
                <span className="font-bold text-gray-900">{center?.centerName || '-'}</span>
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
          <div className="w-[1px] bg-gray-200 self-stretch min-h-[650px]" />

          {/* RIGHT COLUMN: 2-Column Slot Cards Grid */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: totalMembers || 5 }).map((_, idx) => {
                const customer = centerCustomers?.[idx];
                const slotNumber = String(idx + 1).padStart(2, '0');

                if (!customer) {
                  return (
                    <div key={idx} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-[160px] relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-extrabold text-gray-800">{slotNumber}</span>
                        <div className="w-12 h-10 bg-sky-50 rounded-lg flex items-center justify-center border border-sky-100">
                          <span className="text-sky-300 text-xl">🖼️</span>
                        </div>
                      </div>
                      <div className="flex justify-center mt-auto">
                        <button 
                          onClick={() => handleAddClick(idx + 1)}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-8 py-2 rounded-full shadow-sm active:scale-95 transition-transform"
                        >
                          ADD
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={customer.id || idx} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm relative flex flex-col justify-between">
                    <button 
                      onClick={() => handleRemoveMember(customer)}
                      className="absolute top-3 right-3 text-rose-500 hover:text-rose-700 font-bold text-base p-1"
                      title="Remove member"
                    >
                      ✕
                    </button>

                    <div className="flex gap-3">
                      <span className="text-xl font-extrabold text-gray-800 shrink-0 w-8">{slotNumber}</span>
                      
                      <div className="flex-1 min-w-0 pr-6 border-r border-gray-100">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{customer.name || customer.customerName}</h4>
                        <p className="text-[11px] text-gray-500">{customer.customerId || customer.customId || customer.applicationNumber || 'EMF-'}</p>
                        <p className="text-[11px] text-gray-500">{formatDOB(customer.dob || customer.dateOfBirth)} • {customer.age || getAge(customer.dob || customer.dateOfBirth) || '-'} Yrs</p>
                        <p className="text-[11px] text-purple-700 font-semibold">{customer.staffName || center?.staffName || '-'}</p>
                      </div>

                      <div className="w-24 shrink-0 flex flex-col items-center justify-center text-right text-xs">
                        <p className="text-gray-700 font-medium">{customer.gender || 'Female'}</p>
                        <p className="text-gray-500">{customer.maritalStatus || 'Married'}</p>
                        <p className="text-gray-500 text-[11px] truncate">{customer.village || customer.villageName || customer.area || center?.villageName || 'Batlagundu'}</p>
                        {(customer.photoBase64 || customer.photoUrl || customer.image || customer.photo) && (
                          <img src={customer.photoBase64 || customer.photoUrl || customer.image || customer.photo} alt={customer.name} className="w-10 h-10 rounded-full object-cover mt-1 border" />
                        )}
                      </div>
                    </div>

                    {/* Inline Bottom Bar */}
                    <div className="flex items-center justify-between gap-1.5 mt-3 pt-2 border-t border-gray-100 flex-nowrap">
                      <span className="text-xs font-semibold text-gray-800 truncate">📞 {customer.phone || customer.mobile || customer.mobileNumber}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full border ${
                        customer.status?.toLowerCase() === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                        customer.status?.toLowerCase() === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                        'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        {(customer.status || 'PENDING').toUpperCase()}
                      </span>
                      <button 
                        onClick={() => {
                          setAddCustomerContext(customer);
                          setIsAddCustomerOpen(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap"
                      >
                        EDIT
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DONE / PUBLISH BUTTON */}
            {centerCustomers?.length === totalMembers && centerCustomers.some(c => c.status === 'Draft') && (
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
      </div>

      {isAddCustomerOpen && (
        <AddCustomerModal 
          isOpen={isAddCustomerOpen} 
          onClose={() => setIsAddCustomerOpen(false)} 
          userProfile={userProfile} 
          activeBranch={activeBranch}
          initialData={addCustomerContext}
          onAddCustomer={handleAddCustomer}
        />
      )}

      {isEditOpen && (
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
