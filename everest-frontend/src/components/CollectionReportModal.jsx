import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Wallet, Target, HandCoins, ArrowUpDown, Filter, Check, Clock, CreditCard, ChevronDown } from 'lucide-react';
import CollectionReportDownloadModal from './CollectionReportDownloadModal';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { isCustomerActive, parseDateToTimestamp, computeEarliestTransactionDate } from './CashBook';

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

export const getTransactionBusinessDate = (rec) => {
  if (!rec) return '';
  return (
    rec.collection_date ||
    rec.collectionDate ||
    rec.payment_date ||
    rec.paymentDate ||
    rec.disbursement_date ||
    rec.disbursedDate ||
    rec.disbursedAt ||
    rec.date ||
    rec.dueDate ||
    rec.scheduledDate ||
    rec.created_at ||
    rec.createdAt ||
    ''
  );
};

const formatTransactionSubtext = (dateStr, timeStr, createdAt) => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  // 1. Resolve date strictly prioritizing business transaction date over system metadata
  const effectiveDate = dateStr || createdAt;
  let dateTs = null;

  if (effectiveDate) {
    if (typeof effectiveDate === 'number') {
      dateTs = effectiveDate;
    } else if (typeof effectiveDate === 'string') {
      dateTs = parseDateToTimestamp(effectiveDate);
    }
  }

  let dateObj = dateTs ? new Date(dateTs) : null;
  const now = new Date();
  let day = String(now.getDate()).padStart(2, '0');
  let monthStr = months[now.getMonth()];
  let yearStr = String(now.getFullYear()).slice(-2);

  if (dateObj && !isNaN(dateObj.getTime())) {
    day = String(dateObj.getDate()).padStart(2, '0');
    monthStr = months[dateObj.getMonth()];
    yearStr = String(dateObj.getFullYear()).slice(-2);
  } else if (effectiveDate && typeof effectiveDate === 'string') {
    const parts = effectiveDate.trim().split(/[.\-\/]/);
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

  // 2. Resolve time formatted (manual timeStr -> time from date if explicit -> entry time from createdAt)
  let timeFormatted = timeStr || '';

  if (!timeFormatted && dateObj && !isNaN(dateObj.getTime())) {
    const hasExplicitTime = typeof effectiveDate === 'string'
      ? (effectiveDate.includes('T') || effectiveDate.includes(':'))
      : typeof effectiveDate === 'number';
    if (hasExplicitTime && (dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0 || dateObj.getSeconds() !== 0)) {
      timeFormatted = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    }
  }

  if (!timeFormatted && createdAt) {
    const cTs = typeof createdAt === 'number' ? createdAt : parseDateToTimestamp(createdAt);
    if (cTs) {
      const cDate = new Date(cTs);
      if (!isNaN(cDate.getTime()) && (cDate.getHours() !== 0 || cDate.getMinutes() !== 0 || cDate.getSeconds() !== 0)) {
        timeFormatted = cDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
      }
    }
  }

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

  // Desktop Column Header Multi-Select Filter for Collection Staff
  const [selectedStaffColumnFilters, setSelectedStaffColumnFilters] = useState(() => new Set());
  const [showStaffColumnPopover, setShowStaffColumnPopover] = useState(false);
  const [staffPopoverCoords, setStaffPopoverCoords] = useState({ top: 0, left: 0 });
  const staffColumnPopoverRef = useRef(null);
  const staffColumnTriggerRef = useRef(null);

  // Independent Credit & Debit multi-toggle boolean states
  const [isCreditActive, setIsCreditActive] = useState(true);
  const [isDebitActive, setIsDebitActive] = useState(true);

  // Optional Bounced row inclusion filter (default: hidden)
  const [showBounced, setShowBounced] = useState(false);

  // Statement Download Modal state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Refs for Date inputs & Scroll
  const fromDateInputRef = useRef(null);
  const toDateInputRef = useRef(null);
  const tableScrollRef = useRef(null);

  useEffect(() => {
    if (isOpen && tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  // Bulletproof body scroll restoration helper
  const restoreBodyScroll = () => {
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.classList.remove('modal-open', 'overflow-hidden');
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.removeProperty('overflow');
      rootEl.style.removeProperty('height');
    }
  };

  // Body scroll-lock: apply on open, aggressively restore on unmount / close
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      restoreBodyScroll();
    };
  }, [isOpen]);

  useEffect(() => {
    // Unconditional unmount safeguard
    return () => {
      restoreBodyScroll();
    };
  }, []);

  // Explicit close handler with immediate scroll lock release
  const handleClose = () => {
    restoreBodyScroll();
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    window.handleCloseCollectionReport = handleClose;
    return () => {
      window.handleCloseCollectionReport = null;
    };
  }, [onClose]);


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
    setShowStaffColumnPopover(false);
    setSelectedStaffColumnFilters(new Set());
  }, [activeBranch?.id, activeBranch?.name]);

  // Auto-close Collection Staff column filter popover on outside click
  useEffect(() => {
    const handleStaffPopoverOutside = (event) => {
      if (
        staffColumnPopoverRef.current &&
        !staffColumnPopoverRef.current.contains(event.target) &&
        !staffColumnTriggerRef.current?.contains(event.target)
      ) {
        setShowStaffColumnPopover(false);
      }
    };
    if (showStaffColumnPopover) {
      document.addEventListener('mousedown', handleStaffPopoverOutside);
      document.addEventListener('touchstart', handleStaffPopoverOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleStaffPopoverOutside);
      document.removeEventListener('touchstart', handleStaffPopoverOutside);
    };
  }, [showStaffColumnPopover]);

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
      const earliestDate = computeEarliestTransactionDate({
        customers,
        customLedgerData,
        fallbackDate: today
      });
      setFromDate(formatDate(earliestDate));
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
      if (!isCustomerActive(c)) return;
      const cName = String(c.name || c.customerName || '').toLowerCase();
      if (cName.includes('anitha') || cName.includes('seetha')) return;
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
      if (!isCustomerActive(c)) return;
      const cName = String(c.name || c.customerName || '').toLowerCase();
      if (cName.includes('anitha') || cName.includes('seetha')) return;
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
      if (!isCustomerActive(customer)) return false;
      const cName = String(customer.name || customer.customerName || '').toLowerCase();
      if (cName.includes('anitha') || cName.includes('seetha')) return false;
      const custBranchId = String(customer.branchId || customer.branchCode || '').toLowerCase().trim();
      const custBranchName = String(customer.branch || customer.branchName || '').toLowerCase().trim();
      if (custBranchName.includes('gullapuram') || custBranchId.includes('gullapuram')) return false;

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
    const staffDirectory = firestoreStaff.length > 0 ? firestoreStaff : (staffList || []);
    const resolveRowStaffName = (cust, inst = null) => {
      const direct = String(
        inst?.collectedByName ||
        inst?.collectedBy ||
        inst?.staffName ||
        inst?.staff ||
        inst?.assignedStaff ||
        cust?.assignedStaff ||
        cust?.assignedStaffName ||
        cust?.staffName ||
        cust?.staff ||
        cust?.centerStaffName ||
        cust?.createdByStaffName ||
        ''
      ).trim();
      if (direct && direct.toLowerCase() !== 'unassigned' && direct.toLowerCase() !== 'staff unassigned') {
        return direct;
      }
      const targetId = String(inst?.staffId || cust?.staffId || cust?.assignedStaffId || cust?.createdByStaffId || '').trim().toLowerCase();
      if (targetId && Array.isArray(staffDirectory)) {
        const matched = staffDirectory.find(s =>
          s && [s.id, s.uid, s.docId, s.staffId, s.employeeId].some(k => k && String(k).trim().toLowerCase() === targetId)
        );
        if (matched) {
          return String(matched.name || matched.staffName || matched.displayName || '').trim();
        }
      }
      return '';
    };

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
        const dStr = getTransactionBusinessDate(inst);
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
        const dStr = getTransactionBusinessDate(inst);
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
          const dStr = getTransactionBusinessDate(inst);
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
          const dStr = getTransactionBusinessDate(inst);
          const ts = parseDateToTimestamp(dStr);
          if (ts && new Date(ts).setHours(0, 0, 0, 0) === todayStartTs && isInDateRange(dStr)) {
            if (ts >= latestTodayTs) {
              latestTodayTs = ts;
              latestTodayInstId = inst.id || idx;
            }
          }
        });

        rawInstallments.forEach((inst, index) => {
          const instDate = getTransactionBusinessDate(inst);
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
              staffName: resolveRowStaffName(cust, inst),
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
              loanType: cust.loanType || cust.scheme || cust.category || 'Microfinance',
              disbursementAmount: Number(cust.disbursedAmount || cust.disbursementAmount || cust.loanAmount || 0),
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
              staffName: resolveRowStaffName(cust, inst),
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
              loanType: cust.loanType || cust.scheme || cust.category || 'Microfinance',
              disbursementAmount: Number(cust.disbursedAmount || cust.disbursementAmount || cust.loanAmount || 0),
              date: instDate,
              timeStr: inst.timeStr || inst.time || '',
              createdAt: inst.createdAt || inst.date
            });
          }
        });
      }

      // Loan Amount & Disbursement for Date Range:
      const disbDate = cust.disbursement_date || cust.disbursementDate || cust.disbursedAt || cust.disbursedDate || cust.loanApprovedDate || cust.approvalDate || cust.loanDate || cust.date || cust.createdAt;
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
            staffName: resolveRowStaffName(cust),
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
            loanType: cust.loanType || cust.scheme || cust.category || 'Microfinance',
            disbursementAmount: disbAmount,
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
  }, [customers, customLedgerData, userProfile, activeBranch, disabledBranchIds, fromDate, toDate, selectedFilterIds, isAllSelected, isBranchFilterMode, canFilterByStaff, availableFilterItems, isMainBranch, userBranchId, firestoreStaff, staffList]);

  // Desktop Column Filter Options: active branch staff + all unique staff names in active branch records
  const collectionStaffFilterOptions = useMemo(() => {
    const map = new Map();
    const addStaff = (rawName) => {
      const name = String(rawName || '').trim();
      if (!name || name === '-' || name === '—' || name.toLowerCase() === 'n/a') return;
      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { key, name });
      }
    };

    (availableBranchStaff || []).forEach((s) => addStaff(s?.name));

    if (isMainBranch) {
      const combinedStaff = firestoreStaff.length > 0 ? firestoreStaff : (staffList || []);
      combinedStaff.forEach((s) => {
        if (!s) return;
        if (s.status === 'Recycled' || s.status === 'Deleted' || s.status === 'Inactive' || s.disabled === true) return;
        const sBranchId = s.branchId || s.branchCode;
        if (sBranchId && disabledBranchIds?.has(sBranchId)) return;
        addStaff(s.name || s.staffName || s.displayName);
      });
    }

    (ledgerEntries || []).forEach((item) => addStaff(item?.staffName));

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [availableBranchStaff, isMainBranch, firestoreStaff, staffList, disabledBranchIds, ledgerEntries]);

  const activeStaffColumnFilterCount = useMemo(() => {
    if (selectedStaffColumnFilters.size === 0 || collectionStaffFilterOptions.length === 0) return 0;
    return collectionStaffFilterOptions.filter((opt) => selectedStaffColumnFilters.has(opt.key)).length;
  }, [selectedStaffColumnFilters, collectionStaffFilterOptions]);

  const isStaffColumnFiltered =
    activeStaffColumnFilterCount > 0 &&
    activeStaffColumnFilterCount < collectionStaffFilterOptions.length;

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
                          String(item.staffName || '').toLowerCase().includes(query.toLowerCase()) ||
                          String(item.mode || '').toLowerCase().includes(query.toLowerCase()) ||
                          String(item.status || '').toLowerCase().includes(query.toLowerCase());
        }
      }

      // 1. Strict Bounced Filter: If unchecked, completely exclude bounced records
      const isBouncedRow = Boolean(
        item.isBounced || 
        item.status === 'BOUNCED' || 
        String(item.mode || '').toUpperCase() === 'BOUNCED' ||
        String(item.status || '').toUpperCase().includes('BOUNCE') ||
        String(item.mode || '').toUpperCase().includes('BOUNCE')
      );
      if (!showBounced && isBouncedRow) {
        return false;
      }

      let matchesType = false;
      if (isBouncedRow) {
        matchesType = isCreditActive;
      } else if (isCreditActive && isDebitActive) {
        matchesType = item.credit > 0 || item.debit > 0 || item.od > 0;
      } else if (isCreditActive) {
        matchesType = item.credit > 0 || item.od > 0;
      } else if (isDebitActive) {
        matchesType = item.debit > 0;
      } else {
        matchesType = false;
      }

      const staffKey = String(item.staffName || '').toLowerCase().trim();
      const matchesStaffColumn = !isStaffColumnFiltered || selectedStaffColumnFilters.has(staffKey);

      return matchesSearch && matchesType && matchesStaffColumn;
    });

    result.sort((a, b) => {
      const dateA = a.date || a.collection_date || a.payment_date || a.disbursement_date || a.createdAt;
      const dateB = b.date || b.collection_date || b.payment_date || b.disbursement_date || b.createdAt;
      const tsA = parseDateToTimestamp(dateA) || 0;
      const tsB = parseDateToTimestamp(dateB) || 0;
      if (tsA !== tsB) {
        return sortOrder === 'desc' ? tsB - tsA : tsA - tsB;
      }
      return sortOrder === 'desc' ? String(b.id).localeCompare(String(a.id)) : String(a.id).localeCompare(String(b.id));
    });

    return result;
  }, [ledgerEntries, searchTerm, isCreditActive, isDebitActive, sortOrder, showBounced, isStaffColumnFiltered, selectedStaffColumnFilters]);

  // CSV Export utility bound to header action (defined safely after filteredData initialization)
  const handleDownloadCSV = () => {
    if (!filteredData || filteredData.length === 0) {
      alert('No transaction records to export for selected filters.');
      return;
    }
    const headers = ['Date', 'Customer Name', 'Customer ID', 'Staff', 'Payment Mode', 'Credit (₹)', 'Debit (₹)', 'OD (₹)', 'Pending (₹)', 'Status'];
    const rows = filteredData.map(item => [
      `"${item.date || ''}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${item.customerId || ''}"`,
      `"${(item.staffName || item.assignedStaff || '').replace(/"/g, '""')}"`,
      `"${item.mode || ''}"`,
      item.credit || 0,
      item.debit || 0,
      item.od || 0,
      item.pending || 0,
      `"${item.status || 'SUCCESS'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Collection_Report_${fromDate || 'all'}_to_${toDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    window.handleDownloadCollectionReport = () => setIsDownloadModalOpen(true);
    return () => {
      window.handleDownloadCollectionReport = null;
    };
  }, []);

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
    if (searchTerm.trim() !== '' || isStaffColumnFiltered) {
      return filteredData.reduce((acc, curr) => acc + (Number(curr.pending) || 0), 0);
    }
    return Number(totalScopedPendingSafe || 0);
  }, [filteredData, searchTerm, isStaffColumnFiltered, totalScopedPendingSafe]);

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
  const colCountDesktop = 3 + (isCreditActive ? 4 : (isDebitActive ? 1 : 0)) + (isDebitActive ? 1 : 0);

  if (!isOpen) return null;

  return (
    <div className="w-full h-full min-h-[100dvh] md:min-h-0 bg-[#f8fafc] md:bg-gradient-to-b md:from-[#EAF4FF] md:via-[#F3F8FF] md:to-[#EAF3FF] flex flex-col overflow-hidden px-3 sm:px-4 md:px-6 pt-[max(env(safe-area-inset-top),12px)] md:pt-4 pb-3 md:pb-4 space-y-2.5 md:space-y-3 relative z-30">
      {/* DESKTOP-ONLY: Subtle Sky-Blue Sweeping Wave Backdrop */}
      <div className="hidden md:block pointer-events-none absolute inset-0 overflow-hidden z-0">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute top-0 right-0 w-full h-56 opacity-60">
          <path
            d="M0,96 C320,180 620,10 960,80 C1180,125 1330,45 1440,16 L1440,0 L0,0 Z"
            fill="url(#crTopWaveGrad)"
          />
          <defs>
            <linearGradient id="crTopWaveGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#BAE6FD" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.55" />
            </linearGradient>
          </defs>
        </svg>
        <svg viewBox="0 0 1440 160" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-24 opacity-70">
          <path
            d="M0,120 C360,30 720,150 1080,85 C1260,55 1370,70 1440,40 L1440,160 L0,160 Z"
            fill="url(#crBottomWaveGrad)"
          />
          <defs>
            <linearGradient id="crBottomWaveGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#BAE6FD" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.55" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* TOP FIXED AREA: 3 Compact Control Rows (Pinned) */}
      <div className="shrink-0 bg-[#f8fafc] md:bg-transparent z-20 space-y-2 md:space-y-2.5 pb-1 relative">
        
        {/* LINE 1: Date Range & Period (Side-by-Side in 1 Horizontal Row) */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 w-full shrink-0">
          {/* Back / Close Action Button */}
          {onClose && (
            <button
              type="button"
              onClick={handleClose}
              title="Back to Dashboard"
              className="w-[38px] h-[38px] md:w-10 md:h-10 rounded-xl md:rounded-full bg-white border border-slate-200/90 md:border-white flex items-center justify-center text-slate-600 md:text-[#0F4C81] hover:text-slate-900 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs md:shadow-md shrink-0 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
          )}

          {/* From Date */}
          <div 
            onClick={() => {
              try { fromDateInputRef.current?.showPicker?.(); } catch(e) { fromDateInputRef.current?.click?.(); }
            }}
            className="flex-1 md:flex-none md:w-48 lg:w-52 min-w-0 bg-white border border-slate-200/90 md:border-blue-300 rounded-xl md:rounded-2xl px-2.5 sm:px-3 md:px-3.5 h-[38px] md:h-[42px] flex items-center gap-1.5 sm:gap-2 shadow-2xs md:shadow-sm cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 md:text-[#0F4C81] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="flex flex-col justify-center min-w-0 flex-1 relative">
              <span className="text-[8px] sm:text-[9px] font-medium md:font-semibold text-slate-400 md:text-slate-500 leading-none truncate">From Date</span>
              <input
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs md:text-[13px] font-semibold md:font-extrabold text-slate-700 md:text-[#0F172A] bg-transparent outline-none p-0 border-none leading-none w-full cursor-text mt-0.5"
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
            className="flex-1 md:flex-none md:w-48 lg:w-52 min-w-0 bg-white border border-slate-200/90 md:border-blue-300 rounded-xl md:rounded-2xl px-2.5 sm:px-3 md:px-3.5 h-[38px] md:h-[42px] flex items-center gap-1.5 sm:gap-2 shadow-2xs md:shadow-sm cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 md:text-[#0F4C81] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="flex flex-col justify-center min-w-0 flex-1 relative">
              <span className="text-[8px] sm:text-[9px] font-medium md:font-semibold text-slate-400 md:text-slate-500 leading-none truncate">To Date</span>
              <input
                type="text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs md:text-[13px] font-semibold md:font-extrabold text-slate-700 md:text-[#0F172A] bg-transparent outline-none p-0 border-none leading-none w-full cursor-text mt-0.5"
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
          <div className="relative shrink-0 md:ml-auto">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="bg-[#1d4ed8] md:bg-gradient-to-r md:from-[#0B46A8] md:to-[#1D63DC] text-white rounded-xl md:rounded-2xl h-[38px] md:h-[42px] px-2.5 sm:px-3 md:px-5 font-semibold md:font-bold text-xs md:text-[13px] flex items-center gap-1 sm:gap-1.5 md:gap-2 shadow-xs md:shadow-md hover:bg-blue-700 transition-all cursor-pointer select-none"
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
        <div className="flex items-center justify-between gap-2 md:gap-3 w-full shrink-0">
          {/* Search Input with inline Funnel Filter */}
          <div 
            ref={searchContainerRef}
            className="flex-1 min-w-0 bg-slate-100/90 md:bg-white/95 border border-slate-200/80 md:border-blue-300 rounded-xl md:rounded-2xl px-2.5 sm:px-3 md:px-4 h-10 md:h-11 flex items-center gap-1.5 sm:gap-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-inner md:shadow-sm relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 md:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent outline-none text-xs md:text-[13px] text-slate-700 placeholder-slate-400 font-medium truncate"
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
                    : 'text-slate-400 md:text-[#1D63DC] hover:text-slate-600 hover:bg-slate-200/60 md:hover:bg-blue-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5 md:w-4 md:h-4" />
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

          {/* Credit, Debit & Bounced Action Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 h-10 md:h-11">
            <button
              onClick={() => setIsCreditActive((prev) => !prev)}
              className={`rounded-xl px-2.5 sm:px-3 md:px-4 h-full flex items-center gap-1 sm:gap-1.5 font-bold text-xs md:text-[13px] transition-all cursor-pointer border select-none ${
                isCreditActive
                  ? 'bg-emerald-600 md:bg-gradient-to-r md:from-[#15803D] md:to-[#22C55E] text-white border-emerald-600 shadow-md'
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
              className={`rounded-xl px-2.5 sm:px-3 md:px-4 h-full flex items-center gap-1 sm:gap-1.5 font-bold text-xs md:text-[13px] transition-all cursor-pointer border select-none ${
                isDebitActive
                  ? 'bg-rose-600 md:bg-gradient-to-r md:from-[#DC2626] md:to-[#F43F5E] text-white border-rose-600 shadow-md'
                  : 'bg-slate-100 text-slate-400 border-slate-200/80 opacity-60 hover:opacity-80'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
              <span>Debit</span>
            </button>

            {/* Optional Bounced Checkbox Filter */}
            <button
              onClick={() => setShowBounced((prev) => !prev)}
              title={showBounced ? 'Hide bounced rows' : 'Show bounced rows'}
              className={`rounded-xl px-2 sm:px-2.5 md:px-3.5 h-full flex items-center gap-1 md:gap-1.5 font-semibold text-[11px] md:text-xs transition-all cursor-pointer border select-none shrink-0 ${
                showBounced
                  ? 'bg-rose-50 text-rose-600 border-rose-300 shadow-xs'
                  : 'bg-slate-100 md:bg-white/95 text-slate-400 md:text-slate-700 border-slate-200/80 md:border-white md:shadow-sm hover:opacity-80 md:hover:opacity-100'
              }`}
            >
              {/* Tiny checkbox visual */}
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                showBounced ? 'bg-rose-500 border-rose-500' : 'bg-white border-slate-300'
              }`}>
                {showBounced && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5.5L4 8L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span>Bounced</span>
            </button>
          </div>
        </div>

        {/* DESKTOP VIEWPORT (md: and above): 4 Vibrant KPI Summary Cards when Credit is Active */}
        {isCreditActive ? (
          <div className="hidden md:grid grid-cols-4 gap-3 xl:gap-4 w-full shrink-0">
            {/* Card 1: TARGET (Blue Theme) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white via-[#F1F8FF] to-[#D6EDFF] rounded-2xl border border-[#BFDBFE] shadow-sm hover:shadow-md transition-shadow p-3.5 xl:p-4 flex items-center gap-3.5 min-w-0">
              <svg viewBox="0 0 320 60" preserveAspectRatio="none" className="absolute bottom-0 right-0 w-full h-9 pointer-events-none opacity-65">
                <path d="M0,48 C90,58 180,18 320,8 L320,60 L0,60 Z" fill="#60A5FA" fillOpacity="0.32" />
              </svg>
              <div className="relative z-10 w-11 h-11 xl:w-12 xl:h-12 rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-[#BFDBFE] text-[#0369A1] flex items-center justify-center shrink-0 border border-[#93C5FD] shadow-sm">
                <Target className="w-6 h-6 stroke-[2.3]" />
              </div>
              <div className="relative z-10 flex flex-col min-w-0 flex-1">
                <span className="text-[11px] xl:text-xs font-extrabold text-[#1E3A8A] uppercase tracking-wider truncate">TARGET</span>
                <span className="text-lg xl:text-xl font-black text-[#0F172A] tracking-tight whitespace-nowrap truncate mt-0.5">
                  ₹ {targetCollection.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] xl:text-[11px] font-semibold text-[#2563EB] truncate mt-0.5">Scheduled Dues</span>
              </div>
            </div>

            {/* Card 2: COLLECTION (Green Theme) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white via-[#EFFDF5] to-[#C6F6D5] rounded-2xl border border-[#86EFAC] shadow-sm hover:shadow-md transition-shadow p-3.5 xl:p-4 flex items-center gap-3.5 min-w-0">
              <svg viewBox="0 0 320 60" preserveAspectRatio="none" className="absolute bottom-0 right-0 w-full h-9 pointer-events-none opacity-65">
                <path d="M0,48 C110,58 200,15 320,8 L320,60 L0,60 Z" fill="#22C55E" fillOpacity="0.3" />
              </svg>
              <div className="relative z-10 w-11 h-11 xl:w-12 xl:h-12 rounded-2xl bg-gradient-to-br from-[#16A34A] to-[#22C55E] text-white flex items-center justify-center shrink-0 shadow-md ring-2 ring-white/70">
                <Wallet className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="relative z-10 flex flex-col min-w-0 flex-1">
                <span className="text-[11px] xl:text-xs font-extrabold text-[#14532D] uppercase tracking-wider truncate">COLLECTION</span>
                <span className="text-lg xl:text-xl font-black text-[#065F46] tracking-tight whitespace-nowrap truncate mt-0.5">
                  ₹ {totalCollection.toLocaleString('en-IN')}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] xl:text-[11px] font-bold text-[#15803D] whitespace-nowrap mt-0.5 truncate">
                  <span>Cash: ₹{cashCollection.toLocaleString('en-IN')}</span>
                  <span className="text-emerald-500/70">|</span>
                  <span className="text-[#0369A1]">UPI: ₹{onlineCollection.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Card 3: PENDING (Amber/Orange Theme) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white via-[#FFFBEB] to-[#FDE68A]/85 rounded-2xl border border-[#FCD34D] shadow-sm hover:shadow-md transition-shadow p-3.5 xl:p-4 flex items-center gap-3.5 min-w-0">
              <svg viewBox="0 0 320 60" preserveAspectRatio="none" className="absolute bottom-0 right-0 w-full h-9 pointer-events-none opacity-65">
                <path d="M0,48 C100,58 190,18 320,8 L320,60 L0,60 Z" fill="#F59E0B" fillOpacity="0.3" />
              </svg>
              <div className="relative z-10 w-11 h-11 xl:w-12 xl:h-12 rounded-2xl bg-gradient-to-br from-[#FFFBEB] to-[#FDE68A] text-[#D97706] flex items-center justify-center shrink-0 border border-[#F59E0B]/40 shadow-sm">
                <Clock className="w-6 h-6 stroke-[2.3]" />
              </div>
              <div className="relative z-10 flex flex-col min-w-0 flex-1">
                <span className="text-[11px] xl:text-xs font-extrabold text-[#78350F] uppercase tracking-wider truncate">PENDING</span>
                <span className="text-lg xl:text-xl font-black text-[#B45309] tracking-tight whitespace-nowrap truncate mt-0.5">
                  ₹ {totalPendingAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] xl:text-[11px] font-semibold text-[#D97706] truncate mt-0.5">Balance Due</span>
              </div>
            </div>

            {/* Card 4: DEBIT (Purple Theme — replaces OD) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white via-[#FAF5FF] to-[#E9D5FF]/90 rounded-2xl border border-[#D8B4FE] shadow-sm hover:shadow-md transition-shadow p-3.5 xl:p-4 flex items-center gap-3.5 min-w-0">
              <svg viewBox="0 0 320 60" preserveAspectRatio="none" className="absolute bottom-0 right-0 w-full h-9 pointer-events-none opacity-65">
                <path d="M0,48 C100,58 190,18 320,8 L320,60 L0,60 Z" fill="#9333EA" fillOpacity="0.25" />
              </svg>
              <div className="relative z-10 w-11 h-11 xl:w-12 xl:h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] text-white flex items-center justify-center shrink-0 shadow-md ring-2 ring-white/70">
                <CreditCard className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="relative z-10 flex flex-col min-w-0 flex-1">
                <span className="text-[11px] xl:text-xs font-extrabold text-[#4C1D95] uppercase tracking-wider truncate">DEBIT</span>
                <span className="text-lg xl:text-xl font-black text-[#6D28D9] tracking-tight whitespace-nowrap truncate mt-0.5">
                  ₹ {totalDisbursement.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] xl:text-[11px] font-semibold text-[#7C3AED] truncate mt-0.5">Total Disbursed</span>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Debit-Only View */
          <div className="hidden md:grid grid-cols-2 gap-4 w-full shrink-0">
            <div className="relative overflow-hidden bg-gradient-to-br from-white via-[#FFFBEB] to-[#FDE68A]/80 rounded-2xl border border-[#FCD34D] shadow-sm p-4 flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white flex items-center justify-center shrink-0 shadow-md">
                <HandCoins className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-extrabold text-[#78350F] uppercase tracking-wider truncate">Loan Amount</span>
                <span className="text-lg xl:text-xl font-black text-slate-900 tracking-tight whitespace-nowrap truncate mt-0.5">
                  ₹ {targetLoanAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-white via-[#FAF5FF] to-[#E9D5FF]/85 rounded-2xl border border-[#D8B4FE] shadow-sm p-4 flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] text-white flex items-center justify-center shrink-0 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25-9 5.25m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-extrabold text-[#4C1D95] uppercase tracking-wider truncate">Disbursement</span>
                <span className="text-lg xl:text-xl font-black text-[#6D28D9] tracking-tight whitespace-nowrap truncate mt-0.5">
                  ₹ {totalDisbursement.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE VIEWPORT (< md:): Existing 2-Card Container 100% UNTOUCHED */}
        <div className="md:hidden w-full bg-[#f0f7ff] border border-sky-100 rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs divide-x divide-sky-200/70 shrink-0">
          
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
            <div className="flex-1 flex items-center gap-1 pr-2 sm:pr-3 min-w-0 overflow-hidden">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Collection</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 truncate">
                  ₹ {totalCollection.toLocaleString('en-IN')}
                </span>
                {/* UPI & Cash Breakdown (compact stacked rows, truncates gracefully) */}
                <div className="flex items-center gap-1 mt-0.5 min-w-0 overflow-hidden">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium shrink-0">UPI:</span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-blue-700 truncate">₹{onlineCollection.toLocaleString('en-IN')}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ml-1"></span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium shrink-0">Cash:</span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-emerald-700 truncate">₹{cashCollection.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 2 (Right 50%) */}
          {isCreditActive && !isDebitActive ? (
            /* Case A: Card 2 = Collection */
            <div className="flex-1 flex items-center gap-1 pl-2 sm:pl-3 min-w-0 overflow-hidden">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Collection</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 truncate">
                  ₹ {totalCollection.toLocaleString('en-IN')}
                </span>
                {/* UPI & Cash Breakdown (compact stacked rows, truncates gracefully) */}
                <div className="flex items-center gap-1 mt-0.5 min-w-0 overflow-hidden">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium shrink-0">UPI:</span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-blue-700 truncate">₹{onlineCollection.toLocaleString('en-IN')}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ml-1"></span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium shrink-0">Cash:</span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-emerald-700 truncate">₹{cashCollection.toLocaleString('en-IN')}</span>
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
      <div className="relative z-10 flex-1 min-h-0 bg-white border border-slate-200/80 md:border-blue-400 rounded-2xl shadow-sm md:shadow-md flex flex-col overflow-hidden">
        <div ref={tableScrollRef} className="flex-1 min-h-0 overflow-y-auto pb-24 md:pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 md:bg-transparent border-b border-slate-200 md:border-slate-300 sticky top-0 z-10 select-none shadow-2xs md:shadow-sm">
              {/* MOBILE-ONLY HEADER ROW (< md:) - 100% Untouched */}
              <tr className="md:hidden">
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
                {isCreditActive && !isDebitActive ? (
                  <th className="py-2.5 px-3 sm:px-4 text-center text-[11px] font-semibold text-slate-500 w-24 sm:w-28">MODE</th>
                ) : null}
                {isCreditActive && (
                  <th className="py-2.5 px-3 sm:px-4 text-center text-[11px] font-semibold text-emerald-600 bg-emerald-50/70 w-24 sm:w-36">Credit</th>
                )}
                {isDebitActive && (
                  <th className="py-2.5 px-3 sm:px-4 text-center text-[11px] font-semibold text-rose-600 bg-rose-50/70 w-24 sm:w-36">Debit</th>
                )}
              </tr>

              {/* DESKTOP-ONLY UNIFORM ROYAL BLUE GROUPED HEADER (md: and above) */}
              <tr className="hidden md:table-row text-white">
                {/* 1. S.No */}
                <th
                  rowSpan={isCreditActive ? 2 : 1}
                  className="py-3 px-3 text-center text-xs font-bold tracking-wide bg-gradient-to-b from-[#005BB5] to-[#0066CC] border-r border-blue-400/50 w-16 align-middle"
                >
                  S.No
                </th>

                {/* 2. Name + Preserved Newest/Oldest Sort Toggle */}
                <th
                  rowSpan={isCreditActive ? 2 : 1}
                  className="py-3 px-4 text-left text-xs font-bold tracking-wide bg-gradient-to-b from-[#005BB5] to-[#0066CC] border-r border-blue-400/50 align-middle"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>Name</span>
                    <button
                      type="button"
                      onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      className="flex items-center gap-1 text-[10px] bg-white/15 hover:bg-white/25 active:bg-white/30 text-white px-2 py-1 rounded-lg transition-all cursor-pointer select-none border border-white/30 shadow-2xs"
                      title={sortOrder === 'desc' ? "Sorted Newest to Oldest. Click for Oldest first." : "Sorted Oldest to Newest. Click for Newest first."}
                    >
                      <ArrowUpDown className="w-3 h-3 text-blue-100 shrink-0" />
                      <span className="font-bold text-[10px] uppercase tracking-wide">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
                    </button>
                  </div>
                </th>

                {/* 3. Collection Staff (Multi-Select Checkbox Filter Header) */}
                <th
                  rowSpan={isCreditActive ? 2 : 1}
                  className="py-3 px-3 xl:px-4 text-center text-xs font-bold tracking-wide bg-gradient-to-b from-[#005BB5] to-[#0066CC] border-r border-blue-400/50 w-40 xl:w-48 align-middle"
                >
                  <button
                    ref={staffColumnTriggerRef}
                    type="button"
                    onClick={() => {
                      if (!showStaffColumnPopover && staffColumnTriggerRef.current) {
                        const rect = staffColumnTriggerRef.current.getBoundingClientRect();
                        const popoverHalfWidth = 120;
                        const clampedLeft = Math.max(
                          popoverHalfWidth + 12,
                          Math.min(window.innerWidth - popoverHalfWidth - 12, rect.left + rect.width / 2)
                        );
                        setStaffPopoverCoords({
                          top: rect.bottom + 8,
                          left: clampedLeft
                        });
                      }
                      setShowStaffColumnPopover((prev) => !prev);
                    }}
                    className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer select-none ${
                      isStaffColumnFiltered || showStaffColumnPopover
                        ? 'bg-white/25 text-white ring-1 ring-white/50 shadow-2xs'
                        : 'hover:bg-white/15 text-white'
                    }`}
                    title="Filter by Collection Staff"
                  >
                    <span>Collection Staff</span>
                    {isStaffColumnFiltered && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-white text-[#005BB5] text-[10px] font-extrabold leading-none">
                        ({activeStaffColumnFilterCount})
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-blue-100 shrink-0 transition-transform duration-150 ${showStaffColumnPopover ? 'rotate-180' : ''}`} />
                  </button>
                </th>

                {/* Mode column when Debit-Only is active */}
                {!isCreditActive && isDebitActive && (
                  <th className="py-3 px-4 text-center text-xs font-bold tracking-wide bg-gradient-to-b from-[#005BB5] to-[#0066CC] border-r border-blue-400/50 w-32 align-middle">
                    Mode
                  </th>
                )}

                {/* 4. Collection (Grouped Parent Header spanning Cash | UPI | Total) */}
                {isCreditActive && (
                  <th
                    colSpan={3}
                    className={`py-2 px-3 text-center text-xs font-bold tracking-wide bg-gradient-to-b from-[#005BB5] to-[#0066CC] border-b border-blue-400/50 border-r border-blue-400/50`}
                  >
                    Collection
                  </th>
                )}

                {/* 5. Pending */}
                {isCreditActive && (
                  <th
                    rowSpan={2}
                    className={`py-3 px-3 xl:px-4 text-center text-xs font-bold tracking-wide bg-gradient-to-b from-[#005BB5] to-[#0066CC] ${isDebitActive ? 'border-r border-blue-400/50' : ''} w-28 xl:w-32 align-middle`}
                  >
                    Pending
                  </th>
                )}

                {/* 6. Debit (Far-right column) */}
                {isDebitActive && (
                  <th
                    rowSpan={isCreditActive ? 2 : 1}
                    className="py-3 px-3 xl:px-4 text-center text-xs font-bold tracking-wide bg-gradient-to-b from-[#005BB5] to-[#0066CC] w-28 xl:w-32 align-middle"
                  >
                    Debit
                  </th>
                )}
              </tr>

              {/* DESKTOP-ONLY SUB-COLUMNS ROW FOR COLLECTION (Cash | UPI | Total) */}
              {isCreditActive && (
                <tr className="hidden md:table-row">
                  <th className="py-2 px-3 xl:px-4 text-center text-[11px] font-bold text-[#0F172A] bg-[#DBEAFE] border-b border-r border-slate-300 w-24 xl:w-28">
                    Cash
                  </th>
                  <th className="py-2 px-3 xl:px-4 text-center text-[11px] font-bold text-[#0F172A] bg-[#DBEAFE] border-b border-r border-slate-300 w-24 xl:w-28">
                    UPI
                  </th>
                  <th className="py-2 px-3 xl:px-4 text-center text-[11px] font-extrabold text-[#0F172A] bg-[#DBEAFE] border-b border-r border-slate-300 w-28 xl:w-32">
                    Total
                  </th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 md:divide-slate-300 text-xs">
              {filteredData.length > 0 ? (
                <>
                  {filteredData.map((item, index) => {
                    const isCollectionCredit = Number(item.credit || 0) > 0;
                    const rowCash = isCollectionCredit ? Number(item.cashAmount || 0) : 0;
                    const rowUpi = isCollectionCredit ? Number(item.upiAmount || 0) : 0;
                    const rowCollectionTotal = isCollectionCredit ? ((rowCash + rowUpi) || Number(item.credit || 0)) : 0;
                    return (
                    <tr key={item.id} className="hover:bg-slate-50/70 md:odd:bg-white md:even:bg-[#F8FAFC] md:hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-medium md:font-extrabold text-slate-400 md:text-slate-900 md:border-r md:border-slate-300">{index + 1}</td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 md:px-4 md:border-r md:border-slate-300">
                        <div className="font-semibold md:font-extrabold text-slate-800 md:text-slate-900 leading-tight truncate">{item.name}</div>
                        <div className="text-[10px] sm:text-[11px] text-slate-400 md:text-slate-500 font-normal md:font-semibold mt-0.5 whitespace-nowrap">
                          {formatTransactionSubtext(item.date, item.timeStr, item.createdAt)}
                        </div>
                      </td>
                      
                      {/* MOBILE-ONLY BODY CELLS (< md:) - 100% Untouched */}
                      {item.isBounced ? (
                        <td 
                          colSpan={isCreditActive && isDebitActive ? 2 : (isCreditActive && !isDebitActive ? 2 : 1)} 
                          className="md:hidden py-2.5 sm:py-3 px-3 sm:px-4 text-center"
                        >
                          <span className="text-[11px] sm:text-xs font-semibold text-rose-500 tracking-wide uppercase">
                            BOUNCED
                          </span>
                        </td>
                      ) : (
                        <>
                          {isCreditActive && !isDebitActive ? (
                            <td className="md:hidden py-2.5 sm:py-3 px-2 text-center">
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
                            <td className="md:hidden py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold text-emerald-600">
                              ₹ {item.credit.toLocaleString('en-IN')}
                            </td>
                          )}
                        </>
                      )}

                      {isDebitActive && !item.isBounced && (
                        <td className="md:hidden py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold text-rose-600">
                          ₹ {item.debit.toLocaleString('en-IN')}
                        </td>
                      )}

                      {/* DESKTOP-ONLY BODY CELLS (md: and above) - Exact Column Order: Collection Staff | Collection (Cash, UPI, Total) | Pending | Debit */}
                      <td className={`hidden md:table-cell py-3 px-3 xl:px-4 text-center font-extrabold text-slate-900 ${(isCreditActive || isDebitActive) ? 'border-r border-slate-300' : ''}`}>
                        {item.staffName || '-'}
                      </td>

                      {!isCreditActive && isDebitActive && (
                        item.isBounced ? (
                          <td colSpan={2} className="hidden md:table-cell py-3 px-4 text-center">
                            <span className="text-xs font-bold text-rose-500 tracking-wide uppercase">
                              BOUNCED
                            </span>
                          </td>
                        ) : (
                          <>
                            <td className="hidden md:table-cell py-3 px-4 text-center font-bold text-slate-800 border-r border-slate-300">
                              {item.mode}
                            </td>
                            <td className="hidden md:table-cell py-3 px-3 xl:px-4 text-center font-extrabold text-rose-600">
                              {item.debit > 0 ? `₹ ${item.debit.toLocaleString('en-IN')}` : <span className="text-slate-500 font-bold">-</span>}
                            </td>
                          </>
                        )
                      )}

                      {isCreditActive && (
                        item.isBounced ? (
                          <>
                            <td colSpan={3} className="hidden md:table-cell py-3 px-3 xl:px-4 text-center border-r border-slate-300">
                              <span className="text-xs font-bold text-rose-500 tracking-wide uppercase">
                                BOUNCED
                              </span>
                            </td>
                            <td className={`hidden md:table-cell py-3 px-3 xl:px-4 text-center font-bold text-slate-500 ${isDebitActive ? 'border-r border-slate-300' : ''}`}>
                              -
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Collection -> Cash */}
                            <td className="hidden md:table-cell py-3 px-3 xl:px-4 text-center font-extrabold text-slate-900 border-r border-slate-300">
                              {rowCash > 0 ? `₹ ${rowCash.toLocaleString('en-IN')}` : <span className="text-slate-500 font-bold">-</span>}
                            </td>
                            {/* Collection -> UPI */}
                            <td className="hidden md:table-cell py-3 px-3 xl:px-4 text-center font-extrabold text-blue-700 border-r border-slate-300">
                              {rowUpi > 0 ? `₹ ${rowUpi.toLocaleString('en-IN')}` : <span className="text-slate-500 font-bold">-</span>}
                            </td>
                            {/* Collection -> Total */}
                            <td className="hidden md:table-cell py-3 px-3 xl:px-4 text-center font-extrabold text-slate-900 border-r border-slate-300">
                              {rowCollectionTotal > 0 ? `₹ ${rowCollectionTotal.toLocaleString('en-IN')}` : <span className="text-slate-500 font-bold">-</span>}
                            </td>
                            {/* Pending */}
                            <td className={`hidden md:table-cell py-3 px-3 xl:px-4 text-center font-extrabold ${isDebitActive ? 'border-r border-slate-300' : ''} ${item.pending > 0 ? 'text-amber-700' : 'text-slate-500 font-bold'}`}>
                              {item.pending > 0 ? `₹ ${item.pending.toLocaleString('en-IN')}` : '-'}
                            </td>
                          </>
                        )
                      )}

                      {/* Far-Right Column: Debit */}
                      {isCreditActive && isDebitActive && (
                        <td className="hidden md:table-cell py-3 px-3 xl:px-4 text-center font-extrabold">
                          {!item.isBounced && item.debit > 0 ? (
                            <span className="text-rose-600">₹ {item.debit.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-slate-500 font-bold">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                    );
                  })}
                  {/* Bottom Clearance Spacer Row so 10th+ entries are fully clear of bottom navigation bar */}
                  <tr className="h-24 md:h-4 border-none pointer-events-none">
                    <td colSpan={colCountMobile} className="md:hidden py-0 border-none"></td>
                    <td colSpan={colCountDesktop} className="hidden md:table-cell py-0 border-none"></td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={colCountMobile} className="md:hidden py-8 text-center text-slate-400 font-medium">
                    No transactions found matching "{searchTerm}"
                  </td>
                  <td colSpan={colCountDesktop} className="hidden md:table-cell py-8 text-center text-slate-400 font-medium">
                    No transactions found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DESKTOP-ONLY: Floating Collection Staff Multi-Select Checkbox Filter Popover (z-[80]) */}
      {showStaffColumnPopover && (
        <div
          ref={staffColumnPopoverRef}
          style={{
            position: 'fixed',
            top: `${staffPopoverCoords.top}px`,
            left: `${staffPopoverCoords.left}px`,
            transform: 'translateX(-50%)'
          }}
          className="hidden md:block w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/95 py-2 z-[80] text-left font-normal text-slate-700 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Filter by Staff</span>
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setSelectedStaffColumnFilters(new Set(collectionStaffFilterOptions.map((o) => o.key)))}
                className="text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setSelectedStaffColumnFilters(new Set())}
                className="text-slate-500 hover:text-rose-600 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
            {collectionStaffFilterOptions.length > 0 ? (
              collectionStaffFilterOptions.map((staffOpt) => {
                const isChecked = selectedStaffColumnFilters.has(staffOpt.key);
                return (
                  <label
                    key={staffOpt.key}
                    className={`flex items-center gap-2.5 px-3.5 py-2 text-xs cursor-pointer select-none transition-colors hover:bg-blue-50/60 ${
                      isChecked ? 'bg-blue-50/35 font-bold text-slate-900' : 'text-slate-700 font-medium'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedStaffColumnFilters((prev) => {
                          const next = new Set(prev);
                          if (next.has(staffOpt.key)) {
                            next.delete(staffOpt.key);
                          } else {
                            next.add(staffOpt.key);
                          }
                          return next;
                        });
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-[#0066CC] cursor-pointer shrink-0"
                    />
                    <span className="truncate">{staffOpt.name}</span>
                  </label>
                );
              })
            ) : (
              <div className="px-3.5 py-3 text-[11px] text-slate-400 italic text-center">
                No staff found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statement Download & PDF Modal */}
      <CollectionReportDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        activeBranch={activeBranch}
        branches={branches}
        fromDate={fromDate}
        toDate={toDate}
        data={filteredData}
        allLedgerData={ledgerEntries}
        searchTerm={searchTerm}
        isCreditActive={isCreditActive}
        isDebitActive={isDebitActive}
        sortOrder={sortOrder}
        targetCollection={totalScopedTarget}
        totalCollection={totalCollection}
        onlineCollection={onlineCollection}
        cashCollection={cashCollection}
        totalScopedPending={totalPendingAmount}
        totalScopedOverdue={totalOverdueAmount}
        totalDisbursement={totalDisbursement}
        initialIncludeBounced={showBounced}
      />

    </div>
  );
}


