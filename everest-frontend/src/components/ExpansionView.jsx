import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Wallet, 
  Smartphone, 
  Coins, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  Receipt, 
  Home, 
  User, 
  Clock, 
  ArrowUpDown, 
  Filter,
  Banknote,
  Camera,
  Image as ImageIcon,
  Eye,
  X,
  CheckCircle2
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';

const formatCurrency = (amt) => {
  return '₹ ' + Number(amt || 0).toLocaleString('en-IN');
};

const formatDateToDisplay = (dateStr) => {
  if (!dateStr) return '';
  const clean = String(dateStr).trim();
  // YYYY-MM-DD
  const ymd = clean.match(/^(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})/);
  if (ymd) {
    return `${String(ymd[3]).padStart(2, '0')}-${String(ymd[2]).padStart(2, '0')}-${ymd[1]}`;
  }
  return clean;
};

const formatDateToYmd = (dateStr) => {
  if (!dateStr) return '';
  const clean = String(dateStr).trim();
  // DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})/);
  if (dmy) {
    let yr = dmy[3];
    if (yr.length === 2) yr = '20' + yr;
    return `${yr}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
  }
  // YYYY-MM-DD
  const ymd = clean.match(/^(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}-${String(ymd[3]).padStart(2, '0')}`;
  }
  return clean;
};

// Formats timestamp or ISO string to HH:MM AM/PM
const formatTime = (isoString) => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '10:30 AM';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return '10:30 AM';
  }
};

// Resolves item date, day name, and timestamp
const getItemDayAndDate = (item) => {
  const displayDate = formatDateToDisplay(item?.date) || '';
  const ymd = formatDateToYmd(item?.date);
  let dayName = '';
  if (ymd) {
    const [yr, mo, dy] = ymd.split('-').map(Number);
    const dObj = new Date(yr, mo - 1, dy);
    if (!isNaN(dObj.getTime())) {
      dayName = dObj.toLocaleDateString('en-US', { weekday: 'long' });
    }
  }
  const timeStr = item?.time || (item?.createdAt ? formatTime(item.createdAt) : '10:30 AM');
  return {
    displayDate,
    dayName,
    timeStr,
    subLabel: dayName && timeStr ? `${dayName} • ${timeStr}` : (dayName || timeStr || '')
  };
};

// Robust day comparison
const isSameDay = (dateA, dateB) => {
  if (!dateA || !dateB) return false;
  return formatDateToYmd(dateA) === formatDateToYmd(dateB);
};

// Date Range Check (Inclusive)
const isDateInRange = (dateStr, fromYmd, toYmd) => {
  if (!dateStr) return false;
  const itemYmd = formatDateToYmd(dateStr);
  if (!itemYmd) return false;
  const start = fromYmd <= toYmd ? fromYmd : toYmd;
  const end = fromYmd <= toYmd ? toYmd : fromYmd;
  return itemYmd >= start && itemYmd <= end;
};

// Date helper generators
const getTodayYmd = () => {
  const d = new Date();
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
};

const getYesterdayYmd = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
};

const getDaysAgoYmd = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
};

// Standard Operational Categories
const CATEGORIES = [
  'All Categories',
  'Fuel/Travel',
  'Office Rent',
  'Tea & Snacks',
  'Stationery',
  'Printing',
  'Maintenance',
  'Electricity / Utilities',
  'Staff Salary / Advance',
  'Telephone / Internet',
  'Others'
];

// Seed expenses supporting both current runtime dates & reference screenshot dates
const todayDisplay = formatDateToDisplay(getTodayYmd());
const yesterdayDisplay = formatDateToDisplay(getYesterdayYmd());
const d3Display = formatDateToDisplay(getDaysAgoYmd(3));
const d5Display = formatDateToDisplay(getDaysAgoYmd(5));
const d8Display = formatDateToDisplay(getDaysAgoYmd(8));
const d12Display = formatDateToDisplay(getDaysAgoYmd(12));
const d18Display = formatDateToDisplay(getDaysAgoYmd(18));
const d25Display = formatDateToDisplay(getDaysAgoYmd(25));

const SAMPLE_UPI_RECEIPT = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="100%" height="100%" fill="%23f8fafc"/><rect x="20" y="20" width="360" height="560" rx="20" fill="%23ffffff" stroke="%23e2e8f0" stroke-width="2"/><circle cx="200" cy="90" r="32" fill="%2316a34a"/><path d="M188 90l8 8 16-16" stroke="%23ffffff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="200" y="150" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="%230f172a" text-anchor="middle">Payment Successful</text><text x="200" y="175" font-family="Arial,sans-serif" font-size="12" fill="%2364748b" text-anchor="middle">UPI Ref: 429381029384</text><text x="200" y="225" font-family="Arial,sans-serif" font-size="32" font-weight="900" fill="%230f172a" text-anchor="middle">₹ 5,000.00</text><line x1="40" y1="260" x2="360" y2="260" stroke="%23e2e8f0" stroke-dasharray="4,4"/><text x="50" y="300" font-family="Arial,sans-serif" font-size="12" fill="%2364748b">Paid To</text><text x="350" y="300" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="%230f172a" text-anchor="end">Building Owner Realty</text><text x="50" y="340" font-family="Arial,sans-serif" font-size="12" fill="%2364748b">From Account</text><text x="350" y="340" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="%230f172a" text-anchor="end">Everest Microfinance</text><text x="50" y="380" font-family="Arial,sans-serif" font-size="12" fill="%2364748b">Payment Mode</text><text x="350" y="380" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="%2316a34a" text-anchor="end">UPI Transfer</text><text x="50" y="420" font-family="Arial,sans-serif" font-size="12" fill="%2364748b">Transaction Time</text><text x="350" y="420" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="%230f172a" text-anchor="end">15-10-2026 10:15 AM</text><rect x="40" y="460" width="320" height="70" rx="12" fill="%23f1f5f9"/><text x="60" y="490" font-family="Arial,sans-serif" font-size="11" fill="%2364748b">Note</text><text x="60" y="512" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="%230f172a">Monthly Branch Rent - October 2026</text></svg>`;

const SAMPLE_CASH_BILL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="550" viewBox="0 0 400 550"><rect width="100%" height="100%" fill="%23fef3c7"/><rect x="20" y="20" width="360" height="510" rx="16" fill="%23ffffff" stroke="%23f59e0b" stroke-width="2"/><text x="200" y="70" font-family="Arial,sans-serif" font-size="20" font-weight="900" fill="%2392400e" text-anchor="middle">HOTEL ANNAI TEA STALL</text><text x="200" y="95" font-family="Arial,sans-serif" font-size="12" fill="%2378350f" text-anchor="middle">Branch Refreshments Cash Voucher</text><line x1="40" y1="120" x2="360" y2="120" stroke="%23fbbf24" stroke-width="2" stroke-dasharray="4,4"/><text x="50" y="160" font-family="Arial,sans-serif" font-size="13" fill="%23451a03">Tea &amp; Coffee (15 cups)</text><text x="350" y="160" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="%23451a03" text-anchor="end">₹ 180.00</text><text x="50" y="200" font-family="Arial,sans-serif" font-size="13" fill="%23451a03">Biscuits &amp; Snacks</text><text x="350" y="200" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="%23451a03" text-anchor="end">₹ 70.00</text><line x1="40" y1="240" x2="360" y2="240" stroke="%23fbbf24" stroke-width="2"/><text x="50" y="280" font-family="Arial,sans-serif" font-size="16" font-weight="900" fill="%2392400e">TOTAL PAID (CASH)</text><text x="350" y="280" font-family="Arial,sans-serif" font-size="18" font-weight="900" fill="%23b45309" text-anchor="end">₹ 250.00</text><text x="200" y="340" font-family="Arial,sans-serif" font-size="12" fill="%2378350f" text-anchor="middle">Paid from Branch Cash in Hand</text><text x="200" y="370" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="%23059669" text-anchor="middle">Verified with Notes Denomination</text></svg>`;

const INITIAL_EXPENSES = [
  { id: 'exp_1', date: todayDisplay, time: '10:15 AM', description: 'Office Rent & Maintenance', category: 'Office Rent', amount: 5000, remarks: 'Monthly Branch Rent', mode: 'UPI', paidBy: 'Branch Manager', receiptImage: SAMPLE_UPI_RECEIPT },
  { id: 'exp_2', date: todayDisplay, time: '04:30 PM', description: 'Evening Tea & Refreshments', category: 'Tea & Snacks', amount: 250, remarks: 'Daily Staff Tea', mode: 'Cash', paidBy: 'Admin', cashDenominations: { d500: 0, d200: 1, d100: 0, d50: 1, d20: 0, d10: 0, coins: 0, total: 250 }, receiptImage: SAMPLE_CASH_BILL },
  { id: 'exp_3', date: yesterdayDisplay, time: '05:45 PM', description: 'Travel & Fuel Allowance', category: 'Fuel/Travel', amount: 2000, remarks: 'Field Collection Visit', mode: 'Cash', paidBy: 'Field Officer', cashDenominations: { d500: 4, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, coins: 0, total: 2000 } },
  { id: 'exp_4', date: yesterdayDisplay, time: '11:20 AM', description: 'Electricity Bill', category: 'Electricity / Utilities', amount: 1850, remarks: 'EB Monthly Bill', mode: 'UPI', paidBy: 'Branch Manager' },
  { id: 'exp_5', date: d3Display, time: '02:15 PM', description: 'Stationery & Register Books', category: 'Stationery', amount: 1500, remarks: 'Passbooks & Forms', mode: 'UPI', paidBy: 'Admin' },
  { id: 'exp_6', date: d5Display, time: '11:00 AM', description: 'Printer Toner Cartridge', category: 'Printing', amount: 1200, remarks: 'HP LaserJet Toner', mode: 'UPI', paidBy: 'Admin' },
  { id: 'exp_7', date: d8Display, time: '03:45 PM', description: 'Air Conditioner Servicing', category: 'Maintenance', amount: 1800, remarks: 'Bi-annual Maintenance', mode: 'Cash', paidBy: 'Admin' },
  { id: 'exp_8', date: d12Display, time: '01:30 PM', description: 'Staff Field Advance', category: 'Staff Salary / Advance', amount: 3000, remarks: 'Festival Advance', mode: 'UPI', paidBy: 'Branch Manager' },
  { id: 'exp_9', date: d18Display, time: '10:00 AM', description: 'Broadband Fiber Internet', category: 'Telephone / Internet', amount: 999, remarks: 'BSNL Monthly Fiber', mode: 'UPI', paidBy: 'Admin' },
  { id: 'exp_10', date: d25Display, time: '04:00 PM', description: 'Branch Hardware & Repairs', category: 'Others', amount: 650, remarks: 'Door Lock Repair', mode: 'Cash', paidBy: 'Field Officer' },
  { id: 'exp_11', date: '03-05-2026', time: '03:30 PM', description: 'Stationery & Printing', category: 'Stationery', amount: 1500, remarks: 'Passbooks & Forms', mode: 'UPI', paidBy: 'Admin' },
  { id: 'exp_12', date: '02-05-2026', time: '11:30 AM', description: 'Travel & Fuel', category: 'Fuel/Travel', amount: 2000, remarks: 'Field Collection Visit', mode: 'Cash', paidBy: 'Field Officer' },
  { id: 'exp_13', date: '01-05-2026', time: '10:00 AM', description: 'Office Rent', category: 'Office Rent', amount: 5000, remarks: 'Monthly Branch Rent', mode: 'UPI', paidBy: 'Branch Manager' }
];

export default function ExpansionView({ 
  activeBranch = { id: 'main', name: 'Main Branch' }, 
  userProfile = null, 
  branches = [], 
  customers = [], 
  onBack,
  onHome
}) {
  const branchId = activeBranch?.id || 'main';

  // Preset Filters: 'Today' | 'Yesterday' | 'Last Week' | 'Last Month' | 'Custom'
  const [activePreset, setActivePreset] = useState('Today');

  // Active Date Range Filter (YMD strings)
  const [fromDate, setFromDate] = useState(getTodayYmd());
  const [toDate, setToDate] = useState(getTodayYmd());

  // Focused Selected Date (for calendar highlight & single-day views)
  const [selectedDate, setSelectedDate] = useState(getTodayYmd());

  // Category and Mode Filters
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedMode, setSelectedMode] = useState('All Modes');

  // Table Sort Order: 'desc' = Newest first, 'asc' = Oldest first
  const [sortOrder, setSortOrder] = useState('desc');

  // Calendar month navigation state
  const [calendarYear, setCalendarYear] = useState(() => {
    const d = new Date();
    return d.getFullYear();
  });
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return d.getMonth();
  });

  // Storage Key
  const expStorageKey = `everest_expansion_expenses_${branchId}`;

  // Expenses State
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(expStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(p => {
            const seed = INITIAL_EXPENSES.find(i => i.id === p.id);
            return {
              ...p,
              time: p.time || (p.createdAt ? formatTime(p.createdAt) : (seed?.time || '10:30 AM')),
              category: p.category || 'Others',
              mode: String(p.mode || '').toUpperCase().includes('CASH') ? 'Cash' : 'UPI',
              cashDenominations: p.cashDenominations || (p.id === 'exp_2' ? { d500: 0, d200: 1, d100: 0, d50: 1, d20: 0, d10: 0, coins: 0, total: 250 } : p.id === 'exp_3' ? { d500: 4, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, coins: 0, total: 2000 } : null),
              receiptImage: p.receiptImage || p.receiptUrl || (p.id === 'exp_1' ? SAMPLE_UPI_RECEIPT : p.id === 'exp_2' ? SAMPLE_CASH_BILL : null)
            };
          });
        }
      }
      return INITIAL_EXPENSES;
    } catch (e) {
      return INITIAL_EXPENSES;
    }
  });

  // Modal State
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState(null);

  // Denomination sub-modal & calculation state
  const [isDenomModalOpen, setIsDenomModalOpen] = useState(false);
  const [tempDenom, setTempDenom] = useState({
    d500: 0,
    d200: 0,
    d100: 0,
    d50: 0,
    d20: 0,
    d10: 0,
    coins: 0
  });

  // Source Viewers (Cash Breakdown popover & UPI Screenshot lightbox)
  const [activeDenomViewer, setActiveDenomViewer] = useState(null);
  const [activeReceiptModal, setActiveReceiptModal] = useState(null);

  // Form State
  const [expForm, setExpForm] = useState({
    date: formatDateToDisplay(getTodayYmd()),
    description: '',
    category: 'Fuel/Travel',
    customCategory: '',
    amount: '',
    remarks: '',
    mode: 'Cash',
    paidBy: userProfile?.name || 'Admin',
    cashDenominations: null,
    receiptImage: null
  });

  // --- Real-time Firestore Listener for Expenses ---
  useEffect(() => {
    let unsubExp = () => {};

    try {
      const qExp = query(collection(db, 'expansion_expenses'), where('branchId', '==', branchId));
      unsubExp = onSnapshot(qExp, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              category: data.category || 'Others',
              mode: String(data.mode || '').toUpperCase().includes('CASH') ? 'Cash' : 'UPI',
              cashDenominations: data.cashDenominations || null,
              receiptImage: data.receiptImage || data.receiptUrl || null
            };
          });
          setExpenses(list);
          localStorage.setItem(expStorageKey, JSON.stringify(list));
        }
      }, (err) => console.warn('Firestore expansion_expenses listener notice:', err));
    } catch (e) {}

    return () => {
      unsubExp();
    };
  }, [branchId, expStorageKey]);

  // Category matching helper
  const matchCategory = (expense, cat) => {
    if (!cat || cat === 'All Categories') return true;
    const expCat = String(expense.category || '').toLowerCase();
    const expRawCat = String(expense.rawCategory || '').toLowerCase();
    const expCustomCat = String(expense.customCategory || '').toLowerCase();
    const expDesc = String(expense.description || '').toLowerCase();
    const target = cat.toLowerCase();

    if (target === 'others') {
      return expRawCat === 'others' || expCat === 'others' || Boolean(expCustomCat) || (!CATEGORIES.some(c => c.toLowerCase() === expCat));
    }

    if (expCat === target) return true;
    if (target.includes('fuel') || target.includes('travel')) return expCat.includes('travel') || expCat.includes('fuel') || expDesc.includes('travel') || expDesc.includes('fuel');
    if (target.includes('rent')) return expCat.includes('rent') || expDesc.includes('rent');
    if (target.includes('tea') || target.includes('snacks')) return expCat.includes('tea') || expCat.includes('snacks') || expDesc.includes('tea') || expDesc.includes('snacks');
    if (target.includes('stationery')) return expCat.includes('stationery') || expDesc.includes('stationery');
    if (target.includes('printing')) return expCat.includes('printing') || expDesc.includes('printing');
    if (target.includes('maintenance')) return expCat.includes('maintenance') || expDesc.includes('maintenance');
    if (target.includes('electricity') || target.includes('utilities')) return expCat.includes('electricity') || expCat.includes('utilities') || expDesc.includes('electricity') || expDesc.includes('bill');
    if (target.includes('salary') || target.includes('advance')) return expCat.includes('salary') || expCat.includes('advance') || expDesc.includes('salary');
    if (target.includes('telephone') || target.includes('internet')) return expCat.includes('telephone') || expCat.includes('internet') || expDesc.includes('internet') || expDesc.includes('phone');
    return expCat.includes(target) || expDesc.includes(target);
  };

  // Mode matching helper
  const matchMode = (expense, mode) => {
    if (!mode || mode === 'All Modes') return true;
    const m = String(expense.mode || '').toUpperCase();
    if (mode === 'Cash') return m.includes('CASH');
    if (mode === 'UPI') return m.includes('UPI') || m.includes('ONLINE') || m.includes('BANK');
    return true;
  };

  // --- Filtered Expenses based on active Date Range, Category, & Mode ---
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      return isDateInRange(e.date, fromDate, toDate) &&
             matchCategory(e, selectedCategory) &&
             matchMode(e, selectedMode);
    });
  }, [expenses, fromDate, toDate, selectedCategory, selectedMode]);

  // Sorted Filtered Expenses based on sortOrder
  const sortedFilteredExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      const ymdA = formatDateToYmd(a.date);
      const ymdB = formatDateToYmd(b.date);
      if (sortOrder === 'desc') {
        return ymdB.localeCompare(ymdA);
      } else {
        return ymdA.localeCompare(ymdB);
      }
    });
  }, [filteredExpenses, sortOrder]);

  // Aggregate Filtered Total Expense
  const totalFilteredExpense = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [filteredExpenses]);

  // --- KPI Card 1: Summary (Expense) Metrics ---
  const periodMetrics = useMemo(() => {
    let total = 0;
    let cash = 0;
    let online = 0;

    filteredExpenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      const mode = String(exp.mode || 'Cash').toUpperCase();
      total += amt;
      if (mode.includes('CASH')) {
        cash += amt;
      } else {
        online += amt;
      }
    });

    return { total, cash, online };
  }, [filteredExpenses]);

  // Dynamic Card 1 Title
  const card1Title = useMemo(() => {
    if (fromDate === toDate) {
      if (activePreset === 'Today') return "Today's Summary (Expense)";
      if (activePreset === 'Yesterday') return "Yesterday's Summary (Expense)";
      const dDisplay = formatDateToDisplay(fromDate);
      return `${dDisplay} Summary (Expense)`;
    }
    if (activePreset === 'Last Week') return "Last Week's Summary (Expense)";
    if (activePreset === 'Last Month') return "Last Month's Summary (Expense)";
    return `${formatDateToDisplay(fromDate)} - ${formatDateToDisplay(toDate)} Summary (Expense)`;
  }, [fromDate, toDate, activePreset]);

  // --- Preset Filter Handler ---
  const handlePresetClick = (preset) => {
    setActivePreset(preset);
    const today = getTodayYmd();
    const yesterday = getYesterdayYmd();

    if (preset === 'Today') {
      setFromDate(today);
      setToDate(today);
      setSelectedDate(today);
    } else if (preset === 'Yesterday') {
      setFromDate(yesterday);
      setToDate(yesterday);
      setSelectedDate(yesterday);
    } else if (preset === 'Last Week') {
      const sevenDaysAgo = getDaysAgoYmd(7);
      setFromDate(sevenDaysAgo);
      setToDate(today);
      setSelectedDate(today);
    } else if (preset === 'Last Month') {
      const thirtyDaysAgo = getDaysAgoYmd(30);
      setFromDate(thirtyDaysAgo);
      setToDate(today);
      setSelectedDate(today);
    } else if (preset === 'Custom') {
      // Retain current fromDate & toDate
    }
  };

  const handleCustomDateChange = (field, newYmd) => {
    if (!newYmd) return;
    setActivePreset('Custom');
    if (field === 'from') {
      setFromDate(newYmd);
      setSelectedDate(newYmd);
    } else {
      setToDate(newYmd);
      setSelectedDate(newYmd);
    }
  };

  // --- Right Sidebar: Unique-Date Aggregated Expenses Ledger (No Duplicate Dates) ---
  const dailyAggregatedExpenses = useMemo(() => {
    // 1. Filter by category & mode first
    const list = expenses.filter(e => {
      return matchCategory(e, selectedCategory) && matchMode(e, selectedMode);
    });

    // 2. Group by date YMD
    const groupsByYmd = {};
    list.forEach(item => {
      if (!item.date) return;
      const ymd = formatDateToYmd(item.date);
      if (!ymd) return;

      const [yr, mo, dy] = ymd.split('-').map(Number);
      const dObj = new Date(yr, mo - 1, dy);
      const dayName = isNaN(dObj.getTime()) ? 'Day' : dObj.toLocaleDateString('en-US', { weekday: 'long' });
      const itemTime = item.time || (item.createdAt ? formatTime(item.createdAt) : '10:30 AM');

      if (!groupsByYmd[ymd]) {
        groupsByYmd[ymd] = {
          ymd: ymd,
          displayDate: formatDateToDisplay(item.date),
          dayName: dayName,
          latestTime: itemTime,
          totalAmount: 0,
          count: 0
        };
      } else {
        if (item.time) {
          groupsByYmd[ymd].latestTime = item.time;
        } else if (item.createdAt) {
          groupsByYmd[ymd].latestTime = formatTime(item.createdAt);
        }
      }
      groupsByYmd[ymd].totalAmount += Number(item.amount || 0);
      groupsByYmd[ymd].count += 1;
    });

    // 3. Convert to array and sort descending by date (newest first)
    let aggregatedList = Object.values(groupsByYmd).sort((a, b) => b.ymd.localeCompare(a.ymd));

    // 4. Strict filter limits (Cap Today and Yesterday to top 4-5 records)
    if (activePreset === 'Today' || activePreset === 'Yesterday') {
      aggregatedList = aggregatedList.slice(0, 5);
    } else if (activePreset === 'Last Week') {
      const weekAgo = getDaysAgoYmd(7);
      const today = getTodayYmd();
      aggregatedList = aggregatedList.filter(g => g.ymd >= weekAgo && g.ymd <= today).slice(0, 7);
    } else if (activePreset === 'Last Month') {
      const monthAgo = getDaysAgoYmd(30);
      const today = getTodayYmd();
      aggregatedList = aggregatedList.filter(g => g.ymd >= monthAgo && g.ymd <= today).slice(0, 30);
    } else {
      aggregatedList = aggregatedList.slice(0, 5);
    }

    return aggregatedList;
  }, [expenses, selectedCategory, selectedMode, activePreset]);

  // Mini Ledger Row Click: Focus strictly on that unique date
  const handleDrillDownDate = (dateStr) => {
    const ymd = formatDateToYmd(dateStr);
    setFromDate(ymd);
    setToDate(ymd);
    setSelectedDate(ymd);
    setActivePreset('Custom');

    const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      setCalendarYear(parseInt(match[1], 10));
      setCalendarMonth(parseInt(match[2], 10) - 1);
    }
  };

  // Calendar Day Click: Focus strictly on that date
  const handleCalendarDayClick = (dayYmd) => {
    setSelectedDate(dayYmd);
    setFromDate(dayYmd);
    setToDate(dayYmd);
    setActivePreset('Custom');
  };

  // --- Denomination & Receipt Handlers ---
  const calculateTempDenomTotal = (denomObj = tempDenom) => {
    return (
      (Number(denomObj.d500) || 0) * 500 +
      (Number(denomObj.d200) || 0) * 200 +
      (Number(denomObj.d100) || 0) * 100 +
      (Number(denomObj.d50) || 0) * 50 +
      (Number(denomObj.d20) || 0) * 20 +
      (Number(denomObj.d10) || 0) * 10 +
      (Number(denomObj.coins) || 0)
    );
  };

  const handleDenomCountChange = (key, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setTempDenom(prev => ({
      ...prev,
      [key]: isNaN(num) ? 0 : num
    }));
  };

  const handleOpenDenomModal = () => {
    if (expForm.cashDenominations) {
      setTempDenom({
        d500: expForm.cashDenominations.d500 || 0,
        d200: expForm.cashDenominations.d200 || 0,
        d100: expForm.cashDenominations.d100 || 0,
        d50: expForm.cashDenominations.d50 || 0,
        d20: expForm.cashDenominations.d20 || 0,
        d10: expForm.cashDenominations.d10 || 0,
        coins: expForm.cashDenominations.coins || 0
      });
    } else {
      setTempDenom({ d500: 0, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, coins: 0 });
    }
    setIsDenomModalOpen(true);
  };

  const handleSaveDenomination = () => {
    const total = calculateTempDenomTotal(tempDenom);
    if (total <= 0) {
      setExpForm(prev => ({ ...prev, cashDenominations: null }));
    } else {
      setExpForm(prev => ({
        ...prev,
        amount: total,
        cashDenominations: { ...tempDenom, total }
      }));
    }
    setIsDenomModalOpen(false);
  };

  const handleReceiptImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Receipt screenshot size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setExpForm(prev => ({ ...prev, receiptImage: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // --- Expense CRUD ---
  const handleOpenAddExpense = () => {
    setEditingExp(null);
    setExpForm({
      date: formatDateToDisplay(fromDate) || formatDateToDisplay(getTodayYmd()),
      description: '',
      category: selectedCategory !== 'All Categories' ? selectedCategory : 'Fuel/Travel',
      customCategory: '',
      amount: '',
      remarks: '',
      mode: selectedMode !== 'All Modes' ? selectedMode : 'Cash',
      paidBy: userProfile?.name || 'Admin',
      cashDenominations: null,
      receiptImage: null
    });
    setTempDenom({ d500: 0, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, coins: 0 });
    setIsExpModalOpen(true);
  };

  const handleOpenEditExpense = (item) => {
    setEditingExp(item);
    const standardCategories = CATEGORIES.filter(c => c !== 'All Categories' && c !== 'Others');
    const isCustom = !standardCategories.includes(item.category);
    const cat = isCustom ? 'Others' : (item.category || 'Others');
    const customCat = item.customCategory || (isCustom && item.category !== 'Others' ? item.category : '');

    setExpForm({
      date: item.date || formatDateToDisplay(getTodayYmd()),
      description: item.description || '',
      category: cat,
      customCategory: customCat,
      amount: item.amount || '',
      remarks: item.remarks && item.remarks !== '-' ? item.remarks : '',
      mode: String(item.mode || '').toUpperCase().includes('CASH') ? 'Cash' : 'UPI',
      paidBy: item.paidBy || userProfile?.name || 'Admin',
      cashDenominations: item.cashDenominations || null,
      receiptImage: item.receiptImage || item.receiptUrl || null
    });

    if (item.cashDenominations) {
      setTempDenom({
        d500: item.cashDenominations.d500 || 0,
        d200: item.cashDenominations.d200 || 0,
        d100: item.cashDenominations.d100 || 0,
        d50: item.cashDenominations.d50 || 0,
        d20: item.cashDenominations.d20 || 0,
        d10: item.cashDenominations.d10 || 0,
        coins: item.cashDenominations.coins || 0
      });
    } else {
      setTempDenom({ d500: 0, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, coins: 0 });
    }
    setIsExpModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const amt = Number(expForm.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    if (expForm.category === 'Others' && !expForm.customCategory?.trim()) {
      alert('Please enter a custom category name for "Others".');
      return;
    }

    const finalCategory = expForm.category === 'Others'
      ? (expForm.customCategory.trim() || 'Others')
      : expForm.category;

    const isCash = expForm.mode === 'Cash';
    const currentTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const payload = {
      date: expForm.date || formatDateToDisplay(getTodayYmd()),
      time: editingExp?.time || currentTimeStr,
      description: expForm.description.trim() || 'Expense',
      category: finalCategory,
      rawCategory: expForm.category,
      customCategory: expForm.category === 'Others' ? expForm.customCategory.trim() : null,
      amount: amt,
      remarks: expForm.remarks.trim() || '-',
      mode: isCash ? 'Cash' : 'UPI',
      paidBy: expForm.paidBy.trim() || userProfile?.name || 'Admin',
      cashDenominations: isCash && expForm.cashDenominations ? expForm.cashDenominations : null,
      receiptImage: expForm.receiptImage || null,
      branchId,
      updatedAt: new Date().toISOString()
    };

    if (editingExp) {
      try {
        await updateDoc(doc(db, 'expansion_expenses', editingExp.id), payload);
      } catch (e) {}

      setExpenses(prev => {
        const updated = prev.map(i => i.id === editingExp.id ? { ...i, ...payload } : i);
        localStorage.setItem(expStorageKey, JSON.stringify(updated));
        return updated;
      });
    } else {
      payload.createdAt = new Date().toISOString();
      let newId = `exp_${Date.now()}`;
      try {
        const docRef = await addDoc(collection(db, 'expansion_expenses'), payload);
        newId = docRef.id;
      } catch (e) {}

      setExpenses(prev => {
        const updated = [{ id: newId, ...payload }, ...prev];
        localStorage.setItem(expStorageKey, JSON.stringify(updated));
        return updated;
      });
    }

    setIsExpModalOpen(false);
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      await deleteDoc(doc(db, 'expansion_expenses', id));
    } catch (e) {}

    setExpenses(prev => {
      const updated = prev.filter(i => i.id !== id);
      localStorage.setItem(expStorageKey, JSON.stringify(updated));
      return updated;
    });
  };

  // --- Interactive Calendar Grid Builder ---
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();

    const days = [];

    // Prev month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateStr: `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(daysInPrevMonth - i).padStart(2, '0')}`
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateStr: dateStr
      });
    }

    // Next month filler
    const totalSlots = Math.ceil(days.length / 7) * 7;
    let nextDay = 1;
    while (days.length < totalSlots) {
      days.push({
        dayNumber: nextDay,
        isCurrentMonth: false,
        dateStr: `${calendarYear}-${String(calendarMonth + 2).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`
      });
      nextDay++;
    }

    return days;
  }, [calendarYear, calendarMonth]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  // Header Date Badge Text
  const headerDateBadgeText = useMemo(() => {
    const fromDisplay = formatDateToDisplay(fromDate);
    const toDisplay = formatDateToDisplay(toDate);
    if (!fromDisplay && !toDisplay) return 'Today';
    if (fromDisplay === toDisplay) {
      return fromDisplay;
    }
    return `${fromDisplay} to ${toDisplay}`;
  }, [fromDate, toDate]);

  // Mode Badge Helper (Cash & UPI Only)
  const renderModeBadge = (mode) => {
    const m = String(mode || 'Cash').toUpperCase();
    if (m.includes('UPI') || m.includes('ONLINE') || m.includes('GPAY') || m.includes('PHONEPE') || m.includes('BANK')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
          <Smartphone className="w-2.5 h-2.5" />
          UPI
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
        <Wallet className="w-2.5 h-2.5" />
        Cash
      </span>
    );
  };

  // Calendar Day Styling Logic:
  // - Single Date: Blue
  // - Range: From = Green (#16A34A), To = Red (#DC2626), In-Between = Soft Blue Wash
  const startRangeYmd = fromDate <= toDate ? fromDate : toDate;
  const endRangeYmd = fromDate <= toDate ? toDate : fromDate;
  const isSingleDateMode = startRangeYmd === endRangeYmd;

  const getCalendarDayClasses = (slot) => {
    const isFrom = isSameDay(slot.dateStr, startRangeYmd);
    const isTo = isSameDay(slot.dateStr, endRangeYmd);
    const isBetween = !isSingleDateMode && slot.dateStr > startRangeYmd && slot.dateStr < endRangeYmd;

    if (isSingleDateMode && isFrom) {
      return 'bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-300 rounded-full';
    }
    if (!isSingleDateMode && isFrom) {
      return 'bg-[#16a34a] text-white font-black shadow-xs ring-2 ring-emerald-300 rounded-full';
    }
    if (!isSingleDateMode && isTo) {
      return 'bg-[#dc2626] text-white font-black shadow-xs ring-2 ring-rose-300 rounded-full';
    }
    if (isBetween) {
      return 'bg-blue-50 text-blue-900 font-extrabold border-y border-blue-100 rounded-none';
    }
    return slot.isCurrentMonth
      ? 'text-slate-700 hover:bg-slate-100 rounded-full'
      : 'text-slate-300 hover:bg-slate-50 rounded-full';
  };

  return (
    <div className="w-full min-h-screen bg-[#f0f4f9] text-slate-800 p-4 sm:p-6 lg:p-8 space-y-5 overflow-x-hidden">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="Back to Dashboard"
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-2xs cursor-pointer active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-2xl lg:text-3xl font-black text-[#1e293b] tracking-tight">
              Expansion
            </h1>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              Manage Expenses & Cash Outflow
            </span>
          </div>
        </div>

        {/* Top-Right Badges & Prominent Home Button */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{headerDateBadgeText} <span className="text-slate-400 font-normal">(Generated)</span></span>
          </div>

          <button
            type="button"
            onClick={onHome || onBack}
            title="Go to Home"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer active:scale-95 transition text-xs font-extrabold"
          >
            <Home className="w-4 h-4 stroke-[2.5]" />
            <span>Home</span>
          </button>
        </div>
      </div>

      {/* 2. Top Unified Row (Slot 1: Filter Period 4 cols, Slot 2: Summary 5 cols, Slot 3: Calendar 3 cols -> Snapped compact height with items-start) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Slot 1 (Far Left): Filter Period Panel with Inline Category & Mode Dropdowns */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-start gap-2 h-fit">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                Filter Period
              </h3>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full capitalize">
              {activePreset}
            </span>
          </div>

          {/* Row 1: Preset Pills: [ Today ] [ Yesterday ] [ Last Week ] [ Last Month ] */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['Today', 'Yesterday', 'Last Week', 'Last Month'].map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activePreset === preset
                    ? 'bg-blue-600 text-white shadow-2xs font-black'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Row 2: [ Custom ]  From: [ DD/MM/YYYY ]  To: [ DD/MM/YYYY ] */}
          <div className="flex items-center gap-1.5 w-full">
            {/* Custom Pill */}
            <button
              type="button"
              onClick={() => handlePresetClick('Custom')}
              className={`px-2 py-1 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activePreset === 'Custom'
                  ? 'bg-blue-600 text-white shadow-2xs font-black'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              Custom
            </button>

            {/* From Date */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-0.5 flex-1 min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">From:</span>
              <input
                type="date"
                value={formatDateToYmd(fromDate)}
                onChange={(e) => handleCustomDateChange('from', e.target.value)}
                className="w-full bg-transparent text-[11px] font-bold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-0.5 flex-1 min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">To:</span>
              <input
                type="date"
                value={formatDateToYmd(toDate)}
                onChange={(e) => handleCustomDateChange('to', e.target.value)}
                className="w-full bg-transparent text-[11px] font-bold text-slate-800 outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Row 3: Category & Mode Dropdowns */}
          <div className="flex items-center gap-1.5 w-full">
            {/* Inline Category Dropdown */}
            <div className="relative flex-1 min-w-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-2 py-0.5 text-[11px] font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer truncate h-[28px]"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Inline Mode Dropdown */}
            <div className="relative w-[100px] shrink-0">
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-2 py-0.5 text-[11px] font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer h-[28px]"
              >
                <option value="All Modes">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>
        </div>

        {/* Slot 2 (Center): Today's Summary (Expense) — Dynamically synchronized header, enhanced typography & icons */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-start gap-2.5 h-fit">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
              {card1Title}
            </h3>
          </div>

          {/* 3 Metric Cards with 2-Line Label Wrapping (Zero Truncation) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Total Expense */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 hover:bg-slate-50 transition shadow-2xs">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                <Coins className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-500 leading-tight block">
                  Total<br />Expense
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 block whitespace-nowrap tracking-tight mt-0.5">
                  {formatCurrency(periodMetrics.total)}
                </span>
              </div>
            </div>

            {/* 2. Expense from Cash */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 hover:bg-slate-50 transition shadow-2xs">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                <Wallet className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-500 leading-tight block">
                  Expense from<br />Cash
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 block whitespace-nowrap tracking-tight mt-0.5">
                  {formatCurrency(periodMetrics.cash)}
                </span>
              </div>
            </div>

            {/* 3. Expense through UPI */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 hover:bg-slate-50 transition shadow-2xs">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center shrink-0">
                <Smartphone className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-500 leading-tight block">
                  Expense through<br />UPI
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 block whitespace-nowrap tracking-tight mt-0.5">
                  {formatCurrency(periodMetrics.online)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Slot 3 (Far Right): Right Calendar Card */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-1.5 h-fit">
          {/* Header: Select Date & Date Pill */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Select Date</span>
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700">
              {formatDateToDisplay(selectedDate)}
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-extrabold text-slate-800">
              {monthNames[calendarMonth]} {calendarYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-extrabold text-slate-400 uppercase">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid with Range Coloration */}
          <div className="grid grid-cols-7 gap-0.5 text-center place-items-center">
            {calendarDays.map((slot, i) => {
              const dayClasses = getCalendarDayClasses(slot);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleCalendarDayClick(slot.dateStr)}
                  className={`h-5.5 w-5.5 mx-auto text-[10px] font-bold flex items-center justify-center transition cursor-pointer ${dayClasses}`}
                >
                  {slot.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Range Color Legend */}
          {!isSingleDateMode && (
            <div className="flex items-center justify-center gap-3 pt-0.5 border-t border-slate-100 text-[9px] font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#16a34a]"></span> From
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#dc2626]"></span> To
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Parallel Row (Expense Entry Table ~76% / Recent Expenses ~24% starting on exact same baseline) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        {/* ================= LEFT ~76%: PRIMARY EXPENSE ENTRY SECTION ================= */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Dedicated Floating Action Toolbar: Title, Subtitle, Date Sort, Total Badge, and Add Expense Button */}
          <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 stroke-[2.4]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Expense Entry
                </h3>
                <span className="text-[11px] font-medium text-slate-400 block -mt-0.5">
                  Daily operational expenses and branch payouts
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Date Sorting Toggle: Date : NEWEST ⇅ OLDEST */}
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                title={`Sort by Date: currently ${sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}. Click to toggle.`}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 shadow-2xs cursor-pointer active:scale-95 transition"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-slate-400 font-semibold">Date :</span>
                <span className={`px-1.5 py-0.5 rounded-md ${sortOrder === 'desc' ? 'bg-blue-600 text-white font-black' : 'text-slate-500 font-bold'}`}>NEWEST</span>
                <span className="text-slate-300">⇅</span>
                <span className={`px-1.5 py-0.5 rounded-md ${sortOrder === 'asc' ? 'bg-blue-600 text-white font-black' : 'text-slate-500 font-bold'}`}>OLDEST</span>
              </button>

              <div className="px-2.5 py-1.5 bg-white border border-rose-200/80 rounded-xl text-xs font-extrabold text-rose-700 shadow-2xs">
                Total: {formatCurrency(totalFilteredExpense)}
              </div>

              <button
                type="button"
                onClick={handleOpenAddExpense}
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Expense</span>
              </button>
            </div>
          </div>

          {/* Table Container Card (Starts cleanly with table headers) */}
          <div className="bg-white rounded-2xl border border-rose-100/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-hidden w-full">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-2 text-center w-8">S.No</th>
                    <th className="py-2.5 px-2 w-28">Date</th>
                    <th className="py-2.5 px-2 min-w-[120px]">Description</th>
                    <th className="py-2.5 px-2 w-24">Category</th>
                    <th className="py-2.5 px-2 text-right w-20">Amount (₹)</th>
                    <th className="py-2.5 px-2 min-w-[100px]">Remarks</th>
                    <th className="py-2.5 px-2 text-center w-16">Mode</th>
                    <th className="py-2.5 px-2 text-center min-w-[110px]">Source</th>
                    <th className="py-2.5 px-2 w-24">Paid By</th>
                    <th className="py-2.5 px-2 text-center w-14">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {sortedFilteredExpenses.map((item, idx) => {
                    const dateInfo = getItemDayAndDate(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-2 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <div className="font-bold text-slate-800 text-xs leading-tight">
                            {dateInfo.displayDate}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                            {dateInfo.subLabel}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 font-bold text-slate-800 text-xs">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 max-w-[110px] truncate" title={item.customCategory || item.category || 'Others'}>
                            {item.customCategory || item.category || 'Others'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-black text-rose-700 whitespace-nowrap text-xs sm:text-sm">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="py-2.5 px-2 text-slate-500 font-medium text-xs truncate max-w-[130px]" title={item.remarks}>
                          {item.remarks || '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {renderModeBadge(item.mode)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {item.mode === 'Cash' ? (
                              <>
                                {item.cashDenominations && (item.cashDenominations.total > 0 || Object.values(item.cashDenominations).some(v => Number(v) > 0)) && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveDenomViewer(item)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs transition active:scale-95 cursor-pointer"
                                    title="Click to view recorded Cash Denomination Breakdown"
                                  >
                                    <Banknote className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>Denom</span>
                                  </button>
                                )}
                                {(item.receiptImage || item.receiptUrl) && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveReceiptModal(item)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs transition active:scale-95 cursor-pointer"
                                    title="Click to view Cash Bill / Receipt"
                                  >
                                    <Camera className="w-2.5 h-2.5 text-amber-600" />
                                    <span>Bill</span>
                                  </button>
                                )}
                                {!((item.cashDenominations && (item.cashDenominations.total > 0 || Object.values(item.cashDenominations).some(v => Number(v) > 0))) || item.receiptImage || item.receiptUrl) && (
                                  <span className="text-slate-300 font-bold text-xs">-</span>
                                )}
                              </>
                            ) : (
                              (item.receiptImage || item.receiptUrl) ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveReceiptModal(item)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs transition active:scale-95 cursor-pointer"
                                  title="Click to view Payment Screenshot / Receipt"
                                >
                                  <Camera className="w-2.5 h-2.5 text-purple-600" />
                                  <span>Receipt</span>
                                </button>
                              ) : (
                                <span className="text-slate-300 font-bold text-xs">-</span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4.5 h-4.5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] font-bold shrink-0">
                              <User className="w-2.5 h-2.5" />
                            </div>
                            <span className="font-semibold text-slate-700 text-xs truncate max-w-[80px]" title={item.paidBy || 'Admin'}>
                              {item.paidBy || 'Admin'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditExpense(item)}
                              title="Edit"
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(item.id)}
                              title="Delete"
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {sortedFilteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 text-xs font-semibold">
                        No expenses found matching the selected filter criteria. Click "+ Add Expense" to record a new entry.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Summary Footer Calculating Total Expenses */}
                <tfoot>
                  <tr className="bg-rose-50/70 font-black border-t-2 border-rose-200/80 text-xs">
                    <td colSpan={4} className="py-2.5 px-2 text-slate-800 font-extrabold uppercase tracking-wide">
                      Total Expenses
                    </td>
                    <td className="py-2.5 px-2 text-right text-rose-700 font-black text-xs sm:text-sm whitespace-nowrap">
                      {formatCurrency(totalFilteredExpense)}
                    </td>
                    <td colSpan={5} className="py-2.5 px-2 text-right text-slate-500 font-bold text-xs">
                      {sortedFilteredExpenses.length} {sortedFilteredExpenses.length === 1 ? 'Entry' : 'Entries'} Recorded
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ================= RIGHT ~24%: QUICK EXPENSE HISTORY LEDGER (Unique Dates with Day & Time) ================= */}
        <div className="w-full lg:w-[24%] lg:min-w-[240px] bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2 flex flex-col shrink-0">
          {/* Header: Title + Dynamic count pill of Unique Days */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
              <Receipt className="w-3.5 h-3.5 text-rose-600" />
              <span>Recent Expenses</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
              Days Recorded: {dailyAggregatedExpenses.length}
            </span>
          </div>

          {/* Fixed 4-5 Row Viewport with Independent Internal Scrollbar */}
          <div className="max-h-[200px] overflow-y-auto pr-1 divide-y divide-slate-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-xs z-10 border-b border-slate-100">
                <tr className="text-[9px] font-black uppercase text-slate-400">
                  <th className="py-1.5 px-2 text-center w-7">S.No</th>
                  <th className="py-1.5 px-2">Date</th>
                  <th className="py-1.5 px-2 text-right">Expense (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dailyAggregatedExpenses.map((group, idx) => {
                  const isSelected = isSameDay(group.ymd, fromDate) && isSameDay(group.ymd, toDate);
                  return (
                    <tr
                      key={group.ymd || idx}
                      onClick={() => handleDrillDownDate(group.displayDate)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected
                          ? 'bg-rose-50/90 font-bold text-rose-800'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                      title={`Click to focus on ${group.displayDate} (Total: ${formatCurrency(group.totalAmount)})`}
                    >
                      <td className="py-2 px-2 text-center text-slate-400 font-semibold group-hover:text-slate-600 align-middle">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap align-middle">
                        <div className="font-semibold text-slate-800 text-xs leading-tight">
                          {group.displayDate}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                          {group.dayName}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-black text-rose-600 whitespace-nowrap align-middle text-xs">
                        {formatCurrency(group.totalAmount)}
                      </td>
                    </tr>
                  );
                })}

                {dailyAggregatedExpenses.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 text-xs font-medium">
                      No expenses recorded for active filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Add/Edit Expense */}
      {isExpModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          style={{ zIndex: 50 }}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150 relative"
            style={{ zIndex: 50 }}
          >
            <div className="px-6 py-4 bg-rose-50/80 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-700" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  {editingExp ? 'Edit Expense Entry' : 'Add New Expense'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExpModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input
                    type="text"
                    required
                    placeholder="DD-MM-YYYY"
                    value={expForm.date}
                    onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 5000"
                    value={expForm.amount}
                    onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-rose-600 outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select
                    value={expForm.category}
                    onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
                  >
                    {CATEGORIES.filter(c => c !== 'All Categories').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {expForm.category === 'Others' && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <label className="block text-[9px] font-black text-rose-600 uppercase mb-0.5">
                        Custom Category Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Courier, Water Tanker"
                        value={expForm.customCategory || ''}
                        onChange={(e) => setExpForm({ ...expForm, customCategory: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-rose-50/50 border border-rose-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-rose-500 placeholder:text-slate-400"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Payment Mode</label>
                    {expForm.mode === 'Cash' && expForm.cashDenominations && expForm.cashDenominations.total > 0 && (
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        ₹{expForm.cashDenominations.total.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <select
                    value={expForm.mode}
                    onChange={(e) => setExpForm({ ...expForm, mode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                  </select>

                  {/* Context-Aware Verification Trigger */}
                  <div className="mt-2">
                    {expForm.mode === 'Cash' ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {/* 1. Cash Denomination Trigger */}
                          <div className="flex-1 flex items-center gap-1 min-w-0">
                            <button
                              type="button"
                              onClick={handleOpenDenomModal}
                              className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border text-[11px] font-extrabold transition shadow-2xs cursor-pointer min-w-0 ${
                                expForm.cashDenominations && expForm.cashDenominations.total > 0
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">
                                {expForm.cashDenominations && expForm.cashDenominations.total > 0
                                  ? `₹${expForm.cashDenominations.total.toLocaleString('en-IN')}`
                                  : '+ Denomination'}
                              </span>
                            </button>
                            {expForm.cashDenominations && expForm.cashDenominations.total > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpForm(prev => ({ ...prev, cashDenominations: null }))}
                                title="Remove Denomination"
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* 2. Optional Bill / Receipt Upload for Cash */}
                          <div className="flex-1 flex items-center gap-1 min-w-0">
                            <label className={`flex-1 cursor-pointer inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border text-[11px] font-extrabold transition shadow-2xs min-w-0 ${
                              expForm.receiptImage
                                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}>
                              <Camera className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="truncate">{expForm.receiptImage ? 'Change Bill' : '+ Upload Bill'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleReceiptImageUpload}
                              />
                            </label>
                            {expForm.receiptImage && (
                              <div className="flex items-center gap-1 bg-amber-50/80 border border-amber-200 rounded-lg p-0.5 shrink-0">
                                <img
                                  src={expForm.receiptImage}
                                  alt="Bill"
                                  className="w-6 h-6 object-cover rounded cursor-pointer hover:opacity-80"
                                  onClick={() => setActiveReceiptModal({
                                    mode: 'Cash',
                                    receiptImage: expForm.receiptImage,
                                    description: expForm.description || 'Bill Preview',
                                    amount: expForm.amount || 0,
                                    date: expForm.date
                                  })}
                                  title="Click to preview bill"
                                />
                                <button
                                  type="button"
                                  onClick={() => setExpForm(prev => ({ ...prev, receiptImage: null }))}
                                  title="Remove Bill"
                                  className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <label className={`flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-extrabold transition shadow-2xs ${
                          expForm.receiptImage
                            ? 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}>
                          <Camera className="w-3.5 h-3.5 text-purple-600" />
                          <span>{expForm.receiptImage ? 'Change Receipt' : '+ Upload Screenshot'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleReceiptImageUpload}
                          />
                        </label>
                        {expForm.receiptImage && (
                          <div className="flex items-center gap-1 bg-purple-50/80 border border-purple-200 rounded-lg p-0.5">
                            <img
                              src={expForm.receiptImage}
                              alt="Receipt"
                              className="w-6 h-6 object-cover rounded cursor-pointer hover:opacity-80"
                              onClick={() => setActiveReceiptModal({
                                mode: 'UPI',
                                receiptImage: expForm.receiptImage,
                                description: expForm.description || 'Receipt Preview',
                                amount: expForm.amount || 0,
                                date: expForm.date
                              })}
                              title="Click to preview receipt"
                            />
                            <button
                              type="button"
                              onClick={() => setExpForm(prev => ({ ...prev, receiptImage: null }))}
                              title="Remove Receipt"
                              className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Branch Rent, Tea & Snacks, Stationery"
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Paid By</label>
                  <input
                    type="text"
                    required
                    placeholder="Staff or Admin Name"
                    value={expForm.paidBy}
                    onChange={(e) => setExpForm({ ...expForm, paidBy: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Field Visit, Office Supplies"
                    value={expForm.remarks}
                    onChange={(e) => setExpForm({ ...expForm, remarks: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal: Cash Denomination Counter */}
      {isDenomModalOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 animate-in fade-in duration-150"
          style={{ zIndex: 70 }}
        >
          {/* Dark Backdrop Overlay at z-[65] */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            style={{ zIndex: 65 }}
            onClick={() => setIsDenomModalOpen(false)}
          />

          {/* Modal Dialog Card at z-[70] with crisp compact proportions */}
          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-[400px] w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150"
            style={{ zIndex: 70 }}
          >
            <div className="px-4 py-2.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-700" />
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Cash Denomination Counter
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Count notes for Cash verification
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDenomModalOpen(false)}
                className="w-6 h-6 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 space-y-2.5">
              <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/80 divide-y divide-slate-200/60 text-xs">
                {[500, 200, 100, 50, 20, 10].map(val => (
                  <div key={val} className="py-1 flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-800 w-14 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-center shadow-2xs text-xs">
                      ₹ {val}
                    </span>
                    <span className="text-slate-400 font-bold text-xs">×</span>
                    <input
                      type="number"
                      min="0"
                      value={tempDenom[`d${val}`] || ''}
                      onChange={(e) => handleDenomCountChange(`d${val}`, e.target.value)}
                      placeholder="0"
                      className="w-20 px-2.5 py-1 text-center bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 text-xs shadow-2xs"
                    />
                    <span className="text-slate-400 font-bold text-xs">=</span>
                    <span className="font-black text-slate-800 text-right w-20 text-xs">
                      ₹ {((Number(tempDenom[`d${val}`]) || 0) * val).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}

                {/* Coins Row */}
                <div className="py-1 flex items-center justify-between gap-2">
                  <span className="font-extrabold text-slate-800 w-14 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-center shadow-2xs text-xs">
                    Coins
                  </span>
                  <span className="text-slate-400 font-bold text-xs">×</span>
                  <input
                    type="number"
                    min="0"
                    value={tempDenom.coins || ''}
                    onChange={(e) => handleDenomCountChange('coins', e.target.value)}
                    placeholder="0"
                    className="w-20 px-2.5 py-1 text-center bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 text-xs shadow-2xs"
                  />
                  <span className="text-slate-400 font-bold text-xs">=</span>
                  <span className="font-black text-slate-800 text-right w-20 text-xs">
                    ₹ {(Number(tempDenom.coins) || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Prominent Bottom Banner: Total Cash: ₹ [Calculated Sum] */}
              <div className="p-2.5 bg-gradient-to-r from-emerald-50 to-teal-50/80 rounded-xl border border-emerald-300/80 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                    Total Cash
                  </span>
                  <span className="text-base font-black text-emerald-700">
                    ₹ {calculateTempDenomTotal().toLocaleString('en-IN')}
                  </span>
                </div>
                {calculateTempDenomTotal() > 0 && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                    Will auto-fill Amount
                  </span>
                )}
              </div>

              {/* Seamless State Sync & Return Buttons */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setTempDenom({ d500: 0, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, coins: 0 });
                    setExpForm(prev => ({ ...prev, cashDenominations: null }));
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-bold cursor-pointer transition"
                >
                  Clear Notes
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDenomModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer transition active:scale-95"
                  >
                    Cancel / Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDenomination}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm cursor-pointer transition active:scale-95 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply / Save Denomination</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Inspector: Cash Denomination Breakdown Viewer */}
      {activeDenomViewer && (
        <div 
          className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          style={{ zIndex: 80 }}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150 relative"
            style={{ zIndex: 80 }}
          >
            <div className="px-5 py-4 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-700" />
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Cash Denomination Breakdown
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium truncate max-w-[200px] block">
                    {activeDenomViewer.date} • {activeDenomViewer.description}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDenomViewer(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-1 text-left">Denomination</th>
                    <th className="py-1 text-center">Count</th>
                    <th className="py-1 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[500, 200, 100, 50, 20, 10].map(val => {
                    const count = Number(activeDenomViewer.cashDenominations?.[`d${val}`]) || 0;
                    if (count === 0) return null;
                    return (
                      <tr key={val} className="py-2">
                        <td className="py-2 font-bold text-slate-700">₹{val}</td>
                        <td className="py-2 text-center text-slate-500 font-bold">{count}</td>
                        <td className="py-2 text-right font-black text-slate-800">
                          ₹ {(count * val).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                  {(Number(activeDenomViewer.cashDenominations?.coins) || 0) > 0 && (
                    <tr className="py-2">
                      <td className="py-2 font-bold text-slate-700">Coins</td>
                      <td className="py-2 text-center text-slate-500 font-bold">-</td>
                      <td className="py-2 text-right font-black text-slate-800">
                        ₹ {Number(activeDenomViewer.cashDenominations.coins).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-emerald-200/80 font-black">
                    <td colSpan={2} className="pt-3 text-slate-800 uppercase tracking-wider text-[10px]">
                      Total Cash Counted
                    </td>
                    <td className="pt-3 text-right text-emerald-700 text-sm">
                      ₹ {(Number(activeDenomViewer.cashDenominations?.total) || Number(activeDenomViewer.amount)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-semibold">Expense Amount:</span>
                <span className="font-extrabold text-slate-800">{formatCurrency(activeDenomViewer.amount)}</span>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setActiveDenomViewer(null)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Inspector: UPI Payment Screenshot Lightbox */}
      {activeReceiptModal && (
        <div 
          className="fixed inset-0 z-[80] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          style={{ zIndex: 80 }}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] relative"
            style={{ zIndex: 80 }}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
              activeReceiptModal.mode === 'Cash' ? 'bg-amber-50/80 border-amber-100' : 'bg-purple-50/80 border-purple-100'
            }`}>
              <div className="flex items-center gap-2">
                <Camera className={`w-4 h-4 ${activeReceiptModal.mode === 'Cash' ? 'text-amber-700' : 'text-purple-700'}`} />
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    {activeReceiptModal.mode === 'Cash' ? 'Cash Bill / Voucher Receipt' : 'Payment Screenshot / UPI Receipt'}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium truncate max-w-[260px] block">
                    {activeReceiptModal.date} • {activeReceiptModal.description} ({formatCurrency(activeReceiptModal.amount)})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveReceiptModal(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-900/5">
              {activeReceiptModal.receiptImage || activeReceiptModal.receiptUrl ? (
                <img
                  src={activeReceiptModal.receiptImage || activeReceiptModal.receiptUrl}
                  alt="Payment Receipt"
                  className="max-h-[60vh] w-auto max-w-full rounded-2xl shadow-lg border border-slate-200 object-contain bg-white"
                />
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No receipt image found for this transaction.
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between shrink-0 text-xs">
              <span className="text-slate-500 font-medium">
                Paid By: <strong className="text-slate-700">{activeReceiptModal.paidBy || 'Admin'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveReceiptModal(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
