import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2-lat1) * (Math.PI/180);
  const dLon = (lon2-lon1) * (Math.PI/180); 
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
          Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
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
  const routeTrailRef = useRef([]);
  const sessionStartTimeRef = useRef(initialMode === 'live' ? Date.now() : null);
  const animQueueRef = useRef([]);
  const animCurrentPosRef = useRef(null);
  const animLastTimeRef = useRef(null);
  const animFrameRef = useRef(null);
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

    const motorbikeSvg = `
      <style>
        .nav-bike-rider-marker {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .glowing-polyline {
          filter: drop-shadow(0 0 6px rgba(14, 165, 233, 0.8));
        }
        .stationary-radar {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 80px;
          height: 80px;
          margin-top: -40px;
          margin-left: -40px;
          background: rgba(59, 130, 246, 0.35);
          border-radius: 50%;
          animation: radar-pulse 2.5s infinite ease-out;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.5s ease;
          z-index: -1;
        }
        @keyframes radar-pulse {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      </style>
      <div style="position: relative;">
        <div class="stationary-radar"></div>
        <div class="bike-icon-wrapper" style="
          width: 36px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(0deg);
          transition: transform 0.3s ease-out;
          will-change: transform;
        ">
          <svg width="36" height="60" viewBox="0 0 36 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Top-down motorcycle body, handlebars, rider helmet & jacket -->
            <ellipse cx="18" cy="10" rx="3.5" ry="9" fill="#1e293b" />
            <rect x="15" y="14" width="6" height="22" rx="3" fill="#eab308" />
            <ellipse cx="18" cy="48" rx="4" ry="10" fill="#0f172a" />
            <path d="M6 19 L30 19" stroke="#334155" stroke-width="3" stroke-linecap="round" />
            <circle cx="6" cy="19" r="2.5" fill="#f8fafc" />
            <circle cx="30" cy="19" r="2.5" fill="#f8fafc" />
            <ellipse cx="18" cy="27" rx="8" ry="6" fill="#3b82f6" />
            <circle cx="18" cy="24" r="6" fill="#f8fafc" stroke="#0284c7" stroke-width="1.5" />
            <path d="M15 22 Q18 20 21 22" stroke="#0f172a" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
      </div>`;

    const icon = L.divIcon({
      html: motorbikeSvg,
      className: 'nav-bike-rider-marker',
      iconSize: [36, 60],
      iconAnchor: [18, 30]
    });

    markerRef.current = L.marker([0, 0], { icon }).addTo(mapInstance.current);
    polylineRef.current = L.polyline([], { 
      color: '#0284c7', 
      weight: 4, 
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round',
      className: 'glowing-polyline'
    }).addTo(mapInstance.current);
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

  // 3. Dynamic Telemetry Enqueue (No Flicker)
  useEffect(() => {
    let loc = null;
    let heading = 0;
    
    if (isLiveActive && liveLocationData) {
      loc = {
        lat: liveLocationData.latitude,
        lng: liveLocationData.longitude,
        updatedAt: liveLocationData.updatedAt || new Date().toISOString()
      };
      heading = liveLocationData.heading || 0;
    } else {
      loc = trackingData?.currentLocation;
      heading = trackingData?.liveSession?.heading || 0;
    }
    
    const backendRoute = trackingData?.liveSession?.routePath || [];
    
    // 1. Strict Session Boundary Filter
    let validBackendRoute = backendRoute;
    if (isLiveActive && sessionStartTimeRef.current) {
      validBackendRoute = backendRoute.filter(p => {
        let t = 0;
        if (p.timestamp?.toMillis) t = p.timestamp.toMillis();
        else if (p.timestamp) t = new Date(p.timestamp).getTime();
        return t > 0 && t >= sessionStartTimeRef.current; // STRICT: discard unknown or old timestamps
      });
    }

    const formattedBackendRoute = validBackendRoute.map(p => [p.lat || p.latitude, p.lng || p.longitude]).filter(p => p[0] && p[1]);
    
    if (!loc?.lat || !mapInstance.current || !markerRef.current) return;

    if (!isLiveActive) {
        // Handle static offline viewing
        routeTrailRef.current = [];
        animQueueRef.current = [];
        animCurrentPosRef.current = null;
        if (polylineRef.current) polylineRef.current.setLatLngs([]);
        markerRef.current.setLatLng([loc.lat, loc.lng]);
        mapInstance.current.setView([loc.lat, loc.lng], 17);
        return;
    }

    // Check if the current loc is stale
    let locTime = 0;
    if (loc?.updatedAt) {
      if (loc.updatedAt.toMillis) locTime = loc.updatedAt.toMillis();
      else locTime = new Date(loc.updatedAt).getTime();
    }
    const isStaleLoc = isLiveActive && sessionStartTimeRef.current && locTime > 0 && locTime < sessionStartTimeRef.current;
    if (isStaleLoc) return;

    // Resolve Speed & Radar Toggle
    let currentSpeed = 0;
    if (isLiveActive && liveLocationData) {
      currentSpeed = liveLocationData.speed || 0;
    } else {
      currentSpeed = trackingData?.liveSession?.currentSpeed || 0;
    }
    
    if (markerRef.current) {
        const el = markerRef.current.getElement();
        if (el) {
            const radar = el.querySelector('.stationary-radar');
            if (radar) radar.style.opacity = currentSpeed < 1.5 ? '1' : '0';
        }
    }

    const targetPoint = { lat: loc.lat, lng: loc.lng, heading };

    // Initialization: If we have no current position, snap instantly to the starting coordinate
    if (!animCurrentPosRef.current) {
        if (formattedBackendRoute.length > 0) {
            routeTrailRef.current = [...formattedBackendRoute];
            const lastRoutePt = formattedBackendRoute[formattedBackendRoute.length - 1];
            animCurrentPosRef.current = { lat: lastRoutePt[0], lng: lastRoutePt[1], heading: targetPoint.heading };
            
            const dist = getDistanceFromLatLonInM(targetPoint.lat, targetPoint.lng, lastRoutePt[0], lastRoutePt[1]);
            if (dist > 2) {
                animQueueRef.current.push(targetPoint);
                routeTrailRef.current.push([animCurrentPosRef.current.lat, animCurrentPosRef.current.lng]);
            }
        } else {
            routeTrailRef.current = [[targetPoint.lat, targetPoint.lng]];
            animCurrentPosRef.current = { lat: targetPoint.lat, lng: targetPoint.lng, heading: targetPoint.heading };
        }
        markerRef.current.setLatLng([animCurrentPosRef.current.lat, animCurrentPosRef.current.lng]);
        if (polylineRef.current) polylineRef.current.setLatLngs(routeTrailRef.current);
        mapInstance.current.setView([targetPoint.lat, targetPoint.lng], 17); // instant snap
    } else {
        // We are already initialized. Enqueue the new target if it's different and meaningful (>2m drift).
        const lastTarget = animQueueRef.current.length > 0 ? animQueueRef.current[animQueueRef.current.length - 1] : animCurrentPosRef.current;
        const dist = getDistanceFromLatLonInM(targetPoint.lat, targetPoint.lng, lastTarget.lat, lastTarget.lng);
        
        if (dist > 2 || currentSpeed >= 1.5) {
            if (animQueueRef.current.length === 0) {
                routeTrailRef.current.push([animCurrentPosRef.current.lat, animCurrentPosRef.current.lng]);
            }
            animQueueRef.current.push(targetPoint);
            mapInstance.current.panTo([targetPoint.lat, targetPoint.lng], { animate: true, duration: 1.5 });
        }
    }
  }, [trackingData, liveLocationData, isLiveActive, loading]);

  // 4. Animation Loop for Smooth Gliding & Trailing Polyline
  useEffect(() => {
    const animate = (time) => {
      if (!animLastTimeRef.current) animLastTimeRef.current = time;
      const delta = time - animLastTimeRef.current;
      animLastTimeRef.current = time;

      if (animQueueRef.current.length > 0 && animCurrentPosRef.current && isLiveActive) {
        const target = animQueueRef.current[0];
        
        if (animCurrentPosRef.current.progress === undefined) {
             animCurrentPosRef.current.startLat = animCurrentPosRef.current.lat;
             animCurrentPosRef.current.startLng = animCurrentPosRef.current.lng;
             animCurrentPosRef.current.startHeading = animCurrentPosRef.current.heading || target.heading || 0;
             animCurrentPosRef.current.progress = 0;
        }

        let duration = 2100;
        if (animQueueRef.current.length > 1) duration = 1900;
        if (animQueueRef.current.length > 2) duration = 1000;

        animCurrentPosRef.current.progress += (delta / duration);
        const progress = Math.min(1, animCurrentPosRef.current.progress);

        const latDiff = target.lat - animCurrentPosRef.current.startLat;
        const lngDiff = target.lng - animCurrentPosRef.current.startLng;

        const newLat = animCurrentPosRef.current.startLat + latDiff * progress;
        const newLng = animCurrentPosRef.current.startLng + lngDiff * progress;

        const startHeading = animCurrentPosRef.current.startHeading;
        const targetHeading = target.heading || 0;
        const shortest_angle = ((((targetHeading - startHeading) % 360) + 540) % 360) - 180;
        const newHeading = startHeading + shortest_angle * progress;

        animCurrentPosRef.current.lat = newLat;
        animCurrentPosRef.current.lng = newLng;
        animCurrentPosRef.current.heading = newHeading;

        if (markerRef.current) {
            markerRef.current.setLatLng([newLat, newLng]);
            const el = markerRef.current.getElement();
            if (el) {
                const wrapper = el.querySelector('.bike-icon-wrapper');
                if (wrapper) wrapper.style.transform = `rotate(${newHeading}deg)`;
            }
        }

        if (polylineRef.current && routeTrailRef.current.length > 0) {
            const drawTrail = [...routeTrailRef.current];
            drawTrail[drawTrail.length - 1] = [newLat, newLng];
            polylineRef.current.setLatLngs(drawTrail);
        }

        if (progress >= 1) {
            if (routeTrailRef.current.length > 0) {
                routeTrailRef.current[routeTrailRef.current.length - 1] = [target.lat, target.lng];
            }
            animQueueRef.current.shift();
            animCurrentPosRef.current.progress = undefined; 
            if (animQueueRef.current.length > 0) {
                routeTrailRef.current.push([target.lat, target.lng]);
            }
        }
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isLiveActive]);

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
        isLiveTrackingActive: true,
        forcePingAt: Date.now(),
        requestedAt: serverTimestamp()
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
        sessionStartTimeRef.current = Date.now();
        routeTrailRef.current = []; // immediately purge the current coordinates array
        animQueueRef.current = [];
        animCurrentPosRef.current = null;
        if (polylineRef.current) polylineRef.current.setLatLngs([]);
        
        await updateDoc(doc(db, 'staff_tracking', staffId), {
          isLiveTrackingActive: true,
          'liveSession.isActive': true,
          'liveSession.routePath': [], // reset on new session
          forcePingAt: Date.now() // Wake client immediately
        });
      } else {
        await updateDoc(doc(db, 'staff_tracking', staffId), {
          isLiveTrackingActive: false,
          'liveSession.isActive': false,
          forcePingAt: null
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
