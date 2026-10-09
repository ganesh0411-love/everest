import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Wallet } from 'lucide-react';

// Mock Ledger Data strictly matching reference specs
const MOCK_LEDGER_DATA = [
  { id: 1, name: 'Lakshmi Devi', mode: 'UPI', credit: 5000, debit: 1000 },
  { id: 2, name: 'Meena Kumari', mode: 'Cash', credit: 3500, debit: 500 },
  { id: 3, name: 'Selvam', mode: 'UPI', credit: 7200, debit: 1200 },
  { id: 4, name: 'Ravi Kumar', mode: 'Cash', credit: 4800, debit: 800 },
  { id: 5, name: 'Kavitha', mode: 'UPI', credit: 6300, debit: 700 },
  { id: 6, name: 'Murugan', mode: 'Cash', credit: 5600, debit: 1100 },
  { id: 7, name: 'Priya', mode: 'UPI', credit: 3200, debit: 600 },
  { id: 8, name: 'Suresh', mode: 'UPI', credit: 8400, debit: 1500 },
  { id: 9, name: 'Anitha', mode: 'Cash', credit: 4900, debit: 900 },
  { id: 10, name: 'Babu', mode: 'UPI', credit: 6700, debit: 1300 },
];

export default function CollectionReportModal({ isOpen = true, onClose }) {
  const [fromDate, setFromDate] = useState('01-09-2025');
  const [toDate, setToDate] = useState('30-09-2025');
  const [typeFilter, setTypeFilter] = useState('All'); // 'All', 'Credit', 'Debit'
  const [periodPreset, setPeriodPreset] = useState('All'); // 'All', 'Today', 'Yesterday', 'Last Week', 'Last Month'
  const [searchTerm, setSearchTerm] = useState('');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Active quick pill selection
  const [activePill, setActivePill] = useState('All'); // 'All', 'Credit', 'Debit'

  // Scroll ref to reset scroll to top on modal open
  const tableScrollRef = useRef(null);

  useEffect(() => {
    if (isOpen && tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0;
    }
  }, [isOpen]);

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
    } else {
      setFromDate('01-09-2025');
      setToDate('30-09-2025');
    }
  };

  // Filtered ledger data
  const filteredData = useMemo(() => {
    return MOCK_LEDGER_DATA.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const effectiveType = activePill !== 'All' ? activePill : typeFilter;
      let matchesType = true;
      if (effectiveType === 'Credit') {
        matchesType = item.credit > 0;
      } else if (effectiveType === 'Debit') {
        matchesType = item.debit > 0;
      }
      return matchesSearch && matchesType;
    });
  }, [searchTerm, typeFilter, activePill]);

  const totalCollection = useMemo(() => 45750, []);
  const totalDisbursement = useMemo(() => 12300, []);
  const onlineCollection = useMemo(() => 31250, []);
  const cashCollection = useMemo(() => 14500, []);

  if (!isOpen) return null;

  return (
    <div className="w-full h-full min-h-[100dvh] lg:min-h-0 bg-[#f8fafc] flex flex-col overflow-hidden px-3 sm:px-4 lg:px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 lg:pb-4 space-y-2.5 relative z-30">
      
      {/* TOP FIXED AREA: 3 Compact Control Rows (Pinned) */}
      <div className="shrink-0 bg-[#f8fafc] z-20 space-y-2 lg:space-y-2.5 pb-1">
        
        {/* LINE 1: Date Range & Period (Side-by-Side in 1 Horizontal Row) */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full shrink-0">
          {/* From Date */}
          <div className="flex-1 min-w-0 bg-white border border-slate-200/90 rounded-xl px-2 sm:px-2.5 h-[38px] flex items-center gap-1.5 sm:gap-2 shadow-2xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 leading-none truncate">From Date</span>
              <input
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-[11px] sm:text-xs font-semibold text-slate-700 bg-transparent outline-none truncate p-0 border-none leading-none w-full"
              />
            </div>
          </div>

          {/* To Date */}
          <div className="flex-1 min-w-0 bg-white border border-slate-200/90 rounded-xl px-2 sm:px-2.5 h-[38px] flex items-center gap-1.5 sm:gap-2 shadow-2xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 leading-none truncate">To Date</span>
              <input
                type="text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-[11px] sm:text-xs font-semibold text-slate-700 bg-transparent outline-none truncate p-0 border-none leading-none w-full"
              />
            </div>
          </div>

          {/* Period Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="bg-[#1d4ed8] text-white rounded-xl h-[38px] px-2.5 sm:px-3 font-semibold text-xs flex items-center gap-1 sm:gap-1.5 shadow-xs hover:bg-blue-700 transition-colors cursor-pointer select-none"
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
        <div className="flex items-center justify-between gap-2 w-full shrink-0">
          {/* Search Input */}
          <div className="flex-1 min-w-0 bg-slate-100/90 border border-slate-200/80 rounded-xl px-2.5 sm:px-3 h-10 flex items-center gap-1.5 sm:gap-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent outline-none text-xs text-slate-700 placeholder-slate-400 font-medium truncate"
            />
          </div>

          {/* Credit & Debit Action Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 h-10">
            <button
              onClick={() => {
                const next = activePill === 'Credit' ? 'All' : 'Credit';
                setActivePill(next);
                setTypeFilter(next);
              }}
              className={`rounded-xl px-2.5 sm:px-3 h-full flex items-center gap-1 sm:gap-1.5 font-bold text-xs transition-all cursor-pointer border select-none ${
                activePill === 'Credit'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-[#ecfdf5] text-emerald-600 border-emerald-100 hover:bg-emerald-100/70'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
              <span>Credit</span>
            </button>

            <button
              onClick={() => {
                const next = activePill === 'Debit' ? 'All' : 'Debit';
                setActivePill(next);
                setTypeFilter(next);
              }}
              className={`rounded-xl px-2.5 sm:px-3 h-full flex items-center gap-1 sm:gap-1.5 font-bold text-xs transition-all cursor-pointer border select-none ${
                activePill === 'Debit'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                  : 'bg-[#fef2f2] text-rose-600 border-rose-100 hover:bg-rose-100/70'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
              <span>Debit</span>
            </button>
          </div>
        </div>

        {/* LINE 3: Unified Summary Card (50/50 Equal Balance with Middle Vertical Divider) */}
        <div className="w-full bg-[#f0f7ff] border border-sky-100 rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs divide-x divide-sky-200/70 shrink-0">
          {/* Left 50%: Collection */}
          <div className="flex-1 flex items-center justify-between lg:justify-start gap-2 pr-2 sm:pr-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Collection</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 truncate">
                  ₹ {totalCollection.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            {/* Desktop Only: UPI & Cash Breakdown */}
            <div className="hidden lg:flex border-l border-sky-200/70 pl-2.5 flex-col justify-center text-[10px] leading-tight space-y-0.5 ml-auto">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block shrink-0"></span>
                <span className="text-slate-500">UPI:</span>
                <span className="font-bold text-blue-700">₹ {onlineCollection.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                <span className="text-slate-500">Cash:</span>
                <span className="font-bold text-emerald-700">₹ {cashCollection.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Right 50%: Disbursement */}
          <div className="flex-1 flex items-center gap-2 pl-2 sm:pl-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f3e8ff] text-[#7e22ce] flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25-9 5.25m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none">Disbursement</span>
              <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 truncate">
                ₹ {totalDisbursement.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* True Collection Data Ledger Table - Flex-1 with Dedicated Scroll */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div ref={tableScrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10 select-none shadow-2xs">
              <tr>
                <th className="py-2.5 px-3 sm:px-4 text-center text-[11px] font-semibold text-slate-500 w-12 sm:w-14">S.No</th>
                <th className="py-2.5 px-3 sm:px-4 text-left text-[11px] font-semibold text-slate-500">Name</th>
                <th className="hidden lg:table-cell py-2.5 px-4 text-center text-[11px] font-semibold text-slate-500 w-28 lg:w-32">Mode</th>
                <th className="py-2.5 px-3 sm:px-4 text-center text-[11px] font-semibold text-emerald-600 bg-emerald-50/70 w-24 sm:w-36">Credit</th>
                <th className="py-2.5 px-3 sm:px-4 text-center text-[11px] font-semibold text-rose-600 bg-rose-50/70 w-24 sm:w-36">Debit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-medium text-slate-400">{index + 1}</td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-slate-800">{item.name}</td>
                    <td className="hidden lg:table-cell py-3 px-4 text-center">
                      {item.mode === 'UPI' || item.mode === 'Online' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                          UPI
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                          Cash
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold text-emerald-600">
                      ₹ {item.credit.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold text-rose-600">
                      ₹ {item.debit.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="lg:colSpan-5 py-8 text-center text-slate-400 font-medium">
                    No transactions found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
