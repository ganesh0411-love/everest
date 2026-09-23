import React from 'react';

export const Centers = () => (
  <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
    <div className="text-5xl mb-4">👥</div>
    <h2 className="text-xl font-bold text-slate-800 mb-2">Centers Management</h2>
    <p className="text-slate-500">Placeholder for center management and allocation.</p>
  </div>
);



export const DashboardOverview = () => (
  <div className="p-6 min-h-[50vh]">
    <h2 className="text-xl font-bold text-slate-800 mb-6">Dashboard Overview</h2>
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="text-sm text-slate-500 font-medium">Total Disbursed</div>
        <div className="text-2xl font-bold text-slate-800 mt-1">₹45,00,000</div>
      </div>
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="text-sm text-slate-500 font-medium">Active Loans</div>
        <div className="text-2xl font-bold text-slate-800 mt-1">124</div>
      </div>
    </div>
    <div className="w-full h-48 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center flex-col relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-full h-32 flex items-end justify-around px-4 opacity-50">
        <div className="w-8 bg-blue-400 rounded-t-md h-12"></div>
        <div className="w-8 bg-blue-400 rounded-t-md h-24"></div>
        <div className="w-8 bg-blue-400 rounded-t-md h-16"></div>
        <div className="w-8 bg-blue-400 rounded-t-md h-28"></div>
        <div className="w-8 bg-blue-400 rounded-t-md h-20"></div>
      </div>
      <div className="text-slate-500 font-medium z-10 bg-white/80 px-4 py-2 rounded-lg backdrop-blur-sm">Analytics Chart Placeholder</div>
    </div>
  </div>
);

export const CustomerKYCUpdate = () => (
  <div className="p-6 min-h-[50vh]">
    <h2 className="text-xl font-bold text-slate-800 mb-4">Customer KYC Update</h2>
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Search Customer ID</label>
        <div className="flex gap-2">
          <input type="text" className="flex-1 p-2 border rounded-lg outline-none focus:ring-2 ring-blue-200" placeholder="e.g. 1001" />
          <button className="bg-brand-blue text-white px-4 py-2 rounded-lg font-medium">Fetch</button>
        </div>
      </div>
      <hr className="my-6 border-slate-200" />
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Update Phone Number</label>
          <input type="text" className="w-full p-2 border rounded-lg bg-white outline-none" defaultValue="9876543210" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Update Aadhaar Number</label>
          <input type="text" className="w-full p-2 border rounded-lg bg-slate-100 outline-none text-slate-500" value="XXXX - XXXX - 1234" readOnly />
          <p className="text-xs text-slate-500 mt-1">Aadhaar number is masked for compliance and security.</p>
        </div>
        <button className="w-full bg-emerald-500 text-white font-bold py-3 rounded-lg mt-2">Save KYC Data</button>
      </div>
    </div>
  </div>
);

export const RecycleBin = () => (
  <div className="p-6 min-h-[50vh]">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <span>🗑️</span> Recycle Bin
      </h2>
      <span className="text-xs font-semibold bg-rose-100 text-rose-700 px-3 py-1 rounded-full">
        Items remain for 180 days before permanent deletion
      </span>
    </div>
    
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-4 bg-white border-b flex justify-between items-center hover:bg-slate-50 transition-colors">
        <div>
          <div className="font-bold text-slate-800">1005 - Jane Doe</div>
          <div className="text-sm text-slate-500">Deleted on: Oct 12, 2026 (175 days left)</div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-medium text-sm rounded border border-emerald-200 transition-colors">
            Restore
          </button>
          <button className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 font-medium text-sm rounded border border-red-200 transition-colors">
            Permanently Delete
          </button>
        </div>
      </div>
    </div>
  </div>
);
