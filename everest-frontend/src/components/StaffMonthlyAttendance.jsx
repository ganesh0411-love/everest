import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, User, MapPin, Clock, Calendar } from 'lucide-react';

export default function StaffMonthlyAttendance({ staff, onClose, onImageClick }) {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);
  
  // Start with current month
  const [currentMonth, setCurrentMonth] = useState(new Date(todayStr + 'T12:00:00'));

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getValidUrl = (url) => (url && typeof url === 'string' && url.trim() !== '') ? url : null;

  // Compute days for the grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0: Sunday, 1: Monday, etc.
  const daysInMonth = lastDayOfMonth.getDate();

  const days = [];
  
  // Pad the beginning with blanks
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Fill the days
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = new Date(year, month, i, 12, 0, 0).toLocaleDateString('en-CA');
    days.push(dStr);
  }

  // Next/Prev Month logic
  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 15));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 15));

  const monthName = currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const avatarUrl = getValidUrl(staff?.photoBase64, staff?.photoURL, staff?.photoUrl, staff?.avatarUrl, staff?.avatar, staff?.profileImage, staff?.profilePic, staff?.photo, staff?.dp, staff?.image, staff?.profilePicture, staff?.profile_url);

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    let d = new Date(timeString);
    if (isNaN(d.getTime())) {
        const match = String(timeString).match(/(\d+):(\d+)/);
        if (match) {
            const now = new Date();
            let hour = parseInt(match[1], 10);
            const minute = parseInt(match[2], 10);
            const isPM = String(timeString).toUpperCase().includes('PM');
            const isAM = String(timeString).toUpperCase().includes('AM');
            
            if (isPM && hour < 12) hour += 12;
            if (isAM && hour === 12) hour = 0;
            
            d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
        } else {
            return String(timeString);
        }
    }
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  };

  // Compute stats for the month
  let presentCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;

  // We consider up to today or the end of the month if it's past
  const now = new Date();
  const todayVal = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const getElapsedMins = (att, dateStr) => {
    if (!att) return 0;
    const checkIn = att.checkInTime || att.checkIn;
    const checkOut = att.checkOutTime || att.checkOut;
    if (checkIn && checkOut) {
      const parseTS = (ts) => {
        let d = new Date(ts);
        if (!isNaN(d.getTime())) return d.getTime();
        const m = String(ts).match(/(\d+):(\d+)/);
        if (m) {
           let h = parseInt(m[1], 10);
           const min = parseInt(m[2], 10);
           const isPM = String(ts).toUpperCase().includes('PM');
           const isAM = String(ts).toUpperCase().includes('AM');
           if (isPM && h < 12) h += 12;
           if (isAM && h === 12) h = 0;
           const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
           return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, min).getTime();
        }
        return 0;
      };
      const inTime = parseTS(checkIn);
      const outTime = parseTS(checkOut);
      if (inTime > 0 && outTime > 0 && outTime >= inTime) {
         return Math.floor((outTime - inTime) / 60000);
      }
    }
    if (att.duration !== undefined && att.duration !== null) {
      if (typeof att.duration === 'number') {
         return Math.round(att.duration * 60);
      }
      if (typeof att.duration === 'string') {
         const hm = att.duration.match(/(\d+)h/i);
         const mm = att.duration.match(/(\d+)m/i);
         let h = hm ? parseInt(hm[1], 10) : 0;
         let m = mm ? parseInt(mm[1], 10) : 0;
         if (h > 0 || m > 0) return (h * 60) + m;
      }
    }
    return 0;
  };

  const getDayStatus = (dStr) => {
    const isToday = dStr === todayStr;
    const isPastDate = dStr < todayStr;
    const fallbackAtt = (isToday && staff?.lastCheckInTime?.startsWith(dStr)) ? {
        checkInTime: staff.lastCheckInTime,
        checkOutTime: staff.lastCheckOutTime,
        status: staff.lastAttendanceStatus,
        duration: null
    } : null;
    
    let att = (staff?.attendance && staff.attendance[dStr]) ? staff.attendance[dStr] : fallbackAtt;
    
    if (!att) {
      const dObj = new Date(dStr + 'T12:00:00').getTime();
      if (dObj <= todayVal) return 'absent';
      return 'future';
    }
    
    let ci = att.checkIn || att.checkInTime;
    let co = att.checkOut || att.checkOutTime;

    if (ci && !co && isPastDate) {
      co = `${dStr}T23:59:59`;
    }

    const hasCheckIn = !!ci;
    const hasCheckOut = !!co;
    
    if (att.status === 'Half Day') return 'half';
    
    if (hasCheckIn && hasCheckOut) {
       const totalMins = getElapsedMins({ ...att, checkInTime: ci, checkOutTime: co }, dStr);
       if (totalMins > 0 && totalMins < 420) {
           return 'half';
       }
       return 'present';
    }
    
    if (hasCheckIn && !hasCheckOut) {
       return 'active';
    }
    
    const dObj = new Date(dStr + 'T12:00:00').getTime();
    if (dObj <= todayVal) return 'absent';
    return 'future';
  };

  // Build the selected day's detailed data exactly like the ledger strictly guarding against cross-date leaks
  let selectedAtt = null;
  const isToday = selectedDateStr === todayStr;
  const isPastDate = selectedDateStr < todayStr;

  if (staff?.attendance && staff.attendance[selectedDateStr]) {
    const rawAtt = staff.attendance[selectedDateStr];

    const extractLoc = (prefix) => {
       let l = rawAtt[`${prefix}Location`] || rawAtt[`${prefix}Coords`] || rawAtt.location;
       if (l) return l;
       let pObj = rawAtt[prefix];
       if (pObj && typeof pObj === 'object') {
          if (pObj.location) return pObj.location;
          if (pObj.coords) return pObj.coords;
          if (pObj.coordinates) return pObj.coordinates;
          if (pObj.latitude !== undefined || pObj._latitude !== undefined) return pObj;
       }
       if (rawAtt[`${prefix}Latitude`] !== undefined) {
          return { latitude: rawAtt[`${prefix}Latitude`], longitude: rawAtt[`${prefix}Longitude`] };
       }
       if (rawAtt.latitude !== undefined) {
          return { latitude: rawAtt.latitude, longitude: rawAtt.longitude };
       }
       return null;
    };

    let ciTime = rawAtt.checkInTime || rawAtt.checkIn || (isToday && staff.lastCheckInTime?.startsWith(selectedDateStr) ? staff.lastCheckInTime : null);
    let coTime = rawAtt.checkOutTime || rawAtt.checkOut || (isToday && staff.lastCheckOutTime?.startsWith(selectedDateStr) ? staff.lastCheckOutTime : null);
    let isAutoCheckedOut = false;

    if (ciTime && !coTime && isPastDate) {
       isAutoCheckedOut = true;
       coTime = `${selectedDateStr}T23:59:59`;
    }

    let ciLoc = extractLoc('checkIn') || (isToday && staff.lastLatitude ? { latitude: staff.lastLatitude, longitude: staff.lastLongitude } : null);
    let coLoc = isAutoCheckedOut ? null : (extractLoc('checkOut') || ((coTime || (isToday && staff.lastCheckOutTime?.startsWith(selectedDateStr))) ? (isToday && staff.lastLatitude ? { latitude: staff.lastLatitude, longitude: staff.lastLongitude } : null) : null));

    selectedAtt = {
      ...rawAtt,
      checkInTime: ciTime,
      checkOutTime: coTime,
      selfieUrl: getValidUrl(rawAtt.selfieUrl) || (isToday ? getValidUrl(staff.lastSelfieUrl) : null),
      checkOutSelfieUrl: isAutoCheckedOut ? null : getValidUrl(rawAtt.checkOutSelfieUrl),
      duration: rawAtt.duration,
      status: rawAtt.status || (coTime ? 'COMPLETED' : (ciTime ? 'active' : 'Not Checked In')),
      checkInLocation: ciLoc,
      checkOutLocation: coLoc,
      isAutoCheckedOut
    };
  } else if (isToday && staff?.lastCheckInTime && staff.lastCheckInTime.startsWith(selectedDateStr)) {
    // Fallback strictly for TODAY if app updated root fields first
    selectedAtt = {
      checkInTime: staff.lastCheckInTime,
      checkOutTime: staff.lastCheckOutTime,
      selfieUrl: getValidUrl(staff.lastSelfieUrl),
      status: staff.lastAttendanceStatus || 'active',
      checkInLocation: (staff.lastLatitude && staff.lastLongitude) ? { latitude: staff.lastLatitude, longitude: staff.lastLongitude } : null,
    };
  }

  // Format Duration display
  let durationDisplay = '--h --m --s';
  if (selectedAtt?.duration !== undefined && selectedAtt?.duration !== null) {
    const h = Math.floor(selectedAtt.duration);
    const m = Math.round((selectedAtt.duration - h) * 60);
    durationDisplay = `${h}h ${m}m`;
  }

  const formattedDate = new Date((selectedDateStr) + 'T12:00:00')
     .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatLocation = (loc) => {
    if (!loc) return null;
    if (typeof loc === 'string' && loc.trim() !== '' && loc !== 'No location captured' && loc !== 'No location') {
      if (loc.match(/^\d{1,2}:\d{2}\s*(AM|PM)?$/i)) return null;
      return loc;
    }
    if (typeof loc === 'object') {
      if (loc.address) return loc.address;
      const lat = loc.latitude ?? loc.lat ?? loc._latitude;
      const lng = loc.longitude ?? loc.lng ?? loc._longitude;
      if (lat !== undefined && lng !== undefined) {
        return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
      }
    }
    return null;
  };

  // Render location helper
  const renderLocation = (loc) => {
    const locStr = formatLocation(loc);
    if (!locStr) {
      return (
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 opacity-80">Location</span>
          <span className="text-[11px] text-slate-500 font-medium truncate overflow-hidden whitespace-nowrap opacity-70">No location</span>
        </div>
      );
    }
    
    let mapsUrl = '';
    if (typeof loc === 'object' && (loc.latitude ?? loc.lat) !== undefined && (loc.longitude ?? loc.lng) !== undefined) {
      mapsUrl = `https://www.google.com/maps?q=${loc.latitude ?? loc.lat},${loc.longitude ?? loc.lng}`;
    } else {
      mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(locStr)}`;
    }
    
    return (
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Location</span>
        <a 
          href={mapsUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs text-indigo-600 font-semibold truncate hover:text-indigo-800 transition-colors flex items-center group cursor-pointer"
          title="Open in Google Maps"
        >
          {locStr}
          <svg className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    );
  };

  // Pre-calculate counts for the displayed month
  days.forEach(dStr => {
    if (dStr) {
      const stat = getDayStatus(dStr);
      if (stat === 'present') presentCount++;
      else if (stat === 'absent') absentCount++;
      else if (stat === 'half') halfDayCount++;
    }
  });

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#eff3f9] animate-in slide-in-from-bottom-8 duration-300">
      {/* Header */}
      <div className="bg-white px-4 py-3 md:px-8 border-b border-slate-200 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 overflow-hidden">
          <button 
            onClick={onClose}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
               <Calendar size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tight whitespace-nowrap truncate">Attendance</h1>
              {selectedAtt && selectedAtt.duration ? (
                  <p className="text-xs text-blue-600 font-bold whitespace-nowrap truncate">Shift Time: {durationDisplay}</p>
              ) : (
                  <p className="text-xs text-slate-500 font-medium whitespace-nowrap truncate">{staff?.name}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-8">
        <div className="max-w-md mx-auto space-y-4">
          
          {/* Calendar Widget */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
            {/* Month Nav */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={handlePrevMonth} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-black text-slate-800">{monthName}</h2>
              <button onClick={handleNextMonth} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                <div key={day} className="text-[10px] font-bold text-slate-400 text-center uppercase">{day}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-3 gap-x-1 mb-6">
              {days.map((dStr, idx) => {
                if (!dStr) {
                  return <div key={`empty-${idx}`} className="h-10"></div>;
                }
                
                const dayNum = parseInt(dStr.split('-')[2], 10);
                const isSelected = dStr === selectedDateStr;
                const status = getDayStatus(dStr);
                
                let bgColor = 'bg-slate-50';
                let textColor = 'text-slate-400';
                let shadow = '';
                
                if (status === 'present') {
                  bgColor = 'bg-emerald-500'; textColor = 'text-white'; shadow = 'shadow-md shadow-emerald-500/30';
                } else if (status === 'absent') {
                  bgColor = 'bg-rose-500'; textColor = 'text-white'; shadow = 'shadow-md shadow-rose-500/30';
                } else if (status === 'half') {
                  bgColor = 'bg-amber-400'; textColor = 'text-white'; shadow = 'shadow-md shadow-amber-400/30';
                } else if (status === 'active') {
                  bgColor = 'bg-blue-600'; textColor = 'text-white'; shadow = 'shadow-md shadow-blue-600/30';
                }

                if (status === 'future') {
                  bgColor = 'bg-transparent'; textColor = 'text-slate-300'; shadow = '';
                }

                return (
                  <div key={dStr} className="flex items-center justify-center relative w-9 h-9 mx-auto">
                    {isSelected && status !== 'active' && (
                      <div className="absolute inset-0 rounded-full border-2 border-blue-500 scale-125 z-0 transition-transform"></div>
                    )}
                    {status === 'active' && (
                      <div className="absolute -inset-1 rounded-full border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-soft-pulse z-0 pointer-events-none bg-blue-50"></div>
                    )}
                    <button 
                      onClick={() => setSelectedDateStr(dStr)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold z-10 transition-all ${bgColor} ${textColor} ${shadow} ${isSelected && status === 'future' ? 'bg-blue-600 text-white' : ''}`}
                    >
                      {dayNum}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Legends */}
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-bold text-emerald-700">Present: {presentCount}</span>
               </div>
               <div className="flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                  <span className="text-[10px] font-bold text-rose-700">Absent: {absentCount}</span>
               </div>
               <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <span className="text-[10px] font-bold text-amber-700">Half Day: {halfDayCount}</span>
               </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative pb-4 mt-6">
             {/* Header */}
             <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={staff.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-black border border-indigo-100 text-lg">
                        {getInitials(staff.name)}
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${selectedAtt ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-base truncate">{staff.name}</h3>
                    <p className="text-xs text-slate-500 font-medium truncate">{staff.designation || staff.role || 'Staff Member'}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center shrink-0 ml-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl border border-blue-100">
                   <span className="text-[9px] font-black uppercase tracking-wider mb-0.5">Duration</span>
                   <span className="text-sm font-black">{selectedAtt?.duration ? durationDisplay : '--'}</span>
                </div>
             </div>

             {/* Times & Photos Grid */}
             <div className="grid grid-cols-2 gap-x-4 relative divide-x divide-slate-100 mt-4 px-4">
                {/* Check In */}
                <div className="pr-4 pb-2">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-[46px] h-[46px] shrink-0 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden relative cursor-pointer group"
                      onClick={() => selectedAtt?.selfieUrl && onImageClick(selectedAtt.selfieUrl)}
                    >
                      {selectedAtt?.selfieUrl ? (
                        <>
                          <img src={selectedAtt.selfieUrl} alt="Check-in" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                             <div className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                             </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                          <User size={20} strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 pt-0.5">
                      <div className="flex items-center gap-1 mb-0.5 text-slate-400">
                        <Clock size={10} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">Check-in</span>
                      </div>
                      <span className="text-base font-black text-slate-800 tracking-tight leading-none mb-1 whitespace-nowrap">
                        {formatTime(selectedAtt?.checkInTime)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-start gap-2">
                    <MapPin size={12} className="text-indigo-400 mt-0.5 shrink-0" strokeWidth={2.5} />
                    {renderLocation(selectedAtt?.checkInLocation)}
                  </div>
                </div>

                {/* Check Out */}
                <div className="pl-4 pb-2">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col min-w-0 pt-0.5">
                      <div className="flex items-center gap-1 mb-0.5 text-slate-400">
                        <Clock size={10} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">Check-out</span>
                      </div>
                      <span className="text-base font-black text-slate-800 tracking-tight leading-none mb-1 whitespace-nowrap">
                        {formatTime(selectedAtt?.checkOutTime)}
                      </span>
                    </div>
                    <div 
                      className="w-[46px] h-[46px] shrink-0 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden ml-auto relative cursor-pointer group border-dashed"
                      onClick={() => selectedAtt?.checkOutSelfieUrl && onImageClick(selectedAtt.checkOutSelfieUrl)}
                    >
                      {selectedAtt?.checkOutSelfieUrl ? (
                        <>
                          <img src={selectedAtt.checkOutSelfieUrl} alt="Check-out" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                             <div className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                             </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                          <User size={20} strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-start gap-2">
                    <MapPin size={12} className="text-rose-400 mt-0.5 shrink-0" strokeWidth={2.5} />
                    {renderLocation(selectedAtt?.checkOutLocation)}
                  </div>
                </div>
             </div>
             
           </div>
        </div>
      </div>
    </div>
  );
}
