import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin } from 'lucide-react';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;  
  const dLon = (lon2 - lon1) * Math.PI / 180; 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return (R * c).toFixed(1); 
};

export default function LiveTrackingModal({ staffId, staffName, adminLocation, onClose, initialMode = 'current' }) {
  const [mapLayer, setMapLayer] = useState('street'); // 'street' | 'satellite'
  const [trackingData, setTrackingData] = useState(null);
  const [isLiveActive, setIsLiveActive] = useState(initialMode === 'live');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staffId) return;

    const trackingRef = doc(db, 'staff_tracking', staffId);

    // If starting in live mode, ensure liveSession is active
    if (initialMode === 'live') {
      setDoc(trackingRef, {
        liveSession: {
          isActive: true,
          requestedBy: 'admin',
          routePath: [], // reset path
          currentSpeed: 0,
          heading: 0
        }
      }, { merge: true }).catch(console.error);
    }

    const unsubscribe = onSnapshot(trackingRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTrackingData(data);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      // On unmount, disable live tracking to conserve battery
      updateDoc(trackingRef, {
        'liveSession.isActive': false
      }).catch(console.error);
    };
  }, [staffId, initialMode]);

  const handleForcePing = async () => {
    try {
      await updateDoc(doc(db, 'staff_tracking', staffId), {
        'liveSession.forcePing': true
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleLiveTracking = async () => {
    const newState = !isLiveActive;
    setIsLiveActive(newState);
    try {
      if (newState) {
        await updateDoc(doc(db, 'staff_tracking', staffId), {
          'liveSession.isActive': true,
          'liveSession.routePath': [] // reset on new session
        });
      } else {
        await updateDoc(doc(db, 'staff_tracking', staffId), {
          'liveSession.isActive': false
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loc = trackingData?.currentLocation;
  const speed = trackingData?.liveSession?.currentSpeed || 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  {staffName}'s Location
                  {isLiveActive && (
                    <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                      Live
                    </span>
                  )}
                </h3>
                <span className="text-xs text-slate-500">
                  Updated: {loc?.updatedAt ? new Date(loc.updatedAt).toLocaleString() : 'Unknown'}
                </span>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div className="p-0 bg-slate-50 h-[300px] md:h-[400px] relative">
            
            {/* Speed & Distance Badges */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              {adminLocation && loc?.lat && (
                  <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Dist: {calculateDistance(adminLocation.lat, adminLocation.lng, loc.lat, loc.lng)} km
                  </div>
              )}
              {isLiveActive && (
                <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-200 text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Speed: {speed.toFixed(1)} km/h
                </div>
              )}
            </div>
            
            {/* Layer Toggle Button */}
            <button 
              onClick={() => setMapLayer(prev => prev === 'street' ? 'satellite' : 'street')}
              className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              title="Toggle Map Layer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
            </button>

            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mb-2"></div>
                <p>Loading location data...</p>
              </div>
            ) : loc?.lat && loc?.lng ? (
              <iframe 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no" 
                  marginHeight="0" 
                  marginWidth="0" 
                  src={mapLayer === 'street' 
                    ? `https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng - 0.005},${loc.lat - 0.005},${loc.lng + 0.005},${loc.lat + 0.005}&layer=mapnik&marker=${loc.lat},${loc.lng}`
                    : `https://maps.google.com/maps?q=${loc.lat},${loc.lng}&t=k&z=17&output=embed`
                  }
              ></iframe>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <MapPin size={48} className="mb-2 opacity-30" />
                  <p>No location data available yet</p>
              </div>
            )}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
            {!isLiveActive ? (
              <button 
                  onClick={handleForcePing}
                  className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Force Ping
              </button>
            ) : (
              <button 
                  onClick={toggleLiveTracking}
                  className="flex-1 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold shadow-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
              >
                  Stop Live Tracking
              </button>
            )}
            
            <button 
                onClick={() => {
                  const url = adminLocation?.lat && adminLocation?.lng
                    ? `https://www.google.com/maps/dir/?api=1&origin=${adminLocation.lat},${adminLocation.lng}&destination=${loc.lat},${loc.lng}&travelmode=driving`
                    : `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
                  window.open(url, '_blank');
                }}
                disabled={!loc?.lat}
                className="flex-1 py-2.5 bg-blue-600 border border-blue-600 rounded-xl text-white font-semibold shadow-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                Get Directions
            </button>
          </div>
      </div>
    </div>
  );
}
