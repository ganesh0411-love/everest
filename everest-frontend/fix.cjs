const fs = require('fs');
let content = fs.readFileSync('C:/Users/DELL/Desktop/Everest/everest-frontend/src/App.jsx', 'utf8');

const regex = /const \[isAddCustomerOpen[\s\S]*?handleClickOutside\);\r?\n\s*\}, \[\]\);/;

const replacement = `const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [activeHomeMenuId, setActiveHomeMenuId] = useState(null);

  // Filter & Sort State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSort, setActiveSort] = useState('Recent');
  
  // Temp state for the modal before applying
  const [tempCategory, setTempCategory] = useState('All');
  const [tempSort, setTempSort] = useState('Recent');

  // Hardware Back Button & Double-Tap Exit
  useEffect(() => {
    let backTimeout;
    let backListenerHandle = null;

    const setupListener = async () => {
      backListenerHandle = await CapacitorApp.addListener('backButton', () => {
        // 1. Close open modal states first
        if (fullscreenImage) { setFullscreenImage(null); return; }
        if (isAddCustomerOpen) { setIsAddCustomerOpen(false); return; }
        if (isFilterOpen) { setIsFilterOpen(false); return; }
        if (activeHomeMenuId) { setActiveHomeMenuId(null); return; }

        // 2. Handle View History Stack
        setViewHistory(prev => {
          if (prev.length > 1) {
            const newHistory = [...prev];
            newHistory.pop(); // Remove current view
            const prevView = newHistory[newHistory.length - 1];
            setCurrentView(prevView);
            return newHistory;
          } else {
            // 3. Double-Tap Exit Guard (only if at root/Home page)
            if (backPressCount === 0) {
              setBackPressCount(1);
              const toast = document.createElement('div');
              toast.innerText = 'Press again to exit';
              toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-[9999] animate-in fade-in';
              document.body.appendChild(toast);
              
              backTimeout = setTimeout(() => {
                setBackPressCount(0);
                if (document.body.contains(toast)) document.body.removeChild(toast);
              }, 2000);
              return prev;
            } else {
              CapacitorApp.exitApp();
              return prev;
            }
          }
        });
      });
    };

    setupListener();

    return () => {
      if (backListenerHandle) {
        backListenerHandle.remove();
      }
      if (backTimeout) clearTimeout(backTimeout);
    };
  }, [fullscreenImage, isAddCustomerOpen, isFilterOpen, activeHomeMenuId, backPressCount]);

  // Real-Time UI Trigger (Forces re-render every minute for accurate elapsed time)
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveHomeMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);`;

if (regex.test(content)) {
  const newContent = content.replace(regex, replacement);
  fs.writeFileSync('C:/Users/DELL/Desktop/Everest/everest-frontend/src/App.jsx', newContent);
  console.log('Fixed exactly!');
} else {
  console.log('Regex did not match.');
}
