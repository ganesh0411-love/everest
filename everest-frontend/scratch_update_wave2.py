import re

filepath = r"C:\Users\DELL\Desktop\Everest\everest-frontend\src\components\AdminDashboard.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update wave logic
old_wave_logic = r"    // Calculate wave path based on the highest bar peak in each bucket(.*?)    return \{ buckets, ceiling, yLabels, totalLoan, totalDisb, totalColl, wavePathD: pathD \};\s*\}, \[customers, overviewPeriod, isMobileViewport\]\);"
new_wave_logic = """    // Calculate wave path based on the highest bar peak in each bucket
    const wavePoints = buckets.map((b, idx) => {
      const bucketPeak = Math.max(b.loanAmount, b.disbursements, b.collections);
      // Generous headroom: 25% higher than the tallest bar peak
      let yPerc = 100 - Math.max(0, Math.min(100, (bucketPeak / ceiling) * 100)) - 25;
      if (yPerc < 5) yPerc = 5;
      
      const xPerc = buckets.length > 1 ? (idx / (buckets.length - 1)) * 100 : 50;
      return { x: xPerc, y: yPerc, peak: bucketPeak };
    });

    let pathD = "M 0,100 L 100,100"; 
    let fillD = "M 0,100 L 100,100 Z";
    const firstActiveIdx = wavePoints.findIndex(wp => wp.peak > 0);
    
    if (wavePoints.length > 0 && firstActiveIdx !== -1) {
       pathD = `M ${wavePoints[firstActiveIdx].x},${wavePoints[firstActiveIdx].y} `;
       for (let i = firstActiveIdx + 1; i < wavePoints.length; i++) {
         pathD += `L ${wavePoints[i].x},${wavePoints[i].y} `;
       }
       fillD = `${pathD} L ${wavePoints[wavePoints.length-1].x},100 L ${wavePoints[firstActiveIdx].x},100 Z`;
    }

    return { buckets, ceiling, yLabels, totalLoan, totalDisb, totalColl, wavePathD: pathD, waveFillD: fillD };
  }, [customers, overviewPeriod, isMobileViewport]);"""
content = re.sub(old_wave_logic, new_wave_logic, content, flags=re.DOTALL)

# 2. Update SVG UI
old_svg_ui = r"""                   <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">.*?style=\{\{ filter: 'drop-shadow\(0px 2px 4px rgba\(6,182,212,0\.8\)\)' \}\}\s*\/>\s*<\/svg>"""
new_svg_ui = """                   <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                     <defs>
                       <linearGradient id="waveGradient" x1="0" x2="0" y1="0" y2="1">
                         <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.4" />
                         <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.0" />
                       </linearGradient>
                     </defs>
                     <path 
                       d={chartData.waveFillD} 
                       fill="url(#waveGradient)" 
                     />
                     <path 
                       d={chartData.wavePathD} 
                       fill="none" 
                       stroke="#00E5FF" 
                       strokeWidth="2" 
                       strokeLinecap="round"
                       strokeLinejoin="round"
                       vectorEffect="non-scaling-stroke"
                       style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,229,255,0.8))' }}
                     />
                   </svg>"""
content = re.sub(old_svg_ui, new_svg_ui, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated chart wave!")