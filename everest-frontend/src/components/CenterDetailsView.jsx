import React, { useState, useMemo } from 'react';
import { X, Image as ImageIcon, Phone } from 'lucide-react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import AddCustomerModal from './AddCustomerModal';
import CreateCenterModal from './CreateCenterModal';

export default function CenterDetailsView({ center, customers, onBack, userProfile, activeBranch }) {
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [addCustomerContext, setAddCustomerContext] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const totalMembers = Number(center?.totalMembers || center?.noOfCustomers || center?.members || 0);
  
  // Filter customers matching this center
  const centerCustomers = useMemo(() => {
    return (customers || []).filter(
      cust => cust.centerName?.trim().toLowerCase() === center?.centerName?.trim().toLowerCase() &&
              (cust.branchName?.trim().toLowerCase() === center?.branchName?.trim().toLowerCase() || !cust.branchName)
    );
  }, [customers, center]);

  const handleAddClick = () => {
    setAddCustomerContext({
      center: center?.village || center?.villageName || center?.centerName || '',
      centerLeaderName: center?.leader || center?.leaderName || '',
      leaderCustomerId: center?.leaderId || '',
      groupName: center?.group || center?.groupName || '',
      branch: center?.branchName || '',
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
        branchId: center.branchId || ''
      };

      if (customerData.id && centerCustomers.find(c => c.id === customerData.id)) {
        await updateDoc(doc(db, 'customers', customerData.id), {
          ...payload,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          ...payload,
          status: 'Pending',
          createdAt: new Date().toISOString()
        });
      }
      setIsAddCustomerOpen(false);
    } catch (error) {
      console.error("Error saving customer to center:", error);
      throw error;
    }
  };

  const visibleSlots = Math.min(totalMembers, centerCustomers.length + 1);

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full overflow-x-hidden md:hidden">
      <div className="flex-1 overflow-y-auto px-3 pb-8 space-y-4 pt-4">
        
        {/* 1. TOP SUMMARY HEADER */}
        <div className="p-1 mb-2 flex gap-3 relative">
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
              <span className="font-bold text-slate-900 truncate">-</span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="shrink-0 flex flex-col items-end pt-1">
            <button 
              onClick={() => setIsEditOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full transition-colors shadow-sm w-[64px]"
            >
              EDIT
            </button>
            <button 
              onClick={handleDelete}
              className="bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full transition-colors shadow-sm mt-1.5 w-[64px]"
            >
              DELETE
            </button>
          </div>
        </div>

        {/* 2. DYNAMIC MEMBER SLOT CARDS */}
        <div className="space-y-3">
          {Array.from({ length: visibleSlots }).map((_, idx) => {
            const slotNumber = idx + 1;
            const customerInSlot = centerCustomers[idx]; // Match sequentially
            const paddedIdx = String(slotNumber).padStart(2, '0');

            if (customerInSlot) {
              // FILLED SLOT STATE
              return (
                <div key={idx} className="border-2 border-black rounded-2xl flex overflow-hidden relative bg-white p-2 min-h-[100px] mb-3">
                  {/* Left Index Box */}
                  <div className="w-14 sm:w-16 shrink-0 border-r-2 border-black flex items-center justify-center bg-transparent">
                    <span className="font-black text-2xl text-black">{paddedIdx}</span>
                  </div>
                  
                  {/* Main Details Area */}
                  <div className="flex-1 pl-2 sm:pl-3 flex flex-col justify-between min-w-0 pr-8">
                    
                    <div className="flex items-start">
                      {/* Col A */}
                      <div className="flex flex-col min-w-0 flex-1 pr-1">
                        <span className="font-bold text-black text-xs sm:text-[13px] truncate">{formatName(customerInSlot.name || customerInSlot.customerName)}</span>
                        <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.id || customerInSlot.customerId || '-'}</span>
                        <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.dob || customerInSlot.dateOfBirth || '-'}</span>
                      </div>
                      
                      {/* Vertical Partition */}
                      <div className="w-px bg-black mx-1 sm:mx-2 self-stretch"></div>
                      
                      {/* Col B */}
                      <div className="flex flex-col min-w-0 flex-1 pl-1 shrink-0">
                        <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.gender || '-'}</span>
                        <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.maritalStatus || '-'}</span>
                        <span className="font-bold text-black text-[10px] sm:text-[11px] truncate">{customerInSlot.age ? `${customerInSlot.age} Yrs` : getAge(customerInSlot.dob || customerInSlot.dateOfBirth)}</span>
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

                    {/* Bottom Row: Phone & EDIT Button */}
                    <div className="flex items-center justify-between mt-1 pt-1">
                      {customerInSlot.phone ? (
                        <a href={`tel:${customerInSlot.phone}`} className="inline-flex items-center gap-1 hover:bg-slate-50 transition-colors w-fit">
                          <div className="w-4 h-4 text-green-500 flex items-center justify-center shrink-0">
                            <Phone size={14} className="fill-current" />
                          </div>
                          <span className="font-semibold text-black text-xs tracking-wide">{customerInSlot.phone}</span>
                        </a>
                      ) : (
                        <span className="font-semibold text-slate-400 text-xs italic">No Phone</span>
                      )}
                      
                      <button 
                        onClick={() => {
                          setAddCustomerContext(customerInSlot);
                          setIsAddCustomerOpen(true);
                        }}
                        className="bg-[#c276f0] hover:bg-purple-500 active:bg-purple-600 text-white text-[10px] font-bold px-4 py-1 rounded-full transition-colors shadow-sm ml-2"
                      >
                        EDIT
                      </button>
                    </div>

                  </div>
                  
                  {/* Top Right Close */}
                  <button className="absolute top-2 right-2 text-red-500 font-bold hover:bg-red-50 rounded-full p-0.5 transition-colors z-10">
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>
              );
            }

            // EMPTY SLOT STATE
            return (
              <div key={idx} className="border-2 border-black rounded-2xl flex overflow-hidden min-h-[100px] relative bg-white p-2 mb-3">
                {/* Left Index Box */}
                <div className="w-14 sm:w-16 shrink-0 border-r-2 border-black flex items-center justify-center bg-transparent">
                  <span className="font-black text-2xl text-black">{paddedIdx}</span>
                </div>
                
                {/* Main Area (Empty) */}
                <div className="flex-1 flex flex-col items-center justify-center py-2 relative min-w-0 pr-8">
                  <div className="w-14 h-14 rounded-xl bg-sky-50 flex items-center justify-center mb-1 relative overflow-hidden">
                    <ImageIcon className="text-sky-200" size={24} />
                    {/* Tiny decorative landscape curve inside sky box */}
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-lime-500/20 rounded-b-xl border-t border-sky-200" style={{ clipPath: 'ellipse(70% 100% at 50% 100%)' }}></div>
                  </div>
                  <button onClick={handleAddClick} className="bg-[#c276f0] hover:bg-purple-500 active:bg-purple-600 text-white text-[10px] font-bold py-1 px-5 rounded-full transition-colors shadow-sm tracking-wide">
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
          
          {totalMembers === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200 border-dashed">
              Customer limit is set to 0. Please edit the center to assign slots.
            </div>
          )}
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
        />
      )}
    </div>
  );
}
