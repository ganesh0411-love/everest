const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// There are multiple declarations of SearchableDropdown because of the bad string replacement.
// Let's strip ALL of them using a regex that captures the entire component.
// A SearchableDropdown starts with "const SearchableDropdown = " and ends with a "};" right before the next "const AdminDashboard" or whatever comes next.
// Actually, let's just find "const SearchableDropdown =" and remove everything up to the next top-level component, or we can just replace everything between the first "const SearchableDropdown" and the line before "const AdminDashboard =".

const searchStart = "const SearchableDropdown =";
const searchEnd = "const AdminDashboard ="; // assuming AdminDashboard follows it.

const firstIdx = content.indexOf(searchStart);
const lastIdx = content.indexOf(searchEnd, firstIdx);

if (firstIdx !== -1 && lastIdx !== -1) {
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
};

`;
    
    // Replace EVERYTHING between the very first "const SearchableDropdown =" and "const AdminDashboard ="
    content = content.substring(0, firstIdx) + newDropdown + content.substring(lastIdx);
    fs.writeFileSync(file, content);
    console.log("Successfully wiped all duplicates and inserted a single SearchableDropdown.");
} else {
    console.log("Could not find the bounds for SearchableDropdown and AdminDashboard.");
}
