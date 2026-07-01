const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

// 1. Fix Survey No Top Header button text
const surveyBtnRegex = /\{checkedSurveyNos\.length > 0 \? `Survey No \$\{checkedSurveyNos\.join\(', '\)\}` : 'Survey No'\}/g;
content = content.replace(surveyBtnRegex,
`{(() => {
                             const activeObj = cadSurveys.find(s => s.id === cadActiveSurveyId);
                             if (activeObj) return \`Survey No \${activeObj.surveyNo}\`;
                             return checkedSurveyNos.length > 0 ? \`Survey No \${checkedSurveyNos[0]}\` : 'Survey No';
                          })()}`
);

// 2. Fix Sub-division Top Header button text
const subDivBtnRegex = /\{\(\(\) => \{\s*if \(checkedSurveyNos\.length === 0\) return 'Sub-division -';\s*const activeObj = cadSurveys\.find\(s => s\.id === cadActiveSurveyId && s\.isVisible\);\s*if \(activeObj\) return `Sub-division - \$\{activeObj\.subDivisionNo\}`;\s*return 'Sub-division - All';\s*\}\)\(\)\}/g;
content = content.replace(subDivBtnRegex,
`{(() => {
                             if (checkedSurveyNos.length === 0) return 'Sub-division -';
                             const activeObj = cadSurveys.find(s => s.id === cadActiveSurveyId);
                             if (activeObj) return \`Sub-division - \${activeObj.subDivisionNo || 'All'}\`;
                             return 'Sub-division - All';
                          })()}`
);

// 3. Fix Sub-division Dropdown string template
const subDivRowRegex = /\{survey\.surveyNo\} \/ \{survey\.subDivisionNo \|\| '-'\}/g;
content = content.replace(subDivRowRegex,
`{survey.subDivisionNo || '-'}`
);

fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
console.log("Header and Dropdown UI fixes applied.");
