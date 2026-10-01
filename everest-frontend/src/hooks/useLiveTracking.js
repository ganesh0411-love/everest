import { useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Geolocation } from '@capacitor/geolocation';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

export function useLiveTracking(userProfile) {
  const watchIdRef = useRef(null);
  const isLiveStreamActiveRef = useRef(false);
  const watchdogTimeoutRef = useRef(null);
  const throttleTimerRef = useRef(null);
  const lastLiveUpdateRef = useRef(0);

  useEffect(() => {
    if (!userProfile || userProfile?.role === 'admin' || userProfile?.isAdmin) {
      return;
    }

    const staffId = String(userProfile.staffId || userProfile.id || userProfile.uid);
    if (!staffId || staffId === 'undefined') return;
    
    // Phase 1: True Android Foreground Service to keep WebView alive
    const startTrueForegroundService = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          await ForegroundService.requestPermissions().catch(console.error);
          await ForegroundService.startForegroundService({
            id: 9001,
            title: 'Everest Microfinance',
            body: 'Field attendance & collection sync active',
            smallIcon: 'ic_launcher_background',
          });
          console.log("Foreground service successfully started");
        }
      } catch (err) {
        console.error("Foreground service failed to start:", err);
      }
    };
    startTrueForegroundService();

    const trackingDocRef = doc(db, 'staff_tracking', staffId);

    const initializeTrackingDoc = async () => {
      try {
        await setDoc(trackingDocRef, {
          currentLocation: null,
          isLiveTrackingActive: false,
          forcePingAt: null
        }, { merge: true });
      } catch (err) {
        console.error("Error initializing tracking doc:", err);
      }
    };
    initializeTrackingDoc();

    // High Priority GPS Fetch Dispatcher
    const dispatchImmediateGPSFetch = async (isForced = false) => {
      try {
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
        const now = new Date().toISOString();
        
        // 1. Write to live_locations immediately
        const liveLocRef = doc(db, 'live_locations', staffId);
        await setDoc(liveLocRef, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading || 0,
          updatedAt: serverTimestamp(),
          isLive: true
        }, { merge: true });

        // 2. Update staff_tracking state
        const updateData = {
          lastPingReceivedAt: serverTimestamp(),
          currentLocation: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            updatedAt: now
          }
        };

        if (isForced) {
          updateData['liveSession.forcePing'] = false;
        }

        await updateDoc(trackingDocRef, updateData);
        console.log('[GPS DISPATCH] Dispatched high-priority ping to Firestore');
      } catch (err) {
        console.error("Error dispatching immediate GPS fetch:", err);
      }
    };

    dispatchImmediateGPSFetch();

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
            
            // Standard low-power update payload
            let updatePayload = {
              currentLocation: {
                lat: position.latitude,
                lng: position.longitude,
                updatedAt: now
              }
            };
            
            try {
              await updateDoc(trackingDocRef, updatePayload);
            } catch (e) {
              console.error("Error updating tracking doc:", e);
            }

            // Phase 3 & 4: On-Demand Tracking (Throttle background watcher writes to ~10s using timestamps to avoid WebView background throttling of setTimeout)
            if (isLiveStreamActiveRef.current) {
              const currentTime = Date.now();
              if (currentTime - lastLiveUpdateRef.current < 10000) return;
              lastLiveUpdateRef.current = currentTime;

              const liveLocRef = doc(db, 'live_locations', staffId);
              setDoc(liveLocRef, {
                latitude: position.latitude,
                longitude: position.longitude,
                speed: speedInKmH,
                updatedAt: serverTimestamp(),
                batteryLevel: null,
                isLive: true,
                heading: position.bearing || 0
              }, { merge: true }).catch(console.error);

              // Maintain a running history of points in staff_tracking for the glowing trail
              updateDoc(trackingDocRef, {
                'liveSession.routePath': arrayUnion({ lat: position.latitude, lng: position.longitude })
              }).catch(e => console.error("Error updating route path:", e));
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
    let lastForcePingRef = 0;
    
    const unsubscribe = onSnapshot(trackingDocRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const isLiveTrackingActive = data.isLiveTrackingActive === true;

      // React to Force Ping Trigger immediately
      const forcePingTime = data.forcePingAt?.toMillis ? data.forcePingAt.toMillis() : data.forcePingAt;
      if (forcePingTime && forcePingTime > lastForcePingRef) {
        lastForcePingRef = forcePingTime;
        await dispatchImmediateGPSFetch(true);
      }

      // Admin enabled live tracking -> Aggressive mode
      if (isLiveTrackingActive) {
        if (!isLiveStreamActiveRef.current) {
          isLiveStreamActiveRef.current = true;
          // Immediate ping upon activation
          dispatchImmediateGPSFetch(false);
          // Wakes up GPS Engine with aggressive 0m distance filter
          startWatcher(0);
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
