const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const regex = /if \(cadPrompt\.targetId\) \{[\s\S]*?\} else if \(cadPrompt\.node\) \{/m;

const replacement = `if (cadPrompt.targetId) {
                setCadPrompt({ type: 'LINE', targetId: cadPrompt.targetId, x: window.innerWidth / 2 - 140, y: window.innerHeight - 200 });
                setCadPromptValue('');
                setCadPromptSurveyNo('');
                setCadPromptSubDiv('');
                return;
            } else if (cadPrompt.node) {`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
    console.log("Regex replacement successful.");
} else {
    console.log("Regex failed to match.");
}
