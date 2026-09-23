import re
import os

filepath = r"C:\Users\DELL\Desktop\Everest\everest-frontend\src\components\AdminDashboard.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the broken string
old_code = r"className=\{\t?ext-\[8px\] font-bold px-2 py-1 rounded-sm uppercase tracking-wider transition-colors \}"
new_code = "className={`text-[8px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider transition-colors ${overviewPeriod === period ? 'bg-white/20 text-white shadow-sm' : 'text-white/60 hover:text-white/90'}`}"
content = re.sub(old_code, new_code, content)

# There is also likely an issue with the style height interpolation
# `<div className="w-1.5 bg-[#2563eb] relative z-20 rounded-t-sm" style={{height: }}}></div>`
old_height = r"style=\{\{height: \}\}"
new_height1 = r"style={{height: `${loanH}%`}}"
new_height2 = r"style={{height: `${disbH}%`}}"
new_height3 = r"style={{height: `${collH}%`}}"
# It's better to just replace the whole bars block
old_bars_block = r"\{/\* Bars \(Loan / Disb / Coll Pairs\) \*/\}(.*?)\</div\>\n            \</div\>"
new_bars_block = """{/* Bars (Loan / Disb / Coll Pairs) */}
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
            </div>"""
content = re.sub(old_bars_block, new_bars_block, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Update complete")