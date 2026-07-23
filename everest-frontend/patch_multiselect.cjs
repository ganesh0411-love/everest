const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const replaceAll = (str, oldStr, newStr) => str.split(oldStr).join(newStr);

// --- 1. SEARCHABLE DROPDOWN REPLACEMENT ---
const oldDropdown = `const SearchableDropdown = ({ value, onChange, options, placeholder, loadingText, isLoading }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const wrapperRef = React.useRef(null);

  React.useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm(value || '');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filteredOptions = options.filter(opt => opt && String(opt).toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative w-full">
        <input
          type="text"
          className="w-full bg-[#fef08a] text-slate-800 font-medium py-3 px-4 pr-10 rounded-md border-0 outline-none shadow-sm cursor-text text-sm"
          placeholder={isLoading ? loadingText : placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (e.target.value === '') onChange('');
          }}
          onFocus={() => setIsOpen(true)}
        />
        <div 
          className="absolute right-0 top-0 h-full px-3 flex items-center cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-[600] w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <div 
                key={idx} 
                className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-slate-700 text-sm border-b border-slate-50 last:border-b-0"
                onClick={() => {
                  onChange(opt);
                  setSearchTerm(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-slate-500 text-sm italic">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};`;

const newDropdown = `const SearchableDropdown = ({ value, onChange, options, placeholder, loadingText, isLoading, isMulti }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const wrapperRef = React.useRef(null);

  React.useEffect(() => {
    if (!isMulti) {
      setSearchTerm(value || '');
    }
  }, [value, isMulti]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        if (!isMulti) setSearchTerm(value || '');
        else setSearchTerm('');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, isMulti]);

  const filteredOptions = options.filter(opt => opt && String(opt).toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelect = (opt) => {
    if (isMulti) {
      const valArr = Array.isArray(value) ? value : [];
      let newVal = [];
      if (valArr.includes(opt)) {
        newVal = valArr.filter(v => v !== opt);
      } else {
        newVal = [...valArr, opt];
      }
      onChange(newVal);
    } else {
      onChange(opt);
      setSearchTerm(opt);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative w-full">
        <input
          type="text"
          className="w-full bg-[#fef08a] text-slate-800 font-medium py-3 px-4 pr-10 rounded-md border-0 outline-none shadow-sm cursor-text text-sm"
          placeholder={isLoading ? loadingText : (isMulti && Array.isArray(value) && value.length > 0 ? value.join(', ') : placeholder)}
          value={isMulti ? searchTerm : searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (!isMulti && e.target.value === '') onChange('');
          }}
          onFocus={() => setIsOpen(true)}
        />
        <div 
          className="absolute right-0 top-0 h-full px-3 flex items-center cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-[600] w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isSelected = isMulti && Array.isArray(value) && value.includes(opt);
              return (
                <div 
                  key={idx} 
                  className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-slate-700 text-sm border-b border-slate-50 last:border-b-0 flex items-center gap-2"
                  onClick={() => handleSelect(opt)}
                >
                  {isMulti && (
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      readOnly 
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  )}
                  <span className="truncate">{opt}</span>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-3 text-slate-500 text-sm italic">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};`;
content = replaceAll(content, oldDropdown, newDropdown);

// --- 2. UPDATE STATE INITIALIZERS AND SETTERS ---
content = replaceAll(content, "const [selSurvey, setSelSurvey] = React.useState('');", "const [selSurvey, setSelSurvey] = React.useState([]);");
content = replaceAll(content, "const [selSubdiv, setSelSubdiv] = React.useState('');", "const [selSubdiv, setSelSubdiv] = React.useState([]);");

// Replaces all occurrences of setSelSurvey('') and setSelSubdiv('')
content = replaceAll(content, "setSelSurvey('')", "setSelSurvey([])");
content = replaceAll(content, "setSelSubdiv('')", "setSelSubdiv([])");

// Fix dropdown props for Survey & Subdiv
const surveyDropdownSearch = `<SearchableDropdown
              value={selSurvey}
              onChange={val => { setSelSurvey(val); if(val || val==='') setMapActionTrigger(Date.now()); }}`;
const surveyDropdownReplace = `<SearchableDropdown
              isMulti={true}
              value={selSurvey}
              onChange={val => { setSelSurvey(val); setMapActionTrigger(Date.now()); }}`;
content = replaceAll(content, surveyDropdownSearch, surveyDropdownReplace);

const subdivDropdownSearch = `<SearchableDropdown
              value={selSubdiv}
              onChange={val => { setSelSubdiv(val); if(val || val==='') setMapActionTrigger(Date.now()); }}`;
const subdivDropdownReplace = `<SearchableDropdown
              isMulti={true}
              value={selSubdiv}
              onChange={val => { setSelSubdiv(val); setMapActionTrigger(Date.now()); }}`;
content = replaceAll(content, subdivDropdownSearch, subdivDropdownReplace);

// Fix village dropdown onChange since it resets survey/subdiv
const villageOnChangeOld = `onChange={val => { setSelVillage(val); setSelSurvey([]); setSelSubdiv([]); if(val || val==='') setMapActionTrigger(Date.now()); }}`;
const villageOnChangeNew = `onChange={val => { setSelVillage(val); setSelSurvey([]); setSelSubdiv([]); setMapActionTrigger(Date.now()); }}`;
content = replaceAll(content, villageOnChangeOld, villageOnChangeNew);

// --- 3. FIX SUBDIVISIONS FETCH LOGIC ---
const oldSubdivFetch = `// Fetch subdivs only when selSurvey changes
  React.useEffect(() => {
      if (selSurvey) {
          setLsLoading('subdivs');
          setSelSubdiv([]);
          fetch(\`\${API_BASE}/api/tngis/subdivisions?village=\${encodeURIComponent(selVillage)}&survey=\${encodeURIComponent(selSurvey)}&taluk=\${encodeURIComponent(selTaluk)}\`)
            .then(res => res.json())
            .then(res => setLsSubdivs(res.data || []))
            .catch(err => {
                console.error("Error fetching subdivs:", err);
                setLsSubdivs([]);
            })
            .finally(() => setLsLoading(null));
      } else {
          setLsSubdivs([]);
      }
  }, [selSurvey]);`;

const newSubdivFetch = `// Fetch subdivs only when selSurvey changes
  React.useEffect(() => {
      if (selSurvey && selSurvey.length > 0) {
          setLsLoading('subdivs');
          setSelSubdiv([]);
          Promise.all(selSurvey.map(survey => 
            fetch(\`\${API_BASE}/api/tngis/subdivisions?village=\${encodeURIComponent(selVillage)}&survey=\${encodeURIComponent(survey)}&taluk=\${encodeURIComponent(selTaluk)}\`)
              .then(res => res.json())
              .then(res => (res.data || []).map(subdiv => selSurvey.length > 1 ? \`\${subdiv} (\${survey})\` : subdiv))
              .catch(err => [])
          ))
          .then(results => {
              const combined = results.flat();
              setLsSubdivs([...new Set(combined)]);
          })
          .catch(err => {
              console.error("Error fetching subdivs:", err);
              setLsSubdivs([]);
          })
          .finally(() => setLsLoading(null));
      } else {
          setLsSubdivs([]);
      }
  }, [selSurvey]);`;
content = replaceAll(content, oldSubdivFetch, newSubdivFetch);

// --- 4. FIX MAP ACTION TRIGGER TO HANDLE ARRAYS ---
const oldMapAction = `if (selSurvey) {
              fetchAndHighlight('parcel', { selDistrict, selTaluk, selVillage, selSurvey, selSubdiv });
          } else if (selVillage) {
              fetchAndHighlight('village', { selDistrict, selTaluk, selVillage, selSurvey, selSubdiv });
          }`;
const newMapAction = `if (selSurvey && selSurvey.length > 0) {
              fetchAndHighlight('parcel', { selDistrict, selTaluk, selVillage, selSurvey, selSubdiv });
          } else if (selVillage) {
              fetchAndHighlight('village', { selDistrict, selTaluk, selVillage, selSurvey: [], selSubdiv: [] });
          }`;
content = replaceAll(content, oldMapAction, newMapAction);

// --- 5. REWRITE fetchAndHighlight CORE FOR ARRAYS ---
const oldFetchAndHighlightCore = `          let url = \`\${API_BASE}/api/tngis/boundary?level=\${level}\`;
          if (state.selDistrict) url += \`&district=\${encodeURIComponent(state.selDistrict)}\`;
          if (state.selTaluk) url += \`&taluk=\${encodeURIComponent(state.selTaluk)}\`;
          if (state.selVillage) url += \`&village=\${encodeURIComponent(state.selVillage)}\`;
          if (state.selSurvey) url += \`&survey=\${encodeURIComponent(state.selSurvey)}\`;
          if (state.selSubdiv) url += \`&subdiv=\${encodeURIComponent(state.selSubdiv)}\`;
          
          const res = await fetch(url);
          const data = await res.json();
          if (data.success && data.feature) {
              const geom = data.feature.geometry;`;

const newFetchAndHighlightCore = `          let fetches = [];
          if (level === 'parcel') {
              if (state.selSubdiv && state.selSubdiv.length > 0) {
                  state.selSubdiv.forEach(subItem => {
                      let sub = subItem;
                      let sur = (state.selSurvey && state.selSurvey.length === 1) ? state.selSurvey[0] : '';
                      const match = subItem.match(/(.+?)\\s+\\((.+?)\\)$/);
                      if (match) {
                          sub = match[1];
                          sur = match[2];
                      }
                      let url = \`\${API_BASE}/api/tngis/boundary?level=parcel&district=\${encodeURIComponent(state.selDistrict)}&taluk=\${encodeURIComponent(state.selTaluk)}&village=\${encodeURIComponent(state.selVillage)}&survey=\${encodeURIComponent(sur)}&subdiv=\${encodeURIComponent(sub)}\`;
                      fetches.push(url);
                  });
              } else if (state.selSurvey && state.selSurvey.length > 0) {
                  state.selSurvey.forEach(sur => {
                      let url = \`\${API_BASE}/api/tngis/boundary?level=parcel&district=\${encodeURIComponent(state.selDistrict)}&taluk=\${encodeURIComponent(state.selTaluk)}&village=\${encodeURIComponent(state.selVillage)}&survey=\${encodeURIComponent(sur)}\`;
                      fetches.push(url);
                  });
              }
          } else {
              let url = \`\${API_BASE}/api/tngis/boundary?level=\${level}\`;
              if (state.selDistrict) url += \`&district=\${encodeURIComponent(state.selDistrict)}\`;
              if (state.selTaluk) url += \`&taluk=\${encodeURIComponent(state.selTaluk)}\`;
              if (state.selVillage) url += \`&village=\${encodeURIComponent(state.selVillage)}\`;
              fetches.push(url);
          }
          
          const responses = await Promise.all(fetches.map(url => fetch(url).then(r => r.json())));
          
          let combinedRings = [];
          let combinedAreaSqM = 0;
          let combinedPerimeterMeters = 0;
          let validDataFound = false;
          let firstFeatureGeomType = null;
          let allBbox = null;

          const toWGS84Coords = (coords) => {
              if (!Array.isArray(coords)) return coords;
              if (typeof coords[0] === 'number') {
                  const lon = coords[0] * 180 / 20037508.34;
                  const lat = Math.atan(Math.exp(coords[1] * Math.PI / 20037508.34)) * 360 / Math.PI - 90;
                  return [lon, lat];
              }
              return coords.map(toWGS84Coords);
          };

          for (const data of responses) {
              if (data.success && data.feature) {
                  validDataFound = true;
                  const geom = data.feature.geometry;
                  if (!firstFeatureGeomType) firstFeatureGeomType = geom ? geom.type : null;

                  if (geom) {
                      try {
                          const wgs84Feature = {
                              type: 'Feature',
                              geometry: {
                                  type: geom.type,
                                  coordinates: toWGS84Coords(geom.coordinates)
                              },
                              properties: {}
                          };
                          
                          combinedAreaSqM += turfArea(wgs84Feature);
                          combinedPerimeterMeters += turfLength(wgs84Feature, { units: 'meters' });
                      } catch (e) {}

                      if (geom.type === 'Polygon') {
                          combinedRings.push(geom.coordinates[0]);
                      } else if (geom.type === 'MultiPolygon') {
                          geom.coordinates.forEach(poly => combinedRings.push(poly[0]));
                      }
                  } else if (data.feature.bbox) {
                      const b = data.feature.bbox;
                      combinedRings.push([[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]);
                  }
              }
          }

          if (validDataFound) {
              if (combinedAreaSqM > 0) {
                  const totalHectares = combinedAreaSqM / 10000;
                  setMapSelectionArea({
                      sqMeters: combinedAreaSqM,
                      sqFt: combinedAreaSqM * 10.7639,
                      hectare: totalHectares,
                      are: totalHectares * 100,
                      acre: combinedAreaSqM / 4046.86,
                      cent: combinedAreaSqM / 40.4686,
                      perimeterMeters: combinedPerimeterMeters
                  });
              }

              // Overwrite data.feature structure for the rest of the existing code
              const data = { feature: { geometry: null } };
              const geom = combinedRings.length > 0 ? { type: 'MultiPolygon', coordinates: combinedRings.map(r => [r]) } : null;
              `;
content = replaceAll(content, oldFetchAndHighlightCore, newFetchAndHighlightCore);

// Strip out the old turfArea/wgs84 logic that was inside fetchAndHighlight!
const oldTurfAreaLogic = `              if (geom) {
                  try {
                      const toWGS84Coords = (coords) => {
                          if (!Array.isArray(coords)) return coords;
                          if (typeof coords[0] === 'number') {
                              const lon = coords[0] * 180 / 20037508.34;
                              const lat = Math.atan(Math.exp(coords[1] * Math.PI / 20037508.34)) * 360 / Math.PI - 90;
                              return [lon, lat];
                          }
                          return coords.map(toWGS84Coords);
                      };
                      
                      const wgs84Feature = {
                          type: 'Feature',
                          geometry: {
                              type: geom.type,
                              coordinates: toWGS84Coords(geom.coordinates)
                          },
                          properties: {}
                      };
                      
                      const computedSqM = turfArea(wgs84Feature);
                      const computedPerimeter = turfLength(wgs84Feature, { units: 'meters' });
                      const totalHectares = computedSqM / 10000;
                      setMapSelectionArea({
                          sqMeters: computedSqM,
                          sqFt: computedSqM * 10.7639,
                          hectare: totalHectares,
                          are: totalHectares * 100,
                          acre: computedSqM / 4046.86,
                          cent: computedSqM / 40.4686,
                          perimeterMeters: computedPerimeter
                      });
                  } catch (e) {
                      console.error("Area calculation error:", e);
                      setMapSelectionArea(null);
                  }
              }

              let coordinates = [];
              let allRings = [];
              if (geom && geom.type === 'Polygon') allRings.push(geom.coordinates[0]);
              else if (geom && geom.type === 'MultiPolygon') {
                  geom.coordinates.forEach(poly => allRings.push(poly[0]));
              } else if (!geom && data.feature.bbox) {
                  const b = data.feature.bbox;
                  allRings.push([[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]);
              }
              // Flatten for bounds calculation
              coordinates = allRings.flat(); `;

const newCoordinatesLogic = `              let coordinates = [];
              let allRings = combinedRings;
              coordinates = allRings.flat(); `;
content = replaceAll(content, oldTurfAreaLogic, newCoordinatesLogic);

// --- 5B. EXECUTE FLY TO FIX ---
const oldExecuteFlyToCore = `          const res = await fetch(\`\${API_BASE}/api/tngis/feature?village=\${encodeURIComponent(selVillage)}&survey=\${encodeURIComponent(selSurvey)}&taluk=\${encodeURIComponent(selTaluk)}\` + (selSubdiv ? \`&subdiv=\${encodeURIComponent(selSubdiv)}\` : ''));
          const data = await res.json();
          if (data.success && data.feature) {
              const geom = data.feature.geometry;`;

const newExecuteFlyToCore = `          let fetches = [];
          if (selSubdiv && selSubdiv.length > 0) {
              selSubdiv.forEach(subItem => {
                  let sub = subItem;
                  let sur = (selSurvey && selSurvey.length === 1) ? selSurvey[0] : '';
                  const match = subItem.match(/(.+?)\\s+\\((.+?)\\)$/);
                  if (match) {
                      sub = match[1];
                      sur = match[2];
                  }
                  fetches.push(\`\${API_BASE}/api/tngis/feature?village=\${encodeURIComponent(selVillage)}&survey=\${encodeURIComponent(sur)}&taluk=\${encodeURIComponent(selTaluk)}&subdiv=\${encodeURIComponent(sub)}\`);
              });
          } else if (selSurvey && selSurvey.length > 0) {
              selSurvey.forEach(sur => {
                  fetches.push(\`\${API_BASE}/api/tngis/feature?village=\${encodeURIComponent(selVillage)}&survey=\${encodeURIComponent(sur)}&taluk=\${encodeURIComponent(selTaluk)}\`);
              });
          } else {
              fetches.push(\`\${API_BASE}/api/tngis/feature?village=\${encodeURIComponent(selVillage)}&taluk=\${encodeURIComponent(selTaluk)}\`);
          }

          const responses = await Promise.all(fetches.map(url => fetch(url).then(r => r.json())));
          
          let combinedRings = [];
          let combinedAreaSqM = 0;
          let combinedPerimeterMeters = 0;
          let validDataFound = false;

          const toWGS84Coords = (coords) => {
              if (!Array.isArray(coords)) return coords;
              if (typeof coords[0] === 'number') {
                  const lon = coords[0] * 180 / 20037508.34;
                  const lat = Math.atan(Math.exp(coords[1] * Math.PI / 20037508.34)) * 360 / Math.PI - 90;
                  return [lon, lat];
              }
              return coords.map(toWGS84Coords);
          };

          for (const data of responses) {
              if (data.success && data.feature) {
                  validDataFound = true;
                  const geom = data.feature.geometry;
                  if (geom) {
                      try {
                          const wgs84Feature = {
                              type: 'Feature',
                              geometry: { type: geom.type, coordinates: toWGS84Coords(geom.coordinates) },
                              properties: {}
                          };
                          combinedAreaSqM += turfArea(wgs84Feature);
                          combinedPerimeterMeters += turfLength(wgs84Feature, { units: 'meters' });
                      } catch (e) {}

                      if (geom.type === 'Polygon') {
                          combinedRings.push(geom.coordinates[0]);
                      } else if (geom.type === 'MultiPolygon') {
                          geom.coordinates.forEach(poly => combinedRings.push(poly[0]));
                      }
                  } else if (data.feature.bbox) {
                      const b = data.feature.bbox;
                      combinedRings.push([[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]);
                  }
              }
          }

          if (validDataFound) {
              if (combinedAreaSqM > 0) {
                  const totalHectares = combinedAreaSqM / 10000;
                  setMapSelectionArea({
                      sqMeters: combinedAreaSqM,
                      sqFt: combinedAreaSqM * 10.7639,
                      hectare: totalHectares,
                      are: totalHectares * 100,
                      acre: combinedAreaSqM / 4046.86,
                      cent: combinedAreaSqM / 40.4686,
                      perimeterMeters: combinedPerimeterMeters
                  });
              }
              const data = { feature: { geometry: null } };
              const geom = combinedRings.length > 0 ? { type: 'MultiPolygon', coordinates: combinedRings.map(r => [r]) } : null;
              `;
content = replaceAll(content, oldExecuteFlyToCore, newExecuteFlyToCore);
content = replaceAll(content, oldTurfAreaLogic, newCoordinatesLogic);

// --- 6. FIX WMS LAYER PROPS WHICH EXPECT STRINGS ---
const oldWMS = `activeVillage={selVillage} activeSurvey={selSurvey} activeSubdiv={selSubdiv}`;
const newWMS = `activeVillage={selVillage} activeSurvey={Array.isArray(selSurvey) ? selSurvey.join(',') : selSurvey} activeSubdiv={Array.isArray(selSubdiv) ? selSubdiv.join(',') : selSubdiv}`;
content = replaceAll(content, oldWMS, newWMS);

const oldIsHighlight = `isHighlightSubdiv={lsHighlightType === 'survey' || lsHighlightType === 'subdiv' || !!selSurvey}`;
const newIsHighlight = `isHighlightSubdiv={lsHighlightType === 'survey' || lsHighlightType === 'subdiv' || (selSurvey && selSurvey.length > 0)}`;
content = replaceAll(content, oldIsHighlight, newIsHighlight);

// 7. Searchable Dropdown submit button validation
const oldSubmitDisabled = `disabled={!selVillage || !selSurvey || lsLoading === 'flyTo'}`;
const newSubmitDisabled = `disabled={!selVillage || !selSurvey || selSurvey.length === 0 || lsLoading === 'flyTo'}`;
content = replaceAll(content, oldSubmitDisabled, newSubmitDisabled);

fs.writeFileSync(file, content);
console.log('Multi-select patch applied safely.');
