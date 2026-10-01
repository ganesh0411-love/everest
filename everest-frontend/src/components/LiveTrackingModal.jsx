import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function getRelativeTime(isoStringOrTimestamp) {
  if (!isoStringOrTimestamp) return 'Unknown';
  let timeMs = 0;
  if (isoStringOrTimestamp.toMillis) {
    timeMs = isoStringOrTimestamp.toMillis();
  } else {
    timeMs = new Date(isoStringOrTimestamp).getTime();
  }
  
  if (isNaN(timeMs)) return 'Unknown';
  const diff = Date.now() - timeMs;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 30) return 'Just now';
  if (seconds < 60) return 'A few seconds ago';
  if (seconds < 120) return '1 minute ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  return new Date(timeMs).toLocaleString();
}

export default function LiveTrackingModal({ staffId, staffName, onClose, initialMode = 'current' }) {
  const [mapLayer, setMapLayer] = useState('street'); // 'street' | 'satellite'
  const [trackingData, setTrackingData] = useState(null);
  const [liveLocationData, setLiveLocationData] = useState(null);
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
    const liveLocRef = doc(db, 'live_locations', staffId);
    let unsubscribeTracking = null;
    let unsubscribeLiveLoc = null;

    if (!isLiveActive && !isPinging) {
      // Static Mode (Current Location): Fetch once
      getDoc(trackingRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTrackingData(data);
          lastUpdatedAtRef.current = data.currentLocation?.updatedAt;
        }
        setLoading(false);
      }).catch(console.error);
    } else {
      // Stream Mode: Subscribe to live updates
      unsubscribeTracking = onSnapshot(trackingRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTrackingData(data);
          
          if (isPinging && data.lastPingReceivedAt?.toMillis() !== lastUpdatedAtRef.current) {
            setIsPinging(false);
          }
          lastUpdatedAtRef.current = data.lastPingReceivedAt?.toMillis();
        }
        setLoading(false);
      });

      // Stream Mode: Subscribe to live_locations updates
      unsubscribeLiveLoc = onSnapshot(liveLocRef, (docSnap) => {
        if (docSnap.exists()) {
          setLiveLocationData(docSnap.data());
        }
      });
    }

    return () => {
      if (unsubscribeTracking) unsubscribeTracking();
      if (unsubscribeLiveLoc) unsubscribeLiveLoc();
    };
  }, [staffId, isLiveActive, isPinging]);

  // Admin Heartbeat & Session Management
  useEffect(() => {
    let heartbeatInterval;
    if (isLiveActive && staffId) {
      const trackingRef = doc(db, 'staff_tracking', staffId);
      
      // Emit initial heartbeat immediately to activate/resume session
      updateDoc(trackingRef, {
        lastAdminHeartbeat: Date.now(),
        isLiveTrackingActive: true,
        'liveSession.isActive': true,
        'liveSession.forcePing': false
      }).catch(console.error);

      // Keep handset daemon alive every 20s
      heartbeatInterval = setInterval(() => {
        updateDoc(trackingRef, { lastAdminHeartbeat: Date.now() }).catch(console.error);
      }, 20000);
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (isLiveActive && staffId) {
        updateDoc(doc(db, 'staff_tracking', staffId), {
          isLiveTrackingActive: false,
          'liveSession.isActive': false,
          'liveSession.forcePing': false
        }).catch(console.error);
      }
    };
  }, [staffId, isLiveActive]);

  // 1. Map Initialization (Run Once when loaded)
  useEffect(() => {
    if (loading || !mapRef.current || mapInstance.current) return;
    
    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([0, 0], 17);

    // Motorbike SVG Marker
    const motorbikeSvg = `
      <div style="background: white; border-radius: 50%; padding: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid #3b82f6; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; transition: transform 0.3s ease;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; transition: transform 0.5s ease-out;">
          <path d="M5 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M19 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M5 14h3l1.5-3"/><path d="M9.5 11 12 7h4"/><path d="m11 14 1.5-3 3 3H19"/><path d="M16 14v-2"/><path d="M12 7v-2"/><path d="M10 5h4"/>
        </svg>
      </div>`;

    const icon = L.divIcon({
      html: motorbikeSvg,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    markerRef.current = L.marker([0, 0], { icon }).addTo(mapInstance.current);
    polylineRef.current = L.polyline([], { color: '#3b82f6', weight: 4, opacity: 0.8 }).addTo(mapInstance.current);
  }, [loading]);

  // 2. Tile Layer Update
  useEffect(() => {
    if (!mapInstance.current) return;
    
    if (tileLayerRef.current) {
      mapInstance.current.removeLayer(tileLayerRef.current);
    }
    
    const layerUrl = mapLayer === 'street' 
      ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    
    tileLayerRef.current = L.tileLayer(layerUrl, { maxZoom: 19 }).addTo(mapInstance.current);
  }, [mapLayer, loading]);

  // 3. Dynamic Telemetry Updates (No Flicker)
  useEffect(() => {
    // Prefer live_locations payload if active, else fallback to trackingData.currentLocation
    let loc = null;
    let heading = 0;
    
    if (isLiveActive && liveLocationData) {
      loc = {
        lat: liveLocationData.latitude,
        lng: liveLocationData.longitude,
        updatedAt: liveLocationData.updatedAt
      };
      heading = liveLocationData.heading || 0;
    } else {
      loc = trackingData?.currentLocation;
      heading = trackingData?.liveSession?.heading || 0;
    }
    
    const route = trackingData?.liveSession?.routePath || [];
    
    if (!loc?.lat || !mapInstance.current || !markerRef.current) return;

    // Smoothly update marker
    markerRef.current.setLatLng([loc.lat, loc.lng]);

    // Apply rotation
    const el = markerRef.current.getElement();
    if (el) {
      el.style.transition = 'transform 1s linear';
      const svg = el.querySelector('svg');
      if (svg) {
        svg.style.transform = `rotate(${heading}deg)`;
      }
    }

    // Draw Polyline & Pan
    if (isLiveActive && route.length > 0) {
      const latLngs = route.map(pt => [pt.lat, pt.lng]);
      polylineRef.current.setLatLngs(latLngs);
      mapInstance.current.panTo([loc.lat, loc.lng], { animate: true, duration: 1 });
    } else {
      polylineRef.current.setLatLngs([]);
      mapInstance.current.setView([loc.lat, loc.lng], 17);
    }
  }, [trackingData, liveLocationData, isLiveActive, loading]);

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
      
      // Auto clear loading spinner after 10s max if location doesn't update
      setTimeout(() => setIsPinging(false), 10000);
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
          isLiveTrackingActive: true,
          'liveSession.isActive': true,
          'liveSession.routePath': [], // reset on new session
          'liveSession.forcePing': false // Reset any stuck pings
        });
      } else {
        await updateDoc(doc(db, 'staff_tracking', staffId), {
          isLiveTrackingActive: false,
          'liveSession.isActive': false,
          'liveSession.forcePing': false
        });
        setIsPinging(false); // Reset buttons instantly
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Resolve current active location data
  let loc = null;
  let speed = 0;
  if (isLiveActive && liveLocationData) {
    loc = {
      lat: liveLocationData.latitude,
      lng: liveLocationData.longitude,
      updatedAt: liveLocationData.updatedAt
    };
    speed = liveLocationData.speed || 0;
  } else {
    loc = trackingData?.currentLocation;
    speed = trackingData?.liveSession?.currentSpeed || 0;
  }
  
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
                  const url = `https://www.google.com/maps/search/?api=1&query=${loc?.lat},${loc?.lng}`;
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
