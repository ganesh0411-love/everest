import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import logo from '../assets/logo.png';

const PdfPreviewModal = ({ application, onClose }) => {
  const componentRef = useRef(null);
  const containerRef = useRef(null);

  // Gesture states
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Touch gesture states
  const [initialDistance, setInitialDistance] = useState(null);

  const handleDownload = async () => {
    if (!componentRef.current) return;
    
    // Temporarily reset scale and position for pristine capture
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
      pdf.save(`Application_${application?.id || 'Form'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      // Restore transform
      componentRef.current.style.transform = originalTransform;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Gesture Handlers ---
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialDistance(dist);
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan start
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialDistance) {
      // Pinch to zoom
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(Math.max(1, scale * (dist / initialDistance)), 4);
      setScale(newScale);
      setInitialDistance(dist);
      
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 }); // reset position if zoomed out entirely
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan
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
      const newScale = Math.min(Math.max(1, scale - e.deltaY * 0.01), 4);
      setScale(newScale);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
    } else if (scale > 1) {
      setPosition(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };
  // ------------------------

  // Auto-fit A4 calculation
  useEffect(() => {
    if (containerRef.current && componentRef.current) {
      // Base A4 is typically 210x297mm (approx 794x1123 pixels at 96dpi)
      // The CSS will enforce aspect-ratio
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      // We rely on CSS flex and max-width/max-height for the initial 1:1 fit,
      // but gestures will override scale.
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex flex-col font-sans no-print animate-in fade-in">
      
      {/* Top Utility Banner */}
      <div className="flex-shrink-0 bg-slate-800 text-white p-3 flex justify-between items-center z-50 shadow-md">
        <button onClick={onClose} className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-full transition-colors">
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
          <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
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
        {/* Render PDF Layout (A4 scale) */}
        <div 
          ref={componentRef}
          className="bg-white shadow-2xl relative overflow-hidden flex-shrink-0 origin-center transition-transform print-target"
          style={{ 
            width: '210mm', 
            height: '297mm',
            // Base scale to fit mobile screen (approx 0.35 to 0.45 depending on device)
            // But we use CSS max-width/max-height for standard fit, and JS scale for zooming.
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            // In a real responsive scenario, we scale the div down using CSS transform to fit the wrapper,
            // then multiply that by our gesture scale. For now, rely on standard mobile viewport rendering.
            maxWidth: scale === 1 ? '100%' : 'none',
            maxHeight: scale === 1 ? '100%' : 'none',
            aspectRatio: '210/297',
          }}
        >
          {/* Watermark Background */}
          {application?.status === 'Approved' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.04]">
              <span className="text-[12rem] font-black text-blue-900 -rotate-45 tracking-widest">APPROVE</span>
            </div>
          )}

          {/* Geometric Top Decor */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#1b63a9] transform rotate-45 translate-x-32 -translate-y-32 z-0"></div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#1e204d] transform rotate-45 translate-x-20 -translate-y-20 z-0"></div>

          {/* PDF CONTENT BOUNDARY */}
          <div className="relative z-10 w-full h-full p-8 flex flex-col font-sans">
            
            {/* Header Section */}
            <div className="flex justify-center items-center mb-8 relative">
              <div className="absolute left-0 top-0 w-24 h-24">
                {/* Replicate Everest Logo Ring */}
                <div className="w-full h-full rounded-full border-[6px] border-[#1e204d] flex items-center justify-center p-2 relative">
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#18a2b8] rounded-full flex items-center justify-center transform translate-x-2 translate-y-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white transform -rotate-45" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
              </div>

              <div className="text-center ml-12">
                <h1 className="text-4xl font-black text-[#1e204d] tracking-wider uppercase">EVEREST MICROFINANCE</h1>
                <h2 className="text-xl font-bold text-[#1e204d] tracking-widest mt-1">CENTER : {application?.center || 'ANNA NAGAR'}</h2>
              </div>
            </div>

            <div className="flex justify-between items-start mb-6">
              <div className="bg-[#1e204d] text-white px-10 py-2 rounded-full font-bold text-2xl tracking-widest shadow-md">
                APPLICATION FORM
              </div>
              <div className="text-right text-[#1e204d] font-bold text-sm">
                <div className="text-cyan-500 font-bold mb-2">APPLICATION NO : {application?.serialNo ? String(application.serialNo).padStart(2, '0') : '01'}</div>
                <div>Date : {application?.appDate || '26.05.2026'}</div>
                <div>Day : {application?.appDay || 'Wednesday'}</div>
              </div>
            </div>

            {/* Applicant Details */}
            <div className="mb-6 relative">
              <div className="flex items-center gap-2 text-[#1b63a9] mb-4">
                <div className="w-6 h-6 rotate-180">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 12L12 22L9 19L16 12L9 5L12 2Z"/></svg>
                </div>
                <h3 className="text-lg font-bold tracking-widest">APPLICANT DETAILS</h3>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8 space-y-3 text-sm font-bold text-[#1e204d]">
                  <div className="flex"><span className="w-40">CUSTOMER NAME</span>: <span className="ml-2 uppercase">{application?.customerName || 'MR. JOSEPH VIJAY'}</span></div>
                  <div className="flex"><span className="w-40">CUSTOMER ID</span>: <span className="ml-2 uppercase">{application?.id || 'EMF00001'}</span></div>
                  <div className="flex"><span className="w-40">GENDER</span>: <span className="ml-2 uppercase">{application?.gender || 'MALE'}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="w-40">Date Of Birth</span>: 
                    <div className="flex gap-1 ml-2">
                      {Array(8).fill(0).map((_, i) => <div key={`dob-${i}`} className="w-6 h-6 border border-[#1e204d]"></div>)}
                    </div>
                    <span className="ml-4">Age</span>
                    <div className="w-12 h-6 border border-[#1e204d]"></div>
                  </div>
                  <div className="flex items-center"><span className="w-40">Occupation</span>: <div className="ml-2 flex-1 h-6 border border-[#1e204d]"></div></div>
                  <div className="flex items-center"><span className="w-40">Marital status</span>: <div className="ml-2 w-32 h-6 border border-[#1e204d] px-2 flex items-center">{application?.maritalStatus || 'Married'}</div></div>
                  <div className="flex items-center gap-4">
                    <span className="w-40">Account status</span>
                    <label className="flex items-center gap-2">new <div className={`w-5 h-5 border border-[#1e204d] flex items-center justify-center`}>{application?.status === 'Pending' ? '✓' : ''}</div></label>
                    <label className="flex items-center gap-2">existing <div className={`w-5 h-5 border border-[#1e204d] flex items-center justify-center`}>{application?.status !== 'Pending' ? '✓' : ''}</div></label>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center"><span className="w-32">Phone Number</span>: <div className="ml-2 w-48 h-6 border border-[#1e204d]"></div></div>
                    <div className="flex items-center"><span className="w-36 text-right">Alt Phone Number</span>: <div className="ml-2 w-48 h-6 border border-[#1e204d]"></div></div>
                  </div>
                </div>

                <div className="col-span-4 flex justify-end">
                  <div className="w-48 h-56 border-2 border-[#1e204d] bg-slate-100 rounded overflow-hidden">
                    {application?.image && (
                      <img src={application.image} alt="Profile" className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="mb-6 relative">
              <div className="flex items-center gap-2 text-[#1b63a9] mb-4">
                <div className="w-6 h-6 rotate-180">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 12L12 22L9 19L16 12L9 5L12 2Z"/></svg>
                </div>
                <h3 className="text-lg font-bold tracking-widest uppercase">FINACIAL DETAILS</h3>
              </div>

              <div className="space-y-4 text-sm font-bold text-[#1e204d]">
                <div className="flex items-center gap-6">
                  <div className="flex items-center"><span className="w-32">LOAN AMOUNT</span><div className="w-32 h-6 border border-[#1e204d] px-2">{application?.loanAmount}</div></div>
                  <div className="flex items-center"><span className="w-24">LOAN TYPE</span><div className="w-32 h-6 border border-[#1e204d]"></div></div>
                  <div className="flex items-center"><span className="w-20">TENURE</span><div className="w-24 h-6 border border-[#1e204d]"></div></div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-28">AADHAR NO</span>
                  <div className="flex gap-1">
                    {Array(12).fill(0).map((_, i) => <div key={`aadhaar-${i}`} className="w-6 h-8 border border-[#1e204d]"></div>)}
                  </div>
                  <span className="ml-4 font-bold">PAN</span>
                </div>
              </div>
            </div>

            <div className="w-full h-1 bg-[#1e204d] mb-6"></div>

            {/* Nominee and Contacts */}
            <div className="mb-10 relative">
              <div className="flex items-center gap-2 text-[#1b63a9] mb-4">
                <div className="w-6 h-6 rotate-180">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 12L12 22L9 19L16 12L9 5L12 2Z"/></svg>
                </div>
                <h3 className="text-lg font-bold tracking-widest uppercase">NOMINEEE AND CONTACTS</h3>
              </div>

              <div className="space-y-4 text-sm font-bold text-[#1e204d]">
                <div className="flex items-center gap-6">
                  <div className="flex items-center"><span className="w-40">NOMINEE NAME</span><div className="w-64 h-8 border border-[#1e204d]"></div></div>
                  <div className="flex items-center"><span className="w-24">RELATION</span><div className="w-48 h-8 border border-[#1e204d]"></div></div>
                </div>
                <div className="flex items-start">
                  <span className="w-40 mt-2">PERMANANT ADDRESS</span>
                  <div className="flex-1 h-24 border border-[#1e204d]"></div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center"><span className="w-16">CITY</span><div className="w-40 h-8 border border-[#1e204d]"></div></div>
                  <div className="flex items-center"><span className="w-24">DISTRICT</span><div className="w-48 h-8 border border-[#1e204d]"></div></div>
                  <div className="flex items-center gap-2">
                    <span className="w-10">PIN</span>
                    <div className="flex gap-1">
                      {Array(6).fill(0).map((_, i) => <div key={`pin-${i}`} className="w-6 h-8 border border-[#1e204d]"></div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto flex justify-between items-end relative z-20">
              <div className="border-l-4 border-[#1e204d] pl-4 text-[#1e204d] text-xs font-bold leading-relaxed">
                <div>MORE INFORMATION :</div>
                <div>Pachaipatti pirivu , Batlagundu - 624 202</div>
                <div>8220096233 / groupseverest@gmail.com</div>
                <div className="font-medium text-slate-500">www.groupseverest.com</div>
              </div>
              <div className="text-center w-64 text-[#1e204d] text-sm font-bold">
                <div className="w-full border-b border-[#1e204d] mb-2"></div>
                Signature Of CUSTOMER
              </div>
            </div>
            
            {/* Geometric Bottom Decor */}
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1b63a9] transform -rotate-45 -translate-x-32 translate-y-32 z-0"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#1e204d] transform -rotate-45 -translate-x-20 translate-y-20 z-0"></div>

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
            transform: none !important;
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
