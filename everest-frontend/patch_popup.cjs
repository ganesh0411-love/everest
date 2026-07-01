const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const targetStr = `        if (cadPrompt.type === 'FIRST_SURVEY' || cadPrompt.type === 'NEW_SURVEY') {
            if (!cadPromptSurveyNo.trim()) { alert("Survey No is required"); return; }
            const newSurveyId = Date.now().toString();
            const surveyColor = cadPrompt.type === 'NEW_SURVEY' ? cadPromptColor : '#3b82f6';
            setCadSurveys(prev => [...prev, { id: newSurveyId, surveyNo: cadPromptSurveyNo, subDivisionNo: cadPromptSubDiv, hexColor: surveyColor, isVisible: true }]);
            setCadActiveSurveyId(newSurveyId);
            
            if (cadPrompt.targetId) {
                const valStr = cadPromptValue.trim();
                const num = parseFloat(valStr);
                if (isNaN(num) || num <= 0) { setCadPrompt(null); return; }
                const line = cadLines.find(l => l.id === cadPrompt.targetId);
                if (line) {
                   const pxLength = Math.hypot(line.p1.x - line.p2.x, line.p1.y - line.p2.y);
                   if (!cadScale) {
                     setCadScale(num / pxLength);
                     setCadLines(prev => prev.map(l => l.id === line.id ? { ...l, fixedLength: valStr, surveyId: newSurveyId, hexColor: surveyColor } : l));
                   } else {
                     const targetPx = num / cadScale;
                     const ratio = targetPx / pxLength;
                     const newP2 = {
                       x: line.p1.x + (line.p2.x - line.p1.x) * ratio,
                       y: line.p1.y + (line.p2.y - line.p1.y) * ratio
                     };
                     setCadLines(prev => prev.map(l => l.id === line.id ? { ...l, p2: newP2, fixedLength: valStr, surveyId: newSurveyId, hexColor: surveyColor } : l));
                     if (cadTool === 'ADD_LINE' && cadAnchorNode) {
                        if (Math.hypot(cadAnchorNode.x - line.p2.x, cadAnchorNode.y - line.p2.y) < 1e-4) {
                           setCadAnchorNode(newP2);
                        }
                     }
                   }
                }
            } else if (cadPrompt.node) {
                setCadAnchorNode(cadPrompt.node);
                setIsAddRadiusEnabled(true);
                setCadTool('ADD_LINE');
            }
            
            setCadPrompt(null);
            setCadPromptSurveyNo('');
            setCadPromptSubDiv('');
            setCadPromptValue('');
            return;
        }`;

const replacementStr = `        if (cadPrompt.type === 'FIRST_SURVEY' || cadPrompt.type === 'NEW_SURVEY') {
            if (!cadPromptSurveyNo.trim()) { alert("Survey No is required"); return; }
            const newSurveyId = Date.now().toString();
            const surveyColor = cadPrompt.type === 'NEW_SURVEY' ? cadPromptColor : '#3b82f6';
            setCadSurveys(prev => [...prev, { id: newSurveyId, surveyNo: cadPromptSurveyNo, subDivisionNo: cadPromptSubDiv, hexColor: surveyColor, isVisible: true }]);
            setCadActiveSurveyId(newSurveyId);
            
            if (cadPrompt.targetId) {
                setCadPrompt({ type: 'LINE', targetId: cadPrompt.targetId, x: window.innerWidth / 2 - 140, y: window.innerHeight - 200 });
                setCadPromptValue('');
                setCadPromptSurveyNo('');
                setCadPromptSubDiv('');
                return;
            } else if (cadPrompt.node) {
                setCadAnchorNode(cadPrompt.node);
                setIsAddRadiusEnabled(true);
                setCadTool('ADD_LINE');
            }
            
            setCadPrompt(null);
            setCadPromptSurveyNo('');
            setCadPromptSubDiv('');
            setCadPromptValue('');
            return;
        }`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
} else {
    console.error("Target string not found for FIRST_SURVEY submission logic.");
}

const formTargetStr = `                  if (cadPrompt.type === 'FIRST_SURVEY' || cadPrompt.type === 'NEW_SURVEY') {
                        return (
                            <form 
                                onSubmit={submitCadPrompt}
                                className="absolute bottom-8 left-8 z-[120] bg-slate-900/90 p-3 rounded-xl shadow-2xl border border-slate-700 w-[180px] flex flex-col gap-2 pointer-events-auto animate-in slide-in-from-bottom-4" 
                                onClick={e => e.stopPropagation()}
                                onPointerDown={e => e.stopPropagation()}
                            >
                                <div className="text-[10px] text-fuchsia-400 font-black uppercase tracking-widest border-b border-slate-700 pb-1 mb-1">
                                    {cadPrompt.type === 'FIRST_SURVEY' ? 'Survey Attributes' : 'New Survey'}
                                </div>
                                {cadPrompt.targetId && (
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-[9px] text-slate-400 font-bold">First Line Metric (m)</label>
                                        <input type="number" step="0.01" value={cadPromptValue} onChange={e => setCadPromptValue(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-white w-full text-xs font-bold outline-none focus:border-sky-500" placeholder="Length in meters" required />
                                    </div>
                                )}
                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] text-slate-400 font-bold">Survey No.</label>
                                    <input autoFocus type="text" value={cadPromptSurveyNo} onChange={e => setCadPromptSurveyNo(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-white w-full text-xs font-bold outline-none focus:border-sky-500" placeholder="e.g. 101" required />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] text-slate-400 font-bold">Sub-div</label>
                                    <input type="text" value={cadPromptSubDiv} onChange={e => setCadPromptSubDiv(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-white w-full text-xs font-bold outline-none focus:border-sky-500" placeholder="Opt." />
                                </div>
                                {cadPrompt.type === 'NEW_SURVEY' && (
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-[9px] text-slate-400 font-bold">Boundary Color</label>
                                        <input type="color" value={cadPromptColor} onChange={e => setCadPromptColor(e.target.value)} className="w-full h-6 cursor-pointer rounded border border-slate-600 bg-slate-800 p-0 outline-none focus:border-sky-500" />
                                    </div>
                                )}
                                <button type="submit" className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-1.5 mt-0.5 rounded text-[10px] uppercase tracking-wider transition-colors w-full outline-none">OK</button>
                            </form>
                        );
                    }`;

const formReplacementStr = `                  if (cadPrompt.type === 'FIRST_SURVEY' || cadPrompt.type === 'NEW_SURVEY') {
                        return (
                            <form 
                                onSubmit={submitCadPrompt}
                                className="absolute bottom-8 left-8 z-[120] bg-slate-900/90 p-3 rounded-xl shadow-2xl border border-slate-700 w-[180px] flex flex-col gap-1.5 pointer-events-auto animate-in slide-in-from-bottom-4" 
                                onClick={e => e.stopPropagation()}
                                onPointerDown={e => e.stopPropagation()}
                            >
                                <div className="text-[10px] text-fuchsia-400 font-black uppercase tracking-widest border-b border-slate-700 pb-1 mb-1 text-center">
                                    {cadPrompt.type === 'FIRST_SURVEY' ? 'Survey Attributes' : 'New Survey'}
                                </div>
                                <div className="flex flex-row items-center justify-between gap-2">
                                    <label className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Metric</label>
                                    <select className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white w-[90px] text-[10px] font-bold outline-none focus:border-sky-500 text-right appearance-none text-center">
                                        <option value="meters">Meters</option>
                                    </select>
                                </div>
                                <div className="flex flex-row items-center justify-between gap-2">
                                    <label className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Survey No.</label>
                                    <input autoFocus type="text" value={cadPromptSurveyNo} onChange={e => setCadPromptSurveyNo(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white w-[90px] text-[10px] font-bold outline-none focus:border-sky-500 text-right" placeholder="e.g. 101" required />
                                </div>
                                <div className="flex flex-row items-center justify-between gap-2">
                                    <label className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Sub-div</label>
                                    <input type="text" value={cadPromptSubDiv} onChange={e => setCadPromptSubDiv(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white w-[90px] text-[10px] font-bold outline-none focus:border-sky-500 text-right" placeholder="Opt." />
                                </div>
                                {cadPrompt.type === 'NEW_SURVEY' && (
                                    <div className="flex flex-row items-center justify-between gap-2">
                                        <label className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Color</label>
                                        <input type="color" value={cadPromptColor} onChange={e => setCadPromptColor(e.target.value)} className="w-[90px] h-5 cursor-pointer rounded border border-slate-600 bg-slate-800 p-0 outline-none focus:border-sky-500" />
                                    </div>
                                )}
                                <button type="submit" className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-1 mt-1 rounded text-[10px] uppercase tracking-wider transition-colors w-full outline-none">OK</button>
                            </form>
                        );
                    }`;

if (content.includes(formTargetStr)) {
    content = content.replace(formTargetStr, formReplacementStr);
} else {
    console.error("Target string not found for FIRST_SURVEY form logic.");
}

fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
console.log('Update successful.');
