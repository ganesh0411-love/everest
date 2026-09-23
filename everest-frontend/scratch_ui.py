import os

filepath = r"C:\Users\DELL\Desktop\Everest\everest-frontend\src\components\AdminDashboard.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_ui = """      {/* Business Overview & Analytics */}
        <div className={`rounded-xl mb-3 flex overflow-hidden ${cardShadowClass}`} style={{ background: 'linear-gradient(90deg, #10637c 0%, #0a3d4f 100%)' }}>
          <div className="w-[75%] p-3 pr-2 flex flex-col relative">
            <h3 className="text-white text-[11px] font-black tracking-wider mb-2 uppercase">Business Overview</h3>
            <div className="flex items-center gap-3 mb-3 text-[8px] font-bold text-white/90">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#d8892f] rounded-sm"></span> LOAN DISBURSEMENTS</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#06b6d4] rounded-sm"></span> COLLECTIONS</span>
            </div>
            
            {/* SVG Chart: Two Solid Bars Per Month */}
            <div className="h-24 w-full relative mt-auto border-b border-white/20 pl-6 pb-2 flex items-end justify-between pr-2">
               {/* SVG Wave Line underneath */}
               <div className="absolute top-0 bottom-2 left-6 right-2 z-0 overflow-hidden pointer-events-none">
                 <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                   <defs>
                     <linearGradient id="waveGradient" x1="0" x2="0" y1="0" y2="1">
                       <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
                       <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                     </linearGradient>
                   </defs>
                   <path 
                     d="M 0,60 L 8,60 L 25,40 L 42,50 L 58,15 L 75,45 L 92,10 L 100,10 L 100,100 L 0,100 Z" 
                     fill="url(#waveGradient)" 
                   />
                   <path 
                     d="M 0,60 L 8,60 L 25,40 L 42,50 L 58,15 L 75,45 L 92,10 L 100,10" 
                     fill="none" 
                     stroke="#06b6d4" 
                     strokeWidth="2.5" 
                     style={{ filter: 'drop-shadow(0px 2px 4px rgba(6,182,212,0.8))' }}
                   />
                 </svg>
               </div>
               
               {/* Y-Axis Labels - Made 100% visible */}
               <div className="absolute left-0 top-0 bottom-2 flex flex-col justify-between text-[7px] font-bold text-white/90 h-full z-10">
                 <span>1000</span>
                 <span>800</span>
                 <span>600</span>
                 <span>400</span>
                 <span>200</span>
                 <span>0</span>
               </div>
               
               {/* X-Axis Labels */}
               <div className="absolute -bottom-3.5 left-6 right-2 flex justify-between text-[7px] font-bold text-white/90 z-10">
                 <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
               </div>
               
               {/* Bars (Disbursements / Collections Pairs) */}
               <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[30%] bg-[#d8892f] relative z-20"></div><div className="w-1.5 h-[20%] bg-[#06b6d4] relative z-20"></div></div>
               <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[50%] bg-[#d8892f] relative z-20"></div><div className="w-1.5 h-[35%] bg-[#06b6d4] relative z-20"></div></div>
               <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[40%] bg-[#d8892f] relative z-20"></div><div className="w-1.5 h-[25%] bg-[#06b6d4] relative z-20"></div></div>
               <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[60%] bg-[#d8892f] relative z-20"></div><div className="w-1.5 h-[40%] bg-[#06b6d4] relative z-20"></div></div>
               <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[45%] bg-[#d8892f] relative z-20"></div><div className="w-1.5 h-[30%] bg-[#06b6d4] relative z-20"></div></div>
               <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[70%] bg-[#d8892f] relative z-20"></div><div className="w-1.5 h-[50%] bg-[#06b6d4] relative z-20"></div></div>
            </div>
          </div>
          
          {/* Analytics Section - Right Cut-off Container */}
          <div className="w-[32%] my-auto bg-white py-3 pl-2 pr-7 flex flex-col justify-center text-center relative rounded-l-3xl translate-x-6 shadow-[-4px_0_12px_rgba(0,0,0,0.1)]">
            <div className="mt-2">
              <div className="text-[#d8892f] font-black text-xs">₹18,250</div>
              <div className="text-slate-800 text-[8px] font-black uppercase border-b border-slate-100 pb-1 mb-1">Disbursements</div>
              <div className="text-[#0369a1] font-black text-xs mt-1.5">₹15,450</div>
              <div className="text-slate-800 text-[8px] font-black uppercase">Collections</div>
            </div>
          </div>
        </div>"""

new_ui = """      {/* Business Overview & Analytics */}
        <div className={`rounded-xl mb-3 flex flex-col overflow-hidden ${cardShadowClass}`} style={{ background: 'linear-gradient(90deg, #10637c 0%, #0a3d4f 100%)' }}>
          
          {/* Header Row with Toggle */}
          <div className="flex justify-between items-center px-3 pt-3">
            <h3 className="text-white text-[11px] font-black tracking-wider uppercase">Business Overview</h3>
            <div className="flex bg-black/20 rounded-md p-0.5 border border-white/10">
              {['Daily', 'Weekly', 'Monthly'].map(period => (
                <button 
                  key={period}
                  onClick={() => setOverviewPeriod(period)}
                  className={`text-[8px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider transition-colors ${overviewPeriod === period ? 'bg-white/20 text-white shadow-sm' : 'text-white/60 hover:text-white/90'}`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full">
            <div className="w-[75%] p-3 pt-1 pr-2 flex flex-col relative">
              <div className="flex items-center gap-3 mb-3 text-[8px] font-bold text-white/90">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#2563eb] rounded-sm"></span> LOAN AMOUNT</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#d8892f] rounded-sm"></span> DISBURSEMENTS</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#059669] rounded-sm"></span> COLLECTIONS</span>
              </div>
              
              {/* SVG Chart: Three Solid Bars Per Bucket */}
              <div className="h-24 w-full relative mt-auto border-b border-white/20 pl-6 pb-2 flex items-end justify-between pr-2">
                 {/* SVG Wave Line underneath */}
                 <div className="absolute top-0 bottom-2 left-6 right-2 z-0 overflow-hidden pointer-events-none">
                   <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                     <defs>
                       <linearGradient id="waveGradient" x1="0" x2="0" y1="0" y2="1">
                         <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
                         <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                       </linearGradient>
                     </defs>
                     <path 
                       d="M 0,60 L 8,60 L 25,40 L 42,50 L 58,15 L 75,45 L 92,10 L 100,10 L 100,100 L 0,100 Z" 
                       fill="url(#waveGradient)" 
                     />
                     <path 
                       d="M 0,60 L 8,60 L 25,40 L 42,50 L 58,15 L 75,45 L 92,10 L 100,10" 
                       fill="none" 
                       stroke="#06b6d4" 
                       strokeWidth="2.5" 
                       style={{ filter: 'drop-shadow(0px 2px 4px rgba(6,182,212,0.8))' }}
                     />
                   </svg>
                 </div>
                 
                 {/* Y-Axis Labels */}
                 <div className="absolute left-0 top-0 bottom-2 flex flex-col justify-between text-[7px] font-bold text-white/90 h-full z-10">
                   {chartData.yLabels.map((lbl, idx) => <span key={idx}>{lbl}</span>)}
                 </div>
                 
                 {/* X-Axis Labels */}
                 <div className="absolute -bottom-3.5 left-6 right-2 flex justify-between text-[7px] font-bold text-white/90 z-10">
                   {chartData.buckets.map((b, i) => <span key={i}>{b.label}</span>)}
                 </div>
                 
                 {/* Bars (Loan / Disb / Coll Pairs) */}
                 {chartData.buckets.map((b, i) => {
                   const loanH = Math.max(0, Math.min(100, (b.loanAmount / chartData.ceiling) * 100));
                   const disbH = Math.max(0, Math.min(100, (b.disbursements / chartData.ceiling) * 100));
                   const collH = Math.max(0, Math.min(100, (b.collections / chartData.ceiling) * 100));
                   return (
                     <div key={i} className="flex items-end gap-[1px] h-full z-10">
                       <div className="w-1.5 bg-[#2563eb] relative z-20 rounded-t-sm" style={{height: `${loanH}%`}}></div>
                       <div className="w-1.5 bg-[#d8892f] relative z-20 rounded-t-sm" style={{height: `${disbH}%`}}></div>
                       <div className="w-1.5 bg-[#059669] relative z-20 rounded-t-sm" style={{height: `${collH}%`}}></div>
                     </div>
                   );
                 })}
              </div>
            </div>
            
            {/* Analytics Section - Right Cut-off Container */}
            <div className="w-[32%] my-auto bg-white py-2 pl-2 pr-5 flex flex-col justify-center text-center relative rounded-l-3xl translate-x-6 shadow-[-4px_0_12px_rgba(0,0,0,0.1)]">
              <div className="mt-1">
                <div className="text-[#2563eb] font-black text-[10px]">₹{chartData.totalLoan.toLocaleString('en-IN')}</div>
                <div className="text-slate-800 text-[7px] font-black uppercase border-b border-slate-100 pb-0.5 mb-0.5">Loan Amt</div>
                <div className="text-[#d8892f] font-black text-[10px]">₹{chartData.totalDisb.toLocaleString('en-IN')}</div>
                <div className="text-slate-800 text-[7px] font-black uppercase border-b border-slate-100 pb-0.5 mb-0.5">Disbursed</div>
                <div className="text-[#059669] font-black text-[10px]">₹{chartData.totalColl.toLocaleString('en-IN')}</div>
                <div className="text-slate-800 text-[7px] font-black uppercase">Collections</div>
              </div>
            </div>
          </div>
        </div>"""

if old_ui in content:
    content = content.replace(old_ui, new_ui)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("UI block successfully replaced!")
else:
    print("Could not find the old UI block exactly as specified.")