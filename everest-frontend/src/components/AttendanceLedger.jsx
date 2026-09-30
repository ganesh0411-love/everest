import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, MapPin, Clock, User, ChevronDown, Calendar } from 'lucide-react';
import { App } from '@capacitor/app';
import StaffMonthlyAttendance from './StaffMonthlyAttendance';

const LedgerCard = ({ staff, att, statusInfo, onImageClick, selectedDateStr, onCalendarClick }) => {
  const [elapsed, setElapsed] = useState('--h --m --s');
  
  const formattedDate = new Date((selectedDateStr || new Date().toLocaleDateString('en-CA')) + 'T12:00:00')
     .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  useEffect(() => {
    if (att?.duration !== undefined && att?.duration !== null) {
      if (typeof att.duration === 'string') {
         setElapsed(att.duration);
         return;
      }
      if (typeof att.duration === 'number') {
         const h = Math.floor(att.duration);
         const m = Math.floor((att.duration - h) * 60);
         setElapsed(`${h}h ${m}m`);
         return;
      }
    }

    if (statusInfo.label === 'Active' && att?.checkInTime) {
      const interval = setInterval(() => {
        let inTime = new Date(att.checkInTime).getTime();
        if (isNaN(inTime)) {
            const match = String(att.checkInTime).match(/(\d+):(\d+)/);
            if (match) {
                const now = new Date();
                inTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(match[1]), parseInt(match[2])).getTime();
            }
        }
        
        if (!isNaN(inTime)) {
            const diff = Date.now() - inTime;
            if (diff >= 0) {
               const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
               const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
               const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
               setElapsed(`${h}h ${m}m ${s}s`);
            }
        }
      }, 1000);
      return () => clearInterval(interval);
    } else if (att?.checkInTime && att?.checkOutTime) {
       let inTime = new Date(att.checkInTime).getTime();
       let outTime = new Date(att.checkOutTime).getTime();
       
       if (isNaN(inTime)) {
           const match = String(att.checkInTime).match(/(\d+):(\d+)/);
           if (match) {
               const now = new Date();
               inTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(match[1]), parseInt(match[2])).getTime();
           }
       }
       if (isNaN(outTime)) {
           const match = String(att.checkOutTime).match(/(\d+):(\d+)/);
           if (match) {
               const now = new Date();
               outTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(match[1]), parseInt(match[2])).getTime();
           }
       }
       
       if (!isNaN(inTime) && !isNaN(outTime)) {
           const diff = outTime - inTime;
           if (diff >= 0) {
               const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
               const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
               const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
               setElapsed(`${h}h ${m}m ${s}s`);
           } else {
               setElapsed('--h --m --s');
           }
       } else {
           setElapsed('--h --m --s');
       }
    } else {
       setElapsed('--h --m --s');
    }
  }, [att, statusInfo.label]);

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    if (typeof timeString === 'string' && !timeString.includes('T') && (timeString.includes(':') || timeString.includes('AM') || timeString.includes('PM'))) {
        return timeString;
    }
    const d = new Date(timeString);
    if (isNaN(d.getTime())) return String(timeString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getLocString = (locObj) => {
    if (!locObj) return 'No location captured';
    if (typeof locObj === 'string') return locObj;
    if (locObj.address) return locObj.address;
    if (locObj.latitude && locObj.longitude) return `${locObj.latitude.toFixed(4)}, ${locObj.longitude.toFixed(4)}`;
    return 'No location captured';
  };

  // Helper to find first valid non-empty URL
  const getValidUrl = (...urls) => {
    for (const u of urls) {
      if (!u) continue;
      if (typeof u === 'string' && u.trim() !== '') return u;
      if (typeof u === 'object' && u.url && typeof u.url === 'string' && u.url.trim() !== '') return u.url;
    }
    return null;
  };

  // Using specific fields for selfies or fallback
  const avatarUrl = getValidUrl(staff.photoBase64, staff.photoURL, staff.photoUrl, staff.avatarUrl, staff.avatar, staff.profileImage, staff.profilePic, staff.photo, staff.dp, staff.image, staff.profilePicture, staff.profile_url);
  
  // NOTE: If checkIn selfie doesn't exist, we do NOT fallback to the profile avatar here, 
  // because the user says "Display the actual selfie photo... The check-in photo placeholder currently renders an empty user outline icon".
  const ciPhoto = getValidUrl(
    att?.checkInPhoto, att?.checkInPhotoUrl, att?.selfieUrl, att?.checkInSelfie, att?.selfie, att?.checkInImage, att?.photoUrl, att?.photo, att?.image, att?.picture, att?.checkin_selfie, att?.selfie_url
  );
  
  const coPhoto = getValidUrl(
    att?.checkOutPhoto, att?.checkOutPhotoUrl, att?.checkOutSelfieUrl, att?.checkOutSelfie, att?.checkOutImage
  );

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const renderLocation = (locObj, isCheckIn) => {
    const locStr = getLocString(locObj);
    const isEmpty = locStr === 'No location captured';
    
    let mapUrl = '';
    if (locObj && locObj.latitude && locObj.longitude) {
       mapUrl = `https://www.google.com/maps?q=${locObj.latitude},${locObj.longitude}`;
    } else if (typeof locObj === 'string' && locObj.includes(',')) {
       mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(locStr)}`;
    }

    return (
      <div className={`bg-slate-50 rounded-xl p-3 flex items-center gap-2 border border-slate-100 mt-1 h-full`}>
        <MapPin size={14} className={`${isCheckIn ? 'text-indigo-400' : 'text-rose-400'} shrink-0`} />
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5 whitespace-nowrap truncate">{isCheckIn ? 'Check-In' : 'Check-Out'} Location</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate" title={locStr}>
              {locStr}
            </p>
            {!isEmpty && mapUrl && (
              <a href={mapUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0 flex items-center" title="Open in Google Maps" onClick={e => e.stopPropagation()}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      
      {/* Header Profile Section */}
      <div className="p-4 flex items-start justify-between gap-2 border-b border-slate-100 bg-white">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={staff.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-black border border-indigo-100 text-lg">
                {getInitials(staff.name)}
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
        
        <div className="flex flex-col items-end shrink-0 pl-3 border-l border-slate-100">
           <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap tracking-wide">{formattedDate}</span>
           <button 
             onClick={() => onCalendarClick && onCalendarClick(staff)}
             className="mt-1.5 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors border border-slate-200 shadow-sm active:scale-95"
           >
             <Calendar size={14} />
           </button>
        </div>
      </div>

      {/* Symmetrical Data Body */}
      <div className="p-4 relative mt-2">
        <div className="grid grid-cols-2 gap-x-4 relative divide-x divide-slate-100">
          
          {/* Centered Shift Timer overlay (Positioned just beneath top separator to avoid overlap) */}
          <div className="absolute left-1/2 top-[-26px] -translate-x-1/2 z-10 flex justify-center">
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-1 rounded-full flex items-center gap-2 shadow-sm whitespace-nowrap">
               {statusInfo.label === 'Active' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
               )}
               <span className="text-[10px] font-bold text-slate-700 tracking-wider font-mono">{elapsed}</span>
            </div>
          </div>
          
          {/* LEFT: Check-In Column */}
          <div className="flex flex-col gap-3 pt-2">
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
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5 whitespace-nowrap tracking-tight">
                  <Clock size={10}/> Check-In
                </span>
                <span className="font-bold text-slate-800 text-sm whitespace-nowrap leading-tight">{formatTime(att?.checkInTime)}</span>
              </div>
            </div>
            
            {renderLocation(att?.checkInLocation, true)}
          </div>

          {/* RIGHT: Check-Out Column */}
          <div className="flex flex-col gap-3 pt-2 pl-4">
            <div className="flex items-center gap-3 justify-start text-left">
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5 whitespace-nowrap tracking-tight">
                  <Clock size={10}/> Check-Out
                </span>
                <span className="font-bold text-slate-800 text-sm whitespace-nowrap leading-tight">{formatTime(att?.checkOutTime)}</span>
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
            
            {renderLocation(att?.checkOutLocation, false)}
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
  const [selectedStaffForModal, setSelectedStaffForModal] = useState(null);

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  useEffect(() => {
    let listener = null;
    const setupListener = async () => {
      try {
        listener = await App.addListener('backButton', () => {
          if (modalImage) {
            setModalImage(null);
          } else if (selectedStaffForModal) {
            setSelectedStaffForModal(null);
          } else {
            window.history.back();
          }
        });
      } catch (err) {
        console.log('App back button listener error:', err);
      }
    };
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      setupListener();
    }
    return () => {
      if (listener && listener.remove) listener.remove();
    };
  }, [modalImage, selectedStaffForModal]);

  const dates = [];
  const now = new Date();
  for (let i = 0; i <= 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA'));
  }
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
          const staffList = staffSnap.docs.map(d => {
            const data = d.data();
            // Parse attendance map for today
            let todayAtt = null;
            const isToday = selectedDateStr === todayStr;

            if (data.attendance && data.attendance[selectedDateStr]) {
              const rawAtt = data.attendance[selectedDateStr];
              todayAtt = {
                ...rawAtt,
                checkInTime: rawAtt.checkInTime || rawAtt.checkIn || (isToday && data.lastCheckInTime?.startsWith(selectedDateStr) ? data.lastCheckInTime : null),
                checkOutTime: rawAtt.checkOutTime || rawAtt.checkOut || (isToday && data.lastCheckOutTime?.startsWith(selectedDateStr) ? data.lastCheckOutTime : null),
                checkInLocation: rawAtt.checkInLocation || rawAtt.location || (isToday && data.lastLatitude ? { latitude: data.lastLatitude, longitude: data.lastLongitude } : null),
                checkOutLocation: rawAtt.checkOutLocation || ((rawAtt.checkOut || (isToday && data.lastCheckOutTime?.startsWith(selectedDateStr))) ? (isToday && data.lastLatitude ? { latitude: data.lastLatitude, longitude: data.lastLongitude } : null) : null),
                selfieUrl: rawAtt.selfieUrl || (isToday ? data.lastSelfieUrl : null),
                checkOutSelfieUrl: rawAtt.checkOutSelfieUrl || (isToday ? data.lastCheckOutSelfieUrl : null),
                status: rawAtt.status || (rawAtt.checkIn && !rawAtt.checkOut ? 'active' : (rawAtt.checkOut ? 'COMPLETED' : 'Not Checked In')),
                duration: rawAtt.duration
              };
              if (todayAtt.checkInTime && !todayAtt.checkOutTime) {
                todayAtt.status = 'active';
              }
            } else if (isToday && data.lastCheckInTime && data.lastCheckInTime.startsWith(selectedDateStr)) {
              // Fallback if mobile app updates root fields first (only valid for TODAY)
              todayAtt = {
                checkInTime: data.lastCheckInTime,
                checkOutTime: data.lastCheckOutTime,
                checkInLocation: (data.lastLatitude && data.lastLongitude) ? { latitude: data.lastLatitude, longitude: data.lastLongitude } : null,
                selfieUrl: data.lastSelfieUrl, // Fallback strictly to last selfie, DO NOT use profilePic
                status: data.lastAttendanceStatus || 'active'
              };
            }
            return {
              docId: d.id,
              ...data,
              todayAttendance: todayAtt
            };
          });
          
          setStaffData(staffList);
          setLoading(false);
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
  }, [selectedBranch, selectedDateStr, todayStr]);

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
      <div className="bg-white px-4 py-3 md:px-8 border-b border-slate-200 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 overflow-hidden">
          <button 
            onClick={onClose}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight whitespace-nowrap truncate">Attendance Ledger</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium whitespace-nowrap truncate">{new Date(selectedDateStr + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
        
        {/* Branch Filter */}
        <div className="relative shrink-0 ml-3">
          <select 
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="appearance-none bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer text-xs md:text-sm"
          >
            <option value="All Branches">All Branches</option>
            {branches.filter(b => b.id !== 'main').map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" size={14} />
        </div>
      </div>

      {/* Horizontal Date Picker Strip */}
      <div className="bg-slate-50/80 border-b border-slate-200 py-3 px-4 md:px-8 overflow-x-auto flex gap-2.5 snap-x sticky top-[65px] z-10" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style dangerouslySetInnerHTML={{__html: `
          .date-strip::-webkit-scrollbar { display: none; }
        `}} />
        <div className="flex gap-2.5 date-strip w-max pb-0.5">
          {dates.map((dStr) => {
            const dObj = new Date(dStr + 'T12:00:00');
            const dayOfWeek = dObj.toLocaleDateString(undefined, { weekday: 'short' });
            const dayOfMonth = dObj.getDate();
            const isSelected = dStr === selectedDateStr;
            
            return (
              <div 
                key={dStr}
                onClick={() => setSelectedDateStr(dStr)}
                className={`snap-center shrink-0 flex flex-col items-center justify-center w-[52px] h-[60px] md:w-[60px] md:h-[68px] rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.02]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
              >
                <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wide ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>{dayOfWeek}</span>
                <span className="text-[17px] md:text-[20px] font-black leading-none mt-0.5">{dayOfMonth}</span>
              </div>
            );
          })}
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
              const statusInfo = getStatusInfo(staff.todayAttendance);
              return (
                <LedgerCard 
                  key={staff.docId} 
                  staff={staff} 
                  att={staff.todayAttendance} 
                  statusInfo={statusInfo}
                  onImageClick={(url) => setModalImage(url)}
                  selectedDateStr={selectedDateStr}
                  onCalendarClick={setSelectedStaffForModal}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
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

      {selectedStaffForModal && (
        <StaffMonthlyAttendance 
          staff={selectedStaffForModal} 
          onClose={() => setSelectedStaffForModal(null)} 
          onImageClick={(url) => setModalImage(url)} 
        />
      )}
    </div>
  );
}
