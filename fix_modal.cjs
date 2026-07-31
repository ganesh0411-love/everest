const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

c = c.replace('const [isLandSearchModalOpen, setIsLandSearchModalOpen] = React.useState(false);',
`const [landSearchType, setLandSearchType] = React.useState('rural');
  const [isLandSearchModalOpen, setIsLandSearchModalOpen] = React.useState(false);`);

const oldModalBlock = `<h3 className="text-white font-bold text-center mb-1 text-lg">Land Search</h3>
            
            {/* Dropdowns */}
            <select 
              value={selDistrict} onChange={e => { const val = e.target.value; setSelDistrict(val); setSelTaluk(''); setSelVillage(''); setSelSurvey([]); setSelSubdiv([]); }}
              className="w-full bg-[#fef08a] text-slate-800 font-medium py-3 px-4 rounded-md border-0 outline-none shadow-sm cursor-pointer text-sm"
            >
              <option value="">{lsLoading === 'districts' ? 'Loading Districts...' : 'Select District'}</option>
              {lsDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            
            <select 
              value={selTaluk} onChange={e => { const val = e.target.value; setSelTaluk(val); setSelVillage(''); setSelSurvey([]); setSelSubdiv([]); }}
              
              className="w-full bg-[#fef08a] text-slate-800 font-medium py-3 px-4 rounded-md border-0 outline-none shadow-sm cursor-pointer text-sm"
            >
              <option value="">{lsLoading === 'taluks' ? 'Loading Taluks...' : 'Select Taluk'}</option>
              {lsTaluks.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            
            <SearchableDropdown
              value={selVillage}
              onChange={val => { setSelVillage(val); setSelSurvey([]); setSelSubdiv([]); }}
              options={lsVillages}
              placeholder="Select Village"
              loadingText="Loading Villages..."
              isLoading={lsLoading === 'villages'}
            />
            
            <SearchableDropdown
              value={selSurvey}
              onChange={val => { setSelSurvey(val); setSelSubdiv([]); }}
              options={lsSurveys}
              placeholder="Select Survey Number"
              loadingText="Loading Survey Numbers..."
              isLoading={lsLoading === 'surveys'}
              isMulti={true}
              flyUp={true}
            />
            
            <SearchableDropdown
              value={selSubdiv}
              onChange={val => setSelSubdiv(val)}
              options={lsSubdivs}
              placeholder="Select Subdivision Number (Optional)"
              loadingText="Loading Subdivisions..."
              isLoading={lsLoading === 'subdivs'}
              isMulti={true}
              flyUp={true}
            />`;

const newModalBlock = `<div className="flex bg-[#0f2150] rounded-full p-1 mb-2 mt-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); setLandSearchType('rural'); }}
                    className={\`flex-1 py-1.5 text-sm font-bold rounded-full transition-colors \${landSearchType === 'rural' ? 'bg-[#fef08a] text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'}\`}
                >
                    Rural
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); setLandSearchType('urban'); }}
                    className={\`flex-1 py-1.5 text-sm font-bold rounded-full transition-colors \${landSearchType === 'urban' ? 'bg-[#fef08a] text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'}\`}
                >
                    Urban
                </button>
            </div>
            
            {/* Common Dropdowns */}
            <select 
              value={selDistrict} onChange={e => { const val = e.target.value; setSelDistrict(val); setSelTaluk(''); setSelVillage(''); setSelSurvey([]); setSelSubdiv([]); }}
              className="w-full bg-[#fef08a] text-slate-800 font-medium py-3 px-4 rounded-md border-0 outline-none shadow-sm cursor-pointer text-sm"
            >
              <option value="">{lsLoading === 'districts' ? 'Loading Districts...' : 'Select District'}</option>
              {lsDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            
            <select 
              value={selTaluk} onChange={e => { const val = e.target.value; setSelTaluk(val); setSelVillage(''); setSelSurvey([]); setSelSubdiv([]); }}
              
              className="w-full bg-[#fef08a] text-slate-800 font-medium py-3 px-4 rounded-md border-0 outline-none shadow-sm cursor-pointer text-sm"
            >
              <option value="">{lsLoading === 'taluks' ? 'Loading Taluks...' : 'Select Taluk'}</option>
              {lsTaluks.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {landSearchType === 'rural' ? (
                <>
                    <SearchableDropdown
                      value={selVillage}
                      onChange={val => { setSelVillage(val); setSelSurvey([]); setSelSubdiv([]); }}
                      options={lsVillages}
                      placeholder="Select Village"
                      loadingText="Loading Villages..."
                      isLoading={lsLoading === 'villages'}
                    />
                    
                    <SearchableDropdown
                      value={selSurvey}
                      onChange={val => { setSelSurvey(val); setSelSubdiv([]); }}
                      options={lsSurveys}
                      placeholder="Select Survey Number"
                      loadingText="Loading Survey Numbers..."
                      isLoading={lsLoading === 'surveys'}
                      isMulti={true}
                      flyUp={true}
                    />
                    
                    <SearchableDropdown
                      value={selSubdiv}
                      onChange={val => setSelSubdiv(val)}
                      options={lsSubdivs}
                      placeholder="Select Subdivision Number (Optional)"
                      loadingText="Loading Subdivisions..."
                      isLoading={lsLoading === 'subdivs'}
                      isMulti={true}
                      flyUp={true}
                    />
                </>
            ) : (
                <>
                    <select disabled className="w-full bg-[#fef08a]/40 text-slate-800/50 font-medium py-3 px-4 rounded-md border-0 outline-none shadow-sm cursor-not-allowed text-sm">
                      <option>Select Town / Municipality</option>
                    </select>
                    <select disabled className="w-full bg-[#fef08a]/40 text-slate-800/50 font-medium py-3 px-4 rounded-md border-0 outline-none shadow-sm cursor-not-allowed text-sm">
                      <option>Select Ward / Block</option>
                    </select>
                    <select disabled className="w-full bg-[#fef08a]/40 text-slate-800/50 font-medium py-3 px-4 rounded-md border-0 outline-none shadow-sm cursor-not-allowed text-sm">
                      <option>Select Block Number</option>
                    </select>
                    <select disabled className="w-full bg-[#fef08a]/40 text-slate-800/50 font-medium py-3 px-4 rounded-md border-0 outline-none shadow-sm cursor-not-allowed text-sm">
                      <option>Select Town Survey Number</option>
                    </select>
                    <select disabled className="w-full bg-[#fef08a]/40 text-slate-800/50 font-medium py-3 px-4 rounded-md border-0 outline-none shadow-sm cursor-not-allowed text-sm">
                      <option>Select Subdivision Number</option>
                    </select>
                </>
            )}`;

c = c.replace(oldModalBlock, newModalBlock);
fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
console.log("Success");
