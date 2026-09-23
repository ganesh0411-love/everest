import re
import os

filepath = r"C:\Users\DELL\Desktop\Everest\everest-frontend\src\components\AdminDashboard.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add isMobileViewport hook and resize listener right before chartData
hook_target = r"  // --- CHART AGGREGATION ENGINE ---"
hook_replacement = """  // --- VIEWPORT & RESPONSIVE STATE ---
  const [isMobileViewport, setIsMobileViewport] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const handleResize = () => setIsMobileViewport(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- CHART AGGREGATION ENGINE ---"""
if "const [isMobileViewport" not in content:
    content = content.replace(hook_target, hook_replacement)

# 2. Update chartData engine to use bucketCount and generate wavePath
old_engine = r"  // --- CHART AGGREGATION ENGINE ---(.*?)  }, \[customers, overviewPeriod\]\);"
new_engine = """  // --- CHART AGGREGATION ENGINE ---
  const chartData = React.useMemo(() => {
    const parseGlobalDate = (dStr) => {
      if (!dStr) return new Date();
      if (dStr && typeof dStr.toDate === 'function') return dStr.toDate();
      if (dStr && typeof dStr === 'object' && dStr.seconds !== undefined) return new Date(dStr.seconds * 1000);
      if (typeof dStr === 'string') {
        if (dStr.includes('-') && dStr.split('-')[0].length === 2) {
          const parts = dStr.split('-');
          const year = (parts[2] && parts[2].length === 2) ? '20' + parts[2] : (parts[2] || new Date().getFullYear());
          return new Date(`${year}-${parts[1]}-${parts[0]}`);
        }
        if (dStr.includes('/') && dStr.split('/')[0].length === 2) {
          const parts = dStr.split('/');
          const year = (parts[2] && parts[2].length === 2) ? '20' + parts[2] : (parts[2] || new Date().getFullYear());
          return new Date(`${year}-${parts[1]}-${parts[0]}`);
        }
      }
      return new Date(dStr);
    };

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const buckets = [];
    const bucketCount = isMobileViewport ? 6 : 12;
    
    if (overviewPeriod === 'Daily') {
      for (let i = bucketCount - 1; i >= 0; i--) {
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
      for (let i = bucketCount - 1; i >= 0; i--) {
        const dEnd = new Date(now);
        dEnd.setDate(dEnd.getDate() - (i * 7));
        const dStart = new Date(dEnd);
        dStart.setDate(dStart.getDate() - 6);
        dStart.setHours(0,0,0,0);
        dEnd.setHours(23,59,59,999);
        buckets.push({
          label: `W${bucketCount - i}`,
          start: dStart.getTime(),
          end: dEnd.getTime(),
          loanAmount: 0, disbursements: 0, collections: 0
        });
      }
    } else { 
      for (let i = bucketCount - 1; i >= 0; i--) {
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

    let peakValue = 0;
    buckets.forEach(b => {
      const mx = Math.max(b.loanAmount, b.disbursements, b.collections);
      if (mx > peakValue) peakValue = mx;
    });

    if (peakValue === 0) peakValue = 1000;
    
    const magnitude = Math.pow(10, Math.floor(Math.log10(peakValue)));
    const normalized = peakValue / magnitude;
    let step;
    if (normalized <= 1.5) step = 0.2 * magnitude;
    else if (normalized <= 2) step = 0.5 * magnitude;
    else if (normalized <= 5) step = 1 * magnitude;
    else step = 2 * magnitude;
    
    const ceiling = Math.ceil(peakValue / step) * step;
    const yLabels = [ceiling, ceiling * 0.8, ceiling * 0.6, ceiling * 0.4, ceiling * 0.2, 0].map(v => 
      v >= 1000 ? (v/1000).toFixed(1).replace('.0', '') + 'k' : v.toString()
    );

    // Calculate wave path based on the highest bar peak in each bucket
    const wavePoints = buckets.map((b, idx) => {
      const bucketPeak = Math.max(b.loanAmount, b.disbursements, b.collections);
      // Determine Y coordinate (SVG origin is top-left, so 0 is top (value=ceiling), 100 is bottom (value=0))
      // Values are scaled 0-100% of the SVG height
      // The wave will peak strictly at the tallest bar.
      const yPerc = 100 - Math.max(0, Math.min(100, (bucketPeak / ceiling) * 100));
      // Determine X coordinate (aligned with the center of the bar group)
      // There are N buckets. For N buckets distributed with justify-between, 
      // they are roughly at x = (i / (N-1)) * 100
      const xPerc = buckets.length > 1 ? (idx / (buckets.length - 1)) * 100 : 50;
      return `${xPerc},${yPerc}`;
    });

    let pathD = "M 0,100 "; // Start at bottom left
    if (wavePoints.length > 0) {
      pathD = `M ${wavePoints[0]} `;
      for (let i = 1; i < wavePoints.length; i++) {
        pathD += `L ${wavePoints[i]} `;
      }
    }

    return { buckets, ceiling, yLabels, totalLoan, totalDisb, totalColl, wavePathD: pathD };
  }, [customers, overviewPeriod, isMobileViewport]);"""
content = re.sub(old_engine, new_engine, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated chart engine!")