import { useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Geolocation } from '@capacitor/geolocation';
import { registerPlugin } from '@capacitor/core';
const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

export function useLiveTracking(userProfile) {
  const watchIdRef = useRef(null);
  const isLiveStreamActiveRef = useRef(false);
  const watchdogTimeoutRef = useRef(null);

  useEffect(() => {
    if (!userProfile || userProfile?.role === 'admin' || userProfile?.isAdmin) {
      return;
    }

    const staffId = String(userProfile.staffId || userProfile.id || userProfile.uid);
    if (!staffId || staffId === 'undefined') return;
    
    const trackingDocRef = doc(db, 'staff_tracking', staffId);

    const initializeTrackingDoc = async () => {
      try {
        await setDoc(trackingDocRef, {
          currentLocation: null,
          liveSession: {
            isActive: false,
            requestedBy: null,
            lastPingAt: null,
            currentSpeed: 0,
            heading: 0,
            routePath: [],
            forcePing: false
          }
        }, { merge: true });
      } catch (err) {
        console.error("Error initializing tracking doc:", err);
      }
    };
    initializeTrackingDoc();

    // Helper for manual ping
    const pingCurrentLocation = async (isForced = false) => {
      try {
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
        const now = new Date().toISOString();
        const updateData = {
          currentLocation: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            updatedAt: now
          }
        };
        if (isForced) {
          console.log('[GPS DAEMON] Pushed coords (Forced):', position.coords.latitude, position.coords.longitude, 'at', now);
          updateData['liveSession.forcePing'] = false;
          updateData['liveSession.currentSpeed'] = Math.round((position.coords.speed || 0) * 3.6);
          updateData['liveSession.heading'] = position.coords.heading || 0;
        }
        await updateDoc(trackingDocRef, updateData);
      } catch (err) {
        console.error("Error getting manual ping:", err);
        if (isForced) {
          await updateDoc(trackingDocRef, { 'liveSession.forcePing': false }).catch(console.error);
        }
      }
    };

    // Initial setup ping
    pingCurrentLocation();

    const startWatcher = async (distanceFilter = 0) => {
      if (watchIdRef.current != null) {
        await BackgroundGeolocation.removeWatcher({ id: watchIdRef.current });
        watchIdRef.current = null;
      }
      
      try {
        watchIdRef.current = await BackgroundGeolocation.addWatcher(
          {
            backgroundTitle: "Everest Micro Finance",
            backgroundMessage: "Field Operations Sync Active",
            requestPermissions: true,
            stale: false,
            distanceFilter: distanceFilter,
            autoStart: true
          },
          async (position, err) => {
            if (err) {
              console.error("Watch position error:", err);
              return;
            }
            if (!position) return;
            
            // Accept all coords including mock locations in debug builds
            const speedInKmH = position.speed != null && position.speed > 0 
              ? Math.round(position.speed * 3.6) 
              : 0;
            const now = new Date().toISOString();
            
            console.log(`[GPS DAEMON] Pushed coords: ${position.latitude}, ${position.longitude} at ${now}`);

            const point = {
              lat: position.latitude,
              lng: position.longitude,
              speed: speedInKmH,
              timestamp: now
            };

            try {
              let updatePayload = {
                currentLocation: {
                  lat: position.latitude,
                  lng: position.longitude,
                  updatedAt: now
                }
              };
              
              if (isLiveStreamActiveRef.current) {
                updatePayload['liveSession.currentSpeed'] = speedInKmH;
                updatePayload['liveSession.heading'] = position.bearing || 0;
                updatePayload['liveSession.lastPingAt'] = now;
                updatePayload['liveSession.routePath'] = arrayUnion(point);
              }
              await updateDoc(trackingDocRef, updatePayload);
            } catch (e) {
              console.error("Error updating tracking doc:", e);
            }
          }
        );
      } catch (err) {
        console.error("Could not start BackgroundWatcher:", err);
      }
    };

    // Start default 50m battery-saving continuous watcher
    startWatcher(50);

    // Watch for Admin live tracking triggers
    const unsubscribe = onSnapshot(trackingDocRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const liveSession = snapshot.data().liveSession || {};

      if (liveSession.forcePing) {
        await pingCurrentLocation(true);
      }

      // Switch to 0m aggressive filter if Admin requests it and manage watchdog
      if (liveSession.isActive) {
        if (!isLiveStreamActiveRef.current) {
          isLiveStreamActiveRef.current = true;
          // Re-init watcher with 0m filter for fluid streaming
          startWatcher(0);
        }
        
        // Rolling 60s heartbeat watchdog: Every snapshot (including heartbeat) resets this timer.
        // If no heartbeat arrives for 60 seconds, gracefully fallback.
        if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
        watchdogTimeoutRef.current = setTimeout(() => {
          console.log('[Daemon] 60-second watchdog triggered (Admin disconnected). Stopping live stream.');
          updateDoc(trackingDocRef, { 'liveSession.isActive': false }).catch(console.error);
        }, 60 * 1000);
      } 
      
      // Admin turns off live tracking -> fallback to 50m filter
      if (!liveSession.isActive && isLiveStreamActiveRef.current) {
        isLiveStreamActiveRef.current = false;
        if (watchdogTimeoutRef.current) {
          clearTimeout(watchdogTimeoutRef.current);
          watchdogTimeoutRef.current = null;
        }
        startWatcher(50);
      }
    });

    return () => {
      unsubscribe();
      if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
      if (watchIdRef.current != null) {
        BackgroundGeolocation.removeWatcher({ id: watchIdRef.current }).catch(console.error);
        watchIdRef.current = null;
      }
    };
  }, [userProfile]);
}
