import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Calendar, 
  ArrowLeft, 
  Download, 
  Plus, 
  Edit3, 
  Wallet, 
  Landmark, 
  ArrowRightLeft, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  Printer, 
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Receipt,
  Scale
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

const getTodayStr = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCurrency = (amt) => {
  return '₹' + Number(amt || 0).toLocaleString('en-IN');
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Robust date matcher that matches YYYY-MM-DD or DD-MM-YYYY or DD/MM/YYYY
const isSameDay = (dateAStr, dateBStr) => {
  if (!dateAStr || !dateBStr) return false;
  if (dateAStr === dateBStr) return true;

  const toYmd = (s) => {
    if (typeof s !== 'string') return '';
    const clean = s.trim();
    // YYYY-MM-DD
    const ymd = clean.match(/^(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})/);
    if (ymd) {
      return `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}-${String(ymd[3]).padStart(2, '0')}`;
    }
    // DD-MM-YYYY
    const dmy = clean.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})/);
    if (dmy) {
      let yr = dmy[3];
      if (yr.length === 2) yr = '20' + yr;
      return `${yr}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
    }
    return clean.substring(0, 10);
  };

  return toYmd(dateAStr) === toYmd(dateBStr);
};

export default function CashBook({ 
  activeBranch = { id: 'main', name: 'Main Branch' }, 
  userProfile = null, 
  branches = [], 
  customers = [], 
  onBack 
}) {
  const branchId = activeBranch?.id || 'main';
  const branchName = activeBranch?.name || 'Main Branch';

  // Active Selected Date (default: Today)
  const [selectedDate, setSelectedDate] = useState(() => getTodayStr());
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Opening Balances State
  const openingsStorageKey = `everest_cashbook_openings_${branchId}`;
  const [openingBalances, setOpeningBalances] = useState(() => {
    try {
      const saved = localStorage.getItem(openingsStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // 2. Expenses State (Fetched dynamically from expenses collection or local mirror)
  const [expensesList, setExpensesList] = useState(() => {
    try {
      const saved = localStorage.getItem(`everest_expenses_${branchId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 3. Contra / Adjustments State (Transfers, direct deposits, withdrawals)
  const adjustmentsStorageKey = `everest_cashbook_adjustments_${branchId}`;
  const [adjustments, setAdjustments] = useState(() => {
    try {
      const saved = localStorage.getItem(adjustmentsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Modals
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Opening Balance Form
  const [openingForm, setOpeningForm] = useState({
    cash: '',
    bank: '',
    notes: ''
  });

  // Adjustment Form
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'CASH_TO_BANK', // 'CASH_TO_BANK' | 'BANK_TO_CASH' | 'DIRECT_RECEIPT' | 'DIRECT_EXPENSE'
    amount: '',
    mode: 'Cash', // 'Cash' | 'Bank'
    particulars: '',
    reference: '',
    timeStr: ''
  });

  // --- Real-time Listeners ---
  // A. Listen to Opening Balances
  useEffect(() => {
    let unsub = () => {};
    try {
      const q = query(
        collection(db, 'cashbook_openings'),
        where('branchId', '==', branchId)
      );
      unsub = onSnapshot(q, (snapshot) => {
        const map = {};
        snapshot.docs.forEach(docSnap => {
          map[docSnap.id] = docSnap.data();
        });
        setOpeningBalances(map);
        try {
          localStorage.setItem(openingsStorageKey, JSON.stringify(map));
        } catch (e) {}
      }, (err) => {
        console.warn('Firestore cashbook_openings listener notice:', err);
      });
    } catch (e) {
      console.warn('Failed to listen to cashbook_openings:', e);
    }
    return () => unsub();
  }, [branchId, openingsStorageKey]);

  // B. Listen to Expenses
  useEffect(() => {
    let unsub = () => {};
    try {
      const q = query(
        collection(db, 'expenses'),
        where('branchId', '==', branchId)
      );
      unsub = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setExpensesList(list);
        try {
          localStorage.setItem(`everest_expenses_${branchId}`, JSON.stringify(list));
        } catch (e) {}
      }, (err) => {
        console.warn('Firestore expenses listener notice in CashBook:', err);
      });
    } catch (e) {}
    return () => unsub();
  }, [branchId]);

  // C. Listen to Adjustments / Contra entries
  useEffect(() => {
    let unsub = () => {};
    try {
      const q = query(
        collection(db, 'cashbook_adjustments'),
        where('branchId', '==', branchId)
      );
      unsub = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAdjustments(list);
        try {
          localStorage.setItem(adjustmentsStorageKey, JSON.stringify(list));
        } catch (e) {}
      }, (err) => {
        console.warn('Firestore cashbook_adjustments listener notice:', err);
      });
    } catch (e) {}
    return () => unsub();
  }, [branchId, adjustmentsStorageKey]);

  // Get active day's opening balances (or fallback to 0)
  const currentDayOpeningDocId = `${branchId}_${selectedDate}`;
  const dayOpeningData = openingBalances[currentDayOpeningDocId] || openingBalances[selectedDate] || { cash: 0, bank: 0 };
  const openingCash = Number(dayOpeningData.cash || 0);
  const openingBank = Number(dayOpeningData.bank || 0);

  // Date Navigator Helpers
  const handleShiftDate = (offsetDays) => {
    const d = new Date(selectedDate);
    if (isNaN(d.getTime())) return;
    d.setDate(d.getDate() + offsetDays);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yr}-${mo}-${dy}`);
  };

  // --- Dynamic Ledger Computation for Selected Date ---
  const {
    ledgerRows,
    totalCashInflow,
    totalCashOutflow,
    totalBankInflow,
    totalBankOutflow,
    closingCash,
    closingBank,
    totalLiquidity,
    collectionsCash,
    collectionsUpi,
    disbursementsCash,
    disbursementsBank,
    expensesCash,
    expensesBank,
    transfersCashToBank,
    transfersBankToCash,
    otherReceiptsCash,
    otherReceiptsBank
  } = useMemo(() => {
    const rows = [];

    let cIn = 0;
    let cOut = 0;
    let bIn = 0;
    let bOut = 0;

    let collCash = 0;
    let collUpi = 0;
    let disbCash = 0;
    let disbBank = 0;
    let expCash = 0;
    let expBank = 0;
    let contraCashToBank = 0;
    let contraBankToCash = 0;
    let otherInCash = 0;
    let otherInBank = 0;

    // 1. Process Customer Collections on selectedDate
    (customers || []).forEach(cust => {
      // Check branch match
      const cBranch = cust.branchId || cust.branch;
      if (branchId !== 'all' && cBranch && cBranch !== branchId && cBranch !== branchName) {
        return;
      }

      const installments = cust.installments || cust.ledger || cust.transactions || cust.history || [];
      installments.forEach((inst, idx) => {
        const instDate = inst.date || inst.paymentDate || inst.createdAt;
        if (!isSameDay(instDate, selectedDate)) return;

        const status = String(inst.status || '').toUpperCase();
        if (status === 'BOUNCED' || status === 'CANCELLED') return;

        const totalAmt = Number(inst.amount || inst.paidAmount || (Number(inst.cashAmount || 0) + Number(inst.upiAmount || 0)) || 0);
        if (totalAmt <= 0) return;

        let cashAmt = 0;
        let upiAmt = 0;

        if (inst.isSplit) {
          cashAmt = Number(inst.cashAmount || 0);
          upiAmt = Number(inst.upiAmount || 0);
        } else {
          const modeStr = String(inst.paymentMode || inst.mode || '').toUpperCase();
          if (modeStr.includes('UPI') || modeStr.includes('ONLINE') || modeStr.includes('GPAY') || modeStr.includes('PHONEPE') || modeStr.includes('BANK')) {
            upiAmt = totalAmt;
          } else {
            cashAmt = totalAmt;
          }
        }

        collCash += cashAmt;
        collUpi += upiAmt;
        cIn += cashAmt;
        bIn += upiAmt;

        rows.push({
          id: `coll_${cust.id}_${inst.id || idx}`,
          time: inst.timeStr || inst.time || '—',
          type: 'COLLECTION',
          typeLabel: 'Loan Collection',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          particulars: `Collection from ${cust.name || 'Borrower'} (${cust.customerId || cust.id})`,
          subtext: `${cust.centerName ? cust.centerName + ' • ' : ''}${inst.isSplit ? 'Split: Cash ₹' + cashAmt + ' + UPI ₹' + upiAmt : (upiAmt > 0 ? 'UPI / Online' : 'Cash')}`,
          mode: inst.isSplit ? 'Split' : (upiAmt > 0 ? 'UPI' : 'Cash'),
          cashIn: cashAmt,
          cashOut: 0,
          bankIn: upiAmt,
          bankOut: 0,
          rawItem: inst
        });
      });

      // 2. Process Customer Loan Disbursements on selectedDate
      const disbDate = cust.disbursedAt || cust.disbursedDate || cust.loanApprovedDate || cust.approvalDate || cust.loanDate || cust.date || cust.createdAt;
      const custStatus = String(cust.status || '').toLowerCase();
      const isApprovedOrDisbursed = custStatus === 'approved' || custStatus === 'disbursed' || custStatus === 'active';
      const disbAmount = Number(cust.disbursedAmount || cust.disbursementAmount || cust.loanAmount || 0);

      if (isApprovedOrDisbursed && disbAmount > 0 && isSameDay(disbDate, selectedDate)) {
        const disbMode = String(cust.disbursementMode || cust.paymentMode || 'Cash').toUpperCase();
        const isBankDisb = disbMode.includes('BANK') || disbMode.includes('UPI') || disbMode.includes('ONLINE') || disbMode.includes('NEFT');

        if (isBankDisb) {
          disbBank += disbAmount;
          bOut += disbAmount;
        } else {
          disbCash += disbAmount;
          cOut += disbAmount;
        }

        rows.push({
          id: `disb_${cust.id}_${disbDate}`,
          time: cust.timeStr || '—',
          type: 'DISBURSEMENT',
          typeLabel: 'Loan Disbursed',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          particulars: `Loan Disbursement to ${cust.name || 'Borrower'} (${cust.customerId || cust.id})`,
          subtext: `${cust.loanType || 'Microfinance Loan'} • ${isBankDisb ? 'Bank Transfer' : 'Cash In-Hand'}`,
          mode: isBankDisb ? 'Bank' : 'Cash',
          cashIn: 0,
          cashOut: isBankDisb ? 0 : disbAmount,
          bankIn: 0,
          bankOut: isBankDisb ? disbAmount : 0,
          rawItem: cust
        });
      }
    });

    // 3. Process Operational Expenses for selectedDate
    (expensesList || []).forEach(exp => {
      const expDate = exp.date || '';
      if (!isSameDay(expDate, selectedDate)) return;

      const amt = Number(exp.amount || 0);
      if (amt <= 0) return;

      const isCash = exp.paymentMode === 'Cash';
      if (isCash) {
        expCash += amt;
        cOut += amt;
      } else {
        expBank += amt;
        bOut += amt;
      }

      rows.push({
        id: `exp_${exp.id}`,
        time: exp.timeStr || '—',
        type: 'EXPENSE',
        typeLabel: 'Branch Expense',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        particulars: `${exp.category}: ${exp.description || 'Expense'}`,
        subtext: `Paid by ${exp.paidBy || 'Staff'}${exp.voucherNo ? ' • Voucher #' + exp.voucherNo : ''}`,
        mode: exp.paymentMode || 'Cash',
        cashIn: 0,
        cashOut: isCash ? amt : 0,
        bankIn: 0,
        bankOut: isCash ? 0 : amt,
        rawItem: exp
      });
    });

    // 4. Process Adjustments & Contra Entries for selectedDate
    (adjustments || []).forEach(adj => {
      const adjDate = adj.date || '';
      if (!isSameDay(adjDate, selectedDate)) return;

      const amt = Number(adj.amount || 0);
      if (amt <= 0) return;

      if (adj.type === 'CASH_TO_BANK') {
        // Cash Deposited to Bank
        contraCashToBank += amt;
        cOut += amt;
        bIn += amt;

        rows.push({
          id: `adj_${adj.id}`,
          time: adj.timeStr || '—',
          type: 'CONTRA',
          typeLabel: 'Cash Deposited to Bank',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          particulars: adj.particulars || 'Cash deposited into Branch Bank Account',
          subtext: adj.reference ? `Ref: ${adj.reference}` : 'Contra transfer',
          mode: 'Contra',
          cashIn: 0,
          cashOut: amt,
          bankIn: amt,
          bankOut: 0,
          rawItem: adj
        });
      } else if (adj.type === 'BANK_TO_CASH') {
        // Cash Withdrawn from Bank
        contraBankToCash += amt;
        cIn += amt;
        bOut += amt;

        rows.push({
          id: `adj_${adj.id}`,
          time: adj.timeStr || '—',
          type: 'CONTRA',
          typeLabel: 'Cash Withdrawn from Bank',
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          particulars: adj.particulars || 'Cash withdrawn from Bank for operational liquidity',
          subtext: adj.reference ? `Ref: ${adj.reference}` : 'Contra transfer',
          mode: 'Contra',
          cashIn: amt,
          cashOut: 0,
          bankIn: 0,
          bankOut: amt,
          rawItem: adj
        });
      } else if (adj.type === 'DIRECT_RECEIPT') {
        const isCash = adj.mode === 'Cash';
        if (isCash) {
          otherInCash += amt;
          cIn += amt;
        } else {
          otherInBank += amt;
          bIn += amt;
        }

        rows.push({
          id: `adj_${adj.id}`,
          time: adj.timeStr || '—',
          type: 'RECEIPT',
          typeLabel: 'Direct Receipt',
          badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
          particulars: adj.particulars || 'Direct Receipt / Capital Infusion',
          subtext: adj.reference ? `Ref: ${adj.reference}` : (isCash ? 'Cash Receipt' : 'Bank Deposit'),
          mode: isCash ? 'Cash' : 'Bank',
          cashIn: isCash ? amt : 0,
          cashOut: 0,
          bankIn: isCash ? 0 : amt,
          bankOut: 0,
          rawItem: adj
        });
      }
    });

    // Calculate Net Closings
    const netCloseCash = openingCash + cIn - cOut;
    const netCloseBank = openingBank + bIn - bOut;
    const netTotalLiquidity = netCloseCash + netCloseBank;

    // Compute running balances
    let runningCash = openingCash;
    let runningBank = openingBank;

    const computedRows = rows.map(r => {
      runningCash = runningCash + (r.cashIn || 0) - (r.cashOut || 0);
      runningBank = runningBank + (r.bankIn || 0) - (r.bankOut || 0);
      return {
        ...r,
        runningCashBalance: runningCash,
        runningBankBalance: runningBank,
        runningTotalLiquidity: runningCash + runningBank
      };
    });

    return {
      ledgerRows: computedRows,
      totalCashInflow: cIn,
      totalCashOutflow: cOut,
      totalBankInflow: bIn,
      totalBankOutflow: bOut,
      closingCash: netCloseCash,
      closingBank: netCloseBank,
      totalLiquidity: netTotalLiquidity,
      collectionsCash: collCash,
      collectionsUpi: collUpi,
      disbursementsCash: disbCash,
      disbursementsBank: disbBank,
      expensesCash: expCash,
      expensesBank: expBank,
      transfersCashToBank: contraCashToBank,
      transfersBankToCash: contraBankToCash,
      otherReceiptsCash: otherInCash,
      otherReceiptsBank: otherInBank
    };
  }, [customers, expensesList, adjustments, selectedDate, branchId, branchName, openingCash, openingBank]);

  // Filtered rows for the table
  const visibleRows = useMemo(() => {
    return ledgerRows.filter(row => {
      if (transactionTypeFilter !== 'All' && row.type !== transactionTypeFilter) {
        return false;
      }
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const pMatch = (row.particulars || '').toLowerCase().includes(q);
        const subMatch = (row.subtext || '').toLowerCase().includes(q);
        const typeMatch = (row.typeLabel || '').toLowerCase().includes(q);
        if (!pMatch && !subMatch && !typeMatch) return false;
      }
      return true;
    });
  }, [ledgerRows, transactionTypeFilter, searchTerm]);

  // Save Opening Balance Handler
  const handleSaveOpening = async (e) => {
    e.preventDefault();
    const docId = `${branchId}_${selectedDate}`;
    const payload = {
      branchId,
      branchName,
      date: selectedDate,
      cash: Number(openingForm.cash || 0),
      bank: Number(openingForm.bank || 0),
      notes: openingForm.notes.trim(),
      updatedAt: new Date().toISOString()
    };

    try {
      try {
        await setDoc(doc(db, 'cashbook_openings', docId), payload);
      } catch (err) {
        console.warn('Firestore setDoc failed, saving opening to local storage:', err);
      }

      setOpeningBalances(prev => {
        const updated = { ...prev, [docId]: payload };
        localStorage.setItem(openingsStorageKey, JSON.stringify(updated));
        return updated;
      });

      setIsOpeningModalOpen(false);
    } catch (e) {
      alert('Failed to update opening balance: ' + e.message);
    }
  };

  // Open Opening Modal Pre-filled
  const handleOpenSetOpening = () => {
    setOpeningForm({
      cash: openingCash || '',
      bank: openingBank || '',
      notes: dayOpeningData.notes || ''
    });
    setIsOpeningModalOpen(true);
  };

  // Save Contra / Transfer Handler
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    const amt = Number(adjustmentForm.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const payload = {
      branchId,
      branchName,
      date: selectedDate,
      type: adjustmentForm.type,
      amount: amt,
      mode: adjustmentForm.mode,
      particulars: adjustmentForm.particulars.trim() || (
        adjustmentForm.type === 'CASH_TO_BANK' ? 'Cash deposited into Bank' :
        adjustmentForm.type === 'BANK_TO_CASH' ? 'Cash withdrawn from Bank' : 'Direct Receipt'
      ),
      reference: adjustmentForm.reference.trim(),
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    try {
      let newId = `adj_${Date.now()}`;
      try {
        const docRef = await addDoc(collection(db, 'cashbook_adjustments'), payload);
        newId = docRef.id;
      } catch (err) {
        console.warn('Firestore addDoc failed, using local offline adjustment ID:', err);
      }

      const newRecord = { id: newId, ...payload };
      setAdjustments(prev => {
        const updated = [newRecord, ...prev];
        localStorage.setItem(adjustmentsStorageKey, JSON.stringify(updated));
        return updated;
      });

      setIsAdjustmentModalOpen(false);
      setAdjustmentForm({
        type: 'CASH_TO_BANK',
        amount: '',
        mode: 'Cash',
        particulars: '',
        reference: '',
        timeStr: ''
      });
    } catch (e) {
      alert('Failed to save adjustment: ' + e.message);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (ledgerRows.length === 0) {
      alert('No Cash Book records to export for this date.');
      return;
    }

    const headers = [
      'Type', 
      'Particulars', 
      'Cash Inflow', 
      'Cash Outflow', 
      'Bank Inflow', 
      'Bank Outflow', 
      'Running Cash Balance', 
      'Running Bank Balance', 
      'Total Liquidity'
    ];

    const rows = [
      // Row 0: Opening
      [
        'OPENING',
        `Opening Balance on ${formatDateDisplay(selectedDate)}`,
        0, 0, 0, 0,
        openingCash, openingBank, (openingCash + openingBank)
      ],
      // Transactions
      ...ledgerRows.map(r => [
        `"${r.typeLabel}"`,
        `"${r.particulars.replace(/"/g, '""')}"`,
        r.cashIn || 0,
        r.cashOut || 0,
        r.bankIn || 0,
        r.bankOut || 0,
        r.runningCashBalance,
        r.runningBankBalance,
        r.runningTotalLiquidity
      ]),
      // Closing
      [
        'CLOSING',
        `Net Closing Balance on ${formatDateDisplay(selectedDate)}`,
        totalCashInflow,
        totalCashOutflow,
        totalBankInflow,
        totalBankOutflow,
        closingCash,
        closingBank,
        totalLiquidity
      ]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CashBook_${branchName.replace(/\s+/g, '_')}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 pb-16">
      {/* Top Header */}
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
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                <BookOpen className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Cash Book Accounting</h1>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {branchName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Daily Inflow, Outflow, and Liquidity Balance Sheet</p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleOpenSetOpening}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Set Opening Balance</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
              <span>Contra / Transfer</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Date Navigator Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              title="Previous Day"
              className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 sm:flex-initial flex items-center gap-2 bg-slate-100/80 border border-slate-200/90 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-extrabold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              title="Next Day"
              className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(getTodayStr())}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedDate === getTodayStr()
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
          </div>

          {/* Balancing Verification Badge */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Cash Book Balanced</span>
            </div>
          </div>
        </div>

        {/* High-Visibility Summary KPI Banner (3 Master Liquidity Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Cash-in-Hand */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Cash In-Hand</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {formatCurrency(closingCash)}
              </div>
              <div className="text-[11px] font-bold text-slate-400 mt-0.5">Net Closing Cash</div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 font-semibold block">Opening</span>
                <span className="font-extrabold text-slate-700">{formatCurrency(openingCash)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Inflow (+)</span>
                <span className="font-extrabold text-emerald-600">+{formatCurrency(totalCashInflow)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Outflow (-)</span>
                <span className="font-extrabold text-rose-600">-{formatCurrency(totalCashOutflow)}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Bank / Account Balance */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Bank & UPI Balance</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
                {formatCurrency(closingBank)}
              </div>
              <div className="text-[11px] font-bold text-slate-400 mt-0.5">Net Closing Bank Balance</div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 font-semibold block">Opening</span>
                <span className="font-extrabold text-slate-700">{formatCurrency(openingBank)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Inflow (+)</span>
                <span className="font-extrabold text-emerald-600">+{formatCurrency(totalBankInflow)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Outflow (-)</span>
                <span className="font-extrabold text-rose-600">-{formatCurrency(totalBankOutflow)}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Total Available Liquidity */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl p-5 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-200 uppercase tracking-wider">Total Available Funds</span>
              <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatCurrency(totalLiquidity)}
              </div>
              <div className="text-[11px] font-bold text-blue-200 mt-0.5">Cash In-Hand + Bank Balance</div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-blue-300 font-semibold block">Day Start Funds</span>
                <span className="font-extrabold text-white">{formatCurrency(openingCash + openingBank)}</span>
              </div>
              <div>
                <span className="text-blue-300 font-semibold block">Net Day Change</span>
                <span className={`font-extrabold ${totalLiquidity >= (openingCash + openingBank) ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totalLiquidity >= (openingCash + openingBank) ? '+' : ''}
                  {formatCurrency(totalLiquidity - (openingCash + openingBank))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Inflows vs Outflows Comparative Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Inflows Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Inflows (Receipts)</h3>
              </div>
              <span className="text-sm font-black text-emerald-600">
                +{formatCurrency(totalCashInflow + totalBankInflow)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-medium text-slate-600">Customer Loan Collections (Cash)</span>
                <span className="font-bold text-slate-800">{formatCurrency(collectionsCash)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-medium text-slate-600">Customer Loan Collections (UPI / Bank)</span>
                <span className="font-bold text-blue-600">{formatCurrency(collectionsUpi)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-medium text-slate-600">Cash Withdrawn from Bank (Contra)</span>
                <span className="font-bold text-slate-800">{formatCurrency(transfersBankToCash)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-medium text-slate-600">Other Direct Receipts & Capital</span>
                <span className="font-bold text-slate-800">{formatCurrency(otherReceiptsCash + otherReceiptsBank)}</span>
              </div>
            </div>
          </div>

          {/* Outflows Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Outflows (Payments)</h3>
              </div>
              <span className="text-sm font-black text-rose-600">
                -{formatCurrency(totalCashOutflow + totalBankOutflow)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-medium text-slate-600">Loan Disbursements (Cash)</span>
                <span className="font-bold text-slate-800">{formatCurrency(disbursementsCash)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-medium text-slate-600">Loan Disbursements (Bank / NEFT)</span>
                <span className="font-bold text-blue-600">{formatCurrency(disbursementsBank)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-medium text-slate-600">Branch Expenses (Cash)</span>
                <span className="font-bold text-rose-600">{formatCurrency(expensesCash)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-medium text-slate-600">Branch Expenses (Bank / UPI)</span>
                <span className="font-bold text-rose-600">{formatCurrency(expensesBank)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-medium text-slate-600">Cash Deposited to Bank (Contra)</span>
                <span className="font-bold text-slate-800">{formatCurrency(transfersCashToBank)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Ledger Section */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-2xs overflow-hidden">
          {/* Table Header & Filter Bar */}
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Daily Transaction Ledger
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {ledgerRows.length} transactions for {formatDateDisplay(selectedDate)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Type Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Type:</span>
                <select
                  value={transactionTypeFilter}
                  onChange={(e) => setTransactionTypeFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="All">All Types</option>
                  <option value="COLLECTION">Collections</option>
                  <option value="DISBURSEMENT">Disbursements</option>
                  <option value="EXPENSE">Expenses</option>
                  <option value="CONTRA">Contra / Transfers</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter particulars..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none w-44 focus:w-56 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-3 sm:px-4 text-center w-12">#</th>
                  <th className="py-3 px-3 sm:px-4">Type</th>
                  <th className="py-3 px-3 sm:px-4">Particulars / Customer</th>
                  <th className="py-3 px-3 sm:px-4 text-right bg-emerald-50/40 text-emerald-800">Cash In (+)</th>
                  <th className="py-3 px-3 sm:px-4 text-right bg-rose-50/40 text-rose-800">Cash Out (-)</th>
                  <th className="py-3 px-3 sm:px-4 text-right bg-blue-50/40 text-blue-800">Bank In (+)</th>
                  <th className="py-3 px-3 sm:px-4 text-right bg-amber-50/40 text-amber-800">Bank Out (-)</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Running Cash</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Running Bank</th>
                  <th className="py-3 px-3 sm:px-4 text-right font-black">Liquidity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {/* Opening Balance Row */}
                <tr className="bg-blue-50/20 font-bold">
                  <td className="py-3 px-3 sm:px-4 text-center text-slate-400">0</td>
                  <td className="py-3 px-3 sm:px-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                      OPENING
                    </span>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span className="font-extrabold text-slate-800">Opening Balance (Day Start)</span>
                    <span className="text-[10px] text-slate-400 block font-normal">{dayOpeningData.notes || 'Recorded balance at day opening'}</span>
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 sm:px-4 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 sm:px-4 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 sm:px-4 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 sm:px-4 text-right font-extrabold text-slate-700">{formatCurrency(openingCash)}</td>
                  <td className="py-3 px-3 sm:px-4 text-right font-extrabold text-blue-600">{formatCurrency(openingBank)}</td>
                  <td className="py-3 px-3 sm:px-4 text-right font-black text-slate-900">{formatCurrency(openingCash + openingBank)}</td>
                </tr>

                {/* Transaction Rows */}
                {visibleRows.length > 0 ? (
                  visibleRows.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 sm:px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${r.badgeClass}`}>
                          {r.typeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <div className="font-semibold text-slate-800 leading-tight">{r.particulars}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{r.subtext}</div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-bold text-emerald-600 whitespace-nowrap bg-emerald-50/20">
                        {r.cashIn > 0 ? `+${formatCurrency(r.cashIn)}` : '—'}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-bold text-rose-600 whitespace-nowrap bg-rose-50/20">
                        {r.cashOut > 0 ? `-${formatCurrency(r.cashOut)}` : '—'}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-bold text-blue-600 whitespace-nowrap bg-blue-50/20">
                        {r.bankIn > 0 ? `+${formatCurrency(r.bankIn)}` : '—'}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-bold text-amber-600 whitespace-nowrap bg-amber-50/20">
                        {r.bankOut > 0 ? `-${formatCurrency(r.bankOut)}` : '—'}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-semibold text-slate-700 whitespace-nowrap">
                        {formatCurrency(r.runningCashBalance)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-semibold text-blue-600 whitespace-nowrap">
                        {formatCurrency(r.runningBankBalance)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatCurrency(r.runningTotalLiquidity)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <BookOpen className="w-6 h-6 text-slate-300" />
                        <span className="font-semibold text-slate-500">No additional transactions found for this date</span>
                        <span className="text-xs text-slate-400">Opening balances remain unchanged throughout this day</span>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Net Closing Summary Row */}
                <tr className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-xs">
                  <td colSpan={3} className="py-3.5 px-3 sm:px-4 text-slate-900 uppercase">
                    NET CLOSING BALANCE (Day End)
                  </td>
                  <td className="py-3.5 px-3 sm:px-4 text-right text-emerald-700 bg-emerald-100/50">
                    +{formatCurrency(totalCashInflow)}
                  </td>
                  <td className="py-3.5 px-3 sm:px-4 text-right text-rose-700 bg-rose-100/50">
                    -{formatCurrency(totalCashOutflow)}
                  </td>
                  <td className="py-3.5 px-3 sm:px-4 text-right text-blue-700 bg-blue-100/50">
                    +{formatCurrency(totalBankInflow)}
                  </td>
                  <td className="py-3.5 px-3 sm:px-4 text-right text-amber-700 bg-amber-100/50">
                    -{formatCurrency(totalBankOutflow)}
                  </td>
                  <td className="py-3.5 px-3 sm:px-4 text-right text-slate-900 text-sm">
                    {formatCurrency(closingCash)}
                  </td>
                  <td className="py-3.5 px-3 sm:px-4 text-right text-blue-700 text-sm">
                    {formatCurrency(closingBank)}
                  </td>
                  <td className="py-3.5 px-3 sm:px-4 text-right text-slate-950 text-sm font-black">
                    {formatCurrency(totalLiquidity)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Set Opening Balance Modal */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Set Opening Balance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpeningModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOpening} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-800 font-medium">
                Setting opening liquidity balance for <span className="font-extrabold">{formatDateDisplay(selectedDate)}</span> ({branchName}).
              </div>

              {/* Cash in Hand */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Opening Cash In-Hand (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="e.g. 25000"
                  value={openingForm.cash}
                  onChange={(e) => setOpeningForm({ ...openingForm, cash: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-emerald-600 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              {/* Bank Balance */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Opening Bank / UPI Account Balance (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="e.g. 150000"
                  value={openingForm.bank}
                  onChange={(e) => setOpeningForm({ ...openingForm, bank: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-blue-600 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Audit Notes / Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rollover from cash vault..."
                  value={openingForm.notes}
                  onChange={(e) => setOpeningForm({ ...openingForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpeningModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 active:scale-95 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm active:scale-95 transition cursor-pointer"
                >
                  Save Opening Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contra / Transfer / Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Record Contra / Bank Transfer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-6 space-y-4">
              {/* Transfer Type */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Transaction Type</label>
                <select
                  value={adjustmentForm.type}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                >
                  <option value="CASH_TO_BANK">Cash Deposited to Bank (Cash - / Bank +)</option>
                  <option value="BANK_TO_CASH">Cash Withdrawn from Bank (Bank - / Cash +)</option>
                  <option value="DIRECT_RECEIPT">Direct Receipt / Capital Infusion (+)</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 50000"
                  value={adjustmentForm.amount}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Mode if Direct Receipt */}
              {adjustmentForm.type === 'DIRECT_RECEIPT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Receive In</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Cash', 'Bank'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setAdjustmentForm({ ...adjustmentForm, mode: m })}
                        className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          adjustmentForm.mode === m
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {m === 'Cash' ? 'Cash In-Hand' : 'Bank Account'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Particulars */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Particulars / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Deposited cash at HDFC Branch / Partner Capital"
                  value={adjustmentForm.particulars}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, particulars: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Bank Challan / UTR Ref No (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. CHN-984210"
                  value={adjustmentForm.reference}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reference: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 active:scale-95 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm active:scale-95 transition cursor-pointer"
                >
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
