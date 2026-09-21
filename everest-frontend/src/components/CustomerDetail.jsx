import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Map, MapPin, Phone, CalendarDays, Clock, IndianRupee, FileText, Scale, Sprout, MoreVertical, Star, Square, X, Camera as CameraIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import OfflineImage from './OfflineImage';
import femaleAvatar from '../assets/avatar-female.png';
import maleAvatar from '../assets/avatar-male.png';
import companyLogo from '../assets/logo.png';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ApprovalDetailsModal from './ApprovalDetailsModal';

const defaultAvatar = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMWUyOTNiIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGYxNzJhIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImF2YXRhciIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzY0NzQ4YiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJ1cmwoI2JnKSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE2IiBmaWxsPSJ1cmwoI2F2YXRhcikiLz48cGF0aCBkPSJNNTAgNjJDMzAgNjIgMTYgNzggMTYgOTVDMjYgOTggMzcgMTAwIDUwIDEwMEM2MyAxMDAgNzQgOTggODQgOTVDODQgNzggNzAgNjIgNTAgNjJaIiBmaWxsPSJ1cmwoI2F2YXRhcikiLz48L3N2Zz4=";

const CustomerDetail = ({ customer, onBack }) => {
  const [showPhoneMenu, setShowPhoneMenu] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showCustomerReportModal, setShowCustomerReportModal] = useState(false);
  const [includeBounces, setIncludeBounces] = useState(false);
  const [collectionDate, setCollectionDate] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  
  // Transaction Edit Modal States
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isEditTransactionMode, setIsEditTransactionMode] = useState(false);
  const [transactionEditData, setTransactionEditData] = useState({ date: '', number: '', amount: '' });
  
  // Advanced Entry & Denomination States
  const [isManualEntryMode, setIsManualEntryMode] = useState(false);
  const [isDenominationMode, setIsDenominationMode] = useState(false);
  const [isUpiPhotoSelectionMode, setIsUpiPhotoSelectionMode] = useState(false);
  const [tempUpiPhoto, setTempUpiPhoto] = useState(null);
  const [manualCash, setManualCash] = useState('');
  const [manualUpi, setManualUpi] = useState('');
  const [denomCounts, setDenomCounts] = useState({ '500': '', '200': '', '100': '', '50': '', '20': '', '10': '', 'Coins': '' });
  const [upiPhoto, setUpiPhoto] = useState(null);
  const [reviewTransaction, setReviewTransaction] = useState(null);
  const [reviewSlideIndex, setReviewSlideIndex] = useState(0);

  const phoneMenuRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const touchStartXRef = useRef(0);

  const [installments, setInstallments] = useState(() => {
    if (!customer || !customer.id) return [];
    if (customer.installments && Array.isArray(customer.installments) && customer.installments.length > 0) return customer.installments;
    try {
      const saved = localStorage.getItem(`everest_ledger_${customer.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    if (installments.length > 0 && scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          try {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          } catch (e) {
            console.error("Scroll error:", e);
          }
        }
      }, 50);
    }
  }, [installments]);

  useEffect(() => {
    if (customer && customer.installments && Array.isArray(customer.installments)) {
      setInstallments(customer.installments);
    }
  }, [customer?.installments]);

  useEffect(() => {
    if (customer && customer.id) {
      localStorage.setItem(`everest_ledger_${customer.id}`, JSON.stringify(installments));
    }
  }, [installments, customer]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (phoneMenuRef.current && !phoneMenuRef.current.contains(event.target)) {
        setShowPhoneMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!customer) return null;

  const loanAmount = customer.loanAmount !== undefined && customer.loanAmount !== '' ? Number(customer.loanAmount) : 0;
  const repayAmount = customer.repayAmount !== undefined && customer.repayAmount !== '' ? Number(customer.repayAmount) : 0;
  
  const getPlanToken = () => {
    if (customer.tenureUnit) return customer.tenureUnit.toUpperCase().replace(/S$/, '');
    if (customer.weeks) return 'WEEK';
    if (customer.days) return 'DAY';
    if (customer.months) return 'MONTH';
    return 'WEEK';
  };
  const planToken = getPlanToken();

  const getPlanCount = () => {
    if (customer.tenureVal) return Number(customer.tenureVal);
    if (customer.weeks) return Number(customer.weeks);
    if (customer.days) return Number(customer.days);
    if (customer.months) return Number(customer.months);
    return 12;
  };
  const planCount = getPlanCount();
  const numberOfWeeks = planCount; // Ensure fallback compatibility
  const emiAmount = repayAmount > 0 ? Math.round(repayAmount / numberOfWeeks) : 0;

  const runningSubTotal = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
  const netBalance = Math.max(0, repayAmount - runningSubTotal);
  const rawDueDate = customer.nextDueDate || customer.dueDate || '26-05-2026';

  const formatName = (name) => {
    if (!name) return '';
    return name.replace(/^(Mr\.|Mrs\.|Miss\.|Mr|Mrs|Miss|Ms)\s*/i, '').trim();
  };

  const parseDate = (dStr) => {
    if (!dStr) return new Date();
    if (dStr.includes('-') && dStr.split('-')[0].length === 2) {
      const parts = dStr.split('-');
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return new Date(dStr);
  };

  const getNumberSuffix = (num) => {
    const j = num % 10, k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  const recalculateInstallments = (insts) => {
    let updated = [...insts];
    updated.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
    let cumulativePaid = 0;
    let fallbackCount = 0;
    
    return updated.map(inst => {
      let currentStatus = inst.status;
      const amt = parseFloat(inst.amount) || 0;
      
      if (amt > 0) currentStatus = 'PAID';
      else if (amt === 0 && currentStatus === 'PAID') currentStatus = 'BOUNCED';

      let newNumber = inst.number;
      if (currentStatus === 'PAID') {
        fallbackCount++;
        const cycleIndex = emiAmount > 0 ? Math.floor(cumulativePaid / emiAmount) + 1 : fallbackCount;
        newNumber = cycleIndex + getNumberSuffix(cycleIndex);
        cumulativePaid += amt;
      } else if (currentStatus === 'BOUNCED') {
        const cycleIndex = emiAmount > 0 ? Math.floor(cumulativePaid / emiAmount) + 1 : fallbackCount + 1;
        newNumber = cycleIndex + getNumberSuffix(cycleIndex);
      }
      return { ...inst, status: currentStatus, number: newNumber };
    });
  };

  const nonBouncedInstallments = installments.filter(inst => inst.status !== 'BOUNCED');
  
  const sumByNumber = {};
  nonBouncedInstallments.forEach(inst => {
    sumByNumber[inst.number] = (sumByNumber[inst.number] || 0) + (inst.amount || 0);
  });
  const uniqueNumbers = Object.keys(sumByNumber);
  const fullySettledCount = uniqueNumbers.filter(num => sumByNumber[num] >= emiAmount).length;

  const sortedValidInsts = [...nonBouncedInstallments].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  const lastValidInst = sortedValidInsts.length > 0 ? sortedValidInsts[sortedValidInsts.length - 1] : null;
  
  const closedDateStr = (netBalance <= 0 && lastValidInst) ? lastValidInst.date : null;
  const closedDateObj = closedDateStr ? parseDate(closedDateStr) : null;
  const closedDateFormatted = closedDateObj ? `${String(closedDateObj.getDate()).padStart(2, '0')}-${String(closedDateObj.getMonth() + 1).padStart(2, '0')}-${closedDateObj.getFullYear()}` : '';
  const closedWeekday = closedDateObj ? closedDateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() : '';

  const totalPaidForLastNumber = lastValidInst ? sumByNumber[lastValidInst.number] : 0;
  
  const isLastPending = lastValidInst && totalPaidForLastNumber < emiAmount;
  const targetPendingAmount = isLastPending ? emiAmount - totalPaidForLastNumber : 0;
  const currentDueAmount = isLastPending ? targetPendingAmount : emiAmount;

  const effectiveInstallmentCount = fullySettledCount;
  const baseDateObj = parseDate(rawDueDate);

  const calculateLatePayments = (entries = []) => {
    const dueGroups = {};
    
    entries.forEach(entry => {
      const due = entry.number; // map from our 'number' field
      if (!due) return;
      if (!dueGroups[due]) dueGroups[due] = [];
      dueGroups[due].push(entry);
    });
  
    let lateCount = 0;
    const now = new Date();
    now.setHours(0,0,0,0);
  
    Object.keys(dueGroups).forEach(dueNumberStr => {
      const dueNumber = parseInt(dueNumberStr, 10);
      const groupEntries = dueGroups[dueNumberStr];
      
      // Calculate scheduled due date for this cycle
      const scheduledDateObj = new Date(baseDateObj);
      const idx = dueNumber - 1;
      
      if (planToken === 'DAY') {
        scheduledDateObj.setDate(scheduledDateObj.getDate() + idx);
      } else if (planToken === 'MONTH') {
        scheduledDateObj.setMonth(scheduledDateObj.getMonth() + idx);
      } else { // WEEK
        scheduledDateObj.setDate(scheduledDateObj.getDate() + (idx * 7));
      }
      scheduledDateObj.setHours(0,0,0,0);
      
      const hasBounced = groupEntries.some(e => e.status === 'BOUNCED');
      
      const totalPaid = groupEntries
        .filter(e => e.status === 'PAID')
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        
      let latestPaymentDate = new Date(0);
      groupEntries.filter(e => e.status === 'PAID').forEach(e => {
        const d = parseDate(e.date);
        d.setHours(0,0,0,0);
        if (d > latestPaymentDate) latestPaymentDate = d;
      });
      
      const isLateSettled = totalPaid >= emiAmount && latestPaymentDate > scheduledDateObj;
      const isPartiallyPaidAndPastDue = totalPaid < emiAmount && now > scheduledDateObj;
      
      if (hasBounced || isLateSettled || isPartiallyPaidAndPastDue) {
        lateCount += 1;
      }
    });
  
    return lateCount;
  };

  const latePaymentCount = calculateLatePayments(installments);

  const nextDueDateObj = new Date(baseDateObj);
  if (planToken === 'DAY') {
    nextDueDateObj.setDate(nextDueDateObj.getDate() + effectiveInstallmentCount);
  } else if (planToken === 'MONTH') {
    nextDueDateObj.setMonth(nextDueDateObj.getMonth() + effectiveInstallmentCount);
  } else { // WEEK
    nextDueDateObj.setDate(nextDueDateObj.getDate() + (effectiveInstallmentCount * 7));
  }

  const dd = String(nextDueDateObj.getDate()).padStart(2, '0');
  const mm = String(nextDueDateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = nextDueDateObj.getFullYear();
  const nextFormattedDueDate = `${dd}-${mm}-${yyyy}`;
  const nextFormattedWeekday = nextDueDateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

  const now = new Date();
  now.setHours(0,0,0,0);
  // Zero out nextDueDateObj time for pure date comparison
  const targetDateForCompare = new Date(nextDueDateObj);
  targetDateForCompare.setHours(0,0,0,0);
  
  const isFutureDate = targetDateForCompare > now;

  const formattedDueDate = (() => {
    if (!rawDueDate) return '';
    if (rawDueDate.includes('-') && rawDueDate.split('-')[0].length === 2) {
      return rawDueDate;
    } else {
      const d = new Date(rawDueDate);
      if (isNaN(d.getTime())) return rawDueDate;
      const fdd = String(d.getDate()).padStart(2, '0');
      const fmm = String(d.getMonth() + 1).padStart(2, '0');
      const fyyyy = d.getFullYear();
      return `${fdd}-${fmm}-${fyyyy}`;
    }
  })();

  const isFemale = (() => {
    try {
      if (!customer) return false;
      let isFem = false;
      if (customer.name && typeof customer.name === 'string') {
        const lowerName = customer.name.toLowerCase().trim();
        if (lowerName.startsWith('mrs') || lowerName.startsWith('ms') || lowerName.startsWith('miss')) {
          isFem = true;
        }
      }
      if (!isFem && customer.gender && typeof customer.gender === 'string') {
        if (customer.gender.toLowerCase() === 'female') {
          isFem = true;
        }
      }
      return isFem;
    } catch (err) {
      return false;
    }
  })();

  const centerAvatarSrc = isFemale ? femaleAvatar : maleAvatar;

  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const nextLogicalNumber = effectiveInstallmentCount + 1;
  const nextNumber = getOrdinal(nextLogicalNumber);

  const lastInstallment = installments[installments.length - 1];
  const isRetrySequence = lastInstallment && lastInstallment.status === 'BOUNCED';

  const getModalDateCompare = () => {
    if (!showCollectionModal) return false;
    const dObj = parseDate(collectionDate || nextFormattedDueDate);
    dObj.setHours(0,0,0,0);
    const nowObj = new Date();
    nowObj.setHours(0,0,0,0);
    return dObj > nowObj;
  };
  const isModalFutureDate = getModalDateCompare();

  const handleCloseEntryModal = () => {
    setIsManualEntryMode(false);
    setIsDenominationMode(false);
    setIsUpiPhotoSelectionMode(false);
    setTempUpiPhoto(null);
    setManualCash('');
    setManualUpi('');
    setUpiPhoto(null);
    setDenomCounts({ '500': '', '200': '', '100': '', '50': '', '20': '', '10': '', 'Coins': '' });
    setShowCollectionModal(false);
  };

  const handleOpenCollectionModal = () => {
    if (netBalance <= 0) {
      alert(`This loan account is already closed and fully settled. Further entries cannot be recorded.`);
      return;
    }
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const todayFormatted = `${dd}-${mm}-${yyyy}`;

    let defaultDate = isLastPending ? todayFormatted : nextFormattedDueDate;

    if (customer?.loanType && customer.loanType.toLowerCase() === 'daily') {
      const insts = Array.isArray(customer?.installments) ? customer.installments : [];
      if (insts.length > 0) {
        const sortedInsts = [...insts].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
        const lastInst = sortedInsts[sortedInsts.length - 1];
        if (lastInst && lastInst.date) {
          const lastDateObj = parseDate(lastInst.date);
          if (!isNaN(lastDateObj.getTime())) {
            lastDateObj.setDate(lastDateObj.getDate() + 1);
            defaultDate = `${String(lastDateObj.getDate()).padStart(2, '0')}-${String(lastDateObj.getMonth() + 1).padStart(2, '0')}-${lastDateObj.getFullYear()}`;
          }
        }
      }
    }

    setCollectionDate(defaultDate);
    setIsManualEntryMode(false);
    setIsDenominationMode(false);
    setIsUpiPhotoSelectionMode(false);
    setTempUpiPhoto(null);
    setManualCash('');
    setManualUpi('');
    setUpiPhoto(null);
    setDenomCounts({ '500': '', '200': '', '100': '', '50': '', '20': '', '10': '', 'Coins': '' });
    setShowCollectionModal(true);
  };

  // Denom Math
  const getDenomTotal = () => {
    return (Number(denomCounts['500']) * 500) +
           (Number(denomCounts['200']) * 200) +
           (Number(denomCounts['100']) * 100) +
           (Number(denomCounts['50']) * 50) +
           (Number(denomCounts['20']) * 20) +
           (Number(denomCounts['10']) * 10) +
           (Number(denomCounts['Coins']) || 0);
  };

  const handleCapturePhoto = async (sourceType) => {
    try {
      const check = await Camera.checkPermissions();
      if (check.camera !== 'granted' && check.photos !== 'granted') {
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      }
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: sourceType
      });
      setTempUpiPhoto(`data:image/jpeg;base64,${image.base64String}`);
    } catch (e) {
      console.error("User cancelled or camera error", e);
    }
  };

  const grandTotal = Number(manualCash || 0) + Number(manualUpi || 0);
  const manualPending = currentDueAmount - grandTotal;

  const handleManualQuickPay = () => {
    if (isModalFutureDate) return;
    const nextId = installments.length + 1;
    
    const newInstallment = {
      id: nextId,
      date: collectionDate || nextFormattedDueDate,
      number: nextNumber,
      status: 'PAID',
      amount: grandTotal,
      timeStr: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
      upiPhoto: upiPhoto,
      denomCounts: denomCounts
    };
    
    let updatedInstallments = [...installments, newInstallment];
    updatedInstallments = recalculateInstallments(updatedInstallments);
    setInstallments(updatedInstallments);
    setShowCollectionModal(false);

    if (customer && customer.id) {
      try {
        const customerRef = doc(db, 'customers', customer.id);
        updateDoc(customerRef, { 
          installments: updatedInstallments,
          lastUpdated: new Date().toISOString()
        }).catch(err => console.error("Cloud sync failed:", err));
      } catch(err) {
        console.error("Firestore error:", err);
      }
    }
  };


  const handleQuickPay = () => {
    if (isModalFutureDate) return;

    const nextId = installments.length + 1;
    
    // Append to bottom of ledger
    const newInstallment = {
      id: nextId,
      date: collectionDate || nextFormattedDueDate,
      number: nextNumber,
      status: 'PAID',
      amount: currentDueAmount,
      timeStr: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
    };
    
    let updatedInstallments = [...installments, newInstallment];
    updatedInstallments = recalculateInstallments(updatedInstallments);
    setInstallments(updatedInstallments);
    setShowCollectionModal(false);

    // Cloud Sync
    if (customer && customer.id) {
      try {
        const customerRef = doc(db, 'customers', customer.id);
        updateDoc(customerRef, { 
          installments: updatedInstallments,
          lastUpdated: new Date().toISOString()
        }).catch(err => console.error("Cloud sync failed:", err));
      } catch(err) {
        console.error("Firestore error:", err);
      }
    }
  };

  const handleBounce = () => {
    if (isModalFutureDate) return;

    const nextId = installments.length + 1;
    
    // Append to bottom of ledger
    const newInstallment = {
      id: nextId,
      date: collectionDate || nextFormattedDueDate,
      number: nextNumber,
      status: 'BOUNCED',
      amount: 0,
      timeStr: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
    };
    
    let updatedInstallments = [...installments, newInstallment];
    updatedInstallments = recalculateInstallments(updatedInstallments);
    setInstallments(updatedInstallments);
    setShowCollectionModal(false);

    // Cloud Sync
    if (customer && customer.id) {
      try {
        const customerRef = doc(db, 'customers', customer.id);
        updateDoc(customerRef, { 
          installments: updatedInstallments,
          lastUpdated: new Date().toISOString()
        }).catch(err => console.error("Cloud sync failed:", err));
      } catch(err) {
        console.error("Firestore error:", err);
      }
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm("Are you sure you want to move this customer to the Recycle Bin?")) return;
    try {
      const customerRef = doc(db, 'customers', id);
      await updateDoc(customerRef, {
        status: 'Recycled',
        previousStatus: customer.status || 'Approved',
        lastUpdated: new Date().toISOString()
      });
      setShowVerificationModal(false);
      onBack();
    } catch (err) {
      console.error("Move to recycle bin failed:", err);
      alert("Failed to move customer to recycle bin.");
    }
  };

  const handleSaveTransaction = async () => {
    if (!selectedTransaction) return;
    try {
      let updatedInstallments = installments.map(inst => 
        inst.id === selectedTransaction.id 
          ? { ...inst, date: transactionEditData.date, number: transactionEditData.number, amount: parseFloat(transactionEditData.amount) || 0 } 
          : inst
      );
      updatedInstallments = recalculateInstallments(updatedInstallments);
      setInstallments(updatedInstallments);
      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, { 
        installments: updatedInstallments,
        lastUpdated: new Date().toISOString()
      });
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error saving transaction', error);
      alert('Failed to update transaction.');
    }
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;
    if (!window.confirm('Are you sure you want to delete this log?')) return;
    
    try {
      const updatedInstallments = installments.filter(inst => inst.id !== selectedTransaction.id);
      const deletedInst = { ...selectedTransaction, deletedAt: new Date().toISOString() };
      
      const currentDeleted = customer.deletedInstallments || [];
      const updatedDeleted = [...currentDeleted, deletedInst];
      
      setInstallments(updatedInstallments);
      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, { 
        installments: updatedInstallments,
        deletedInstallments: updatedDeleted,
        lastUpdated: new Date().toISOString()
      });
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error deleting transaction', error);
      alert('Failed to delete transaction.');
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] md:h-full bg-gradient-to-b from-[#115e41] via-[#1b7c58] to-[#f4f7f6] overflow-hidden relative font-sans w-full max-w-md md:max-w-7xl mx-auto shadow-2xl md:shadow-none">
      
      {/* Top Section */}
      <div className="md:hidden px-3 sm:px-6 pt-6 pb-0 relative z-10 flex-shrink-0">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start w-full gap-2">
          {/* Left: Back Button, Phone & Loan Amount */}
          <div className="flex flex-col gap-3 justify-start items-start min-w-0">
            <div className="flex gap-1 sm:gap-2">
              <button onClick={onBack} className="text-white p-1.5 sm:p-2 sm:-ml-2 rounded-full hover:bg-white/10 transition-colors z-20 flex-shrink-0">
                <ArrowLeft className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
              <div className="relative" ref={phoneMenuRef}>
                <button 
                  onClick={() => setShowPhoneMenu(!showPhoneMenu)}
                  className="bg-white/10 backdrop-blur-xl border border-[#4ade80]/40 p-2 sm:p-2.5 rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.15)] hover:bg-white/20 transition-colors z-20 mt-0.5 flex-shrink-0"
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
                {showPhoneMenu && (
                  <div className="absolute top-full left-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg p-1.5 shadow-2xl z-50 min-w-[140px] flex flex-col gap-0.5">
                    <a href={`tel:${customer.phone || customer.mobile || ''}`} className="flex items-center gap-2 text-white hover:bg-white/10 px-2 py-1.5 rounded-md transition-colors text-[11px] sm:text-xs font-semibold whitespace-nowrap">
                      <Star className="w-3 h-3 text-emerald-400 fill-emerald-400 flex-shrink-0" />
                      <span>{customer.phone || customer.mobile || 'No Primary Phone'}</span>
                    </a>
                    {(customer.altPhone || customer.alternateMobile) && (
                      <a href={`tel:${customer.altPhone || customer.alternateMobile}`} className="flex items-center gap-2 text-slate-300 hover:bg-white/10 px-2 py-1.5 rounded-md transition-colors text-[11px] sm:text-xs font-medium whitespace-nowrap">
                        <Square className="w-2.5 h-2.5 text-slate-400 fill-slate-400 flex-shrink-0 ml-[1px]" />
                        <span>{customer.altPhone || customer.alternateMobile}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-center mt-12 sm:mt-14 w-full min-w-0">
              <p className="text-[9px] min-[360px]:text-[10px] sm:text-xs text-slate-300 font-bold uppercase tracking-wider mb-0.5 text-center whitespace-nowrap bg-transparent" style={{ WebkitTextStroke: '0.3px rgba(255,255,255,0.6)', textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>Loan Amount</p>
              <h3 className="text-[20px] sm:text-[26px] font-black text-[#4ade80] tracking-tighter flex items-center justify-center text-center whitespace-nowrap bg-transparent drop-shadow-md">
                <IndianRupee className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] mr-[1px] stroke-[3] flex-shrink-0 drop-shadow-sm" />
                <span>{loanAmount.toLocaleString('en-IN')}</span>
              </h3>
            </div>
          </div>

          {/* Center: Profile Card & Due Date */}
          <div className="flex flex-col items-center">
            <div className="w-[115px] min-[360px]:w-[140px] sm:w-[170px] bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-2xl border-[1.5px] border-[#4ade80]/40 rounded-2xl sm:rounded-[1.5rem] p-2 sm:p-3 flex flex-col items-center shadow-[0_0_40px_rgba(52,211,153,0.3)] relative overflow-hidden z-30 mx-auto">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-emerald-300/30 to-transparent pointer-events-none"></div>
              
              <div className="w-[56px] h-[56px] sm:w-[68px] sm:h-[68px] rounded-full border-[3px] border-white/50 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.4)] mb-2 relative z-10 bg-slate-200 flex-shrink-0">
                <OfflineImage src={customer.image || defaultAvatar} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mb-1 relative z-10 text-center tracking-tight leading-tight whitespace-normal break-words">{formatName(customer.name)}</h2>
              
              <div className="w-[85%] h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent mb-1 shadow-[0_0_15px_rgba(110,231,183,1)] relative z-10"></div>
              
              <p className="text-emerald-50 text-[10px] sm:text-[11px] font-medium relative z-10 tracking-wide text-center min-h-[15px] sm:min-h-[16.5px]">{customer.villageName || customer.villageCity || customer.area || customer.location || customer.center || '\u00A0'}</p>
            </div>
            
            {netBalance <= 0 ? (
              <p className="text-[13px] sm:text-[15px] font-bold text-white mt-3.5 tracking-wider text-center whitespace-nowrap" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,1)' }}>CLOSED ON: {closedDateFormatted} {closedWeekday && <span className="opacity-90">({closedWeekday})</span>}</p>
            ) : (
              (!customer?.loanType || customer.loanType.toLowerCase() !== 'daily') && (
                <p className="text-[13px] sm:text-[15px] font-bold text-white mt-3.5 tracking-wider text-center whitespace-nowrap" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,1)' }}>Next Due : {nextFormattedDueDate}</p>
              )
            )}
          </div>

          {/* Right: MapPin, Settings & Outstanding Amount */}
          <div className="flex flex-col gap-3 justify-start items-end min-w-0">
            <div className="flex gap-1 sm:gap-3">
              <a href={customer.locationUrl || customer.customerLocationUrl || `https://maps.google.com/?q=${customer.city || customer.address || ''}`} target="_blank" rel="noopener noreferrer" className="bg-white/10 backdrop-blur-xl border border-[#4ade80]/40 p-2 sm:p-2.5 rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.15)] hover:bg-white/20 transition-colors z-20 mt-0.5 flex-shrink-0 flex items-center justify-center">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </a>
              <button 
                onClick={() => setShowVerificationModal(true)}
                className="bg-white/10 backdrop-blur-xl border border-[#4ade80]/40 p-2 sm:p-2.5 rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.15)] hover:bg-white/20 transition-colors z-20 mt-0.5 flex-shrink-0"
              >
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </div>

            <div className="flex flex-col items-center mt-12 sm:mt-14 w-full min-w-0">
              <p className="text-[9px] min-[360px]:text-[10px] sm:text-xs text-slate-300 font-bold uppercase tracking-wider mb-0.5 text-center whitespace-nowrap bg-transparent" style={{ WebkitTextStroke: '0.3px rgba(255,255,255,0.6)', textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>Outstanding</p>
              <h3 className="text-[20px] sm:text-[26px] font-black text-[#ef4444] tracking-tighter flex items-center justify-center text-center whitespace-nowrap bg-transparent drop-shadow-md">
                <IndianRupee className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] mr-[1px] stroke-[3] flex-shrink-0 drop-shadow-sm" />
                <span>{netBalance.toLocaleString('en-IN')}</span>
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Top Section */}
      <div className="hidden md:flex flex-row justify-between items-stretch px-8 pt-6 pb-2 relative z-10 gap-6">
        {/* Left: Back Button & Profile Card */}
        <div className="flex items-center gap-6 flex-1">
          {/* Back Button Outside */}
          <button onClick={onBack} className="text-white p-3 rounded-full hover:bg-white/10 transition-colors flex-shrink-0 border border-white/20 bg-white/5 backdrop-blur-md">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-[1.5rem] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] gap-4 w-max">
            <div className="w-[80px] h-[80px] rounded-full border-[3px] border-white/50 overflow-hidden shadow-lg relative bg-slate-200 flex-shrink-0">
              <OfflineImage src={customer.image || defaultAvatar} alt="Profile" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex flex-col flex-1 pr-2">
              <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">{formatName(customer.name)}</h2>
              <p className="text-emerald-100 text-sm font-medium tracking-wide mt-0.5">{customer.villageName || customer.villageCity || customer.area || customer.location || customer.center || '\u00A0'}</p>
              
              <div className="flex items-center gap-2 mt-2">
                <a href={`tel:${customer.phone || customer.mobile || ''}`} className="bg-white/20 hover:bg-white/30 border border-[#4ade80]/40 p-2 rounded-lg transition-colors flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </a>
                <a href={customer.locationUrl || customer.customerLocationUrl || `https://maps.google.com/?q=${customer.city || customer.address || ''}`} target="_blank" rel="noopener noreferrer" className="bg-white/20 hover:bg-white/30 border border-[#4ade80]/40 p-2 rounded-lg transition-colors flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </a>
                <button onClick={() => setShowVerificationModal(true)} className="bg-white/20 hover:bg-white/30 border border-[#4ade80]/40 p-2 rounded-lg transition-colors flex items-center justify-center">
                  <MoreVertical className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Metric Cards */}
        <div className="flex gap-6 flex-none justify-end md:items-start">
          
          <div className="flex flex-col gap-3 w-full">
            <div className="flex gap-6">
              {/* Loan Amount */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[1.5rem] p-5 md:py-3 md:px-4 md:h-fit flex flex-col items-center justify-center flex-1 min-w-[160px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <p className="text-[11px] text-emerald-100 font-bold uppercase tracking-wider mb-2 md:mb-1">Loan Amount</p>
                <h3 className="text-[28px] font-black text-[#4ade80] tracking-tighter flex items-center drop-shadow-md">
                  <IndianRupee className="w-6 h-6 mr-1 stroke-[3]" />
                  {loanAmount.toLocaleString('en-IN')}
                </h3>
              </div>
              {/* Outstanding */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[1.5rem] p-5 md:py-3 md:px-4 md:h-fit flex flex-col items-center justify-center flex-1 min-w-[160px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <p className="text-[11px] text-emerald-100 font-bold uppercase tracking-wider mb-2 md:mb-1">Outstanding</p>
                <h3 className="text-[28px] font-black text-[#ef4444] tracking-tighter flex items-center drop-shadow-md">
                  <IndianRupee className="w-6 h-6 mr-1 stroke-[3]" />
                  {netBalance.toLocaleString('en-IN')}
                </h3>
              </div>
            </div>
            
            {/* Sleek Next Due Text Indicator */}
            {netBalance <= 0 ? (
              <div className="flex justify-center items-center text-[12px] font-black text-emerald-50 uppercase tracking-widest mt-1">
                 <span className="mr-2 text-emerald-200">CLOSED ON:</span>
                 <span className="text-[14px] text-white drop-shadow-md tracking-wider">
                   {closedDateFormatted}
                   {closedWeekday && <span className="ml-1.5 text-[11px] text-emerald-100 opacity-90">({closedWeekday})</span>}
                 </span>
              </div>
            ) : (
              (!customer?.loanType || customer.loanType.toLowerCase() !== 'daily') && (
                <div className="flex justify-center items-center text-[12px] font-black text-emerald-50 uppercase tracking-widest mt-1">
                   <span className="mr-2 text-emerald-200">NEXT DUE:</span>
                   <span className="text-[14px] text-white drop-shadow-md tracking-wider">
                     {nextFormattedDueDate} 
                     {nextFormattedWeekday && <span className="ml-1.5 text-[11px] text-emerald-100 opacity-90">({nextFormattedWeekday})</span>}
                   </span>
                </div>
              )
            )}
          </div>
          {/* Top-Right Loan Summary */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[1.5rem] p-4 flex flex-col justify-center w-[240px] flex-none shadow-[0_8px_30px_rgba(0,0,0,0.12)] h-[116px]">
            <div className="flex flex-col gap-2 w-full">
              {/* Row 1: Total Re-Pay */}
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">Total Re-Pay</span>
                <span className="text-[12px] font-black text-white">₹{repayAmount.toLocaleString('en-IN')}</span>
              </div>
              
              {/* Row 2: Progress */}
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">Progress</span>
                <span className="text-[12px] font-black text-white">
                  {effectiveInstallmentCount}/{planCount} {planToken ? planToken.charAt(0).toUpperCase() + planToken.slice(1).toLowerCase() + 's' : 'Weeks'}
                </span>
              </div>

              {/* Row 3: Bounced */}
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">Bounced</span>
                <span className="text-[12px] font-black text-red-400">
                  {installments.filter(i => i.status === 'BOUNCED').length}
                </span>
              </div>

              {/* Row 4: Late Payment */}
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">Late Payment</span>
                <span className="text-[12px] font-black text-amber-400">
                  {latePaymentCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="flex-1 bg-[#f8fafc] md:bg-transparent rounded-t-[2.5rem] md:rounded-none pt-6 md:pt-2 px-4 md:px-8 relative z-20 flex flex-col md:flex-row shadow-[0_-10px_30px_rgba(0,0,0,0.15)] md:shadow-none mt-4 md:mt-0 overflow-hidden gap-6 pb-0 md:pb-8">        
        
        {/* Left Column: Ledger */}
        <div className="flex-1 flex flex-col relative md:bg-white md:rounded-2xl md:shadow-xl md:border md:border-slate-200 overflow-hidden">
        
        {/* Background Avatar Watermark */}
        {centerAvatarSrc && (
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700 ${installments.length === 0 ? 'opacity-100 z-10' : 'opacity-[0.08] z-0'}`}>
            <img 
              src={centerAvatarSrc} 
              alt="Background Watermark" 
              className={`w-[400px] h-[400px] object-contain transition-transform duration-500 ${isFemale ? '' : 'scale-110'}`}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Empty State Message */}
        {installments.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none translate-y-32">
            <p className="text-slate-600 font-bold text-sm leading-relaxed max-w-[260px] text-center drop-shadow-sm bg-white/40 backdrop-blur-md py-3 px-4 rounded-2xl border border-white/60">
              No transactions initiated yet! Press <strong className="text-[#1b7c58]">'Pay Now'</strong> to record your first installment.
            </p>
          </div>
        )}

        {/* Live Installment Ledger Table */}
        <div ref={scrollContainerRef} className="relative z-10 flex-1 overflow-y-auto mb-[80px] md:mb-0 custom-scrollbar flex flex-col">
          {installments.length > 0 && (
            <div className="flex items-center justify-between px-2 pb-1 bg-[#f8fafc] relative z-30">
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest bg-slate-200 px-2.5 py-1 rounded-md border border-slate-300 shadow-sm">
                Entries: {installments.length}
              </span>
            </div>
          )}
          <table className="w-full text-center border-collapse relative">
            {installments.length > 0 && (
              <thead className="sticky top-0 bg-[#f8fafc] z-20 shadow-sm outline outline-1 outline-slate-200/50">
                <tr>
                  <th className="py-3 px-1 text-[11px] sm:text-xs font-extrabold text-slate-700 tracking-wider bg-[#f8fafc] w-12 text-center">S.NO</th>
                  <th className="py-3 px-1 text-[11px] sm:text-xs font-extrabold text-slate-700 tracking-wider bg-[#f8fafc] text-center">DATE</th>
                  <th className="py-3 px-1 text-[11px] sm:text-xs font-extrabold text-slate-700 tracking-wider bg-[#f8fafc]">DUE</th>
                  <th className="py-3 px-1 text-[11px] sm:text-xs font-extrabold text-slate-700 tracking-wider bg-[#f8fafc]">STATUS</th>
                  <th className="py-3 px-1 text-[11px] sm:text-xs font-extrabold text-slate-700 tracking-wider text-right pr-4 bg-[#f8fafc]">AMOUNT</th>
                </tr>
              </thead>
            )}
            <tbody>
              {installments.map((inst, index) => {
                const isPaid = inst.status === 'PAID';
                const cumulativePaidUpToThis = installments
                  .slice(0, index + 1)
                  .filter(i => i.number === inst.number && i.status !== 'BOUNCED')
                  .reduce((sum, i) => sum + (i.amount || 0), 0);
                
                const displayStatus = (isPaid && cumulativePaidUpToThis < emiAmount) ? 'PENDING' : inst.status;
                const hasDenomData = inst.denomCounts && Object.values(inst.denomCounts).some(val => Number(val) > 0);
                const hasUpiData = !!inst.upiPhoto;
                const hasReviewData = hasDenomData || hasUpiData;
                const isClickable = hasReviewData && (displayStatus === 'PAID' || displayStatus === 'PENDING');
                const dotColor = displayStatus === 'PAID' ? 'text-green-900' : 'text-orange-900';

                return (
                <tr 
                  key={inst.id || index} 
                  onClick={() => {
                    setSelectedTransaction(inst);
                    setTransactionEditData({ date: inst.date, number: inst.number, amount: inst.amount || '' });
                    setIsEditTransactionMode(false);
                  }}
                  className="border-b border-slate-200/60 hover:bg-slate-100 transition-colors whitespace-nowrap text-[11px] sm:text-[13px] cursor-pointer"
                >
                  <td className="py-3.5 px-1 sm:px-2 font-black text-slate-400 text-[10px] sm:text-[12px] text-center">{index + 1}</td>
                  <td className="py-3.5 px-1 font-bold text-slate-800 text-center">
                    <div className="flex flex-col items-center">
                      <span>{inst.date}</span>
                      <span className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">({parseDate(inst.date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}){inst.timeStr ? ` ${inst.timeStr}` : ''}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-1 font-semibold text-slate-600">{inst.number.replace(/[()]/g, '')}</td>
                  <td className="py-3.5 px-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isClickable) {
                          setReviewTransaction(inst);
                          setReviewSlideIndex(0);
                        }
                      }}
                      className={`inline-flex items-center justify-center px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-extrabold text-white tracking-widest shadow-sm min-w-[70px] sm:min-w-[85px]
                      ${isClickable ? 'active:scale-95 transition-transform cursor-pointer' : 'cursor-default'}
                      ${displayStatus === 'PAID' ? 'bg-[#22c55e]' : 
                        displayStatus === 'PENDING' ? 'bg-[#f59e0b]' : 
                        displayStatus === 'BOUNCED' ? 'bg-[#ef4444]' : 
                        displayStatus === 'O.D.' ? 'bg-[#ef4444]' : 'bg-slate-400'}`}
                    >
                      {displayStatus}
                      {isClickable && <span className="ml-1.5 text-[11px] text-[#fbbf24] drop-shadow-sm flex items-center justify-center translate-y-[-0.5px]">★</span>}
                    </button>
                  </td>
                  <td className="py-3.5 px-1 font-black text-[#1b7c58] text-right pr-4 text-[12px] sm:text-[14px]">
                    {inst.amount ? `₹${inst.amount.toLocaleString('en-IN')}` : '--'}
                  </td>
                </tr>
              )})}
            </tbody>
            {installments.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200/80 shadow-[0_-2px_10px_rgba(0,0,0,0.02)] sticky bottom-0 z-20">
                <tr>
                  <td colSpan="4" className="py-3.5 px-2 text-right text-[13px] sm:text-[14px] font-black text-slate-900 uppercase tracking-widest drop-shadow-sm">
                    Sub-total
                  </td>
                  <td className="py-3.5 px-1 text-[15px] sm:text-[16px] font-black text-[#1b7c58] text-right pr-4 tracking-tight drop-shadow-sm">
                    ₹{installments.reduce((sum, inst) => sum + (inst.amount || 0), 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        </div>

        {/* Right Column: Radial Arc Action Dock (Desktop Only) */}
        <div className="hidden md:flex w-[90px] flex-col items-center justify-center h-full relative z-20 flex-none gap-8">
          
          {/* Top Arc Action: Schedule */}
          <div className="relative group translate-x-3 z-0">
            <button onClick={() => setShowScheduleModal(true)} className="bg-white hover:bg-blue-50 border border-slate-200 w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:scale-110 transition-all duration-300">
              <Clock className="w-5 h-5 text-blue-600" />
            </button>
            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 bg-white text-slate-800 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md whitespace-nowrap pointer-events-none">Schedule</span>
          </div>

          {/* Center Action: Entry (Primary) */}
          <div className="relative group -translate-x-3 z-10">
            <button onClick={handleOpenCollectionModal} className="bg-gradient-to-b from-[#19825b] to-[#125c40] border-[4px] border-[#f4f7f6] w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(18,75,51,0.5)] hover:scale-110 transition-all duration-300 overflow-hidden relative">
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <IndianRupee className="w-7 h-7 text-white stroke-[2.5] drop-shadow-md z-10 relative" />
            </button>
            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 bg-white text-slate-800 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md whitespace-nowrap pointer-events-none">Entry</span>
          </div>

          {/* Bottom Arc Action: Statement */}
          <div className="relative group translate-x-3 z-0">
            <button onClick={() => setShowStatementModal(true)} className="bg-white hover:bg-purple-50 border border-slate-200 w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:scale-110 transition-all duration-300">
              <FileText className="w-5 h-5 text-purple-600 stroke-[2.5]" />
            </button>
            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 bg-white text-slate-800 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md whitespace-nowrap pointer-events-none">Statement</span>
          </div>

        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 w-full z-50 md:hidden">
        <div className="bg-[#124b33] rounded-t-[2rem] h-20 flex justify-between items-center px-8 relative shadow-[0_-15px_30px_rgba(0,0,0,0.15)] border-t border-white/5 pb-2">
          
          {/* SCHEDULE */}
          <button 
            onClick={() => setShowScheduleModal(true)}
            className="flex flex-col items-center justify-center gap-1 opacity-80 hover:opacity-100 transition-opacity flex-1"
          >
            <div className="p-1.5 border border-white/10 bg-white/5 rounded-xl">
               <Clock className="w-4 h-4 text-emerald-100" />
            </div>
            <span className="text-[9px] text-emerald-100 font-bold tracking-widest uppercase mt-0.5">SCHEDULE</span>
          </button>

          {/* Pay Now (Center pop-up) */}
          <div className="relative -top-6 flex-shrink-0 mx-2 flex flex-col items-center">
            <button 
              onClick={handleOpenCollectionModal}
              className="bg-gradient-to-b from-[#19825b] to-[#125c40] border-[4px] border-[#f4f7f6] w-[70px] h-[70px] rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(18,75,51,0.5)] hover:scale-105 transition-transform group relative overflow-hidden z-10"
            >
               {/* Internal Glow */}
               <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
               
               {/* Decorative Dashed Ring */}
               <div className="absolute inset-[4px] border-[2px] border-white/40 rounded-full border-dashed group-hover:animate-spin-slow"></div>

               <IndianRupee className="w-7 h-7 text-white stroke-[2.5] drop-shadow-md z-10 relative" />
            </button>
            <span className="absolute -bottom-5 text-[10px] text-slate-800 font-extrabold tracking-widest uppercase bg-white px-2 py-0.5 rounded-full shadow-sm z-20 border border-slate-200">Entry</span>
          </div>

          {/* Report */}
          <button 
            onClick={() => setShowStatementModal(true)}
            className="flex flex-col items-center justify-center gap-1 opacity-80 hover:opacity-100 transition-opacity flex-1"
          >
            <div className="p-1.5 border border-blue-500/30 bg-blue-500/10 rounded-xl">
               <FileText className="w-4 h-4 text-blue-300" />
            </div>
            <span className="text-[9px] text-white font-bold tracking-widest uppercase mt-0.5">STATEMENT</span>
          </button>

        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full h-[85vh] sm:h-[80vh] sm:max-w-2xl bg-[#f8fafc] sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#115e41] to-[#1b7c58] px-6 py-5 flex justify-between items-center shadow-md relative z-10">
              <div>
                <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-emerald-300" />
                  REPAYMENT SCHEDULE
                </h2>
                <p className="text-emerald-100/80 text-xs font-semibold mt-1 tracking-wider uppercase">
                  {planCount} {planToken}S PLAN • EMI ₹{emiAmount.toLocaleString('en-IN')}
                </p>
              </div>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white relative">
              <table className="w-full text-center border-collapse">
                <thead className="sticky top-0 bg-slate-100 shadow-sm z-20 outline outline-1 outline-slate-200">
                  <tr>
                    <th className="py-3 px-2 text-[10px] sm:text-xs font-extrabold text-slate-700 tracking-wider w-[15%] uppercase">
                      {planToken}
                    </th>
                    <th className="py-3 px-2 text-[10px] sm:text-xs font-extrabold text-slate-700 tracking-wider w-[25%]">
                      DATE
                    </th>
                    <th className="py-3 px-2 text-[10px] sm:text-xs font-extrabold text-slate-700 tracking-wider w-[15%]">
                      DAY
                    </th>
                    <th className="py-3 px-2 text-[10px] sm:text-xs font-extrabold text-slate-700 tracking-wider w-[20%] text-right">
                      EMI
                    </th>
                    <th className="py-3 px-2 text-[10px] sm:text-xs font-extrabold text-slate-700 tracking-wider w-[25%] text-right pr-4">
                      PENDING
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: planCount }).map((_, idx) => {
                    const rowDateObj = new Date(baseDateObj);
                    if (planToken === 'DAY') {
                      rowDateObj.setDate(rowDateObj.getDate() + idx);
                    } else if (planToken === 'MONTH') {
                      rowDateObj.setMonth(rowDateObj.getMonth() + idx);
                    } else { // WEEK
                      rowDateObj.setDate(rowDateObj.getDate() + (idx * 7));
                    }
                    
                    const dd = String(rowDateObj.getDate()).padStart(2, '0');
                    const mm = String(rowDateObj.getMonth() + 1).padStart(2, '0');
                    const yyyy = rowDateObj.getFullYear();
                    const formattedDate = `${dd}-${mm}-${yyyy}`;
                    const weekday = rowDateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                    
                    const outstanding = Math.max(0, repayAmount - (emiAmount * (idx + 1)));

                    return (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-2 text-xs sm:text-sm font-black text-slate-800">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-2 text-[11px] sm:text-[13px] font-bold text-slate-600">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-2 text-[10px] sm:text-xs font-bold text-slate-400">
                          ({weekday})
                        </td>
                        <td className="py-3 px-2 text-xs sm:text-sm font-black text-[#1b7c58] text-right">
                          ₹{emiAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-2 text-xs sm:text-sm font-black text-[#ef4444] text-right pr-4">
                          ₹{outstanding.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Statement Dashboard Modal */}
      {showStatementModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full h-[85vh] sm:h-[80vh] sm:max-w-xl bg-slate-50 sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-5 flex justify-between items-center shadow-md relative z-10">
              <div>
                <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-300" />
                  STATEMENT DASHBOARD
                </h2>
                <p className="text-blue-100/80 text-xs font-semibold mt-1 tracking-wider uppercase">
                  Select a report to generate
                </p>
              </div>
              <button 
                onClick={() => setShowStatementModal(false)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body: 2 stacked cards */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Card A: Customer Report */}
              <div 
                onClick={() => setShowCustomerReportModal(true)}
                className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-between cursor-pointer hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:border-blue-100 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-100 transition-transform">
                    <Star className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Customer Report</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Complete profile & loan metrics</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label 
                    onClick={(e) => e.stopPropagation()} 
                    className="flex items-center gap-2 cursor-pointer bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors"
                  >
                    <input 
                      type="checkbox" 
                      checked={includeBounces}
                      onChange={(e) => setIncludeBounces(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">With Bounce Report</span>
                  </label>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>

              {/* Card B: Account Statement */}
              <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-between cursor-pointer hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:border-blue-100 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-100 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Account Statement</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Full transaction ledger history</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Customer Report Modal */}
      {showCustomerReportModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full h-[90vh] sm:h-[85vh] sm:max-w-3xl bg-slate-50 sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
            {/* Header Branding */}
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-start relative z-10 shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 flex items-center justify-center rounded overflow-hidden">
                    <img src={companyLogo} alt="Logo" className="h-full object-contain" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">Everest Micro Finance</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#115e41] tracking-tight mt-1">
                  Customer Collection Report
                </h2>
              </div>
              <button 
                onClick={() => setShowCustomerReportModal(false)}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5">
              {/* Metadata Layout Constraint (Vertical Colon Alignment) */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 px-2">
                {(() => {
                  const getExpectedDueDate = (instNumber) => {
                    if (!instNumber) return '';
                    const idxMatch = instNumber.match(/\d+/);
                    const idx = idxMatch ? parseInt(idxMatch[0], 10) - 1 : 0;
                    const rowDateObj = new Date(baseDateObj);
                    if (planToken === 'DAY') {
                      rowDateObj.setDate(rowDateObj.getDate() + idx);
                    } else if (planToken === 'MONTH') {
                      rowDateObj.setMonth(rowDateObj.getMonth() + idx);
                    } else { // WEEK
                      rowDateObj.setDate(rowDateObj.getDate() + (idx * 7));
                    }
                    const dd = String(rowDateObj.getDate()).padStart(2, '0');
                    const mm = String(rowDateObj.getMonth() + 1).padStart(2, '0');
                    const yyyy = rowDateObj.getFullYear();
                    return `${dd}-${mm}-${yyyy}`;
                  };

                  return (
                    <>
                      {/* Left Side */}
                      <div className="flex flex-col gap-2">
                        <div className="flex text-[11px] sm:text-xs">
                          <span className="text-slate-800 font-bold w-24">Customer Name</span>
                          <span className="text-slate-800 font-bold mx-2">:</span>
                          <span className="font-black text-slate-900">{formatName(customer.name)}</span>
                        </div>
                        <div className="flex text-[11px] sm:text-xs">
                          <span className="text-slate-800 font-bold w-24">Customer ID</span>
                          <span className="text-slate-800 font-bold mx-2">:</span>
                          <span className="font-black text-slate-900">{customer.customerId || customer.id || 'N/A'}</span>
                        </div>
                      </div>
                      
                      {/* Right Side */}
                      <div className="flex flex-col gap-2">
                        <div className="flex text-[11px] sm:text-xs">
                          <span className="text-slate-800 font-bold w-24">Opening Date</span>
                          <span className="text-slate-800 font-bold mx-2">:</span>
                          <span className="font-black text-slate-900">{getExpectedDueDate('1')}</span>
                        </div>
                        <div className="flex text-[11px] sm:text-xs">
                          <span className="text-slate-800 font-bold w-24">Closing Date</span>
                          <span className="text-slate-800 font-bold mx-2">:</span>
                          <span className="font-black text-slate-900">{getExpectedDueDate(String(planCount))}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Top Tri-Fold Consolidated Financial Summary Card */}
              <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 divide-x divide-slate-100 overflow-hidden">
                <div className="flex-1 p-3 flex flex-col items-center justify-center bg-blue-50/20">
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-900 uppercase tracking-wider mb-1">Principal</span>
                  <span className="text-sm sm:text-base font-black text-blue-600">₹{loanAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex-1 p-3 flex flex-col items-center justify-center bg-emerald-50/20">
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-900 uppercase tracking-wider mb-1">Collection</span>
                  <span className="text-sm sm:text-base font-black text-emerald-600">₹{runningSubTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex-1 p-3 flex flex-col items-center justify-center bg-rose-50/20">
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-900 uppercase tracking-wider mb-1">Balance</span>
                  <span className="text-sm sm:text-base font-black text-rose-600">₹{netBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Advanced 5-Column Grid with Conditional Row-Span Collapsing */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-2 text-[10px] sm:text-[11px] font-extrabold text-slate-700 uppercase tracking-wider border-r border-slate-200/50">Due Date</th>
                        <th className="py-3 px-2 text-[10px] sm:text-[11px] font-extrabold text-slate-700 uppercase tracking-wider border-r border-slate-200/50">No.</th>
                        <th className="py-3 px-2 text-[10px] sm:text-[11px] font-extrabold text-slate-700 uppercase tracking-wider border-r border-slate-200/50">Coll. Date</th>
                        <th className="py-3 px-2 text-[10px] sm:text-[11px] font-extrabold text-slate-700 uppercase tracking-wider border-r border-slate-200/50">Coll. Amt</th>
                        <th className="py-3 px-2 text-[10px] sm:text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const getExpectedDueDate = (instNumber) => {
                          if (!instNumber) return '';
                          const idxMatch = instNumber.match(/\d+/);
                          const idx = idxMatch ? parseInt(idxMatch[0], 10) - 1 : 0;
                          const rowDateObj = new Date(baseDateObj);
                          if (planToken === 'DAY') {
                            rowDateObj.setDate(rowDateObj.getDate() + idx);
                          } else if (planToken === 'MONTH') {
                            rowDateObj.setMonth(rowDateObj.getMonth() + idx);
                          } else { // WEEK
                            rowDateObj.setDate(rowDateObj.getDate() + (idx * 7));
                          }
                          const dd = String(rowDateObj.getDate()).padStart(2, '0');
                          const mm = String(rowDateObj.getMonth() + 1).padStart(2, '0');
                          const yyyy = rowDateObj.getFullYear();
                          return `${dd}-${mm}-${yyyy}`;
                        };

                        const reportCollections = [];
                        let currentGroup = null;
                        
                        const filteredInstallments = includeBounces 
                          ? installments 
                          : installments.filter(i => i.status !== 'BOUNCED');
                        
                        filteredInstallments.forEach(inst => {
                          if (!currentGroup || currentGroup.number !== inst.number) {
                            if (currentGroup) reportCollections.push(currentGroup);
                            currentGroup = {
                              number: inst.number,
                              dueDate: getExpectedDueDate(inst.number),
                              entries: [inst]
                            };
                          } else {
                            currentGroup.entries.push(inst);
                          }
                        });
                        if (currentGroup) reportCollections.push(currentGroup);

                        if (reportCollections.length === 0) {
                          return (
                            <tr>
                              <td colSpan="5" className="py-8 text-sm text-slate-500 font-medium bg-slate-50/50">
                                No collection entries exist.
                              </td>
                            </tr>
                          );
                        }

                        return reportCollections.map((group, groupIndex) => {
                          return group.entries.map((inst, entryIndex) => {
                            const cumulativePaidUpToThis = installments
                              .slice(0, installments.indexOf(inst) + 1)
                              .filter(i => i.status !== 'BOUNCED')
                              .reduce((sum, i) => sum + (i.amount || 0), 0);
                            const currentBalance = Math.max(0, repayAmount - cumulativePaidUpToThis);

                            return (
                              <tr key={inst.id || `${groupIndex}-${entryIndex}`} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                {entryIndex === 0 && (
                                  <>
                                    <td rowSpan={group.entries.length} className="py-3.5 px-2 text-[11px] sm:text-xs font-bold text-slate-700 border-r border-slate-100 bg-slate-50/30 align-middle">
                                      {group.dueDate}
                                    </td>
                                    <td rowSpan={group.entries.length} className="py-3.5 px-2 text-[11px] sm:text-xs font-black text-slate-800 border-r border-slate-100 bg-slate-50/30 align-middle">
                                      {group.number.replace(/[()]/g, '')}
                                    </td>
                                  </>
                                )}
                                <td className="py-3.5 px-2 text-[11px] sm:text-xs font-semibold text-slate-600 border-r border-slate-100/50">
                                  {inst.date}
                                </td>
                                <td className="py-3.5 px-2 border-r border-slate-100/50 text-center">
                                  {inst.status === 'BOUNCED' ? (
                                    <span className="text-[9px] bg-rose-100/80 text-rose-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wider inline-block">Bounce</span>
                                  ) : (
                                    <span className="text-[11px] sm:text-xs font-bold text-emerald-600 block text-right">₹{(inst.amount || 0).toLocaleString('en-IN')}</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-2 text-[11px] sm:text-xs font-bold text-rose-600">
                                  ₹{currentBalance.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            );
                          });
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Layout Disclaimer */}
              <div className="pt-2 pb-6 text-center">
                <div className="inline-block bg-slate-100/80 px-5 py-2.5 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium italic">
                    "This is an auto-generated statement and requires no signature."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collection Entry Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" onClick={handleCloseEntryModal}></div>
          
          <div className="relative w-full max-w-[340px] bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl border-[1.5px] border-white/60 rounded-[2rem] p-6 shadow-[0_0_40px_rgba(20,83,56,0.6)] animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button onClick={handleCloseEntryModal} className="absolute top-4 right-4 w-8 h-8 bg-slate-200/50 rounded-full flex items-center justify-center text-[#2d4a3e] hover:bg-slate-200 transition-colors shadow-sm">
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
            
            {/* Header */}
            {/* Header */}
            <h2 className="text-[22px] font-black text-[#2d4a3e] text-center uppercase tracking-wide mb-8 mt-2 drop-shadow-sm">
              {isUpiPhotoSelectionMode ? 'UPI Screenshot' : isDenominationMode ? 'Denomination' : 'Collection Entry'}
            </h2>
            
            {!isManualEntryMode && !isDenominationMode && !isUpiPhotoSelectionMode && (
              <>
                {/* Content */}
                <div className="space-y-6">
                  {/* Due Date */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#2d4a3e]/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
                      <CalendarDays className="w-6 h-6 text-[#2d4a3e] stroke-[2]" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[#2d4a3e] text-[14px] font-bold tracking-wider">DUE DATE:</span>
                        <div className="h-4 w-[2px] bg-[#2d4a3e]/30 rounded-full"></div>
                        <div className="flex items-baseline gap-1.5">
                          {isRetrySequence || isLastPending ? (
                            <input 
                              type="text"
                              className="bg-white/50 border border-[#2d4a3e]/40 rounded px-2 py-0.5 text-xl font-black text-[#2d4a3e] w-32 outline-none focus:ring-2 focus:ring-[#1b7c58] transition-all"
                              value={collectionDate}
                              onChange={(e) => setCollectionDate(e.target.value)}
                            />
                          ) : (
                            <span className="text-[#2d4a3e] font-black text-xl leading-none">{(collectionDate || nextFormattedDueDate).replace(/-/g, '.')}</span>
                          )}
                          {!(isRetrySequence || isLastPending) && <span className="text-[#2d4a3e]/80 font-bold text-[11px] tracking-widest">{nextFormattedWeekday}</span>}
                        </div>
                      </div>
                      <span className="text-[#2d4a3e]/80 font-medium mt-1.5 text-base">({nextNumber} Installment)</span>
                    </div>
                  </div>

                  {/* Due Amount */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#2d4a3e]/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
                      <div className="w-7 h-7 bg-[#2d4a3e] rounded-[40%_40%_15%_15%] flex items-center justify-center relative shadow-sm">
                        <div className="absolute -top-1 w-3 h-1 bg-[#2d4a3e] rounded-t-sm"></div>
                        <IndianRupee className="w-3.5 h-3.5 text-white mt-1" strokeWidth={3} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[#2d4a3e] text-[14px] font-bold tracking-wider">{isLastPending ? 'PENDING:' : 'DUE AMOUNT:'}</span>
                        <div className="h-4 w-[2px] bg-[#2d4a3e]/30 rounded-full"></div>
                        <span className={isLastPending ? "text-[#FF0000] font-black text-[22px] leading-none drop-shadow-sm" : "text-[#166534] font-black text-[22px] leading-none drop-shadow-sm"}>
                          ₹{currentDueAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-4 mt-10">
                  <div className="flex flex-col gap-3 flex-1">
                    <button 
                      onClick={() => setIsManualEntryMode(true)}
                      className={`border-[2px] border-slate-300 ring-1 ring-black/20 font-bold tracking-wider py-2.5 rounded-full w-full text-sm transition-transform ${isModalFutureDate ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60' : 'bg-gradient-to-b from-[#3a614d] to-[#1e3c2d] text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(0,0,0,0.4)] active:scale-95'}`} disabled={isModalFutureDate}>
                      ENTRY
                    </button>
                    <button 
                      onClick={handleBounce}
                      className={`border-[2px] border-slate-300 ring-1 ring-black/20 font-bold tracking-wider py-2.5 rounded-full w-full text-sm transition-transform ${isModalFutureDate ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60' : 'bg-gradient-to-b from-[#3a614d] to-[#1e3c2d] text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(0,0,0,0.4)] active:scale-95'}`} 
                      disabled={isModalFutureDate}
                    >
                      BOUNCE
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <button 
                      onClick={handleQuickPay}
                      disabled={isModalFutureDate}
                      className={`border-[2px] border-slate-300 ring-1 ring-black/20 font-bold tracking-wider py-2.5 rounded-full w-full h-full text-base flex items-center justify-center transition-transform ${isModalFutureDate ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60' : 'bg-gradient-to-b from-[#3a614d] to-[#1e3c2d] text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(0,0,0,0.4)] active:scale-95'}`}
                    >
                      QUICK ENTRY
                    </button>
                  </div>
                </div>
              </>
            )}

            {isManualEntryMode && !isDenominationMode && !isUpiPhotoSelectionMode && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                {/* Entry Date */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/60 shadow-sm">
                  <span className="text-[12px] font-black text-slate-600 tracking-wider">ENTRY DATE</span>
                  <input 
                    type="text" 
                    value={collectionDate || nextFormattedDueDate} 
                    onChange={(e) => setCollectionDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-800 w-28 text-right outline-none focus:border-[#1b7c58]"
                  />
                </div>
                
                {/* Cash Input */}
                <div className="flex items-center justify-between bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/60 shadow-sm">
                  <span className="text-[12px] font-black text-slate-600 tracking-wider">CASH</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={manualCash} 
                      onChange={(e) => setManualCash(e.target.value)}
                      placeholder="0"
                      className="bg-white border border-emerald-300 rounded px-2 py-1 text-lg font-black text-emerald-800 w-24 text-right outline-none focus:border-emerald-500"
                    />
                    <button onClick={() => setIsDenominationMode(true)} className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 hover:bg-emerald-200 transition-colors shadow-sm font-bold text-lg leading-none pb-0.5">
                      +
                    </button>
                  </div>
                </div>

                {/* UPI Input */}
                <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-xl border border-blue-200/60 shadow-sm">
                  <span className="text-[12px] font-black text-slate-600 tracking-wider">UPI</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={manualUpi} 
                      onChange={(e) => setManualUpi(e.target.value)}
                      placeholder="0"
                      className="bg-white border border-blue-300 rounded px-2 py-1 text-lg font-black text-blue-800 w-24 text-right outline-none focus:border-blue-500"
                    />
                    <button onClick={() => { setTempUpiPhoto(upiPhoto); setIsUpiPhotoSelectionMode(true); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm ${upiPhoto ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                      <CameraIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2 pt-2">
                  <span className="text-[11px] font-black text-slate-500 tracking-wider">PENDING: <span className={manualPending > 0 ? "text-red-500" : "text-slate-700"}>₹{manualPending.toLocaleString('en-IN')}</span></span>
                  <span className="text-[14px] font-black text-[#1b7c58] tracking-wider">TOTAL: ₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>

                <button 
                  onClick={handleManualQuickPay}
                  disabled={isModalFutureDate}
                  className={`mt-4 border-[2px] border-slate-300 ring-1 ring-black/20 font-bold tracking-wider py-3 rounded-full w-full text-base transition-transform ${isModalFutureDate ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60' : 'bg-gradient-to-b from-[#3a614d] to-[#1e3c2d] text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(0,0,0,0.4)] active:scale-95'}`}
                >
                  ENTER
                </button>
              </div>
            )}

            {isDenominationMode && (
              <div className="space-y-3 animate-in slide-in-from-right-4 duration-200">
                {['500', '200', '100', '50', '20', '10', 'Coins'].map((note) => (
                  <div key={note} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[13px] font-black text-slate-700 w-12">{note} x</span>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={denomCounts[note]} 
                      onChange={(e) => setDenomCounts({...denomCounts, [note]: e.target.value})}
                      placeholder="0"
                      className="bg-white border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-800 w-16 text-center outline-none focus:border-[#1b7c58]"
                    />
                    <span className="text-[14px] font-black text-[#1b7c58] w-20 text-right">
                      ₹{note === 'Coins' ? (Number(denomCounts[note]) || 0).toLocaleString('en-IN') : (Number(denomCounts[note]) * Number(note) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4 px-2">
                  <span className="text-[14px] font-black text-slate-600 tracking-wider">TOTAL</span>
                  <span className="text-[18px] font-black text-[#1b7c58]">₹{getDenomTotal().toLocaleString('en-IN')}</span>
                </div>

                <button 
                  onClick={() => {
                    setManualCash(getDenomTotal().toString());
                    setIsDenominationMode(false);
                  }}
                  className="mt-6 border-[2px] border-slate-300 ring-1 ring-black/20 font-bold tracking-wider py-3 rounded-full w-full text-base bg-gradient-to-b from-[#3a614d] to-[#1e3c2d] text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(0,0,0,0.4)] active:scale-95 transition-transform"
                >
                  OK
                </button>
              </div>
            )}

            {isUpiPhotoSelectionMode && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-200 flex flex-col items-center">
                
                <button 
                  onClick={() => handleCapturePhoto(CameraSource.Camera)}
                  className="w-full bg-white border-2 border-slate-200 py-3 rounded-xl font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <CameraIcon className="w-5 h-5 text-slate-500" />
                  Camera
                </button>
                
                <button 
                  onClick={() => handleCapturePhoto(CameraSource.Photos)}
                  className="w-full bg-white border-2 border-slate-200 py-3 rounded-xl font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <FileText className="w-5 h-5 text-slate-500" />
                  Upload from device
                </button>

                {tempUpiPhoto && (
                  <div className="mt-4 flex flex-col items-center">
                    <span className="text-[12px] font-black text-[#1b7c58] tracking-wider mb-2">IMAGE CAPTURED</span>
                    <img src={tempUpiPhoto} alt="UPI Screenshot" className="w-24 h-24 object-cover rounded-xl border border-slate-300 shadow-sm" />
                  </div>
                )}
                
                <div className="flex gap-4 mt-6 w-full pt-4 border-t border-slate-200">
                  <button 
                    onClick={() => {
                      setTempUpiPhoto(null);
                      setIsUpiPhotoSelectionMode(false);
                    }}
                    className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      setUpiPhoto(tempUpiPhoto);
                      setIsUpiPhotoSelectionMode(false);
                    }}
                    className="flex-1 bg-gradient-to-b from-[#3a614d] to-[#1e3c2d] text-white font-bold py-3 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(0,0,0,0.4)] active:scale-95 transition-transform"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
            
            {/* Future Date Warning */}
            {isModalFutureDate && (
              <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-600 px-3 py-2 rounded-xl text-xs font-bold text-center">
                Action Blocked: The targeted date has not yet arrived.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Verification Modal */}
      {showVerificationModal && (
        <ApprovalDetailsModal
          application={customer}
          onClose={() => setShowVerificationModal(false)}
          isReadOnly={true}
          onDelete={handleDeleteCustomer}
        />
      )}

      {/* Transaction Detail & Edit Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" onClick={() => setSelectedTransaction(null)}></div>
          
          <div className="relative w-full max-w-[340px] bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl border-[1.5px] border-white/60 rounded-[2rem] p-6 shadow-[0_0_40px_rgba(20,83,56,0.6)] animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button onClick={() => setSelectedTransaction(null)} className="absolute top-4 right-4 w-8 h-8 bg-slate-200/50 rounded-full flex items-center justify-center text-[#2d4a3e] hover:bg-slate-200 transition-colors shadow-sm">
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
            
            <h2 className="text-[20px] font-black text-[#2d4a3e] text-center uppercase tracking-wide mb-6 mt-2 drop-shadow-sm">Transaction Details</h2>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Date</label>
                {isEditTransactionMode ? (
                  <input type="text" className="w-full bg-white/50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#1b7c58] outline-none" value={transactionEditData.date} onChange={e => setTransactionEditData({...transactionEditData, date: e.target.value})} />
                ) : (
                  <div className="text-[15px] font-bold text-slate-800">{selectedTransaction.date}</div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Installment Number</label>
                {isEditTransactionMode ? (
                  <input type="text" className="w-full bg-white/50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#1b7c58] outline-none" value={transactionEditData.number} onChange={e => setTransactionEditData({...transactionEditData, number: e.target.value})} />
                ) : (
                  <div className="text-[15px] font-bold text-slate-800">{selectedTransaction.number.replace(/[()]/g, '')}</div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Amount</label>
                {isEditTransactionMode ? (
                  <input type="number" className="w-full bg-white/50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#1b7c58] outline-none" value={transactionEditData.amount} onChange={e => setTransactionEditData({...transactionEditData, amount: e.target.value})} />
                ) : (
                  <div className="text-[20px] font-black text-[#1b7c58]">₹{(selectedTransaction.amount || 0).toLocaleString('en-IN')}</div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              {isEditTransactionMode ? (
                <>
                  <button onClick={() => setIsEditTransactionMode(false)} className="flex-1 py-2.5 rounded-full border-[2px] border-slate-300 text-slate-600 font-bold tracking-wider text-sm hover:bg-slate-100 transition-colors">CANCEL</button>
                  <button onClick={handleSaveTransaction} className="flex-1 py-2.5 rounded-full border-[2px] border-slate-300 bg-gradient-to-b from-[#3a614d] to-[#1e3c2d] text-white font-bold tracking-wider text-sm hover:opacity-90 transition-opacity">SAVE</button>
                </>
              ) : (
                <>
                  <button onClick={handleDeleteTransaction} className="flex-1 py-2.5 rounded-full border-[2px] border-rose-200 bg-rose-50 text-rose-600 font-bold tracking-wider text-sm hover:bg-rose-100 transition-colors shadow-sm">DELETE</button>
                  <button onClick={() => setIsEditTransactionMode(true)} className="flex-1 py-2.5 rounded-full border-[2px] border-slate-300 bg-gradient-to-b from-[#3a614d] to-[#1e3c2d] text-white font-bold tracking-wider text-sm hover:opacity-90 transition-opacity shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(0,0,0,0.4)]">EDIT</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Review Slider Modal */}
      {reviewTransaction && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" onClick={() => setReviewTransaction(null)}></div>
          
          <div className="relative w-full max-w-[340px] bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl border-[1.5px] border-white/60 rounded-[2rem] p-6 shadow-[0_0_40px_rgba(20,83,56,0.6)] animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Close Button */}
            <button onClick={() => setReviewTransaction(null)} className="absolute top-4 right-4 w-8 h-8 z-10 bg-slate-200/50 rounded-full flex items-center justify-center text-[#2d4a3e] hover:bg-slate-200 transition-colors shadow-sm">
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
            
            <div className="relative w-full overflow-hidden" 
                 onTouchStart={(e) => { 
                   if (reviewTransaction.upiPhoto) {
                     touchStartXRef.current = e.changedTouches[0].screenX; 
                   }
                 }}
                 onTouchEnd={(e) => { 
                   if (reviewTransaction.upiPhoto) {
                     if (touchStartXRef.current - e.changedTouches[0].screenX > 50) setReviewSlideIndex(1);
                     if (touchStartXRef.current - e.changedTouches[0].screenX < -50) setReviewSlideIndex(0);
                   }
                 }}
            >
              <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${reviewSlideIndex * 100}%)` }}>
                
                {/* Page 1: Denomination */}
                <div className="w-full flex-shrink-0 px-1">
                  <h2 className="text-[18px] font-black text-[#2d4a3e] text-center uppercase tracking-wide mb-6 mt-2 drop-shadow-sm">Denomination Matrix</h2>
                  {(() => {
                    let cashTotal = 0;
                    if (reviewTransaction.denomCounts) {
                      ['500', '200', '100', '50', '20', '10', 'Coins'].forEach(note => {
                        const count = reviewTransaction.denomCounts[note];
                        if (count && Number(count) > 0) {
                          cashTotal += (note === 'Coins' ? Number(count) : Number(count) * Number(note));
                        }
                      });
                    }
                    const grandTotal = reviewTransaction.amount || 0;
                    const upiAmount = Math.max(0, grandTotal - cashTotal);
                    const reviewPending = Math.max(0, emiAmount - grandTotal);
                    
                    return (
                      <div className="space-y-2">
                        {['500', '200', '100', '50', '20', '10', 'Coins'].map((note) => {
                          const count = reviewTransaction?.denomCounts?.[note];
                          if (!count || Number(count) === 0) return null;
                          const total = note === 'Coins' ? Number(count) : Number(count) * Number(note);
                          return (
                            <div key={note} className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-lg text-sm">
                              <span className="font-bold text-slate-700">{note} x {count}</span>
                              <span className="font-black text-[#1b7c58]">₹{total.toLocaleString('en-IN')}</span>
                            </div>
                          )
                        })}
                        
                        {/* Consolidated Summary Panel (Dual-Split Grid) */}
                        <div className="mt-4 pt-4 border-t-2 border-slate-200/80 grid grid-cols-2 gap-3">
                          
                          {/* Panel A: Left-Aligned EMI Metadata */}
                          <div className="flex items-center justify-start border-r border-slate-200/60 pr-2">
                            <span className="text-[14px] font-black text-slate-700 tracking-wide drop-shadow-sm">EMI: ₹{emiAmount.toLocaleString('en-IN')}</span>
                          </div>
                          
                          {/* Panel B: Right-Aligned Collection Reconciliation */}
                          <div className="flex flex-col gap-1.5 pl-1 w-full">
                            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 w-full">
                              <span>Cash</span>
                              <span>₹{cashTotal.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 w-full">
                              <span>UPI</span>
                              <span>₹{upiAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-black text-[#1b7c58] mt-1 pt-1.5 border-t border-slate-200/60 w-full">
                              <span>Grand Total</span>
                              <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] font-black text-orange-600 mt-0.5 w-full">
                              <span>Pending</span>
                              <span>₹{reviewPending.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Page 2: UPI Screenshot */}
                <div className="w-full flex-shrink-0 px-1">
                  <h2 className="text-[18px] font-black text-[#2d4a3e] text-center uppercase tracking-wide mb-6 mt-2 drop-shadow-sm">UPI Screenshot</h2>
                  {reviewTransaction.upiPhoto ? (
                    <div className="flex justify-center">
                      <img src={reviewTransaction.upiPhoto} alt="UPI Screenshot" className="max-h-[250px] object-contain rounded-xl border border-slate-200 shadow-sm" />
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-400 font-medium text-sm">No UPI image attached</div>
                  )}
                </div>
                
              </div>
            </div>

            {/* Navigation Controls */}
            {reviewTransaction.upiPhoto && (
            <div className="flex justify-center items-center gap-6 mt-6 pt-4 border-t border-slate-200/60">
              <button 
                onClick={() => setReviewSlideIndex(0)}
                className={`p-2 rounded-full transition-colors ${reviewSlideIndex === 0 ? 'bg-slate-100 text-slate-400' : 'bg-slate-200 text-[#2d4a3e] hover:bg-slate-300 shadow-sm'}`}
                disabled={reviewSlideIndex === 0}
              >
                <ChevronLeft className="w-5 h-5 stroke-[3]" />
              </button>
              
              <div className="flex gap-2">
                <div className={`w-2 h-2 rounded-full ${reviewSlideIndex === 0 ? 'bg-[#1b7c58]' : 'bg-slate-300'}`}></div>
                <div className={`w-2 h-2 rounded-full ${reviewSlideIndex === 1 ? 'bg-[#1b7c58]' : 'bg-slate-300'}`}></div>
              </div>

              <button 
                onClick={() => setReviewSlideIndex(1)}
                className={`p-2 rounded-full transition-colors ${reviewSlideIndex === 1 ? 'bg-slate-100 text-slate-400' : 'bg-slate-200 text-[#2d4a3e] hover:bg-slate-300 shadow-sm'}`}
                disabled={reviewSlideIndex === 1}
              >
                <ChevronRight className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;
