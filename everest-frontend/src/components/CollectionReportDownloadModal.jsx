import React, { useState, useMemo, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Capacitor } from '@capacitor/core';
import { Download, Share2, X, Check, FileText, Target, Wallet, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import logo from '../assets/logo.png';
import mountainEmblem from '../assets/everest-mountain-emblem.png';

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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [downloadTimestamp, setDownloadTimestamp] = useState(() => formatCurrentTimestamp());

  const printableRef = useRef(null);

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

  // Construct Live JSON Summary Payload for QR Code Verification
  const qrPayloadJson = useMemo(() => {
    const hash = generateDocHash(`${branchInfo.displayTitle}|${fromDate}|${toDate}|${metrics.total}|${metrics.entriesCount}`);
    return JSON.stringify({
      organization: "Everest Microfinance",
      branch: branchInfo.displayTitle,
      period: `${fromDate} to ${toDate}`,
      targetAmount: Number(metrics.target || 0),
      totalCollection: Number(metrics.total || 0),
      upiCollection: Number(metrics.upi || 0),
      cashCollection: Number(metrics.cash || 0),
      pendingAmount: Number(metrics.pending || 0),
      overdueAmount: Number(metrics.od || 0),
      disbursementAmount: Number(metrics.disbursement || 0),
      totalEntries: Number(metrics.entriesCount || 0),
      generatedAt: downloadTimestamp,
      documentHash: hash,
      verificationStatus: "AUTHENTIC_ORIGINAL_RECORD"
    }, null, 2);
  }, [branchInfo, fromDate, toDate, metrics, downloadTimestamp]);

  // Generate Scannable Verification QR Code
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const generateQr = async () => {
      try {
        const url = await QRCode.toDataURL(qrPayloadJson, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 320,
          color: {
            dark: '#0c3563',
            light: '#ffffff'
          }
        });

        if (isMounted) {
          setQrCodeDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate verification QR code:', err);
      }
    };

    generateQr();

    return () => {
      isMounted = false;
    };
  }, [isOpen, qrPayloadJson]);

  // Compile PDF with html2canvas and jsPDF
  const compilePdf = async () => {
    if (!printableRef.current) return null;

    await new Promise((resolve) => setTimeout(resolve, 150));

    const canvas = await html2canvas(printableRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    const filename = `Everest_Account_Statement_${fromDate}_to_${toDate}.pdf`;
    return { pdf, filename };
  };

  // View / Download PDF
  const handleViewDownload = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const result = await compilePdf();
      if (!result) return;
      const { pdf, filename } = result;

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
        const pdfBlob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);

        window.open(blobUrl, '_blank');
        pdf.save(filename);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate Account Statement PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Share PDF
  const handleShare = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const result = await compilePdf();
      if (!result) return;
      const { pdf, filename } = result;

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
          text: `Account Statement for ${branchInfo.displayTitle} (${fromDate} to ${toDate})`,
          url: fileWriteResult.uri,
          dialogTitle: 'Share Statement PDF'
        });
      } else {
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], filename, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
            text: `Everest Account Statement (${fromDate} to ${toDate})`
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
                  <span>Generating Statement...</span>
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

      {/* 2. PIXEL-PERFECT PRINTABLE STATEMENT DOM (Offscreen for html2canvas compilation) */}
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
        <div
          ref={printableRef}
          style={{
            width: '794px',
            minHeight: '1123px',
            backgroundColor: '#ffffff',
            border: '2.5px solid #0284c7',
            boxSizing: 'border-box',
            padding: '24px 28px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: '#0f172a',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* HEADER SECTION */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', width: '100%' }}>
            
            {/* TOP LEFT: Auto-Generated Live Verification QR Code + Everest Title & Branch Address */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              
              {/* QR Code Container with Central Mountain Emblem */}
              <div 
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Verification QR" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#f1f5f9' }} />
                )}
                {/* Embedded Central Mountain & Growth Arrow Emblem */}
                <div 
                  style={{
                    position: 'absolute',
                    width: '24px',
                    height: '22px',
                    backgroundColor: '#ffffff',
                    borderRadius: '4px',
                    padding: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 2px rgba(0,0,0,0.2)'
                  }}
                >
                  <img src={mountainEmblem} alt="Mountain" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>

              {/* Title & Branch Office Address */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0d2b59', margin: 0, lineHeight: 1.05, letterSpacing: '-0.3px' }}>
                  Everest
                </h1>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0d2b59', margin: 0, lineHeight: 1.05, letterSpacing: '-0.3px' }}>
                  Microfinance
                </h2>
                <div style={{ fontSize: '10.5px', color: '#334155', fontWeight: 600, lineHeight: 1.35, marginTop: '4px' }}>
                  <div>{branchInfo.displayTitle},</div>
                  <div>{branchInfo.addrLine1}</div>
                  {branchInfo.addrLine2 && <div>{branchInfo.addrLine2}</div>}
                  <div>Ph: {branchInfo.phone}</div>
                </div>
              </div>
            </div>

            {/* TOP RIGHT: Account Statement with Seamless 90-Degree Corner Framing & Safe Vertical Timestamp */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              
              {/* Seamless Corner Framed Title Block */}
              <div 
                style={{ 
                  borderTop: '4px solid #0284c7', 
                  borderRight: '4px solid #0284c7', 
                  paddingTop: '6px', 
                  paddingRight: '8px', 
                  paddingLeft: '14px',
                  paddingBottom: '2px'
                }}
              >
                <div style={{ color: '#0c3563', fontSize: '26px', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.5px', textAlign: 'right', textTransform: 'uppercase' }}>
                  ACCOUNT<br />STATEMENT
                </div>
              </div>

              {/* Unclipped Vertical Timestamp Column strictly inside header boundary */}
              <div style={{ width: '16px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div 
                  style={{
                    transform: 'rotate(90deg)',
                    transformOrigin: 'center center',
                    whiteSpace: 'nowrap',
                    fontSize: '8px',
                    fontWeight: 600,
                    color: '#94a3b8',
                    letterSpacing: '0.2px'
                  }}
                >
                  Downloaded: {downloadTimestamp}
                </div>
              </div>
            </div>
          </div>

          {/* 4 KPI SUMMARY METRIC CARDS (Uniform 106px height with zero collision) */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '10px',
              marginTop: '14px'
            }}
          >
            {/* Card 1: Target */}
            <div 
              style={{
                backgroundColor: '#f0f7ff',
                border: '1.5px solid #bae6fd',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                height: '106px',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
                  <Target style={{ width: '14px', height: '14px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>Target</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#0c4a6e' }}>
                  ₹ {metrics.target.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Card 2: Collection (Fixed text collision: comfortable vertical room) */}
            <div 
              style={{
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #a7f3d0',
                borderRadius: '12px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                height: '106px',
                boxSizing: 'border-box'
              }}
            >
              {/* Top: Icon + Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
                  <Wallet style={{ width: '12px', height: '12px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>Collection</span>
              </div>

              {/* Zone 1 (Top/Middle): UPI & Cash displayed with 12.5px bold font and 8.5px uppercase label */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '3px 0 2px 0' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>UPI</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#065f46', lineHeight: 1.1 }}>₹ {metrics.upi.toLocaleString('en-IN')}</div>
                </div>
                <div style={{ width: '1px', height: '20px', backgroundColor: '#a7f3d0', margin: '0 4px' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>Cash</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#065f46', lineHeight: 1.1 }}>₹ {metrics.cash.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Zone 2 (Bottom): Anchored Total ₹ ZZ banner with margin-top: auto */}
              <div 
                style={{
                  marginTop: 'auto',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  textAlign: 'center',
                  padding: '3px 0',
                  lineHeight: 1.2
                }}
              >
                Total ₹ {metrics.total.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Card 3: Pending */}
            <div 
              style={{
                backgroundColor: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                height: '106px',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#ea580c', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
                  <Clock style={{ width: '14px', height: '14px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>Pending</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#d97706' }}>
                  ₹ {metrics.pending.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Card 4: OD / Overdue */}
            <div 
              style={{
                backgroundColor: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                height: '106px',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#dc2626', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
                  <AlertTriangle style={{ width: '14px', height: '14px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>OD / Overdue</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626' }}>
                  ₹ {metrics.od.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* SUB-SUMMARY STRIP (100% Real Live Disbursement, Period & Total Entries) */}
          <div 
            style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '8px 16px',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            {/* Left: Real Disbursement Amount */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 7V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3" />
                  <path d="M12 7c-4 0-7 2.5-7 6.5C5 18 8 21 12 21s7-3 7-7.5c0-4-3-6.5-7-6.5z" />
                  <circle cx="12" cy="14" r="2" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', lineHeight: 1.1 }}>Disbursement Amount</span>
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                  ₹ {metrics.disbursement.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Middle Divider */}
            <div style={{ width: '1px', height: '28px', backgroundColor: '#cbd5e1' }} />

            {/* Middle: Exact Selected Screen Period */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10.5px', fontWeight: 600, color: '#334155' }}>
              <div>Period From &nbsp;: &nbsp;{fromDate}</div>
              <div>Period To &nbsp;&nbsp;&nbsp;: &nbsp;{toDate}</div>
            </div>

            {/* Right Divider */}
            <div style={{ width: '1px', height: '28px', backgroundColor: '#cbd5e1' }} />

            {/* Right: Actual Filtered Total Entries */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
              <span>Total Entries &nbsp;:</span>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>{metrics.entriesCount}</span>
            </div>
          </div>

          {/* DETAILED LEDGER TABLE WITH WATERMARK (Rendering REAL live transactions) */}
          <div 
            style={{
              position: 'relative',
              marginTop: '12px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff'
            }}
          >
            {/* Center Background Watermark */}
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.08,
                pointerEvents: 'none',
                zIndex: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img src={logo} alt="Everest Watermark" style={{ width: '220px', height: '220px', objectFit: 'contain' }} />
            </div>

            {/* TABLE HEADER BAR (Solid Royal Navy #1E5A99 with crisp white text) */}
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

            {/* REAL LIVE TRANSACTION ROWS */}
            <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
              {statementEntries.map((item, idx) => {
                const isEven = idx % 2 === 0;
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
                    key={item.id || idx}
                    style={{ 
                      display: 'flex',
                      width: '100%',
                      backgroundColor: isEven ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      fontSize: '9.5px',
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* S.No */}
                    <div style={{ width: '38px', minWidth: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 600, borderRight: '1px solid #e2e8f0', padding: '6px 2px' }}>
                      {idx + 1}
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

                    {/* Collection Columns (Merged 174px spanned cell if BOUNCED, or 3 separate 58px columns) */}
                    {isBounced ? (
                      <div 
                        style={{ 
                          width: '174px', 
                          minWidth: '174px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          borderRight: '1px solid #e2e8f0', 
                          padding: '4px' 
                        }}
                      >
                        <span 
                          style={{ 
                            backgroundColor: '#fee2e2', 
                            color: '#dc2626', 
                            borderRadius: '6px', 
                            padding: '2.5px 12px', 
                            fontSize: '9.5px', 
                            fontWeight: 800, 
                            border: '1px solid #fecaca',
                            letterSpacing: '0.4px',
                            textTransform: 'uppercase',
                            display: 'inline-block',
                            lineHeight: 1.2
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
              {statementEntries.length === 0 && (
                <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px', backgroundColor: '#ffffff' }}>
                  No transaction records found for the selected period.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
