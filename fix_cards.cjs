const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

c = c.replace(/className=\"group relative rounded-\[28px\] md:rounded-\[32px\] p-5 md:p-6 flex flex-col items-center cursor-pointer active:scale-95 transition-transform duration-200 shadow-\[(.*?)\] overflow-hidden aspect-square md:aspect-auto md:min-h-\[220px\]\"/g, 
'className=\"group relative rounded-[28px] md:rounded-[32px] p-3 pt-4 md:p-6 flex flex-col items-center cursor-pointer active:scale-95 transition-transform duration-200 shadow-[$1] overflow-hidden aspect-square md:aspect-auto md:min-h-[220px]\"');

c = c.replace(/className=\"w-14 h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4 mt-1 shrink-0 z-10 group-hover:scale-110 transition-transform duration-300\"/g, 
'className=\"w-10 h-10 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-2 md:mb-4 mt-0 md:mt-1 shrink-0 z-10 group-hover:scale-110 transition-transform duration-300\"');

c = c.replace(/className=\"w-8 h-8 md:w-10 md:h-10\"/g, 'className=\"w-6 h-6 md:w-10 md:h-10\"');

c = c.replace(/className=\"text-white font-bold text-\[15px\] md:text-\[18px\] text-center leading-tight mb-1\"/g, 
'className=\"text-white font-bold text-[12.5px] md:text-[18px] text-center leading-tight mb-0.5 md:mb-1 px-1 z-10\"');

c = c.replace(/text-\[11px\] md:text-\[13px\] text-center font-medium leading-snug px-1 opacity-90/g, 
'text-[9px] md:text-[13px] text-center font-medium leading-[1.1] px-1 opacity-90 z-10');

c = c.replace(/absolute bottom-4 right-4 w-7 h-7 md:w-9 md:h-9/g, 
'absolute bottom-2.5 right-2.5 md:bottom-4 md:right-4 w-5 h-5 md:w-9 md:h-9');

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
console.log('Cards updated.');
