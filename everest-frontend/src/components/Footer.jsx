import React from 'react';

const Footer = ({ currentView, setCurrentView }) => {
  return (
    <footer className="relative w-full bg-white border-t border-slate-200 z-40 h-[72px] pb-safe flex justify-center">
      <div className="w-full max-w-md flex justify-around items-center h-full">
        
        {/* Home Tab */}
        <button 
          onClick={() => setCurrentView('Home')}
          className={`flex flex-col items-center justify-center gap-1 w-20 ${currentView === 'Home' ? 'text-brand-blue' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-semibold">Home</span>
        </button>

        {/* Groups Tab */}
        <button 
          onClick={() => setCurrentView('Centers')}
          className={`flex flex-col items-center justify-center gap-1 w-20 ${currentView === 'Centers' ? 'text-brand-blue' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-xs font-medium">Groups</span>
        </button>

        {/* Status Tab */}
        <button 
          onClick={() => setCurrentView('Application Status')}
          className={`flex flex-col items-center justify-center gap-1 w-20 ${currentView === 'Application Status' ? 'text-brand-blue' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs font-medium">Status</span>
        </button>

      </div>
    </footer>
  );
};

export default Footer;
