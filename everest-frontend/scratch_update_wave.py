import re

filepath = r"C:\Users\DELL\Desktop\Everest\everest-frontend\src\components\AdminDashboard.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update wavePathD generation
old_wave_logic = r"    // Calculate wave path based on the highest bar peak in each bucket(.*?)      \}[\r\n\s]+    \}"
new_wave_logic = """    // Calculate wave path based on the highest bar peak in each bucket
    const wavePoints = buckets.map((b, idx) => {
      const bucketPeak = Math.max(b.loanAmount, b.disbursements, b.collections);
      // Introduce 15 units of visual headroom above the highest bar
      let yPerc = 100 - Math.max(0, Math.min(100, (bucketPeak / ceiling) * 100)) - 15;
      // Prevent clipping outside the SVG viewBox at the top
      if (yPerc < 5) yPerc = 5;
      
      const xPerc = buckets.length > 1 ? (idx / (buckets.length - 1)) * 100 : 50;
      return { x: xPerc, y: yPerc };
    });

    let pathD = "M 0,100 "; // Fallback
    if (wavePoints.length > 0) {
      pathD = `M ${wavePoints[0].x},${wavePoints[0].y} `;
      for (let i = 0; i < wavePoints.length - 1; i++) {
        const curr = wavePoints[i];
        const next = wavePoints[i+1];
        // Use a cubic Bezier curve with horizontal control points for an ambient, organic spline curve
        const midX = (curr.x + next.x) / 2;
        pathD += `C ${midX},${curr.y} ${midX},${next.y} ${next.x},${next.y} `;
      }
    }"""
content = re.sub(old_wave_logic, new_wave_logic, content, flags=re.DOTALL)


# 2. Update SVG Path stroke rendering
old_svg_path = r"""                   <path \s*d=\{chartData\.wavePathD\} \s*fill=\"none\" \s*stroke=\"#06b6d4\" \s*strokeWidth=\"2\.5\" \s*style=\{\{ filter: 'drop-shadow\(0px 2px 4px rgba\(6,182,212,0\.8\)\)' \}\}\s*\/>"""
new_svg_path = """                   <path 
                     d={chartData.wavePathD} 
                     fill="none" 
                     stroke="#06b6d4" 
                     strokeWidth="1.5" 
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     vectorEffect="non-scaling-stroke"
                     style={{ filter: 'drop-shadow(0px 2px 4px rgba(6,182,212,0.8))' }}
                   />"""

if 'strokeWidth="2.5"' in content and 'style={{ filter:' in content:
    content = re.sub(old_svg_path, new_svg_path, content, flags=re.DOTALL)
else:
    print("Could not find the SVG path to replace!")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated wave logic and SVG rendering!")