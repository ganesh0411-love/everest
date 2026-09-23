import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function getRelativeTime(isoString) {
  if (!isoString) return 'Unknown';
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 30) return 'Just now';
  if (seconds < 60) return 'A few seconds ago';
  if (seconds < 120) return '1 minute ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  return new Date(isoString).toLocaleString();
}

export default function LiveTrackingModal({ staffId, staffName, onClose, initialMode = 'current' }) {
  const [mapLayer, setMapLayer] = useState('street'); // 'street' | 'satellite'
  const [trackingData, setTrackingData] = useState(null);
  const [isLiveActive, setIsLiveActive] = useState(initialMode === 'live');
  const [loading, setLoading] = useState(true);
  
  // New State for "Force Ping" loading state
  const [isPinging, setIsPinging] = useState(false);
  const lastUpdatedAtRef = useRef(null);

  // Map Refs
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);
  const tileLayerRef = useRef(null);

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
        
        console.log('[Admin] Received updated location snapshot at:', data.currentLocation?.updatedAt);
        
        // Auto-clear pinging state if updatedAt changes
        if (isPinging && data.currentLocation?.updatedAt !== lastUpdatedAtRef.current) {
          setIsPinging(false);
        }
        lastUpdatedAtRef.current = data.currentLocation?.updatedAt;
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      // On unmount, cleanly exit live tracking
      updateDoc(trackingRef, {
        'liveSession.isActive': false,
        'liveSession.forcePing': false
      }).catch(console.error);
    };
  }, [staffId, initialMode, isPinging]);

  // Leaflet Map Initialization and updates
  useEffect(() => {
    const loc = trackingData?.currentLocation;
    const route = trackingData?.liveSession?.routePath || [];
    
    if (loc?.lat && loc?.lng && mapRef.current && !loading) {
      if (!mapInstance.current) {
        // Initialize Map
        mapInstance.current = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView([loc.lat, loc.lng], 17);

        // Marker (Custom Icon)
        const icon = L.divIcon({
          html: `
            <div style="background: white; border-radius: 12px; padding: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid #3b82f6; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
            </div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        markerRef.current = L.marker([loc.lat, loc.lng], { icon }).addTo(mapInstance.current);
        
        // Polyline
        polylineRef.current = L.polyline([], { color: '#3b82f6', weight: 4, opacity: 0.8 }).addTo(mapInstance.current);
      }

      // Update Layer Based on state
      if (tileLayerRef.current) {
        mapInstance.current.removeLayer(tileLayerRef.current);
      }
      
      const layerUrl = mapLayer === 'street' 
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      
      tileLayerRef.current = L.tileLayer(layerUrl, {
        maxZoom: 19,
      }).addTo(mapInstance.current);

      // Smoothly update marker
      markerRef.current.setLatLng([loc.lat, loc.lng]);

      const el = markerRef.current.getElement();
      if (el) {
        el.style.transition = 'transform 1s linear';
        const svg = el.querySelector('svg');
        if (svg) {
          svg.style.transition = 'transform 0.5s ease-out';
          svg.style.transform = `rotate(${trackingData?.liveSession?.heading || 0}deg)`;
        }
      }

      // Draw Polyline
      if (isLiveActive && route.length > 0) {
        const latLngs = route.map(pt => [pt.lat, pt.lng]);
        polylineRef.current.setLatLngs(latLngs);
        
        // Auto-pan if the marker moves
        mapInstance.current.panTo([loc.lat, loc.lng]);
      } else {
        polylineRef.current.setLatLngs([]);
      }
    }
    
    return () => {
      // Cleanup happens in a separate unmount hook to avoid destroying map on every update
    };
  }, [trackingData, mapLayer, loading, isLiveActive]);
  
  // Destroy map instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const handleForcePing = async () => {
    setIsPinging(true);
    console.log('[Admin] Force Ping dispatched to staffId:', staffId);
    try {
      await updateDoc(doc(db, 'staff_tracking', staffId), {
        'liveSession.forcePing': Date.now()
      });
      
      // Auto clear loading spinner after 5s max if location doesn't update
      setTimeout(() => setIsPinging(false), 5000);
    } catch (e) {
      console.error(e);
      setIsPinging(false);
    }
  };

  const toggleLiveTracking = async () => {
    const newState = !isLiveActive;
    setIsLiveActive(newState);
    try {
      if (newState) {
        await updateDoc(doc(db, 'staff_tracking', staffId), {
          'liveSession.isActive': true,
          'liveSession.routePath': [], // reset on new session
          'liveSession.forcePing': false // Reset any stuck pings
        });
      } else {
        await updateDoc(doc(db, 'staff_tracking', staffId), {
          'liveSession.isActive': false,
          'liveSession.forcePing': false
        });
        setIsPinging(false); // Reset buttons instantly
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loc = trackingData?.currentLocation;
  const speed = trackingData?.liveSession?.currentSpeed || 0;
  const isMoving = speed > 2;

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
                  Updated: {getRelativeTime(loc?.updatedAt)}
                </span>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div className="p-0 bg-slate-50 h-[300px] md:h-[400px] relative">
            
            {/* Speed & Distance Badges */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              {isLiveActive && (
                <>
                  <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-200 text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Speed: {speed.toFixed(1)} km/h
                  </div>
                  <div className={`bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-200 text-xs font-bold flex items-center gap-1.5 ${isMoving ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${isMoving ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    Status: {isMoving ? 'Moving' : 'Stationary'}
                  </div>
                </>
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
              <div ref={mapRef} className="w-full h-full z-0" style={{ isolation: 'isolate' }}></div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <MapPin size={48} className="mb-2 opacity-30" />
                  <p>Awaiting staff mobile GPS signal</p>
              </div>
            )}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
            {!isLiveActive ? (
              <button 
                  onClick={handleForcePing}
                  disabled={isPinging}
                  className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                  {isPinging ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                      Pinging...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Force Ping
                    </>
                  )}
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
                  const url = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
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
