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
  
  // 3-Tier Viewport State ('normal' | 'workspace' | 'fullscreen')
  const [modalViewMode, setModalViewMode] = useState('normal');

  const cycleViewMode = () => {
    setModalViewMode(prev => {
      if (prev === 'normal') return 'workspace';
      if (prev === 'workspace') return 'fullscreen';
      return 'normal';
    });
  };

  useEffect(() => {
    if (!mapInstance.current) return;
    const t1 = setTimeout(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize();
    }, 100);
    const t2 = setTimeout(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize();
    }, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [modalViewMode]);

  // New State for "Force Ping" loading state
  const [isPinging, setIsPinging] = useState(false);
  const lastUpdatedAtRef = useRef(null);

  // Follow Mode & Camera Control State
  const [isFollowMode, setIsFollowMode] = useState(true);
  const isFollowModeRef = useRef(true);

  const handleRecenter = () => {
    setIsFollowMode(true);
    isFollowModeRef.current = true;
    let targetLat = animCurrentPosRef.current?.lat || loc?.lat;
    let targetLng = animCurrentPosRef.current?.lng || loc?.lng;
    if (targetLat && targetLng && mapInstance.current) {
      mapInstance.current.flyTo([targetLat, targetLng], 18, {
        animate: true,
        duration: 1
      });
    }
  };

  // Map Refs
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);
  const tileLayerRef = useRef(null);
  const routeTrailRef = useRef([]);
  const sessionStartTimeRef = useRef(initialMode === 'live' ? Date.now() : null);
  const lastAcceptedTimeRef = useRef(initialMode === 'live' ? Date.now() : 0);
  const animQueueRef = useRef([]);
  const animCurrentPosRef = useRef(null);
  const animLastTimeRef = useRef(null);
  const animFrameRef = useRef(null);
  
  const [uiSpeed, setUiSpeed] = useState(0);
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
      
      // Emit initial heartbeat immediately to activate/resume session & wake handset daemon
      updateDoc(trackingRef, {
        isLiveTrackingActive: true,
        isLiveTracking: true,
        lastAdminHeartbeat: Date.now(),
        liveSessionStartedAt: new Date().toISOString(),
        forcePingAt: Date.now(),
        'liveSession.isActive': true,
        'liveSession.forcePing': false
      }).catch(console.error);

      // Keep handset daemon alive every 15s
      heartbeatInterval = setInterval(() => {
        updateDoc(trackingRef, { 
          lastAdminHeartbeat: Date.now(),
          forcePingAt: Date.now()
        }).catch(console.error);
      }, 15000);
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

    mapInstance.current.on('dragstart', () => {
      setIsFollowMode(false);
      isFollowModeRef.current = false;
    });

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

    markerRef.current = L.marker([0, 0], { icon, opacity: 0 }).addTo(mapInstance.current);
    polylineRef.current = L.polyline([], { 
      color: '#0284c7', 
      weight: 4, 
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round',
      className: 'glowing-polyline'
    }).addTo(mapInstance.current);

    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
      }
    }, 200);
  }, [loading]);

  // 2. Tile Layer Update (Mapbox HD Vector Tiles & High-Res Satellite)
  useEffect(() => {
    if (!mapInstance.current) return;
    
    if (tileLayerRef.current) {
      mapInstance.current.removeLayer(tileLayerRef.current);
    }
    
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "pk.eyJ1IjoiOTY1OTAzMDE0NCIsImEiOiJjbXVyYWFmOHYwM3Q5MzJwb21hNmxidWhsIn0.1_yyUGCDI_FtaFykmOJojw";
    
    const isStreet = mapLayer === 'street';
    // Request 512px retina tiles (@2x) for crisp HD satellite and vector rendering on mobile screens
    const layerUrl = isStreet 
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
      : `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
    
    tileLayerRef.current = L.tileLayer(layerUrl, { 
      tileSize: 512,
      zoomOffset: -1,
      maxNativeZoom: 19,
      maxZoom: 20,
      crossOrigin: true,
      attribution: '© Mapbox © OpenStreetMap'
    }).addTo(mapInstance.current);
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

    const rawCoords = validBackendRoute.map(p => [p.lat || p.latitude, p.lng || p.longitude]).filter(p => p[0] && p[1]);
    const formattedBackendRoute = [];
    for (let i = 0; i < rawCoords.length; i++) {
      if (i === 0) {
        formattedBackendRoute.push(rawCoords[i]);
      } else {
        const lastIdx = formattedBackendRoute.length - 1;
        const prev = formattedBackendRoute[lastIdx];
        const dist = getDistanceFromLatLonInM(rawCoords[i][0], rawCoords[i][1], prev[0], prev[1]);
        if (dist > 4.0) {
          if (lastIdx > 0) {
            const prevPrev = formattedBackendRoute[lastIdx - 1];
            const distPrevPrevToPrev = getDistanceFromLatLonInM(prev[0], prev[1], prevPrev[0], prevPrev[1]);
            const distPrevPrevToNew = getDistanceFromLatLonInM(rawCoords[i][0], rawCoords[i][1], prevPrev[0], prevPrev[1]);
            if (distPrevPrevToNew >= distPrevPrevToPrev) {
              formattedBackendRoute.push(rawCoords[i]);
            }
          } else {
            formattedBackendRoute.push(rawCoords[i]);
          }
        }
      }
    }
    
    const hasValidCoords = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' && (loc.lat !== 0 || loc.lng !== 0) && !isNaN(loc.lat) && !isNaN(loc.lng);
    if (!hasValidCoords || !mapInstance.current || !markerRef.current) return;

    if (!isLiveActive) {
        // Handle static offline viewing
        routeTrailRef.current = [];
        animQueueRef.current = [];
        animCurrentPosRef.current = null;
        if (polylineRef.current) polylineRef.current.setLatLngs([]);
        markerRef.current.setLatLng([loc.lat, loc.lng]);
        markerRef.current.setOpacity(1);
        mapInstance.current.setView([loc.lat, loc.lng], 17);
        mapInstance.current.invalidateSize();
        return;
    }

    // Discard initial low-accuracy readings (ignore if accuracy > 25m during satellite lock)
    if (liveLocationData?.accuracy && liveLocationData.accuracy > 25) {
      console.warn('[Telemetry] Discarded low-accuracy reading:', liveLocationData.accuracy, 'm');
      return;
    }

    // Check if the current loc is stale or out-of-order
    let locTime = 0;
    if (loc?.updatedAt) {
      if (loc.updatedAt.toMillis) locTime = loc.updatedAt.toMillis();
      else locTime = new Date(loc.updatedAt).getTime();
    }

    // Strict Monotonic Timestamp Validation: Only accept incoming coordinates if incomingPoint.timestamp >= lastAcceptedPoint.timestamp
    if (isLiveActive && locTime > 0) {
      if (lastAcceptedTimeRef.current > 0 && locTime < lastAcceptedTimeRef.current) {
        console.warn('[Telemetry] Rejected out-of-order timestamp:', locTime, '<', lastAcceptedTimeRef.current);
        return;
      }
      lastAcceptedTimeRef.current = locTime;
    }

    const isStaleLoc = isLiveActive && sessionStartTimeRef.current && locTime > 0 && locTime < sessionStartTimeRef.current;
    if (isStaleLoc) return;

    // Resolve live speed and update state
    let currentSpeed = 0;
    if (isLiveActive && liveLocationData) {
      currentSpeed = liveLocationData.speed || 0;
      setUiSpeed(currentSpeed);
    } else if (!isLiveActive) {
      currentSpeed = trackingData?.liveSession?.currentSpeed || 0;
      setUiSpeed(currentSpeed);
    }
    
    if (markerRef.current) {
        markerRef.current.setOpacity(1);
        const el = markerRef.current.getElement();
        if (el) {
            const radar = el.querySelector('.stationary-radar');
            if (radar) radar.style.opacity = currentSpeed < 5 ? '1' : '0';
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
            if (dist > 4.0) {
                animQueueRef.current.push(targetPoint);
            }
        } else {
            routeTrailRef.current = [[targetPoint.lat, targetPoint.lng]];
            animCurrentPosRef.current = { lat: targetPoint.lat, lng: targetPoint.lng, heading: targetPoint.heading };
        }
        markerRef.current.setLatLng([animCurrentPosRef.current.lat, animCurrentPosRef.current.lng]);
        markerRef.current.setOpacity(1);
        if (polylineRef.current) polylineRef.current.setLatLngs(routeTrailRef.current);
        mapInstance.current.setView([targetPoint.lat, targetPoint.lng], 17); // instant snap
        mapInstance.current.invalidateSize();
    } else {
        // We are already initialized. Enqueue the new target if it's different and meaningful (> 4m distance).
        const lastTarget = animQueueRef.current.length > 0 ? animQueueRef.current[animQueueRef.current.length - 1] : animCurrentPosRef.current;
        const dist = getDistanceFromLatLonInM(targetPoint.lat, targetPoint.lng, lastTarget.lat, lastTarget.lng);
        
        if (dist > 4.0) {
            // Real-time stream: cap queue to prevent lagging behind on long trips
            if (animQueueRef.current.length > 2) {
                animQueueRef.current = [animQueueRef.current[animQueueRef.current.length - 1]];
            }
            animQueueRef.current.push(targetPoint);
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
             animCurrentPosRef.current.startLat = animCurrentPosRef.current.lat || 0;
             animCurrentPosRef.current.startLng = animCurrentPosRef.current.lng || 0;
             animCurrentPosRef.current.startHeading = animCurrentPosRef.current.heading || target.heading || 0;
             animCurrentPosRef.current.progress = 0;
        }

        // Cap maximum duration to prevent freezing, speed up if queue is building
        let duration = 2000;
        if (animQueueRef.current.length > 1) duration = 1000;
        
        // Prevent delta spikes (e.g. tab backgrounded) from breaking progress
        const safeDelta = Math.min(delta, 100);
        animCurrentPosRef.current.progress += (safeDelta / duration);
        const progress = Math.min(1, animCurrentPosRef.current.progress);

        const latDiff = (target.lat || 0) - animCurrentPosRef.current.startLat;
        const lngDiff = (target.lng || 0) - animCurrentPosRef.current.startLng;

        const newLat = animCurrentPosRef.current.startLat + latDiff * progress;
        const newLng = animCurrentPosRef.current.startLng + lngDiff * progress;

        const startHeading = animCurrentPosRef.current.startHeading;
        const targetHeading = target.heading || startHeading;
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

        if (isFollowModeRef.current && mapInstance.current) {
            mapInstance.current.panTo([newLat, newLng], { animate: true, duration: 0.3 });
        }

        if (polylineRef.current && routeTrailRef.current.length > 0) {
            const drawTrail = [...routeTrailRef.current];
            drawTrail[drawTrail.length - 1] = [newLat, newLng];
            polylineRef.current.setLatLngs(drawTrail);
        }

        if (progress >= 1) {
            const trailLen = routeTrailRef.current.length;
            if (trailLen > 0) {
                const lastPt = routeTrailRef.current[trailLen - 1];
                const distFromLast = getDistanceFromLatLonInM(target.lat, target.lng, lastPt[0], lastPt[1]);
                
                if (distFromLast > 4.0) {
                    if (trailLen > 1) {
                        const prevPt = routeTrailRef.current[trailLen - 2];
                        const distPrevToLast = getDistanceFromLatLonInM(lastPt[0], lastPt[1], prevPt[0], prevPt[1]);
                        const distPrevToTarget = getDistanceFromLatLonInM(target.lat, target.lng, prevPt[0], prevPt[1]);
                        
                        // Strict Forward Polyline Guard: push only if advancing forward along trajectory
                        if (distPrevToTarget >= distPrevToLast) {
                            routeTrailRef.current.push([target.lat, target.lng]);
                        } else {
                            routeTrailRef.current[trailLen - 1] = [target.lat, target.lng];
                        }
                    } else {
                        routeTrailRef.current.push([target.lat, target.lng]);
                    }
                } else {
                    routeTrailRef.current[trailLen - 1] = [target.lat, target.lng];
                }
            } else {
                routeTrailRef.current.push([target.lat, target.lng]);
            }
            animQueueRef.current.shift();
            animCurrentPosRef.current.progress = undefined; 
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

  const handleStopTracking = async () => {
    try {
      setIsLiveActive(false);
      await updateDoc(doc(db, 'staff_tracking', staffId), {
        isLiveTrackingActive: false,
        isLiveTracking: false,
        'liveSession.isActive': false,
        status: "standby",
        forcePingAt: null
      }).catch(console.error);
    } catch (e) {
      console.error(e);
    } finally {
      if (onClose) onClose();
    }
  };

  const toggleLiveTracking = async () => {
    const newState = !isLiveActive;
    if (!newState) {
      return handleStopTracking();
    }
    setIsLiveActive(true);
    try {
      setUiSpeed(0.0); // Reset speed instantly
      sessionStartTimeRef.current = Date.now();
      lastAcceptedTimeRef.current = Date.now();
      routeTrailRef.current = []; // immediately purge the current coordinates array
      animQueueRef.current = [];
      animCurrentPosRef.current = null;
      if (polylineRef.current) polylineRef.current.setLatLngs([]);
      
      await updateDoc(doc(db, 'staff_tracking', staffId), {
        isLiveTrackingActive: true,
        isLiveTracking: true,
        lastAdminHeartbeat: Date.now(),
        liveSessionStartedAt: new Date().toISOString(),
        'liveSession.isActive': true,
        'liveSession.routePath': [], // reset on new session
        forcePingAt: Date.now() // Wake client immediately
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Resolve current active location data
  let loc = null;
  let isFreshLivePoint = false;
  if (isLiveActive && liveLocationData) {
    loc = {
      lat: liveLocationData.latitude,
      lng: liveLocationData.longitude,
      updatedAt: liveLocationData.updatedAt
    };
    isFreshLivePoint = true;
  } else {
    loc = trackingData?.currentLocation;
  }
  
  const hasValidCoords = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' && (loc.lat !== 0 || loc.lng !== 0) && !isNaN(loc.lat) && !isNaN(loc.lng);
  
  let locTime = 0;
  if (loc?.updatedAt) {
    if (loc.updatedAt.toMillis) locTime = loc.updatedAt.toMillis();
    else locTime = new Date(loc.updatedAt).getTime();
  }
  const isStaleLoc = isLiveActive && (!isFreshLivePoint || (sessionStartTimeRef.current && locTime > 0 && locTime < sessionStartTimeRef.current));
  
  let statusText = 'Stopped';
  let statusColor = 'text-amber-600';
  let dotColor = 'bg-amber-500';
  let pulse = false;

  const speedKmH = Math.round(uiSpeed);

  if (uiSpeed >= 6) {
    statusText = 'MOVING';
    statusColor = 'text-emerald-700';
    dotColor = 'bg-emerald-500';
    pulse = true;
  } else if (uiSpeed > 0) {
    statusText = 'WALKING';
    statusColor = 'text-blue-600';
    dotColor = 'bg-blue-500';
    pulse = true;
  } else {
    statusText = 'STOPPED';
    statusColor = 'text-amber-600';
    dotColor = 'bg-amber-500';
    pulse = false;
  }

  let containerOuterClass = "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in transition-all duration-300";
  let windowClass = "bg-white rounded-2xl shadow-2xl w-full max-w-xl h-[520px] md:h-[620px] overflow-hidden flex flex-col relative transition-all duration-300";

  if (modalViewMode === 'workspace') {
    containerOuterClass = "fixed inset-0 top-16 md:left-64 z-[90] p-4 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center animate-in fade-in transition-all duration-300";
    windowClass = "bg-white rounded-2xl shadow-2xl w-full h-full overflow-hidden flex flex-col relative transition-all duration-300";
  } else if (modalViewMode === 'fullscreen') {
    containerOuterClass = "fixed inset-0 z-[110] flex items-center justify-center p-0 bg-slate-900 animate-in fade-in transition-all duration-300";
    windowClass = "bg-white w-screen h-screen overflow-hidden flex flex-col relative transition-all duration-300 rounded-none shadow-none";
  }

  return (
    <div className={containerOuterClass}>
      <div className={windowClass}>
        {/* Full-Bleed Map Canvas Container */}
        <div className="w-full h-full relative flex-1 bg-slate-900 overflow-hidden">
          
          {/* 1. Top-Left Floating Glass Pill (Staff Info & Live Telemetry) */}
          <div 
            className="absolute top-4 left-4 z-20 flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full shadow-lg border border-slate-200/80 text-[11px] sm:text-xs max-w-[calc(100%-170px)] sm:max-w-none overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <span className="font-bold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
              {staffName}
              {isLiveActive && (
                <span className="flex items-center gap-1 text-[9px] sm:text-[10px] bg-red-100 text-red-600 px-1.5 sm:px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
            </span>
            {isLiveActive && (
              <>
                <span className="text-slate-300 font-medium">•</span>
                <span className="font-bold text-indigo-600 whitespace-nowrap">
                  {speedKmH} km/h
                </span>
                <span className="text-slate-300 font-medium">•</span>
                <span className={`font-bold flex items-center gap-1 whitespace-nowrap uppercase tracking-wider text-[10px] sm:text-[11px] ${statusColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${pulse ? 'animate-pulse' : ''}`}></span>
                  {statusText}
                </span>
              </>
            )}
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="text-[11px] text-slate-500 hidden sm:inline whitespace-nowrap">
              {isLiveActive && (!hasValidCoords || isStaleLoc)
                ? 'Acquiring signal...'
                : isLiveActive && isFreshLivePoint
                ? 'Just now'
                : getRelativeTime(loc?.updatedAt)}
            </span>
          </div>

          {/* 2. Top-Right Floating Actions Cluster (Round Circular Buttons) - z-50 so Close button is always clickable above overlays */}
          <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-auto">
            {/* Layer Toggle */}
            <button 
              onClick={() => setMapLayer(prev => prev === 'street' ? 'satellite' : 'street')}
              className="bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              title={mapLayer === 'street' ? 'Switch to Satellite View' : 'Switch to High-Res Street Map'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
            </button>

            {/* Recenter Compass */}
            <button 
              onClick={handleRecenter}
              className={`p-2.5 rounded-full shadow-md border transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                isFollowMode 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-blue-500/30' 
                  : 'bg-white/90 backdrop-blur-md border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title={isFollowMode ? "Follow mode active (Click to recenter at zoom 18)" : "Recenter on staff location (Zoom 18)"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 19 21 12 17 5 21 12 2" />
              </svg>
            </button>

            {/* 3-Tier Viewport Resize */}
            <button 
              onClick={cycleViewMode} 
              className="bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              title={
                modalViewMode === 'normal' 
                  ? 'Expand to Workspace Canvas' 
                  : modalViewMode === 'workspace' 
                  ? 'Expand to Fullscreen' 
                  : 'Restore Compact Floating Window'
              }
            >
              {modalViewMode === 'normal' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
              {modalViewMode === 'workspace' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
              {modalViewMode === 'fullscreen' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14h6v6" />
                  <path d="M20 10h-6V4" />
                  <path d="M14 10l7-7" />
                  <path d="M3 21l7-7" />
                </svg>
              )}
            </button>

            {/* Close Button [ ✕ ] - Uses handleStopTracking to cleanly terminate session */}
            <button 
              onClick={handleStopTracking} 
              className="bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-md border border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all flex items-center justify-center cursor-pointer pointer-events-auto"
              title="Close Live Tracking"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          {/* Acquiring Signal Overlay (z-30) */}
          {isLiveActive && (!hasValidCoords || isStaleLoc) && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-xs text-white p-4 text-center">
              <div className="relative mb-3 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-sky-400/30 border-t-sky-400 animate-spin"></div>
                <Loader2 className="w-6 h-6 text-sky-400 absolute animate-pulse" />
              </div>
              <h4 className="font-bold text-sm tracking-wide text-white">Acquiring live satellite signal...</h4>
              <p className="text-xs text-slate-300 mt-1 max-w-xs mb-4">
                Connecting to handset background daemon. Coordinates will auto-center on road map immediately.
              </p>
              <button 
                onClick={handleStopTracking}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 font-bold text-xs rounded-full backdrop-blur-md transition-all flex items-center gap-1.5 shadow-md cursor-pointer pointer-events-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                Cancel & Close Tracking
              </button>
            </div>
          )}

          {/* Map Container */}
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

          {/* 3. Bottom Floating Action Controls */}
          <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            {/* Bottom Left: Stop Tracking / Force Ping */}
            <div className="pointer-events-auto">
              {!isLiveActive ? (
                <button 
                  onClick={handleForcePing}
                  disabled={isPinging}
                  className="px-4 py-2 bg-white/95 hover:bg-white text-slate-700 font-semibold text-xs rounded-full shadow-lg border border-slate-200/80 backdrop-blur-md flex items-center gap-2 active:scale-95 transition-all disabled:opacity-70"
                >
                  {isPinging ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                      Pinging...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Force Ping
                    </>
                  )}
                </button>
              ) : (
                <button 
                  onClick={handleStopTracking}
                  className="px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white font-semibold text-xs rounded-full shadow-lg border border-red-500/50 backdrop-blur-md flex items-center gap-2 active:scale-95 transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  Stop Live Tracking
                </button>
              )}
            </div>

            {/* Bottom Right: Get Directions */}
            <div className="pointer-events-auto">
              <button 
                onClick={() => {
                  const url = `https://www.google.com/maps/search/?api=1&query=${loc?.lat},${loc?.lng}`;
                  window.open(url, '_blank');
                }}
                disabled={!loc?.lat}
                className="px-4 py-2 bg-blue-600/90 hover:bg-blue-600 text-white font-semibold text-xs rounded-full shadow-lg border border-blue-500/50 backdrop-blur-md flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                Get Directions
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
