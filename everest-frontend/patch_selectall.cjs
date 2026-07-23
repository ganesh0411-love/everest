const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\r\n/g, '\n');

// Dropdown "Select All" injection
const ddOld = `{filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isSelected = isMulti && Array.isArray(value) && value.includes(opt);
              return (
                <div 
                  key={idx} 
                  className={\`px-4 py-2 text-sm cursor-pointer hover:bg-blue-100 \${isSelected || value === opt ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-700'} flex items-center justify-between gap-2\`}
                  onClick={() => handleSelect(opt)}
                >
                  <span className="truncate">{opt}</span>
                  {isMulti && (
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      readOnly 
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  )}
                </div>
              );
            })
          ) : (`;

const ddNew = `{filteredOptions.length > 0 ? (
            <>
              {isMulti && (
                <div 
                  className="px-4 py-2 text-sm font-bold cursor-pointer bg-slate-100 text-slate-800 hover:bg-slate-200 border-b border-slate-200 flex items-center justify-between"
                  onClick={() => {
                     const valArr = Array.isArray(value) ? value : [];
                     const allSelected = filteredOptions.every(opt => valArr.includes(opt));
                     if (allSelected) {
                         const newVal = valArr.filter(v => !filteredOptions.includes(v));
                         onChange(newVal);
                     } else {
                         const newVal = [...new Set([...valArr, ...filteredOptions])];
                         onChange(newVal);
                     }
                  }}
                >
                  <span>{Array.isArray(value) && filteredOptions.length > 0 && filteredOptions.every(opt => value.includes(opt)) ? 'Deselect All' : 'Select All'}</span>
                </div>
              )}
              {filteredOptions.map((opt, idx) => {
                const isSelected = isMulti && Array.isArray(value) && value.includes(opt);
                return (
                  <div 
                    key={idx} 
                    className={\`px-4 py-2 text-sm cursor-pointer hover:bg-blue-100 \${isSelected || value === opt ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-700'} flex items-center justify-between gap-2\`}
                    onClick={() => handleSelect(opt)}
                  >
                    <span className="truncate">{opt}</span>
                    {isMulti && (
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        readOnly 
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    )}
                  </div>
                );
              })}
            </>
          ) : (`;

content = content.replace(ddOld, ddNew);

fs.writeFileSync(file, content);
console.log("Patched Dropdown with Select All");
