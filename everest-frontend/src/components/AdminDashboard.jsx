import React from 'react';

const AdminDashboard = ({ setCurrentView }) => {
  const cardShadowClass = "shadow-[0_0_15px_rgba(216,137,47,0.25)] transition-shadow duration-300 hover:shadow-[0_0_25px_rgba(216,137,47,0.5)]";

  return (
    <div className="flex-1 w-full bg-[#f8fafc] p-3 font-sans pb-20 overflow-y-auto">
      <h2 className="text-xl font-black mb-3 uppercase tracking-wide" style={{ fontFamily: 'Georgia, serif', color: '#000' }}>
        Admin Dashboard
      </h2>

      {/* Total Collections Progress */}
      <div className={`bg-white rounded-xl border border-slate-100 p-3 mb-3 ${cardShadowClass}`}>
        <div className="flex justify-between items-center text-[11px] font-bold mb-1">
          <div className="text-emerald-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            COLLECTION <span className="text-slate-800 text-sm">₹15,450</span>
          </div>
          <div className="text-red-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
            TARGET <span className="text-slate-800 text-sm">₹25,000</span>
          </div>
        </div>
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mt-2">
          <div className="bg-[#1ca3a6] h-full rounded-full" style={{ width: '65%' }}></div>
        </div>
      </div>

      {/* Asymmetrical Grid of 4 Cards */}
      <div className="flex gap-3 mb-3">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-3">
          {/* 1. Collections Donut Chart (Largest & Tallest) */}
          <div className={`h-48 rounded-xl p-3 flex flex-col items-center justify-between border border-[#0a3d4f]/20 ${cardShadowClass}`} style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)' }}>
            <h3 className="text-white text-[11px] font-black tracking-wider mb-1 uppercase">Collections</h3>
            <div className="relative w-24 h-24 my-auto">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  className="text-[#d8892f]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="text-white"
                  strokeDasharray="65, 100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white/80 text-[8px] font-bold">Collected:</span>
                <span className="text-white font-black text-sm leading-none mt-0.5">65%</span>
              </div>
            </div>
            <div className="text-center mt-1 w-full">
              <div className="text-white/70 text-[9px] font-bold">Total: ₹15,450</div>
              <div className="text-white font-black text-sm">Total: ₹15,450</div>
            </div>
          </div>

          {/* 2. Customer Recent List (Smallest) */}
          <button 
            onClick={() => setCurrentView('Customer')}
            className={`h-24 bg-white rounded-xl border border-slate-100 p-2 flex flex-col items-center justify-center text-center ${cardShadowClass}`}
          >
            <div className="p-1.5 bg-slate-50 rounded-full text-[#0369a1] mb-1.5 shadow-sm border border-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="font-black text-slate-800 text-[10px] tracking-wider uppercase">CUSTOMER</div>
            <div className="text-slate-500 text-[8px] font-bold">(Recent the List)</div>
          </button>
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col gap-3">
          {/* 3. Centers Overview (Medium-Large) */}
          <div className={`h-40 bg-white rounded-xl border border-slate-100 p-3 flex flex-col justify-between ${cardShadowClass}`}>
            <h3 className="font-black text-slate-800 text-[10px] tracking-wider uppercase text-center mb-1">Centers Overview</h3>
            <div className="text-center my-auto">
              <div className="text-[#d8892f] text-2xl font-black leading-none">33</div>
              <div className="text-slate-500 text-[9px] font-bold mt-1">All Centers</div>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5 mb-1.5 mt-auto">
              <div className="text-center w-1/2">
                <div className="flex items-center justify-center gap-1 text-[9px] font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ACTIVE
                </div>
                <div className="text-[8px] text-slate-500 font-bold leading-tight">Centers Status</div>
              </div>
              <div className="text-center w-1/2 border-l border-slate-100">
                <div className="flex items-center justify-center gap-1 text-[9px] font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> CLOSED
                </div>
                <div className="text-[8px] text-slate-500 font-bold leading-tight">Centers Status</div>
              </div>
            </div>
            <div className="flex justify-between text-[9px] font-black uppercase">
              <button className="text-[#0369a1]">All Centers &gt;</button>
              <button className="text-red-600">Closed &gt;</button>
            </div>
          </div>

          {/* 4. EMI Calculator (Medium-Small) */}
          <div className={`h-32 bg-white rounded-xl border-b-2 border-[#d8892f]/30 p-3 flex flex-col justify-center relative overflow-hidden ${cardShadowClass}`}>
            <h3 className="font-black text-slate-800 text-[11px] tracking-wider uppercase mb-1">EMI Calculator</h3>
            <div className="text-slate-500 text-[9px] font-bold mb-2">Calculate Your Loan EMI</div>
            <div className="flex items-center justify-between mt-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#0369a1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="2" y1="10" x2="22" y2="10"></line>
                <circle cx="8" cy="15" r="1.5"></circle>
                <circle cx="12" cy="15" r="1.5"></circle>
                <circle cx="16" cy="15" r="1.5"></circle>
                <circle cx="8" cy="19" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
                <circle cx="16" cy="19" r="1.5"></circle>
              </svg>
              <span className="text-slate-400 font-bold text-sm">&gt;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Business Overview & Analytics */}
      <div className={`rounded-xl mb-3 flex overflow-hidden border border-[#0a3d4f]/20 ${cardShadowClass}`} style={{ background: 'linear-gradient(90deg, #0ea5e9 0%, #0369a1 100%)' }}>
        <div className="w-[75%] p-3 pr-2 flex flex-col relative">
          <h3 className="text-white text-[11px] font-black tracking-wider mb-2 uppercase">Business Overview</h3>
          <div className="flex items-center gap-3 mb-3 text-[8px] font-bold text-white/90">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#d8892f] rounded-sm"></span> LOAN DISBURSEMENTS</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white rounded-sm"></span> COLLECTIONS</span>
          </div>
          
          {/* SVG Chart: Two Solid Bars Per Month */}
          <div className="h-24 w-full relative mt-auto border-l border-b border-white/20 pl-6 pb-2 flex items-end justify-between pr-2">
             {/* Y-Axis Labels - Made 100% visible */}
             <div className="absolute left-0 top-0 bottom-2 flex flex-col justify-between text-[7px] font-bold text-white/90 h-full">
               <span>1000</span>
               <span>800</span>
               <span>600</span>
               <span>400</span>
               <span>200</span>
               <span>0</span>
             </div>
             
             {/* X-Axis Labels */}
             <div className="absolute -bottom-3.5 left-6 right-2 flex justify-between text-[7px] font-bold text-white/90">
               <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
             </div>
             
             {/* Bars (Disbursements / Collections Pairs) */}
             <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[30%] bg-[#d8892f]"></div><div className="w-1.5 h-[20%] bg-white"></div></div>
             <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[50%] bg-[#d8892f]"></div><div className="w-1.5 h-[35%] bg-white"></div></div>
             <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[40%] bg-[#d8892f]"></div><div className="w-1.5 h-[25%] bg-white"></div></div>
             <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[60%] bg-[#d8892f]"></div><div className="w-1.5 h-[40%] bg-white"></div></div>
             <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[45%] bg-[#d8892f]"></div><div className="w-1.5 h-[30%] bg-white"></div></div>
             <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[70%] bg-[#d8892f]"></div><div className="w-1.5 h-[50%] bg-white"></div></div>
          </div>
        </div>
        
        {/* Analytics Section - Right 25% Width */}
        <div className="w-[25%] bg-white p-2 flex flex-col justify-center text-center relative border-l border-slate-200">
          <h3 className="text-[#0369a1] font-black text-[9px] tracking-wider mb-1 uppercase absolute top-2 right-0 left-0 text-center">Analytics</h3>
          <div className="mt-4">
            <div className="text-[#d8892f] font-black text-xs">₹8,250</div>
            <div className="text-slate-600 text-[7px] font-bold uppercase border-b border-slate-100 pb-1 mb-1">Disbursements</div>
            <div className="text-[#0369a1] font-black text-xs mt-1.5">₹5,450</div>
            <div className="text-slate-600 text-[7px] font-bold uppercase">Collections</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Staff Management */}
        <div className={`bg-white rounded-xl border border-slate-100 p-3 flex flex-col justify-between ${cardShadowClass}`}>
          <h3 className="font-black text-slate-800 text-[10px] tracking-wider uppercase mb-2">Staff Management</h3>
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              <img src="https://ui-avatars.com/api/?name=Staff+1&background=random" className="w-7 h-7 rounded-full border-2 border-white shadow-sm" alt="Staff" />
              <img src="https://ui-avatars.com/api/?name=Staff+2&background=random" className="w-7 h-7 rounded-full border-2 border-white shadow-sm" alt="Staff" />
              <img src="https://ui-avatars.com/api/?name=Staff+3&background=random" className="w-7 h-7 rounded-full border-2 border-white shadow-sm" alt="Staff" />
            </div>
            <span className="text-slate-400 font-bold text-sm">&gt;</span>
          </div>
        </div>

        {/* Application Status */}
        <div className={`bg-white rounded-xl border border-slate-100 p-3 flex flex-col justify-between ${cardShadowClass}`}>
          <h3 className="font-black text-slate-800 text-[10px] tracking-wider uppercase mb-1">Application Status</h3>
          <div className="flex items-center justify-between relative mt-1 px-1">
            <div className="absolute top-1.5 left-2 right-2 h-0.5 bg-slate-200 z-0"></div>
            <div className="absolute top-1.5 left-2 w-1/2 h-0.5 bg-emerald-500 z-0"></div>
            
            <div className="flex flex-col items-center z-10">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] flex items-center justify-center font-black mb-1 shadow-sm border border-white">1</div>
              <div className="text-[7px] font-bold text-slate-600 uppercase">Progress</div>
            </div>
            <div className="flex flex-col items-center z-10">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] flex items-center justify-center font-black mb-1 shadow-sm border border-white">2</div>
              <div className="text-[7px] font-bold text-slate-600 uppercase">Progress</div>
            </div>
            <div className="flex flex-col items-center z-10">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 text-[7px] flex items-center justify-center font-black mb-1 shadow-sm border border-white">3</div>
              <div className="text-[7px] font-bold text-slate-400 uppercase">Closed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`bg-white rounded-xl border border-slate-100 p-2 flex flex-col items-center justify-center text-center gap-1.5 py-3 ${cardShadowClass}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0369a1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <div className="font-black text-slate-800 text-[8px] uppercase tracking-wider">Collection<br/>Reports</div>
        </div>
        <div className={`bg-white rounded-xl border border-slate-100 p-2 flex flex-col items-center justify-center text-center gap-1.5 py-3 ${cardShadowClass}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0369a1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <div className="font-black text-slate-800 text-[8px] uppercase tracking-wider">Branch<br/>Details</div>
        </div>
        <div className={`bg-white rounded-xl border border-slate-100 p-2 flex flex-col items-center justify-center text-center gap-1.5 py-3 ${cardShadowClass}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0369a1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="font-black text-slate-800 text-[8px] uppercase tracking-wider">Attendance</div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
