import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';

const initialCenters = [
  { id: 1, village: 'Muthur Village', leader: 'Selvi R', group: 'Green Valley Group', members: 12, status: 'Active' },
  { id: 2, village: 'Kallipatti Village', leader: 'Ramesh K', group: 'Sunrise Group', members: 15, status: 'Active' },
  { id: 3, village: 'Pudur Village', leader: 'Lakshmi P', group: 'Hope Group', members: 10, status: 'Overdue' },
  { id: 4, village: 'Velampatti Village', leader: 'Murugan S', group: 'Unity Group', members: 8, status: 'Closed' },
  { id: 5, village: 'Sembatti Village', leader: 'Kavitha T', group: 'Future Group', members: 14, status: 'Overdue' },
  { id: 6, village: 'Ammampatti Village', leader: 'Bala S', group: 'Happy Group', members: 9, status: 'Closed' },
  { id: 7, village: 'Nallur Village', leader: 'Deepa M', group: 'Bright Group', members: 11, status: 'Active' },
  { id: 8, village: 'Thirupathi Village', leader: 'Karthik V', group: 'Growth Group', members: 13, status: 'Overdue' },
];

export default function CenterManagement() {
  const [centers, setCenters] = useState(initialCenters);
  const [activeFilter, setActiveFilter] = useState('All');

  const counts = useMemo(() => {
    return {
      Active: centers.filter(c => c.status === 'Active').length,
      Overdue: centers.filter(c => c.status === 'Overdue').length,
      Closed: centers.filter(c => c.status === 'Closed').length,
    };
  }, [centers]);

  const filteredCenters = useMemo(() => {
    if (activeFilter === 'All') return centers;
    return centers.filter(c => c.status === activeFilter);
  }, [centers, activeFilter]);

  const toggleFilter = (filterName) => {
    if (activeFilter === filterName) {
      setActiveFilter('All');
    } else {
      setActiveFilter(filterName);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-sm font-medium border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            Active
          </div>
        );
      case 'Overdue':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-sm font-medium border border-amber-100">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            Overdue
          </div>
        );
      case 'Closed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-sm font-medium border border-rose-100">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            Closed
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="text-center mb-8 mt-2">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">CENTERS</h1>
      </div>

      {/* Toolbar Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Dropdown */}
          <div className="relative">
            <select className="appearance-none bg-white border border-slate-200 text-slate-700 font-medium py-2 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>All Center</option>
              <option>Main Branch</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <ChevronDown size={16} />
            </div>
          </div>

          {/* Filter Pills */}
          <button 
            onClick={() => toggleFilter('Active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border bg-white shadow-sm transition-colors ${activeFilter === 'Active' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-slate-700 font-medium text-sm">Active</span>
            <span className="text-slate-500 text-sm">({counts.Active})</span>
          </button>
          
          <button 
            onClick={() => toggleFilter('Overdue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border bg-white shadow-sm transition-colors ${activeFilter === 'Overdue' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-slate-700 font-medium text-sm">Overdue</span>
            <span className="text-slate-500 text-sm">({counts.Overdue})</span>
          </button>

          <button 
            onClick={() => toggleFilter('Closed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border bg-white shadow-sm transition-colors ${activeFilter === 'Closed' ? 'ring-2 ring-rose-500 border-rose-500' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span className="text-slate-700 font-medium text-sm">Closed</span>
            <span className="text-slate-500 text-sm">({counts.Closed})</span>
          </button>
        </div>

        {/* Action Button */}
        <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm">
          <Plus size={18} />
          Create Center
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-sm font-semibold">
              <th className="py-4 px-6 text-center w-16">#</th>
              <th className="py-4 px-6">Village Name</th>
              <th className="py-4 px-6">Group Leader</th>
              <th className="py-4 px-6">Group Name</th>
              <th className="py-4 px-6 text-center">Total<br/>Member</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filteredCenters.map((center, index) => (
              <tr key={center.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="py-4 px-6 text-center text-slate-800 font-bold">{center.id}</td>
                <td className="py-4 px-6 text-slate-700">{center.village}</td>
                <td className="py-4 px-6 text-slate-600">{center.leader}</td>
                <td className="py-4 px-6 text-slate-600">
                  <div className="max-w-[150px] leading-tight break-words">{center.group}</div>
                </td>
                <td className="py-4 px-6 text-center text-slate-600">{center.members}</td>
                <td className="py-4 px-6">
                  {getStatusBadge(center.status)}
                </td>
                <td className="py-4 px-6 text-slate-400">
                  <ChevronRight size={20} />
                </td>
              </tr>
            ))}
            {filteredCenters.length === 0 && (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-500">
                  No centers found matching this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
