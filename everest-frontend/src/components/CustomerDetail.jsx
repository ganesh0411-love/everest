import React from 'react';
import { ArrowLeft, Map, MapPin, Phone, CalendarDays, Clock, IndianRupee, AlertTriangle, Scale, Sprout, MoreVertical } from 'lucide-react';
import OfflineImage from './OfflineImage';

const CustomerDetail = ({ customer, onBack }) => {
  if (!customer) return null;

  const loanAmount = customer.loanAmount || 10000;
  const repayAmount = customer.repayAmount || 12600;
  const netBalance = repayAmount; // According to the screenshot
  const dueDate = customer.dueDate || '26-05-2026';

  const formatName = (name) => {
    if (!name) return '';
    return name.replace(/^(Mr\.|Mrs\.|Miss\.|Mr|Mrs|Miss|Ms)\s*/i, '').trim();
  };

  const formattedDueDate = (() => {
    if (!dueDate) return '';
    let d;
    if (dueDate.includes('-') && dueDate.split('-')[0].length === 2) {
      const parts = dueDate.split('-');
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
    } else {
      d = new Date(dueDate);
    }
    if (isNaN(d.getTime())) return dueDate;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${dueDate} (${days[d.getDay()]})`;
  })();

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-[#115e41] via-[#1b7c58] to-[#f4f7f6] overflow-hidden relative font-sans w-full max-w-md mx-auto shadow-2xl">
      
      {/* Top Section */}
      <div className="px-6 pt-8 pb-0 relative z-10 flex-shrink-0">
        <div className="flex justify-between items-start w-full">
          {/* Left: Back Button & Phone */}
          <div className="flex-1 flex gap-2 justify-start items-start">
            <button onClick={onBack} className="text-white p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors z-20">
              <ArrowLeft className="w-8 h-8" />
            </button>
            <button className="bg-white/10 backdrop-blur-xl border border-[#4ade80]/40 p-2.5 rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.15)] hover:bg-white/20 transition-colors z-20">
              <Phone className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Center: Profile Card */}
          <div className="w-[170px] bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-2xl border-[1.5px] border-[#4ade80]/40 rounded-[1.5rem] p-3 flex flex-col items-center shadow-[0_0_40px_rgba(52,211,153,0.3)] relative overflow-hidden flex-shrink-0 z-30">
            {/* Glow effect inside card */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-emerald-300/30 to-transparent pointer-events-none"></div>
            
            <div className="w-[68px] h-[68px] rounded-full border-[3px] border-white/50 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.4)] mb-2.5 relative z-10 bg-slate-200 flex-shrink-0">
              <OfflineImage src={customer.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&background=random`} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1 relative z-10 text-center tracking-tight leading-tight">{formatName(customer.name)}</h2>
            
            {/* Glowing line */}
            <div className="w-[85%] h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent mb-1.5 shadow-[0_0_15px_rgba(110,231,183,1)] relative z-10"></div>
            
            <p className="text-emerald-50 text-[11px] font-medium relative z-10 tracking-wide">{customer.area || 'Anna Nagar'}</p>
          </div>

          {/* Right: MapPin and Settings */}
          <div className="flex-1 flex gap-3 justify-end items-start">
            <button className="bg-white/10 backdrop-blur-xl border border-[#4ade80]/40 p-2.5 rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.15)] hover:bg-white/20 transition-colors z-20">
              <MapPin className="w-5 h-5 text-white" />
            </button>
            <button className="bg-white/10 backdrop-blur-xl border border-[#4ade80]/40 p-2.5 rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.15)] hover:bg-white/20 transition-colors z-20">
              <MoreVertical className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics & Details Section */}
      <div className="flex-1 bg-[#f8fafc] rounded-t-[2.5rem] pt-8 px-6 relative z-20 flex flex-col items-center shadow-[0_-10px_30px_rgba(0,0,0,0.15)]">
        
        {/* Loan Metrics Card */}
        <div className="w-full max-w-[300px] bg-white/90 backdrop-blur-2xl rounded-[1.25rem] shadow-[0_15px_40px_rgba(74,222,128,0.15)] border-[1.5px] border-[#4ade80]/30 p-4 mb-4 relative -mt-10 z-30">
           {/* Subtle glow behind card */}
           <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/50 to-transparent rounded-[1.25rem] pointer-events-none"></div>

           <div className="flex justify-between items-center mb-3 relative z-10">
             <div className="text-center w-1/2 border-r border-slate-200/60 pr-2">
                <p className="text-[#1b7c58] font-semibold text-[11px] mb-1">Your Loan Amount</p>
                <h3 className="text-[#0d593b] font-extrabold text-[18px] flex items-center justify-center tracking-tight">
                  <IndianRupee className="w-4 h-4 mr-[1px] stroke-[2.5]" />{loanAmount.toLocaleString('en-IN')}
                </h3>
             </div>
             <div className="text-center w-1/2 pl-2">
                <p className="text-[#a02020] font-semibold text-[11px] mb-1">Outstanding Amount</p>
                <h3 className="text-[#b91c1c] font-extrabold text-[18px] flex items-center justify-center tracking-tight">
                  <IndianRupee className="w-4 h-4 mr-[1px] stroke-[2.5]" />{repayAmount.toLocaleString('en-IN')}
                </h3>
             </div>
           </div>
           <div className="border-t border-slate-200/60 pt-2.5 text-center relative z-10">
              <p className="text-slate-800 font-bold text-[13px] tracking-wide">Due Date: {formattedDueDate}</p>
           </div>
        </div>

        {/* Center Illustration - CSS/SVG Composite */}
        <div className="flex-1 flex flex-col items-center justify-center relative w-full pb-24">
           {/* Abstract dashed circles */}
           <div className="absolute w-[280px] h-[280px] border border-slate-200/80 rounded-full border-dashed opacity-70 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
           <div className="absolute w-[200px] h-[200px] border border-slate-200/80 rounded-full border-dashed opacity-70 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
           <div className="absolute w-[120px] h-[120px] bg-slate-50 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50"></div>
           
           <div className="relative z-10 flex flex-col items-center transform scale-110">
              {/* The Scale */}
              <div className="relative flex flex-col items-center mb-8">
                  <div className="w-1 h-[70px] bg-slate-700 rounded-full"></div>
                  <div className="w-1 h-3 bg-slate-800 absolute bottom-0 rounded-full shadow-sm"></div>
                  <div className="w-32 h-1 bg-slate-700 absolute top-2 rounded-full shadow-sm"></div>
                  <div className="w-4 h-4 bg-slate-800 rounded-full absolute top-0.5"></div>
                  
                  {/* Left Pan (Coins) */}
                  <div className="absolute top-2 -left-2 w-[34px] h-[45px] border-x border-b border-slate-400 rounded-b-full flex flex-col items-center justify-end pb-1">
                      <div className="w-1 h-[2px] bg-slate-300 absolute -top-[1px]"></div>
                      <div className="flex flex-col-reverse items-center -mb-[2px]">
                        <div className="w-6 h-[5px] bg-[#d4af37] border border-[#a67c00] rounded-[50%] mb-[-2px] z-30"></div>
                        <div className="w-6 h-[5px] bg-[#d4af37] border border-[#a67c00] rounded-[50%] mb-[-2px] z-20"></div>
                        <div className="w-6 h-[5px] bg-[#d4af37] border border-[#a67c00] rounded-[50%] mb-[-2px] z-10"></div>
                        <div className="w-6 h-[5px] bg-[#d4af37] border border-[#a67c00] rounded-[50%] mb-0 z-0"></div>
                      </div>
                      <div className="w-7 h-[3px] bg-slate-700 rounded-full mt-1 opacity-80"></div>
                  </div>
                  
                  {/* Right Pan (Money Bag) */}
                  <div className="absolute top-2 -right-2 w-[34px] h-[45px] border-x border-b border-slate-400 rounded-b-full flex flex-col items-center justify-end pb-1 translate-y-3">
                      <div className="w-1 h-[2px] bg-slate-300 absolute -top-[1px]"></div>
                      <div className="w-6 h-7 bg-[#d9a05b] rounded-[40%_40%_15%_15%] shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.2)] flex items-center justify-center relative">
                          <div className="absolute -top-1.5 w-3 h-1.5 bg-[#b37d42] rounded-[2px_2px_0_0]"></div>
                          <div className="w-4 h-[1px] bg-red-800 absolute -top-0.5"></div>
                          <IndianRupee className="w-3 h-3 text-[#5c3a21] mt-1" strokeWidth={3} />
                      </div>
                      <div className="w-7 h-[3px] bg-slate-700 rounded-full mt-[2px] opacity-80"></div>
                  </div>
              </div>
              
              {/* The Hand and Money Bags */}
              <div className="relative flex flex-col items-center mt-2">
                  <div className="flex items-end justify-center gap-1.5 mb-1 relative z-10">
                      {/* Left Bag */}
                      <div className="w-[45px] h-[55px] bg-[#e3b574] rounded-[45%_45%_15%_15%] shadow-lg flex items-center justify-center relative border border-[#c4924c]">
                          <div className="absolute -top-2 w-5 h-2.5 bg-[#c4924c] rounded-[2px_2px_0_0]"></div>
                          <div className="w-6 h-[2px] bg-red-800 absolute -top-0.5"></div>
                          <IndianRupee className="w-5 h-5 text-[#5c3a21] mt-2" strokeWidth={2.5} />
                      </div>
                      
                      {/* Center Green Circle / Sprout */}
                      <div className="w-[60px] h-[60px] bg-gradient-to-br from-[#34d399] to-[#059669] rounded-full shadow-xl flex items-center justify-center relative border-2 border-white z-20 -translate-y-4">
                          <IndianRupee className="w-7 h-7 text-white" strokeWidth={2.5} />
                          <div className="absolute -top-[22px] -right-[15px] rotate-45">
                            <div className="w-6 h-10 bg-[#4ade80] rounded-[0_100%_0_100%] shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.1)] border border-[#22c55e]"></div>
                          </div>
                          <div className="absolute -top-[18px] -left-[12px] -rotate-45">
                            <div className="w-5 h-8 bg-[#86efac] rounded-[0_100%_0_100%] shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.1)] border border-[#4ade80]"></div>
                          </div>
                      </div>
                      
                      {/* Right Bag */}
                      <div className="w-[45px] h-[55px] bg-[#e3b574] rounded-[45%_45%_15%_15%] shadow-lg flex items-center justify-center relative border border-[#c4924c]">
                          <div className="absolute -top-2 w-5 h-2.5 bg-[#c4924c] rounded-[2px_2px_0_0]"></div>
                          <div className="w-6 h-[2px] bg-red-800 absolute -top-0.5"></div>
                          <IndianRupee className="w-5 h-5 text-[#5c3a21] mt-2" strokeWidth={2.5} />
                      </div>
                  </div>
                  
                  {/* Hand Graphic */}
                  <div className="w-[140px] h-[40px] relative z-0 -mt-2">
                      {/* Cuff */}
                      <div className="absolute left-0 top-2 w-8 h-[28px] bg-[#2c3e50] rounded-l-md border-r-2 border-[#1a252f] z-10"></div>
                      <div className="absolute left-6 top-[7px] w-2 h-[30px] bg-white rounded-sm z-10 transform -rotate-6"></div>
                      
                      {/* Palm */}
                      <svg viewBox="0 0 100 40" className="w-full h-full text-[#dea681] drop-shadow-xl z-0 absolute left-8">
                          <path fill="currentColor" d="M0,15 C20,15 35,25 55,25 C75,25 85,20 95,15 C98,12 100,18 95,22 C80,32 70,35 50,35 C30,35 15,30 0,30 Z"/>
                      </svg>
                  </div>
              </div>
           </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 w-full z-50">
        <div className="bg-[#124b33] rounded-t-[2.5rem] h-24 flex justify-between items-center px-8 relative shadow-[0_-15px_30px_rgba(0,0,0,0.15)] border-t border-white/5">
          
          {/* Pay Later */}
          <button className="flex flex-col items-center justify-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity flex-1">
            <div className="p-2 border border-white/10 bg-white/5 rounded-2xl">
               <Clock className="w-5 h-5 text-emerald-100" />
            </div>
            <span className="text-[10px] text-emerald-100 font-bold tracking-widest uppercase">Pay Later</span>
          </button>

          {/* Pay Now (Center pop-up) */}
          <div className="relative -top-8 flex-shrink-0 mx-2">
            <button className="bg-gradient-to-b from-[#19825b] to-[#125c40] border-[6px] border-[#f4f7f6] w-[86px] h-[86px] rounded-full flex flex-col items-center justify-center shadow-[0_8px_25px_rgba(18,75,51,0.5)] hover:scale-105 transition-transform group relative overflow-hidden">
               
               {/* Internal Glow */}
               <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
               
               {/* Decorative Circular Arrows (Sync) */}
               <div className="absolute w-[64px] h-[64px] border border-[#4ade80]/40 rounded-full border-dashed group-hover:animate-spin-slow"></div>

               <div className="bg-white/20 p-2 rounded-full mb-1">
                 <IndianRupee className="w-6 h-6 text-white stroke-[2.5]" />
               </div>
               <span className="text-[10px] text-white font-extrabold tracking-widest uppercase">Pay Now</span>
            </button>
          </div>

          {/* Report */}
          <button className="flex flex-col items-center justify-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity flex-1">
            <div className="p-2 border border-rose-500/30 bg-rose-500/10 rounded-2xl">
               <AlertTriangle className="w-5 h-5 text-rose-300" />
            </div>
            <span className="text-[10px] text-white font-bold tracking-widest uppercase">Report</span>
          </button>

        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
