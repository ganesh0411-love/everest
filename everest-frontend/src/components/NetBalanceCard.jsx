import React from 'react';

const NetBalanceCard = ({ loanAmount = 0, outstanding = 0 }) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-2">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 pt-2 pb-1 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Balance:</span>
            <button className="text-blue-600 text-xs font-medium hover:text-blue-700 flex items-center">
              View Report <span className="ml-1 text-base leading-none">&rsaquo;</span>
            </button>
          </div>
        </div>
        
        <div className="px-4 pb-2 pt-1 flex w-full">
          <div className="flex-1 pr-4">
            <div className="text-[10px] font-bold text-slate-500 tracking-wider mb-0.5">LOAN AMOUNT</div>
            <div className="text-xl font-bold text-emerald-500 flex items-center gap-1">
              <span>₹</span> {loanAmount.toLocaleString('en-IN')}
            </div>
          </div>
          
          <div className="w-px bg-slate-200 mx-2"></div>
          
          <div className="flex-1 pl-4 flex flex-col items-end">
            <div className="text-[10px] font-bold text-slate-500 tracking-wider mb-0.5 text-right">OUTSTANDING</div>
            <div className="text-xl font-bold text-rose-500 flex items-center gap-1">
              <span>₹</span> {outstanding.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetBalanceCard;
