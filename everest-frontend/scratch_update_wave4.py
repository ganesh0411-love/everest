import re

filepath = r"C:\Users\DELL\Desktop\Everest\everest-frontend\src\components\AdminDashboard.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update ceiling calc
old_ceiling_logic = r"      if \(peakValue === 0\) peakValue = 1000;\s*const magnitude = Math\.pow\(10, Math\.floor\(Math\.log10\(peakValue\)\)\);\s*const normalized = peakValue \/ magnitude;\s*let step;\s*if \(normalized <= 1\.5\) step = 0\.2 \* magnitude;\s*else if \(normalized <= 2\) step = 0\.5 \* magnitude;\s*else if \(normalized <= 5\) step = 1 \* magnitude;\s*else step = 2 \* magnitude;\s*const ceiling = Math\.ceil\(peakValue \/ step\) \* step;"
new_ceiling_logic = """      if (peakValue === 0) peakValue = 1000;
      
      // Add a generous 30% buffer to the peak to ensure chart headroom
      const bufferedPeak = peakValue * 1.30;
      
      const magnitude = Math.pow(10, Math.floor(Math.log10(bufferedPeak)));
      const normalized = bufferedPeak / magnitude;
      let step;
      if (normalized <= 1.5) step = 0.2 * magnitude;
      else if (normalized <= 2) step = 0.5 * magnitude;
      else if (normalized <= 5) step = 1 * magnitude;
      else step = 2 * magnitude;
      
      const ceiling = Math.ceil(bufferedPeak / step) * step;"""
content = re.sub(old_ceiling_logic, new_ceiling_logic, content, flags=re.DOTALL)


# 2. Update wavePathD generation
old_wave_logic = r"    // Calculate wave path based on the highest bar peak in each bucket(.*?)    return \{ buckets, ceiling, yLabels, totalLoan, totalDisb, totalColl, wavePathD: pathD, waveFillD: fillD \};\s*\}, \[customers, overviewPeriod, isMobileViewport\]\);"
new_wave_logic = """    // Calculate wave path based on the highest bar peak in each bucket
    const wavePoints = buckets.map((b, idx) => {
      const bucketPeak = Math.max(b.loanAmount, b.disbursements, b.collections);
      // Natural float offset above the bar (bars are already compact due to buffered ceiling)
      let yPerc = 100 - Math.max(0, Math.min(100, (bucketPeak / ceiling) * 100)) - 10;
      if (yPerc < 5) yPerc = 5;
      
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
       // Stroke Path: Trace ONLY the top crest without the perpendicular vertical drops
       pathD = `M ${wavePoints[firstActiveIdx].x},${wavePoints[firstActiveIdx].y} `;
       for (let i = firstActiveIdx + 1; i <= lastActiveIdx; i++) {
         pathD += `L ${wavePoints[i].x},${wavePoints[i].y} `;
       }
       
       // Fill Path: Complete the shape including vertical drops and bottom baseline closure
       fillD = `M ${wavePoints[firstActiveIdx].x},100 L ${wavePoints[firstActiveIdx].x},${wavePoints[firstActiveIdx].y} `;
       for (let i = firstActiveIdx + 1; i <= lastActiveIdx; i++) {
         fillD += `L ${wavePoints[i].x},${wavePoints[i].y} `;
       }
       fillD += `L ${wavePoints[lastActiveIdx].x},100 Z`;
    }

    return { buckets, ceiling, yLabels, totalLoan, totalDisb, totalColl, wavePathD: pathD, waveFillD: fillD };
  }, [customers, overviewPeriod, isMobileViewport]);"""
content = re.sub(old_wave_logic, new_wave_logic, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated chart ceiling and wave boundaries!")