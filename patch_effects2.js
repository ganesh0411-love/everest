const fs = require('fs');
let code = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// Replace the selVillage useEffect
code = code.replace(
    /React\.useEffect\(\(\) => \{\s*if \(selVillage\) \{\s*fetchAndHighlight\('village', \{ selDistrict, selTaluk, selVillage, selSurvey, selSubdiv \}\);\s*setLsLoading\('surveys'\);\s*fetch\([\s\S]*?\.finally\(\(\) => setLsLoading\(''\)\);\s*setSelSurvey\(''\);\s*setLsSurveys\(\[\]\);\s*setSelSubdiv\(''\);\s*setLsSubdivs\(\[\]\);\s*\}\s*\}, \[selVillage\]\);/,
    `React.useEffect(() => {
      if (selVillage) {
          setLsLoading('surveys');
          setSelSurvey('');
          setLsSurveys([]);
          setSelSubdiv('');
          setLsSubdivs([]);
          fetch(\`\${API_BASE}/api/tngis/survey?village=\${encodeURIComponent(selVillage)}&taluk=\${encodeURIComponent(selTaluk)}\`)
            .then(res => res.json())
            .then(res => setLsSurveys(res.data || []))
            .catch(err => console.error(err))
            .finally(() => setLsLoading(''));
      }
  }, [selVillage]);`
);

// Replace the selSurvey / mapActionTrigger effect
code = code.replace(
    /React\.useEffect\(\(\) => \{\s*if \(selSurvey\) \{\s*fetchAndHighlight\('parcel', \{ selDistrict, selTaluk, selVillage, selSurvey, selSubdiv \}\);\s*setLsLoading\('subdivs'\);\s*fetch\([\s\S]*?\.finally\(\(\) => setLsLoading\(''\)\);\s*setSelSubdiv\(''\);\s*setLsSubdivs\(\[\]\);\s*\}\s*\}, \[selSurvey, mapActionTrigger\]\);/,
    `// Fetch subdivs only when selSurvey changes
  React.useEffect(() => {
      if (selSurvey) {
          setLsLoading('subdivs');
          setSelSubdiv('');
          setLsSubdivs([]);
          fetch(\`\${API_BASE}/api/tngis/subdivisions?village=\${encodeURIComponent(selVillage)}&survey=\${encodeURIComponent(selSurvey)}&taluk=\${encodeURIComponent(selTaluk)}\`)
            .then(res => res.json())
            .then(res => setLsSubdivs(res.data || []))
            .catch(err => console.error(err))
            .finally(() => setLsLoading(''));
      }
  }, [selSurvey]);

  // Run highlight on mapActionTrigger
  React.useEffect(() => {
      if (mapActionTrigger > 0) {
          if (selSurvey) {
              fetchAndHighlight('parcel', { selDistrict, selTaluk, selVillage, selSurvey, selSubdiv });
          } else if (selVillage) {
              fetchAndHighlight('village', { selDistrict, selTaluk, selVillage, selSurvey, selSubdiv });
          } else if (selTaluk) {
              fetchAndHighlight('taluk', { selDistrict, selTaluk, selVillage, selSurvey, selSubdiv });
          } else if (selDistrict) {
              fetchAndHighlight('district', { selDistrict, selTaluk, selVillage, selSurvey, selSubdiv });
          }
      }
  }, [mapActionTrigger]);`
);

// Remove fetchAndHighlight from selDistrict and selTaluk
code = code.replace(
    /fetchAndHighlight\('district', \{ selDistrict, selTaluk, selVillage, selSurvey, selSubdiv \}\);\s*setLsLoading\('taluks'\);/,
    `setLsLoading('taluks');`
);

code = code.replace(
    /fetchAndHighlight\('taluk', \{ selDistrict, selTaluk, selVillage, selSurvey, selSubdiv \}\);\s*setLsLoading\('villages'\);/,
    `setLsLoading('villages');`
);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', code);
console.log('Regex patch applied!');
