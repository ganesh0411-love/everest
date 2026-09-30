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
    if (typeof timeString === 'string' && !timeString.includes('T') && (timeString.includes(':') || timeString.includes('AM') || timeString.includes('PM'))) {
        return timeString;
    }
    const d = new Date(timeString);
    if (isNaN(d.getTime())) return String(timeString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Compute stats for the month
  let presentCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;

  // We consider up to today or the end of the month if it's past
  const now = new Date();
  const todayVal = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const getDayStatus = (dStr) => {
    if (!staff?.attendance || !staff.attendance[dStr]) {
      const dObj = new Date(dStr + 'T12:00:00').getTime();
      if (dObj <= todayVal) return 'absent';
      return 'future';
    }
    const att = staff.attendance[dStr];
    if (att.status === 'Half Day') return 'half';
    if (att.checkIn || att.checkInTime) return 'present';
    return 'absent';
  };

  // Build the selected day's detailed data exactly like the ledger strictly guarding against cross-date leaks
  let selectedAtt = null;
  const isToday = selectedDateStr === todayStr;

  if (staff?.attendance && staff.attendance[selectedDateStr]) {
    const rawAtt = staff.attendance[selectedDateStr];
    selectedAtt = {
      ...rawAtt,
      checkInTime: rawAtt.checkInTime || rawAtt.checkIn || (isToday && staff.lastCheckInTime?.startsWith(selectedDateStr) ? staff.lastCheckInTime : null),
      checkOutTime: rawAtt.checkOutTime || rawAtt.checkOut || (isToday && staff.lastCheckOutTime?.startsWith(selectedDateStr) ? staff.lastCheckOutTime : null),
      selfieUrl: getValidUrl(rawAtt.selfieUrl) || (isToday ? getValidUrl(staff.lastSelfieUrl) : null),
      checkOutSelfieUrl: getValidUrl(rawAtt.checkOutSelfieUrl) || (isToday ? getValidUrl(staff.lastCheckOutSelfieUrl) : null),
      duration: rawAtt.duration,
      status: rawAtt.status || (rawAtt.checkIn && !rawAtt.checkOut ? 'active' : (rawAtt.checkOut ? 'COMPLETED' : 'Not Checked In')),
      checkInLocation: rawAtt.checkInLocation || rawAtt.location || (isToday && staff.lastLatitude ? { latitude: staff.lastLatitude, longitude: staff.lastLongitude } : null),
      checkOutLocation: rawAtt.checkOutLocation || ((rawAtt.checkOut || (isToday && staff.lastCheckOutTime?.startsWith(selectedDateStr))) ? (isToday && staff.lastLatitude ? { latitude: staff.lastLatitude, longitude: staff.lastLongitude } : null) : null),
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

  // Render location helper
  const renderLocation = (loc) => {
    if (!loc || !loc.latitude || !loc.longitude) {
      return (
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 opacity-80">Location</span>
          <span className="text-xs text-slate-500 font-medium truncate opacity-70">No location captured</span>
        </div>
      );
    }
    
    const coordStr = `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
    const mapsUrl = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
    
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
          {coordStr}
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
                }

                if (status === 'future') {
                  bgColor = 'bg-transparent'; textColor = 'text-slate-300'; shadow = '';
                }

                return (
                  <div key={dStr} className="flex items-center justify-center relative">
                    {isSelected && (
                      <div className="absolute inset-0 rounded-full border-2 border-blue-500 scale-125 z-0 transition-transform"></div>
                    )}
                    <button 
                      onClick={() => setSelectedDateStr(dStr)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold z-10 transition-all ${bgColor} ${textColor} ${shadow} ${isSelected && status === 'future' ? 'bg-blue-600 text-white' : ''}`}
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
                        <span className="text-[9px] font-black uppercase tracking-wider">Check-in</span>
                      </div>
                      <span className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">
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
                        <span className="text-[9px] font-black uppercase tracking-wider">Check-out</span>
                      </div>
                      <span className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">
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
             
             {/* Bottom timestamp */}
             <div className="text-center mt-3 pt-3 border-t border-slate-100 mx-4">
                <span className="text-[11px] font-medium text-slate-400">Checked in at {formatTime(selectedAtt?.checkInTime)}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
