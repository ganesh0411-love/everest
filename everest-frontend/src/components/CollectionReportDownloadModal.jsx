import React, { useState, useMemo, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Capacitor } from '@capacitor/core';
import { Download, Share2, X, Check, FileText, Target, Wallet, Clock, AlertTriangle, Coins, Loader2 } from 'lucide-react';
import logo from '../assets/logo.png';

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

const generateChecksum = (data) => {
  const str = `${data.branch}|${data.from}|${data.to}|${data.target}|${data.total}|${data.upi}|${data.cash}|${data.pending}|${data.od}|${data.entries}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase();
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

  // Sync initial include bounced state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIncludeBounced(Boolean(initialIncludeBounced));
      setDownloadTimestamp(formatCurrentTimestamp());
    }
  }, [isOpen, initialIncludeBounced]);

  // Resolve branch information
  const branchInfo = useMemo(() => {
    const bName = typeof activeBranch === 'string' ? activeBranch : (activeBranch?.name || 'Main Branch');
    
    // Address handling
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
      name: bName,
      addrLine1,
      addrLine2,
      phone
    };
  }, [activeBranch]);

  // Recalculate statement entries and metrics based on includeBounced toggle
  const { statementEntries, metrics } = useMemo(() => {
    const entries = (data || []).filter((item) => {
      if (includeBounced) return true;
      return !item.isBounced && item.mode !== 'BOUNCED' && item.status !== 'BOUNCED';
    });

    let coll = 0;
    let upi = 0;
    let cash = 0;
    let disb = 0;
    let pending = 0;
    let od = 0;

    entries.forEach((item) => {
      const isCredit = item.credit > 0;
      const isDebit = item.debit > 0;

      if (isCredit) {
        coll += item.credit;
        const itemUpi = Number(item.upiAmount || 0);
        const itemCash = Number(item.cashAmount || 0);
        if (item.isSplit || (itemUpi > 0 && itemCash > 0)) {
          upi += itemUpi;
          cash += itemCash;
        } else if (itemUpi > 0) {
          upi += itemUpi;
          if (itemCash > 0) cash += itemCash;
        } else if (itemCash > 0) {
          cash += itemCash;
        } else if (item.mode === 'UPI') {
          upi += item.credit;
        } else {
          cash += item.credit;
        }
      }

      if (isDebit) {
        disb += item.debit;
      }

      pending += Number(item.pending || 0);
      od += Number(item.od || 0);
    });

    return {
      statementEntries: entries,
      metrics: {
        target: Number(targetCollection || 0),
        total: coll,
        upi,
        cash,
        pending: totalScopedPending > 0 ? totalScopedPending : pending,
        od: totalScopedOverdue > 0 ? totalScopedOverdue : od,
        disbursement: totalDisbursement > 0 ? totalDisbursement : disb,
        entriesCount: entries.length
      }
    };
  }, [data, includeBounced, targetCollection, totalScopedPending, totalScopedOverdue, totalDisbursement]);

  // Generate QR code data URL whenever metrics or branch info change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const generateQr = async () => {
      try {
        const checksum = generateChecksum({
          branch: branchInfo.name,
          from: fromDate,
          to: toDate,
          target: metrics.target,
          total: metrics.total,
          upi: metrics.upi,
          cash: metrics.cash,
          pending: metrics.pending,
          od: metrics.od,
          entries: statementEntries.length
        });

        const qrPayload = {
          org: 'Everest Microfinance',
          branch: branchInfo.name,
          from: fromDate,
          to: toDate,
          target: metrics.target,
          total: metrics.total,
          upi: metrics.upi,
          cash: metrics.cash,
          pending: metrics.pending,
          od: metrics.od,
          entries: statementEntries.length,
          checksum,
          genAt: new Date().toISOString()
        };

        const url = await QRCode.toDataURL(JSON.stringify(qrPayload), {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 256,
          color: {
            dark: '#0f2f57',
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
  }, [isOpen, branchInfo, fromDate, toDate, metrics, statementEntries]);

  // Compile PDF with html2canvas and jsPDF
  const compilePdf = async () => {
    if (!printableRef.current) return null;

    // Small delay to ensure any fonts / images are fully rendered
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

  // Primary action: View / Download PDF
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

        // Open in new tab for instant view / print
        window.open(blobUrl, '_blank');

        // Trigger direct download
        pdf.save(filename);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate Account Statement PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Secondary action: Share PDF hook
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
          text: `Account Statement for ${branchInfo.name} (${fromDate} to ${toDate})`,
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
          // Fallback if browser doesn't support sharing files
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
      {/* 1. COMPACT DOWNLOAD ACTION DIALOG */}
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
                  {branchInfo.name} • {fromDate} to {toDate}
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

          {/* Toggle: Include Bounced Records */}
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

          {/* Preview Metrics Card */}
          <div className="bg-sky-50/60 rounded-2xl border border-sky-100 p-3 grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Target</span>
              <span className="text-sm font-black text-slate-800">₹ {metrics.target.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Collection</span>
              <span className="text-sm font-black text-sky-700">₹ {metrics.total.toLocaleString('en-IN')}</span>
              <span className="text-[9px] text-slate-500 font-semibold">
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
            
            {/* TOP LEFT: Dynamic QR Code + Company & Branch Details */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              {/* QR Code Container */}
              <div 
                style={{
                  width: '76px',
                  height: '76px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
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
                {/* Embedded Logo Badge in QR Center */}
                <div 
                  style={{
                    position: 'absolute',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <img src={logo} alt="Everest" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                </div>
              </div>

              {/* Title & Branch Office Address */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0d2b59', margin: 0, lineHeight: 1.05, letterSpacing: '-0.3px' }}>
                  Everest
                </h1>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0d2b59', margin: 0, lineHeight: 1.05, letterSpacing: '-0.3px' }}>
                  Microfinance
                </h2>
                <div style={{ fontSize: '10.5px', color: '#334155', fontWeight: 600, lineHeight: 1.35, marginTop: '4px' }}>
                  <div>{branchInfo.name} Branch,</div>
                  <div>{branchInfo.addrLine1}</div>
                  {branchInfo.addrLine2 && <div>{branchInfo.addrLine2}</div>}
                  <div>Ph: {branchInfo.phone}</div>
                </div>
              </div>
            </div>

            {/* TOP RIGHT: Account Statement with Cyan Accent Bar & Rotated Timestamp */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: '14px' }}>
              {/* Cyan Accent Bar (Inverted L Top-Right Bracket) */}
              <div style={{ width: '140px', height: '4px', backgroundColor: '#0284c7', marginBottom: '8px' }} />
              <div style={{ position: 'absolute', right: 0, top: 0, width: '4px', height: '60px', backgroundColor: '#0284c7' }} />

              <div style={{ color: '#0c3563', fontSize: '26px', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.5px', textAlign: 'right', textTransform: 'uppercase' }}>
                ACCOUNT<br />STATEMENT
              </div>

              {/* Rotated Vertical Timestamp along right margin */}
              <div
                style={{
                  position: 'absolute',
                  right: '-16px',
                  top: '12px',
                  writingMode: 'vertical-rl',
                  fontSize: '7.5px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  whiteSpace: 'nowrap'
                }}
              >
                Downloaded: {downloadTimestamp}
              </div>
            </div>
          </div>

          {/* 4 KPI SUMMARY METRIC CARDS */}
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
                borderRadius: '10px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '68px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target style={{ width: '14px', height: '14px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>Target</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 900, color: '#0c4a6e', marginTop: '4px' }}>
                ₹ {metrics.target.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Card 2: Collection */}
            <div 
              style={{
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #a7f3d0',
                borderRadius: '10px',
                padding: '6px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '68px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet style={{ width: '14px', height: '14px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>Collection</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', margin: '3px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: '#047857' }}>UPI</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#065f46' }}>₹ {metrics.upi.toLocaleString('en-IN')}</div>
                </div>
                <div style={{ width: '1px', height: '18px', backgroundColor: '#a7f3d0' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: '#047857' }}>Cash</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#065f46' }}>₹ {metrics.cash.toLocaleString('en-IN')}</div>
                </div>
              </div>
              <div 
                style={{
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  textAlign: 'center',
                  padding: '2px 0'
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
                borderRadius: '10px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '68px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#ea580c', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock style={{ width: '14px', height: '14px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>Pending</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>
                ₹ {metrics.pending.toLocaleString('en-IN')}
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
                minHeight: '68px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#dc2626', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle style={{ width: '14px', height: '14px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>OD / Overdue</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
                ₹ {metrics.od.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* SUB-SUMMARY STRIP */}
          <div 
            style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '7px 14px',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            {/* Left: Disbursement Amount */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Coins style={{ width: '16px', height: '16px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', lineHeight: 1.1 }}>Disbursement Amount</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                  ₹ {metrics.disbursement.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Middle Divider */}
            <div style={{ width: '1px', height: '28px', backgroundColor: '#cbd5e1' }} />

            {/* Middle: Period From & To */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10.5px', fontWeight: 600, color: '#334155' }}>
              <div>Period From &nbsp;: &nbsp;{fromDate}</div>
              <div>Period To &nbsp;&nbsp;&nbsp;: &nbsp;{toDate}</div>
            </div>

            {/* Right Divider */}
            <div style={{ width: '1px', height: '28px', backgroundColor: '#cbd5e1' }} />

            {/* Right: Total Entries */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
              <span>Total Entries &nbsp;:</span>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{metrics.entriesCount}</span>
            </div>
          </div>

          {/* DETAILED LEDGER TABLE WITH WATERMARK */}
          <div 
            style={{
              position: 'relative',
              marginTop: '12px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '4px',
              overflow: 'hidden',
              flex: 1
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

            {/* Ledger Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', position: 'relative', zIndex: 1 }}>
              <thead>
                <tr style={{ backgroundColor: '#16528e', color: '#ffffff' }}>
                  <th rowSpan={2} style={{ border: '1px solid #16528e', padding: '6px 4px', fontSize: '10.5px', fontWeight: 700, width: '36px', textAlign: 'center' }}>
                    S.No
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #16528e', padding: '6px 4px', fontSize: '10.5px', fontWeight: 700, width: '70px', textAlign: 'center' }}>
                    Date
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #16528e', padding: '6px 6px', fontSize: '10.5px', fontWeight: 700, textAlign: 'left' }}>
                    Name
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #16528e', padding: '6px 4px', fontSize: '10.5px', fontWeight: 700, width: '84px', textAlign: 'center' }}>
                    Loan Type
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #16528e', padding: '6px 4px', fontSize: '10px', fontWeight: 700, width: '80px', textAlign: 'center' }}>
                    Disbursement Amount
                  </th>
                  <th colSpan={3} style={{ border: '1px solid #16528e', padding: '4px', fontSize: '10.5px', fontWeight: 700, textAlign: 'center' }}>
                    Collection
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #16528e', padding: '6px 4px', fontSize: '10.5px', fontWeight: 700, width: '56px', textAlign: 'center' }}>
                    Pending
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #16528e', padding: '6px 4px', fontSize: '10.5px', fontWeight: 700, width: '46px', textAlign: 'center' }}>
                    OD
                  </th>
                </tr>
                <tr style={{ backgroundColor: '#2063a1', color: '#ffffff' }}>
                  <th style={{ border: '1px solid #16528e', padding: '4px', fontSize: '9.5px', fontWeight: 700, width: '54px', textAlign: 'center' }}>
                    UPI
                  </th>
                  <th style={{ border: '1px solid #16528e', padding: '4px', fontSize: '9.5px', fontWeight: 700, width: '54px', textAlign: 'center' }}>
                    Cash
                  </th>
                  <th style={{ border: '1px solid #16528e', padding: '4px', fontSize: '9.5px', fontWeight: 700, width: '54px', textAlign: 'center' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {statementEntries.map((item, idx) => {
                  const isEven = idx % 2 === 0;
                  const loanTypeMeta = getLoanTypeStyle(item.loanType);

                  const disbAmt = Number(item.debit || 0);
                  const isCredit = item.credit > 0;
                  const isBounced = item.isBounced || item.status === 'BOUNCED' || item.mode === 'BOUNCED';

                  let upiVal = '-';
                  let cashVal = '-';
                  let totalVal = '-';

                  if (isCredit) {
                    const u = Number(item.upiAmount || 0);
                    const c = Number(item.cashAmount || 0);
                    upiVal = u > 0 ? `₹ ${u.toLocaleString('en-IN')}` : '-';
                    cashVal = c > 0 ? `₹ ${c.toLocaleString('en-IN')}` : '-';
                    totalVal = `₹ ${Number(item.credit).toLocaleString('en-IN')}`;
                  } else if (isBounced) {
                    upiVal = '-';
                    cashVal = '-';
                    totalVal = '-';
                  }

                  const pendingVal = `₹ ${Number(item.pending || 0).toLocaleString('en-IN')}`;
                  const odVal = `₹ ${Number(item.od || 0).toLocaleString('en-IN')}`;

                  return (
                    <tr 
                      key={item.id || idx}
                      style={{ 
                        backgroundColor: isEven ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '9.5px'
                      }}
                    >
                      {/* S.No */}
                      <td style={{ border: '1px solid #e2e8f0', padding: '5px 3px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      {/* Date */}
                      <td style={{ border: '1px solid #e2e8f0', padding: '5px 3px', textAlign: 'center', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {formatDateToDDMMYYYY(item.date)}
                      </td>

                      {/* Name */}
                      <td style={{ border: '1px solid #e2e8f0', padding: '5px 6px', textAlign: 'left', color: '#0f172a', fontWeight: 600 }}>
                        {item.name}
                      </td>

                      {/* Loan Type */}
                      <td style={{ border: '1px solid #e2e8f0', padding: '5px 3px', textAlign: 'center', color: loanTypeMeta.color, fontWeight: 700 }}>
                        {loanTypeMeta.label}
                      </td>

                      {/* Disbursement Amount */}
                      <td style={{ border: '1px solid #e2e8f0', padding: '5px 4px', textAlign: 'center', color: disbAmt > 0 ? '#0f172a' : '#64748b', fontWeight: disbAmt > 0 ? 700 : 500 }}>
                        {disbAmt > 0 ? `₹ ${disbAmt.toLocaleString('en-IN')}` : '-'}
                      </td>

                      {/* Collection UPI */}
                      <td style={{ border: '1px solid #e2e8f0', padding: '5px 3px', textAlign: 'center', color: upiVal !== '-' ? '#0f172a' : '#94a3b8', fontWeight: 500 }}>
                        {upiVal}
                      </td>

                      {/* Collection Cash */}
                      <td style={{ border: '1px solid #e2e8f0', padding: '5px 3px', textAlign: 'center', color: cashVal !== '-' ? '#0f172a' : '#94a3b8', fontWeight: 500 }}>
                        {cashVal}
                      </td>

                      {/* Collection Total */}
                      <td style={{ border: '1px solid #e2e8f0', padding: '5px 3px', textAlign: 'center', color: totalVal !== '-' ? '#0f172a' : '#94a3b8', fontWeight: 700 }}>
                        {totalVal}
                      </td>

                      {/* Pending */}
                      <td style={{ border: '1px solid #e2e8f0', padding: '5px 3px', textAlign: 'center', color: item.pending > 0 ? '#d97706' : '#64748b', fontWeight: item.pending > 0 ? 700 : 500 }}>
                        {pendingVal}
                      </td>

                      {/* OD */}
                      <td style={{ border: '1px solid #e2e8f0', padding: '5px 3px', textAlign: 'center', color: item.od > 0 ? '#dc2626' : '#64748b', fontWeight: item.od > 0 ? 700 : 500 }}>
                        {odVal}
                      </td>
                    </tr>
                  );
                })}

                {/* Empty State */}
                {statementEntries.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                      No transaction records found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
