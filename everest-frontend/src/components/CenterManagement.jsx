import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronUp, Plus, Search, X } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import CreateCenterModal from './CreateCenterModal';

export default function CenterManagement({ userProfile, activeBranch, navigateToView, setSelectedCenter }) {
  const [centers, setCenters] = useState([]);
  const [branches, setBranches] = useState([{ id: 'all', name: 'All Center' }]);
  const [activeBranchId, setActiveBranchId] = useState('all');
  const [activeStaffId, setActiveStaffId] = useState('all');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isMainBranch = activeBranch?.name?.toLowerCase().includes('main') || activeBranch?.id === 'main';

  const staffList = useMemo(() => {
    if (isMainBranch || userProfile?.role?.toLowerCase() === 'staff') return [];
    const subBranchCenters = centers.filter(c => 
      c.branchId === activeBranch?.id || 
      c.branchName?.trim().toLowerCase() === activeBranch?.name?.trim().toLowerCase()
    );
    const staffSet = new Set();
    subBranchCenters.forEach(c => {
      const s = c.staffName || c.createdByStaffId;
      if (s && c.status !== 'Deleted' && !c.isDeleted) staffSet.add(s);
    });
    return Array.from(staffSet).map(s => ({ id: s, name: s }));
  }, [centers, isMainBranch, activeBranch, userProfile]);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [searchQuery]);

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
    } else if (!isMainBranch) {
      // SUB-BRANCH VIEW (Admin or Sub-Admin)
      filtered = filtered.filter(c => 
        c.branchId === activeBranch?.id || 
        c.branchName?.trim().toLowerCase() === activeBranch?.name?.trim().toLowerCase()
      );
    } else if (activeBranchId !== 'all') {
      // MAIN BRANCH VIEW with dropdown selected
      const selectedBranch = branches.find(b => b.id === activeBranchId);
      filtered = filtered.filter(c => 
        c.branchId === activeBranchId || 
        (selectedBranch && c.branchName === selectedBranch.name)
      );
    }
    
    return filtered;
  }, [centers, activeBranchId, userProfile, branches, isMainBranch, activeBranch]);

  const counts = useMemo(() => {
    return {
      Active: branchCenters.filter(c => c.status === 'Active').length,
      Overdue: branchCenters.filter(c => c.status === 'Overdue').length,
      Closed: branchCenters.filter(c => c.status === 'Closed').length,
    };
  }, [branchCenters]);

  const { filteredCenters, matchCount } = useMemo(() => {
    let result = branchCenters;
    let count = 0;
    if (activeFilter !== 'All') {
      result = result.filter(c => c.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      
      // Filter rows
      result = result.filter(c => {
        const vName = (c.village || c.villageName || '').toLowerCase();
        const bName = (c.branchName || '').toLowerCase();
        const sName = (c.staffName || c.createdByStaffId || '').toLowerCase();
        const lName = (c.leader || c.groupLeader || '').toLowerCase();
        const gName = (c.group || c.groupName || '').toLowerCase();
        const mCount = String(c.members || c.totalMembers || c.totalMember || 0);
        return vName.includes(q) || bName.includes(q) || sName.includes(q) || lName.includes(q) || gName.includes(q) || mCount.includes(q);
      });
      
      // Count matches inside visible rows
      result = result.map(c => {
         const newC = { ...c, _matches: {} };
         const fields = [
           { key: 'staffName', val: (c.staffName || c.createdByStaffId || 'N/A') },
           { key: 'branchName', val: (c.branchName || 'N/A') },
           { key: 'villageName', val: (c.village || c.villageName || 'N/A') },
           { key: 'leader', val: (c.leader || c.groupLeader || 'N/A') },
           { key: 'groupName', val: (c.group || c.groupName || 'N/A') },
           { key: 'members', val: String(c.members || c.totalMembers || c.totalMember || 0) }
         ];
         fields.forEach(f => {
            const str = String(f.val);
            const lowerStr = str.toLowerCase();
            if (lowerStr.includes(q)) {
               let occurrences = 0;
               let idx = lowerStr.indexOf(q);
               while (idx !== -1) {
                  occurrences++;
                  idx = lowerStr.indexOf(q, idx + q.length);
               }
               newC._matches[f.key] = { startMatchIdx: count, count: occurrences };
               count += occurrences;
            }
         });
         return newC;
      });
    }
    return { filteredCenters: result, matchCount: count };
  }, [branchCenters, activeFilter, searchQuery]);

  useEffect(() => {
    setTotalMatches(matchCount);
  }, [matchCount]);

  const highlightText = (text, query, startMatchIdx) => {
    if (!query.trim() || text == null || startMatchIdx === undefined) return text;
    const str = String(text);
    const lowerStr = str.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (!lowerStr.includes(lowerQuery)) return str;
    
    const parts = [];
    let currentIndex = 0;
    let matchIdxOffset = 0;
    
    let idx = lowerStr.indexOf(lowerQuery);
    while (idx !== -1) {
      parts.push(str.slice(currentIndex, idx));
      const globalIdx = startMatchIdx + matchIdxOffset;
      const isActive = globalIdx === activeMatchIndex;
      parts.push(
        <span 
          key={globalIdx}
          id={`search-match-${globalIdx}`}
          className={`rounded px-0.5 ${isActive ? 'bg-orange-400 font-bold text-white' : 'bg-amber-200 text-gray-900'}`}
        >
          {str.slice(idx, idx + query.length)}
        </span>
      );
      currentIndex = idx + query.length;
      matchIdxOffset++;
      idx = lowerStr.indexOf(lowerQuery, currentIndex);
    }
    parts.push(str.slice(currentIndex));
    return parts;
  };

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
        <div className="flex items-center gap-1.5 md:gap-2 w-full md:w-auto mt-3 md:mt-0">
          
          {/* Dropdown / Static Text */}
          <div className="relative shrink-0 md:flex-none">
            {userProfile?.role?.toLowerCase() === 'staff' ? (
              <div className="bg-white border border-slate-200 text-slate-700 font-medium py-1.5 md:py-2 px-3 md:px-4 rounded-lg shadow-sm h-9 md:h-auto text-xs md:text-base flex items-center whitespace-nowrap">
                All Center ({branchCenters.filter(c => c.status !== 'Deleted' && !c.isDeleted).length})
              </div>
            ) : !isMainBranch ? (
              <>
                <select 
                  value={activeStaffId}
                  onChange={(e) => setActiveStaffId(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-700 font-medium py-1.5 md:py-2 pl-2 md:pl-4 pr-6 md:pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-9 md:h-auto text-[11px] md:text-base"
                >
                  <option value="all">
                    All Center ({centers.filter(c => 
                      (c.branchId === activeBranch?.id || c.branchName?.trim().toLowerCase() === activeBranch?.name?.trim().toLowerCase()) && 
                      c.status !== 'Deleted' && !c.isDeleted
                    ).length})
                  </option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 md:px-2 text-slate-500">
                  <ChevronDown size={14} />
                </div>
              </>
            ) : (
              <>
                <select 
                  value={activeBranchId}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-700 font-medium py-1.5 md:py-2 pl-2 md:pl-4 pr-6 md:pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-9 md:h-auto text-[11px] md:text-base"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.id === 'all' ? `All Center (${centers.filter(c => c.status !== 'Deleted' && !c.isDeleted).length})` : b.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 md:px-2 text-slate-500">
                  <ChevronDown size={14} />
                </div>
              </>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex relative items-center flex-1 md:flex-none min-w-0">
            <div className={`flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden transition-all duration-300 ease-in-out ${isSearchFocused || searchQuery ? 'w-full md:w-auto md:min-w-[280px] ring-2 ring-blue-500/20 border-blue-500' : 'w-full md:w-9 hover:bg-slate-50'}`}>
              <div 
                className="w-8 md:w-9 h-9 flex items-center justify-center shrink-0 text-slate-500 cursor-pointer"
                onClick={() => {
                  if (!isSearchFocused) {
                    document.getElementById('center-search-input')?.focus();
                  }
                }}
              >
                <Search size={14} className="md:w-4 md:h-4" />
              </div>
              <input 
                id="center-search-input"
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={`h-9 bg-transparent border-none outline-none text-[11px] md:text-sm text-slate-700 pr-1 md:pr-2 placeholder-slate-400 min-w-0 ${isSearchFocused || searchQuery ? 'w-full md:w-48' : 'w-full'}`}
              />
              {searchQuery && (
                <div className="flex items-center shrink-0 bg-slate-50 border-l border-slate-200 h-9">
                  <div className="hidden md:block px-2 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                    {totalMatches > 0 ? `${activeMatchIndex + 1} of ${totalMatches}` : '0 matches'}
                  </div>
                  <div className="block md:hidden px-1 text-[10px] font-medium text-slate-500 whitespace-nowrap">
                    {totalMatches > 0 ? `${activeMatchIndex + 1}/${totalMatches}` : '0'}
                  </div>
                  <div className="flex items-center border-l border-slate-200 h-full">
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (totalMatches > 0) {
                          const newIdx = activeMatchIndex === 0 ? totalMatches - 1 : activeMatchIndex - 1;
                          setActiveMatchIndex(newIdx);
                          document.getElementById(`search-match-${newIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="w-5 md:w-6 h-full flex items-center justify-center hover:bg-slate-200 text-slate-500 transition-colors"
                    >
                      <ChevronUp size={12} className="md:w-3.5 md:h-3.5" />
                    </button>
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (totalMatches > 0) {
                          const newIdx = activeMatchIndex === totalMatches - 1 ? 0 : activeMatchIndex + 1;
                          setActiveMatchIndex(newIdx);
                          document.getElementById(`search-match-${newIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="w-5 md:w-6 h-full flex items-center justify-center border-l border-slate-200 hover:bg-slate-200 text-slate-500 transition-colors"
                    >
                      <ChevronDown size={12} className="md:w-3.5 md:h-3.5" />
                    </button>
                  </div>
                  <div 
                    className="w-6 md:w-8 h-full flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer border-l border-slate-200 transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchQuery('');
                      document.getElementById('center-search-input')?.focus();
                    }}
                  >
                    <X size={12} className="md:w-3.5 md:h-3.5" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          {!isMainBranch && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium px-2.5 md:px-5 py-1.5 md:py-2.5 rounded-lg flex items-center justify-center gap-1 md:gap-2 shadow-sm h-9 md:h-auto text-[11px] md:text-base whitespace-nowrap"
            >
              <Plus size={14} className="md:w-[18px] md:h-[18px]" />
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
            <tr className="bg-blue-600 text-white border-b border-blue-700 text-[10px] md:text-sm font-bold md:font-semibold md:tracking-wide whitespace-nowrap">
              <th className="py-2.5 px-1 md:py-4 md:px-6 text-center w-[7%] md:w-16 border-r border-white/40 md:border-white/30 box-border">#</th>
              {isMainBranch ? (
                <th className="hidden md:table-cell py-4 px-6 w-auto truncate md:border-r md:border-white/30 box-border">Branch Name</th>
              ) : (
                <th className="hidden md:table-cell py-4 px-6 w-auto truncate md:border-r md:border-white/30 box-border">Staff Name</th>
              )}
              <th className="py-2.5 px-1 md:py-4 md:px-6 w-[22%] md:w-auto truncate border-r border-white/40 md:border-white/30 box-border">Village Name</th>
              <th className="py-2.5 px-1 md:py-4 md:px-6 w-[22%] md:w-auto truncate border-r border-white/40 md:border-white/30 box-border">Leader</th>
              <th className="py-2.5 px-1 md:py-4 md:px-6 w-[24%] md:w-auto truncate border-r border-white/40 md:border-white/30 box-border">Group Name</th>
              <th className="py-2.5 px-1 md:py-4 md:px-6 text-center w-[11%] md:w-auto whitespace-nowrap border-r-0 md:border-r md:border-white/30 box-border">Members</th>
              <th className="py-2.5 px-1 md:py-4 md:px-6 w-[14%] md:w-auto border-r-0 md:border-r-0 box-border">
                <span className="hidden md:inline">Status</span>
              </th>
              <th className="py-4 px-2 w-24 shrink-0 text-center border-r-0 md:border-r-0 box-border"></th>
            </tr>
          </thead>
          <tbody>
            {filteredCenters.map((center, index) => (
              <tr 
                key={center.id} 
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer text-[11px] md:text-sm"
                onClick={() => {
                  if (setSelectedCenter && navigateToView) {
                    setSelectedCenter(center);
                    navigateToView('Center Detail');
                  }
                }}
              >
                <td className="py-2 px-1 md:py-4 md:px-6 text-center text-gray-900 font-bold truncate">{index + 1}</td>
                {isMainBranch ? (
                  <td className="hidden md:table-cell py-4 px-6 text-gray-900 font-bold">
                    <div className="truncate max-w-[140px] md:max-w-[180px] w-full block" title={center.branchName}>
                      {searchQuery.trim() ? highlightText(center.branchName || 'N/A', searchQuery, center._matches?.branchName?.startMatchIdx) : (center.branchName || 'N/A')}
                    </div>
                  </td>
                ) : (
                  <td className="hidden md:table-cell py-4 px-6 text-gray-900 font-bold">
                    <div className="truncate max-w-[140px] md:max-w-[180px] w-full block" title={center.staffName || center.createdByStaffId}>
                      {searchQuery.trim() ? highlightText(center.staffName || center.createdByStaffId || 'N/A', searchQuery, center._matches?.staffName?.startMatchIdx) : (center.staffName || center.createdByStaffId || 'N/A')}
                    </div>
                  </td>
                )}
                <td className="py-2 px-1 md:py-4 md:px-6 text-gray-900 font-bold">
                  <div className="truncate max-w-[140px] md:max-w-[180px] w-full block" title={center.village || center.villageName}>
                    {searchQuery.trim() ? highlightText(center.village || center.villageName || 'N/A', searchQuery, center._matches?.villageName?.startMatchIdx) : (center.village || center.villageName || 'N/A')}
                  </div>
                </td>
                <td className="py-2 px-1 md:py-4 md:px-6 text-gray-900 font-bold">
                  <div className="truncate max-w-[140px] md:max-w-[180px] w-full block" title={center.leader || center.groupLeader}>
                    {searchQuery.trim() ? highlightText(center.leader || center.groupLeader || 'N/A', searchQuery, center._matches?.leader?.startMatchIdx) : (center.leader || center.groupLeader || 'N/A')}
                  </div>
                </td>
                <td className="py-2 px-1 md:py-4 md:px-6 text-gray-900 font-bold">
                  <div className="truncate max-w-[140px] md:max-w-[180px] w-full block" title={center.group || center.groupName}>
                    {searchQuery.trim() ? highlightText(center.group || center.groupName || 'N/A', searchQuery, center._matches?.groupName?.startMatchIdx) : (center.group || center.groupName || 'N/A')}
                  </div>
                </td>
                <td className="py-2 px-1 md:py-4 md:px-6 text-center text-gray-900 font-bold truncate">
                  {searchQuery.trim() ? highlightText(center.members || center.totalMembers || center.totalMember || 0, searchQuery, center._matches?.members?.startMatchIdx) : (center.members || center.totalMembers || center.totalMember || 0)}
                </td>
                <td className="py-2 px-1 md:py-4 md:px-6">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(center.status || (center.isDeleted ? 'Deleted' : ''))}
                    {center.recentlyRestored && (
                      <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 whitespace-nowrap">
                        Recently Restored
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-2 w-16 text-center text-slate-400" onClick={(e) => e.stopPropagation()}>
                  {(activeFilter === 'Deleted' || center.status === 'Deleted' || center.isDeleted) && !isMainBranch ? (
                    <button
                      onClick={(e) => handleRestoreCenter(e, center)}
                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-1.5 px-2 rounded-lg transition-colors flex flex-col items-center justify-center border border-emerald-200 shadow-sm mx-auto"
                      title="Restore Center"
                    >
                      <span className="text-[9px] font-extrabold uppercase whitespace-nowrap">RESTORE</span>
                    </button>
                  ) : (
                    <ChevronRight size={20} className="mx-auto" />
                  )}
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
