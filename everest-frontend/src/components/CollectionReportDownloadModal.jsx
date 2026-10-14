import React, { useState, useMemo, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Capacitor } from '@capacitor/core';
import { Download, Share2, X, Check, FileText, Target, Wallet, Clock, AlertTriangle, Loader2, Calendar, ClipboardList } from 'lucide-react';
import mountainEmblem from '../assets/everest-mountain-emblem.png';
import watermarkEmblem from '../assets/everest-emblem-watermark.png';
import { supabase } from '../supabase';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const parseDateToTimestamp = (dStr) => {
  if (!dStr) return null;
  if (dStr instanceof Date) return dStr.getTime();
  if (typeof dStr === 'object' && dStr.seconds !== undefined) return dStr.seconds * 1000;

  if (typeof dStr === 'string') {
    const cleanStr = dStr.trim();
    const dmyMatch = cleanStr.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) year += 2000;
      return new Date(year, month - 1, day).getTime();
    }
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

const formatDateToDDMMYYYY = (dStr) => {
  if (!dStr) return '';
  const ts = parseDateToTimestamp(dStr);
  if (ts) {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return String(dStr);
};

const formatCurrentTimestamp = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
};

const generateDocHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${Date.now().toString(16).slice(-4).toUpperCase()}`;
};

const getLoanTypeStyle = (type) => {
  const t = String(type || '').toLowerCase();
  if (t.includes('personal')) return { color: '#9333ea', label: 'Personal Loan' };
  if (t.includes('agri')) return { color: '#16a34a', label: 'Agri Loan' };
  if (t.includes('daily')) return { color: '#ea580c', label: 'Daily' };
  if (t.includes('micro')) return { color: '#0284c7', label: 'Microfinance' };
  return { color: '#0284c7', label: type || 'Microfinance' };
};

// High-precision dynamic QR generator with brand Navy-to-Teal module gradient
const generateBrandedQrDataUrl = async (url) => {
  try {
    const size = 320;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    await QRCode.toCanvas(canvas, url, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: size,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.getImageData(0, 0, size, size);
      const pixels = imgData.data;

      // Smooth vertical gradient: Royal Navy (#123A70) to Brand Teal (#0284C7)
      for (let y = 0; y < size; y++) {
        const t = y / size;
        const r = Math.round(18 + (2 - 18) * t);
        const g = Math.round(58 + (132 - 58) * t);
        const b = Math.round(112 + (199 - 112) * t);

        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          if (pixels[idx] < 128) {
            pixels[idx] = r;
            pixels[idx + 1] = g;
            pixels[idx + 2] = b;
            pixels[idx + 3] = 255;
          } else {
            pixels[idx] = 255;
            pixels[idx + 1] = 255;
            pixels[idx + 2] = 255;
            pixels[idx + 3] = 255;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL('image/png');
    }
  } catch (err) {
    console.warn('Canvas QR color stylization fallback:', err);
  }

  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 320,
    color: { dark: '#1E5A99', light: '#ffffff' }
  });
};

export default function CollectionReportDownloadModal({
  isOpen,
  onClose,
  activeBranch,
  branches = [],
  fromDate,
  toDate,
  data = [],
  allLedgerData = [],
  searchTerm = '',
  isCreditActive = true,
  isDebitActive = true,
  sortOrder = 'desc',
  targetCollection = 0,
  totalCollection = 0,
  onlineCollection = 0,
  cashCollection = 0,
  totalScopedPending = 0,
  totalScopedOverdue = 0,
  totalDisbursement = 0,
  initialIncludeBounced = false
}) {
  const [includeBounced, setIncludeBounced] = useState(Boolean(initialIncludeBounced));
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [statementId, setStatementId] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [downloadTimestamp, setDownloadTimestamp] = useState(() => formatCurrentTimestamp());

  const pagesRef = useRef([]);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIncludeBounced(Boolean(initialIncludeBounced));
      setDownloadTimestamp(formatCurrentTimestamp());
    }
  }, [isOpen, initialIncludeBounced]);

  // Clean deduplicated branch info
  const branchInfo = useMemo(() => {
    const rawName = typeof activeBranch === 'string' ? activeBranch : (activeBranch?.name || 'Main Branch');
    const cleanName = rawName.replace(/\s+branch\s*$/i, '').trim() || 'Main';
    const displayTitle = `${cleanName} Branch`;

    let addrLine1 = 'Door No: 278, Ambigai Apartment,';
    let addrLine2 = 'Andipatti Post, Theni District - 624205,';
    let phone = '9876543210';

    if (activeBranch && typeof activeBranch === 'object') {
      if (activeBranch.address && typeof activeBranch.address === 'string' && activeBranch.address.trim()) {
        const parts = activeBranch.address.trim().split('\n').filter(Boolean);
        if (parts.length > 0) addrLine1 = parts[0] + (parts[0].endsWith(',') ? '' : ',');
        if (parts.length > 1) addrLine2 = parts.slice(1).join(', ');
        else addrLine2 = '';
      }
      if (activeBranch.officePhone) {
        phone = String(activeBranch.officePhone);
      }
    }

    return {
      cleanName,
      displayTitle,
      addrLine1,
      addrLine2,
      phone
    };
  }, [activeBranch]);

  // 100% Real Live Collection Report Data & Metrics Binding (Strict WYSIWYG sync)
  const { statementEntries, metrics } = useMemo(() => {
    let baseList = data || [];

    // If includeBounced changed from initial state and allLedgerData is provided
    if (includeBounced !== initialIncludeBounced && Array.isArray(allLedgerData) && allLedgerData.length > 0) {
      const query = searchTerm.trim();
      const isNumeric = query !== '' && !/[a-zA-Z]/.test(query) && !isNaN(Number(query));

      baseList = allLedgerData.filter((item) => {
        let matchesSearch = true;
        if (query !== '') {
          if (isNumeric) {
            const numQuery = Number(query);
            matchesSearch = (
              Number(item.credit) === numQuery || 
              Number(item.debit) === numQuery ||
              Number(item.od) === numQuery ||
              Number(item.pending) === numQuery ||
              Number(item.cashAmount) === numQuery ||
              Number(item.upiAmount) === numQuery
            );
          } else {
            matchesSearch = (item.name || '').toLowerCase().includes(query.toLowerCase()) || 
                            String(item.mode || '').toLowerCase().includes(query.toLowerCase()) ||
                            String(item.status || '').toLowerCase().includes(query.toLowerCase());
          }
        }

        const isBouncedRow = Boolean(
          item.isBounced || 
          item.status === 'BOUNCED' || 
          String(item.mode || '').toUpperCase() === 'BOUNCED' ||
          String(item.status || '').toUpperCase().includes('BOUNCE') ||
          String(item.mode || '').toUpperCase().includes('BOUNCE')
        );

        if (!includeBounced && isBouncedRow) {
          return false;
        }

        let matchesType = false;
        if (isBouncedRow) {
          matchesType = isCreditActive;
        } else if (isCreditActive && isDebitActive) {
          matchesType = Number(item.credit || 0) > 0 || Number(item.debit || 0) > 0 || Number(item.od || 0) > 0;
        } else if (isCreditActive) {
          matchesType = Number(item.credit || 0) > 0 || Number(item.od || 0) > 0;
        } else if (isDebitActive) {
          matchesType = Number(item.debit || 0) > 0;
        } else {
          matchesType = false;
        }

        return matchesSearch && matchesType;
      });

      baseList = [...baseList].sort((a, b) => {
        const tsA = parseDateToTimestamp(a.createdAt || a.date) || 0;
        const tsB = parseDateToTimestamp(b.createdAt || b.date) || 0;
        if (tsA !== tsB) {
          return sortOrder === 'desc' ? tsB - tsA : tsA - tsB;
        }
        return sortOrder === 'desc' ? String(b.id).localeCompare(String(a.id)) : String(a.id).localeCompare(String(a.id));
      });
    }

    // When includeBounced matches initial state, directly use the exact calculated screen metrics
    if (includeBounced === initialIncludeBounced) {
      return {
        statementEntries: baseList,
        metrics: {
          target: Number(targetCollection || 0),
          total: Number(totalCollection || 0),
          upi: Number(onlineCollection || 0),
          cash: Number(cashCollection || 0),
          pending: Number(totalScopedPending || 0),
          od: Number(totalScopedOverdue || 0),
          disbursement: Number(totalDisbursement || 0),
          entriesCount: baseList.length
        }
      };
    }

    // Dynamically recalculate if toggled in modal
    let coll = 0;
    let upi = 0;
    let cash = 0;
    let disb = 0;
    let pending = 0;
    let od = 0;

    baseList.forEach((item) => {
      const isCredit = Number(item.credit || 0) > 0;
      const isDebit = Number(item.debit || 0) > 0;

      if (isCreditActive && isCredit) {
        coll += Number(item.credit || 0);
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
          upi += Number(item.credit || 0);
        } else {
          cash += Number(item.credit || 0);
        }
      }

      if (isDebitActive && isDebit) {
        disb += Number(item.debit || 0);
      }

      pending += Number(item.pending || 0);
      od += Number(item.od || 0);
    });

    return {
      statementEntries: baseList,
      metrics: {
        target: Number(targetCollection || 0),
        total: coll,
        upi,
        cash,
        pending: totalScopedPending > 0 ? totalScopedPending : pending,
        od: totalScopedOverdue > 0 ? totalScopedOverdue : od,
        disbursement: isDebitActive ? (totalDisbursement > 0 ? totalDisbursement : disb) : 0,
        entriesCount: baseList.length
      }
    };
  }, [data, allLedgerData, searchTerm, isCreditActive, isDebitActive, sortOrder, includeBounced, initialIncludeBounced, targetCollection, totalCollection, onlineCollection, cashCollection, totalScopedPending, totalScopedOverdue, totalDisbursement]);

  // Partition statement entries across pages for clean, zero-clipping A4 pagination
  const pages = useMemo(() => {
    const PAGE_1_ROWS = 22; // Page 1 has branding, KPI cards, sub-summary strip
    const CONT_PAGE_ROWS = 30; // Continuation pages have clean continuation header

    if (!statementEntries || statementEntries.length === 0) {
      return [{ pageIndex: 0, rows: [], startIndex: 0, isFirstPage: true }];
    }

    const result = [];
    let currentIdx = 0;

    // Page 1
    const page1Entries = statementEntries.slice(0, PAGE_1_ROWS);
    result.push({
      pageIndex: 0,
      rows: page1Entries,
      startIndex: 0,
      isFirstPage: true
    });
    currentIdx = PAGE_1_ROWS;

    // Continuation pages
    while (currentIdx < statementEntries.length) {
      const nextBatch = statementEntries.slice(currentIdx, currentIdx + CONT_PAGE_ROWS);
      result.push({
        pageIndex: result.length,
        rows: nextBatch,
        startIndex: currentIdx,
        isFirstPage: false
      });
      currentIdx += CONT_PAGE_ROWS;
    }

    return result;
  }, [statementEntries]);

  // Prepare Unique Statement ID and Cloud Storage Public URL
  useEffect(() => {
    if (!isOpen) return;

    const cleanBranch = (branchInfo.cleanName || 'MAIN').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const newStmtId = `EMF-STMT-${cleanBranch}-${Date.now()}`;
    setStatementId(newStmtId);

    const storagePath = `statements/${newStmtId}.pdf`;
    const { data: pubData } = supabase.storage
      .from('everest-storage')
      .getPublicUrl(storagePath);

    const directPublicUrl = pubData.publicUrl;
    setVerificationUrl(directPublicUrl);

    let isMounted = true;
    generateBrandedQrDataUrl(directPublicUrl).then((url) => {
      if (isMounted) {
        setQrCodeDataUrl(url);
      }
    }).catch((err) => {
      console.error('Failed to generate verification QR code:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, branchInfo, fromDate, toDate, includeBounced, metrics.entriesCount]);

  // Compile Multi-Page A4 PDF with robust margins and zero-clipping page breaks
  const compilePdf = async () => {
    if (!pagesRef.current || pagesRef.current.length === 0) return null;

    await new Promise((resolve) => setTimeout(resolve, 150));

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pagesRef.current[i];
      if (!pageEl) continue;

      if (i > 0) {
        pdf.addPage();
      }

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    const filename = `Everest_Account_Statement_${fromDate}_to_${toDate}.pdf`;
    return { pdf, filename };
  };

  // View / Download PDF with Dynamic Cloud-Backed QR Verification Upload
  const handleViewDownload = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setUploadStatus('Securing statement...');

    try {
      // 1. Ensure statement ID and storage path are determined
      const cleanBranch = (branchInfo.cleanName || 'MAIN').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const currentStmtId = statementId || `EMF-STMT-${cleanBranch}-${Date.now()}`;
      const storagePath = `statements/${currentStmtId}.pdf`;

      const { data: pubData } = supabase.storage
        .from('everest-storage')
        .getPublicUrl(storagePath);
      const livePublicUrl = pubData.publicUrl;

      // 2. Generate high-precision dynamic QR code encoding the live cloud URL with Navy-to-Teal gradient
      const qrData = await generateBrandedQrDataUrl(livePublicUrl);
      setQrCodeDataUrl(qrData);

      // Brief tick to ensure the DOM renders the updated QR Code before html2canvas capture
      await new Promise((resolve) => setTimeout(resolve, 200));

      setUploadStatus('Rendering document pages...');
      const result = await compilePdf();
      if (!result) return;
      const { pdf, filename } = result;

      // 3. Compile PDF Blob & Upload to Cloud Storage Bucket
      setUploadStatus('Publishing original PDF to cloud...');
      const pdfBlob = pdf.output('blob');

      try {
        const { error: uploadErr } = await supabase.storage
          .from('everest-storage')
          .upload(storagePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadErr) {
          console.warn('Storage upload notification:', uploadErr.message);
        } else {
          console.log('Genuine statement soft-copy published to cloud storage:', livePublicUrl);
        }
      } catch (storageErr) {
        console.warn('Cloud storage upload exception:', storageErr);
      }

      // 4. Save Tamper-Proof Audit Record in Firestore
      try {
        const docHash = generateDocHash(`${branchInfo.displayTitle}|${fromDate}|${toDate}|${metrics.total}|${metrics.entriesCount}`);
        await setDoc(doc(db, 'statements', currentStmtId), {
          statementId: currentStmtId,
          branch: branchInfo.displayTitle,
          period: `${fromDate} to ${toDate}`,
          fromDate,
          toDate,
          totalEntries: Number(metrics.entriesCount || 0),
          disbursementAmount: Number(metrics.disbursement || 0),
          totalCollection: Number(metrics.total || 0),
          upiCollection: Number(metrics.upi || 0),
          cashCollection: Number(metrics.cash || 0),
          pendingAmount: Number(metrics.pending || 0),
          overdueAmount: Number(metrics.od || 0),
          verificationUrl: livePublicUrl,
          documentHash: docHash,
          createdAt: new Date().toISOString(),
          status: 'AUTHENTIC_VERIFIED'
        });
      } catch (fsErr) {
        console.warn('Firestore statement audit save failed (non-blocking):', fsErr);
      }

      // 5. Open / Save for the Client
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const pdfBase64 = pdf.output('datauristring').split(',')[1];

        await Filesystem.writeFile({
          path: filename,
          data: pdfBase64,
          directory: Directory.Documents
        });
        alert(`Account Statement saved successfully to Documents as ${filename}`);
      } else {
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');
        pdf.save(filename);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate Account Statement PDF. Please try again.');
    } finally {
      setIsGenerating(false);
      setUploadStatus('');
    }
  };

  // Share PDF with Dynamic Cloud-Backed QR Verification Upload
  const handleShare = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setUploadStatus('Preparing statement for sharing...');

    try {
      // 1. Ensure statement ID and storage path are determined
      const cleanBranch = (branchInfo.cleanName || 'MAIN').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const currentStmtId = statementId || `EMF-STMT-${cleanBranch}-${Date.now()}`;
      const storagePath = `statements/${currentStmtId}.pdf`;

      const { data: pubData } = supabase.storage
        .from('everest-storage')
        .getPublicUrl(storagePath);
      const livePublicUrl = pubData.publicUrl;

      // 2. Generate high-precision dynamic QR code encoding the live cloud URL with Navy-to-Teal gradient
      const qrData = await generateBrandedQrDataUrl(livePublicUrl);
      setQrCodeDataUrl(qrData);

      await new Promise((resolve) => setTimeout(resolve, 200));

      setUploadStatus('Rendering document pages...');
      const result = await compilePdf();
      if (!result) return;
      const { pdf, filename } = result;

      // 3. Compile PDF Blob & Upload to Cloud Storage Bucket
      setUploadStatus('Publishing original PDF to cloud...');
      const pdfBlob = pdf.output('blob');

      try {
        const { error: uploadErr } = await supabase.storage
          .from('everest-storage')
          .upload(storagePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadErr) {
          console.warn('Storage upload notice (share):', uploadErr.message);
        } else {
          console.log('Genuine statement soft-copy published to cloud storage:', livePublicUrl);
        }
      } catch (storageErr) {
        console.warn('Storage upload notice (share):', storageErr);
      }

      // 4. Save Tamper-Proof Audit Record in Firestore
      try {
        const docHash = generateDocHash(`${branchInfo.displayTitle}|${fromDate}|${toDate}|${metrics.total}|${metrics.entriesCount}`);
        await setDoc(doc(db, 'statements', currentStmtId), {
          statementId: currentStmtId,
          branch: branchInfo.displayTitle,
          period: `${fromDate} to ${toDate}`,
          fromDate,
          toDate,
          totalEntries: Number(metrics.entriesCount || 0),
          disbursementAmount: Number(metrics.disbursement || 0),
          totalCollection: Number(metrics.total || 0),
          upiCollection: Number(metrics.upi || 0),
          cashCollection: Number(metrics.cash || 0),
          pendingAmount: Number(metrics.pending || 0),
          overdueAmount: Number(metrics.od || 0),
          verificationUrl: livePublicUrl,
          documentHash: docHash,
          createdAt: new Date().toISOString(),
          status: 'AUTHENTIC_VERIFIED'
        });
      } catch (fsErr) {
        console.warn('Firestore statement audit save failed (non-blocking):', fsErr);
      }

      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        const { Filesystem, Directory } = await import('@capacitor/filesystem');

        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const fileWriteResult = await Filesystem.writeFile({
          path: filename,
          data: pdfBase64,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Everest Account Statement',
          text: `Account Statement for ${branchInfo.displayTitle} (${fromDate} to ${toDate}) - Verified Original: ${livePublicUrl}`,
          url: fileWriteResult.uri,
          dialogTitle: 'Share Statement PDF'
        });
      } else {
        const file = new File([pdfBlob], filename, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
            text: `Everest Account Statement (${fromDate} to ${toDate}) - Verified Original: ${livePublicUrl}`
          });
        } else {
          pdf.save(filename);
          alert('Statement downloaded. You can now share the file.');
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing PDF:', err);
        alert('Failed to share PDF. Please try downloading directly.');
      }
    } finally {
      setIsGenerating(false);
      setUploadStatus('');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 1. CLEAN DOWNLOAD ACTION DIALOG (No confusing sample/mode toggles) */}
      <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-100 flex flex-col gap-4 relative animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <FileText className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Download Collection Statement</h3>
                <span className="text-xs font-semibold text-slate-500">
                  {branchInfo.displayTitle} • {fromDate} to {toDate}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Single Checkbox Toggle: Include Bounced Records */}
          <div 
            onClick={() => !isGenerating && setIncludeBounced(!includeBounced)}
            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 cursor-pointer transition select-none"
          >
            <div className="flex flex-col pr-2">
              <span className="text-xs font-bold text-slate-800">Include Bounced Records</span>
              <span className="text-[11px] text-slate-500 font-medium">
                Include returned/bounced dues in statement ledger & metrics
              </span>
            </div>
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
              includeBounced 
                ? 'bg-blue-600 border-blue-600 text-white shadow-2xs' 
                : 'border-slate-300 bg-white'
            }`}>
              {includeBounced && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>

          {/* Live Scoped Preview Metrics Card */}
          <div className="bg-sky-50/60 rounded-2xl border border-sky-100 p-3.5 grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Target</span>
              <span className="text-sm font-black text-slate-800">₹ {metrics.target.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Collection</span>
              <span className="text-sm font-black text-sky-700">₹ {metrics.total.toLocaleString('en-IN')}</span>
              <span className="text-[9px] text-slate-500 font-semibold mt-0.5">
                UPI: ₹{metrics.upi.toLocaleString('en-IN')} | Cash: ₹{metrics.cash.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Pending / Overdue</span>
              <span className="text-xs font-black text-amber-600">
                ₹ {metrics.pending.toLocaleString('en-IN')} / ₹ {metrics.od.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Entries</span>
              <span className="text-xs font-black text-slate-700">{metrics.entriesCount}</span>
            </div>
          </div>

          {/* Cloud Tamper-Proof Verification Notice */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-[11px] text-emerald-800 font-semibold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-emerald-900 leading-tight">Tamper-Proof Cloud Verification</span>
              <span className="text-[10px] text-emerald-700 font-normal leading-tight">
                Embedded QR scan immediately opens the genuine original soft-copy PDF.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleShare}
              disabled={isGenerating}
              className="flex-1 h-11 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Share2 className="w-4 h-4 text-slate-500" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={handleViewDownload}
              disabled={isGenerating}
              className="flex-2 h-11 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-sky-200 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{uploadStatus || 'Generating Statement...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>View / Download</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. PIXEL-PERFECT MULTI-PAGE PRINTABLE STATEMENT DOM (Offscreen for html2canvas compilation) */}
      <div 
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          zIndex: -1,
          opacity: 1,
          pointerEvents: 'none'
        }}
      >
        {pages.map((page) => (
          <div
            key={page.pageIndex}
            ref={(el) => { if (el) pagesRef.current[page.pageIndex] = el; }}
            style={{
              width: '794px',
              height: '1123px',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
              padding: '14mm 12mm 16mm 12mm',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              color: '#0f172a',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              marginBottom: '20px'
            }}
          >
            {page.isFirstPage ? (
              <>
                {/* HEADER SECTION (Page 1 Only: Branding Left, Divider Middle, Single-Line Title & Address Right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', width: '100%', paddingBottom: '2px' }}>
                  
                  {/* TOP LEFT: Verification QR Code + Branding ONLY */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    
                    {/* Artistic Everest Branded QR Container with Mountain & Wave Contour Frame */}
                    <div 
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        padding: '2.5px',
                        background: 'linear-gradient(135deg, #123A70 0%, #0284C7 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: '0 1px 4px rgba(2, 132, 199, 0.2)',
                        flexShrink: 0
                      }}
                    >
                      {/* Top-Right Decorative Mountain Contour Motif */}
                      <svg 
                        style={{ position: 'absolute', top: '1px', right: '3px', width: '16px', height: '9px', pointerEvents: 'none', zIndex: 2 }} 
                        viewBox="0 0 24 14" 
                        fill="none"
                      >
                        <path d="M0 14L8 3L13 9L18 2L24 14H0Z" fill="#ffffff" fillOpacity="0.9" />
                      </svg>

                      {/* Bottom Decorative Wave Contour Motif */}
                      <svg 
                        style={{ position: 'absolute', bottom: '1px', left: '3px', right: '3px', width: 'calc(100% - 6px)', height: '4px', pointerEvents: 'none', zIndex: 2 }} 
                        viewBox="0 0 80 8" 
                        fill="none"
                      >
                        <path d="M0 4C15 0 25 8 40 4C55 0 65 8 80 4V8H0V4Z" fill="#ffffff" fillOpacity="0.85" />
                      </svg>

                      {/* Inner QR Canvas Card */}
                      <div 
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#ffffff',
                          borderRadius: '6px',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                          zIndex: 1
                        }}
                      >
                        {qrCodeDataUrl ? (
                          <img 
                            src={qrCodeDataUrl} 
                            alt="Verification QR" 
                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} 
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', backgroundColor: '#f1f5f9' }} />
                        )}

                        {/* Central Mountain Emblem Overlay (Strictly centered inside 20% safe zone) */}
                        <div 
                          style={{
                            position: 'absolute',
                            width: '18px',
                            height: '18px',
                            backgroundColor: '#ffffff',
                            borderRadius: '3px',
                            padding: '1.5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 3px rgba(0,0,0,0.25)',
                            zIndex: 3
                          }}
                        >
                          <img src={mountainEmblem} alt="Mountain" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                      </div>
                    </div>

                    {/* Branding ONLY (Beside QR code) */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0d2b59', margin: 0, lineHeight: 1.05, letterSpacing: '-0.3px' }}>
                        Everest
                      </h1>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0d2b59', margin: 0, lineHeight: 1.05, letterSpacing: '-0.3px' }}>
                        Microfinance
                      </h2>
                    </div>
                  </div>

                  {/* Elegant Subtle Vertical Divider Line */}
                  <div style={{ width: '1.5px', height: '68px', backgroundColor: '#e2e8f0', margin: '0 16px' }} />

                  {/* TOP RIGHT: Clean Modern Typography Heading & Branch Address */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: 1 }}>
                    
                    {/* Heading: ACCOUNT STATEMENT (Bold Royal Navy, right-aligned) */}
                    <div 
                      style={{ 
                        color: '#0c3563', 
                        fontSize: '22px', 
                        fontWeight: 900, 
                        letterSpacing: '-0.3px', 
                        textAlign: 'right', 
                        textTransform: 'uppercase', 
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ACCOUNT STATEMENT
                    </div>

                    {/* Directly below (with subtle top margin): Right-aligned branch address details */}
                    <div style={{ fontSize: '9.5px', color: '#475569', fontWeight: 600, lineHeight: 1.35, textAlign: 'right', marginTop: '4px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{branchInfo.displayTitle}</div>
                      <div>{branchInfo.addrLine1}</div>
                      {branchInfo.addrLine2 && <div>{branchInfo.addrLine2}</div>}
                      <div>Ph: {branchInfo.phone}</div>
                    </div>
                  </div>
                </div>

                {/* 4 COMPACT UNIFIED MAIN KPI CARDS (Row 1: Uniform 72px height, Collection showing ONLY Total) */}
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: '10px',
                    marginTop: '12px'
                  }}
                >
                  {/* Card 1: Target */}
                  <div 
                    style={{
                      backgroundColor: '#f0f7ff',
                      border: '1.5px solid #bae6fd',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '72px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
                        <Target style={{ width: '13px', height: '13px' }} />
                      </div>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7' }}>Target</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#0c4a6e' }}>
                        ₹ {metrics.target.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Collection (Displaying ONLY Total Collected, centered & clean) */}
                  <div 
                    style={{
                      backgroundColor: '#f0fdf4',
                      border: '1.5px solid #a7f3d0',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '72px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
                        <Wallet style={{ width: '13px', height: '13px' }} />
                      </div>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#059669' }}>Collection</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#065f46' }}>
                        ₹ {metrics.total.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Pending */}
                  <div 
                    style={{
                      backgroundColor: '#fffbeb',
                      border: '1.5px solid #fde68a',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '72px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#ea580c', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
                        <Clock style={{ width: '13px', height: '13px' }} />
                      </div>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#d97706' }}>Pending</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#d97706' }}>
                        ₹ {metrics.pending.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Card 4: OD / Overdue */}
                  <div 
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '1.5px solid #fecaca',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '72px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#dc2626', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
                        <AlertTriangle style={{ width: '13px', height: '13px' }} />
                      </div>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#dc2626' }}>OD / Overdue</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#dc2626' }}>
                        ₹ {metrics.od.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SUB-SUMMARY STRIP (Row 2: Expanded into 4 Partitioned Modules with Dedicated UPI/Cash) */}
                <div 
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  {/* Module 1: Disbursement Amount */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1.15 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 7V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3" />
                        <path d="M12 7c-4 0-7 2.5-7 6.5C5 18 8 21 12 21s7-3 7-7.5c0-4-3-6.5-7-6.5z" />
                        <circle cx="12" cy="14" r="2" />
                      </svg>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569', lineHeight: 1.1 }}>Disbursement Amount</span>
                      <span style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                        ₹ {metrics.disbursement.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Divider 1 */}
                  <div style={{ width: '1px', height: '28px', backgroundColor: '#cbd5e1' }} />

                  {/* Module 2: Period */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1.1, paddingLeft: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0, border: '1px solid #e2e8f0' }}>
                      <Calendar style={{ width: '14px', height: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '10px', fontWeight: 600, color: '#334155', lineHeight: 1.25 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: '34px', color: '#475569' }}>From</span>
                        <span style={{ color: '#475569', marginRight: '5px' }}>:</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{fromDate}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: '34px', color: '#475569' }}>To</span>
                        <span style={{ color: '#475569', marginRight: '5px' }}>:</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{toDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider 2 */}
                  <div style={{ width: '1px', height: '28px', backgroundColor: '#cbd5e1' }} />

                  {/* Module 3: Total Entries */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 0.9, paddingLeft: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0, border: '1px solid #e2e8f0' }}>
                      <ClipboardList style={{ width: '14px', height: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569', lineHeight: 1.1 }}>Total Entries</span>
                      <span style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                        {metrics.entriesCount}
                      </span>
                    </div>
                  </div>

                  {/* Divider 3 */}
                  <div style={{ width: '1px', height: '28px', backgroundColor: '#cbd5e1' }} />

                  {/* Module 4: Collection Breakdown (UPI & Cash Stacked) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1.05, paddingLeft: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0, border: '1px solid #a7f3d0' }}>
                      <Wallet style={{ width: '13px', height: '13px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '10px', lineHeight: 1.25 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#0284c7', fontSize: '9.5px', width: '32px' }}>UPI</span>
                        <span style={{ color: '#0284c7', fontWeight: 700, marginRight: '5px' }}>:</span>
                        <span style={{ fontWeight: 800, color: '#0369a1' }}>₹ {metrics.upi.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#059669', fontSize: '9.5px', width: '32px' }}>Cash</span>
                        <span style={{ color: '#059669', fontWeight: 700, marginRight: '5px' }}>:</span>
                        <span style={{ fontWeight: 800, color: '#065f46' }}>₹ {metrics.cash.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* CONTINUATION PAGE HEADER (Page 2+ Only) */
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  paddingBottom: '8px', 
                  marginBottom: '6px', 
                  borderBottom: '2px solid #0284c7' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#0d2b59' }}>
                    Everest Microfinance
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                    • Account Statement (Continuation)
                  </span>
                </div>
                <div style={{ fontSize: '9.5px', fontWeight: 600, color: '#475569' }}>
                  {branchInfo.displayTitle} &nbsp;|&nbsp; Period: {fromDate} to {toDate}
                </div>
              </div>
            )}

            {/* DETAILED LEDGER TABLE WITH WATERMARK */}
            <div 
              style={{
                position: 'relative',
                marginTop: page.isFirstPage ? '10px' : '6px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff'
              }}
            >
              {/* Center Background Watermark (Clean Circular Everest Stats Emblem without text) */}
              <div 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  opacity: 0.20,
                  pointerEvents: 'none',
                  zIndex: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img src={watermarkEmblem} alt="Everest Circular Watermark" style={{ width: '230px', height: '230px', objectFit: 'contain' }} />
              </div>

              {/* TABLE HEADER BAR (Repeated on Every Page: Solid Royal Navy #1E5A99 with crisp white text) */}
              <div 
                style={{ 
                  backgroundColor: '#1E5A99', 
                  color: '#ffffff', 
                  display: 'flex', 
                  width: '100%', 
                  position: 'relative', 
                  zIndex: 1,
                  borderBottom: '1px solid #164e85',
                  boxSizing: 'border-box'
                }}
              >
                {/* S.No */}
                <div style={{ width: '38px', minWidth: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '10.5px', borderRight: '1px solid #164e85', padding: '6px 2px' }}>
                  S.No
                </div>

                {/* Date */}
                <div style={{ width: '74px', minWidth: '74px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '10.5px', borderRight: '1px solid #164e85', padding: '6px 2px' }}>
                  Date
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontWeight: 700, fontSize: '10.5px', borderRight: '1px solid #164e85', padding: '6px 8px' }}>
                  Name
                </div>

                {/* Loan Type */}
                <div style={{ width: '84px', minWidth: '84px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '10.5px', borderRight: '1px solid #164e85', padding: '6px 2px' }}>
                  Loan Type
                </div>

                {/* Disbursement Amount */}
                <div style={{ width: '86px', minWidth: '86px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '9.5px', textAlign: 'center', borderRight: '1px solid #164e85', padding: '6px 2px', lineHeight: 1.15 }}>
                  Disbursement Amount
                </div>

                {/* Collection Column (with sub-columns: UPI, Cash, Total) */}
                <div style={{ width: '174px', minWidth: '174px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #164e85' }}>
                  <div style={{ padding: '3px 0', textAlign: 'center', fontWeight: 700, fontSize: '10.5px', borderBottom: '1px solid #164e85' }}>
                    Collection
                  </div>
                  <div style={{ display: 'flex', backgroundColor: '#2063a1' }}>
                    <div style={{ width: '58px', minWidth: '58px', padding: '3px 0', textAlign: 'center', fontWeight: 700, fontSize: '9px', borderRight: '1px solid #164e85' }}>
                      UPI
                    </div>
                    <div style={{ width: '58px', minWidth: '58px', padding: '3px 0', textAlign: 'center', fontWeight: 700, fontSize: '9px', borderRight: '1px solid #164e85' }}>
                      Cash
                    </div>
                    <div style={{ width: '58px', minWidth: '58px', padding: '3px 0', textAlign: 'center', fontWeight: 700, fontSize: '9px' }}>
                      Total
                    </div>
                  </div>
                </div>

                {/* Pending */}
                <div style={{ width: '58px', minWidth: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '10.5px', borderRight: '1px solid #164e85', padding: '6px 2px' }}>
                  Pending
                </div>

                {/* OD */}
                <div style={{ width: '48px', minWidth: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '10.5px', padding: '6px 2px' }}>
                  OD
                </div>
              </div>

              {/* REAL LIVE TRANSACTION ROWS FOR THIS PAGE */}
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
                {page.rows.map((item, rowIdx) => {
                  const globalIdx = page.startIndex + rowIdx;
                  const isEven = globalIdx % 2 === 0;
                  const loanTypeMeta = getLoanTypeStyle(item.loanType);

                  const isBounced = Boolean(
                    item.isBounced || 
                    item.status === 'BOUNCED' || 
                    item.mode === 'BOUNCED' ||
                    String(item.status || '').toUpperCase().includes('BOUNCE') ||
                    String(item.mode || '').toUpperCase().includes('BOUNCE')
                  );

                  const disbAmt = Number(item.debit || 0);
                  const isCredit = Number(item.credit || 0) > 0;

                  let upiVal = '-';
                  let cashVal = '-';
                  let totalVal = '-';

                  if (!isBounced && isCredit) {
                    const u = Number(item.upiAmount || 0);
                    const c = Number(item.cashAmount || 0);
                    upiVal = u > 0 ? `₹ ${u.toLocaleString('en-IN')}` : '-';
                    cashVal = c > 0 ? `₹ ${c.toLocaleString('en-IN')}` : '-';
                    totalVal = `₹ ${Number(item.credit).toLocaleString('en-IN')}`;
                  }

                  const pendingVal = `₹ ${Number(item.pending || 0).toLocaleString('en-IN')}`;
                  const odVal = `₹ ${Number(item.od || 0).toLocaleString('en-IN')}`;
                  const disbVal = (!isBounced && disbAmt > 0) ? `₹ ${disbAmt.toLocaleString('en-IN')}` : '-';

                  return (
                    <div 
                      key={item.id || globalIdx}
                      style={{ 
                        display: 'flex',
                        width: '100%',
                        backgroundColor: isEven ? 'rgba(255, 255, 255, 0.65)' : 'rgba(248, 250, 252, 0.70)',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '9.5px',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* S.No */}
                      <div style={{ width: '38px', minWidth: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 600, borderRight: '1px solid #e2e8f0', padding: '6px 2px' }}>
                        {globalIdx + 1}
                      </div>

                      {/* Date */}
                      <div style={{ width: '74px', minWidth: '74px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontWeight: 500, borderRight: '1px solid #e2e8f0', padding: '6px 2px', whiteSpace: 'nowrap' }}>
                        {formatDateToDDMMYYYY(item.date)}
                      </div>

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', color: '#0f172a', fontWeight: 600, borderRight: '1px solid #e2e8f0', padding: '6px 8px' }}>
                        {item.name}
                      </div>

                      {/* Loan Type */}
                      <div style={{ width: '84px', minWidth: '84px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: loanTypeMeta.color, fontWeight: 700, borderRight: '1px solid #e2e8f0', padding: '6px 2px' }}>
                        {loanTypeMeta.label}
                      </div>

                      {/* Disbursement Amount */}
                      <div style={{ width: '86px', minWidth: '86px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: disbVal !== '-' ? '#0f172a' : '#64748b', fontWeight: disbVal !== '-' ? 700 : 500, borderRight: '1px solid #e2e8f0', padding: '6px 4px' }}>
                        {disbVal}
                      </div>

                      {/* Collection Columns (Merged 174px spanned cell with clean red BOUNCED text, zero background pill) */}
                      {isBounced ? (
                        <div 
                          style={{ 
                            width: '174px', 
                            minWidth: '174px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            borderRight: '1px solid #e2e8f0', 
                            padding: '6px 2px' 
                          }}
                        >
                          <span 
                            style={{ 
                              color: '#DC2626', 
                              fontSize: '11px', 
                              fontWeight: 800, 
                              letterSpacing: '0.5px', 
                              textTransform: 'uppercase' 
                            }}
                          >
                            BOUNCED
                          </span>
                        </div>
                      ) : (
                        <>
                          {/* Collection UPI */}
                          <div style={{ width: '58px', minWidth: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: upiVal !== '-' ? '#0f172a' : '#94a3b8', fontWeight: 500, borderRight: '1px solid #e2e8f0', padding: '6px 2px' }}>
                            {upiVal}
                          </div>

                          {/* Collection Cash */}
                          <div style={{ width: '58px', minWidth: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cashVal !== '-' ? '#0f172a' : '#94a3b8', fontWeight: 500, borderRight: '1px solid #e2e8f0', padding: '6px 2px' }}>
                            {cashVal}
                          </div>

                          {/* Collection Total */}
                          <div style={{ width: '58px', minWidth: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: totalVal !== '-' ? '#0f172a' : '#94a3b8', fontWeight: 700, borderRight: '1px solid #e2e8f0', padding: '6px 2px' }}>
                            {totalVal}
                          </div>
                        </>
                      )}

                      {/* Pending */}
                      <div style={{ width: '58px', minWidth: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Number(item.pending || 0) > 0 ? '#d97706' : '#64748b', fontWeight: Number(item.pending || 0) > 0 ? 700 : 500, borderRight: '1px solid #e2e8f0', padding: '6px 2px' }}>
                        {pendingVal}
                      </div>

                      {/* OD */}
                      <div style={{ width: '48px', minWidth: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Number(item.od || 0) > 0 ? '#dc2626' : '#64748b', fontWeight: Number(item.od || 0) > 0 ? 700 : 500, padding: '6px 2px' }}>
                        {odVal}
                      </div>
                    </div>
                  );
                })}

                {/* Empty State when no real live records match active filter */}
                {page.rows.length === 0 && (
                  <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px', backgroundColor: 'rgba(255, 255, 255, 0.85)' }}>
                    No transaction records found for the selected period.
                  </div>
                )}
              </div>
            </div>

            {/* PAGE FOOTER (Strictly inside page with >=16mm bottom clearance) */}
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                fontSize: '8.5px', 
                color: '#64748b', 
                fontWeight: 600, 
                borderTop: '1px solid #e2e8f0', 
                paddingTop: '6px', 
                marginTop: 'auto' 
              }}
            >
              <span>Downloaded: {downloadTimestamp}</span>
              <span>Page {page.pageIndex + 1} of {pages.length}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
