import { useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Geolocation } from '@capacitor/geolocation';

export function useLiveTracking(userProfile) {
  const watchIdRef = useRef(null);
  const isWatchingRef = useRef(false);

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

        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        
        const updateData = {
          currentLocation: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            updatedAt: new Date().toISOString()
          }
        };

        if (isForced) {
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
        await pingCurrentLocation(true);
      }

      // Handle live tracking session activation
      if (liveSession.isActive && !isWatchingRef.current) {
        isWatchingRef.current = true;
        
        try {
          const permissions = await Geolocation.checkPermissions();
          if (permissions.location !== 'granted') {
            await Geolocation.requestPermissions();
          }

          watchIdRef.current = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, distanceFilter: 0 },
            async (position, err) => {
              if (err) {
                console.error("Watch position error:", err);
                return;
              }
              if (!position) return;

              const speedInKmH = position.coords.speed ? (position.coords.speed * 3.6) : 0;
              const now = new Date().toISOString();

              const point = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                speed: speedInKmH,
                timestamp: now
              };

              // Update live session with new point and current speed
              try {
                await updateDoc(trackingDocRef, {
                  currentLocation: {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    updatedAt: now
                  },
                  'liveSession.currentSpeed': speedInKmH,
                  'liveSession.heading': position.coords.heading || 0,
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
        if (watchIdRef.current != null) {
          await Geolocation.clearWatch({ id: watchIdRef.current });
          watchIdRef.current = null;
        }
      }
    });

    return () => {
      clearInterval(heartbeatInterval);
      unsubscribe();
      if (watchIdRef.current != null) {
        Geolocation.clearWatch({ id: watchIdRef.current }).catch(console.error);
        watchIdRef.current = null;
      }
      isWatchingRef.current = false;
    };
  }, [userProfile]);
}
