import { useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Geolocation } from '@capacitor/geolocation';
import { BackgroundGeolocation } from '@capacitor-community/background-geolocation';

export function useLiveTracking(userProfile) {
  const watchIdRef = useRef(null);
  const isWatchingRef = useRef(false);
  const watchdogTimeoutRef = useRef(null);

  useEffect(() => {
    // Only run for staff users with a valid uid
    if (!userProfile?.uid || userProfile?.role === 'admin' || userProfile?.isAdmin) {
      return;
    }

    const staffId = userProfile.uid;
    const trackingDocRef = doc(db, 'staff_tracking', staffId);

    // Initial check to create the document if it doesn't exist
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

    // Helper to get current location and update it
    const pingCurrentLocation = async (isForced = false) => {
      try {
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') return;
        }

        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        
        const updateData = {
          currentLocation: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            updatedAt: new Date().toISOString()
          }
        };

        if (isForced) {
          console.log('[Daemon] Pushed fresh coords:', position.coords.latitude, position.coords.longitude);
          updateData['liveSession.forcePing'] = false;
        }

        await updateDoc(trackingDocRef, updateData);
      } catch (err) {
        console.error("Error getting ping location:", err);
      }
    };

    // Do an initial ping on mount
    pingCurrentLocation();

    // Set up heartbeat every 5 minutes if app is open
    const heartbeatInterval = setInterval(() => {
      if (!isWatchingRef.current) {
        pingCurrentLocation();
      }
    }, 5 * 60 * 1000);

    // Listen to changes in the tracking doc
    const unsubscribe = onSnapshot(trackingDocRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const liveSession = data.liveSession || {};

      // Handle force ping
      if (liveSession.forcePing) {
        console.log('[Daemon] Force Ping detected! Fetching fresh GPS...');
        await pingCurrentLocation(true);
      }

      // Handle live tracking session activation
      if (liveSession.isActive && !isWatchingRef.current) {
        isWatchingRef.current = true;
        
        // 5-Minute Watchdog: Stop live stream if Admin doesn't turn it off
        if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
        watchdogTimeoutRef.current = setTimeout(() => {
          console.log('[Daemon] 5-minute watchdog triggered. Stopping live stream.');
          updateDoc(trackingDocRef, { 'liveSession.isActive': false }).catch(console.error);
        }, 5 * 60 * 1000);
        
        try {
          watchIdRef.current = await BackgroundGeolocation.addWatcher(
            {
              backgroundMessage: "Everest Field Service running in background",
              backgroundTitle: "Active Tracking",
              requestPermissions: true,
              stale: false,
              distanceFilter: 0
            },
            async (position, err) => {
              if (err) {
                console.error("Watch position error:", err);
                return;
              }
              if (!position) return;

              const speedInKmH = position.speed != null && position.speed > 0 
                ? Math.round(position.speed * 3.6) 
                : 0;
              const now = new Date().toISOString();

              const point = {
                lat: position.latitude,
                lng: position.longitude,
                speed: speedInKmH,
                timestamp: now
              };

              // Update live session with new point and current speed
              try {
                await updateDoc(trackingDocRef, {
                  currentLocation: {
                    lat: position.latitude,
                    lng: position.longitude,
                    updatedAt: now
                  },
                  'liveSession.currentSpeed': speedInKmH,
                  'liveSession.heading': position.bearing || 0,
                  'liveSession.lastPingAt': now,
                  'liveSession.routePath': arrayUnion(point)
                });
              } catch (e) {
                console.error("Error updating live tracking:", e);
              }
            }
          );
        } catch (err) {
          console.error("Could not start watch position:", err);
          isWatchingRef.current = false;
        }
      } 
      
      // Handle live tracking session deactivation
      if (!liveSession.isActive && isWatchingRef.current) {
        isWatchingRef.current = false;
        if (watchdogTimeoutRef.current) {
          clearTimeout(watchdogTimeoutRef.current);
          watchdogTimeoutRef.current = null;
        }
        if (watchIdRef.current != null) {
          await BackgroundGeolocation.removeWatcher({ id: watchIdRef.current });
          watchIdRef.current = null;
        }
      }
    });

    return () => {
      clearInterval(heartbeatInterval);
      unsubscribe();
      if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
      if (watchIdRef.current != null) {
        BackgroundGeolocation.removeWatcher({ id: watchIdRef.current }).catch(console.error);
        watchIdRef.current = null;
      }
      isWatchingRef.current = false;
    };
  }, [userProfile]);
}
