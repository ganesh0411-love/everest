const fs = require('fs');

let code = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// Replace the selVillage useEffect
const oldVillageEffect = `  React.useEffect(() => {
      if (selVillage) {
          fetchAndHighlight('village', { selDistrict, selTaluk, selVillage, selSurvey, selSubdiv });
          setLsLoading('surveys');
          fetch(\`\${API_BASE}/api/tngis/survey?village=\${encodeURIComponent(selVillage)}&taluk=\${encodeURIComponent(selTaluk)}\`)
            .then(res => res.json())
            .then(res => setLsSurveys(res.data || []))
            .catch(err => console.error(err))
            .finally(() => setLsLoading(''));
          setSelSurvey('');
          setLsSurveys([]);
          setSelSubdiv('');
          setLsSubdivs([]);
      }
  }, [selVillage]);`;

const newVillageEffect = `  React.useEffect(() => {
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
  }, [selVillage]);`;

code = code.replace(oldVillageEffect, newVillageEffect);

// Replace the selSurvey / mapActionTrigger effect
const oldSurveyEffect = `  React.useEffect(() => {
      if (selSurvey) {
          fetchAndHighlight('parcel', { selDistrict, selTaluk, selVillage, selSurvey, selSubdiv });
          setLsLoading('subdivs');
          fetch(\`\${API_BASE}/api/tngis/subdivisions?village=\${encodeURIComponent(selVillage)}&survey=\${encodeURIComponent(selSurvey)}&taluk=\${encodeURIComponent(selTaluk)}\`)
            .then(res => res.json())
            .then(res => setLsSubdivs(res.data || []))
            .catch(err => console.error(err))
            .finally(() => setLsLoading(''));
          setSelSubdiv('');
          setLsSubdivs([]);
      }
  }, [selSurvey, mapActionTrigger]);`;

const newSurveyEffect = `  // Fetch subdivs only when selSurvey changes
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
  }, [mapActionTrigger]);`;

code = code.replace(oldSurveyEffect, newSurveyEffect);

// Wait, I should also fix selTaluk and selDistrict effects to not call fetchAndHighlight directly, since mapActionTrigger handles it now!
const oldTalukEffect = `  React.useEffect(() => {
      if (selTaluk) {
          fetchAndHighlight('taluk', { selDistrict, selTaluk, selVillage, selSurvey, selSubdiv });
          setLsLoading('villages');`;

const newTalukEffect = `  React.useEffect(() => {
      if (selTaluk) {
          setLsLoading('villages');`;

code = code.replace(oldTalukEffect, newTalukEffect);

const oldDistrictEffect = `  React.useEffect(() => {
      if (selDistrict) {
          fetchAndHighlight('district', { selDistrict, selTaluk, selVillage, selSurvey, selSubdiv });
          setLsLoading('taluks');`;
          
const newDistrictEffect = `  React.useEffect(() => {
      if (selDistrict) {
          setLsLoading('taluks');`;
          
code = code.replace(oldDistrictEffect, newDistrictEffect);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', code);
console.log('Patched AdminDashboard.jsx cascaded effects successfully');
