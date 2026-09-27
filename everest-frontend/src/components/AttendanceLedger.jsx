import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, MapPin, Clock, User, ChevronDown } from 'lucide-react';

const LedgerCard = ({ staff, att, statusInfo, onImageClick }) => {
  const [elapsed, setElapsed] = useState('--h --m --s');

  useEffect(() => {
    if (statusInfo.label === 'Active' && att?.checkInTime) {
      const interval = setInterval(() => {
        const diff = Date.now() - new Date(att.checkInTime).getTime();
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setElapsed(`${h}h ${m}m ${s}s`);
      }, 1000);
      return () => clearInterval(interval);
    } else if (att?.checkInTime && att?.checkOutTime) {
       const diff = new Date(att.checkOutTime).getTime() - new Date(att.checkInTime).getTime();
       const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
       const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
       const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
       setElapsed(`${h}h ${m}m ${s}s`);
    } else {
       setElapsed('--h --m --s');
    }
  }, [att, statusInfo.label]);

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getLocString = (locObj) => {
    if (!locObj) return 'No location captured';
    if (typeof locObj === 'string') return locObj;
    if (locObj.address) return locObj.address;
    if (locObj.latitude && locObj.longitude) return `${locObj.latitude.toFixed(4)}, ${locObj.longitude.toFixed(4)}`;
    return 'No location captured';
  };

  // Using specific fields for selfies or fallback
  const ciPhoto = att?.selfieUrl || att?.checkInSelfie || staff.photoUrl || staff.profilePic;
  const coPhoto = att?.checkOutSelfieUrl || att?.checkOutSelfie;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      
      {/* Header Profile Section */}
      <div className="p-4 flex items-start gap-4 border-b border-slate-100 bg-slate-50/30">
        <div className="relative shrink-0">
          {staff.profilePic || staff.photoUrl ? (
            <img src={staff.profilePic || staff.photoUrl} alt={staff.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
              <User size={20} />
            </div>
          )}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${statusInfo.dot}`}></div>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="font-bold text-slate-800 text-base truncate">{staff.name || 'Unnamed Staff'}</h3>
          <p className="text-xs text-slate-500 font-medium truncate mb-1.5">{staff.designation || staff.role || 'Staff Member'}</p>
          <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${statusInfo.color}`}>
            {statusInfo.label}
          </div>
        </div>
      </div>

      {/* Symmetrical Data Body */}
      <div className="p-4 relative">
        <div className="grid grid-cols-2 gap-x-4 relative divide-x divide-slate-100">
          
          {/* Centered Shift Timer overlay */}
          <div className="absolute left-1/2 top-4 -translate-x-1/2 z-10 flex justify-center">
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1 rounded-full flex items-center gap-2 shadow-sm">
               {statusInfo.label === 'Active' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
               )}
               <span className="text-[10px] font-bold text-slate-700 tracking-wider font-mono">{elapsed}</span>
            </div>
          </div>
          
          {/* LEFT: Check-In Column */}
          <div className="flex flex-col gap-3 pt-6">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0"
                onClick={() => ciPhoto && onImageClick(ciPhoto)}
              >
                {ciPhoto ? (
                  <img src={ciPhoto} alt="Check-in Selfie" className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <User size={18} />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5">
                  <Clock size={10}/> Check-In
                </span>
                <span className="font-bold text-slate-800 text-lg leading-tight">{formatTime(att?.checkInTime)}</span>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2 border border-slate-100 mt-1 h-full">
              <MapPin size={14} className="text-indigo-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Check-In Location</span>
                <p className="text-xs font-medium text-slate-600 line-clamp-3 leading-snug">
                  {getLocString(att?.checkInLocation)}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Check-Out Column */}
          <div className="flex flex-col gap-3 pt-6 pl-4">
            <div className="flex items-center gap-3 justify-end text-right">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-end gap-1 mb-0.5">
                  <Clock size={10}/> Check-Out
                </span>
                <span className="font-bold text-slate-800 text-lg leading-tight">{formatTime(att?.checkOutTime)}</span>
              </div>
              <div 
                className={`w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 ${coPhoto ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={() => coPhoto && onImageClick(coPhoto)}
              >
                {coPhoto ? (
                  <img src={coPhoto} alt="Check-out Selfie" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
                    <User size={18} />
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2 border border-slate-100 mt-1 h-full">
              <MapPin size={14} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0 text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Check-Out Location</span>
                <p className="text-xs font-medium text-slate-600 line-clamp-3 leading-snug">
                  {getLocString(att?.checkOutLocation)}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};


export default function AttendanceLedger({ onClose, branches = [], activeBranch = { id: 'main', name: 'Main Branch' } }) {
  const [selectedBranch, setSelectedBranch] = useState(activeBranch.name);
  const [staffData, setStaffData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Image modal state
  const [modalImage, setModalImage] = useState(null);

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

  useEffect(() => {
    let unsubscribeStaff = null;
    let unsubscribesAttendance = [];

    const fetchLedger = async () => {
      setLoading(true);
      try {
        let staffQuery;
        if (selectedBranch === 'All Branches' || selectedBranch === 'Main Branch' || selectedBranch === 'All') {
          staffQuery = query(collection(db, 'staff')); 
        } else {
          staffQuery = query(collection(db, 'staff'), where('branch', '==', selectedBranch));
        }

        unsubscribeStaff = onSnapshot(staffQuery, (staffSnap) => {
          const staffList = staffSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
          
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

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[#eff3f9] animate-in slide-in-from-bottom-8 duration-300">
      
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
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
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
              const statusInfo = getStatusInfo(staff.attendance);
              return (
                <LedgerCard 
                  key={staff.docId} 
                  staff={staff} 
                  att={staff.attendance} 
                  statusInfo={statusInfo}
                  onImageClick={(url) => setModalImage(url)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setModalImage(null)}
        >
          <button 
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); setModalImage(null); }}
          >
            <X size={24} />
          </button>
          <img 
            src={modalImage} 
            alt="Enlarged view" 
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain border border-white/10"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}
