import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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
        handlePrint().then(() => onClose());
      } else if (autoMode === 'download') {
        handleDownload().then(() => onClose());
      }
    }, 300); // give it a moment to render the DOM
    return () => clearTimeout(timer);
  }, [autoMode]);

  const handleDownload = async () => {
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
      
      const baseName = `Application_${application?.id || 'Form'}`;
      let fileNameInput = window.prompt("Enter filename to save:", baseName);
      if (fileNameInput === null) {
        setIsGenerating(false);
        componentRef.current.style.transform = originalTransform;
        return; // User cancelled
      }
      if (!fileNameInput.trim()) fileNameInput = baseName;
      const filename = `${fileNameInput}.pdf`;
      
      // For mobile device compatibility (Capacitor/PWA)
      if (navigator.share) {
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], filename, { type: 'application/pdf' });
        try {
          await navigator.share({
            files: [file],
            title: 'Application Form',
          });
        } catch (e) {
          pdf.save(filename); // Fallback
        }
      } else {
        pdf.save(filename);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      if (componentRef.current) {
        componentRef.current.style.transform = originalTransform;
      }
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!componentRef.current || isGenerating) return;
    setIsGenerating(true);
    const originalTransform = componentRef.current.style.transform;
    componentRef.current.style.transform = 'scale(1) translate(0px, 0px)';
    
    try {
      const canvas = await html2canvas(componentRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const printOverlay = document.createElement('div');
      printOverlay.id = 'global-print-overlay';
      printOverlay.style.position = 'absolute';
      printOverlay.style.top = '0';
      printOverlay.style.left = '0';
      printOverlay.style.width = '100%';
      printOverlay.style.zIndex = '999999';
      printOverlay.style.backgroundColor = '#ffffff';
      printOverlay.style.display = 'flex';
      printOverlay.style.justifyContent = 'center';
      
      const img = document.createElement('img');
      img.src = imgData;
      img.style.width = '100%';
      img.style.maxWidth = '210mm';
      
      printOverlay.appendChild(img);
      document.body.appendChild(printOverlay);
      
      const style = document.createElement('style');
      style.id = 'global-print-style';
      style.innerHTML = `
        @media print {
          body > *:not(#global-print-overlay):not(#global-print-style) {
            display: none !important;
          }
          @page { size: portrait; margin: 0; }
        }
      `;
      document.head.appendChild(style);
      
      await new Promise((resolve) => {
        setTimeout(() => {
          window.print();
          
          let cleanedUp = false;
          const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            if (document.getElementById('global-print-overlay')) {
              document.body.removeChild(printOverlay);
            }
            if (document.getElementById('global-print-style')) {
              document.head.removeChild(style);
            }
            window.removeEventListener('afterprint', cleanup);
            window.removeEventListener('focus', fallbackCleanup);
            resolve();
          };

          const fallbackCleanup = () => {
            setTimeout(cleanup, 500);
          };

          window.addEventListener('afterprint', cleanup);
          window.addEventListener('focus', fallbackCleanup);
          
          // Fallback just in case events don't fire
          setTimeout(cleanup, 60000); // 60 seconds fallback
          
        }, 150);
      });

    } catch (e) {
      console.error(e);
      alert("Failed to print.");
    } finally {
      if (componentRef.current) {
        componentRef.current.style.transform = originalTransform;
      }
      setIsGenerating(false);
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
    <div className={`fixed inset-0 bg-slate-900/90 z-[9999] flex flex-col font-sans no-print ${autoMode ? 'opacity-0 pointer-events-none' : 'animate-in fade-in'}`}>
      
      {/* Top Utility Banner */}
      <div className="flex-shrink-0 bg-slate-800 text-white p-3 flex justify-between items-center z-50 shadow-md">
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
          <button onClick={handleDownload} disabled={isGenerating} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50">
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
            Download
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
          ref={componentRef}
          className="bg-white shadow-2xl relative overflow-hidden flex-shrink-0 origin-center transition-transform print-target"
          style={{ 
            width: '794px', 
            height: '1123px',
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'center center',
          }}
        >
          

          {/* Geometric Background Shapes */}
          {/* Top Right */}
          <div className="absolute top-0 right-0 w-[200px] h-[200px] z-0" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)', backgroundColor: midBlue }}></div>
          <div className="absolute top-0 right-0 w-[175px] h-[175px] z-0" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)', backgroundColor: darkBlue, transform: 'translate(20px, -20px)' }}></div>
          <div className="absolute top-0 right-0 w-[250px] h-[75px] z-0" style={{ backgroundColor: cyanBlue, transform: 'rotate(45deg) translate(100px, -125px)' }}></div>
          
          {/* Bottom Left */}
          <div className="absolute bottom-0 left-0 w-[175px] h-[175px] z-0" style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)', backgroundColor: darkBlue }}></div>
          <div className="absolute bottom-0 left-0 w-[150px] h-[150px] z-0" style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)', backgroundColor: midBlue, transform: 'translate(-15px, 15px)' }}></div>
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
                              <div key={`dob-${i}`} className="w-[18px] h-[22px] border flex items-center justify-center font-bold text-xs" style={{ borderColor: darkBlue }}>{char.trim()}</div>
                            ))}
                          </div>
                          <span className="ml-4">Age</span>
                          <div className="w-12 h-[22px] border px-1 flex items-center font-bold text-xs" style={{ borderColor: darkBlue }}>{age}</div>
                        </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 whitespace-nowrap uppercase">Occupation</td>
                        <td className="py-1 text-center">:</td>
                        <td className="py-1 whitespace-nowrap">
                          &nbsp;&nbsp;
                          <div className="w-[280px] h-[22px] border px-2 inline-flex items-center font-bold text-xs" style={{ borderColor: darkBlue }}>{occupation}</div>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 whitespace-nowrap uppercase">Marital status</td>
                        <td className="py-1 text-center">:</td>
                        <td className="py-1 whitespace-nowrap">
                          &nbsp;&nbsp;
                          <div className="w-36 h-[22px] border px-2 inline-flex items-center font-bold text-xs" style={{ borderColor: darkBlue }}>{marital}</div>
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
                          <div className="w-[120px] h-[22px] border px-2 flex items-center font-bold text-xs" style={{ borderColor: darkBlue }}>{phone}</div>
                          <span className="mx-2">Alt Phone Number</span>
                          <span className="mx-1">:</span>
                          &nbsp;&nbsp;
                          <div className="w-[120px] h-[22px] border px-2 flex items-center font-bold text-xs" style={{ borderColor: darkBlue }}>{altPhone}</div>
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
                  <div className="flex items-center"><span className="w-28 uppercase">LOAN AMOUNT</span><div className="w-[100px] h-[22px] border px-2 flex items-center font-bold text-xs" style={{ borderColor: darkBlue }}>{loanAmt}</div></div>
                  <div className="flex items-center"><span className="w-24 uppercase ml-4">LOAN TYPE</span><div className="w-[100px] h-[22px] border px-2 flex items-center font-bold text-xs" style={{ borderColor: darkBlue }}>{loanType}</div></div>
                  <div className="flex items-center"><span className="w-20 uppercase ml-4">TENURE</span><div className="w-[80px] h-[22px] border px-2 flex items-center font-bold text-xs" style={{ borderColor: darkBlue }}>{tenure}</div></div>
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
                             <div key={i} className="w-[18px] h-[24px] border flex items-center justify-center font-bold text-xs" style={{ borderColor: darkBlue }}>{char.trim()}</div>
                           ))}
                         </div>
                      ) : (
                         <div className="min-w-[150px] h-[24px] border px-2 flex items-center font-bold text-xs uppercase" style={{ borderColor: darkBlue }}>{kyc.value}</div>
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
                  <div className="flex items-center"><span className="w-[150px] uppercase">NOMINEE NAME</span><div className="w-[200px] h-[22px] border px-2 flex items-center font-bold text-xs" style={{ borderColor: darkBlue }}>{nominee}</div></div>
                  <div className="flex items-center"><span className="w-24 uppercase ml-4">RELATION</span><div className="w-[150px] h-[22px] border px-2 flex items-center font-bold text-xs" style={{ borderColor: darkBlue }}>{relation}</div></div>
                </div>
                
                <div className="flex items-start mt-4">
                  <span className="w-[150px] uppercase pt-1">PERMANANT ADDRESS</span>
                  <div className="flex-1 max-w-[400px] h-[60px] border p-2 font-bold text-xs" style={{ borderColor: darkBlue }}>{address}</div>
                </div>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center"><span className="w-[40px] uppercase">CITY</span><div className="w-[140px] h-[22px] border px-2 flex items-center font-bold text-xs" style={{ borderColor: darkBlue }}>{city}</div></div>
                  <div className="flex items-center ml-2"><span className="w-[70px] uppercase">DISTRICT</span><div className="w-[140px] h-[22px] border px-2 flex items-center font-bold text-xs" style={{ borderColor: darkBlue }}>{district}</div></div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="w-8 uppercase">PIN</span>
                    <div className="flex gap-[2px]">
                      {pin.split('').map((char, i) => (
                        <div key={`pin-${i}`} className="w-[18px] h-[24px] border flex items-center justify-center font-bold text-xs" style={{ borderColor: darkBlue }}>{char.trim()}</div>
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
