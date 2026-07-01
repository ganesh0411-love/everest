const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const regex = /\{cadPrompt\.targetId && \(\s*<div className="flex flex-row items-center justify-between gap-2">\s*<label className="text-\[9px\] text-slate-400 font-bold whitespace-nowrap">Metric<\/label>\s*<div className="flex items-center w-\[90px\] gap-1">\s*<input type="number" step="0\.01" value=\{cadPromptValue\} onChange=\{e => setCadPromptValue\(e\.target\.value\)\} className="bg-slate-800 border border-slate-600 rounded px-1\.5 py-0\.5 text-white w-full text-\[10px\] font-bold outline-none focus:border-sky-500 text-right" placeholder="0\.00" required \/>\s*<select value=\{cadPromptUnit\} onChange=\{e => setCadPromptUnit\(e\.target\.value\)\} className="bg-slate-800 border border-slate-600 rounded px-1 py-0\.5 text-white text-\[9px\] font-bold outline-none focus:border-sky-500 cursor-pointer appearance-none">\s*<option value="meters">▼ M<\/option>\s*<option value="feet">▼ Ft<\/option>\s*<\/select>\s*<\/div>\s*<\/div>\s*\)\}/m;

const replacement = `<div className="flex flex-row items-center justify-between gap-2">
                                      <label className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Metric</label>
                                      <div className="flex items-center w-[90px] gap-1">
                                          <input type="number" step="0.01" value={cadPromptValue} onChange={e => setCadPromptValue(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white w-full text-[10px] font-bold outline-none focus:border-sky-500 text-right" placeholder="0.00" required={!!cadPrompt.targetId} />
                                          <select value={cadPromptUnit} onChange={e => setCadPromptUnit(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-white text-[9px] font-bold outline-none focus:border-sky-500 cursor-pointer appearance-none">
                                              <option value="meters">▼ M</option>
                                              <option value="feet">▼ Ft</option>
                                          </select>
                                      </div>
                                  </div>`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
    console.log("Regex replacement successful.");
} else {
    console.log("Regex failed to match.");
}
