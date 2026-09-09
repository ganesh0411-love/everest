import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import CreateCenterModal from './CreateCenterModal';

export default function CenterManagement({ userProfile, activeBranch }) {
  const [centers, setCenters] = useState([]);
  const [branches, setBranches] = useState([{ id: 'all', name: 'All Center' }]);
  const [activeBranchId, setActiveBranchId] = useState('all');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setBranches([{ id: 'all', name: 'All Center' }, ...fetched]);
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
    let filtered = centers;
    
    if (userProfile?.role?.toLowerCase() === 'staff') {
      filtered = filtered.filter(c => 
        (c.staffName && userProfile?.name && c.staffName.toLowerCase() === userProfile.name.toLowerCase()) || 
        (c.createdByStaffId && userProfile?.id && c.createdByStaffId === userProfile.id)
      );
    } else if (activeBranchId !== 'all') {
      // Ensure we match either branchId or branchName
      const selectedBranch = branches.find(b => b.id === activeBranchId);
      filtered = filtered.filter(c => 
        c.branchId === activeBranchId || 
        (selectedBranch && c.branchName === selectedBranch.name)
      );
    }
    
    return filtered;
  }, [centers, activeBranchId, userProfile, branches]);

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
          <div className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-3 py-0.5 md:py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] md:text-sm font-semibold md:font-medium border border-emerald-100 w-fit whitespace-nowrap">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 shrink-0"></div>
            <span className="truncate">Active</span>
          </div>
        );
      case 'Overdue':
        return (
          <div className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-3 py-0.5 md:py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] md:text-sm font-semibold md:font-medium border border-amber-100 w-fit whitespace-nowrap">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 shrink-0"></div>
            <span className="truncate">Overdue</span>
          </div>
        );
      case 'Closed':
        return (
          <div className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-3 py-0.5 md:py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] md:text-sm font-semibold md:font-medium border border-rose-100 w-fit whitespace-nowrap">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-rose-500 shrink-0"></div>
            <span className="truncate">Closed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-3 py-0.5 md:py-1 bg-slate-50 text-slate-600 rounded-full text-[9px] md:text-sm font-semibold md:font-medium border border-slate-200 w-fit whitespace-nowrap">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-400 shrink-0"></div>
            <span className="truncate">{status || 'Unknown'}</span>
          </div>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto bg-slate-50 min-h-screen">
      {/* Toolbar Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-0 md:gap-4 mb-4 md:mb-6 mt-2 w-full">
        {/* Row 1 (Mobile) / Left (Desktop): Filters */}
        <div className="flex items-center justify-between md:justify-start gap-1.5 md:gap-3 w-full md:w-auto">
          {/* Filter Pills */}
          <button 
            onClick={() => toggleFilter('Active')}
            className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-1 md:px-4 md:py-2 rounded-full border bg-white shadow-sm transition-colors w-full md:w-auto justify-center md:justify-start ${activeFilter === 'Active' ? 'ring-1 md:ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 shrink-0"></div>
            <span className="text-slate-700 font-medium text-[11px] md:text-sm whitespace-nowrap">Active <span className="text-slate-500 font-normal">({counts.Active})</span></span>
          </button>
          
          <button 
            onClick={() => toggleFilter('Overdue')}
            className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-1 md:px-4 md:py-2 rounded-full border bg-white shadow-sm transition-colors w-full md:w-auto justify-center md:justify-start ${activeFilter === 'Overdue' ? 'ring-1 md:ring-2 ring-amber-500 border-amber-500' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 shrink-0"></div>
            <span className="text-slate-700 font-medium text-[11px] md:text-sm whitespace-nowrap">Overdue <span className="text-slate-500 font-normal">({counts.Overdue})</span></span>
          </button>

          <button 
            onClick={() => toggleFilter('Closed')}
            className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-1 md:px-4 md:py-2 rounded-full border bg-white shadow-sm transition-colors w-full md:w-auto justify-center md:justify-start ${activeFilter === 'Closed' ? 'ring-1 md:ring-2 ring-rose-500 border-rose-500' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-rose-500 shrink-0"></div>
            <span className="text-slate-700 font-medium text-[11px] md:text-sm whitespace-nowrap">Closed <span className="text-slate-500 font-normal">({counts.Closed})</span></span>
          </button>
        </div>

        {/* Row 2 (Mobile) / Right (Desktop): Dropdown + Button */}
        <div className="flex items-center gap-2 w-full md:w-auto mt-3 md:mt-0">
          {/* Dropdown / Static Text */}
          <div className="relative flex-1 md:w-auto md:flex-none">
            {(userProfile?.role?.toLowerCase() === 'staff' || activeBranch !== 'Main Branch') ? (
              <div className="w-full bg-white border border-slate-200 text-slate-700 font-medium py-1.5 md:py-2 px-3 md:px-4 rounded-lg shadow-sm h-9 md:h-auto text-xs md:text-base flex items-center">
                All Center
              </div>
            ) : (
              <>
                <select 
                  value={activeBranchId}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  className="appearance-none w-full bg-white border border-slate-200 text-slate-700 font-medium py-1.5 md:py-2 pl-3 md:pl-4 pr-8 md:pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-9 md:h-auto text-xs md:text-base"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <ChevronDown size={16} />
                </div>
              </>
            )}
          </div>

          {/* Action Button */}
          {activeBranch !== 'Main Branch' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="shrink-0 md:w-auto bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium px-3.5 md:px-5 py-1.5 md:py-2.5 rounded-lg flex items-center justify-center gap-1.5 md:gap-2 shadow-sm h-9 md:h-auto text-xs md:text-base"
            >
              <Plus size={16} className="md:w-[18px] md:h-[18px]" />
              <span className="md:hidden">Create</span>
              <span className="hidden md:inline">Create Center</span>
            </button>
          )}
        </div>
      </div>

      {/* Create Center Modal */}
      <CreateCenterModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        userProfile={userProfile} 
        activeBranch={activeBranch} 
      />

      {/* Data Table */}
      <div className="bg-white md:rounded-xl shadow-sm border-t border-b md:border border-slate-200 overflow-x-hidden md:overflow-x-auto w-full max-w-full">
        <table className="w-full text-left border-collapse table-fixed md:table-auto md:min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] md:text-sm font-bold md:font-semibold tracking-tight whitespace-nowrap">
              <th className="py-2.5 px-1 md:py-4 md:px-6 text-center w-[7%] md:w-16">#</th>
              <th className="py-2.5 px-1 md:py-4 md:px-6 w-[22%] md:w-auto truncate">Village Name</th>
              <th className="py-2.5 px-1 md:py-4 md:px-6 w-[22%] md:w-auto truncate">Group Leader</th>
              <th className="py-2.5 px-1 md:py-4 md:px-6 w-[24%] md:w-auto truncate">Group Name</th>
              <th className="py-2.5 px-1 md:py-4 md:px-6 text-center w-[11%] md:w-auto whitespace-nowrap">
                <span className="md:hidden">Members</span>
                <span className="hidden md:inline">Total<br/>Member</span>
              </th>
              <th className="py-2.5 px-1 md:py-4 md:px-6 w-[14%] md:w-auto">
                <span className="hidden md:inline">Status</span>
              </th>
              <th className="hidden md:table-cell py-4 px-6 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filteredCenters.map((center, index) => (
              <tr key={center.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer text-[11px] md:text-sm">
                <td className="py-2 px-1 md:py-4 md:px-6 text-center text-slate-800 font-bold truncate">{index + 1}</td>
                <td className="py-2 px-1 md:py-4 md:px-6 text-slate-700 truncate">{center.village || center.villageName || 'N/A'}</td>
                <td className="py-2 px-1 md:py-4 md:px-6 text-slate-600 truncate">{center.leader || center.groupLeader || 'N/A'}</td>
                <td className="py-2 px-1 md:py-4 md:px-6 text-slate-600 truncate">
                  <div className="truncate md:max-w-[150px] md:break-words md:whitespace-normal leading-tight">{center.group || center.groupName || 'N/A'}</div>
                </td>
                <td className="py-2 px-1 md:py-4 md:px-6 text-center text-slate-600 truncate">{center.members || center.totalMembers || center.totalMember || 0}</td>
                <td className="py-2 px-1 md:py-4 md:px-6">
                  {getStatusBadge(center.status)}
                </td>
                <td className="hidden md:table-cell py-4 px-6 text-slate-400">
                  <ChevronRight size={20} />
                </td>
              </tr>
            ))}
            {filteredCenters.length === 0 && (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-500 text-sm">
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
