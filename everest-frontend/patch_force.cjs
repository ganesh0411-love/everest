const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace SearchableDropdown
const startStr = "const SearchableDropdown = ({ value, onChange, options, placeholder, loadingText, isLoading }) => {";
const endStr = "};";
const startIndex = content.indexOf(startStr);
const nextConstIndex = content.indexOf("const", startIndex + 50); // find the end of the dropdown component
const endIndex = content.lastIndexOf("};", nextConstIndex) + 2;

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

  const filteredOptions = (options || []).filter(opt => opt && String(opt).toLowerCase().includes(String(searchTerm || '').toLowerCase()));

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
                  className={\`px-4 py-2 text-sm cursor-pointer hover:bg-blue-100 \${isSelected || value === opt ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-700'} flex items-center gap-2\`}
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

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newDropdown + content.substring(endIndex);
  console.log("Successfully replaced SearchableDropdown.");
} else {
  console.log("Could not find SearchableDropdown!");
}

// Fix Perimeter 
const perimeterStart = "let totalMeters = cadLines.reduce((acc, l) => acc + (l.fixedLength";
const perimeterEnd = "return totalMeters.toFixed(2);\n                          }";
const pStartIdx = content.indexOf(perimeterStart);
const pEndIdx = content.indexOf(perimeterEnd, pStartIdx) + perimeterEnd.length;

const newPerimeterLogic = `let totalMeters = (activeArea && activeArea.perimeterMeters)
                              ? activeArea.perimeterMeters
                              : cadLines.reduce((acc, l) => acc + (l.fixedLength ? parseFloat(l.fixedLength) : (cadScale ? Math.hypot(l.p1.x - l.p2.x, l.p1.y - l.p2.y) * cadScale : 0)), 0);
                          if (selectedPerimeterUnit === 'Ft') {
                              return (totalMeters * 3.28084).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                          } else {
                              return totalMeters.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                          }`;

if (pStartIdx !== -1 && pEndIdx !== -1 && pEndIdx > pStartIdx) {
   content = content.substring(0, pStartIdx) + newPerimeterLogic + content.substring(pEndIdx);
   console.log("Successfully replaced Perimeter Logic.");
} else {
   console.log("Could not find Perimeter Logic!");
}

fs.writeFileSync(file, content);
