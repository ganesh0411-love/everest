import re
import os

filepath = r"C:\Users\DELL\Desktop\Everest\everest-frontend\src\components\AdminDashboard.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add activeTooltip state hook if it doesn't exist
hook_target = r"  // --- VIEWPORT & RESPONSIVE STATE ---"
hook_replacement = """  // --- VIEWPORT & RESPONSIVE STATE ---
  const [activeTooltip, setActiveTooltip] = React.useState(null);"""
if "const [activeTooltip" not in content:
    content = content.replace(hook_target, hook_replacement + "\n" + hook_target)

# Replace the UI block
old_ui = r"      \{\/\* Business Overview & Analytics \*\/\}[\s\S]*?className=\"text-slate-800 text-\[7px\] font-black uppercase\">Collections<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>"

new_ui = """      {/* Business Overview & Analytics */}
      <div 
        className={`rounded-xl mb-3 flex flex-col overflow-hidden shadow-md`} 
        style={{ background: 'linear-gradient(90deg, #10637c 0%, #0a3d4f 100%)' }}
        onClick={() => setActiveTooltip(null)}
      >
        
        {/* Header Row with Toggle */}
        <div className="flex justify-between items-center px-3 pt-3">
          <h3 className="text-white text-[11px] font-black tracking-wider uppercase">Business Overview</h3>
          <div className="flex bg-black/20 rounded-md p-0.5 border border-white/10">
            {['Daily', 'Weekly', 'Monthly'].map(period => (
              <button 
                key={period}
                onClick={(e) => { e.stopPropagation(); setOverviewPeriod(period); }}
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
               
               {/* Tooltip Overlay */}
               {activeTooltip && (
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 bg-white px-2 py-1 rounded shadow-lg z-50 pointer-events-none flex flex-col items-center">
                   <div className="text-[8px] font-black text-slate-500 uppercase">{activeTooltip.type}</div>
                   <div className="text-[10px] font-black text-slate-800">₹{activeTooltip.val.toLocaleString('en-IN')}</div>
                 </div>
               )}

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
                     d={`${chartData.wavePathD} L 100,100 L 0,100 Z`} 
                     fill="url(#waveGradient)" 
                   />
                   <path 
                     d={chartData.wavePathD} 
                     fill="none" 
                     stroke="#06b6d4" 
                     strokeWidth="2.5" 
                     style={{ filter: 'drop-shadow(0px 2px 4px rgba(6,182,212,0.8))' }}
                   />
                 </svg>
               </div>
               
               {/* Y-Axis Labels */}
               <div className="absolute left-0 top-0 bottom-2 flex flex-col justify-between text-[7px] font-bold text-white/90 h-full z-10 pointer-events-none">
                 {chartData.yLabels.map((lbl, idx) => <span key={idx}>{lbl}</span>)}
               </div>
               
               {/* X-Axis Labels */}
               <div className="absolute -bottom-3.5 left-6 right-2 flex justify-between text-[7px] font-bold text-white/90 z-10 pointer-events-none">
                 {chartData.buckets.map((b, i) => <span key={i}>{b.label}</span>)}
               </div>
               
               {/* Bars (Loan / Disb / Coll Pairs) */}
               {chartData.buckets.map((b, i) => {
                 const loanH = Math.max(0, Math.min(100, (b.loanAmount / chartData.ceiling) * 100));
                 const disbH = Math.max(0, Math.min(100, (b.disbursements / chartData.ceiling) * 100));
                 const collH = Math.max(0, Math.min(100, (b.collections / chartData.ceiling) * 100));
                 return (
                   <div key={i} className="flex items-end gap-[1px] h-full z-10">
                     <div 
                       className="w-1.5 bg-[#2563eb] relative z-20 rounded-t-sm cursor-pointer transition-all hover:scale-y-[1.15] hover:brightness-125" 
                       style={{height: `${loanH}%`, transformOrigin: 'bottom'}}
                       onMouseEnter={(e) => { e.stopPropagation(); setActiveTooltip({ type: 'Loan Amount', val: b.loanAmount }); }}
                       onMouseLeave={() => setActiveTooltip(null)}
                       onClick={(e) => { e.stopPropagation(); setActiveTooltip({ type: 'Loan Amount', val: b.loanAmount }); }}
                     ></div>
                     <div 
                       className="w-1.5 bg-[#d8892f] relative z-20 rounded-t-sm cursor-pointer transition-all hover:scale-y-[1.15] hover:brightness-125" 
                       style={{height: `${disbH}%`, transformOrigin: 'bottom'}}
                       onMouseEnter={(e) => { e.stopPropagation(); setActiveTooltip({ type: 'Disbursement', val: b.disbursements }); }}
                       onMouseLeave={() => setActiveTooltip(null)}
                       onClick={(e) => { e.stopPropagation(); setActiveTooltip({ type: 'Disbursement', val: b.disbursements }); }}
                     ></div>
                     <div 
                       className="w-1.5 bg-[#059669] relative z-20 rounded-t-sm cursor-pointer transition-all hover:scale-y-[1.15] hover:brightness-125" 
                       style={{height: `${collH}%`, transformOrigin: 'bottom'}}
                       onMouseEnter={(e) => { e.stopPropagation(); setActiveTooltip({ type: 'Collection', val: b.collections }); }}
                       onMouseLeave={() => setActiveTooltip(null)}
                       onClick={(e) => { e.stopPropagation(); setActiveTooltip({ type: 'Collection', val: b.collections }); }}
                     ></div>
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
content = re.sub(old_ui, new_ui, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated UI block!")