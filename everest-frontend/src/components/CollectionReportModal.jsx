import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Wallet, Target, HandCoins, ArrowUpDown, Filter, Check, Clock, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

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
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  let ts = null;

  // 1. Parse string or numeric timestamp safely using parseDateToTimestamp to avoid US date MM-DD-YYYY inversion
  if (createdAt) {
    if (typeof createdAt === 'number') {
      ts = createdAt;
    } else if (typeof createdAt === 'string') {
      ts = parseDateToTimestamp(createdAt);
    }
  }

  if (!ts && dateStr) {
    ts = parseDateToTimestamp(dateStr);
  }

  let dateObj = ts ? new Date(ts) : null;
  let day = '09';
  let monthStr = 'OCT';
  let yearStr = '26';
  let timeFormatted = timeStr || '';

  if (dateObj && !isNaN(dateObj.getTime())) {
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

const customerMatchesStaff = (customer, targetStaff) => {
  if (!customer || !targetStaff || targetStaff === 'All Staff') return true;
  const targetLower = String(targetStaff).toLowerCase().trim();
  const cStaffName = String(customer.staffName || '').toLowerCase().trim();
  const cAssignedStaff = String(customer.assignedStaff || '').toLowerCase().trim();
  const cAssignedStaffName = String(customer.assignedStaffName || '').toLowerCase().trim();
  const cStaff = String(customer.staff || '').toLowerCase().trim();

  if (
    cStaffName === targetLower ||
    cAssignedStaff === targetLower ||
    cAssignedStaffName === targetLower ||
    cStaff === targetLower
  ) {
    return true;
  }

  const cStaffId = String(customer.staffId || customer.assignedStaffId || customer.createdByStaffId || customer.createdBy || '').toLowerCase().trim();
  if (cStaffId && cStaffId === targetLower) {
    return true;
  }

  return false;
};

export default function CollectionReportModal({ 
  isOpen = true, 
  onClose,
  userProfile = null,
  activeBranch = { id: 'main', name: 'Main Branch' },
  branches = [],
  customers = [],
  customLedgerData = null,
  staffList = [],
  isStaff: isStaffProp
}) {
  const [fromDate, setFromDate] = useState(() => getTodayStr());
  const [toDate, setToDate] = useState(() => getTodayStr());
  const [periodPreset, setPeriodPreset] = useState('Today'); // Default 'Today'
  const [searchTerm, setSearchTerm] = useState('');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (newest first) or 'asc' (oldest first)

  // Multi-Select Funnel Filter states
  const [selectedFilterIds, setSelectedFilterIds] = useState(new Set());
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef(null);
  const searchContainerRef = useRef(null);
  const [firestoreStaff, setFirestoreStaff] = useState([]);

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

  // Auto-close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterDropdownRef.current && 
        !filterDropdownRef.current.contains(event.target) &&
        !searchContainerRef.current?.contains(event.target)
      ) {
        setShowFilterDropdown(false);
      }
    };
    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showFilterDropdown]);

  // Reset filter dropdown whenever activeBranch changes
  useEffect(() => {
    setShowFilterDropdown(false);
  }, [activeBranch?.id, activeBranch?.name]);

  // Real-time Firestore staff subscription with fallback to props
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'staff'), (snapshot) => {
        const list = snapshot.docs.map(d => ({ docId: d.id, id: d.id, ...d.data() }));
        setFirestoreStaff(list);
      }, (err) => {
        console.warn("Firestore staff snapshot in CollectionReportModal:", err);
      });
      return () => unsub();
    } catch(e) {
      console.warn("Could not listen to staff in CollectionReportModal:", e);
    }
  }, []);

  // Strict Privilege & Visibility Gating for Staff Funnel Filter:
  // Visible to: Super Admin, Sub-Branch Admin, or any Staff user explicitly granted Admin privileges (where admin permission toggle/radio is enabled in Customer Management)
  // Hidden from: Regular Staff members who do NOT possess admin privileges.
  const userRole = String(userProfile?.role || 'admin').toLowerCase();
  const isStaff = Boolean(isStaffProp !== undefined ? isStaffProp : (userRole === 'staff'));
  const isSuperOrBranchAdmin = 
    userRole === 'admin' || 
    userRole === 'super_admin' || 
    userRole === 'superadmin' || 
    userRole === 'branch_admin' || 
    userRole === 'branchadmin' ||
    userProfile?.isAdmin === true ||
    userProfile?.isSuperAdmin === true;

  const permissions = userProfile?.permissions || {};
  const hasCustomerAdminPermission = 
    String(permissions.customerManagementMode).toLowerCase() === 'admin' ||
    String(permissions.customerManagementRole).toLowerCase() === 'admin';

  const hasCollectionAdminPermission = 
    String(permissions.collectionReportRole).toLowerCase() === 'admin' ||
    permissions.collectionReportAdmin === true;

  const hasGeneralAdminPrivileges = 
    permissions.allPermissions === true ||
    permissions.adminOverride === true ||
    permissions.fullBranchAccess === true;

  const canFilterByStaff = Boolean(
    isSuperOrBranchAdmin ||
    hasCustomerAdminPermission ||
    hasCollectionAdminPermission ||
    hasGeneralAdminPrivileges
  );

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
    } else if (option === 'All') {
      let earliestTs = null;
      const rawCusts = customLedgerData || (customers && customers.length > 0 ? customers : (() => {
        try {
          const saved = localStorage.getItem('everest_customers');
          return saved ? JSON.parse(saved) : [];
        } catch (_e) { return []; }
      })());

      (rawCusts || []).forEach(cust => {
        const insts = cust.installments || cust.ledger || cust.transactions || cust.history || [];
        insts.forEach(inst => {
          const dStr = inst.date || inst.paymentDate || inst.createdAt;
          const ts = parseDateToTimestamp(dStr);
          if (ts && (!earliestTs || ts < earliestTs)) {
            earliestTs = ts;
          }
        });
        const dStr = cust.startDate || cust.firstDueDate || cust.disbursedAt || cust.loanDate || cust.createdAt;
        const ts = parseDateToTimestamp(dStr);
        if (ts && (!earliestTs || ts < earliestTs)) {
          earliestTs = ts;
        }
      });

      const earliestDateStr = earliestTs ? formatDate(new Date(earliestTs)) : '01-01-2020';
      setFromDate(earliestDateStr);
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

  const userBranchId = activeBranch?.id || userProfile?.branchId || 'main';
  const isMainBranch = 
    userBranchId === 'main' || 
    String(activeBranch?.name || '').toLowerCase() === 'main branch' ||
    String(activeBranch?.name || '').toLowerCase() === 'main';

  // Mode: Main Branch (BRANCH FILTER) vs Sub-Branch / Staff (STAFF FILTER)
  // When inside Main Branch: Header reads "BRANCH FILTER" and lists Sub-Branches.
  // When inside a Sub-Branch (or for Staff with Admin Privileges): Header reads "STAFF FILTER" and lists Staff members.
  const isBranchFilterMode = isMainBranch && !isStaff;
  const filterTitle = isBranchFilterMode ? 'BRANCH FILTER' : 'STAFF FILTER';

  // 1. Available Sub-Branches when in Main Branch
  const availableSubBranches = useMemo(() => {
    const branchMap = new Map(); // key: lowercase name -> { id, name }

    (branches || []).forEach((b) => {
      if (!b) return;
      const bName = typeof b === 'string' ? b : (b.name || '');
      const isMain = bName.toLowerCase() === 'main branch' || bName.toLowerCase() === 'main' || (b.id && String(b.id).toLowerCase() === 'main');
      if (isMain) return;
      if (b.disabled === true || b.status === 'Disabled' || b.hidden === true) return;
      if (b.id && disabledBranchIds.has(b.id)) return;
      const id = typeof b === 'string' ? b : (b.id || bName);
      branchMap.set(bName.toLowerCase(), { id, name: bName });
    });

    // Fallback from localStorage branches if needed
    try {
      const savedBranches = localStorage.getItem('everest_branches') || localStorage.getItem('branches');
      if (savedBranches) {
        const parsed = JSON.parse(savedBranches);
        if (Array.isArray(parsed)) {
          parsed.forEach((b) => {
            if (!b) return;
            const bName = typeof b === 'string' ? b : (b.name || '');
            const isMain = bName.toLowerCase() === 'main branch' || bName.toLowerCase() === 'main' || (b.id && String(b.id).toLowerCase() === 'main');
            if (isMain) return;
            if (b.disabled === true || b.status === 'Disabled' || b.hidden === true) return;
            const id = typeof b === 'string' ? b : (b.id || bName);
            if (!branchMap.has(bName.toLowerCase())) {
              branchMap.set(bName.toLowerCase(), { id, name: bName });
            }
          });
        }
      }
    } catch (_e) {}

    const rawCustomers = customLedgerData || (customers && customers.length > 0 ? customers : (() => {
      try {
        const saved = localStorage.getItem('everest_customers');
        return saved ? JSON.parse(saved) : [];
      } catch (_e) { return []; }
    })());

    (rawCustomers || []).forEach((c) => {
      if (!c) return;
      const bName = c.branch || c.branchName;
      const bId = c.branchId || c.branchCode || bName;
      if (bName && bName.toLowerCase() !== 'main branch' && bName.toLowerCase() !== 'main') {
        if (!branchMap.has(bName.toLowerCase())) {
          branchMap.set(bName.toLowerCase(), { id: bId, name: bName });
        }
      }
    });

    return Array.from(branchMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [branches, disabledBranchIds, customLedgerData, customers]);

  // 2. Available Staff when in Sub-Branch (or staff view)
  const availableBranchStaff = useMemo(() => {
    const activeBranchIdStr = String(activeBranch?.id || '').toLowerCase().trim();
    const activeBranchNameStr = String(activeBranch?.name || '').toLowerCase().trim();

    const staffMap = new Map(); // key: lowercase trimmed name -> { id, name }
    const combinedStaff = firestoreStaff.length > 0 ? firestoreStaff : (staffList || []);

    // From active staff in Firestore / props
    combinedStaff.forEach((s) => {
      if (!s) return;
      if (s.status === 'Recycled' || s.status === 'Deleted' || s.status === 'Inactive' || s.disabled === true) return;

      const sBranchId = String(s.branchId || s.branch || '').toLowerCase().trim();
      const sBranchName = String(s.branchName || s.branch || '').toLowerCase().trim();

      const matchesBranch = 
        sBranchId === activeBranchIdStr ||
        sBranchName === activeBranchNameStr ||
        (activeBranchNameStr && sBranchName.includes(activeBranchNameStr)) ||
        (activeBranchIdStr && sBranchId.includes(activeBranchIdStr));

      if (matchesBranch) {
        const name = (s.name || s.staffName || s.displayName || '').trim();
        if (name && !staffMap.has(name.toLowerCase())) {
          staffMap.set(name.toLowerCase(), {
            id: s.id || s.uid || s.docId || name,
            name: name
          });
        }
      }
    });

    // Also inspect branch customers
    const rawCustomers = customLedgerData || (customers && customers.length > 0 ? customers : (() => {
      try {
        const saved = localStorage.getItem('everest_customers');
        return saved ? JSON.parse(saved) : [];
      } catch(e) { return []; }
    })());

    (rawCustomers || []).forEach((c) => {
      if (!c) return;
      const custBranchId = c.branchId || c.branchCode;
      const custBranchName = c.branch || c.branchName;
      if (custBranchId && custBranchId !== userBranchId && custBranchName !== activeBranch?.name) return;

      const name = (c.assignedStaff || c.assignedStaffName || c.staffName || c.staff || '').trim();
      if (name && !staffMap.has(name.toLowerCase())) {
        staffMap.set(name.toLowerCase(), {
          id: c.staffId || c.assignedStaffId || name,
          name: name
        });
      }
    });

    return Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [firestoreStaff, staffList, activeBranch, userBranchId, customLedgerData, customers]);

  // Context-aware available filter items:
  const availableFilterItems = useMemo(() => {
    return isBranchFilterMode ? availableSubBranches : availableBranchStaff;
  }, [isBranchFilterMode, availableSubBranches, availableBranchStaff]);

  // Auto-select all items whenever availableFilterItems changes
  const availableItemIdsKey = useMemo(() => {
    return availableFilterItems.map(i => i.id).sort().join(',');
  }, [availableFilterItems]);

  useEffect(() => {
    setSelectedFilterIds(new Set(availableFilterItems.map(item => item.id)));
  }, [availableItemIdsKey]);

  const isAllSelected = availableFilterItems.length > 0 && availableFilterItems.every(i => selectedFilterIds.has(i.id));
  const isIndeterminate = !isAllSelected && selectedFilterIds.size > 0;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedFilterIds(new Set());
    } else {
      setSelectedFilterIds(new Set(availableFilterItems.map(i => i.id)));
    }
  };

  const handleSelectAll = () => {
    setSelectedFilterIds(new Set(availableFilterItems.map(i => i.id)));
  };

  const handleToggleItem = (id) => {
    setSelectedFilterIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Real Customer Ledger Extraction & Metric Summaries
  const { 
    ledgerEntries = [], 
    targetCollection = 0, 
    targetLoanAmount = 0, 
    totalScopedPending = 0, 
    totalScopedOverdue = 0 
  } = useMemo(() => {
    const rawCustomers = customLedgerData || (customers && customers.length > 0 ? customers : (() => {
      try {
        const saved = localStorage.getItem('everest_customers');
        return saved ? JSON.parse(saved) : [];
      } catch(e) { return []; }
    })());

    const staffName = userProfile?.staffName || userProfile?.name || userProfile?.displayName || '';
    const staffId = userProfile?.staffId || userProfile?.employeeId || userProfile?.uid || '';

    // 1. Scope Customers by Branch & Staff RBAC
    const scopedCustomers = (rawCustomers || []).filter((customer) => {
      if (!customer) return false;
      const custBranchId = String(customer.branchId || customer.branchCode || '').toLowerCase().trim();
      const custBranchName = String(customer.branch || customer.branchName || '').toLowerCase().trim();

      if (isBranchFilterMode) {
        // Main Branch mode: user is filtering by sub-branches via multi-select checkboxes
        if (customer.branchId && disabledBranchIds.has(customer.branchId)) {
          return false;
        }

        if (canFilterByStaff) {
          if (isAllSelected) {
            // All branches selected - pass through
          } else if (selectedFilterIds.size === 0) {
            // No branches selected
            return false;
          } else {
            // Check if customer's branch matches any selected branch
            const matchesAnyBranch = availableFilterItems.some(item => {
              if (!selectedFilterIds.has(item.id)) return false;
              const bId = String(item.id).toLowerCase().trim();
              const bName = String(item.name).toLowerCase().trim();
              return (
                custBranchId === bId ||
                custBranchName === bName ||
                (custBranchId && bId && custBranchId.includes(bId)) ||
                (custBranchName && bName && custBranchName.includes(bName))
              );
            });
            if (!matchesAnyBranch) return false;
          }
        }
      } else {
        // Sub-Branch mode: must match activeBranch
        if (!isMainBranch) {
          if (custBranchId && custBranchId !== String(userBranchId).toLowerCase().trim() && custBranchName !== String(activeBranch?.name || '').toLowerCase().trim()) {
            return false;
          }
        }

        // Staff Scoping:
        if (canFilterByStaff) {
          if (isAllSelected) {
            // All staff in this branch selected - pass through
          } else if (selectedFilterIds.size === 0) {
            // No staff selected
            return false;
          } else {
            // Check if customer matches any selected staff member
            const matchesAnyStaff = availableFilterItems.some(item => {
              if (!selectedFilterIds.has(item.id)) return false;
              return customerMatchesStaff(customer, item.name) || customerMatchesStaff(customer, item.id);
            });
            if (!matchesAnyStaff) return false;
          }
        } else {
          // Regular staff without admin privileges: strictly locked to own assigned customers
          const custStaff = customer.assignedStaff || customer.assignedStaffName || customer.staffName || customer.staff;
          const custStaffId = customer.staffId || customer.assignedStaffId || customer.createdByStaffId || customer.createdBy;
          const matchesStaff = (
            (staffName && (
              String(custStaff || '').toLowerCase().trim() === String(staffName).toLowerCase().trim()
            )) ||
            (staffId && (
              String(custStaffId) === String(staffId)
            ))
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

    const now = new Date();
    const todayStartTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const todayEndTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    // Calculate number of calendar days in selected date range
    const diffMs = Math.max(0, endTs - startTs);
    const daysInRange = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    const isSingleDay = fromDate === toDate;

    let totalTarget = 0;
    let totalSanctionedLoanAmtForDisbursed = 0;
    let totalPeriodPending = 0;
    let totalPeriodOverdue = 0;

    const entriesMap = new Map(); // uniqueKey -> ledger row

    scopedCustomers.forEach((cust) => {
      const custName = cust.name || cust.customerName || 'Customer';

      // Daily installment target per customer
      const typeStr = String(cust.loanType || cust.scheme || cust.category || '').toLowerCase();
      const unitStr = String(cust.tenureUnit || cust.paymentFrequency || cust.frequency || '').toLowerCase();
      let planToken = 'WEEK';
      if (unitStr.includes('month') || typeStr.includes('month') || typeStr.includes('personal') || typeStr.includes('agri')) {
        planToken = 'MONTH';
      } else if (unitStr.includes('day') || typeStr.includes('daily') || typeStr.includes('day') || cust.days) {
        planToken = 'DAY';
      } else if (unitStr.includes('week') || typeStr.includes('week') || typeStr.includes('micro') || cust.weeks) {
        planToken = 'WEEK';
      }

      const planCount = Number(cust.tenureVal || cust.tenure || cust.weeks || cust.days || cust.months || (planToken === 'DAY' ? 100 : 12));

      const custTargetPerDay = Number(cust.perDayAmount || cust.dailyInstallment || cust.installmentAmount || cust.targetAmount || 0) ||
        (cust.repayAmount ? Math.round(Number(cust.repayAmount) / Math.max(1, planCount)) : 0);

      // Extract schedule timestamps
      let scheduledTimestamps = [];
      if (Array.isArray(cust.repaymentSchedule) && cust.repaymentSchedule.length > 0) {
        scheduledTimestamps = cust.repaymentSchedule.map(item => {
          const ts = parseDateToTimestamp(item.date || item.dueDate || item.scheduledDate);
          return ts ? new Date(ts).setHours(0, 0, 0, 0) : null;
        }).filter(Boolean);
      } else if (Array.isArray(cust.scheduledDates) && cust.scheduledDates.length > 0) {
        scheduledTimestamps = cust.scheduledDates.map(ts => new Date(ts).setHours(0, 0, 0, 0));
      } else {
        let firstDueTs = null;
        const explicitBaseStr = cust.firstDueDate || cust.startDate || cust.dueDate || cust.nextDueDate;
        if (explicitBaseStr) {
          const ts = parseDateToTimestamp(explicitBaseStr);
          if (ts) firstDueTs = new Date(ts).setHours(0, 0, 0, 0);
        }
        if (!firstDueTs && Array.isArray(cust.installments) && cust.installments.length > 0) {
          const dates = cust.installments.map(i => parseDateToTimestamp(i.date)).filter(Boolean);
          if (dates.length > 0) firstDueTs = Math.min(...dates);
        }
        if (!firstDueTs) {
          const disbStr = cust.disbursedAt || cust.disbursedDate || cust.loanApprovedDate || cust.approvalDate || cust.loanDate;
          if (disbStr) {
            const ts = parseDateToTimestamp(disbStr);
            if (ts) {
              const s = new Date(ts);
              if (planToken === 'DAY') s.setDate(s.getDate() + 1);
              else if (planToken === 'MONTH') s.setMonth(s.getMonth() + 1);
              else s.setDate(s.getDate() + 7);
              firstDueTs = s.setHours(0, 0, 0, 0);
            }
          }
        }
        if (!firstDueTs) {
          const fallbackStr = cust.date || cust.createdAt;
          if (fallbackStr) {
            const ts = parseDateToTimestamp(fallbackStr);
            if (ts) firstDueTs = new Date(ts).setHours(0, 0, 0, 0);
          }
        }
        if (firstDueTs && planCount > 0) {
          const baseDateObj = new Date(firstDueTs);
          for (let idx = 0; idx < planCount; idx++) {
            const sDate = new Date(baseDateObj);
            if (planToken === 'DAY') sDate.setDate(sDate.getDate() + idx);
            else if (planToken === 'MONTH') sDate.setMonth(sDate.getMonth() + idx);
            else sDate.setDate(sDate.getDate() + (idx * 7));
            sDate.setHours(0, 0, 0, 0);
            scheduledTimestamps.push(sDate.getTime());
          }
        }
      }

      // Scheduled Target Computation:
      // Target = Sum of scheduled installment dues whose schedule dates fall within From Date and To Date.
      // For an active loan with daily frequency, count only the scheduled installments matching the selected range days.
      let scheduledCountInRange = 0;
      if (scheduledTimestamps.length > 0) {
        scheduledCountInRange = scheduledTimestamps.filter(ts => ts >= startTs && ts <= endTs).length;
      } else {
        const custStatus = String(cust.status || '').toLowerCase();
        const isActiveCust = custStatus === 'approved' || custStatus === 'disbursed' || custStatus === 'active';
        if (isActiveCust && custTargetPerDay > 0) {
          scheduledCountInRange = isSingleDay ? 1 : daysInRange;
        }
      }
      const customerTargetInPeriod = scheduledCountInRange * custTargetPerDay;
      totalTarget += customerTargetInPeriod;

      const rawInstallments = cust.installments || cust.ledger || cust.transactions || cust.history || [];

      // 1. Calculate cumulative scheduled dues up to ToDate (endTs)
      let scheduledUpToDate = [];
      if (scheduledTimestamps.length > 0) {
        scheduledUpToDate = scheduledTimestamps.filter(ts => ts <= endTs);
      } else {
        const custStatus = String(cust.status || '').toLowerCase();
        const isActiveCust = custStatus === 'approved' || custStatus === 'disbursed' || custStatus === 'active';
        if (isActiveCust && custTargetPerDay > 0) {
          scheduledUpToDate = new Array(Math.max(1, daysInRange)).fill(0);
        }
      }
      const totalExpectedUpToDate = scheduledUpToDate.length * custTargetPerDay;

      // 2. Calculate cumulative non-bounced collections & past bounced dues up to ToDate (endTs)
      let totalCollectedUpToDate = 0;
      let totalBouncedDuesUpToDate = 0;
      let firstBouncedTs = null;

      rawInstallments.forEach(inst => {
        const dStr = inst.date || inst.paymentDate || inst.createdAt;
        const ts = parseDateToTimestamp(dStr);
        if (ts && ts <= endTs) {
          const status = String(inst.status || '').toUpperCase();
          const amt = Number(inst.amount || inst.paidAmount || (Number(inst.cashAmount || 0) + Number(inst.upiAmount || 0)) || 0);
          if (status === 'BOUNCED' || (amt === 0 && inst.mode === 'BOUNCED')) {
            const bDue = Number(inst.dueAmount || inst.targetAmount || custTargetPerDay || 250);
            totalBouncedDuesUpToDate += bDue;
            const dayTs = new Date(ts).setHours(0, 0, 0, 0);
            if (firstBouncedTs === null || dayTs < firstBouncedTs) {
              firstBouncedTs = dayTs;
            }
          } else if (status !== 'CANCELLED' && amt > 0) {
            totalCollectedUpToDate += amt;
          }
        }
      });

      // Calculate total paid by customer on Today
      let custPaidToday = 0;
      rawInstallments.forEach(inst => {
        const status = String(inst.status || '').toUpperCase();
        if (status === 'BOUNCED' || status === 'CANCELLED') return;
        const dStr = inst.date || inst.paymentDate || inst.createdAt;
        const ts = parseDateToTimestamp(dStr);
        if (ts && new Date(ts).setHours(0, 0, 0, 0) === todayStartTs) {
          const amt = Number(inst.amount || inst.paidAmount || (Number(inst.cashAmount || 0) + Number(inst.upiAmount || 0)) || 0);
          custPaidToday += amt;
        }
      });

      // Today's scheduled due for customer
      const isScheduledToday = scheduledTimestamps.length > 0 
        ? scheduledTimestamps.includes(todayStartTs) 
        : (todayStartTs >= startTs && todayStartTs <= endTs);
      // Pending strictly requires collection to have started but not completed:
      const custPendingToday = (isScheduledToday && custPaidToday > 0 && custPaidToday < custTargetPerDay)
        ? (custTargetPerDay - custPaidToday)
        : 0;

      if (todayStartTs >= startTs && todayStartTs <= endTs) {
        totalPeriodPending += custPendingToday;
      }

      // 3. Strict Schedule-Date Bounded Active OD Computation:
      // Active OD is strictly past unsettled arrears before today (capped by endTs if viewing a past report)
      let custActiveOd = 0;
      if (endTs >= todayStartTs && cust.dynamicOverdue !== undefined && cust.dynamicOverdue !== null) {
        custActiveOd = Number(cust.dynamicOverdue) || 0;
      } else {
        const cutoffTs = Math.min(todayStartTs - 1, endTs);
        const pastScheduledDates = scheduledTimestamps.filter(ts => ts <= cutoffTs);
        const pastExpectedDueSum = pastScheduledDates.length * custTargetPerDay;

        let totalPaidToCutoff = 0;
        rawInstallments.forEach(inst => {
          const dStr = inst.date || inst.paymentDate || inst.createdAt;
          const ts = parseDateToTimestamp(dStr);
          if (ts && ts <= cutoffTs) {
            const status = String(inst.status || '').toUpperCase();
            const amt = Number(inst.amount || inst.paidAmount || (Number(inst.cashAmount || 0) + Number(inst.upiAmount || 0)) || 0);
            if (status !== 'BOUNCED' && status !== 'CANCELLED' && amt > 0) {
              totalPaidToCutoff += amt;
            }
          }
        });

        const actualPaidToCutoff = Math.max(totalPaidToCutoff, Number(cust.paidAmount || cust.totalPaid || 0));
        custActiveOd = Math.max(0, pastExpectedDueSum - actualPaidToCutoff);
      }

      totalPeriodOverdue += custActiveOd;

      // Process installments within range
      if (Array.isArray(rawInstallments) && rawInstallments.length > 0) {
        // Track latest entry on Today to attach today's pending due
        let latestTodayInstId = null;
        let latestTodayTs = -1;
        rawInstallments.forEach((inst, idx) => {
          const dStr = inst.date || inst.paymentDate || inst.createdAt;
          const ts = parseDateToTimestamp(dStr);
          if (ts && new Date(ts).setHours(0, 0, 0, 0) === todayStartTs && isInDateRange(dStr)) {
            if (ts >= latestTodayTs) {
              latestTodayTs = ts;
              latestTodayInstId = inst.id || idx;
            }
          }
        });

        rawInstallments.forEach((inst, index) => {
          const instDate = inst.date || inst.paymentDate || inst.createdAt;
          if (!isInDateRange(instDate)) return;

          const status = String(inst.status || '').toUpperCase();
          const amount = Number(inst.amount || inst.paidAmount || (Number(inst.cashAmount || 0) + Number(inst.upiAmount || 0)) || 0);
          const instTs = parseDateToTimestamp(instDate);
          const instDayTs = instTs ? new Date(instTs).setHours(0, 0, 0, 0) : 0;
          const isTodayDate = instDayTs === todayStartTs;
          const instDue = Number(inst.dueAmount || inst.targetAmount || inst.target || custTargetPerDay);

          // 1. BOUNCED Record Handling
          if (status === 'BOUNCED' || (amount === 0 && (inst.mode === 'BOUNCED' || status === 'BOUNCED'))) {
            const unpaidBouncedAmount = instDue > 0 ? instDue : (custTargetPerDay > 0 ? custTargetPerDay : 250);
            const rowOd = custActiveOd > 0 ? custActiveOd : unpaidBouncedAmount;

            const key = `${cust.id}_bounced_${inst.id || index}_${instDate}`;
            entriesMap.set(key, {
              id: key,
              customerId: cust.id,
              name: custName,
              mode: 'BOUNCED',
              status: 'BOUNCED',
              isBounced: true,
              isSplit: false,
              upiAmount: 0,
              cashAmount: 0,
              credit: 0,
              debit: 0,
              pending: 0,
              od: rowOd,
              date: instDate,
              timeStr: inst.timeStr || inst.time || '',
              createdAt: inst.createdAt || instDate
            });
            return;
          }

          // 2. Paid / Partial Installment Handling
          if (amount > 0 && status !== 'CANCELLED') {
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

            // Pending: Applicable strictly to Today's installment if not fully paid today
            let rowPending = 0;
            if (isTodayDate && (inst.id || index) === latestTodayInstId) {
              rowPending = custPendingToday;
            }

            // OD: Persistent active OD liability displayed on customer row
            let rowOd = 0;
            if (custActiveOd > 0) {
              if (firstBouncedTs !== null) {
                // If bounce occurred, carry forward active OD for dates on or after the bounce
                rowOd = instDayTs >= firstBouncedTs ? custActiveOd : 0;
              } else {
                // Fallback: Show active OD on today or unpaid records
                rowOd = (isTodayDate || amount < instDue) ? custActiveOd : 0;
              }
            }

            const key = `${cust.id}_credit_${inst.id || index}_${instDate}_${amount}`;
            entriesMap.set(key, {
              id: key,
              customerId: cust.id,
              name: custName,
              mode: resolvedMode,
              status: status,
              isBounced: false,
              isSplit: isSplit,
              upiAmount: finalUpi,
              cashAmount: finalCash,
              credit: amount,
              debit: Number(cust.debit || 0),
              pending: rowPending,
              od: rowOd,
              date: instDate,
              timeStr: inst.timeStr || inst.time || '',
              createdAt: inst.createdAt || inst.date
            });
          }
        });
      }

      // Loan Amount & Disbursement for Date Range:
      const disbDate = cust.disbursedAt || cust.disbursedDate || cust.loanApprovedDate || cust.approvalDate || cust.loanDate || cust.date || cust.createdAt;
      const custStatus = String(cust.status || '').toLowerCase();
      const isApprovedOrDisbursed = custStatus === 'approved' || custStatus === 'disbursed' || custStatus === 'active';
      const disbAmount = Number(cust.disbursedAmount || cust.disbursementAmount || cust.loanAmount || 0);
      const sanctionedLoanAmt = Number(cust.loanAmount || cust.amount || cust.sanctionedAmount || 0);

      if (isApprovedOrDisbursed && disbAmount > 0 && isInDateRange(disbDate)) {
        totalSanctionedLoanAmtForDisbursed += sanctionedLoanAmt;

        const key = `${cust.id}_debit_${disbDate}`;
        if (!entriesMap.has(key)) {
          entriesMap.set(key, {
            id: key,
            customerId: cust.id,
            name: custName,
            mode: 'Cash',
            status: 'DISBURSED',
            isBounced: false,
            isSplit: false,
            upiAmount: 0,
            cashAmount: disbAmount,
            credit: 0,
            debit: disbAmount,
            pending: 0,
            od: 0,
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
      targetLoanAmount: totalSanctionedLoanAmtForDisbursed,
      totalScopedPending: totalPeriodPending,
      totalScopedOverdue: totalPeriodOverdue
    };
  }, [customers, customLedgerData, userProfile, activeBranch, disabledBranchIds, fromDate, toDate, selectedFilterIds, isAllSelected, isBranchFilterMode, canFilterByStaff, availableFilterItems, isMainBranch, userBranchId]);

  // Dual-Mode Search & Chronological Date Sorting (Ascending / Descending)
  const filteredData = useMemo(() => {
    const query = searchTerm.trim();
    const isNumeric = query !== '' && !/[a-zA-Z]/.test(query) && !isNaN(Number(query));

    const result = ledgerEntries.filter((item) => {
      let matchesSearch = true;
      if (query !== '') {
        if (isNumeric) {
          const numQuery = Number(query);
          // Exact number equality match against Credit, Debit, Cash, UPI, Pending, or OD
          matchesSearch = (
            Number(item.credit) === numQuery || 
            Number(item.debit) === numQuery ||
            Number(item.od) === numQuery ||
            Number(item.pending) === numQuery ||
            Number(item.cashAmount) === numQuery ||
            Number(item.upiAmount) === numQuery
          );
        } else {
          matchesSearch = item.name.toLowerCase().includes(query.toLowerCase()) || 
                          String(item.mode || '').toLowerCase().includes(query.toLowerCase()) ||
                          String(item.status || '').toLowerCase().includes(query.toLowerCase());
        }
      }

      let matchesType = false;
      if (isCreditActive && isDebitActive) {
        matchesType = item.credit > 0 || item.debit > 0 || item.isBounced || item.od > 0;
      } else if (isCreditActive) {
        matchesType = item.credit > 0 || item.isBounced || item.od > 0;
      } else if (isDebitActive) {
        matchesType = item.debit > 0;
      } else {
        matchesType = false;
      }

      return matchesSearch && matchesType;
    });

    result.sort((a, b) => {
      const tsA = parseDateToTimestamp(a.createdAt || a.date) || 0;
      const tsB = parseDateToTimestamp(b.createdAt || b.date) || 0;
      if (tsA !== tsB) {
        return sortOrder === 'desc' ? tsB - tsA : tsA - tsB;
      }
      return sortOrder === 'desc' ? String(b.id).localeCompare(String(a.id)) : String(a.id).localeCompare(String(b.id));
    });

    return result;
  }, [ledgerEntries, searchTerm, isCreditActive, isDebitActive, sortOrder]);

  // Safely compute scoped pending, target, collection, and OD with default fallbacks
  const totalScopedTarget = Number(targetCollection || 0);
  const totalScopedOD = Number(totalScopedOverdue || 0);

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

  const totalScopedCollection = Number(totalCollection || 0);

  // Scoped calculations for active day (Today):
  // Pending strictly requires collection to have started but not completed:
  const totalScopedPendingSafe = (totalScopedCollection > 0 && totalScopedCollection < totalScopedTarget)
    ? Number(totalScopedPending || (totalScopedTarget - totalScopedCollection) || 0)
    : 0;

  const totalPendingAmount = useMemo(() => {
    if (searchTerm.trim() !== '') {
      return filteredData.reduce((acc, curr) => acc + (Number(curr.pending) || 0), 0);
    }
    return Number(totalScopedPendingSafe || 0);
  }, [filteredData, searchTerm, totalScopedPendingSafe]);

  const totalOverdueAmount = useMemo(() => {
    if (searchTerm.trim() !== '') {
      const seenCustIds = new Set();
      return filteredData.reduce((acc, curr) => {
        if (!seenCustIds.has(curr.customerId)) {
          seenCustIds.add(curr.customerId);
          return acc + (Number(curr.od) || 0);
        }
        return acc;
      }, 0);
    }
    return Number(totalScopedOD || 0);
  }, [filteredData, searchTerm, totalScopedOD]);

  // Dynamic table column counts for responsive empty state colSpan
  const colCountMobile = 2 + (isCreditActive && !isDebitActive ? 1 : 0) + (isCreditActive ? 1 : 0) + (isDebitActive ? 1 : 0);
  const colCountDesktop = isCreditActive ? (7 + (isDebitActive ? 1 : 0)) : (3 + (isDebitActive ? 1 : 0));

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
          {/* Search Input with inline Funnel Filter */}
          <div 
            ref={searchContainerRef}
            className="flex-1 min-w-0 bg-slate-100/90 border border-slate-200/80 rounded-xl px-2.5 sm:px-3 h-10 flex items-center gap-1.5 sm:gap-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-inner relative"
          >
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

            {/* Privilege-Gated Funnel Filter Icon Button */}
            {canFilterByStaff && (
              <button
                type="button"
                onClick={() => setShowFilterDropdown((prev) => !prev)}
                title={isAllSelected ? `${filterTitle} (All Selected)` : `${filterTitle} (${selectedFilterIds.size} Selected)`}
                className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer select-none shrink-0 ${
                  !isAllSelected
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Popover anchored directly to the search input container with viewport auto-clamping! */}
            {canFilterByStaff && showFilterDropdown && (
              <div 
                ref={filterDropdownRef}
                className="absolute top-full left-0 mt-1.5 w-64 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Header */}
                <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{filterTitle}</span>
                  {!isAllSelected && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                  )}
                </div>

                {/* Items List with Multi-Select Checkboxes */}
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                  {/* Select All Checkbox Row */}
                  <div
                    onClick={handleToggleAll}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold hover:bg-slate-50 cursor-pointer select-none transition-colors bg-white"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        isAllSelected 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs' 
                          : isIndeterminate
                            ? 'bg-blue-50 border-blue-500 text-blue-600'
                            : 'border-slate-300 bg-white hover:border-slate-400'
                      }`}>
                        {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        {isIndeterminate && <div className="w-2 h-0.5 bg-blue-600 rounded" />}
                      </div>
                      <span className="text-slate-800">Select All</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {selectedFilterIds.size} / {availableFilterItems.length}
                    </span>
                  </div>

                  {/* Individual Items */}
                  {availableFilterItems.length > 0 ? (
                    availableFilterItems.map((item) => {
                      const isSelected = selectedFilterIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleItem(item.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold hover:bg-slate-50 cursor-pointer select-none transition-colors ${
                            isSelected ? 'bg-blue-50/20' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                              isSelected 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-2xs' 
                                : 'border-slate-300 bg-white hover:border-slate-400'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className={`truncate ${isSelected ? 'text-slate-800 font-bold' : 'text-slate-600 font-normal'}`}>
                              {item.name}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3.5 py-3 text-[11px] text-slate-400 italic text-center">
                      {isBranchFilterMode ? 'No sub-branches found' : 'No staff found for branch'}
                    </div>
                  )}
                </div>
              </div>
            )}
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

        {/* DESKTOP VIEWPORT (lg: and above): 4 Dedicated Summary Cards when Credit is Active */}
        {isCreditActive ? (
          <div className="hidden lg:grid grid-cols-4 gap-3 xl:gap-4 w-full shrink-0">
            {/* Card 1: Target */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 xl:p-3.5 flex items-center gap-3 min-w-0 hover:shadow-xs transition-shadow">
              <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <Target className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[11px] xl:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Target</span>
                <span className="text-base xl:text-lg font-black text-slate-800 tracking-tight whitespace-nowrap truncate mt-0.5">
                  ₹ {targetCollection.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-medium text-slate-400 truncate mt-0.5">Scheduled Dues</span>
              </div>
            </div>

            {/* Card 2: Collection */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 xl:p-3.5 flex items-center gap-3 min-w-0 hover:shadow-xs transition-shadow">
              <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                <Wallet className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[11px] xl:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Collection</span>
                <span className="text-base xl:text-lg font-black text-sky-700 tracking-tight whitespace-nowrap truncate mt-0.5">
                  ₹ {totalCollection.toLocaleString('en-IN')}
                </span>
                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 whitespace-nowrap mt-0.5 truncate">
                  <span className="text-blue-600">UPI: ₹{onlineCollection.toLocaleString('en-IN')}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-600">Cash: ₹{cashCollection.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Pending */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 xl:p-3.5 flex items-center gap-3 min-w-0 hover:shadow-xs transition-shadow">
              <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Clock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[11px] xl:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Pending</span>
                <span className="text-base xl:text-lg font-black text-amber-600 tracking-tight whitespace-nowrap truncate mt-0.5">
                  ₹ {totalPendingAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-medium text-slate-400 truncate mt-0.5">Balance Due</span>
              </div>
            </div>

            {/* Card 4: OD (Overdue) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 xl:p-3.5 flex items-center gap-3 min-w-0 hover:shadow-xs transition-shadow">
              <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[11px] xl:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">OD (Overdue)</span>
                <span className="text-base xl:text-lg font-black text-rose-600 tracking-tight whitespace-nowrap truncate mt-0.5">
                  ₹ {totalOverdueAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-medium text-slate-400 truncate mt-0.5">Installment Overdue</span>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Debit-Only View */
          <div className="hidden lg:grid grid-cols-2 gap-4 w-full shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <HandCoins className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Loan Amount</span>
                <span className="text-base xl:text-lg font-black text-slate-800 tracking-tight whitespace-nowrap truncate mt-0.5">
                  ₹ {targetLoanAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25-9 5.25m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Disbursement</span>
                <span className="text-base xl:text-lg font-black text-slate-800 tracking-tight whitespace-nowrap truncate mt-0.5">
                  ₹ {totalDisbursement.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE VIEWPORT (< lg:): Existing 2-Card Container 100% UNTOUCHED */}
        <div className="lg:hidden w-full bg-[#f0f7ff] border border-sky-100 rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs divide-x divide-sky-200/70 shrink-0">
          
          {/* Card 1 (Left 50%) */}
          {isCreditActive && !isDebitActive ? (
            /* Case A: Card 1 = Target */
            <div className="flex-1 flex items-center gap-2 pr-2 sm:pr-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Target</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 whitespace-nowrap">
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
                <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 whitespace-nowrap">
                  ₹ {targetLoanAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ) : (
            /* Case C: Card 1 = Collection */
            <div className="flex-1 flex items-center justify-between gap-2 pr-2 sm:pr-3 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Collection</span>
                  <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 whitespace-nowrap">
                    ₹ {totalCollection.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              {/* UPI & Cash Breakdown (Clean, Non-overlapping Dot Rows) */}
              <div className="flex flex-col justify-center text-[9px] sm:text-[10px] leading-tight space-y-0.5 ml-auto shrink-0 border-l border-sky-200/70 pl-2">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="text-slate-500 font-medium">UPI:</span>
                  <span className="font-bold text-blue-700">₹{onlineCollection.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="text-slate-500 font-medium">Cash:</span>
                  <span className="font-bold text-emerald-700">₹{cashCollection.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 2 (Right 50%) */}
          {isCreditActive && !isDebitActive ? (
            /* Case A: Card 2 = Collection */
            <div className="flex-1 flex items-center justify-between gap-2 pl-2 sm:pl-3 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Collection</span>
                  <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 whitespace-nowrap">
                    ₹ {totalCollection.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              {/* UPI & Cash Breakdown */}
              <div className="flex flex-col justify-center text-[9px] sm:text-[10px] leading-tight space-y-0.5 ml-auto shrink-0 border-l border-sky-200/70 pl-2">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="text-slate-500 font-medium">UPI:</span>
                  <span className="font-bold text-blue-700">₹{onlineCollection.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="text-slate-500 font-medium">Cash:</span>
                  <span className="font-bold text-emerald-700">₹{cashCollection.toLocaleString('en-IN')}</span>
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
                <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 whitespace-nowrap">
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
                <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 whitespace-nowrap">
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
                <th className="py-2.5 px-3 sm:px-4 text-left text-[11px] font-semibold text-slate-500">
                  <div className="flex items-center justify-between gap-1">
                    <span>Name</span>
                    <button
                      onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      className="flex items-center gap-1 text-[10px] bg-slate-200/80 hover:bg-slate-300 active:bg-slate-400 text-slate-700 px-1.5 py-0.5 rounded-md transition-all cursor-pointer select-none border border-slate-300/60"
                      title={sortOrder === 'desc' ? "Sorted Newest to Oldest. Click for Oldest first." : "Sorted Oldest to Newest. Click for Newest first."}
                    >
                      <ArrowUpDown className="w-3 h-3 text-slate-600 shrink-0" />
                      <span className="font-bold text-[9px] sm:text-[10px] uppercase tracking-wide">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
                    </button>
                  </div>
                </th>
                
                {/* MOBILE-ONLY: MODE Header Column (< lg:) */}
                {isCreditActive && !isDebitActive ? (
                  <th className="lg:hidden py-2.5 px-3 sm:px-4 text-center text-[11px] font-semibold text-slate-500 w-24 sm:w-28">MODE</th>
                ) : null}

                {/* MOBILE-ONLY: Credit Header Column (< lg:) */}
                {isCreditActive && (
                  <th className="lg:hidden py-2.5 px-3 sm:px-4 text-center text-[11px] font-semibold text-emerald-600 bg-emerald-50/70 w-24 sm:w-36">Credit</th>
                )}

                {/* DESKTOP-ONLY: Expanded Columns when Credit is Active (lg:) */}
                {isCreditActive && (
                  <>
                    <th className="hidden lg:table-cell py-3 px-3 xl:px-4 text-center text-[11px] font-bold text-emerald-700 bg-emerald-50/60 w-24 xl:w-28">Cash</th>
                    <th className="hidden lg:table-cell py-3 px-3 xl:px-4 text-center text-[11px] font-bold text-blue-700 bg-blue-50/60 w-24 xl:w-28">UPI</th>
                    <th className="hidden lg:table-cell py-3 px-3 xl:px-4 text-center text-[11px] font-bold text-slate-800 bg-slate-200/60 w-28 xl:w-32">Collection</th>
                    <th className="hidden lg:table-cell py-3 px-3 xl:px-4 text-center text-[11px] font-bold text-amber-700 bg-amber-50/60 w-24 xl:w-28">Pending</th>
                    <th className="hidden lg:table-cell py-3 px-3 xl:px-4 text-center text-[11px] font-bold text-rose-700 bg-rose-50/60 w-24 xl:w-28">OD</th>
                  </>
                )}

                {/* DESKTOP-ONLY: Mode Header Column when Debit-Only is Active */}
                {!isCreditActive && isDebitActive && (
                  <th className="hidden lg:table-cell py-2.5 px-4 text-center text-[11px] font-semibold text-slate-500 w-28 lg:w-36">Mode</th>
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
                        <div className="font-semibold text-slate-800 leading-tight truncate">{item.name}</div>
                        <div className="text-[10px] sm:text-[11px] text-slate-400 font-normal mt-0.5 whitespace-nowrap">
                          {formatTransactionSubtext(item.date, item.timeStr, item.createdAt)}
                        </div>
                      </td>
                      
                      {/* MOBILE-ONLY: MODE / Merged Bounced Cell (< lg:) */}
                      {item.isBounced ? (
                        <td 
                          colSpan={isCreditActive && isDebitActive ? 2 : (isCreditActive && !isDebitActive ? 2 : 1)} 
                          className="lg:hidden py-2.5 sm:py-3 px-3 sm:px-4 text-center"
                        >
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-600 border border-rose-200 uppercase tracking-wider inline-block">
                            BOUNCED
                          </span>
                        </td>
                      ) : (
                        <>
                          {isCreditActive && !isDebitActive ? (
                            <td className="lg:hidden py-2.5 sm:py-3 px-2 text-center">
                              {item.isSplit ? (
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap border border-blue-200/60 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                    ₹{item.upiAmount.toLocaleString('en-IN')}
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap border border-emerald-200/60 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                    ₹{item.cashAmount.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ) : item.mode === 'UPI' || item.mode === 'Online' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs whitespace-nowrap">
                                  UPI
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs whitespace-nowrap">
                                  Cash
                                </span>
                              )}
                            </td>
                          ) : null}

                          {isCreditActive && (
                            <td className="lg:hidden py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold text-emerald-600">
                              ₹ {item.credit.toLocaleString('en-IN')}
                            </td>
                          )}
                        </>
                      )}

                      {/* DESKTOP-ONLY: Expanded Columns when Credit is Active (lg:) */}
                      {isCreditActive && (
                        item.isBounced ? (
                          <>
                            <td colSpan={3} className="hidden lg:table-cell py-3 px-3 xl:px-4 text-center">
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-600 border border-rose-200 uppercase tracking-wider inline-block">
                                BOUNCED
                              </span>
                            </td>
                            <td className="hidden lg:table-cell py-3 px-3 xl:px-4 text-center font-bold text-slate-400">
                              ₹ 0
                            </td>
                            <td className={`hidden lg:table-cell py-3 px-3 xl:px-4 text-center font-bold ${item.od > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-400'}`}>
                              {item.od > 0 ? `₹ ${item.od.toLocaleString('en-IN')}` : '₹ 0'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="hidden lg:table-cell py-3 px-3 xl:px-4 text-center font-bold text-emerald-700">
                              {item.cashAmount > 0 ? `₹ ${item.cashAmount.toLocaleString('en-IN')}` : '₹ 0'}
                            </td>
                            <td className="hidden lg:table-cell py-3 px-3 xl:px-4 text-center font-bold text-blue-700">
                              {item.upiAmount > 0 ? `₹ ${item.upiAmount.toLocaleString('en-IN')}` : '₹ 0'}
                            </td>
                            <td className="hidden lg:table-cell py-3 px-3 xl:px-4 text-center font-black text-slate-800 bg-slate-50/50">
                              ₹ {((item.cashAmount || 0) + (item.upiAmount || 0) || item.credit || 0).toLocaleString('en-IN')}
                            </td>
                            <td className={`hidden lg:table-cell py-3 px-3 xl:px-4 text-center font-bold ${item.pending > 0 ? 'text-amber-600 bg-amber-50/30' : 'text-slate-400'}`}>
                              {item.pending > 0 ? `₹ ${item.pending.toLocaleString('en-IN')}` : '₹ 0'}
                            </td>
                            <td className={`hidden lg:table-cell py-3 px-3 xl:px-4 text-center font-bold ${item.od > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-400'}`}>
                              {item.od > 0 ? `₹ ${item.od.toLocaleString('en-IN')}` : '₹ 0'}
                            </td>
                          </>
                        )
                      )}

                      {/* DESKTOP-ONLY: Mode Data Cell when Debit-Only is Active */}
                      {!isCreditActive && isDebitActive && (
                        item.isBounced ? (
                          <td colSpan={2} className="hidden lg:table-cell py-3 px-4 text-center">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-600 border border-rose-200 uppercase tracking-wider inline-block">
                              BOUNCED
                            </span>
                          </td>
                        ) : (
                          <td className="hidden lg:table-cell py-3 px-4 text-center font-semibold text-slate-600">
                            {item.mode}
                          </td>
                        )
                      )}

                      {/* Debit Data Cell */}
                      {isDebitActive && (
                        item.isBounced ? (
                          !isCreditActive ? null : (
                            <td className="hidden lg:table-cell py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold text-slate-300">
                              -
                            </td>
                          )
                        ) : (
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold text-rose-600">
                            ₹ {item.debit.toLocaleString('en-IN')}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                  {/* Bottom Clearance Spacer Row so 10th+ entries are fully clear of bottom navigation bar */}
                  <tr className="h-24 border-none pointer-events-none">
                    <td colSpan={colCountMobile} className="lg:hidden py-0 border-none"></td>
                    <td colSpan={colCountDesktop} className="hidden lg:table-cell py-0 border-none"></td>
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


