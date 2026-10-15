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
  Clock
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

// Seed expenses supporting both current runtime dates & reference screenshot dates
const todayDisplay = formatDateToDisplay(getTodayYmd());
const yesterdayDisplay = formatDateToDisplay(getYesterdayYmd());
const weekAgoDisplay = formatDateToDisplay(getDaysAgoYmd(3));

const INITIAL_EXPENSES = [
  { id: 'exp_1', date: todayDisplay, description: 'Office Rent & Maintenance', amount: 5000, remarks: 'Monthly Branch Rent', mode: 'UPI', paidBy: 'Branch Manager' },
  { id: 'exp_2', date: yesterdayDisplay, description: 'Travel & Fuel Allowance', amount: 2000, remarks: 'Field Collection Visit', mode: 'Cash', paidBy: 'Field Officer' },
  { id: 'exp_3', date: weekAgoDisplay, description: 'Stationery & Printing', amount: 1500, remarks: 'Passbooks & Forms', mode: 'UPI', paidBy: 'Admin' },
  { id: 'exp_4', date: '03-05-2026', description: 'Stationery & Printing', amount: 1500, remarks: 'Passbooks & Forms', mode: 'UPI', paidBy: 'Admin' },
  { id: 'exp_5', date: '02-05-2026', description: 'Travel & Fuel', amount: 2000, remarks: 'Field Collection Visit', mode: 'Cash', paidBy: 'Field Officer' },
  { id: 'exp_6', date: '01-05-2026', description: 'Office Rent', amount: 5000, remarks: 'Monthly Branch Rent', mode: 'UPI', paidBy: 'Branch Manager' }
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

  // Focused Selected Date (for calendar highlight)
  const [selectedDate, setSelectedDate] = useState(getTodayYmd());

  // Calendar month state
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
          // Normalize any legacy 'Bank Transfer' modes to 'UPI'
          return parsed.map(p => ({
            ...p,
            mode: String(p.mode || '').toUpperCase().includes('CASH') ? 'Cash' : 'UPI'
          }));
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

  // Form State
  const [expForm, setExpForm] = useState({
    date: formatDateToDisplay(getTodayYmd()),
    description: '',
    amount: '',
    remarks: '',
    mode: 'Cash',
    paidBy: userProfile?.name || 'Admin'
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
              mode: String(data.mode || '').toUpperCase().includes('CASH') ? 'Cash' : 'UPI'
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

  // --- Filtered Expenses based on active Date Range ---
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => isDateInRange(e.date, fromDate, toDate));
  }, [expenses, fromDate, toDate]);

  // Aggregate Filtered Total Expense
  const totalFilteredExpense = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [filteredExpenses]);

  // --- KPI Card 1: Today's Summary (Expense) Metrics ---
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

  // --- Right Sidebar: Mini Expense Ledger Pagination / Limit ---
  const miniLedgerLimit = useMemo(() => {
    if (activePreset === 'Today' || activePreset === 'Yesterday') return 10;
    if (activePreset === 'Last Week') return 7;
    if (activePreset === 'Last Month') return 30;
    return 10;
  }, [activePreset]);

  const miniLedgerEntries = useMemo(() => {
    const sorted = [...expenses].sort((a, b) => {
      const ymdA = formatDateToYmd(a.date);
      const ymdB = formatDateToYmd(b.date);
      return ymdB.localeCompare(ymdA);
    });
    return sorted.slice(0, miniLedgerLimit);
  }, [expenses, miniLedgerLimit]);

  // Mini Ledger Row Click: Focus strictly on that date
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

  // --- Expense CRUD ---
  const handleOpenAddExpense = () => {
    setEditingExp(null);
    setExpForm({
      date: formatDateToDisplay(fromDate) || formatDateToDisplay(getTodayYmd()),
      description: '',
      amount: '',
      remarks: '',
      mode: 'Cash',
      paidBy: userProfile?.name || 'Admin'
    });
    setIsExpModalOpen(true);
  };

  const handleOpenEditExpense = (item) => {
    setEditingExp(item);
    setExpForm({
      date: item.date || formatDateToDisplay(getTodayYmd()),
      description: item.description || '',
      amount: item.amount || '',
      remarks: item.remarks && item.remarks !== '-' ? item.remarks : '',
      mode: String(item.mode || '').toUpperCase().includes('CASH') ? 'Cash' : 'UPI',
      paidBy: item.paidBy || userProfile?.name || 'Admin'
    });
    setIsExpModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const amt = Number(expForm.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    const payload = {
      date: expForm.date || formatDateToDisplay(getTodayYmd()),
      description: expForm.description.trim() || 'Expense',
      amount: amt,
      remarks: expForm.remarks.trim() || '-',
      mode: expForm.mode === 'Cash' ? 'Cash' : 'UPI',
      paidBy: expForm.paidBy.trim() || userProfile?.name || 'Admin',
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

  // Dynamic Card 1 Title
  const card1Title = useMemo(() => {
    if (activePreset === 'Today') return "Today's Summary (Expense)";
    if (activePreset === 'Yesterday') return "Yesterday's Summary (Expense)";
    if (activePreset === 'Last Week') return "Last Week's Summary (Expense)";
    if (activePreset === 'Last Month') return "Last Month's Summary (Expense)";
    return "Summary (Expense)";
  }, [activePreset]);

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

      {/* 2. Main Desktop Responsive Grid (75% Main Analytics & Table / 25% Calendar Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
        {/* ================= LEFT / MAIN COLUMN (75% / 9 cols) ================= */}
        <div className="lg:col-span-9 space-y-4 min-w-0">
          {/* Top Metric Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Card 1: Today's Summary (Expense) — Spacious, tall, prominent, no Collections badge */}
            <div className="md:col-span-7 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3.5 flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  {card1Title}
                </h3>
              </div>

              {/* 3 Spacious, Tall Metric Cards with Generous Padding & Prominent Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Total */}
                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 min-h-[96px] flex items-center gap-3.5 hover:bg-slate-50 transition shadow-2xs">
                  <div className="w-11 h-11 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
                    <span className="text-base sm:text-lg font-black text-slate-900 block whitespace-nowrap tracking-tight mt-0.5">
                      {formatCurrency(periodMetrics.total)}
                    </span>
                  </div>
                </div>

                {/* 2. Cash in Hand */}
                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 min-h-[96px] flex items-center gap-3.5 hover:bg-slate-50 transition shadow-2xs">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cash in Hand</span>
                    <span className="text-base sm:text-lg font-black text-slate-900 block whitespace-nowrap tracking-tight mt-0.5">
                      {formatCurrency(periodMetrics.cash)}
                    </span>
                  </div>
                </div>

                {/* 3. Cash in Online */}
                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 min-h-[96px] flex items-center gap-3.5 hover:bg-slate-50 transition shadow-2xs">
                  <div className="w-11 h-11 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cash in Online</span>
                    <span className="text-base sm:text-lg font-black text-slate-900 block whitespace-nowrap tracking-tight mt-0.5">
                      {formatCurrency(periodMetrics.online)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Preset Date Filter Panel (Replaces old 'Today' box) */}
            <div className="md:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Clock className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Filter Period
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full capitalize">
                  {activePreset}
                </span>
              </div>

              {/* Preset Pills: Today | Yesterday | Last Week | Last Month | Custom */}
              <div className="flex flex-wrap items-center gap-1.5">
                {['Today', 'Yesterday', 'Last Week', 'Last Month', 'Custom'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activePreset === preset
                        ? 'bg-blue-600 text-white shadow-2xs font-black'
                        : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Adjacent Date Inputs: From : [ DD-MM-YYYY ] | To : [ DD-MM-YYYY ] */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">From :</span>
                  <input
                    type="date"
                    value={formatDateToYmd(fromDate)}
                    onChange={(e) => handleCustomDateChange('from', e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">To :</span>
                  <input
                    type="date"
                    value={formatDateToYmd(toDate)}
                    onChange={(e) => handleCustomDateChange('to', e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ================= PRIMARY FULL-WIDTH EXPENSE ENTRY TABLE ================= */}
          <div className="bg-white rounded-2xl border border-rose-100/90 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-rose-100 flex flex-wrap items-center justify-between gap-3 bg-rose-50/20">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
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

              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-white border border-rose-200/80 rounded-xl text-xs font-extrabold text-rose-700 shadow-2xs">
                  Total: {formatCurrency(totalFilteredExpense)}
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddExpense}
                  className="bg-[#dc2626] hover:bg-[#b91c1c] text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Expense</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3 text-center w-12">S.No</th>
                    <th className="py-3 px-3 w-28">Date</th>
                    <th className="py-3 px-3 min-w-[160px]">Description</th>
                    <th className="py-3 px-3 text-right w-32">Amount (₹)</th>
                    <th className="py-3 px-3 min-w-[140px]">Remarks</th>
                    <th className="py-3 px-3 text-center w-28">Mode</th>
                    <th className="py-3 px-3 w-36">Paid By</th>
                    <th className="py-3 px-3 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredExpenses.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {item.description}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-rose-700 whitespace-nowrap text-xs sm:text-sm">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium">
                        {item.remarks || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {renderModeBadge(item.mode)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                            <User className="w-3 h-3" />
                          </div>
                          <span className="font-semibold text-slate-700 text-xs truncate max-w-[100px]">
                            {item.paidBy || 'Admin'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditExpense(item)}
                            title="Edit"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(item.id)}
                            title="Delete"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-semibold">
                        No expenses recorded for this period. Click "+ Add Expense" to record a new entry.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Summary Footer Calculating Total Expenses */}
                <tfoot>
                  <tr className="bg-rose-50/70 font-black border-t-2 border-rose-200/80 text-xs">
                    <td colSpan={3} className="py-3 px-3 text-slate-800 font-extrabold uppercase tracking-wide">
                      Total Expenses
                    </td>
                    <td className="py-3 px-3 text-right text-rose-700 font-black text-sm whitespace-nowrap">
                      {formatCurrency(totalFilteredExpense)}
                    </td>
                    <td colSpan={4} className="py-3 px-3 text-right text-slate-500 font-bold text-xs">
                      {filteredExpenses.length} {filteredExpenses.length === 1 ? 'Entry' : 'Entries'} Recorded
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ================= RIGHT / CALENDAR SIDEBAR (25% / 3 cols) ================= */}
        <div className="lg:col-span-3 space-y-4 min-w-0">
          {/* Scaled-down Compact Calendar Widget */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2.5">
            {/* Header: Select Date & Date Pill */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
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
                className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-extrabold text-slate-800">
                {monthNames[calendarMonth]} {calendarYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-extrabold text-slate-400 uppercase">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((slot, i) => {
                const isSelected = isSameDay(slot.dateStr, selectedDate);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleCalendarDayClick(slot.dateStr)}
                    className={`h-6.5 w-6.5 mx-auto rounded-full text-[11px] font-bold flex items-center justify-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : slot.isCurrentMonth
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {slot.dayNumber}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Expense History Ledger (Replaces old 'Details for [Date]' card) */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2.5">
            {/* Header: Title + Dynamic count pill */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                <Receipt className="w-3.5 h-3.5 text-rose-600" />
                <span>Recent Expenses</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                Total Entries: {miniLedgerEntries.length}
              </span>
            </div>

            {/* Compact Columns: S.No | Date | Expense (₹) */}
            <div className="max-h-64 overflow-y-auto overflow-x-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-[9px] font-black uppercase text-slate-400 border-b border-slate-100 bg-slate-50/60 sticky top-0 z-10">
                    <th className="py-1.5 px-2 text-center w-8">S.No</th>
                    <th className="py-1.5 px-2">Date</th>
                    <th className="py-1.5 px-2 text-right">Expense (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {miniLedgerEntries.map((item, idx) => {
                    const isSelected = isSameDay(item.date, fromDate) && isSameDay(item.date, toDate);
                    return (
                      <tr
                        key={item.id || idx}
                        onClick={() => handleDrillDownDate(item.date)}
                        className={`cursor-pointer transition-colors group ${
                          isSelected
                            ? 'bg-rose-50/80 font-bold text-rose-800'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                        title={`Click to filter main ledger by ${item.date}`}
                      >
                        <td className="py-2 px-2 text-center text-slate-400 font-semibold group-hover:text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap font-medium">
                          {formatDateToDisplay(item.date)}
                        </td>
                        <td className="py-2 px-2 text-right font-black text-rose-600 whitespace-nowrap">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    );
                  })}

                  {miniLedgerEntries.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400 text-xs font-medium">
                        No recent expenses
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add/Edit Expense */}
      {isExpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
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

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Rent, Travel & Fuel, Stationery"
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Mode</label>
                  <select
                    value={expForm.mode}
                    onChange={(e) => setExpForm({ ...expForm, mode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
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
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Field Visit, Office Supplies, Monthly"
                  value={expForm.remarks}
                  onChange={(e) => setExpForm({ ...expForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-500"
                />
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
    </div>
  );
}
