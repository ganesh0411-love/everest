import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Wallet, Target, HandCoins } from 'lucide-react';

const getTodayStr = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
};

const parseToNativeDate = (ddMmYyyy) => {
  if (!ddMmYyyy) return '';
  const parts = ddMmYyyy.split('-');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return '';
};

const formatFromNativeDate = (yyyyMmDd) => {
  if (!yyyyMmDd) return '';
  const parts = yyyyMmDd.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return yyyyMmDd;
};

const parseDateToTimestamp = (dStr) => {
  if (!dStr) return null;
  if (dStr instanceof Date) return dStr.getTime();
  if (typeof dStr === 'object' && dStr.seconds !== undefined) return dStr.seconds * 1000;

  if (typeof dStr === 'string') {
    const cleanStr = dStr.trim();
    // DD-MM-YYYY or DD.MM.YYYY or DD/MM/YYYY
    const dmyMatch = cleanStr.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) year += 2000;
      return new Date(year, month - 1, day).getTime();
    }
    // YYYY-MM-DD
    const ymdMatch = cleanStr.match(/^(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);
      return new Date(year, month - 1, day).getTime();
    }
  }
  const parsed = new Date(dStr);
  return isNaN(parsed.getTime()) ? null : parsed.getTime();
};

const resolvePaymentMode = (inst) => {
  if (!inst) return 'Cash';
  const rawMode = (
    inst.mode || 
    inst.paymentMode || 
    inst.instrument || 
    inst.paymentType || 
    inst.type || 
    inst.payMode || 
    inst.method ||
    ''
  ).toString().trim();

  if (rawMode) {
    const lower = rawMode.toLowerCase();
    if (lower.includes('upi') || lower.includes('online') || lower.includes('gpay') || lower.includes('phonepe') || lower.includes('paytm') || lower.includes('qr') || lower.includes('bank')) {
      return 'UPI';
    }
    if (lower.includes('cash')) {
      return 'Cash';
    }
    return rawMode.toUpperCase();
  }

  if (inst.upiPhoto || (Number(inst.upiAmount || 0) > 0 && Number(inst.cashAmount || 0) === 0)) {
    return 'UPI';
  }
  if (Number(inst.cashAmount || 0) > 0 && Number(inst.upiAmount || 0) === 0) {
    return 'Cash';
  }

  return 'Cash';
};

const formatTransactionSubtext = (dateStr, timeStr, createdAt) => {
  let day = '09';
  let monthStr = 'OCT';
  let yearStr = '26';
  let timeFormatted = timeStr || '';

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  let dateObj = null;

  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) dateObj = d;
  }

  if (!dateObj && dateStr) {
    const ts = parseDateToTimestamp(dateStr);
    if (ts) dateObj = new Date(ts);
  }

  if (dateObj) {
    day = String(dateObj.getDate()).padStart(2, '0');
    monthStr = months[dateObj.getMonth()];
    yearStr = String(dateObj.getFullYear()).slice(-2);
    if (!timeFormatted) {
      timeFormatted = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    }
  } else if (dateStr && typeof dateStr === 'string') {
    const parts = dateStr.trim().split(/[\.\-\/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) { // YYYY-MM-DD
        yearStr = parts[0].slice(-2);
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) monthStr = months[mIdx];
        day = parts[2].padStart(2, '0');
      } else { // DD-MM-YYYY
        day = parts[0].padStart(2, '0');
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) monthStr = months[mIdx];
        if (parts[2].length === 4) yearStr = parts[2].slice(-2);
        else yearStr = parts[2];
      }
    }
  }

  const dateFormatted = `${day} ${monthStr} ${yearStr}`;

  if (timeFormatted) {
    timeFormatted = timeFormatted.toUpperCase().replace(/\.\s*/g, '');
    return `${dateFormatted} • ${timeFormatted}`;
  }

  return dateFormatted;
};

export default function CollectionReportModal({ 
  isOpen = true, 
  onClose,
  userProfile = null,
  activeBranch = { id: 'main', name: 'Main Branch' },
  branches = [],
  customers = [],
  customLedgerData = null
}) {
  const [fromDate, setFromDate] = useState(() => getTodayStr());
  const [toDate, setToDate] = useState(() => getTodayStr());
  const [periodPreset, setPeriodPreset] = useState('Today'); // Default 'Today'
  const [searchTerm, setSearchTerm] = useState('');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Independent Credit & Debit multi-toggle boolean states
  const [isCreditActive, setIsCreditActive] = useState(true);
  const [isDebitActive, setIsDebitActive] = useState(true);

  // Refs for Date inputs & Scroll
  const fromDateInputRef = useRef(null);
  const toDateInputRef = useRef(null);
  const tableScrollRef = useRef(null);

  useEffect(() => {
    if (isOpen && tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  // Date period preset selection handler
  const handlePeriodSelect = (option) => {
    setPeriodPreset(option);
    setShowPeriodDropdown(false);

    const today = new Date();
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${day}-${month}-${year}`;
    };

    if (option === 'Today') {
      const dateStr = formatDate(today);
      setFromDate(dateStr);
      setToDate(dateStr);
    } else if (option === 'Yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const dateStr = formatDate(yest);
      setFromDate(dateStr);
      setToDate(dateStr);
    } else if (option === 'Last Week') {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      setFromDate(formatDate(lastWeek));
      setToDate(formatDate(today));
    } else if (option === 'Last Month') {
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      setFromDate(formatDate(lastMonth));
      setToDate(formatDate(today));
    } else {
      const dateStr = formatDate(today);
      setFromDate(dateStr);
      setToDate(dateStr);
    }
  };

  // Branch Consolidation & RBAC Scoping Engine
  const disabledBranchIds = useMemo(() => {
    return new Set(
      (branches || [])
        .filter(b => b.disabled === true || b.consolidationEnabled === false || b.enabled === false || b.status === 'Disabled' || b.hidden === true)
        .map(b => b.id)
    );
  }, [branches]);

  // Real Customer Ledger Extraction & Metric Summaries
  const { ledgerEntries, targetCollection, targetLoanAmount } = useMemo(() => {
    const rawCustomers = customLedgerData || (customers && customers.length > 0 ? customers : (() => {
      try {
        const saved = localStorage.getItem('everest_customers');
        return saved ? JSON.parse(saved) : [];
      } catch(e) { return []; }
    })());

    const userRole = userProfile?.role || 'admin';
    const isStaff = userRole === 'staff' || userRole === 'Staff' || userRole === 'agent';
    const staffAdminOverride = Boolean(
      userProfile?.permissions?.collectionReportAdmin ||
      userProfile?.permissions?.fullBranchAccess ||
      userProfile?.permissions?.adminOverride
    );
    const userBranchId = activeBranch?.id || userProfile?.branchId || 'main';
    const isMainBranch = userBranchId === 'main' || activeBranch?.name === 'Main Branch';
    const staffName = userProfile?.staffName || userProfile?.name || userProfile?.displayName || '';
    const staffId = userProfile?.staffId || userProfile?.employeeId || userProfile?.uid || '';

    // 1. Scope Customers by Branch & Staff RBAC
    const scopedCustomers = (rawCustomers || []).filter((customer) => {
      if (!customer) return false;
      const custBranchId = customer.branchId || customer.branchCode;
      const custBranchName = customer.branch || customer.branchName;

      // Branch scoping & Consolidation check
      if (isMainBranch) {
        if (custBranchId && disabledBranchIds.has(custBranchId)) {
          return false;
        }
      } else {
        if (custBranchId && custBranchId !== userBranchId && custBranchName !== activeBranch?.name) {
          return false;
        }
      }

      // Staff Scoping
      if (isStaff && !staffAdminOverride) {
        const custStaff = customer.assignedStaff || customer.staffName || customer.staff;
        const custStaffId = customer.staffId;
        if (custStaff || custStaffId) {
          const matchesStaff = (
            (staffName && custStaff === staffName) ||
            (staffId && custStaffId === staffId)
          );
          if (!matchesStaff) return false;
        }
      }

      return true;
    });

    // 2. Date Boundary Range
    const fromTs = parseDateToTimestamp(fromDate);
    const toTs = parseDateToTimestamp(toDate);
    const startTs = fromTs ? new Date(fromTs).setHours(0, 0, 0, 0) : 0;
    const endTs = toTs ? new Date(toTs).setHours(23, 59, 59, 999) : Date.now();

    const isInDateRange = (dStr) => {
      if (!dStr) return false;
      const ts = parseDateToTimestamp(dStr);
      if (!ts) return false;
      return ts >= startTs && ts <= endTs;
    };

    // Calculate number of calendar days in selected date range
    const diffMs = Math.max(0, endTs - startTs);
    const daysInRange = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    const isSingleDay = fromDate === toDate;

    let totalTarget = 0;
    let totalSanctionedLoanAmtForDisbursed = 0;

    const entriesMap = new Map(); // uniqueKey -> ledger row

    scopedCustomers.forEach((cust) => {
      const custName = cust.name || cust.customerName || 'Customer';

      // Daily installment target per customer
      const custTargetPerDay = Number(cust.perDayAmount || cust.dailyInstallment || cust.installmentAmount || cust.targetAmount || 0) ||
        (cust.repayAmount ? Math.round(Number(cust.repayAmount) / Math.max(1, Number(cust.tenure || cust.weeks || cust.days || 100))) : 0);

      const rawInstallments = cust.installments || cust.ledger || cust.transactions || cust.history || [];
      let customerHasCollectionInPeriod = false;
      let customerTargetInPeriod = 0;

      if (Array.isArray(rawInstallments) && rawInstallments.length > 0) {
        rawInstallments.forEach((inst, index) => {
          const instDate = inst.date || inst.paymentDate || inst.createdAt;
          const status = String(inst.status || '').toUpperCase();
          const amount = Number(inst.amount || inst.paidAmount || (Number(inst.cashAmount || 0) + Number(inst.upiAmount || 0)) || 0);

          if (isInDateRange(instDate)) {
            customerHasCollectionInPeriod = true;
            
            // Add to Target: if installment has scheduled due amount, use it, else custTargetPerDay
            const instDue = Number(inst.dueAmount || inst.targetAmount || inst.target || custTargetPerDay);
            customerTargetInPeriod += instDue;

            if (amount > 0 && status !== 'BOUNCED' && status !== 'CANCELLED') {
              const upiAmt = Number(inst.upiAmount || 0);
              const cashAmt = Number(inst.cashAmount || 0);
              const rawMode = (inst.mode || inst.paymentMode || inst.instrument || '').toString().trim().toUpperCase();

              let isSplit = false;
              let finalUpi = 0;
              let finalCash = 0;
              let resolvedMode = 'Cash';

              if (upiAmt > 0 && cashAmt > 0) {
                isSplit = true;
                finalUpi = upiAmt;
                finalCash = cashAmt;
                resolvedMode = 'Split';
              } else if (rawMode === 'SPLIT' || rawMode === 'UPI/CASH' || rawMode === 'BOTH') {
                isSplit = true;
                if (upiAmt > 0 || cashAmt > 0) {
                  finalUpi = upiAmt;
                  finalCash = cashAmt;
                } else {
                  finalUpi = Math.round(amount / 2);
                  finalCash = amount - finalUpi;
                }
                resolvedMode = 'Split';
              } else {
                resolvedMode = resolvePaymentMode(inst);
                if (resolvedMode === 'UPI') {
                  finalUpi = amount;
                  finalCash = 0;
                } else {
                  finalCash = amount;
                  finalUpi = 0;
                }
              }

              const key = `${cust.id}_credit_${inst.id || index}_${instDate}_${amount}`;
              entriesMap.set(key, {
                id: key,
                name: custName,
                mode: resolvedMode,
                isSplit: isSplit,
                upiAmount: finalUpi,
                cashAmount: finalCash,
                credit: amount,
                debit: Number(cust.debit || 0),
                date: instDate,
                timeStr: inst.timeStr || inst.time,
                createdAt: inst.createdAt || inst.date
              });
            }
          }
        });
      }

      // Target summation for date range:
      if (customerHasCollectionInPeriod && customerTargetInPeriod > 0) {
        totalTarget += customerTargetInPeriod;
      } else {
        const custStatus = String(cust.status || '').toLowerCase();
        const isActiveCust = custStatus === 'approved' || custStatus === 'disbursed' || custStatus === 'active';
        if (isActiveCust && custTargetPerDay > 0) {
          if (isSingleDay) {
            const custNextDueDate = cust.nextDueDate || cust.dueDate || cust.scheduledDate;
            if (custNextDueDate && isInDateRange(custNextDueDate)) {
              totalTarget += custTargetPerDay;
            }
          } else {
            totalTarget += (daysInRange * custTargetPerDay);
          }
        }
      }

      // Loan Amount & Disbursement for Date Range:
      const disbDate = cust.disbursedAt || cust.disbursedDate || cust.loanApprovedDate || cust.approvalDate || cust.loanDate || cust.date || cust.createdAt;
      const custStatus = String(cust.status || '').toLowerCase();
      const isApprovedOrDisbursed = custStatus === 'approved' || custStatus === 'disbursed' || custStatus === 'active';
      const disbAmount = Number(cust.disbursedAmount || cust.disbursementAmount || cust.loanAmount || 0);
      const sanctionedLoanAmt = Number(cust.loanAmount || cust.amount || cust.sanctionedAmount || 0);

      if (isApprovedOrDisbursed && disbAmount > 0 && isInDateRange(disbDate)) {
        // Loan was actually DISBURSED in selected date range!
        totalSanctionedLoanAmtForDisbursed += sanctionedLoanAmt;

        const key = `${cust.id}_debit_${disbDate}`;
        if (!entriesMap.has(key)) {
          entriesMap.set(key, {
            id: key,
            name: custName,
            mode: 'Cash',
            isSplit: false,
            upiAmount: 0,
            cashAmount: disbAmount,
            credit: 0,
            debit: disbAmount,
            date: disbDate,
            timeStr: cust.timeStr || '',
            createdAt: disbDate
          });
        }
      }
    });

    const entries = Array.from(entriesMap.values());

    return {
      ledgerEntries: entries,
      targetCollection: totalTarget,
      targetLoanAmount: totalSanctionedLoanAmtForDisbursed
    };
  }, [customers, customLedgerData, userProfile, activeBranch, disabledBranchIds, fromDate, toDate]);

  // Dual-Mode Search: Partial text match vs Exact Number equality match
  const filteredData = useMemo(() => {
    const query = searchTerm.trim();
    const isNumeric = query !== '' && !/[a-zA-Z]/.test(query) && !isNaN(Number(query));

    return ledgerEntries.filter((item) => {
      let matchesSearch = true;
      if (query !== '') {
        if (isNumeric) {
          const numQuery = Number(query);
          // Exact number equality match against Credit or Debit amounts
          matchesSearch = (Number(item.credit) === numQuery || Number(item.debit) === numQuery);
        } else {
          matchesSearch = item.name.toLowerCase().includes(query.toLowerCase());
        }
      }

      let matchesType = false;
      if (isCreditActive && isDebitActive) {
        matchesType = item.credit > 0 || item.debit > 0;
      } else if (isCreditActive) {
        matchesType = item.credit > 0;
      } else if (isDebitActive) {
        matchesType = item.debit > 0;
      } else {
        matchesType = false;
      }

      return matchesSearch && matchesType;
    });
  }, [ledgerEntries, searchTerm, isCreditActive, isDebitActive]);

  // Dynamic Metrics Recalculation strictly bound to active scoped data & toggles
  const { totalCollection, totalDisbursement, onlineCollection, cashCollection } = useMemo(() => {
    let coll = 0;
    let disb = 0;
    let upi = 0;
    let cash = 0;

    filteredData.forEach((item) => {
      if (isCreditActive && item.credit > 0) {
        coll += item.credit;
        const itemUpi = Number(item.upiAmount || 0);
        const itemCash = Number(item.cashAmount || 0);

        if (item.isSplit || (itemUpi > 0 && itemCash > 0)) {
          upi += itemUpi;
          cash += itemCash;
        } else if (itemUpi > 0) {
          upi += itemUpi;
          if (itemCash > 0) cash += itemCash;
          else if (item.credit > itemUpi) cash += (item.credit - itemUpi);
        } else if (item.mode === 'UPI' || item.mode === 'Online') {
          upi += item.credit;
        } else {
          cash += item.credit;
        }
      }
      if (isDebitActive && item.debit > 0) {
        disb += item.debit;
      }
    });

    return {
      totalCollection: coll,
      totalDisbursement: disb,
      onlineCollection: upi,
      cashCollection: cash
    };
  }, [filteredData, isCreditActive, isDebitActive]);

  // Dynamic table column counts for responsive empty state colSpan
  const colCountMobile = 2 + (isCreditActive && !isDebitActive ? 1 : 0) + (isCreditActive ? 1 : 0) + (isDebitActive ? 1 : 0);
  const colCountDesktop = 3 + (isCreditActive ? 1 : 0) + (isDebitActive ? 1 : 0);

  if (!isOpen) return null;

  return (
    <div className="w-full h-full min-h-[100dvh] lg:min-h-0 bg-[#f8fafc] flex flex-col overflow-hidden px-3 sm:px-4 lg:px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 lg:pb-4 space-y-2.5 relative z-30">
      
      {/* TOP FIXED AREA: 3 Compact Control Rows (Pinned) */}
      <div className="shrink-0 bg-[#f8fafc] z-20 space-y-2 lg:space-y-2.5 pb-1">
        
        {/* LINE 1: Date Range & Period (Side-by-Side in 1 Horizontal Row) */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full shrink-0">
          {/* From Date */}
          <div 
            onClick={() => {
              try { fromDateInputRef.current?.showPicker?.(); } catch(e) { fromDateInputRef.current?.click?.(); }
            }}
            className="flex-1 min-w-0 bg-white border border-slate-200/90 rounded-xl px-2 sm:px-2.5 h-[38px] flex items-center gap-1.5 sm:gap-2 shadow-2xs cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="flex flex-col justify-center min-w-0 flex-1 relative">
              <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 leading-none truncate">From Date</span>
              <input
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] sm:text-xs font-semibold text-slate-700 bg-transparent outline-none truncate p-0 border-none leading-none w-full cursor-text"
              />
              <input
                ref={fromDateInputRef}
                type="date"
                value={parseToNativeDate(fromDate)}
                onChange={(e) => {
                  if (e.target.value) setFromDate(formatFromNativeDate(e.target.value));
                }}
                className="sr-only opacity-0 absolute w-0 h-0 pointer-events-none"
              />
            </div>
          </div>

          {/* To Date */}
          <div 
            onClick={() => {
              try { toDateInputRef.current?.showPicker?.(); } catch(e) { toDateInputRef.current?.click?.(); }
            }}
            className="flex-1 min-w-0 bg-white border border-slate-200/90 rounded-xl px-2 sm:px-2.5 h-[38px] flex items-center gap-1.5 sm:gap-2 shadow-2xs cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="flex flex-col justify-center min-w-0 flex-1 relative">
              <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 leading-none truncate">To Date</span>
              <input
                type="text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] sm:text-xs font-semibold text-slate-700 bg-transparent outline-none truncate p-0 border-none leading-none w-full cursor-text"
              />
              <input
                ref={toDateInputRef}
                type="date"
                value={parseToNativeDate(toDate)}
                onChange={(e) => {
                  if (e.target.value) setToDate(formatFromNativeDate(e.target.value));
                }}
                className="sr-only opacity-0 absolute w-0 h-0 pointer-events-none"
              />
            </div>
          </div>

          {/* Period Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="bg-[#1d4ed8] text-white rounded-xl h-[38px] px-2.5 sm:px-3 font-semibold text-xs flex items-center gap-1 sm:gap-1.5 shadow-xs hover:bg-blue-700 transition-colors cursor-pointer select-none"
            >
              <span>{periodPreset}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {showPeriodDropdown && (
              <div className="absolute right-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {['All', 'Today', 'Yesterday', 'Last Week', 'Last Month'].map((option) => (
                  <button
                    key={option}
                    onClick={() => handlePeriodSelect(option)}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                      periodPreset === option ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LINE 2: Search Input & Action Badges (Side-by-Side in 1 Horizontal Row) */}
        <div className="flex items-center justify-between gap-2 w-full shrink-0">
          {/* Search Input */}
          <div className="flex-1 min-w-0 bg-slate-100/90 border border-slate-200/80 rounded-xl px-2.5 sm:px-3 h-10 flex items-center gap-1.5 sm:gap-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent outline-none text-xs text-slate-700 placeholder-slate-400 font-medium truncate"
            />
          </div>

          {/* Credit & Debit Action Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 h-10">
            <button
              onClick={() => setIsCreditActive((prev) => !prev)}
              className={`rounded-xl px-2.5 sm:px-3 h-full flex items-center gap-1 sm:gap-1.5 font-bold text-xs transition-all cursor-pointer border select-none ${
                isCreditActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-slate-100 text-slate-400 border-slate-200/80 opacity-60 hover:opacity-80'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
              <span>Credit</span>
            </button>

            <button
              onClick={() => setIsDebitActive((prev) => !prev)}
              className={`rounded-xl px-2.5 sm:px-3 h-full flex items-center gap-1 sm:gap-1.5 font-bold text-xs transition-all cursor-pointer border select-none ${
                isDebitActive
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                  : 'bg-slate-100 text-slate-400 border-slate-200/80 opacity-60 hover:opacity-80'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
              <span>Debit</span>
            </button>
          </div>
        </div>

        {/* LINE 3: Dynamic Summary Metric Cards (50/50 Equal Balance with Middle Vertical Divider) */}
        <div className="w-full bg-[#f0f7ff] border border-sky-100 rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs divide-x divide-sky-200/70 shrink-0">
          
          {/* Card 1 (Left 50%) */}
          {isCreditActive && !isDebitActive ? (
            /* Case A: Card 1 = Target */
            <div className="flex-1 flex items-center gap-2 pr-2 sm:pr-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Target</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 truncate">
                  ₹ {targetCollection.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ) : !isCreditActive && isDebitActive ? (
            /* Case B: Card 1 = Loan Amount */
            <div className="flex-1 flex items-center gap-2 pr-2 sm:pr-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <HandCoins className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Loan Amount</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 truncate">
                  ₹ {targetLoanAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ) : (
            /* Case C: Card 1 = Collection */
            <div className="flex-1 flex items-center justify-between gap-1.5 sm:gap-2 pr-1 sm:pr-3 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Collection</span>
                  <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 truncate">
                    ₹ {totalCollection.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              {/* UPI & Cash Breakdown (Visible on Mobile & Desktop) */}
              <div className="flex border-l border-sky-200/70 pl-2 flex-col justify-center text-[9px] sm:text-[10px] leading-tight space-y-0.5 ml-auto shrink-0">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block shrink-0"></span>
                  <span className="text-slate-500">UPI:</span>
                  <span className="font-bold text-blue-700">₹ {onlineCollection.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                  <span className="text-slate-500">Cash:</span>
                  <span className="font-bold text-emerald-700">₹ {cashCollection.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 2 (Right 50%) */}
          {isCreditActive && !isDebitActive ? (
            /* Case A: Card 2 = Collection */
            <div className="flex-1 flex items-center justify-between gap-1.5 sm:gap-2 pl-2 sm:pl-3 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Collection</span>
                  <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 truncate">
                    ₹ {totalCollection.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              {/* UPI & Cash Breakdown */}
              <div className="flex border-l border-sky-200/70 pl-2 flex-col justify-center text-[9px] sm:text-[10px] leading-tight space-y-0.5 ml-auto shrink-0">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block shrink-0"></span>
                  <span className="text-slate-500">UPI:</span>
                  <span className="font-bold text-blue-700">₹ {onlineCollection.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                  <span className="text-slate-500">Cash:</span>
                  <span className="font-bold text-emerald-700">₹ {cashCollection.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          ) : !isCreditActive && isDebitActive ? (
            /* Case B: Card 2 = Disbursement */
            <div className="flex-1 flex items-center gap-2 pl-2 sm:pl-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f3e8ff] text-[#7e22ce] flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25-9 5.25m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Disbursement</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 truncate">
                  ₹ {totalDisbursement.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ) : (
            /* Case C: Card 2 = Disbursement */
            <div className="flex-1 flex items-center gap-2 pl-2 sm:pl-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f3e8ff] text-[#7e22ce] flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25-9 5.25m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Disbursement</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 truncate">
                  ₹ {totalDisbursement.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* True Collection Data Ledger Table - Dynamic Columns & Dedicated Touch Scroll */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div ref={tableScrollRef} className="flex-1 min-h-0 overflow-y-auto pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10 select-none shadow-2xs">
              <tr>
                <th className="py-2.5 px-3 sm:px-4 text-center text-[11px] font-semibold text-slate-500 w-12 sm:w-14">S.No</th>
                <th className="py-2.5 px-3 sm:px-4 text-left text-[11px] font-semibold text-slate-500">Name</th>
                
                {/* MODE Header Column */}
                {isCreditActive && !isDebitActive ? (
                  <th className="py-2.5 px-3 sm:px-4 text-center text-[11px] font-semibold text-slate-500 w-24 sm:w-28">MODE</th>
                ) : isCreditActive && isDebitActive ? (
                  <th className="hidden lg:table-cell py-2.5 px-4 text-center text-[11px] font-semibold text-slate-500 w-28 lg:w-36">Mode</th>
                ) : null}

                {/* Credit Header Column */}
                {isCreditActive && (
                  <th className="py-2.5 px-3 sm:px-4 text-center text-[11px] font-semibold text-emerald-600 bg-emerald-50/70 w-24 sm:w-36">Credit</th>
                )}

                {/* Debit Header Column */}
                {isDebitActive && (
                  <th className="py-2.5 px-3 sm:px-4 text-center text-[11px] font-semibold text-rose-600 bg-rose-50/70 w-24 sm:w-36">Debit</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredData.length > 0 ? (
                <>
                  {filteredData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-medium text-slate-400">{index + 1}</td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                        <div className="font-semibold text-slate-800 leading-tight">{item.name}</div>
                        <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                          {formatTransactionSubtext(item.date, item.timeStr, item.createdAt)}
                        </div>
                      </td>
                      
                      {/* MODE Data Cell */}
                      {isCreditActive && !isDebitActive ? (
                        <td className="py-2.5 sm:py-3 px-2 text-center">
                          {item.isSplit ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                                UPI: ₹{item.upiAmount}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                Cash: ₹{item.cashAmount}
                              </span>
                            </div>
                          ) : item.mode === 'UPI' || item.mode === 'Online' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                              UPI
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                              Cash
                            </span>
                          )}
                        </td>
                      ) : isCreditActive && isDebitActive ? (
                        <td className="hidden lg:table-cell py-3 px-4 text-center">
                          {item.isSplit ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                                UPI: ₹{item.upiAmount}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                Cash: ₹{item.cashAmount}
                              </span>
                            </div>
                          ) : item.mode === 'UPI' || item.mode === 'Online' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                              UPI
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                              Cash
                            </span>
                          )}
                        </td>
                      ) : null}

                      {/* Credit Data Cell */}
                      {isCreditActive && (
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold text-emerald-600">
                          ₹ {item.credit.toLocaleString('en-IN')}
                        </td>
                      )}

                      {/* Debit Data Cell */}
                      {isDebitActive && (
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold text-rose-600">
                          ₹ {item.debit.toLocaleString('en-IN')}
                        </td>
                      )}
                    </tr>
                  ))}
                  {/* Bottom Clearance Spacer Row so 10th+ entries are fully clear of bottom navigation bar */}
                  <tr className="h-24 border-none pointer-events-none">
                    <td colSpan={6} className="py-0 border-none"></td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={colCountMobile} className="lg:hidden py-8 text-center text-slate-400 font-medium">
                    No transactions found matching "{searchTerm}"
                  </td>
                  <td colSpan={colCountDesktop} className="hidden lg:table-cell py-8 text-center text-slate-400 font-medium">
                    No transactions found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}


