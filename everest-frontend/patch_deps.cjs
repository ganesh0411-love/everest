const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

content = content.replace(
    /^\s*\}\),\s*\[cadLines, cadSurveys, cadPolygons, checkedSurveyNos\]\);/gm,
    `  }, [cadLines, cadSurveys, cadPolygons, checkedSurveyNos, cadPrompt]);`
);

fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
console.log("Patched visibleCadLines dependencies");
