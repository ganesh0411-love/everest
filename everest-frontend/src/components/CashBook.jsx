import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft,
  Home,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Download,
  Coins,
  Banknote,
  Smartphone,
  TrendingUp,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Wallet,
  Scale,
  ClipboardList,
  Calculator,
  Plus,
  X,
  Search,
  CheckCircle2
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';

// Date Helpers
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

export const parseDateToTimestamp = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return dateInput.getTime();
  }
  if (typeof dateInput === 'number' && !isNaN(dateInput)) {
    return dateInput;
  }
  if (typeof dateInput === 'object' && dateInput !== null) {
    if (typeof dateInput.toDate === 'function') {
      try { return dateInput.toDate().getTime(); } catch (e) {}
    }
    if (dateInput.seconds !== undefined) {
      return dateInput.seconds * 1000;
    }
  }

  const clean = String(dateInput).trim();
  if (!clean || clean === '[object Object]') return null;

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY with optional time
  const dmyMatch = clean.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?)?/i);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    let hh = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    let mm = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    let ss = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const ampm = dmyMatch[7] ? dmyMatch[7].toUpperCase() : '';
    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;

    return new Date(year, month - 1, day, hh, mm, ss).getTime();
  }

  // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD with optional time
  const ymdMatch = clean.match(/^(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?)?/i);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);

    let hh = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    let mm = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    let ss = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const ampm = ymdMatch[7] ? ymdMatch[7].toUpperCase() : '';
    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;

    return new Date(year, month - 1, day, hh, mm, ss).getTime();
  }

  // Fallback: Date.parse or new Date()
  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? null : parsed.getTime();
};

const formatDateToDisplay = (dateInput) => {
  const ts = parseDateToTimestamp(dateInput);
  if (!ts) return '';
  const d = new Date(ts);
  const dy = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const yr = d.getFullYear();
  return `${dy}-${mo}-${yr}`;
};

const formatDateToYmd = (dateInput) => {
  const ts = parseDateToTimestamp(dateInput);
  if (!ts) return '';
  const d = new Date(ts);
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
};

const formatCurrency = (amt) => {
  const val = Number(amt || 0);
  if (val < 0) {
    return '-₹ ' + Math.abs(val).toLocaleString('en-IN');
  }
  return '₹ ' + val.toLocaleString('en-IN');
};

const isSameDay = (dateA, dateB) => {
  const tsA = parseDateToTimestamp(dateA);
  const tsB = parseDateToTimestamp(dateB);
  if (!tsA || !tsB) return false;
  const dA = new Date(tsA).setHours(0, 0, 0, 0);
  const dB = new Date(tsB).setHours(0, 0, 0, 0);
  return dA === dB;
};

const isDateInRange = (dateStr, fromDateInput, toDateInput) => {
  const ts = parseDateToTimestamp(dateStr);
  const startTs = parseDateToTimestamp(fromDateInput);
  const endTs = parseDateToTimestamp(toDateInput);
  if (!ts || !startTs || !endTs) return false;
  const s = Math.min(new Date(startTs).setHours(0, 0, 0, 0), new Date(endTs).setHours(0, 0, 0, 0));
  const e = Math.max(new Date(startTs).setHours(23, 59, 59, 999), new Date(endTs).setHours(23, 59, 59, 999));
  return ts >= s && ts <= e;
};

// Resolves formal category name from expense item
const resolveExpenseCategory = (exp) => {
  const cat = String(exp?.category || '').trim();
  if (cat && cat.toLowerCase() !== 'others' && cat.toLowerCase() !== 'all categories') {
    return cat;
  }
  if (exp?.customCategory && String(exp.customCategory).trim()) {
    return String(exp.customCategory).trim();
  }
  const textToScan = `${exp?.description || ''} ${exp?.details || ''} ${exp?.remarks || ''}`.toLowerCase();
  if (/\b(fuel|petrol|diesel|travel|conveyance|km|bike|auto|bus|fare)\b/i.test(textToScan) || textToScan.includes('visit customer') || textToScan.includes('travel')) {
    return 'Fuel/Travel';
  }
  if (/\b(tea|coffee|snack|snacks|food|lunch|dinner|breakfast|refreshment|staff)\b/i.test(textToScan)) {
    return 'Tea & Snacks';
  }
  if (/\b(rent|lease|office space)\b/i.test(textToScan)) {
    return 'Office Rent';
  }
  if (/\b(stationery|paper|pen|books|notebook|print|printing|xerox)\b/i.test(textToScan)) {
    return 'Stationery';
  }
  if (/\b(recharge|mobile|phone|sim|internet|wifi|data pack)\b/i.test(textToScan)) {
    return 'Telephone / Internet';
  }
  if (/\b(electricity|eb|power|water|current bill|utility)\b/i.test(textToScan)) {
    return 'Electricity / Utilities';
  }
  if (/\b(repair|maintenance|cleaning|service|plumb|paint)\b/i.test(textToScan)) {
    return 'Maintenance';
  }
  if (/\b(salary|advance|wages|bonus)\b/i.test(textToScan)) {
    return 'Staff Salary / Advance';
  }
  return cat || 'Office Expense';
};

// Resolves descriptive notes/remarks
const resolveExpenseRemarks = (exp) => {
  const notes = [];
  const cat = String(exp?.category || '').trim().toLowerCase();
  const desc = String(exp?.description || exp?.details || '').trim();
  const rem = String(exp?.remarks || '').trim();

  if (desc && desc.toLowerCase() !== cat && desc.toLowerCase() !== 'office expense') {
    notes.push(desc);
  }
  if (rem && rem.toLowerCase() !== desc.toLowerCase() && rem.toLowerCase() !== cat && rem.toLowerCase() !== 'office expense') {
    notes.push(rem);
  }
  return notes.length > 0 ? notes.join(' - ') : '-';
};

// Strict Active Customer Validation:
// Identifies and excludes deleted, soft-deleted (Recycled), cancelled, or draft records.
export const isCustomerActive = (cust) => {
  if (!cust || typeof cust !== 'object') return false;

  // 1. Explicit deletion boolean flags
  if (
    cust.isDeleted === true ||
    cust.is_deleted === true ||
    cust.deleted === true ||
    cust.inRecycleBin === true ||
    cust.in_recycle_bin === true ||
    String(cust.isDeleted).toLowerCase() === 'true' ||
    String(cust.is_deleted).toLowerCase() === 'true' ||
    String(cust.deleted).toLowerCase() === 'true' ||
    cust.isArchived === true ||
    cust.archived === true
  ) {
    return false;
  }

  // 2. Deletion / recycling timestamp indicators
  if (
    cust.deletedAt ||
    cust.deleted_at ||
    cust.recycledAt ||
    cust.recycled_at ||
    cust.archivedAt
  ) {
    return false;
  }

  // 3. Customer status string check (e.g. Recycled, Deleted, Draft, Cancelled)
  const status = String(cust.status || '').trim().toLowerCase();
  if (
    status === 'recycled' ||
    status === 'deleted' ||
    status === 'inactive' ||
    status === 'draft' ||
    status === 'rejected' ||
    status === 'cancelled' ||
    status === 'canceled'
  ) {
    return false;
  }

  // 4. Loan status string check
  const loanStatus = String(cust.loanStatus || '').trim().toLowerCase();
  if (
    loanStatus === 'recycled' ||
    loanStatus === 'deleted' ||
    loanStatus === 'cancelled' ||
    loanStatus === 'canceled' ||
    loanStatus === 'rejected'
  ) {
    return false;
  }

  // 5. Customer status field check
  const custStatus = String(cust.customerStatus || '').trim().toLowerCase();
  if (
    custStatus === 'recycled' ||
    custStatus === 'deleted' ||
    custStatus === 'inactive' ||
    custStatus === 'cancelled' ||
    custStatus === 'canceled'
  ) {
    return false;
  }

  // 6. Name-based deletion tag check (e.g. "[DELETED] Mr. Prabhu")
  const name = String(cust.name || cust.customerName || '').toLowerCase();
  if (name.includes('[deleted]') || name.includes('(deleted)') || name.includes('[recycled]')) {
    return false;
  }

  return true;
};

// Comprehensive Earliest Transaction Date Computation:
// Scans across ALL active transactions: disbursements (debit outflows), collections (credits), expenses, and investments.
export const computeEarliestTransactionDate = ({
  customers = [],
  customLedgerData = null,
  liveExpenses = [],
  investments = [],
  manualParticulars = [],
  fallbackDate = new Date()
}) => {
  const allTimestamps = [];

  const rawCusts = customLedgerData || (customers && customers.length > 0 ? customers : (() => {
    try {
      const saved = localStorage.getItem('everest_customers');
      return saved ? JSON.parse(saved) : [];
    } catch (_e) { return []; }
  })());

  (rawCusts || []).forEach(cust => {
    if (!cust || !isCustomerActive(cust)) return;

    // 1. Check Disbursements (Debits)
    const custStatus = String(cust.status || '').toLowerCase();
    const isApprovedOrDisbursed = custStatus === 'approved' || custStatus === 'disbursed' || custStatus === 'active';
    const disbAmount = Number(cust.disbursedAmount || cust.disbursementAmount || cust.loanAmount || 0);

    if (isApprovedOrDisbursed && disbAmount > 0) {
      const disbDateCandidates = [
        cust.disbursedAt,
        cust.disbursedDate,
        cust.disbursementDate,
        cust.disbursed_at,
        cust.disbursement_date,
        cust.loanApprovedDate,
        cust.approvalDate,
        cust.loanDate,
        cust.date,
        cust.createdAt
      ];
      for (const cand of disbDateCandidates) {
        if (cand) {
          const ts = parseDateToTimestamp(cand);
          if (ts && !isNaN(ts)) {
            allTimestamps.push(ts);
            break;
          }
        }
      }
    }

    // 2. Check Collections (Credits / Installments)
    let rawInstallments = cust.installments || cust.ledger || cust.transactions || cust.history || [];
    try {
      const localLedger = localStorage.getItem(`everest_ledger_${cust.id}`);
      if (localLedger) {
        const parsed = JSON.parse(localLedger);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!Array.isArray(rawInstallments) || rawInstallments.length === 0) {
            rawInstallments = parsed;
          } else if (parsed.length > rawInstallments.length) {
            rawInstallments = parsed;
          }
        }
      }
    } catch (e) {}

    (rawInstallments || []).forEach(inst => {
      if (!inst || typeof inst !== 'object') return;
      if (inst.isDeleted === true || inst.deleted === true || inst.is_deleted === true) return;
      const status = String(inst.status || '').toUpperCase();
      if (status === 'BOUNCED' || status === 'CANCELLED' || status === 'DELETED') return;
      if (inst.mode === 'BOUNCED') return;

      const instDateCandidates = [
        inst.date,
        inst.paymentDate,
        inst.collection_date,
        inst.createdAt
      ];
      for (const cand of instDateCandidates) {
        if (cand) {
          const ts = parseDateToTimestamp(cand);
          if (ts && !isNaN(ts)) {
            allTimestamps.push(ts);
            break;
          }
        }
      }
    });
  });

  // 3. Check Live Expenses
  (liveExpenses || []).forEach(exp => {
    if (!exp || exp.isDeleted || exp.deleted) return;
    const expDateCandidates = [exp.date, exp.createdAt];
    for (const cand of expDateCandidates) {
      if (cand) {
        const ts = parseDateToTimestamp(cand);
        if (ts && !isNaN(ts)) {
          allTimestamps.push(ts);
          break;
        }
      }
    }
  });

  // 4. Check Live Investments
  (investments || []).forEach(inv => {
    if (!inv || inv.isDeleted || inv.deleted) return;
    const invDateCandidates = [inv.date, inv.createdAt];
    for (const cand of invDateCandidates) {
      if (cand) {
        const ts = parseDateToTimestamp(cand);
        if (ts && !isNaN(ts)) {
          allTimestamps.push(ts);
          break;
        }
      }
    }
  });

  // 5. Check Manual Particulars
  (manualParticulars || []).forEach(part => {
    if (!part || part.isDeleted || part.deleted) return;
    const partDateCandidates = [part.date, part.createdAt];
    for (const cand of partDateCandidates) {
      if (cand) {
        const ts = parseDateToTimestamp(cand);
        if (ts && !isNaN(ts)) {
          allTimestamps.push(ts);
          break;
        }
      }
    }
  });

  if (allTimestamps.length > 0) {
    return new Date(Math.min(...allTimestamps));
  }
  return fallbackDate || new Date();
};

export default function CashBook({ 
  activeBranch = { id: 'main', name: 'Main Branch' }, 
  userProfile = null, 
  branches = [], 
  customers = [], 
  onBack,
  onHome
}) {
  const branchId = activeBranch?.id || 'main';
  const branchName = activeBranch?.name || 'Main Branch';

  // Active Date Range Filter (default: Today)
  const [fromDate, setFromDate] = useState(() => getTodayYmd());
  const [toDate, setToDate] = useState(() => getTodayYmd());
  const [activePreset, setActivePreset] = useState('Today');

  // Input refs for programmatic showPicker() trigger
  const fromDateInputRef = useRef(null);
  const toDateInputRef = useRef(null);

  // Dynamic Yesterday calendar date for header based on active fromDate
  const yesterdayHeaderDate = useMemo(() => {
    const fromYmd = formatDateToYmd(fromDate);
    const parts = String(fromYmd).split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const dy = parseInt(parts[2], 10);
      const d = new Date(yr, mo, dy);
      d.setDate(d.getDate() - 1);
      const yDy = String(d.getDate()).padStart(2, '0');
      const yMo = String(d.getMonth() + 1).padStart(2, '0');
      const yYr = d.getFullYear();
      return `${yDy}-${yMo}-${yYr}`;
    }
    return formatDateToDisplay(getYesterdayYmd());
  }, [fromDate]);

  // 1. Investments State
  const investmentsKey = `everest_cashbook_investments_${branchId}`;
  const [investments, setInvestments] = useState(() => {
    try {
      const saved = localStorage.getItem(investmentsKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 2. Expenses State (Listening to expansion_expenses & legacy expenses)
  const [liveExpenses, setLiveExpenses] = useState(() => {
    try {
      const savedExp = localStorage.getItem(`everest_expansion_expenses_${branchId}`);
      return savedExp ? JSON.parse(savedExp) : [];
    } catch (e) {
      return [];
    }
  });

  // 3. Opening Balances State
  const openingsKey = `everest_cashbook_openings_${branchId}`;
  const [openingBalances, setOpeningBalances] = useState(() => {
    try {
      const saved = localStorage.getItem(openingsKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Modals
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
  const [isAddParticularsModalOpen, setIsAddParticularsModalOpen] = useState(false);
  const [isAllTransactionsModalOpen, setIsAllTransactionsModalOpen] = useState(false);
  const [isAllExpensesModalOpen, setIsAllExpensesModalOpen] = useState(false);

  // Manual Particulars State
  const particularsKey = `everest_cashbook_particulars_${branchId}`;
  const [manualParticulars, setManualParticulars] = useState(() => {
    try {
      const saved = localStorage.getItem(particularsKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Particulars Form
  const [particularsForm, setParticularsForm] = useState({
    date: formatDateToDisplay(toDate || fromDate),
    particularsCategory: 'Daily Collection',
    customParticulars: '',
    type: 'Credit',
    paymentType: 'Cash',
    amount: '',
    cashAmount: '',
    upiAmount: '',
    remarks: ''
  });

  // Investment Form
  const [investmentForm, setInvestmentForm] = useState({
    date: formatDateToDisplay(toDate || fromDate),
    particulars: '',
    amount: '',
    mode: 'Bank',
    remarks: ''
  });

  // Keep forms date synced when fromDate/toDate shifts
  useEffect(() => {
    setInvestmentForm(prev => ({
      ...prev,
      date: formatDateToDisplay(toDate || fromDate)
    }));
    setParticularsForm(prev => ({
      ...prev,
      date: formatDateToDisplay(toDate || fromDate)
    }));
  }, [fromDate, toDate]);

  // --- Real-time Listeners ---
  // A. Investments Listener
  useEffect(() => {
    let unsub = () => {};
    try {
      const q = query(collection(db, 'investments'), where('branchId', '==', branchId));
      unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setInvestments(list);
          try { localStorage.setItem(investmentsKey, JSON.stringify(list)); } catch (e) {}
        }
      }, (err) => console.warn('Investments listener notice:', err));
    } catch (e) {}
    return () => unsub();
  }, [branchId, investmentsKey]);

  // B. Expansion Expenses Listener
  useEffect(() => {
    let unsub = () => {};
    try {
      const q = query(collection(db, 'expansion_expenses'), where('branchId', '==', branchId));
      unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setLiveExpenses(list);
        }
      }, (err) => console.warn('Expansion expenses listener notice in CashBook:', err));
    } catch (e) {}
    return () => unsub();
  }, [branchId]);

  // C. CashBook Particulars Listener
  useEffect(() => {
    let unsub = () => {};
    try {
      const q = query(collection(db, 'cashbook_particulars'), where('branchId', '==', branchId));
      unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setManualParticulars(list);
          try { localStorage.setItem(particularsKey, JSON.stringify(list)); } catch (e) {}
        }
      }, (err) => console.warn('Particulars listener notice in CashBook:', err));
    } catch (e) {}
    return () => unsub();
  }, [branchId, particularsKey]);

  // Date Navigation Helpers (Shift both From & To dates)
  const handleShiftDate = (offsetDays) => {
    setActivePreset('Custom');
    const shift = (dInput) => {
      const ts = parseDateToTimestamp(dInput);
      if (!ts) return dInput;
      const d = new Date(ts);
      d.setDate(d.getDate() + offsetDays);
      const dy = String(d.getDate()).padStart(2, '0');
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const yr = d.getFullYear();
      return `${dy}-${mo}-${yr}`;
    };
    setFromDate(prev => shift(prev));
    setToDate(prev => shift(prev));
  };

  const handleSelectAllPeriod = () => {
    setActivePreset('All');
    const today = new Date();
    const earliestDate = computeEarliestTransactionDate({
      customers,
      liveExpenses,
      investments,
      manualParticulars,
      fallbackDate: today
    });
    setFromDate(formatDateToDisplay(earliestDate));
    setToDate(formatDateToDisplay(today));
  };

  const isTodaySelected = activePreset === 'Today' || (activePreset !== 'All' && isSameDay(fromDate, getTodayYmd()) && isSameDay(toDate, getTodayYmd()));
  const isYesterdaySelected = activePreset === 'Yesterday' || (activePreset !== 'All' && isSameDay(fromDate, getYesterdayYmd()) && isSameDay(toDate, getYesterdayYmd()));
  const isAllSelected = activePreset === 'All';

  // Handle Save Investment
  const handleSaveInvestment = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const numAmt = parseFloat(investmentForm.amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      alert('Please enter a valid investment amount.');
      return;
    }

    const newInv = {
      id: 'inv_' + Date.now(),
      branchId,
      date: formatDateToDisplay(investmentForm.date || toDate || fromDate),
      particulars: investmentForm.particulars?.trim() || 'Investment Entry',
      amount: numAmt,
      mode: investmentForm.mode || 'Bank',
      remarks: investmentForm.remarks?.trim() || 'Capital addition',
      createdAt: new Date().toISOString()
    };

    // 1. Immediately update local state
    const updated = [newInv, ...investments];
    setInvestments(updated);

    // 2. Persist locally
    try {
      localStorage.setItem(investmentsKey, JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage investment save notice:', err);
    }

    // 3. Reset form
    setInvestmentForm({
      date: formatDateToDisplay(toDate || fromDate),
      particulars: '',
      amount: '',
      mode: 'Bank',
      remarks: ''
    });

    // 4. Smoothly close modal immediately
    setIsInvestmentModalOpen(false);

    // 5. Non-blocking Firestore background sync
    try {
      addDoc(collection(db, 'investments'), newInv).catch(err => {
        console.warn('Firestore investment sync notice (saved locally):', err);
      });
    } catch (err) {
      console.warn('Saved investment locally:', err);
    }
  };

  // Handle Save Particulars
  const handleSaveParticulars = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let cAmt = 0;
    let uAmt = 0;
    let total = 0;

    if (particularsForm.paymentType === 'Split') {
      cAmt = parseFloat(particularsForm.cashAmount) || 0;
      uAmt = parseFloat(particularsForm.upiAmount) || 0;
      total = cAmt + uAmt;
    } else if (particularsForm.paymentType === 'UPI') {
      uAmt = parseFloat(particularsForm.amount) || 0;
      total = uAmt;
    } else {
      cAmt = parseFloat(particularsForm.amount) || 0;
      total = cAmt;
    }

    if (total <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const partName = particularsForm.particularsCategory === 'Other / Custom'
      ? (particularsForm.customParticulars?.trim() || 'Manual Adjustment')
      : particularsForm.particularsCategory;

    const newPart = {
      id: 'part_' + Date.now(),
      branchId,
      date: formatDateToDisplay(particularsForm.date || toDate || fromDate),
      particulars: partName,
      type: particularsForm.type || 'Credit',
      cashAmount: cAmt,
      upiAmount: uAmt,
      amount: total,
      mode: (cAmt > 0 && uAmt > 0) ? 'Split' : (uAmt > 0 ? 'UPI' : 'Cash'),
      remarks: particularsForm.remarks?.trim() || 'Manual Particulars Entry',
      createdAt: new Date().toISOString()
    };

    // 1. Immediately update in-memory ledger state
    const updated = [newPart, ...manualParticulars];
    setManualParticulars(updated);

    // 2. Persist locally to localStorage
    try {
      localStorage.setItem(particularsKey, JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage particulars save notice:', err);
    }

    // 3. Reset form state cleanly
    setParticularsForm({
      date: formatDateToDisplay(toDate || fromDate),
      particularsCategory: 'Daily Collection',
      customParticulars: '',
      type: 'Credit',
      paymentType: 'Cash',
      amount: '',
      cashAmount: '',
      upiAmount: '',
      remarks: ''
    });

    // 4. Smoothly close modal immediately
    setIsAddParticularsModalOpen(false);

    // 5. Non-blocking Firestore background sync
    try {
      addDoc(collection(db, 'cashbook_particulars'), newPart).catch(err => {
        console.warn('Firestore particulars sync notice (saved locally):', err);
      });
    } catch (err) {
      console.warn('Saved manual particulars locally:', err);
    }
  };

  // --- Dynamic Ledger Computation for Selected Date Range ---
  const {
    yesterdayTotal,
    yesterdayCash,
    yesterdayBank,
    todayInvestment,
    todayCredit,
    todayDebit,
    todayExpense,
    todayBalance,
    todayNetClosingBalance,
    todayCashInHand,
    todayCashOnline,
    allTransactionsList,
    allExpensesList
  } = useMemo(() => {
    const fromTs = parseDateToTimestamp(fromDate);
    const toTs = parseDateToTimestamp(toDate);
    const startDayTs = fromTs ? new Date(fromTs).setHours(0, 0, 0, 0) : 0;
    const endDayTs = toTs ? new Date(toTs).setHours(23, 59, 59, 999) : 0;
    const rangeStartTs = Math.min(startDayTs, endDayTs);
    const rangeEndTs = Math.max(startDayTs, endDayTs);

    const startYmd = formatDateToYmd(new Date(rangeStartTs));
    const endYmd = formatDateToYmd(new Date(rangeEndTs));

    // Strict Active Customer Filter Pipeline:
    // Build active customer directory and identify soft-deleted, recycled, or purged records.
    const activeCustomerIds = new Set();
    const activeCustomerNames = new Set();
    const deletedCustomerIds = new Set();
    const deletedCustomerNames = new Set();

    const hasPropCustomers = Array.isArray(customers) && customers.length > 0;
    const rawCustomerSource = hasPropCustomers ? customers : (() => {
      try {
        const saved = localStorage.getItem('everest_customers');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    })();

    (rawCustomerSource || []).forEach(c => {
      if (!c || typeof c !== 'object') return;
      const cId = String(c.id || c.customerId || c.docId || '').trim();
      const cName = String(c.name || c.customerName || '').trim().toLowerCase();

      if (isCustomerActive(c)) {
        if (cId) activeCustomerIds.add(cId);
        if (cName) activeCustomerNames.add(cName);
      } else {
        if (cId) deletedCustomerIds.add(cId);
        if (cName) deletedCustomerNames.add(cName);
      }
    });

    // Also inspect known deleted records from local storage if any
    try {
      const savedDeleted = localStorage.getItem('everest_deleted_customers');
      if (savedDeleted) {
        const parsedDel = JSON.parse(savedDeleted);
        if (Array.isArray(parsedDel)) {
          parsedDel.forEach(dc => {
            const dcId = String(dc.id || dc.customerId || '').trim();
            const dcName = String(dc.name || dc.customerName || '').trim().toLowerCase();
            if (dcId) deletedCustomerIds.add(dcId);
            if (dcName) deletedCustomerNames.add(dcName);
          });
        }
      }
    } catch (e) {}

    // Verified Active Customers List:
    // Strictly drops any customer marked as deleted/recycled or matching deleted registries.
    const allCust = (rawCustomerSource || []).filter(c => {
      if (!isCustomerActive(c)) return false;
      const cId = String(c.id || c.customerId || c.docId || '').trim();
      const cName = String(c.name || c.customerName || '').trim().toLowerCase();

      if (cId && deletedCustomerIds.has(cId)) return false;
      if (cName && deletedCustomerNames.has(cName)) return false;

      return true;
    });

    // Cumulative historical accumulators up to Yesterday (strictly < rangeStartTs)
    let histCreditCash = 0;
    let histCreditUpi = 0;
    let histDebitCash = 0;
    let histDebitBank = 0;
    let histInvCash = 0;
    let histInvBank = 0;
    let histExpCash = 0;
    let histExpOnline = 0;

    // Active period accumulators ([rangeStartTs, rangeEndTs])
    let liveCreditCash = 0;
    let liveCreditUpi = 0;
    let liveDebitCash = 0;
    let liveDebitBank = 0;
    let liveInvCash = 0;
    let liveInvBank = 0;
    let liveExpCash = 0;
    let liveExpOnline = 0;

    const dynamicTx = [];
    const dynamicExp = [];

    const rangeDateLabel = startYmd === endYmd
      ? formatDateToDisplay(startYmd)
      : `${formatDateToDisplay(startYmd)} - ${formatDateToDisplay(endYmd)}`;

    const isMainBranch = 
      branchId === 'all' || 
      branchId === 'main' || 
      String(branchName || '').toLowerCase() === 'main branch' || 
      String(branchName || '').toLowerCase() === 'main';

    // 1. Process Customer Collections (Credit Inflows)
    (allCust || []).forEach(cust => {
      if (!cust) return;
      const cBranch = cust.branchId || cust.branch;
      if (!isMainBranch && cBranch && cBranch !== branchId && cBranch !== branchName) {
        return;
      }

      // Re-verify active customer status
      if (!isCustomerActive(cust)) return;

      const cId = String(cust.id || cust.customerId || cust.docId || '').trim();
      const cName = String(cust.name || cust.customerName || '').trim().toLowerCase();
      if (deletedCustomerIds.has(cId) || deletedCustomerNames.has(cName)) return;

      // Map dynamic loan product name for this customer
      const rawType = String(cust.loanType || cust.scheme || cust.category || '').toLowerCase();
      let catName = 'Daily Collection';
      if (rawType.includes('agri')) {
        catName = 'Agri Loan Collection';
      } else if (rawType.includes('personal')) {
        catName = 'Personal Loan Collection';
      } else if (rawType.includes('monthly')) {
        catName = 'Monthly Collection';
      } else if (rawType.includes('weekly') || rawType.includes('micro')) {
        catName = 'Weekly Collection';
      } else if (rawType.includes('daily')) {
        catName = 'Daily Collection';
      } else if (cust.loanType || cust.scheme) {
        catName = cust.loanType || cust.scheme;
      }

      let rawInstallments = cust.installments || cust.ledger || cust.transactions || cust.history || [];
      try {
        const localLedger = localStorage.getItem(`everest_ledger_${cust.id}`);
        if (localLedger) {
          const parsed = JSON.parse(localLedger);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (!Array.isArray(rawInstallments) || rawInstallments.length === 0) {
              rawInstallments = parsed;
            } else if (parsed.length > rawInstallments.length) {
              rawInstallments = parsed;
            }
          }
        }
      } catch (e) {}

      (rawInstallments || []).forEach((inst, idx) => {
        if (!inst || typeof inst !== 'object') return;
        if (
          inst.isDeleted === true ||
          inst.deleted === true ||
          inst.is_deleted === true ||
          inst.deletedAt ||
          inst.deleted_at
        ) {
          return;
        }

        const instDate = inst.date || inst.paymentDate || inst.createdAt;
        const instTs = parseDateToTimestamp(instDate);
        if (!instTs) return;

        const status = String(inst.status || '').toUpperCase();
        if (
          status === 'BOUNCED' ||
          status === 'CANCELLED' ||
          status === 'DELETED' ||
          status === 'RECYCLED' ||
          status === 'VOID'
        ) {
          return;
        }
        if (inst.mode === 'BOUNCED') return;

        const totalAmt = Number(inst.amount || inst.paidAmount || (Number(inst.cashAmount || 0) + Number(inst.upiAmount || 0)) || 0);
        if (totalAmt <= 0) return;

        let cashAmt = 0;
        let upiAmt = 0;
        if (inst.isSplit) {
          cashAmt = Number(inst.cashAmount || 0);
          upiAmt = Number(inst.upiAmount || 0);
        } else {
          const modeStr = String(inst.paymentMode || inst.mode || inst.instrument || '').toUpperCase();
          if (modeStr.includes('UPI') || modeStr.includes('ONLINE') || modeStr.includes('BANK') || modeStr.includes('GPAY') || modeStr.includes('PHONEPE')) {
            upiAmt = totalAmt;
          } else {
            cashAmt = totalAmt;
          }
        }

        // Cumulative history strictly prior to fromDate (< rangeStartTs)
        if (instTs < rangeStartTs) {
          histCreditCash += cashAmt;
          histCreditUpi += upiAmt;
        }

        // Active range [rangeStartTs, rangeEndTs]
        if (instTs >= rangeStartTs && instTs <= rangeEndTs) {
          liveCreditCash += cashAmt;
          liveCreditUpi += upiAmt;

          const custName = cust.name || cust.customerName || 'Customer';
          const centerOrPhone = cust.centerName || cust.center || cust.groupName || '';
          const remarksInfo = centerOrPhone ? `${custName} (${centerOrPhone})` : custName;

          const timeStr = inst.timeStr || inst.time || '';
          let displayDate = formatDateToDisplay(instDate);
          if (timeStr) {
            displayDate = `${displayDate} • ${timeStr}`;
          } else {
            const d = new Date(instTs);
            const timeFormatted = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
            if (timeFormatted && !timeFormatted.startsWith('12:00:00') && !timeFormatted.startsWith('12:00 AM')) {
              displayDate = `${displayDate} • ${timeFormatted}`;
            }
          }

          dynamicTx.push({
            id: `col_${cust.id}_${inst.id || idx}_${instTs}`,
            date: displayDate,
            particulars: catName,
            type: 'Credit',
            cashAmount: cashAmt,
            upiAmount: upiAmt,
            amount: totalAmt,
            mode: (cashAmt > 0 && upiAmt > 0) ? 'Split' : (upiAmt > 0 ? 'UPI' : 'Cash'),
            remarks: remarksInfo,
            rawTimestamp: instTs
          });
        }
      });
    });

    // 2. Customer Disbursements (Debit Outflows)
    (allCust || []).forEach(cust => {
      if (!cust) return;
      const cBranch = cust.branchId || cust.branch;
      if (!isMainBranch && cBranch && cBranch !== branchId && cBranch !== branchName) {
        return;
      }

      // Re-verify active customer status
      if (!isCustomerActive(cust)) return;

      const cId = String(cust.id || cust.customerId || cust.docId || '').trim();
      const cName = String(cust.name || cust.customerName || '').trim().toLowerCase();
      if (deletedCustomerIds.has(cId) || deletedCustomerNames.has(cName)) return;

      // Loan status MUST NOT be deleted / cancelled / rejected
      const loanStatus = String(cust.loanStatus || '').toLowerCase();
      if (loanStatus === 'deleted' || loanStatus === 'cancelled' || loanStatus === 'canceled' || loanStatus === 'rejected') {
        return;
      }

      const disbDate = cust.disbursedAt || cust.disbursedDate || cust.loanApprovedDate || cust.date || cust.disbursementDate;
      const disbTs = parseDateToTimestamp(disbDate);
      const custStatus = String(cust.status || '').toLowerCase();
      const isApprovedOrDisbursed = custStatus === 'approved' || custStatus === 'disbursed' || custStatus === 'active';
      const disbAmount = Number(cust.disbursedAmount || cust.disbursementAmount || cust.loanAmount || 0);

      if (isApprovedOrDisbursed && disbAmount > 0 && disbTs) {
        const disbMode = String(cust.disbursementMode || cust.paymentMode || 'Cash').toUpperCase();
        const isBankDisb = disbMode.includes('BANK') || disbMode.includes('UPI') || disbMode.includes('ONLINE');

        const disbCash = isBankDisb ? 0 : disbAmount;
        const disbUpi = isBankDisb ? disbAmount : 0;

        // Cumulative history strictly prior to fromDate (< rangeStartTs)
        if (disbTs < rangeStartTs) {
          histDebitCash += disbCash;
          histDebitBank += disbUpi;
        }

        // Active range [rangeStartTs, rangeEndTs]
        if (disbTs >= rangeStartTs && disbTs <= rangeEndTs) {
          liveDebitCash += disbCash;
          liveDebitBank += disbUpi;

          const custName = cust.name || cust.customerName || 'Customer';
          const scheme = cust.loanType || cust.scheme || 'Loan';
          const loanId = cust.loanId || cust.id || '';
          const staffNote = cust.staffName || cust.agentName || 'Loan Payout';

          dynamicTx.push({
            id: `disb_${cust.id}_${disbTs}`,
            date: formatDateToDisplay(disbDate),
            particulars: `Disbursement - ${custName} (${scheme})`,
            type: 'Debit',
            cashAmount: disbCash,
            upiAmount: disbUpi,
            amount: disbAmount,
            mode: isBankDisb ? 'UPI' : 'Cash',
            remarks: loanId ? `Loan #${loanId} · ${staffNote}` : staffNote,
            rawTimestamp: disbTs
          });
        }
      }
    });

    // 3. Manual Particulars entries
    (manualParticulars || []).forEach((part) => {
      if (!part || typeof part !== 'object') return;
      if (
        part.isDeleted === true ||
        part.deleted === true ||
        part.is_deleted === true ||
        part.inRecycleBin === true ||
        part.deletedAt ||
        part.deleted_at
      ) {
        return;
      }
      const pStatus = String(part.status || '').toLowerCase();
      if (pStatus === 'deleted' || pStatus === 'recycled' || pStatus === 'cancelled' || pStatus === 'canceled') {
        return;
      }

      // Orphaned customer transaction check: If manual entry is linked to a customer, verify customer is active in directory
      const partCustId = String(part.customerId || part.custId || '').trim();
      if (partCustId && (!activeCustomerIds.has(partCustId) || deletedCustomerIds.has(partCustId))) {
        return; // Orphaned transaction referencing deleted customer
      }

      // If remarks or particulars mention a known deleted customer, exclude it
      const partText = `${part.particulars || ''} ${part.remarks || ''}`.toLowerCase();
      if (deletedCustomerNames.size > 0) {
        let isAssociatedWithDeleted = false;
        for (const delName of deletedCustomerNames) {
          if (delName && delName.length > 2 && partText.includes(delName)) {
            isAssociatedWithDeleted = true;
            break;
          }
        }
        if (isAssociatedWithDeleted) return;
      }

      const pDate = part.date || part.createdAt;
      const pTs = parseDateToTimestamp(pDate);
      if (!pTs) return;

      const amt = Number(part.amount || 0);
      if (amt <= 0) return;

      const cAmt = Number(part.cashAmount || 0);
      const uAmt = Number(part.upiAmount || 0);

      // Cumulative up to yesterday (< rangeStartTs)
      if (pTs < rangeStartTs) {
        if (part.type === 'Debit') {
          histDebitCash += cAmt;
          histDebitBank += uAmt;
        } else {
          histCreditCash += cAmt;
          histCreditUpi += uAmt;
        }
      }

      // Active range [rangeStartTs, rangeEndTs]
      if (pTs >= rangeStartTs && pTs <= rangeEndTs) {
        if (part.type === 'Debit') {
          liveDebitCash += cAmt;
          liveDebitBank += uAmt;
        } else {
          liveCreditCash += cAmt;
          liveCreditUpi += uAmt;
        }

        dynamicTx.push({
          id: part.id,
          date: formatDateToDisplay(pDate),
          particulars: part.particulars || 'Manual Adjustment',
          type: part.type || 'Credit',
          cashAmount: cAmt,
          upiAmount: uAmt,
          amount: amt,
          mode: part.mode || ((cAmt > 0 && uAmt > 0) ? 'Split' : (uAmt > 0 ? 'UPI' : 'Cash')),
          remarks: part.remarks || 'Manual Adjustment',
          rawTimestamp: pTs
        });
      }
    });

    // 4. Live Expenses
    (liveExpenses || []).forEach(exp => {
      if (!exp || typeof exp !== 'object') return;
      if (
        exp.isDeleted === true ||
        exp.deleted === true ||
        exp.is_deleted === true ||
        exp.deletedAt ||
        exp.deleted_at ||
        String(exp.status || '').toLowerCase() === 'deleted' ||
        String(exp.status || '').toLowerCase() === 'recycled'
      ) {
        return;
      }

      const expDate = exp.date || exp.createdAt;
      const expTs = parseDateToTimestamp(expDate);
      if (!expTs) return;

      const amt = Number(exp.amount || 0);
      if (amt <= 0) return;

      const isCash = String(exp.mode || '').toUpperCase().includes('CASH');
      const eCash = isCash ? amt : 0;
      const eOnline = isCash ? 0 : amt;

      // Cumulative up to yesterday (< rangeStartTs)
      if (expTs < rangeStartTs) {
        histExpCash += eCash;
        histExpOnline += eOnline;
      }

      // Active range [rangeStartTs, rangeEndTs]
      if (expTs >= rangeStartTs && expTs <= rangeEndTs) {
        liveExpCash += eCash;
        liveExpOnline += eOnline;

        const categoryName = resolveExpenseCategory(exp);
        const remarkText = resolveExpenseRemarks(exp);

        dynamicExp.push({
          id: exp.id,
          date: formatDateToDisplay(expDate),
          category: categoryName,
          details: categoryName,
          cashAmount: eCash,
          upiAmount: eOnline,
          amount: amt,
          mode: isCash ? 'Cash' : 'UPI',
          remarks: remarkText,
          rawTimestamp: expTs
        });
      }
    });

    // Consolidate period expenses into single row in Recent Transactions
    const totalPeriodExpenses = liveExpCash + liveExpOnline;
    if (totalPeriodExpenses > 0) {
      dynamicTx.push({
        id: `exp_consolidated_${rangeStartTs}_${rangeEndTs}`,
        date: rangeDateLabel,
        particulars: 'Official Expense',
        type: 'Expense',
        cashAmount: liveExpCash,
        upiAmount: liveExpOnline,
        amount: totalPeriodExpenses,
        mode: (liveExpCash > 0 && liveExpOnline > 0) ? 'Split' : (liveExpOnline > 0 ? 'UPI' : 'Cash'),
        remarks: `${dynamicExp.length} Branch Expense${dynamicExp.length > 1 ? 's' : ''} Combined`,
        rawTimestamp: rangeEndTs
      });
    }

    // 5. Live Investments
    (investments || []).forEach(inv => {
      if (!inv || typeof inv !== 'object') return;
      if (
        inv.isDeleted === true ||
        inv.deleted === true ||
        inv.is_deleted === true ||
        inv.deletedAt ||
        inv.deleted_at ||
        String(inv.status || '').toLowerCase() === 'deleted' ||
        String(inv.status || '').toLowerCase() === 'recycled'
      ) {
        return;
      }

      const invDate = inv.date || inv.createdAt;
      const invTs = parseDateToTimestamp(invDate);
      if (!invTs) return;

      const amt = Number(inv.amount || 0);
      if (amt <= 0) return;

      const isCash = String(inv.mode || '').toUpperCase().includes('CASH');
      const iCash = isCash ? amt : 0;
      const iBank = isCash ? 0 : amt;

      // Cumulative up to yesterday (< rangeStartTs)
      if (invTs < rangeStartTs) {
        histInvCash += iCash;
        histInvBank += iBank;
      }

      // Active range [rangeStartTs, rangeEndTs]
      if (invTs >= rangeStartTs && invTs <= rangeEndTs) {
        liveInvCash += iCash;
        liveInvBank += iBank;

        dynamicTx.push({
          id: inv.id,
          date: formatDateToDisplay(invDate),
          particulars: inv.particulars || 'Investment Entry',
          type: 'Investment',
          cashAmount: iCash,
          upiAmount: iBank,
          amount: amt,
          mode: isCash ? 'Cash' : 'UPI',
          remarks: inv.remarks || 'Capital Inflow',
          rawTimestamp: invTs
        });
      }
    });

    // Sort recent transactions by timestamp descending
    dynamicTx.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
    dynamicExp.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));

    // Cumulative Opening Balances as of the day before fromDate
    const openingDocId = `${branchId}_${startYmd}`;
    const dayOpening = openingBalances[openingDocId] || openingBalances[branchId] || openingBalances['initial'] || { cash: 0, bank: 0 };
    const baseOpeningCash = Number(dayOpening.cash ?? 0);
    const baseOpeningBank = Number(dayOpening.bank ?? 0);

    // Formula:
    // Cash in Hand (₹): Base Opening Cash + Cash Collections + Cash Investments - Cash Disbursements - Cash Expenses up to yesterday
    // Cash in Online (₹): Base Opening Online + UPI Collections + UPI Investments - UPI Disbursements - UPI Expenses up to yesterday
    const calcYesterdayCash = baseOpeningCash + histCreditCash + histInvCash - histDebitCash - histExpCash;
    const calcYesterdayBank = baseOpeningBank + histCreditUpi + histInvBank - histDebitBank - histExpOnline;

    const yCash = Math.max(0, calcYesterdayCash);
    const yBank = Math.max(0, calcYesterdayBank);
    const yTotal = yCash + yBank;

    // Real calculated values for active range (strict real data only, zero mock fallbacks)
    const tInv = liveInvCash + liveInvBank;
    const tCred = liveCreditCash + liveCreditUpi;
    const tDeb = liveDebitCash + liveDebitBank;
    const tExp = liveExpCash + liveExpOnline;

    // Formulas:
    // Today's Balance = Total Credit + Investment - Total Debit - Total Expense
    const tBal = (tCred + tInv) - (tDeb + tExp);

    // Today's Cash Account / Net Balance = Yesterday Balance + Today's Balance
    const netClosing = yTotal + tBal;

    // Split for Today's Cash Account:
    // Cash in Hand = Yesterday Cash in Hand + Today Cash Inflows - Today Cash Outflows
    // Cash in Online = Yesterday Cash in Online + Today UPI Inflows - Today UPI Outflows
    // Total Balance = Cash in Hand + Cash in Online (strictly equals Net Balance)
    const todayCashInHand = yCash + liveCreditCash + liveInvCash - liveDebitCash - liveExpCash;
    const todayCashOnline = yBank + liveCreditUpi + liveInvBank - liveDebitBank - liveExpOnline;

    return {
      yesterdayTotal: yTotal,
      yesterdayCash: yCash,
      yesterdayBank: yBank,
      todayInvestment: tInv,
      todayCredit: tCred,
      todayDebit: tDeb,
      todayExpense: tExp,
      todayBalance: tBal,
      todayNetClosingBalance: netClosing,
      todayCashInHand,
      todayCashOnline,
      allTransactionsList: dynamicTx,
      allExpensesList: dynamicExp
    };
  }, [fromDate, toDate, branchId, branchName, customers, liveExpenses, investments, openingBalances, manualParticulars]);

  // Sliced lists for desktop split containers (up to 20 rows for immediate visibility)
  const displayedTransactions = allTransactionsList.slice(0, 20);
  const displayedExpenses = allExpensesList.slice(0, 20);
  const totalExpensesCalculated = allExpensesList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Render Type Badge
  const renderTypeBadge = (type) => {
    switch (type) {
      case 'Credit':
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Credit</span>;
      case 'Expense':
        return <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Expense</span>;
      case 'Investment':
        return <span className="bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Investment</span>;
      case 'Debit':
        return <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Debit</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full text-[10px]">{type || '-'}</span>;
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!allTransactionsList || allTransactionsList.length === 0) {
      alert('No transaction records to export.');
      return;
    }

    const headers = ['S.No', 'Date', 'Particulars', 'Type', 'Cash (INR)', 'UPI (INR)', 'Total Amount (INR)', 'Remarks'];
    const rows = allTransactionsList.map((tx, idx) => {
      return [
        idx + 1,
        `"${tx.date || ''}"`,
        `"${(tx.particulars || '').replace(/"/g, '""')}"`,
        `"${tx.type || ''}"`,
        tx.cashAmount || 0,
        tx.upiAmount || 0,
        tx.amount || 0,
        `"${(tx.remarks || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateLabel = formatDateToDisplay(fromDate) === formatDateToDisplay(toDate)
      ? formatDateToDisplay(fromDate)
      : `${formatDateToDisplay(fromDate)}_to_${formatDateToDisplay(toDate)}`;
    link.setAttribute('download', `Everest_CashBook_${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="w-full min-h-screen bg-[#f1f5f9] text-slate-800 p-4 sm:p-6 lg:p-7 space-y-4 overflow-x-hidden">
      {/* ================= 1. HEADER ROW ================= */}
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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Calendar className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#1e293b] tracking-tight">
                Cash Book Accounting
              </h1>
            </div>
          </div>
        </div>

        {/* Top-Right Badges & Prominent Home Button */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {formatDateToDisplay(fromDate) === formatDateToDisplay(toDate)
                ? formatDateToDisplay(fromDate)
                : `${formatDateToDisplay(fromDate)} → ${formatDateToDisplay(toDate)}`}{' '}
              <span className="text-slate-400 font-normal">(Generated)</span>
            </span>
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

      {/* ================= 2. CONTROLS & FILTER BAR ================= */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Dual Date Range Stepper & Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              title="Previous Day"
              className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer active:scale-95 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* From Date Picker */}
            <button
              type="button"
              onClick={() => {
                try {
                  if (typeof fromDateInputRef.current?.showPicker === 'function') {
                    fromDateInputRef.current.showPicker();
                  } else {
                    fromDateInputRef.current?.focus();
                  }
                } catch (err) {
                  fromDateInputRef.current?.focus();
                }
              }}
              title="Select From Date"
              className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-xs font-extrabold text-slate-800 cursor-pointer transition shadow-2xs select-none active:scale-[0.98]"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0 pointer-events-none" />
              <span className="text-[10px] uppercase font-bold text-slate-400 pointer-events-none">FROM:</span>
              <span className="pointer-events-none">{formatDateToDisplay(fromDate)}</span>
              <span className="text-[10px] text-slate-400 pointer-events-none">▾</span>
              <input
                ref={fromDateInputRef}
                type="date"
                value={formatDateToYmd(fromDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    setActivePreset('Custom');
                    const newFrom = e.target.value;
                    setFromDate(newFrom);
                    if (newFrom > toDate) setToDate(newFrom);
                  }
                }}
                tabIndex={-1}
                aria-hidden="true"
                className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
              />
            </button>

            <span className="text-slate-400 font-bold text-xs select-none px-0.5">→</span>

            {/* To Date Picker */}
            <button
              type="button"
              onClick={() => {
                try {
                  if (typeof toDateInputRef.current?.showPicker === 'function') {
                    toDateInputRef.current.showPicker();
                  } else {
                    toDateInputRef.current?.focus();
                  }
                } catch (err) {
                  toDateInputRef.current?.focus();
                }
              }}
              title="Select To Date"
              className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-xs font-extrabold text-slate-800 cursor-pointer transition shadow-2xs select-none active:scale-[0.98]"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0 pointer-events-none" />
              <span className="text-[10px] uppercase font-bold text-slate-400 pointer-events-none">TO:</span>
              <span className="pointer-events-none">{formatDateToDisplay(toDate)}</span>
              <span className="text-[10px] text-slate-400 pointer-events-none">▾</span>
              <input
                ref={toDateInputRef}
                type="date"
                value={formatDateToYmd(toDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    setActivePreset('Custom');
                    const newTo = e.target.value;
                    setToDate(newTo);
                    if (newTo < fromDate) setFromDate(newTo);
                  }
                }}
                tabIndex={-1}
                aria-hidden="true"
                className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
              />
            </button>

            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              title="Next Day"
              className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer active:scale-95 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets: Yesterday, Today, All */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActivePreset('Yesterday');
                const yest = getYesterdayYmd();
                setFromDate(yest);
                setToDate(yest);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isYesterdaySelected
                  ? 'bg-blue-600 text-white font-extrabold shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePreset('Today');
                const today = getTodayYmd();
                setFromDate(today);
                setToDate(today);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isTodaySelected
                  ? 'bg-blue-600 text-white font-extrabold shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleSelectAllPeriod}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isAllSelected
                  ? 'bg-blue-600 text-white font-extrabold shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Right: Add Investment & Export CSV */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsInvestmentModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 text-xs font-extrabold shadow-2xs cursor-pointer active:scale-95 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Add Investment</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-2xs cursor-pointer active:scale-95 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ================= 3. TOP METRIC CARDS (3-COLUMN GRID) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Card 1: Yesterday Till (Soft Sky Blue Theme) */}
        <div className="bg-sky-50/70 rounded-2xl p-3.5 border border-sky-200/80 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-sky-950">
            <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span>Yesterday Till ({yesterdayHeaderDate})</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100/90 text-sky-700 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-sky-800/80 uppercase tracking-wider block">Today Opening Balance</span>
              <span className="text-xl sm:text-2xl font-black text-sky-950 tracking-tight">
                {formatCurrency(yesterdayTotal)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-sky-200/60 pt-3">
            <div className="flex items-center gap-2 bg-transparent p-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Banknote className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-sky-900/70 block truncate">Cash in Hand</span>
                <span className="text-xs sm:text-sm font-black text-sky-950 block truncate">{formatCurrency(yesterdayCash)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-transparent p-1">
              <div className="w-7 h-7 rounded-lg bg-sky-200/80 text-sky-800 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-sky-900/70 block truncate">Cash in Online</span>
                <span className="text-xs sm:text-sm font-black text-sky-950 block truncate">{formatCurrency(yesterdayBank)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Summary (Soft Mint Emerald Hero Theme) */}
        <div className="bg-emerald-50/60 rounded-2xl p-3.5 border-2 border-emerald-300 shadow-sm flex flex-col justify-between space-y-3 relative">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-950">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span>Today's Summary</span>
          </div>

          {/* 4 Distinct Pastel Mini-Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-emerald-100/80 border border-emerald-200 rounded-xl p-2 text-center flex flex-col items-center justify-center">
              <div className="w-6 h-6 rounded-lg bg-emerald-200/80 text-emerald-800 flex items-center justify-center mb-1">
                <Landmark className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-800/80 block">Investment</span>
              <span className="text-xs sm:text-sm font-black text-emerald-950">{formatCurrency(todayInvestment)}</span>
            </div>

            <div className="bg-blue-100/80 border border-blue-200 rounded-xl p-2 text-center flex flex-col items-center justify-center">
              <div className="w-6 h-6 rounded-lg bg-blue-200/80 text-blue-800 flex items-center justify-center mb-1">
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-blue-800/80 block">Total Credit</span>
              <span className="text-xs sm:text-sm font-black text-blue-950">{formatCurrency(todayCredit)}</span>
            </div>

            <div className="bg-rose-100/80 border border-rose-200 rounded-xl p-2 text-center flex flex-col items-center justify-center">
              <div className="w-6 h-6 rounded-lg bg-rose-200/80 text-rose-800 flex items-center justify-center mb-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-rose-800/80 block">Total Debit</span>
              <span className="text-xs sm:text-sm font-black text-rose-950">{formatCurrency(todayDebit)}</span>
            </div>

            <div className="bg-amber-100/80 border border-amber-200 rounded-xl p-2 text-center flex flex-col items-center justify-center">
              <div className="w-6 h-6 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center mb-1">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-amber-800/80 block">Total Expense</span>
              <span className="text-xs sm:text-sm font-black text-amber-950">{formatCurrency(todayExpense)}</span>
            </div>
          </div>

          {/* Bottom Banner (Crisp High-Contrast White with Clean Emerald Border) */}
          <div className="bg-white border border-emerald-300 rounded-xl py-2 px-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-xs">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Today's Balance :</span>
            </div>
            <span className={`text-base sm:text-lg font-black tracking-tight ${todayBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatCurrency(todayBalance)}
            </span>
          </div>
        </div>

        {/* Card 3: Today's Cash Account (Soft Lavender Purple Theme) */}
        <div className="bg-purple-50/70 rounded-2xl p-3.5 border border-purple-200/80 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-purple-950">
            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <span>Today's Cash Account</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100/90 text-purple-700 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-800/80 uppercase tracking-wider block">Today Closing Balance</span>
              <span className="text-xl sm:text-2xl font-black text-purple-950 tracking-tight">
                {formatCurrency(todayNetClosingBalance)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-purple-200/60 pt-3">
            <div className="flex items-center gap-2 bg-transparent p-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Banknote className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-purple-900/70 block truncate">Cash in Hand</span>
                <span className="text-xs sm:text-sm font-black text-purple-950 block truncate">{formatCurrency(todayCashInHand)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-transparent p-1">
              <div className="w-7 h-7 rounded-lg bg-purple-200/80 text-purple-800 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-purple-900/70 block truncate">Cash in Online</span>
                <span className="text-xs sm:text-sm font-black text-purple-950 block truncate">{formatCurrency(todayCashOnline)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 4. HORIZONTAL EQUATION BANNER (TODAY'S CASH FLOW) ================= */}
      <div className="w-full space-y-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
            <Coins className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <h3 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">
            Today's Cash Flow
          </h3>
        </div>

        <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-2 overflow-x-auto py-0.5">
          {/* 1. Yesterday Balance */}
          <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-2.5 flex-1 min-w-[130px] flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-blue-800/80 block truncate">Yesterday Balance</span>
              <span className="text-xs sm:text-sm font-black text-blue-950 block truncate">{formatCurrency(yesterdayTotal)}</span>
            </div>
          </div>

          <span className="text-sm font-black text-slate-500 px-1">+</span>

          {/* 2. Collection / Credit */}
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-2.5 flex-1 min-w-[130px] flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-emerald-800/80 block truncate">Collection / Credit</span>
              <span className="text-xs sm:text-sm font-black text-emerald-950 block truncate">{formatCurrency(todayCredit)}</span>
            </div>
          </div>

          <span className="text-sm font-black text-slate-500 px-1">+</span>

          {/* 3. Investment */}
          <div className="bg-purple-50/90 border border-purple-200 rounded-xl p-2.5 flex-1 min-w-[120px] flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-purple-800/80 block truncate">Investment</span>
              <span className="text-xs sm:text-sm font-black text-purple-950 block truncate">{formatCurrency(todayInvestment)}</span>
            </div>
          </div>

          <span className="text-sm font-black text-slate-500 px-1">-</span>

          {/* 4. Debit */}
          <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-2.5 flex-1 min-w-[120px] flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-rose-800/80 block truncate">Debit</span>
              <span className="text-xs sm:text-sm font-black text-rose-950 block truncate">{formatCurrency(todayDebit)}</span>
            </div>
          </div>

          <span className="text-sm font-black text-slate-500 px-1">-</span>

          {/* 5. Expense */}
          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-2.5 flex-1 min-w-[120px] flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-amber-800/80 block truncate">Expense</span>
              <span className="text-xs sm:text-sm font-black text-amber-950 block truncate">{formatCurrency(todayExpense)}</span>
            </div>
          </div>

          <span className="text-xl font-black text-slate-700">=</span>

          {/* 6. Net Balance (Highlighted Anchor Card) */}
          <div className="bg-emerald-100/80 border-2 border-emerald-400 rounded-xl p-3 sm:px-3.5 flex-1 min-w-[145px] flex items-center gap-2.5 shadow-sm text-emerald-950 font-bold">
            <div className="w-8 h-8 rounded-lg bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
              <Scale className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-emerald-900 block truncate">Net Balance</span>
              <span className="text-xs sm:text-base font-black text-emerald-950 block truncate">{formatCurrency(todayNetClosingBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 5. BOTTOM SPLIT LEDGERS (SIDE-BY-SIDE) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Container (~58% / 7 cols): Recent Transactions */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3 lg:col-span-7 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ClipboardList className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                Recent Transactions
              </h3>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddParticularsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 text-xs font-black shadow-2xs cursor-pointer active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Particulars</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAllTransactionsModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                View All &gt;
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/80">
                  <th rowSpan={2} className="py-2.5 px-2.5 text-center w-8 align-middle">S.No</th>
                  <th rowSpan={2} className="py-2.5 px-2.5 align-middle">Date</th>
                  <th rowSpan={2} className="py-2.5 px-2.5 align-middle">Particulars</th>
                  <th rowSpan={2} className="py-2.5 px-2.5 text-center align-middle">Type</th>
                  <th colSpan={2} className="py-1.5 px-2 text-center border-l border-r border-b border-slate-200/90 tracking-widest text-[9.5px]">MODE</th>
                  <th rowSpan={2} className="py-2.5 px-2.5 text-center whitespace-nowrap align-middle">Total Amount (₹)</th>
                  <th rowSpan={2} className="py-2.5 px-2.5 align-middle">Remarks</th>
                </tr>
                <tr className="bg-slate-100/80 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-1 px-2.5 text-right whitespace-nowrap border-l border-slate-200/80">Cash (₹)</th>
                  <th className="py-1 px-2.5 text-right whitespace-nowrap border-l border-r border-slate-200/80">UPI (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
                {displayedTransactions.map((tx, idx) => (
                  <tr key={tx.id || idx} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-2.5 px-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-600 font-bold text-[11px]">{tx.date}</td>
                    <td className="py-2.5 px-2.5 font-bold text-slate-800">{tx.particulars}</td>
                    <td className="py-2.5 px-2.5 text-center whitespace-nowrap">{renderTypeBadge(tx.type)}</td>
                    <td className="py-2.5 px-2.5 text-right font-black text-slate-700 whitespace-nowrap border-l border-slate-200/80 bg-slate-50/20">
                      {tx.cashAmount > 0 ? formatCurrency(tx.cashAmount) : <span className="text-slate-300 font-normal">-</span>}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-black text-slate-700 whitespace-nowrap border-l border-r border-slate-200/80 bg-slate-50/20">
                      {tx.upiAmount > 0 ? formatCurrency(tx.upiAmount) : <span className="text-slate-300 font-normal">-</span>}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-black text-slate-900 whitespace-nowrap">{formatCurrency(tx.amount)}</td>
                    <td className="py-2.5 px-2.5 text-slate-400 text-[11px] truncate max-w-[120px]" title={tx.remarks || '-'}>{tx.remarks || '-'}</td>
                  </tr>
                ))}
                {displayedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">No transactions recorded for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Container (~42% / 5 cols): Expense Calculation */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3 lg:col-span-5 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calculator className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                Expense Calculation
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAllExpensesModalOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              View All &gt;
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/80">
                  <th rowSpan={2} className="py-2.5 px-2.5 text-center w-8 align-middle">S.No</th>
                  <th rowSpan={2} className="py-2.5 px-2.5 align-middle">Date</th>
                  <th rowSpan={2} className="py-2.5 px-2.5 align-middle">Expense Category</th>
                  <th colSpan={2} className="py-1.5 px-2 text-center border-l border-r border-b border-slate-200/90 tracking-widest text-[9.5px]">MODE</th>
                  <th rowSpan={2} className="py-2.5 px-2.5 text-center whitespace-nowrap align-middle">Total (₹)</th>
                  <th rowSpan={2} className="py-2.5 px-2.5 align-middle">Remarks</th>
                </tr>
                <tr className="bg-slate-100/80 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-1 px-2.5 text-right whitespace-nowrap border-l border-slate-200/80">Cash (₹)</th>
                  <th className="py-1 px-2.5 text-right whitespace-nowrap border-l border-r border-slate-200/80">UPI (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
                {displayedExpenses.map((exp, idx) => (
                  <tr key={exp.id || idx} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-2.5 px-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-600 font-bold text-[11px]">{exp.date}</td>
                    <td className="py-2.5 px-2.5 font-bold text-slate-800">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/80 text-[11px] font-extrabold shadow-2xs">
                        {exp.category || exp.details || 'Office Expense'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-black text-slate-700 whitespace-nowrap border-l border-slate-200/80 bg-slate-50/20">
                      {exp.cashAmount > 0 ? formatCurrency(exp.cashAmount) : <span className="text-slate-300 font-normal">-</span>}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-black text-slate-700 whitespace-nowrap border-l border-r border-slate-200/80 bg-slate-50/20">
                      {exp.upiAmount > 0 ? formatCurrency(exp.upiAmount) : <span className="text-slate-300 font-normal">-</span>}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-black text-slate-900 whitespace-nowrap">{formatCurrency(exp.amount)}</td>
                    <td className="py-2.5 px-2.5 text-slate-500 font-medium text-[11px] truncate max-w-[130px]" title={exp.remarks || '-'}>{exp.remarks || '-'}</td>
                  </tr>
                ))}
                {displayedExpenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">No expenses recorded for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Banner */}
          <div className="bg-purple-50/60 border border-purple-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700">Total Expense</span>
            <span className="text-sm font-black text-purple-700 tracking-tight">
              {formatCurrency(totalExpensesCalculated)}
            </span>
          </div>
        </div>
      </div>

      {/* ================= MODAL: ADD INVESTMENT ================= */}
      {isInvestmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-purple-50/80 border-b border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-purple-700" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Add New Investment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInvestmentModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInvestment} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input
                    type="text"
                    required
                    placeholder="DD-MM-YYYY"
                    value={investmentForm.date}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 50000"
                    value={investmentForm.amount}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Particulars / Source *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Director Capital Infusion, Partner Deposit"
                  value={investmentForm.particulars}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, particulars: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Mode</label>
                <select
                  value={investmentForm.mode}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, mode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-purple-500 cursor-pointer"
                >
                  <option value="Bank">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI / Online</option>
                  <option value="Cash">Cash Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="Reference number or note"
                  value={investmentForm.remarks}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsInvestmentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95 transition"
                >
                  Record Investment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD PARTICULARS ================= */}
      {isAddParticularsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Add Particulars Entry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddParticularsModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveParticulars} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input
                    type="text"
                    required
                    placeholder="DD-MM-YYYY"
                    value={particularsForm.date}
                    onChange={(e) => setParticularsForm({ ...particularsForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transaction Type</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setParticularsForm({ ...particularsForm, type: 'Credit' })}
                      className={`py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                        particularsForm.type === 'Credit'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Credit (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setParticularsForm({ ...particularsForm, type: 'Debit' })}
                      className={`py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                        particularsForm.type === 'Debit'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Debit (-)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Particulars Category *</label>
                <select
                  value={particularsForm.particularsCategory}
                  onChange={(e) => setParticularsForm({ ...particularsForm, particularsCategory: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Daily Collection">Daily Collection</option>
                  <option value="Weekly Collection">Weekly Collection</option>
                  <option value="Monthly Collection">Monthly Collection</option>
                  <option value="Agri Loan Collection">Agri Loan Collection</option>
                  <option value="Personal Loan Collection">Personal Loan Collection</option>
                  <option value="Cash Adjustment">Cash Adjustment</option>
                  <option value="Bank Deposit / Transfer">Bank Deposit / Transfer</option>
                  <option value="Other / Custom">Other / Custom Description...</option>
                </select>
              </div>

              {particularsForm.particularsCategory === 'Other / Custom' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custom Particulars Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter particulars description"
                    value={particularsForm.customParticulars}
                    onChange={(e) => setParticularsForm({ ...particularsForm, customParticulars: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Mode Partition</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setParticularsForm({ ...particularsForm, paymentType: 'Cash' })}
                    className={`py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                      particularsForm.paymentType === 'Cash'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💵 Cash Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setParticularsForm({ ...particularsForm, paymentType: 'UPI' })}
                    className={`py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                      particularsForm.paymentType === 'UPI'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📱 UPI Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setParticularsForm({ ...particularsForm, paymentType: 'Split' })}
                    className={`py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                      particularsForm.paymentType === 'Split'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔀 Cash + UPI Split
                  </button>
                </div>

                {particularsForm.paymentType === 'Split' ? (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">💵 Cash Amount (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={particularsForm.cashAmount}
                        onChange={(e) => setParticularsForm({ ...particularsForm, cashAmount: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-purple-800 uppercase mb-1">📱 UPI Amount (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={particularsForm.upiAmount}
                        onChange={(e) => setParticularsForm({ ...particularsForm, upiAmount: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="col-span-2 pt-1 flex items-center justify-between text-xs font-black text-slate-700 border-t border-emerald-200/60">
                      <span>Combined Sum :</span>
                      <span className="text-emerald-700 text-sm">
                        {formatCurrency((parseFloat(particularsForm.cashAmount) || 0) + (parseFloat(particularsForm.upiAmount) || 0))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 25000"
                      value={particularsForm.amount}
                      onChange={(e) => setParticularsForm({ ...particularsForm, amount: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="Field agent name, center or audit note"
                  value={particularsForm.remarks}
                  onChange={(e) => setParticularsForm({ ...particularsForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddParticularsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95 transition"
                >
                  Record Particulars
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW ALL RECENT TRANSACTIONS ================= */}
      {isAllTransactionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-700" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  All Transactions ({allTransactionsList.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAllTransactionsModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 bg-slate-100/70">
                    <th rowSpan={2} className="py-2.5 px-2 text-center w-8 align-middle">S.No</th>
                    <th rowSpan={2} className="py-2.5 px-2 align-middle">Date</th>
                    <th rowSpan={2} className="py-2.5 px-2 align-middle">Particulars</th>
                    <th rowSpan={2} className="py-2.5 px-2 text-center align-middle">Type</th>
                    <th colSpan={2} className="py-1 px-2 text-center border-l border-r border-b border-slate-200 tracking-widest text-[9.5px]">MODE</th>
                    <th rowSpan={2} className="py-2.5 px-2 text-center whitespace-nowrap align-middle">Total Amount (₹)</th>
                    <th rowSpan={2} className="py-2.5 px-2 align-middle">Remarks</th>
                  </tr>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 bg-slate-100/70">
                    <th className="py-1 px-2 text-right whitespace-nowrap border-l border-slate-200">Cash (₹)</th>
                    <th className="py-1 px-2 text-right whitespace-nowrap border-l border-r border-slate-200">UPI (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {allTransactionsList.map((tx, idx) => (
                    <tr key={tx.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap text-slate-600 font-bold text-[11px]">{tx.date}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-800">{tx.particulars}</td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">{renderTypeBadge(tx.type)}</td>
                      <td className="py-2.5 px-2 text-right font-black text-slate-700 whitespace-nowrap border-l border-slate-200 bg-slate-50/20">
                        {tx.cashAmount > 0 ? formatCurrency(tx.cashAmount) : <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="py-2.5 px-2 text-right font-black text-slate-700 whitespace-nowrap border-l border-r border-slate-200 bg-slate-50/20">
                        {tx.upiAmount > 0 ? formatCurrency(tx.upiAmount) : <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-slate-900 whitespace-nowrap">{formatCurrency(tx.amount)}</td>
                      <td className="py-2.5 px-2 text-slate-400 text-[11px]">{tx.remarks || '-'}</td>
                    </tr>
                  ))}
                  {allTransactionsList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">No transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAllTransactionsModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-extrabold cursor-pointer hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW ALL EXPENSES ================= */}
      {isAllExpensesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-purple-50/80 border-b border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-700" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  All Expenses ({allExpensesList.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAllExpensesModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 bg-slate-100/70">
                    <th rowSpan={2} className="py-2.5 px-2 text-center w-8 align-middle">S.No</th>
                    <th rowSpan={2} className="py-2.5 px-2 align-middle">Date</th>
                    <th rowSpan={2} className="py-2.5 px-2 align-middle">Expense Category</th>
                    <th colSpan={2} className="py-1 px-2 text-center border-l border-r border-b border-slate-200 tracking-widest text-[9.5px]">MODE</th>
                    <th rowSpan={2} className="py-2.5 px-2 text-center whitespace-nowrap align-middle">Total (₹)</th>
                    <th rowSpan={2} className="py-2.5 px-2 align-middle">Remarks</th>
                  </tr>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 bg-slate-100/70">
                    <th className="py-1 px-2 text-right whitespace-nowrap border-l border-slate-200">Cash (₹)</th>
                    <th className="py-1 px-2 text-right whitespace-nowrap border-l border-r border-slate-200">UPI (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {allExpensesList.map((exp, idx) => (
                    <tr key={exp.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap text-slate-600 font-bold text-[11px]">{exp.date}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-800">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/80 text-[11px] font-extrabold shadow-2xs">
                          {exp.category || exp.details || 'Office Expense'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-black text-slate-700 whitespace-nowrap border-l border-slate-200 bg-slate-50/20">
                        {exp.cashAmount > 0 ? formatCurrency(exp.cashAmount) : <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="py-2.5 px-2 text-right font-black text-slate-700 whitespace-nowrap border-l border-r border-slate-200 bg-slate-50/20">
                        {exp.upiAmount > 0 ? formatCurrency(exp.upiAmount) : <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-slate-900 whitespace-nowrap">{formatCurrency(exp.amount)}</td>
                      <td className="py-2.5 px-2 text-slate-500 font-medium text-[11px]">{exp.remarks || '-'}</td>
                    </tr>
                  ))}
                  {allExpensesList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">No expenses found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAllExpensesModalOpen(false)}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-extrabold cursor-pointer hover:bg-purple-700 transition"
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
