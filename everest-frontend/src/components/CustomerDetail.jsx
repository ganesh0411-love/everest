import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Map, MapPin, Phone, CalendarDays, Clock, IndianRupee, FileText, Scale, Sprout, MoreVertical, Star, Square, X } from 'lucide-react';
import OfflineImage from './OfflineImage';
import femaleAvatar from '../assets/avatar-female.jpg';
import maleAvatar from '../assets/avatar-male.jpg';

const defaultAvatar = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMWUyOTNiIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGYxNzJhIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImF2YXRhciIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzY0NzQ4YiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJ1cmwoI2JnKSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE2IiBmaWxsPSJ1cmwoI2F2YXRhcikiLz48cGF0aCBkPSJNNTAgNjJDMzAgNjIgMTYgNzggMTYgOTVDMjYgOTggMzcgMTAwIDUwIDEwMEM2MyAxMDAgNzQgOTggODQgOTVDODQgNzggNzAgNjIgNTAgNjJaIiBmaWxsPSJ1cmwoI2F2YXRhcikiLz48L3N2Zz4=";

const CustomerDetail = ({ customer, onBack }) => {
  const [showPhoneMenu, setShowPhoneMenu] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const phoneMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (phoneMenuRef.current && !phoneMenuRef.current.contains(event.target)) {
        setShowPhoneMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!customer) return null;

  const loanAmount = customer.loanAmount || 10000;
  const repayAmount = customer.repayAmount || 12600;
  const netBalance = repayAmount; // According to the screenshot
  const rawDueDate = customer.nextDueDate || customer.dueDate || '26-05-2026';

  const formatName = (name) => {
    if (!name) return '';
    return name.replace(/^(Mr\.|Mrs\.|Miss\.|Mr|Mrs|Miss|Ms)\s*/i, '').trim();
  };

  const formattedDueDate = (() => {
    if (!rawDueDate) return '';
    if (rawDueDate.includes('-') && rawDueDate.split('-')[0].length === 2) {
      // already DD-MM-YYYY format
      return rawDueDate;
    } else {
      // YYYY-MM-DD format
      const d = new Date(rawDueDate);
      if (isNaN(d.getTime())) return rawDueDate;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
  })();

  const isFemale = (() => {
    try {
      if (!customer) return false;
      
      let isFem = false;
      if (customer.name && typeof customer.name === 'string') {
        const lowerName = customer.name.toLowerCase().trim();
        if (lowerName.startsWith('mrs') || lowerName.startsWith('ms') || lowerName.startsWith('miss')) {
          isFem = true;
        }
      }
      
      if (!isFem && customer.gender && typeof customer.gender === 'string') {
        if (customer.gender.toLowerCase() === 'female') {
          isFem = true;
        }
      }
      
      return isFem;
    } catch (err) {
      console.error('Error parsing customer gender:', err);
      return false; // Safe fallback
    }
  })();

  const centerAvatarSrc = isFemale ? femaleAvatar : maleAvatar;

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-[#115e41] via-[#1b7c58] to-[#f4f7f6] overflow-hidden relative font-sans w-full max-w-md mx-auto shadow-2xl">
      
      {/* Top Section */}
      <div className="px-3 sm:px-6 pt-6 pb-0 relative z-10 flex-shrink-0">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start w-full gap-2">
          {/* Left: Back Button, Phone & Loan Amount */}
          <div className="flex flex-col gap-3 justify-start items-start min-w-0">
            <div className="flex gap-1 sm:gap-2">
              <button onClick={onBack} className="text-white p-1.5 sm:p-2 sm:-ml-2 rounded-full hover:bg-white/10 transition-colors z-20 flex-shrink-0">
                <ArrowLeft className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
              <div className="relative" ref={phoneMenuRef}>
                <button 
                  onClick={() => setShowPhoneMenu(!showPhoneMenu)}
                  className="bg-white/10 backdrop-blur-xl border border-[#4ade80]/40 p-2 sm:p-2.5 rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.15)] hover:bg-white/20 transition-colors z-20 mt-0.5 flex-shrink-0"
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
                {showPhoneMenu && (
                  <div className="absolute top-full left-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg p-1.5 shadow-2xl z-50 min-w-[140px] flex flex-col gap-0.5">
                    <a href={`tel:${customer.mobile || '9876543210'}`} className="flex items-center gap-2 text-white hover:bg-white/10 px-2 py-1.5 rounded-md transition-colors text-[11px] sm:text-xs font-semibold whitespace-nowrap">
                      <Star className="w-3 h-3 text-emerald-400 fill-emerald-400 flex-shrink-0" />
                      <span>{customer.mobile || '9876543210'}</span>
                    </a>
                    <a href={`tel:${customer.alternateMobile || '8765432109'}`} className="flex items-center gap-2 text-slate-300 hover:bg-white/10 px-2 py-1.5 rounded-md transition-colors text-[11px] sm:text-xs font-medium whitespace-nowrap">
                      <Square className="w-2.5 h-2.5 text-slate-400 fill-slate-400 flex-shrink-0 ml-[1px]" />
                      <span>{customer.alternateMobile || '8765432109'}</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-center mt-12 sm:mt-14 w-full min-w-0">
              <p className="text-[9px] min-[360px]:text-[10px] sm:text-xs text-slate-300 font-bold uppercase tracking-wider mb-0.5 text-center whitespace-nowrap bg-transparent" style={{ WebkitTextStroke: '0.3px rgba(255,255,255,0.6)', textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>Loan Amount</p>
              <h3 className="text-[20px] sm:text-[26px] font-black text-[#4ade80] tracking-tighter flex items-center justify-center text-center whitespace-nowrap bg-transparent drop-shadow-md">
                <IndianRupee className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] mr-[1px] stroke-[3] flex-shrink-0 drop-shadow-sm" />
                <span>{loanAmount.toLocaleString('en-IN')}</span>
              </h3>
            </div>
          </div>

          {/* Center: Profile Card & Due Date */}
          <div className="flex flex-col items-center">
            <div className="w-[115px] min-[360px]:w-[140px] sm:w-[170px] bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-2xl border-[1.5px] border-[#4ade80]/40 rounded-2xl sm:rounded-[1.5rem] p-2 sm:p-3 flex flex-col items-center shadow-[0_0_40px_rgba(52,211,153,0.3)] relative overflow-hidden z-30 mx-auto">
              {/* Glow effect inside card */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-emerald-300/30 to-transparent pointer-events-none"></div>
              
              <div className="w-[56px] h-[56px] sm:w-[68px] sm:h-[68px] rounded-full border-[3px] border-white/50 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.4)] mb-2 relative z-10 bg-slate-200 flex-shrink-0">
                <OfflineImage src={customer.image || defaultAvatar} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mb-1 relative z-10 text-center tracking-tight leading-tight whitespace-normal break-words">{formatName(customer.name)}</h2>
              
              {/* Glowing line */}
              <div className="w-[85%] h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent mb-1 shadow-[0_0_15px_rgba(110,231,183,1)] relative z-10"></div>
              
              <p className="text-emerald-50 text-[10px] sm:text-[11px] font-medium relative z-10 tracking-wide text-center min-h-[15px] sm:min-h-[16.5px]">{customer.center || customer.area || '\u00A0'}</p>
            </div>
            
            <p className="text-[13px] sm:text-[15px] font-bold text-white mt-3.5 tracking-wider text-center whitespace-nowrap" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,1)' }}>Due : {formattedDueDate}</p>
          </div>

          {/* Right: MapPin, Settings & Outstanding Amount */}
          <div className="flex flex-col gap-3 justify-start items-end min-w-0">
            <div className="flex gap-1 sm:gap-3">
              <button className="bg-white/10 backdrop-blur-xl border border-[#4ade80]/40 p-2 sm:p-2.5 rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.15)] hover:bg-white/20 transition-colors z-20 mt-0.5 flex-shrink-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <button className="bg-white/10 backdrop-blur-xl border border-[#4ade80]/40 p-2 sm:p-2.5 rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.15)] hover:bg-white/20 transition-colors z-20 mt-0.5 flex-shrink-0">
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </div>

            <div className="flex flex-col items-center mt-12 sm:mt-14 w-full min-w-0">
              <p className="text-[9px] min-[360px]:text-[10px] sm:text-xs text-slate-300 font-bold uppercase tracking-wider mb-0.5 text-center whitespace-nowrap bg-transparent" style={{ WebkitTextStroke: '0.3px rgba(255,255,255,0.6)', textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>Outstanding</p>
              <h3 className="text-[20px] sm:text-[26px] font-black text-[#ef4444] tracking-tighter flex items-center justify-center text-center whitespace-nowrap bg-transparent drop-shadow-md">
                <IndianRupee className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] mr-[1px] stroke-[3] flex-shrink-0 drop-shadow-sm" />
                <span>{repayAmount.toLocaleString('en-IN')}</span>
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics & Details Section */}
      <div className="flex-1 bg-[#f8fafc] rounded-t-[2.5rem] pt-8 px-6 relative z-20 flex flex-col items-center shadow-[0_-10px_30px_rgba(0,0,0,0.15)] mt-4">        
        {/* Center Illustration - Dynamic Avatar */}
        <div className="flex-1 flex flex-col items-center justify-center relative w-full pb-24">
           {/* Abstract dashed circles */}
           <div className="absolute w-[280px] h-[280px] border border-slate-200/80 rounded-full border-dashed opacity-70 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
           <div className="absolute w-[200px] h-[200px] border border-slate-200/80 rounded-full border-dashed opacity-70 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
           <div className="absolute w-[120px] h-[120px] bg-slate-50 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50"></div>
           
           <div className="relative z-10 flex flex-col items-center transform scale-110">
              {centerAvatarSrc ? (
                <img 
                  src={centerAvatarSrc} 
                  alt="Center Avatar" 
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain mix-blend-multiply opacity-95 hover:scale-105 transition-transform duration-500 ease-in-out"
                  onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = maleAvatar; // Fallback
                    e.target.style.opacity = '0.5';
                  }}
                />
              ) : null}
           </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 w-full z-50">
        <div className="bg-[#124b33] rounded-t-[2rem] h-20 flex justify-between items-center px-8 relative shadow-[0_-15px_30px_rgba(0,0,0,0.15)] border-t border-white/5 pb-2">
          
          {/* Pay Later */}
          <button className="flex flex-col items-center justify-center gap-1 opacity-80 hover:opacity-100 transition-opacity flex-1">
            <div className="p-1.5 border border-white/10 bg-white/5 rounded-xl">
               <Clock className="w-4 h-4 text-emerald-100" />
            </div>
            <span className="text-[9px] text-emerald-100 font-bold tracking-widest uppercase mt-0.5">Pay Later</span>
          </button>

          {/* Pay Now (Center pop-up) */}
          <div className="relative -top-6 flex-shrink-0 mx-2 flex flex-col items-center">
            <button 
              onClick={() => setShowCollectionModal(true)}
              className="bg-gradient-to-b from-[#19825b] to-[#125c40] border-[4px] border-[#f4f7f6] w-[70px] h-[70px] rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(18,75,51,0.5)] hover:scale-105 transition-transform group relative overflow-hidden z-10"
            >
               {/* Internal Glow */}
               <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
               
               {/* Decorative Dashed Ring */}
               <div className="absolute inset-[4px] border-[2px] border-white/40 rounded-full border-dashed group-hover:animate-spin-slow"></div>

               <IndianRupee className="w-7 h-7 text-white stroke-[2.5] drop-shadow-md z-10 relative" />
            </button>
            <span className="absolute -bottom-5 text-[10px] text-slate-800 font-extrabold tracking-widest uppercase bg-white px-2 py-0.5 rounded-full shadow-sm z-20 border border-slate-200">Pay Now</span>
          </div>

          {/* Report */}
          <button className="flex flex-col items-center justify-center gap-1 opacity-80 hover:opacity-100 transition-opacity flex-1">
            <div className="p-1.5 border border-blue-500/30 bg-blue-500/10 rounded-xl">
               <FileText className="w-4 h-4 text-blue-300" />
            </div>
            <span className="text-[9px] text-white font-bold tracking-widest uppercase mt-0.5">Report</span>
          </button>

        </div>
      </div>

      {/* Collection Entry Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" onClick={() => setShowCollectionModal(false)}></div>
          
          <div className="relative w-full max-w-[340px] bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl border-[1.5px] border-white/60 rounded-[2rem] p-6 shadow-[0_0_40px_rgba(20,83,56,0.6)] animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button onClick={() => setShowCollectionModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-slate-200/50 rounded-full flex items-center justify-center text-[#2d4a3e] hover:bg-slate-200 transition-colors shadow-sm">
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
            
            {/* Header */}
            <h2 className="text-[22px] font-black text-[#2d4a3e] text-center uppercase tracking-wide mb-8 mt-2 drop-shadow-sm">Collection Entry</h2>
            
            {/* Content */}
            <div className="space-y-6">
              {/* Due Date */}
              <div className="flex items-start gap-4">
                 <div className="w-12 h-12 bg-[#2d4a3e]/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
                   <CalendarDays className="w-6 h-6 text-[#2d4a3e] stroke-[2]" />
                 </div>
                 <div className="flex flex-col">
                   <div className="flex items-center gap-2">
                     <span className="text-[#2d4a3e] text-[14px] font-bold tracking-wider">DUE DATE:</span>
                     <div className="h-4 w-[2px] bg-[#2d4a3e]/30 rounded-full"></div>
                     <span className="text-[#2d4a3e] font-black text-xl leading-none">26.05.2026</span>
                   </div>
                   <span className="text-[#2d4a3e]/80 font-medium mt-1.5 text-base">(Wednesday)</span>
                 </div>
              </div>

              {/* Due Amount */}
              <div className="flex items-start gap-4">
                 <div className="w-12 h-12 bg-[#2d4a3e]/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
                   <div className="w-7 h-7 bg-[#2d4a3e] rounded-[40%_40%_15%_15%] flex items-center justify-center relative shadow-sm">
                     <div className="absolute -top-1 w-3 h-1 bg-[#2d4a3e] rounded-t-sm"></div>
                     <IndianRupee className="w-3.5 h-3.5 text-white mt-1" strokeWidth={3} />
                   </div>
                 </div>
                 <div className="flex flex-col">
                   <div className="flex items-center gap-2">
                     <span className="text-[#2d4a3e] text-[14px] font-bold tracking-wider">DUE AMOUNT:</span>
                     <div className="h-4 w-[2px] bg-[#2d4a3e]/30 rounded-full"></div>
                     <span className="text-[#166534] font-black text-[22px] leading-none drop-shadow-sm">₹1,050</span>
                   </div>
                   <span className="text-[#2d4a3e]/80 font-medium mt-1.5 text-base">(Fourth Installment)</span>
                 </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-4 mt-10">
              <div className="flex flex-col gap-3 flex-1">
                <button className="bg-gradient-to-b from-[#3a614d] to-[#1e3c2d] border-[2px] border-slate-300 ring-1 ring-black/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(0,0,0,0.4)] text-white font-bold tracking-wider py-2.5 rounded-full w-full text-sm active:scale-95 transition-transform">PAY</button>
                <button className="bg-gradient-to-b from-[#3a614d] to-[#1e3c2d] border-[2px] border-slate-300 ring-1 ring-black/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(0,0,0,0.4)] text-white font-bold tracking-wider py-2.5 rounded-full w-full text-sm active:scale-95 transition-transform">BOUNCE</button>
              </div>
              <div className="flex-1 flex">
                <button className="bg-gradient-to-b from-[#3a614d] to-[#1e3c2d] border-[2px] border-slate-300 ring-1 ring-black/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(0,0,0,0.4)] text-white font-bold tracking-wider py-2.5 rounded-full w-full h-full text-base flex items-center justify-center active:scale-95 transition-transform">QUICK PAY</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;
