import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, MapPin, Clock, Calendar as CalendarIcon, User, ChevronDown } from 'lucide-react';

export default function AttendanceLedger({ onClose, branches = [], activeBranch = { id: 'main', name: 'Main Branch' } }) {
  const [selectedBranch, setSelectedBranch] = useState(activeBranch.name);
  const [staffData, setStaffData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

  useEffect(() => {
    // We need to fetch all staff for the selected branch, 
    // then fetch their attendance record for `todayStr`.
    let unsubscribeStaff = null;
    let unsubscribesAttendance = [];

    const fetchLedger = async () => {
      setLoading(true);
      try {
        // Query staff
        let staffQuery;
        if (selectedBranch === 'All Branches' || selectedBranch === 'Main Branch' || selectedBranch === 'All') {
          staffQuery = query(collection(db, 'staff')); // Adjust as needed for generic
        } else {
          staffQuery = query(collection(db, 'staff'), where('branch', '==', selectedBranch));
        }

        unsubscribeStaff = onSnapshot(staffQuery, (staffSnap) => {
          const staffList = staffSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
          
          // For each staff, subscribe to their attendance for today
          unsubscribesAttendance.forEach(u => u());
          unsubscribesAttendance = [];

          let combinedData = [...staffList];
          
          if (staffList.length === 0) {
            setStaffData([]);
            setLoading(false);
            return;
          }

          let loadedCount = 0;

          staffList.forEach((staff, index) => {
            const attRef = doc(db, 'staff', staff.uid || staff.docId, 'attendance', todayStr);
            const unsubAtt = onSnapshot(attRef, (attSnap) => {
              const attData = attSnap.exists() ? attSnap.data() : null;
              
              combinedData[index] = {
                ...combinedData[index],
                attendance: attData
              };
              
              setStaffData([...combinedData]);
              
              loadedCount++;
              if (loadedCount >= staffList.length) {
                setLoading(false);
              }
            }, (err) => {
              console.error("Error fetching attendance", err);
              loadedCount++;
              if (loadedCount >= staffList.length) setLoading(false);
            });
            unsubscribesAttendance.push(unsubAtt);
          });
        });

      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };

    fetchLedger();

    return () => {
      if (unsubscribeStaff) unsubscribeStaff();
      unsubscribesAttendance.forEach(u => u());
    };
  }, [selectedBranch, todayStr]);

  const getStatusInfo = (att) => {
    if (!att) return { label: 'Not Checked In', color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' };
    
    // Check permission / leave first if your schema supports it
    if (att.status === 'leave' || att.status === 'permission') {
      return { label: att.status === 'leave' ? 'On Leave' : 'Permission', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' };
    }
    
    if (att.checkInTime && !att.checkOutTime) {
      return { label: 'Active', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };
    }
    
    if (att.checkInTime && att.checkOutTime) {
      return { label: 'Completed', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' };
    }
    
    return { label: 'Not Checked In', color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' };
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[#f4f7f6] animate-in slide-in-from-bottom-8 duration-300">
      
      {/* Header */}
      <div className="bg-white px-4 py-4 md:px-8 border-b border-slate-200 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Attendance Ledger</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        
        {/* Branch Filter */}
        <div className="relative">
          <select 
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="appearance-none bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer text-sm"
          >
            <option value="All Branches">All Branches</option>
            {branches.filter(b => b.id !== 'main').map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-slate-500 tracking-wide">LOADING LEDGER...</p>
          </div>
        ) : staffData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <User size={48} className="mb-4 opacity-20" />
            <p className="font-bold text-lg">No staff found for this branch.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {staffData.map(staff => {
              const att = staff.attendance;
              const status = getStatusInfo(att);
              
              // Prefer check-in selfie, fallback to profile avatar, fallback to generic
              const photoUrl = att?.selfieUrl || staff.photoUrl || staff.profilePic || null;
              
              return (
                <div key={staff.docId} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                  
                  {/* Card Header: Profile & Status */}
                  <div className="p-4 flex items-start gap-4 border-b border-slate-50/50 bg-gradient-to-br from-white to-slate-50/50">
                    <div className="relative">
                      {photoUrl ? (
                        <img src={photoUrl} alt={staff.name} className="w-14 h-14 rounded-full object-cover shadow-sm border-2 border-white" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-white shadow-sm">
                          <User size={24} />
                        </div>
                      )}
                      <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${status.dot}`}></div>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="font-bold text-slate-800 truncate">{staff.name || 'Unnamed Staff'}</h3>
                      <p className="text-xs text-slate-500 font-medium truncate mb-2">{staff.designation || staff.role || 'Staff Member'}</p>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${status.color}`}>
                        {status.label}
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Timings & Location */}
                  <div className="p-4 flex flex-col gap-4">
                    
                    {/* Time Grid */}
                    <div className="flex items-center divide-x divide-slate-100">
                      <div className="flex-1 flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={12}/> Check-In</span>
                        <span className="font-bold text-slate-800 text-lg">{formatTime(att?.checkInTime)}</span>
                      </div>
                      <div className="flex-1 flex flex-col pl-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={12}/> Check-Out</span>
                        <span className="font-bold text-slate-800 text-lg">{formatTime(att?.checkOutTime)}</span>
                      </div>
                    </div>

                    {/* Location Detail */}
                    <div className="bg-slate-50 rounded-xl p-3 flex gap-3 items-start border border-slate-100/50">
                      <div className="mt-0.5 text-indigo-400">
                        <MapPin size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Check-In Location</span>
                        <p className="text-xs font-medium text-slate-600 truncate">
                          {att?.checkInLocation ? 
                            (att.checkInLocation.address || `${att.checkInLocation.latitude?.toFixed(4)}, ${att.checkInLocation.longitude?.toFixed(4)}`) 
                            : 'No location captured'}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
