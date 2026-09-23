import re
import os

filepath = r"C:\Users\DELL\Desktop\Everest\everest-frontend\src\components\AdminDashboard.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add overviewPeriod state
state_block = r"const \[todayMetrics, setTodayMetrics\] = React\.useState\(\{ target: 0, collection: 0 \}\);"
new_state_block = "const [overviewPeriod, setOverviewPeriod] = React.useState('Monthly');\n    const [todayMetrics, setTodayMetrics] = React.useState({ target: 0, collection: 0 });"
content = re.sub(state_block, new_state_block, content)

# 2. Add useMemo for chart data aggregation
# Find the end of the useEffect for weeklyMetrics
use_effect_end = r"setWeeklyMetrics\(\{ target: wTarget, collection: wCollection, overdue: wOverdue \}\);\n    \}, \[customers\]\);"

aggregation_logic = """setWeeklyMetrics({ target: wTarget, collection: wCollection, overdue: wOverdue });
    }, [customers]);

    // --- CHART AGGREGATION ENGINE ---
    const chartData = React.useMemo(() => {
      const parseGlobalDate = (dStr) => {
        if (!dStr) return new Date();
        if (dStr && typeof dStr.toDate === 'function') return dStr.toDate();
        if (dStr && typeof dStr === 'object' && dStr.seconds !== undefined) return new Date(dStr.seconds * 1000);
        if (typeof dStr === 'string') {
          if (dStr.includes('-') && dStr.split('-')[0].length === 2) {
            const parts = dStr.split('-');
            const year = (parts[2] && parts[2].length === 2) ? '20' + parts[2] : (parts[2] || new Date().getFullYear());
            return new Date(${year}--);
          }
          if (dStr.includes('/') && dStr.split('/')[0].length === 2) {
            const parts = dStr.split('/');
            const year = (parts[2] && parts[2].length === 2) ? '20' + parts[2] : (parts[2] || new Date().getFullYear());
            return new Date(${year}--);
          }
        }
        return new Date(dStr);
      };

      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const buckets = [];
      
      if (overviewPeriod === 'Daily') {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          buckets.push({
            label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            start: new Date(d.setHours(0, 0, 0, 0)).getTime(),
            end: new Date(d.setHours(23, 59, 59, 999)).getTime(),
            loanAmount: 0, disbursements: 0, collections: 0
          });
        }
      } else if (overviewPeriod === 'Weekly') {
        // Last 6 weeks
        for (let i = 5; i >= 0; i--) {
          const dEnd = new Date(now);
          dEnd.setDate(dEnd.getDate() - (i * 7));
          const dStart = new Date(dEnd);
          dStart.setDate(dStart.getDate() - 6);
          dStart.setHours(0,0,0,0);
          dEnd.setHours(23,59,59,999);
          buckets.push({
            label: W,
            start: dStart.getTime(),
            end: dEnd.getTime(),
            loanAmount: 0, disbursements: 0, collections: 0
          });
        }
      } else { // Monthly
        // Last 6 months (to fit UI) or 12? UI shows 6 bars in screenshot. Let's do 6 rolling months to look clean.
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const endMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
          buckets.push({
            label: d.toLocaleDateString('en-US', { month: 'short' }),
            start: d.getTime(),
            end: endMonth.getTime(),
            loanAmount: 0, disbursements: 0, collections: 0
          });
        }
      }

      let totalLoan = 0;
      let totalDisb = 0;
      let totalColl = 0;

      customers.forEach(c => {
        if (c.status !== 'Approved' && c.status !== 'approved' && c.status !== 'Live' && c.status !== 'live') return;
        
        // Loan & Disbursement
        const cDate = parseGlobalDate(c.date || c.appDate || c.approvalDate || c.createdAt);
        const cTime = cDate.getTime();
        const lAmt = parseFloat(c.loanAmount || c.principalAmount || c.amount || 0);
        const dAmt = parseFloat(c.disbursedAmount || 0);
        
        buckets.forEach(b => {
          if (cTime >= b.start && cTime <= b.end) {
            b.loanAmount += lAmt;
            b.disbursements += dAmt;
          }
        });
        totalLoan += lAmt;
        totalDisb += dAmt;

        // Collections
        const insts = Array.isArray(c.installments) ? c.installments : [];
        insts.forEach(inst => {
          if (inst.status !== 'BOUNCED') {
            const iDate = parseGlobalDate(inst.date);
            const iTime = iDate.getTime();
            const iAmt = parseFloat(inst.amount || 0);
            
            buckets.forEach(b => {
              if (iTime >= b.start && iTime <= b.end) {
                b.collections += iAmt;
              }
            });
            totalColl += iAmt;
          }
        });
      });

      // Calculate dynamic Y-axis
      let peakValue = 0;
      buckets.forEach(b => {
        const mx = Math.max(b.loanAmount, b.disbursements, b.collections);
        if (mx > peakValue) peakValue = mx;
      });

      if (peakValue === 0) peakValue = 1000;
      
      // Calculate a nice ceiling
      const magnitude = Math.pow(10, Math.floor(Math.log10(peakValue)));
      const normalized = peakValue / magnitude;
      let step;
      if (normalized <= 1.5) step = 0.2 * magnitude;
      else if (normalized <= 2) step = 0.5 * magnitude;
      else if (normalized <= 5) step = 1 * magnitude;
      else step = 2 * magnitude;
      
      const ceiling = Math.ceil(peakValue / step) * step;
      const yLabels = [ceiling, ceiling * 0.8, ceiling * 0.6, ceiling * 0.4, ceiling * 0.2, 0].map(v => 
        v >= 1000 ? (v/1000).toFixed(1).replace('\.0', '') + 'k' : v.toString()
      );

      return { buckets, ceiling, yLabels, totalLoan, totalDisb, totalColl };
    }, [customers, overviewPeriod]);"""
content = re.sub(use_effect_end, aggregation_logic, content)

# 3. Replace Business Overview Chart
old_chart_html = r"\{/\* Business Overview & Analytics \*/\}(.*?)\{/\* Analytics Section - Right Cut-off Container \*/\}"

new_chart_html = """{/* Business Overview & Analytics */}
        <div className={ounded-xl mb-3 flex flex-col overflow-hidden } style={{ background: 'linear-gradient(90deg, #10637c 0%, #0a3d4f 100%)' }}>
          
          {/* Header Row with Toggle */}
          <div className="flex justify-between items-center px-3 pt-3">
            <h3 className="text-white text-[11px] font-black tracking-wider uppercase">Business Overview</h3>
            <div className="flex bg-black/20 rounded-md p-0.5 border border-white/10">
              {['Daily', 'Weekly', 'Monthly'].map(period => (
                <button 
                  key={period}
                  onClick={() => setOverviewPeriod(period)}
                  className={	ext-[8px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider transition-colors }
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
                       <div className="w-1.5 bg-[#2563eb] relative z-20 rounded-t-sm" style={{height: ${loanH}%}}></div>
                       <div className="w-1.5 bg-[#d8892f] relative z-20 rounded-t-sm" style={{height: ${disbH}%}}></div>
                       <div className="w-1.5 bg-[#059669] relative z-20 rounded-t-sm" style={{height: ${collH}%}}></div>
                     </div>
                   );
                 })}
              </div>
            </div>
            
            {/* Analytics Section - Right Cut-off Container */}"""
content = re.sub(old_chart_html, new_chart_html, content, flags=re.DOTALL)

# 4. Replace Right Badge
old_badge_html = r"\{/\* Analytics Section - Right Cut-off Container \*/\}(.*?)\{/\* Floating Analytics Title in the Gap \*/\}"
new_badge_html = """{/* Analytics Section - Right Cut-off Container */}
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
        </div>

        {/* Floating Analytics Title in the Gap */}"""
content = re.sub(old_badge_html, new_badge_html, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Update complete")