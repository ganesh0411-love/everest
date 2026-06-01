import React from 'react';

const AdminDashboard = ({ setCurrentView }) => {
  return (
    <div className="flex-1 w-full bg-[#f8fafc] p-4 font-sans pb-24 overflow-y-auto">
      <h2 className="text-2xl font-black mb-4 uppercase" style={{ fontFamily: 'Georgia, serif', color: '#000' }}>
        Admin Dashboard
      </h2>

      {/* Total Collections Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
        <h3 className="font-bold text-slate-800 text-lg mb-2">Total Collections</h3>
        <div className="w-full bg-slate-200 h-3 rounded-full mb-3 overflow-hidden">
          <div className="bg-[#1ca3a6] h-full rounded-full" style={{ width: '65%' }}></div>
        </div>
        <div className="flex justify-between items-center text-sm font-medium">
          <div className="text-slate-700">Total Collections Today: <span className="font-bold">₹15,450</span></div>
          <div className="text-red-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
            Target Collection: ₹25,000
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Collections Donut Chart */}
        <div className="rounded-2xl p-4 flex flex-col items-center justify-between shadow-md" style={{ background: 'linear-gradient(145deg, #10637c, #0a3d4f)' }}>
          <h3 className="text-white text-sm font-bold tracking-wider mb-2 uppercase">Collections</h3>
          <div className="relative w-28 h-28 my-2">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path
                className="text-[#d8892f]"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="text-[#2196f3]"
                strokeDasharray="65, 100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white/80 text-[10px]">Collected:</span>
              <span className="text-white font-bold text-xl leading-none">65%</span>
            </div>
          </div>
          <div className="text-center mt-2">
            <div className="text-white/70 text-xs">Total: ₹15,450</div>
            <div className="text-white font-bold text-lg">Total: ₹15,450</div>
          </div>
        </div>

        {/* Right Column Stack */}
        <div className="flex flex-col gap-3">
          {/* Centers Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex-1 flex flex-col">
            <h3 className="font-bold text-slate-800 text-xs tracking-wider uppercase text-center mb-1">Centers Overview</h3>
            <div className="text-center mb-3">
              <div className="text-[#d8892f] text-2xl font-black leading-none">33</div>
              <div className="text-slate-500 text-xs">All Centers</div>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2 mb-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                </div>
                <div className="text-[10px] text-slate-600 font-bold leading-tight">Centers<br/>Status</div>
              </div>
              <div className="text-center border-l border-slate-100 pl-2">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Closed
                </div>
                <div className="text-[10px] text-slate-600 font-bold leading-tight">Centers<br/>Status</div>
              </div>
            </div>
            <div className="flex justify-between text-xs font-bold">
              <button className="text-[#10637c]">All Centers &gt;</button>
              <button className="text-red-600">Closed &gt;</button>
            </div>
          </div>

          {/* EMI Calculator */}
          <div className="bg-white rounded-xl shadow-[0_4px_15px_rgba(216,137,47,0.15)] border-b-2 border-[#d8892f]/30 p-3 flex-1 relative overflow-hidden flex flex-col justify-center">
            <h3 className="font-bold text-slate-800 text-[11px] tracking-wider uppercase mb-0.5">EMI Calculator</h3>
            <div className="text-slate-500 text-[10px] mb-2">Calculate Your Loan EMI</div>
            <div className="flex items-center justify-between">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#10637c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="2" y1="10" x2="22" y2="10"></line>
                <circle cx="8" cy="15" r="1"></circle>
                <circle cx="12" cy="15" r="1"></circle>
                <circle cx="16" cy="15" r="1"></circle>
                <circle cx="8" cy="18" r="1"></circle>
                <circle cx="12" cy="18" r="1"></circle>
                <circle cx="16" cy="18" r="1"></circle>
              </svg>
              <span className="text-slate-400">&gt;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer List Button */}
      <button 
        onClick={() => setCurrentView('Customer')}
        className="w-full bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg text-[#10637c]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="font-bold text-slate-800 tracking-wider">CUSTOMER</div>
            <div className="text-slate-500 text-xs">Recent the List</div>
          </div>
        </div>
        <span className="text-slate-400">&gt;</span>
      </button>

      {/* Business Overview & Analytics */}
      <div className="rounded-2xl shadow-md mb-4 flex overflow-hidden" style={{ background: 'linear-gradient(90deg, #0e3b4d, #11576e)' }}>
        <div className="flex-1 p-4 pr-2 flex flex-col relative">
          <h3 className="text-white text-xs font-bold tracking-wider mb-2 uppercase">Business Overview</h3>
          <div className="flex items-center gap-3 mb-4 text-[9px] text-white/80">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#d8892f]"></span> Loan Disbursements</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#2196f3]"></span> Collections</span>
          </div>
          {/* Simple SVG Chart Representation */}
          <div className="h-28 w-full relative mt-auto border-l border-b border-white/20 pl-1 pb-1 flex items-end justify-between">
             {/* Y-Axis Labels */}
             <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-between text-[8px] text-white/50 h-full">
               <span>1000</span>
               <span>800</span>
               <span>600</span>
               <span>400</span>
               <span>200</span>
               <span>0</span>
             </div>
             {/* X-Axis Labels */}
             <div className="absolute -bottom-4 left-0 right-0 flex justify-between text-[8px] text-white/60">
               <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span>
             </div>
             
             {/* Area Background */}
             <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full left-1 bottom-1 opacity-40">
               <path d="M0,80 Q10,70 20,60 T40,40 T60,60 T80,50 T100,30 L100,100 L0,100 Z" fill="#2196f3" />
             </svg>
             {/* Line */}
             <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full left-1 bottom-1">
               <path d="M0,80 Q10,70 20,60 T40,40 T60,60 T80,50 T100,30" fill="none" stroke="#2196f3" strokeWidth="1.5" />
             </svg>
             
             {/* Bars */}
             <div className="w-[8%] h-[20%] bg-[#d8892f] z-10 mx-auto"></div>
             <div className="w-[8%] h-[35%] bg-[#d8892f] z-10 mx-auto"></div>
             <div className="w-[8%] h-[25%] bg-[#d8892f] z-10 mx-auto"></div>
             <div className="w-[8%] h-[40%] bg-[#d8892f] z-10 mx-auto"></div>
             <div className="w-[8%] h-[30%] bg-[#d8892f] z-10 mx-auto"></div>
             <div className="w-[8%] h-[20%] bg-[#d8892f] z-10 mx-auto"></div>
             <div className="w-[8%] h-[50%] bg-[#d8892f] z-10 mx-auto"></div>
             <div className="w-[8%] h-[60%] bg-[#d8892f] z-10 mx-auto"></div>
             <div className="w-[8%] h-[80%] bg-[#d8892f] z-10 mx-auto"></div>
          </div>
        </div>
        
        {/* Analytics Section */}
        <div className="w-32 bg-white rounded-l-2xl p-3 flex flex-col justify-center text-center">
          <h3 className="text-[#10637c] font-bold text-[10px] tracking-wider mb-3 uppercase absolute top-4 right-4">Analytics</h3>
          <div className="mt-4">
            <div className="text-[#d8892f] font-black text-lg">₹ 8,250</div>
            <div className="text-slate-600 text-[10px] font-medium border-b border-slate-100 pb-2 mb-2">Disbursements</div>
            <div className="text-[#10637c] font-black text-lg mt-3">₹5,450</div>
            <div className="text-slate-600 text-[10px] font-medium">Collections</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Staff Management */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3">
          <h3 className="font-bold text-slate-800 text-[11px] tracking-wider uppercase mb-3">Staff Management</h3>
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              <img src="https://ui-avatars.com/api/?name=Staff+1&background=random" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="Staff" />
              <img src="https://ui-avatars.com/api/?name=Staff+2&background=random" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="Staff" />
              <img src="https://ui-avatars.com/api/?name=Staff+3&background=random" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="Staff" />
            </div>
            <span className="text-slate-400 text-sm">&gt;</span>
          </div>
        </div>

        {/* Application Status */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3">
          <h3 className="font-bold text-slate-800 text-[11px] tracking-wider uppercase mb-3">Application Status</h3>
          <div className="flex items-center justify-between relative mt-2 px-1">
            <div className="absolute top-2 left-3 right-3 h-0.5 bg-slate-200 z-0"></div>
            <div className="absolute top-2 left-3 w-1/2 h-0.5 bg-emerald-500 z-0"></div>
            
            <div className="flex flex-col items-center z-10">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold mb-1 shadow-sm border-2 border-white">1</div>
              <div className="text-[9px] text-slate-600">Progress</div>
            </div>
            <div className="flex flex-col items-center z-10">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold mb-1 shadow-sm border-2 border-white">2</div>
              <div className="text-[9px] text-slate-600">Progress</div>
            </div>
            <div className="flex flex-col items-center z-10">
              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center font-bold mb-1 shadow-sm border-2 border-white">3</div>
              <div className="text-[9px] text-slate-400">Closed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col items-center justify-center text-center gap-2 py-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#10637c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <div className="font-bold text-slate-800 text-[9px] uppercase tracking-wider">Collection<br/>Reports</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col items-center justify-center text-center gap-2 py-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#10637c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <div className="font-bold text-slate-800 text-[9px] uppercase tracking-wider">Branch<br/>Details</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col items-center justify-center text-center gap-2 py-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#10637c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="font-bold text-slate-800 text-[9px] uppercase tracking-wider">Attendance</div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
