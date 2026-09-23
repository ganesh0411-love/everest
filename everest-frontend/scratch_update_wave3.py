import re

filepath = r"C:\Users\DELL\Desktop\Everest\everest-frontend\src\components\AdminDashboard.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update wave logic
old_wave_logic = r"    // Calculate wave path based on the highest bar peak in each bucket(.*?)    return \{ buckets, ceiling, yLabels, totalLoan, totalDisb, totalColl, wavePathD: pathD, waveFillD: fillD \};\s*\}, \[customers, overviewPeriod, isMobileViewport\]\);"
new_wave_logic = """    // Calculate wave path based on the highest bar peak in each bucket
    const wavePoints = buckets.map((b, idx) => {
      const bucketPeak = Math.max(b.loanAmount, b.disbursements, b.collections);
      // Generous headroom: 22 units above the tallest bar peak (with min cap 12)
      let yPerc = 100 - Math.max(0, Math.min(100, (bucketPeak / ceiling) * 100)) - 22;
      if (yPerc < 12) yPerc = 12;
      
      const xPerc = buckets.length > 1 ? (idx / (buckets.length - 1)) * 100 : 50;
      return { x: xPerc, y: yPerc, peak: bucketPeak };
    });

    let pathD = "M 0,100 L 100,100"; 
    let fillD = "M 0,100 L 100,100 Z";
    
    let firstActiveIdx = -1;
    let lastActiveIdx = -1;
    for (let i = 0; i < wavePoints.length; i++) {
      if (wavePoints[i].peak > 0) {
        if (firstActiveIdx === -1) firstActiveIdx = i;
        lastActiveIdx = i;
      }
    }
    
    if (wavePoints.length > 0 && firstActiveIdx !== -1) {
       // Left Edge: Perpendicular drop from baseline
       pathD = `M ${wavePoints[firstActiveIdx].x},100 L ${wavePoints[firstActiveIdx].x},${wavePoints[firstActiveIdx].y} `;
       
       for (let i = firstActiveIdx + 1; i <= lastActiveIdx; i++) {
         pathD += `L ${wavePoints[i].x},${wavePoints[i].y} `;
       }
       
       // Right Edge: Perpendicular drop to baseline
       pathD += `L ${wavePoints[lastActiveIdx].x},100`;
       
       fillD = `${pathD} Z`;
    }

    return { buckets, ceiling, yLabels, totalLoan, totalDisb, totalColl, wavePathD: pathD, waveFillD: fillD };
  }, [customers, overviewPeriod, isMobileViewport]);"""

if old_wave_logic in content:
    print("Found old wave logic, but regex might fail if not exact match. Let's do regex.")
content = re.sub(old_wave_logic, new_wave_logic, content, flags=re.DOTALL)

# 2. Update SVG UI to change gradient opacity
old_svg_gradient = r"""                       <linearGradient id="waveGradient" x1="0" x2="0" y1="0" y2="1">\s*<stop offset="0%" stopColor="#00E5FF" stopOpacity="0\.4" \/>\s*<stop offset="100%" stopColor="#00E5FF" stopOpacity="0\.0" \/>\s*<\/linearGradient>"""
new_svg_gradient = """                       <linearGradient id="waveGradient" x1="0" x2="0" y1="0" y2="1">
                         <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.15" />
                         <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.0" />
                       </linearGradient>"""
content = re.sub(old_svg_gradient, new_svg_gradient, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated chart boundaries and clearance!")