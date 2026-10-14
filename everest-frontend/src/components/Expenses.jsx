import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Calendar, 
  Filter, 
  Trash2, 
  Edit2, 
  Download, 
  ArrowLeft, 
  Check, 
  X, 
  AlertTriangle, 
  ChevronDown, 
  Wallet, 
  CreditCard, 
  Building, 
  User, 
  FileText,
  Printer,
  Sparkles,
  TrendingDown
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';

const EXPENSE_CATEGORIES = [
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

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer'];

const getTodayStr = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCurrency = (amt) => {
  return '₹' + Number(amt || 0).toLocaleString('en-IN');
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    // YYYY-MM-DD -> DD/MM/YYYY
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function Expenses({ 
  activeBranch = { id: 'main', name: 'Main Branch' }, 
  userProfile = null, 
  branches = [], 
  onBack 
}) {
  const branchId = activeBranch?.id || 'main';
  const branchName = activeBranch?.name || 'Main Branch';
  const localStorageKey = `everest_expenses_${branchId}`;

  // Local state with immediate localStorage hydration
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'yesterday' | 'thisMonth' | 'all' | 'custom'
  const [fromDate, setFromDate] = useState(() => getTodayStr());
  const [toDate, setToDate] = useState(() => getTodayStr());
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [paymentModeFilter, setPaymentModeFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    date: getTodayStr(),
    category: 'Fuel/Travel',
    amount: '',
    paymentMode: 'Cash',
    description: '',
    paidBy: userProfile?.name || 'Admin',
    voucherNo: '',
    notes: ''
  });

  // Listen to Firestore real-time updates for active branch
  useEffect(() => {
    setIsLoading(true);
    let unsub = () => {};

    try {
      const q = query(
        collection(db, 'expenses'),
        where('branchId', '==', branchId)
      );

      unsub = onSnapshot(q, (snapshot) => {
        const firestoreList = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        // Merge with local fallback if Firestore returns docs
        setExpenses(firestoreList);
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(firestoreList));
        } catch (e) {
          console.warn('LocalStorage save failed:', e);
        }
        setIsLoading(false);
      }, (err) => {
        console.warn('Firestore expenses listener notice (using offline mirror):', err);
        setIsLoading(false);
      });
    } catch (e) {
      console.warn('Failed to attach Firestore expenses listener:', e);
      setIsLoading(false);
    }

    return () => unsub();
  }, [branchId, localStorageKey]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData({
      date: getTodayStr(),
      category: 'Fuel/Travel',
      amount: '',
      paymentMode: 'Cash',
      description: '',
      paidBy: userProfile?.name || 'Admin',
      voucherNo: `EXP-${Date.now().toString().slice(-6)}`,
      notes: ''
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (exp) => {
    setEditingExpense(exp);
    setFormData({
      date: exp.date || getTodayStr(),
      category: exp.category || 'Others',
      amount: exp.amount || '',
      paymentMode: exp.paymentMode || 'Cash',
      description: exp.description || '',
      paidBy: exp.paidBy || userProfile?.name || 'Admin',
      voucherNo: exp.voucherNo || '',
      notes: exp.notes || ''
    });
    setIsModalOpen(true);
  };

  // Save (Add or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    const numericAmount = Number(formData.amount);
    if (!numericAmount || numericAmount <= 0) {
      alert('Please enter a valid expense amount greater than 0.');
      return;
    }

    if (!formData.description.trim()) {
      alert('Please enter a short description or reason for this expense.');
      return;
    }

    const payload = {
      date: formData.date || getTodayStr(),
      category: formData.category,
      amount: numericAmount,
      paymentMode: formData.paymentMode,
      description: formData.description.trim(),
      paidBy: formData.paidBy.trim(),
      voucherNo: formData.voucherNo.trim(),
      notes: formData.notes.trim(),
      branchId: branchId,
      branchName: branchName,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingExpense) {
        // Update in Firestore
        try {
          await updateDoc(doc(db, 'expenses', editingExpense.id), payload);
        } catch (err) {
          console.warn('Firestore updateDoc failed, updating local state:', err);
        }

        // Update local state
        setExpenses(prev => {
          const updated = prev.map(item => item.id === editingExpense.id ? { ...item, ...payload } : item);
          localStorage.setItem(localStorageKey, JSON.stringify(updated));
          return updated;
        });
      } else {
        // Add new
        payload.createdAt = new Date().toISOString();
        let newId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        try {
          const docRef = await addDoc(collection(db, 'expenses'), payload);
          newId = docRef.id;
        } catch (err) {
          console.warn('Firestore addDoc failed, using local offline id:', err);
        }

        const newRecord = { id: newId, ...payload };
        setExpenses(prev => {
          const updated = [newRecord, ...prev];
          localStorage.setItem(localStorageKey, JSON.stringify(updated));
          return updated;
        });
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense: ' + error.message);
    }
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;
    try {
      try {
        await deleteDoc(doc(db, 'expenses', deletingExpense.id));
      } catch (err) {
        console.warn('Firestore deleteDoc failed, removing locally:', err);
      }

      setExpenses(prev => {
        const updated = prev.filter(item => item.id !== deletingExpense.id);
        localStorage.setItem(localStorageKey, JSON.stringify(updated));
        return updated;
      });

      setDeletingExpense(null);
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense: ' + error.message);
    }
  };

  // Helper date calculations
  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();
  const currentMonthPrefix = todayStr.substring(0, 7); // 'YYYY-MM'

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      const itemDate = item.date || '';

      // Date filtering
      if (dateFilter === 'today') {
        if (itemDate !== todayStr) return false;
      } else if (dateFilter === 'yesterday') {
        if (itemDate !== yesterdayStr) return false;
      } else if (dateFilter === 'thisMonth') {
        if (!itemDate.startsWith(currentMonthPrefix)) return false;
      } else if (dateFilter === 'custom') {
        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
      }

      // Category filter
      if (categoryFilter !== 'All' && item.category !== categoryFilter) {
        return false;
      }

      // Payment Mode filter
      if (paymentModeFilter !== 'All' && item.paymentMode !== paymentModeFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const catMatch = (item.category || '').toLowerCase().includes(q);
        const paidMatch = (item.paidBy || '').toLowerCase().includes(q);
        const voucherMatch = (item.voucherNo || '').toLowerCase().includes(q);
        const amtMatch = String(item.amount || '').includes(q);
        if (!descMatch && !catMatch && !paidMatch && !voucherMatch && !amtMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (sortOrder === 'desc') {
        return dateB.localeCompare(dateA) || (b.createdAt || '').localeCompare(a.createdAt || '');
      } else {
        return dateA.localeCompare(dateB) || (a.createdAt || '').localeCompare(b.createdAt || '');
      }
    });
  }, [expenses, dateFilter, todayStr, yesterdayStr, currentMonthPrefix, fromDate, toDate, categoryFilter, paymentModeFilter, searchTerm, sortOrder]);

  // KPI Calculations
  const metrics = useMemo(() => {
    let todayTotal = 0;
    let monthTotal = 0;
    let cashTotal = 0;
    let bankTotal = 0;
    let filteredSum = 0;

    expenses.forEach(item => {
      const amt = Number(item.amount || 0);
      const itemDate = item.date || '';

      if (itemDate === todayStr) {
        todayTotal += amt;
      }
      if (itemDate.startsWith(currentMonthPrefix)) {
        monthTotal += amt;
      }
    });

    filteredExpenses.forEach(item => {
      const amt = Number(item.amount || 0);
      filteredSum += amt;
      if (item.paymentMode === 'Cash') {
        cashTotal += amt;
      } else {
        bankTotal += amt;
      }
    });

    return {
      todayTotal,
      monthTotal,
      filteredSum,
      cashTotal,
      bankTotal,
      filteredCount: filteredExpenses.length
    };
  }, [expenses, filteredExpenses, todayStr, currentMonthPrefix]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert('No expense records to export.');
      return;
    }

    const headers = ['Date', 'Category', 'Description', 'Payment Mode', 'Paid By', 'Voucher No', 'Amount (INR)'];
    const rows = filteredExpenses.map(item => [
      `"${item.date || ''}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      `"${item.paymentMode || 'Cash'}"`,
      `"${(item.paidBy || '').replace(/"/g, '""')}"`,
      `"${item.voucherNo || ''}"`,
      Number(item.amount || 0)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expenses_${branchName.replace(/\s+/g, '_')}_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 pb-16">
      {/* Top Banner / Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                title="Back to Dashboard"
                className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
                <Receipt className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Expenses Management</h1>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {branchName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Record, track, and audit operational branch expenses</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="h-9 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Today's Expenses */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Today's Expenses</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900">
              {formatCurrency(metrics.todayTotal)}
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-400">
              Recorded on {formatDateDisplay(todayStr)}
            </div>
          </div>

          {/* Card 2: Month-to-Date Expenses */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Month-to-Date (MTD)</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900">
              {formatCurrency(metrics.monthTotal)}
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-400">
              Current calendar month
            </div>
          </div>

          {/* Card 3: Filtered Total */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Filtered Total</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-purple-700">
              {formatCurrency(metrics.filteredSum)}
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-400">
              {metrics.filteredCount} entries in current view
            </div>
          </div>

          {/* Card 4: Cash vs Bank Split */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Payment Mode Split</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Cash</span>
                <p className="text-sm sm:text-base font-extrabold text-slate-800">{formatCurrency(metrics.cashTotal)}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Bank / UPI</span>
                <p className="text-sm sm:text-base font-extrabold text-blue-600">{formatCurrency(metrics.bankTotal)}</p>
              </div>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-medium">Active filter scope</div>
          </div>
        </div>

        {/* Control & Filter Strip */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
          {/* Row 1: Period Presets & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Period Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom Range' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDateFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    dateFilter === tab.id
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search description, payee, category, amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Custom Date Inputs & Category / Mode dropdowns */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Payment Mode Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Mode:</span>
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="All">All Modes</option>
                {PAYMENT_MODES.map(mode => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>

            {/* Sort Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="ml-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1 transition cursor-pointer"
            >
              <span>Date</span>
              <span className="text-[10px] text-rose-600 uppercase font-black">{sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}</span>
            </button>
          </div>
        </div>

        {/* Expenses Ledger Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Expense Records ({filteredExpenses.length})
            </h2>
            <div className="text-xs font-bold text-slate-500">
              Total: <span className="text-rose-600 font-black">{formatCurrency(metrics.filteredSum)}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3 sm:px-4 text-center w-12">#</th>
                  <th className="py-3 px-3 sm:px-4">Date</th>
                  <th className="py-3 px-3 sm:px-4">Category</th>
                  <th className="py-3 px-3 sm:px-4">Description</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Mode</th>
                  <th className="py-3 px-3 sm:px-4">Paid By</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Amount</th>
                  <th className="py-3 px-3 sm:px-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((item, index) => {
                    const isCash = item.paymentMode === 'Cash';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 sm:px-4 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3 sm:px-4 font-semibold text-slate-700 whitespace-nowrap">
                          {formatDateDisplay(item.date)}
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="font-semibold text-slate-800 line-clamp-1">{item.description}</div>
                          {item.voucherNo && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {item.voucherNo}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            isCash 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {item.paymentMode}
                          </span>
                        </td>
                        <td className="py-3 px-3 sm:px-4 font-medium text-slate-600 whitespace-nowrap">
                          {item.paidBy || '—'}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-black text-rose-600 text-sm whitespace-nowrap">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Expense"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingExpense(item)}
                              title="Delete Expense"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Receipt className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                        <span className="font-semibold text-slate-500">No expense records found</span>
                        <span className="text-xs text-slate-400">Try adjusting your filters or record a new expense</span>
                        <button
                          type="button"
                          onClick={handleOpenAdd}
                          className="mt-2 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-2xs hover:bg-rose-700 cursor-pointer transition"
                        >
                          + Add First Expense
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-rose-600 outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Expense Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Payment Mode Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_MODES.map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMode: mode })}
                      className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        formData.paymentMode === mode
                          ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description / Particulars</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Petrol for center visit, tea for clients..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Paid By */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Paid By (Staff / Admin)</label>
                  <input
                    type="text"
                    value={formData.paidBy}
                    onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>

                {/* Voucher / Ref */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Voucher / Receipt No (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. V-1024"
                    value={formData.voucherNo}
                    onChange={(e) => setFormData({ ...formData, voucherNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 active:scale-95 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingExpense ? 'Update Expense' : 'Save Expense'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h4 className="text-base font-extrabold text-slate-900">Delete Expense Record?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete the expense of <span className="font-bold text-rose-600">{formatCurrency(deletingExpense.amount)}</span> for <span className="font-bold text-slate-700">"{deletingExpense.description}"</span>? This cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm active:scale-95 transition cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
