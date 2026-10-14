import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { loadGoogleMaps, isGoogleMapsLoaded } from '../utils/googleMapsLoader';

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

const motorbikeSvg = `
  <style>
    .nav-bike-rider-marker {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    .stationary-radar {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 80px;
      height: 80px;
      margin-top: -40px;
      margin-left: -40px;
      background: rgba(37, 99, 235, 0.35);
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
    /* Suppress default white Google Maps UI controls so custom joystick controls have full priority */
    .gm-bundled-control,
    .gm-control-active,
    .gm-fullscreen-control,
    .gmnoprint {
      display: none !important;
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

function createRiderOverlayClass() {
  if (typeof window === 'undefined' || !isGoogleMapsLoaded() || typeof window.google?.maps?.OverlayView !== 'function') return null;

  return class RiderOverlay extends window.google.maps.OverlayView {
    constructor(map, position) {
      super();
      this.position = (position && typeof window.google?.maps?.LatLng === 'function') 
        ? new window.google.maps.LatLng(position.lat, position.lng) 
        : null;
      this.heading = 0;
      this.speed = 0;
      this.div = null;
      this.setMap(map);
    }

    onAdd() {
      this.div = document.createElement('div');
      this.div.style.position = 'absolute';
      this.div.style.cursor = 'pointer';
      this.div.style.zIndex = '1000';
      this.div.style.userSelect = 'none';
      this.div.innerHTML = motorbikeSvg;
      const panes = this.getPanes();
      if (panes?.overlayMouseTarget) {
        panes.overlayMouseTarget.appendChild(this.div);
      }
    }

    draw() {
      if (!this.div || !this.position) return;
      const overlayProjection = this.getProjection();
      if (!overlayProjection) return;
      const point = overlayProjection.fromLatLngToDivPixel(this.position);
      if (point) {
        this.div.style.left = `${point.x - 18}px`;
        this.div.style.top = `${point.y - 30}px`;
      }
    }

    setPosition(lat, lng, heading = 0, speed = 0) {
      if (typeof window.google?.maps?.LatLng === 'function') {
        this.position = new window.google.maps.LatLng(lat, lng);
      }
      this.heading = heading;
      this.speed = speed;
      if (this.div) {
        const wrapper = this.div.querySelector('.bike-icon-wrapper');
        if (wrapper) wrapper.style.transform = `rotate(${heading}deg)`;
        const radar = this.div.querySelector('.stationary-radar');
        if (radar) radar.style.opacity = speed < 5 ? '1' : '0';
      }
      this.draw();
    }

    onRemove() {
      if (this.div && this.div.parentNode) {
        this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
    }
  };
}

export default function LiveTrackingModal({ staffId, staffName, onClose, initialMode = 'current' }) {
  const [mapLayer, setMapLayer] = useState('satellite'); // 'street' (roadmap) | 'satellite' (hybrid)
  const [trackingData, setTrackingData] = useState(null);
  const [liveLocationData, setLiveLocationData] = useState(null);
  const [isLiveActive, setIsLiveActive] = useState(initialMode === 'live');
  const [loading, setLoading] = useState(true);

  // Google Maps Loading & Error State Guard (Constructor-safe)
  const [mapsLoaded, setMapsLoaded] = useState(isGoogleMapsLoaded);
  const [mapsError, setMapsError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (isGoogleMapsLoaded()) {
      setMapsLoaded(true);
      return;
    }
    loadGoogleMaps()
      .then(() => {
        if (isMounted) setMapsLoaded(true);
      })
      .catch((err) => {
        console.warn('Google Maps Script Load Error:', err);
        if (isMounted) setMapsError(err);
      });
    return () => { isMounted = false; };
  }, []);
  
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
    if (!mapInstance.current || !window.google?.maps) return;
    const t1 = setTimeout(() => {
      if (mapInstance.current && window.google?.maps) {
        window.google.maps.event.trigger(mapInstance.current, 'resize');
        if (animCurrentPosRef.current) {
          mapInstance.current.panTo(animCurrentPosRef.current);
        }
      }
    }, 100);
    const t2 = setTimeout(() => {
      if (mapInstance.current && window.google?.maps) {
        window.google.maps.event.trigger(mapInstance.current, 'resize');
      }
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
    const targetLat = animCurrentPosRef.current?.lat || loc?.lat;
    const targetLng = animCurrentPosRef.current?.lng || loc?.lng;
    if (targetLat && targetLng && mapInstance.current) {
      mapInstance.current.panTo({ lat: targetLat, lng: targetLng });
      mapInstance.current.setZoom(18);
    }
  };

  const handlePan = (dx, dy) => {
    if (!mapInstance.current) return;
    setIsFollowMode(false);
    isFollowModeRef.current = false;
    mapInstance.current.panBy(dx, dy);
  };

  const handleZoomIn = () => {
    if (!mapInstance.current) return;
    const currentZoom = mapInstance.current.getZoom() || 17;
    mapInstance.current.setZoom(currentZoom + 1);
  };

  const handleZoomOut = () => {
    if (!mapInstance.current) return;
    const currentZoom = mapInstance.current.getZoom() || 17;
    mapInstance.current.setZoom(currentZoom - 1);
  };

  // Map Refs
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const riderOverlayRef = useRef(null);
  const polylineRef = useRef(null);
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

  // 1. Google Maps Initialization (Satellite Hybrid & 3D Tilt Configuration)
  useEffect(() => {
    if (loading || !mapsLoaded || !mapRef.current || mapInstance.current) return;
    if (!isGoogleMapsLoaded() || typeof window.google?.maps?.Map !== 'function') return;
    
    try {
      const RiderOverlayClass = createRiderOverlayClass();

      // Field-tuned Map Options per requirement:
      const mapOptions = {
        mapTypeId: mapLayer === 'street' ? 'roadmap' : 'hybrid',
        disableDefaultUI: true, // Disables all default Google controls at once
        zoomControl: false,      // Hide default white +/- zoom buttons
        fullscreenControl: false, // Hide default white 4-arrow square button
        streetViewControl: false,
        mapTypeControl: false,   // Keeps UI clean; custom buttons manage toggles
        keyboardShortcuts: false,
        gestureHandling: 'greedy', // Smooth fluid mobile and desktop interactions
        tilt: 45 // Enables 3D tilt perspective where high-res imagery is available
      };

      const initialCenter = animCurrentPosRef.current || (loc?.lat ? { lat: loc.lat, lng: loc.lng } : { lat: 10.3673, lng: 77.9803 });

      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        ...mapOptions,
        center: initialCenter,
        zoom: 17
      });

      mapInstance.current.addListener('dragstart', () => {
        setIsFollowMode(false);
        isFollowModeRef.current = false;
      });

      // Native Google Maps Polyline for live breadcrumb path
      if (typeof window.google?.maps?.Polyline === 'function') {
        polylineRef.current = new window.google.maps.Polyline({
          map: mapInstance.current,
          path: [],
          strokeColor: '#2563EB', // Requirement: strokeColor #2563EB
          strokeWeight: 4,        // Requirement: strokeWeight 4
          strokeOpacity: 0.9,
          geodesic: true
        });
      }

      if (RiderOverlayClass) {
        riderOverlayRef.current = new RiderOverlayClass(mapInstance.current, initialCenter);
      }

      setTimeout(() => {
        if (mapInstance.current && window.google?.maps?.event) {
          window.google.maps.event.trigger(mapInstance.current, 'resize');
        }
      }, 200);
    } catch (err) {
      console.error('Failed to initialize Google Map safely:', err);
      setMapsError(err);
    }
  }, [loading, mapsLoaded]);

  // 2. Map Layer Switcher (Hybrid Satellite vs High-Res Roadmap)
  useEffect(() => {
    if (!mapInstance.current) return;
    const targetTypeId = mapLayer === 'street' ? 'roadmap' : 'hybrid';
    mapInstance.current.setMapTypeId(targetTypeId);
  }, [mapLayer]);

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
    if (!hasValidCoords || !mapInstance.current) return;

    if (!isLiveActive) {
        // Handle static offline viewing
        routeTrailRef.current = [];
        animQueueRef.current = [];
        animCurrentPosRef.current = null;
        if (polylineRef.current) polylineRef.current.setPath([]);
        if (riderOverlayRef.current) {
          riderOverlayRef.current.setPosition(loc.lat, loc.lng, heading, 0);
        }
        mapInstance.current.setCenter({ lat: loc.lat, lng: loc.lng });
        mapInstance.current.setZoom(17);
        if (window.google?.maps) {
          window.google.maps.event.trigger(mapInstance.current, 'resize');
        }
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

    // Strict Monotonic Timestamp Validation
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
        
        if (riderOverlayRef.current) {
          riderOverlayRef.current.setPosition(animCurrentPosRef.current.lat, animCurrentPosRef.current.lng, animCurrentPosRef.current.heading, currentSpeed);
        }
        if (polylineRef.current && routeTrailRef.current.length > 0) {
          polylineRef.current.setPath(routeTrailRef.current.map(p => ({ lat: p[0], lng: p[1] })));
        }
        mapInstance.current.setCenter({ lat: targetPoint.lat, lng: targetPoint.lng });
        mapInstance.current.setZoom(17);
    } else {
        // Enqueue the new target if it's different and meaningful (> 4m distance).
        const lastTarget = animQueueRef.current.length > 0 ? animQueueRef.current[animQueueRef.current.length - 1] : animCurrentPosRef.current;
        const dist = getDistanceFromLatLonInM(targetPoint.lat, targetPoint.lng, lastTarget.lat, lastTarget.lng);
        
        if (dist > 4.0) {
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

        let duration = 2000;
        if (animQueueRef.current.length > 1) duration = 1000;
        
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

        if (riderOverlayRef.current) {
          riderOverlayRef.current.setPosition(newLat, newLng, newHeading, uiSpeed);
        }

        if (isFollowModeRef.current && mapInstance.current) {
          mapInstance.current.panTo({ lat: newLat, lng: newLng });
        }

        if (polylineRef.current && routeTrailRef.current.length > 0) {
          const drawTrail = [...routeTrailRef.current];
          drawTrail[drawTrail.length - 1] = [newLat, newLng];
          polylineRef.current.setPath(drawTrail.map(p => ({ lat: p[0], lng: p[1] })));
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
  }, [isLiveActive, uiSpeed]);

  // Clean map instance on unmount
  useEffect(() => {
    return () => {
      if (riderOverlayRef.current) {
        riderOverlayRef.current.setMap(null);
        riderOverlayRef.current = null;
      }
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      mapInstance.current = null;
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
      setUiSpeed(0.0);
      sessionStartTimeRef.current = Date.now();
      lastAcceptedTimeRef.current = Date.now();
      routeTrailRef.current = [];
      animQueueRef.current = [];
      animCurrentPosRef.current = null;
      if (polylineRef.current) polylineRef.current.setPath([]);
      
      await updateDoc(doc(db, 'staff_tracking', staffId), {
        isLiveTrackingActive: true,
        isLiveTracking: true,
        lastAdminHeartbeat: Date.now(),
        liveSessionStartedAt: new Date().toISOString(),
        'liveSession.isActive': true,
        'liveSession.routePath': [],
        forcePingAt: Date.now()
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

          {/* 2. Top-Right Floating Actions Cluster (Round Circular Buttons) */}
          <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-auto">
            {/* Layer Toggle (Hybrid Satellite vs High-Res Road Map) */}
            <button 
              onClick={() => setMapLayer(prev => prev === 'street' ? 'satellite' : 'street')}
              className="bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              title={mapLayer === 'street' ? 'Switch to Google Hybrid Satellite View' : 'Switch to Google Roadmap'}
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

            {/* Close Button [ ✕ ] */}
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
                Connecting to handset background daemon. Coordinates will auto-center on Google hybrid map immediately.
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

          {/* Map Container with Google Maps Fallback & Error Guard */}
          {mapsError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-300 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
              <p className="font-semibold text-sm">Google Maps Connection Warning</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Awaiting Google Maps satellite stream connection.
              </p>
              <button
                onClick={() => {
                  setMapsError(null);
                  loadGoogleMaps().then(() => setMapsLoaded(true)).catch(setMapsError);
                }}
                className="mt-3 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 cursor-pointer transition"
              >
                Retry Connection
              </button>
            </div>
          ) : (!mapsLoaded || loading) ? (
            <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 text-slate-300">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <span className="text-xs font-medium tracking-wide">Connecting to Live Satellite Map...</span>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-full z-0" style={{ isolation: 'isolate' }}></div>
          )}

          {/* Floating Pan-Joystick D-pad Navigation & Zoom Controls (z-40) */}
          <div className="absolute bottom-20 right-4 z-40 flex flex-col items-center gap-2.5 pointer-events-auto">
            {/* Circular D-pad Joystick Wheel */}
            <div className="bg-slate-900/85 backdrop-blur-md p-1.5 rounded-full border border-slate-700/80 shadow-2xl flex flex-col items-center gap-1 select-none">
              {/* Up Arrow (North) */}
              <button
                onClick={() => handlePan(0, -150)}
                className="w-8 h-8 rounded-full bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-xs active:scale-90 cursor-pointer"
                title="Pan North (Up)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              </button>
              
              <div className="flex items-center gap-1">
                {/* Left Arrow (West) */}
                <button
                  onClick={() => handlePan(-150, 0)}
                  className="w-8 h-8 rounded-full bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-xs active:scale-90 cursor-pointer"
                  title="Pan West (Left)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>

                {/* Center Target Lock / Re-center Button */}
                <button
                  onClick={handleRecenter}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90 cursor-pointer ${
                    isFollowMode 
                      ? 'bg-blue-600 text-white border border-blue-400 shadow-blue-500/50' 
                      : 'bg-slate-800/90 text-sky-400 hover:bg-slate-700 border border-slate-600'
                  }`}
                  title={isFollowMode ? "Target locked (Recenter at zoom 18)" : "Recenter on staff target (Zoom 18)"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                  </svg>
                </button>

                {/* Right Arrow (East) */}
                <button
                  onClick={() => handlePan(150, 0)}
                  className="w-8 h-8 rounded-full bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-xs active:scale-90 cursor-pointer"
                  title="Pan East (Right)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>

              {/* Down Arrow (South) */}
              <button
                onClick={() => handlePan(0, 150)}
                className="w-8 h-8 rounded-full bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-xs active:scale-90 cursor-pointer"
                title="Pan South (Down)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            </div>

            {/* Step Zoom Controls (+ / -) */}
            <div className="bg-slate-900/85 backdrop-blur-md p-1 rounded-full border border-slate-700/80 shadow-2xl flex flex-col items-center gap-1 select-none">
              <button
                onClick={handleZoomIn}
                className="w-8 h-8 rounded-full bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center font-bold text-base transition-all active:scale-90 cursor-pointer"
                title="Zoom In"
              >
                +
              </button>
              <div className="w-5 h-[1px] bg-slate-700/80"></div>
              <button
                onClick={handleZoomOut}
                className="w-8 h-8 rounded-full bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center font-bold text-base transition-all active:scale-90 cursor-pointer"
                title="Zoom Out"
              >
                −
              </button>
            </div>
          </div>

          {/* 3. Bottom Floating Action Controls */}
          <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            {/* Bottom Left: Stop Tracking / Force Ping */}
            <div className="pointer-events-auto">
              {!isLiveActive ? (
                <button 
                  onClick={handleForcePing}
                  disabled={isPinging}
                  className="px-4 py-2 bg-white/95 hover:bg-white text-slate-700 font-semibold text-xs rounded-full shadow-lg border border-slate-200/80 backdrop-blur-md flex items-center gap-2 active:scale-95 transition-all disabled:opacity-70 cursor-pointer"
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
                  className="px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white font-semibold text-xs rounded-full shadow-lg border border-red-500/50 backdrop-blur-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
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
                className="px-4 py-2 bg-blue-600/90 hover:bg-blue-600 text-white font-semibold text-xs rounded-full shadow-lg border border-blue-500/50 backdrop-blur-md flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
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
