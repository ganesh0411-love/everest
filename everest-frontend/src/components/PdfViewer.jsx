import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Capacitor } from '@capacitor/core';
import { saveImageToIDB, getImageFromIDB } from '../utils/idbHelper';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Initialize PDF.js worker using unpkg CDN to prevent Vite bundler issues
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfViewer = ({ fileUrl }) => {
  const [localFileUrl, setLocalFileUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadPdf = async () => {
      if (!fileUrl) return;
      if (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:')) {
        if (isMounted) setLocalFileUrl(fileUrl);
        return;
      }
      try {
        const cachedBase64 = await getImageFromIDB(fileUrl);
        if (cachedBase64) {
          if (isMounted) setLocalFileUrl(cachedBase64);
        } else if (navigator.onLine) {
          try {
            const response = await fetch(fileUrl);
            if (response.ok) {
              const blob = await response.blob();
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64 = reader.result;
                if (isMounted) setLocalFileUrl(base64);
                await saveImageToIDB(fileUrl, base64);
              };
              reader.readAsDataURL(blob);
            } else {
              if (isMounted) setLocalFileUrl(fileUrl);
            }
          } catch (e) {
            if (isMounted) setLocalFileUrl(fileUrl);
          }
        } else {
          if (isMounted) setLocalFileUrl(fileUrl);
        }
      } catch (e) {
        if (isMounted) setLocalFileUrl(fileUrl);
      }
    };
    loadPdf();
    return () => { isMounted = false; };
  }, [fileUrl]);

  if (Capacitor.getPlatform() === 'web') {
    return (
      <div className="flex-1 w-full h-full bg-slate-800 rounded-lg overflow-hidden flex flex-col">
        {localFileUrl ? (
          <iframe src={localFileUrl} className="w-full h-full flex-1 border-0" title="PDF Viewer" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-300 font-medium">
            Loading PDF Document...
          </div>
        )}
      </div>
    );
  }

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setError(false);
  };

  const onDocumentLoadError = () => {
    setError(true);
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  if (error) {
    const isLocalUrl = localFileUrl && (localFileUrl.startsWith('blob:') || localFileUrl.startsWith('data:'));
    
    if (!isLocalUrl && localFileUrl) {
      // Fallback to Google Docs viewer for remote PDFs that have CORS issues
      const googleDocsUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(localFileUrl)}`;
      return (
        <div className="flex-1 w-full h-full bg-slate-800 rounded-lg overflow-hidden flex flex-col">
          <div className="p-2 bg-slate-700 text-xs text-center text-slate-300 font-medium">
            Rendering via Secure Cloud Viewer
          </div>
          <iframe 
            src={googleDocsUrl} 
            className="w-full h-full flex-1 border-0" 
            title="PDF Viewer"
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-800 rounded-lg p-6 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-rose-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <h3 className="text-white text-xl font-bold mb-2">Error Loading PDF</h3>
        <p className="text-slate-300 mb-6 text-sm">We couldn't render this PDF directly in the preview.</p>
        <a href={localFileUrl || fileUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg transition-colors inline-block">
          Open PDF Externally
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full w-full bg-slate-900 rounded-lg overflow-hidden">
      <div className="flex-1 w-full overflow-auto flex justify-center py-4 bg-slate-800">
        {localFileUrl && (
          <Document
            file={localFileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-full text-slate-300 font-medium">
                Loading PDF Document...
              </div>
            }
          >
            <Page 
              pageNumber={pageNumber} 
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-xl"
              width={Math.min(window.innerWidth - 40, 800)}
            />
          </Document>
        )}
        {!localFileUrl && (
          <div className="flex items-center justify-center h-full text-slate-300 font-medium">
            Preparing PDF...
          </div>
        )}
      </div>
      
      {numPages && (
        <div className="w-full bg-slate-900 p-4 border-t border-slate-700 flex items-center justify-between">
          <button
            type="button"
            disabled={pageNumber <= 1}
            onClick={previousPage}
            className="p-2 px-4 bg-slate-800 text-white font-bold rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <p className="text-white font-medium text-sm">
            Page {pageNumber} of {numPages}
          </p>
          <button
            type="button"
            disabled={pageNumber >= numPages}
            onClick={nextPage}
            className="p-2 px-4 bg-slate-800 text-white font-bold rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
