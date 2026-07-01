const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

// 1. Add cadPromptUnit state
const stateTarget = "const [cadPromptValue, setCadPromptValue] = React.useState('');";
if (content.includes(stateTarget) && !content.includes("const [cadPromptUnit, setCadPromptUnit] = React.useState('meters');")) {
    content = content.replace(stateTarget, stateTarget + "\n  const [cadPromptUnit, setCadPromptUnit] = React.useState('meters');");
}

// 2. Fix the submission logic
const submitLogicTarget = `        if (cadPrompt.type === 'FIRST_SURVEY' || cadPrompt.type === 'NEW_SURVEY') {
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

const submitLogicReplacement = `        if (cadPrompt.type === 'FIRST_SURVEY' || cadPrompt.type === 'NEW_SURVEY') {
            if (!cadPromptSurveyNo.trim()) { alert("Survey No is required"); return; }
            const newSurveyId = Date.now().toString();
            const surveyColor = cadPrompt.type === 'NEW_SURVEY' ? cadPromptColor : '#3b82f6';
            setCadSurveys(prev => [...prev, { id: newSurveyId, surveyNo: cadPromptSurveyNo, subDivisionNo: cadPromptSubDiv, hexColor: surveyColor, isVisible: true }]);
            setCadActiveSurveyId(newSurveyId);
            
            if (cadPrompt.targetId) {
                let valStr = cadPromptValue.trim();
                let num = parseFloat(valStr);
                if (isNaN(num) || num <= 0) { setCadPrompt(null); return; }
                
                if (cadPromptUnit === 'feet') {
                    num = num * 0.3048;
                    valStr = num.toFixed(2);
                }
                
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
            setCadPromptUnit('meters');
            return;
        }`;

if (content.includes(submitLogicTarget)) {
    content = content.replace(submitLogicTarget, submitLogicReplacement);
    console.log("Submission logic updated.");
} else {
    console.log("Submission logic target NOT found.");
}

// 3. Fix the UI render block
const uiTarget = `                                <div className="flex flex-row items-center justify-between gap-2">
                                    <label className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Metric</label>
                                    <select className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white w-[90px] text-[10px] font-bold outline-none focus:border-sky-500 text-right appearance-none text-center">
                                        <option value="meters">Meters</option>
                                    </select>
                                </div>`;

const uiReplacement = `                                {cadPrompt.targetId && (
                                  <div className="flex flex-row items-center justify-between gap-2">
                                      <label className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Metric</label>
                                      <div className="flex items-center w-[90px] gap-1">
                                          <input type="number" step="0.01" value={cadPromptValue} onChange={e => setCadPromptValue(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white w-full text-[10px] font-bold outline-none focus:border-sky-500 text-right" placeholder="0.00" required />
                                          <select value={cadPromptUnit} onChange={e => setCadPromptUnit(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-white text-[9px] font-bold outline-none focus:border-sky-500 cursor-pointer appearance-none">
                                              <option value="meters">▼ M</option>
                                              <option value="feet">▼ Ft</option>
                                          </select>
                                      </div>
                                  </div>
                                )}`;

if (content.includes(uiTarget)) {
    content = content.replace(uiTarget, uiReplacement);
    console.log("UI block updated.");
} else {
    console.log("UI block target NOT found.");
}

fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
console.log('Update finished.');
