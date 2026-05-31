import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import logo from '../assets/logo.png';

const PdfPreviewModal = ({ application, onClose, autoMode = null }) => {
  const componentRef = useRef(null);
  const containerRef = useRef(null);

  // Gesture states
  const [baseScale, setBaseScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const calculateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 32; // Account for p-4 padding
        const availableHeight = containerRef.current.clientHeight - 32;
        
        const scaleX = availableWidth / 794;
        const scaleY = availableHeight / 1123;
        
        const fitScale = Math.min(scaleX, scaleY, 1);
        setBaseScale(fitScale);
        setScale(fitScale);
        setPosition({ x: 0, y: 0 });
      }
    };
    
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => {
      window.removeEventListener('resize', calculateScale);
    };
  }, []);

  // Auto trigger for external buttons
  useEffect(() => {
    if (!autoMode) return;
    const timer = setTimeout(() => {
      if (autoMode === 'print') {
        handlePrint(); // DO NOT close automatically to prevent OS print dialog abort
      } else if (autoMode === 'share') {
        handleShare().then(() => onClose());
      }
    }, 300); // give it a moment to render the DOM
    return () => clearTimeout(timer);
  }, [autoMode]);

  const handleShare = async () => {
    if (!componentRef.current || isGenerating) return;
    setIsGenerating(true);
    
    const originalTransform = componentRef.current.style.transform;
    componentRef.current.style.transform = 'scale(1) translate(0px, 0px)';
    
    try {
      const canvas = await html2canvas(componentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const today = new Date();
      const formattedDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
      const baseName = `${application?.customerName || 'Customer'} Application Form ${formattedDate}`;
      const filename = `${baseName}.pdf`;
      
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        // Save PDF to cache directory first so it can be shared via native FileProvider
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        
        const fileWriteResult = await Filesystem.writeFile({
          path: filename,
          data: pdfBase64,
          directory: Directory.Cache
        });
        
        await Share.share({
          title: baseName,
          text: 'Here is the customer application form',
          url: fileWriteResult.uri,
          dialogTitle: 'Share Application PDF'
        });
      } else {
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], filename, { type: 'application/pdf' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: baseName,
            });
          } catch (e) {
            if (e.name !== 'AbortError') {
              pdf.save(filename); // Fallback if share fails (but not if user cancelled)
            }
          }
        } else {
          // Fallback for desktop browsers without Web Share API support
          pdf.save(filename);
        }
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      alert('Failed to share PDF. Please try again.');
    } finally {
      if (componentRef.current) {
        componentRef.current.style.transform = originalTransform;
      }
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!componentRef.current || isGenerating) return;
    
    // We use the same highly reliable DOM-cloning approach for both Web and Mobile Capacitor webviews.
    // This entirely avoids html2canvas bugs (which caused the screen zoom-in issue) and layout distortion.
    let printStyle = document.getElementById('universal-print-style');
    if (!printStyle) {
      printStyle = document.createElement('style');
      printStyle.id = 'universal-print-style';
      printStyle.innerHTML = `
        @media screen {
          #print-clone-container { display: none !important; }
        }
        @media print {
          body > *:not(#print-clone-container) { display: none !important; }
          #print-clone-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 794px !important;
            height: 1123px !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .pdf-no-print { display: none !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `;
      document.head.appendChild(printStyle);
    }
    
    const original = document.getElementById('pdf-content-wrapper');
    if (!original) return;
    
    // Remove any previous lingering clones
    const oldClone = document.getElementById('print-clone-container');
    if (oldClone && oldClone.parentNode) {
      oldClone.parentNode.removeChild(oldClone);
    }

    const cloneContainer = document.createElement('div');
    cloneContainer.id = 'print-clone-container';
    
    const clone = original.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.position = 'relative';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    
    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);
    
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    const printJobName = `${application?.customerName || 'Customer'} Application Form ${formattedDate}`;
    
    const originalTitle = document.title;
    document.title = printJobName;

    // For Native Apps, window.print() is often blocked by the WebView. 
    // We use the @capgo/capacitor-printer plugin's printWebView() to invoke the native print spooler.
    try {
      if (Capacitor.isNativePlatform()) {
        const { Printer } = await import('@capgo/capacitor-printer');
        await Printer.printWebView({ name: printJobName });
      } else {
        // The webview's native window.print() will instantly format the DOM and open the OS print dialog
        window.print();
      }
    } catch (e) {
      console.error("Print failed:", e);
    } finally {
      document.title = originalTitle;
      // Android print spooler acts asynchronously and takes time to render the PDF.
      // Since the clone is hidden from the screen via CSS, we can safely leave it in the DOM 
      // for 30 seconds to ensure the print job completes successfully before cleanup.
      setTimeout(() => {
        if (cloneContainer.parentNode) {
          cloneContainer.parentNode.removeChild(cloneContainer);
        }
      }, 30000);
    }
  };

  // --- Gesture Handlers ---
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialDistance(dist);
    } else if (e.touches.length === 1 && scale > baseScale) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialDistance) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(Math.max(baseScale, scale * (dist / initialDistance)), baseScale * 4);
      setScale(newScale);
      setInitialDistance(dist);
      if (newScale === baseScale) setPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && scale > baseScale) {
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setInitialDistance(null);
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey) {
      const newScale = Math.min(Math.max(baseScale, scale - e.deltaY * 0.005), baseScale * 4);
      setScale(newScale);
      if (newScale === baseScale) setPosition({ x: 0, y: 0 });
    } else if (scale > baseScale) {
      setPosition(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  // Safe fallback UI rendering values
  const appNo = application?.appNumber ? String(application.appNumber).padStart(2, '0') : '01';
  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dateStr;
  };

  const appDate = formatDateToDDMMYYYY(application?.appDate) || '26-05-2026';
  const appDay = application?.appDay || 'Wednesday';
  const customerName = application?.customerName || 'MR. JOSEPH VIJAY';
  const customerId = application?.id || 'EMF00001';
  const gender = application?.gender || 'MALE';
  const rawDob = formatDateToDDMMYYYY(application?.dob) || '';
  const dob = rawDob.replace(/\D/g, '').padEnd(8, ' ');
  const age = application?.age || '';
  const occupation = application?.occupation || '';
  const marital = application?.maritalStatus || 'Married';
  const isNew = application?.customerStatus === 'New';
  const phone = application?.phone || '';
  const altPhone = application?.altPhone || '';
  const loanAmt = application?.loanAmount || '';
  const loanType = application?.loanType || '';
  const tenure = application?.tenureVal ? `${application.tenureVal} ${application.tenureUnit}` : '';
  const aadhaar = (application?.aadhaar || '').padEnd(12, ' ');
  const pan = application?.pan || '';
  const nominee = application?.nomineeName || '';
  const relation = application?.nomineeRelation || '';
  const address = application?.address || '';
  const city = application?.city || '';
  const district = application?.district || '';
  const pin = (application?.pincode || '').padEnd(6, ' ');

  // Colors based on the provided image
  const darkBlue = '#232066';
  const midBlue = '#1462ad';
  const cyanBlue = '#23b3e3';

  return (
    <div className={`fixed inset-0 bg-slate-900/90 z-[9999] flex flex-col font-sans no-print animate-in fade-in`}>
      
      {/* Top Utility Banner */}
      <div className="flex-shrink-0 bg-slate-800 text-white p-3 flex justify-between items-center z-50 shadow-md pdf-no-print">
        <button 
          type="button"
          onClick={onClose} 
          onTouchStart={(e) => { e.stopPropagation(); onClose(); }}
          className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-sm font-semibold opacity-80 tracking-widest uppercase">Preview Mode</div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
            Print
          </button>
          <button onClick={handleShare} disabled={isGenerating} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50">
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
            )}
            Share
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative flex items-center justify-center p-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div 
          id="pdf-content-wrapper"
          ref={componentRef}
          className="bg-white shadow-2xl relative overflow-hidden flex-shrink-0 origin-center transition-transform print-target"
          style={{ 
            width: '794px', 
            height: '1123px',
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'center center',
          }}
        >
          

          {/* Geometric Background Shapes for html2canvas compatibility */}
          {/* Top Right */}
          <div className="absolute top-0 right-0 w-0 h-0 z-0" style={{ borderTop: `200px solid ${midBlue}`, borderLeft: '200px solid transparent' }}></div>
          <div className="absolute top-[-20px] right-[-20px] w-0 h-0 z-0" style={{ borderTop: `175px solid ${darkBlue}`, borderLeft: '175px solid transparent' }}></div>
          <div className="absolute top-0 right-0 w-[250px] h-[75px] z-0" style={{ backgroundColor: cyanBlue, transform: 'rotate(45deg) translate(100px, -125px)' }}></div>
          
          {/* Bottom Left */}
          <div className="absolute bottom-0 left-0 w-0 h-0 z-0" style={{ borderBottom: `175px solid ${darkBlue}`, borderRight: '175px solid transparent' }}></div>
          <div className="absolute bottom-[-15px] left-[-15px] w-0 h-0 z-0" style={{ borderBottom: `150px solid ${midBlue}`, borderRight: '150px solid transparent' }}></div>
          <div className="absolute bottom-0 left-0 w-[200px] h-[50px] z-0" style={{ backgroundColor: cyanBlue, transform: 'rotate(45deg) translate(-125px, 75px)' }}></div>

          {/* PDF CONTENT BOUNDARY */}
          <div className="relative z-10 w-full h-full px-8 pt-4 pb-8 flex flex-col font-sans">
            
            {/* Top Right Text */}
            <div className="text-center w-full mb-2 relative">
              <span className="font-bold text-lg" style={{ color: cyanBlue }}>APPLICATION NO : {appNo}</span>
            </div>

            {/* Header Section */}
            <div className="flex items-center justify-center mb-4 px-4 relative h-24">
              {/* Logo Area */}
              <div className="absolute left-4 w-24 h-24 flex items-center justify-center p-2">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>

              {/* Header Text */}
              <div className="flex flex-col items-center">
                <h1 className="text-3xl font-black tracking-widest uppercase m-0 leading-none" style={{ color: darkBlue, fontFamily: 'Arial Black, Impact, sans-serif' }}>
                  EVEREST MICROFINANCE
                </h1>
                <h2 className="text-lg font-bold tracking-widest mt-1 uppercase" style={{ color: darkBlue }}>
                  APPLICATION FORM
                </h2>
              </div>
            </div>

            {/* Application Form Badge & Date */}
            <div className="flex justify-between items-start mb-4 px-4">
              <div 
                className="text-white px-10 py-1 rounded-full font-bold tracking-widest shadow-md text-xl ml-[100px]" 
                style={{ backgroundColor: darkBlue, fontFamily: 'Arial Black, Impact, sans-serif' }}
              >
                CENTER : {application?.center || 'ANNA NAGAR'}
              </div>
              <table className="text-[#1e204d] font-bold text-[13px] leading-tight mr-8" style={{ color: darkBlue }}>
                <tbody>
                  <tr><td className="text-left pr-2">Date</td><td className="px-1">:</td><td className="text-left">{appDate}</td></tr>
                  <tr><td className="text-left pr-2">Day</td><td className="px-1">:</td><td className="text-left">{appDay}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Applicant Details */}
            <div className="mb-2 relative px-8">
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-b-[8px] border-b-transparent mr-[-2px] z-10" style={{ borderRightColor: cyanBlue }}></div>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: darkBlue }}></div>
                </div>
                <h3 className="text-xl font-bold tracking-wider" style={{ color: darkBlue }}>APPLICANT DETAILS</h3>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-9 text-[13px] font-bold" style={{ color: darkBlue }}>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-[180px] py-1 whitespace-nowrap uppercase">CUSTOMER NAME</td>
                        <td className="w-[20px] py-1 text-center">:</td>
                        <td className="py-1 uppercase whitespace-nowrap">&nbsp;&nbsp;{customerName}</td>
                      </tr>
                      <tr>
                        <td className="py-1 whitespace-nowrap uppercase">CUSTOMER ID</td>
                        <td className="py-1 text-center">:</td>
                        <td className="py-1 uppercase whitespace-nowrap">&nbsp;&nbsp;{customerId}</td>
                      </tr>
                      <tr>
                        <td className="py-1 whitespace-nowrap uppercase">GENDER</td>
                        <td className="py-1 text-center">:</td>
                        <td className="py-1 uppercase whitespace-nowrap">&nbsp;&nbsp;{gender}</td>
                      </tr>
                      <tr>
                        <td className="py-1 whitespace-nowrap uppercase">Date Of Birth</td>
                        <td className="py-1 text-center">:</td>
                        <td className="py-1 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            &nbsp;&nbsp;
                            <div className="flex gap-[2px]">
                            {dob.split('').map((char, i) => (
                              <div key={`dob-${i}`} className="w-[18px] h-[24px] border flex items-center justify-center font-bold text-[13px]" style={{ borderColor: darkBlue }}>{char.trim()}</div>
                            ))}
                          </div>
                          <span className="ml-4">Age</span>
                          <div className="w-12 h-[24px] border px-1 flex items-center justify-center font-bold text-[13px]" style={{ borderColor: darkBlue }}>{age}</div>
                        </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 whitespace-nowrap uppercase">Occupation</td>
                        <td className="py-1 text-center">:</td>
                        <td className="py-1 whitespace-nowrap">
                          &nbsp;&nbsp;
                          <div className="min-w-[280px] w-auto min-h-[24px] border px-2 py-0.5 inline-flex items-center font-bold text-[13px] whitespace-nowrap" style={{ borderColor: darkBlue }}>{occupation}</div>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 whitespace-nowrap uppercase">Marital status</td>
                        <td className="py-1 text-center">:</td>
                        <td className="py-1 whitespace-nowrap">
                          &nbsp;&nbsp;
                          <div className="min-w-[144px] w-auto min-h-[24px] border px-2 py-0.5 inline-flex items-center font-bold text-[13px] whitespace-nowrap" style={{ borderColor: darkBlue }}>{marital}</div>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 whitespace-nowrap uppercase">Account status</td>
                        <td className="py-1 text-center">:</td>
                        <td className="py-1 flex items-center gap-4 whitespace-nowrap">
                          &nbsp;&nbsp;
                          <label className="flex items-center gap-2">new <div className={`w-5 h-5 border flex items-center justify-center font-bold text-lg text-emerald-600`} style={{ borderColor: darkBlue }}>{isNew ? '✓' : ''}</div></label>
                          <label className="flex items-center gap-2">existing <div className={`w-5 h-5 border flex items-center justify-center font-bold text-lg text-emerald-600`} style={{ borderColor: darkBlue }}>{!isNew ? '✓' : ''}</div></label>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 whitespace-nowrap uppercase">Phone Number</td>
                        <td className="py-1 text-center">:</td>
                        <td className="py-1 flex items-center whitespace-nowrap">
                          &nbsp;&nbsp;
                          <div className="min-w-[120px] w-auto min-h-[24px] border px-2 py-0.5 flex items-center font-bold text-[13px] whitespace-nowrap" style={{ borderColor: darkBlue }}>{phone}</div>
                          <span className="mx-2 whitespace-nowrap">Alt Phone Number</span>
                          <span className="mx-1">:</span>
                          &nbsp;&nbsp;
                          <div className="min-w-[120px] w-auto min-h-[24px] border px-2 py-0.5 flex items-center font-bold text-[13px] whitespace-nowrap" style={{ borderColor: darkBlue }}>{altPhone}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="col-span-3 flex justify-end items-start pr-4">
                  {application?.image && (
                    <div className="w-[160px] h-[190px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-md">
                      <img src={application.image} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="mb-4 relative px-8 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-b-[8px] border-b-transparent mr-[-2px] z-10" style={{ borderRightColor: cyanBlue }}></div>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: darkBlue }}></div>
                </div>
                <h3 className="text-xl font-bold tracking-wider uppercase" style={{ color: darkBlue }}>FINACIAL DETAILS</h3>
              </div>

              <div className="space-y-4 text-[13px] font-bold" style={{ color: darkBlue }}>
                <div className="flex items-center gap-6">
                  <div className="flex items-center"><span className="w-28 uppercase whitespace-nowrap">LOAN AMOUNT</span><div className="min-w-[100px] w-auto min-h-[24px] border px-2 py-0.5 flex items-center font-bold text-[13px] whitespace-nowrap" style={{ borderColor: darkBlue }}>{loanAmt}</div></div>
                  <div className="flex items-center"><span className="w-24 uppercase ml-4 whitespace-nowrap">LOAN TYPE</span><div className="min-w-[100px] w-auto min-h-[24px] border px-2 py-0.5 flex items-center font-bold text-[13px] whitespace-nowrap" style={{ borderColor: darkBlue }}>{loanType}</div></div>
                  <div className="flex items-center"><span className="w-20 uppercase ml-4 whitespace-nowrap">TENURE</span><div className="min-w-[80px] w-auto min-h-[24px] border px-2 py-0.5 flex items-center font-bold text-[13px] whitespace-nowrap" style={{ borderColor: darkBlue }}>{tenure}</div></div>
                </div>
                <div className="flex flex-wrap items-center gap-y-4 gap-x-8 mt-2">
                  {[
                    { label: 'AADHAAR NO', value: (application?.aadhaar || ''), isBoxes: true, boxCount: 12 },
                    { label: 'PAN NO', value: application?.pan, isBoxes: false },
                    { label: 'VOTER ID', value: application?.voterId, isBoxes: false },
                    { label: 'SMART CARD', value: application?.smartCard, isBoxes: false }
                  ].filter(doc => doc.value && doc.value.trim().length > 0).map((kyc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="uppercase">{kyc.label}</span>
                      {kyc.isBoxes ? (
                         <div className="flex gap-[2px]">
                           {kyc.value.padEnd(kyc.boxCount, ' ').split('').map((char, i) => (
                             <div key={i} className="w-[18px] h-[24px] border flex items-center justify-center font-bold text-[13px]" style={{ borderColor: darkBlue }}>{char.trim()}</div>
                           ))}
                         </div>
                      ) : (
                         <div className="min-w-[150px] w-auto min-h-[24px] border px-2 py-0.5 flex items-center font-bold text-[13px] uppercase whitespace-nowrap" style={{ borderColor: darkBlue }}>{kyc.value}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Separator Line */}
            <div className="w-full h-[3px] my-6" style={{ backgroundColor: darkBlue }}></div>

            {/* Nominee and Contacts */}
            <div className="mb-8 relative px-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-b-[8px] border-b-transparent mr-[-2px] z-10" style={{ borderRightColor: cyanBlue }}></div>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: darkBlue }}></div>
                </div>
                <h3 className="text-xl font-bold tracking-wider uppercase" style={{ color: darkBlue }}>NOMINEEE AND CONTACTS</h3>
              </div>

              <div className="space-y-4 text-[13px] font-bold" style={{ color: darkBlue }}>
                <div className="flex items-center gap-6 mt-2">
                  <div className="flex items-center"><span className="w-[150px] uppercase whitespace-nowrap">NOMINEE NAME</span><div className="min-w-[200px] w-auto min-h-[24px] border px-2 py-0.5 flex items-center font-bold text-[13px] whitespace-nowrap" style={{ borderColor: darkBlue }}>{nominee}</div></div>
                  <div className="flex items-center"><span className="w-24 uppercase ml-4 whitespace-nowrap">RELATION</span><div className="min-w-[150px] w-auto min-h-[24px] border px-2 py-0.5 flex items-center font-bold text-[13px] whitespace-nowrap" style={{ borderColor: darkBlue }}>{relation}</div></div>
                </div>
                
                <div className="flex items-start mt-4">
                  <span className="w-[150px] uppercase pt-1 whitespace-nowrap">PERMANANT ADDRESS</span>
                  <div className="flex-1 max-w-[400px] min-h-[60px] h-auto border p-2 font-bold text-[13px] leading-tight" style={{ borderColor: darkBlue }}>{address}</div>
                </div>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center"><span className="w-[40px] uppercase whitespace-nowrap">CITY</span><div className="min-w-[140px] w-auto min-h-[24px] border px-2 py-0.5 flex items-center font-bold text-[13px] whitespace-nowrap" style={{ borderColor: darkBlue }}>{city}</div></div>
                  <div className="flex items-center ml-2"><span className="w-[70px] uppercase whitespace-nowrap">DISTRICT</span><div className="min-w-[140px] w-auto min-h-[24px] border px-2 py-0.5 flex items-center font-bold text-[13px] whitespace-nowrap" style={{ borderColor: darkBlue }}>{district}</div></div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="w-8 uppercase">PIN</span>
                    <div className="flex gap-[2px]">
                      {pin.split('').map((char, i) => (
                        <div key={`pin-${i}`} className="w-[18px] h-[24px] border flex items-center justify-center font-bold text-xs leading-none pt-[1px]" style={{ borderColor: darkBlue }}>{char.trim()}</div>
                      ))}
                    </div>
                  </div>
                </div>
                {application?.locationUrl && (
                  <div className="flex items-center gap-2 mt-4 text-[11px] font-bold w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="uppercase w-[110px] flex-shrink-0">LOCATION URL</span>
                    <a href={application.locationUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all flex-1" style={{ wordBreak: 'break-all' }}>
                      {application.locationUrl}
                    </a>
                  </div>
                )}
            </div>

            </div>
            {/* Footer */}
            <div className="mt-auto flex justify-between items-end relative z-20 px-12 pb-8">
              <div className="border-l-[4px] pl-4 text-[10px] font-bold leading-relaxed bg-white/50 p-2 rounded ml-12" style={{ borderColor: darkBlue, color: darkBlue }}>
                <div>MORE INFORMATION :</div>
                <div>Pachaipatti pirivu , Batlagundu - 624 202</div>
                <div>8220096233 / groupseverest@gmail.com</div>
                <div className="font-medium text-slate-500">www.groupseverest.com</div>
              </div>
              <div className="text-center w-64 text-sm font-bold" style={{ color: darkBlue }}>
                <div className="w-full border-b mb-2" style={{ borderColor: darkBlue }}></div>
                Signature Of CUSTOMER
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Print CSS Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print-target, .print-target * { visibility: visible; }
          .print-target { 
            position: absolute; 
            left: 0; 
            top: 0; 
            transform: scale(1) translate(0, 0) !important;
            width: 210mm !important;
            height: 297mm !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
          }
          @page { size: A4 portrait; margin: 0; }
        }
      `}} />
    </div>
  );
};

export default PdfPreviewModal;
