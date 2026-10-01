import { useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Geolocation } from '@capacitor/geolocation';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

export function useLiveTracking(userProfile) {
  const watchIdRef = useRef(null);
  const isLiveStreamActiveRef = useRef(false);
  const watchdogTimeoutRef = useRef(null);
  const throttleTimerRef = useRef(null);

  useEffect(() => {
    if (!userProfile || userProfile?.role === 'admin' || userProfile?.isAdmin) {
      return;
    }

    const staffId = String(userProfile.staffId || userProfile.id || userProfile.uid);
    if (!staffId || staffId === 'undefined') return;
    
    // Phase 2: Request POST_NOTIFICATIONS for Android 13+ Foreground Service
    const requestNotificationPermission = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          await LocalNotifications.requestPermissions();
        }
      } catch (err) {
        console.error("Error requesting POST_NOTIFICATIONS:", err);
      }
    };
    requestNotificationPermission();

    const trackingDocRef = doc(db, 'staff_tracking', staffId);

    const initializeTrackingDoc = async () => {
      try {
        await setDoc(trackingDocRef, {
          currentLocation: null,
          isLiveTrackingActive: false,
          liveSession: {
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
        }
        await updateDoc(trackingDocRef, updateData);
      } catch (err) {
        console.error("Error getting manual ping:", err);
        if (isForced) {
          await updateDoc(trackingDocRef, { 'liveSession.forcePing': false }).catch(console.error);
        }
      }
    };

    pingCurrentLocation();

    const startWatcher = async (distanceFilter = 0) => {
      if (watchIdRef.current != null) {
        await BackgroundGeolocation.removeWatcher({ id: watchIdRef.current });
        watchIdRef.current = null;
      }
      
      try {
        watchIdRef.current = await BackgroundGeolocation.addWatcher(
          {
            backgroundTitle: "Everest Microfinance",
            backgroundMessage: "Field attendance & collection sync active",
            notificationChannelName: "Field Operations Service",
            notificationChannelId: "everest_field_attendance",
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
            
            const speedInKmH = position.speed != null && position.speed > 0 
              ? Math.round(position.speed * 3.6) 
              : 0;
            const now = new Date().toISOString();
            
            console.log(`[GPS DAEMON] Pushed coords: ${position.latitude}, ${position.longitude} at ${now}`);

            // Standard low-power update payload
            let updatePayload = {
              currentLocation: {
                lat: position.latitude,
                lng: position.longitude,
                updatedAt: now
              }
            };
            
            // Apply standard update
            try {
              await updateDoc(trackingDocRef, updatePayload);
            } catch (e) {
              console.error("Error updating tracking doc:", e);
            }

            // Phase 3: On-Demand Tracking (Throttle writes to ~10s)
            if (isLiveStreamActiveRef.current) {
              if (throttleTimerRef.current) return;
              throttleTimerRef.current = setTimeout(() => {
                throttleTimerRef.current = null;
              }, 10000); // 10-second throttle

              const liveLocRef = doc(db, 'live_locations', staffId);
              setDoc(liveLocRef, {
                lat: position.latitude,
                lng: position.longitude,
                speed: speedInKmH,
                timestamp: now,
                batteryLevel: null // Capacitor device battery plugin not installed, skipping
              }, { merge: true }).catch(console.error);
            }
          }
        );
      } catch (err) {
        console.error("Could not start BackgroundWatcher:", err);
      }
    };

    // Start default 50m battery-saving continuous watcher
    startWatcher(50);

    // Watch for Admin live tracking triggers (Phase 3)
    const unsubscribe = onSnapshot(trackingDocRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const liveSession = data.liveSession || {};
      const isLiveTrackingActive = data.isLiveTrackingActive === true;

      if (liveSession.forcePing) {
        await pingCurrentLocation(true);
      }

      // Admin enabled live tracking -> Aggressive mode (0m filter)
      if (isLiveTrackingActive) {
        if (!isLiveStreamActiveRef.current) {
          isLiveStreamActiveRef.current = true;
          startWatcher(0); // Wakes up GPS Engine with aggressive 0m distance filter
        }
        
        // 10-minute timeout for live tracking safety
        if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
        watchdogTimeoutRef.current = setTimeout(() => {
          console.log('[Daemon] 10-minute tracking timeout triggered. Returning to standby.');
          updateDoc(trackingDocRef, { isLiveTrackingActive: false }).catch(console.error);
        }, 10 * 60 * 1000);
      } 
      
      // Admin turns off live tracking -> Return to low-power standby mode
      if (!isLiveTrackingActive && isLiveStreamActiveRef.current) {
        isLiveStreamActiveRef.current = false;
        if (watchdogTimeoutRef.current) {
          clearTimeout(watchdogTimeoutRef.current);
          watchdogTimeoutRef.current = null;
        }
        startWatcher(50); // Restore 50m filter
      }
    });

    return () => {
      unsubscribe();
      if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      if (watchIdRef.current != null) {
        BackgroundGeolocation.removeWatcher({ id: watchIdRef.current }).catch(console.error);
        watchIdRef.current = null;
      }
    };
  }, [userProfile]);
}
