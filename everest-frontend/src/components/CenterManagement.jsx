import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function CenterManagement() {
  const [centers, setCenters] = useState([]);
  const [branches, setBranches] = useState([{ id: 'all', name: 'All Branches / All Centers' }]);
  const [activeBranchId, setActiveBranchId] = useState('all');
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setBranches([{ id: 'all', name: 'All Branches / All Centers' }, ...fetched]);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'centers'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCenters(fetched);
    });
    return () => unsub();
  }, []);

  const branchCenters = useMemo(() => {
    if (activeBranchId === 'all') return centers;
    return centers.filter(c => c.branchId === activeBranchId);
  }, [centers, activeBranchId]);

  const counts = useMemo(() => {
    return {
      Active: branchCenters.filter(c => c.status === 'Active').length,
      Overdue: branchCenters.filter(c => c.status === 'Overdue').length,
      Closed: branchCenters.filter(c => c.status === 'Closed').length,
    };
  }, [branchCenters]);

  const filteredCenters = useMemo(() => {
    if (activeFilter === 'All') return branchCenters;
    return branchCenters.filter(c => c.status === activeFilter);
  }, [branchCenters, activeFilter]);

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
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-sm font-medium border border-slate-200">
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
            {status || 'Unknown'}
          </div>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto bg-slate-50 min-h-screen">
      {/* Toolbar Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 mt-2">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Dropdown */}
          <div className="relative">
            <select 
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-700 font-medium py-2 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
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
                <td className="py-4 px-6 text-center text-slate-800 font-bold">{index + 1}</td>
                <td className="py-4 px-6 text-slate-700">{center.village || center.villageName || 'N/A'}</td>
                <td className="py-4 px-6 text-slate-600">{center.leader || center.groupLeader || 'N/A'}</td>
                <td className="py-4 px-6 text-slate-600">
                  <div className="max-w-[150px] leading-tight break-words">{center.group || center.groupName || 'N/A'}</div>
                </td>
                <td className="py-4 px-6 text-center text-slate-600">{center.members || center.totalMember || 0}</td>
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
                  No centers found. Click '+ Create Center' to add a new center.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
