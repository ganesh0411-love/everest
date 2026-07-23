const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\r\n/g, '\n'); 

// 1. Dropdown positioning
const oldDropdownClass = 'className="absolute z-[600] w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto"';
const newDropdownClass = 'className="relative z-[600] w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto"';
content = content.replace(oldDropdownClass, newDropdownClass);
console.log("Dropdown class updated to relative");

// 2. Multi-Survey Subdiv Logic fix
// To ensure we don't drop arrays, let's use flatMap and carefully handle the promises.
const subdivStartStr = "  // Fetch subdivs only when selSurvey changes\n  React.useEffect(() => {\n      if (selSurvey && selSurvey.length > 0) {";
const subdivEndStr = "      } else {\n          setLsSubdivs([]);\n      }\n  }, [selSurvey]);";
const sStart = content.indexOf(subdivStartStr);
const sEnd = content.indexOf(subdivEndStr, sStart) + subdivEndStr.length;

if (sStart !== -1 && sEnd !== -1) {
    const newSubdiv = `  // Fetch subdivs only when selSurvey changes
  React.useEffect(() => {
      let active = true;
      if (selSurvey && selSurvey.length > 0) {
          setLsLoading('subdivs');
          
          const fetchPromises = selSurvey.map(survey => 
            fetch(\`\${API_BASE}/api/tngis/subdivisions?village=\${encodeURIComponent(selVillage)}&survey=\${encodeURIComponent(survey)}&taluk=\${encodeURIComponent(selTaluk)}\`)
              .then(res => res.json())
              .then(res => {
                  const dataArr = res.data || [];
                  return dataArr.map(subdiv => selSurvey.length > 1 ? \`\${subdiv} (\${survey})\` : subdiv);
              })
              .catch(err => [])
          );

          Promise.all(fetchPromises)
          .then(results => {
              if (!active) return;
              // flatMap aggregation to combine all survey subdivs
              const combined = results.flatMap(x => x);
              setLsSubdivs([...new Set(combined)]);
          })
          .catch(err => {
              if (!active) return;
              console.error("Error fetching subdivs:", err);
              setLsSubdivs([]);
          })
          .finally(() => {
              if (active) setLsLoading('');
          });
      } else {
          setLsSubdivs([]);
      }
      return () => { active = false; };
  }, [selSurvey, selVillage, selTaluk]);`;
    content = content.substring(0, sStart) + newSubdiv + content.substring(sEnd);
    console.log("Patched Subdiv Fetch with flatMap and active toggle");
} else {
    console.log("Could not find subdiv block");
}

fs.writeFileSync(file, content);
