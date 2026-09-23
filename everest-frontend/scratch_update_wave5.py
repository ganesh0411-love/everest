import re

filepath = r"C:\Users\DELL\Desktop\Everest\everest-frontend\src\components\AdminDashboard.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update ceiling buffer to 50%
content = content.replace("const bufferedPeak = peakValue * 1.30;", "const bufferedPeak = peakValue * 1.50;")

# 2. Update wave headroom to 30 units
content = content.replace("let yPerc = 100 - Math.max(0, Math.min(100, (bucketPeak / ceiling) * 100)) - 10;", "let yPerc = 100 - Math.max(0, Math.min(100, (bucketPeak / ceiling) * 100)) - 30;")

# 3. Change SVG wrapper z-index from z-0 to z-20 so it renders ON TOP of the bars (which are z-10)
content = content.replace("""{/* SVG Wave Line underneath */}
               <div className="absolute top-0 bottom-2 left-6 right-2 z-0 overflow-hidden pointer-events-none">""", """{/* SVG Wave Line underneath */}
               <div className="absolute top-0 bottom-2 left-6 right-2 z-20 overflow-hidden pointer-events-none">""")


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated z-index and ceiling buffer!")