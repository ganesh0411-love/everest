import { useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db, auth, firebaseConfig } from '../firebase';
import { Geolocation } from '@capacitor/geolocation';
import { registerPlugin, Capacitor } from '@capacitor/core';

const NativeLocation = registerPlugin('NativeLocation');

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

// Global state to persist background service across component unmounts
let globalWatchId = null;
let globalIsLiveStreamActive = false;
let globalWatchdogTimeout = null;
let globalThrottleTimer = null;
let globalLastLiveUpdate = 0;
let globalUnsubscribe = null;

export function useLiveTracking(userProfile) {

  useEffect(() => {
    if (!userProfile || userProfile?.role === 'admin' || userProfile?.isAdmin) {
      return;
    }

    const staffId = String(userProfile.staffId || userProfile.id || userProfile.uid);
    if (!staffId || staffId === 'undefined') return;
    
    // Phase 1: True Android Foreground Service for REST API Dispatch
    const startNativeLocation = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const token = await auth.currentUser?.getIdToken();
          await NativeLocation.startService({
            staffId: staffId,
            projectId: firebaseConfig.projectId,
            apiKey: firebaseConfig.apiKey,
            authToken: token || ''
          });
          console.log("Native location foreground service started");
        }
      } catch (err) {
        console.error("Foreground service failed to start:", err);
      }
    };
    const stopNativeLocation = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          await NativeLocation.stopService();
        }
      } catch (err) {}
    };

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
      if (globalWatchId != null) {
        await BackgroundGeolocation.removeWatcher({ id: globalWatchId });
        globalWatchId = null;
      }
      
      try {
        globalWatchId = await BackgroundGeolocation.addWatcher(
          {
            backgroundTitle: "Everest Microfinance",
            backgroundMessage: "Field attendance & collection sync active",
            notificationChannelName: "Field Operations Service",
            notificationChannelId: "everest_field_attendance",
            requestPermissions: true,
            stale: false,
            distanceFilter: distanceFilter,
            interval: 2000,
            enableHighAccuracy: true,
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

            // Phase 3 & 4: On-Demand Tracking (Throttle background watcher writes to ~2s)
            if (globalIsLiveStreamActive) {
              const currentTime = Date.now();
              if (currentTime - globalLastLiveUpdate < 2000) return;
              globalLastLiveUpdate = currentTime;

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
    
    if (globalUnsubscribe) {
      globalUnsubscribe();
    }
    
    globalUnsubscribe = onSnapshot(trackingDocRef, async (snapshot) => {
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
        if (!globalIsLiveStreamActive) {
          globalIsLiveStreamActive = true;
          // Immediate ping upon activation
          dispatchImmediateGPSFetch(false);
          // Wakes up GPS Engine with aggressive 0m distance filter
          startWatcher(0);
          // Trigger the true headless native service
          startNativeLocation();
        }
        
        // 10-minute timeout for live tracking safety
        if (globalWatchdogTimeout) clearTimeout(globalWatchdogTimeout);
        globalWatchdogTimeout = setTimeout(() => {
          console.log('[Daemon] 10-minute tracking timeout triggered. Returning to standby.');
          updateDoc(trackingDocRef, { isLiveTrackingActive: false }).catch(console.error);
        }, 10 * 60 * 1000);
      } 
      
      // Admin turns off live tracking -> Return to low-power standby mode
      if (!isLiveTrackingActive && globalIsLiveStreamActive) {
        globalIsLiveStreamActive = false;
        if (globalWatchdogTimeout) {
          clearTimeout(globalWatchdogTimeout);
          globalWatchdogTimeout = null;
        }
        startWatcher(50); // Restore 50m filter
        // Stop the native location service
        stopNativeLocation();
      }
    });

    return () => {
      // Intentionally NOT stopping BackgroundGeolocation so the service persists!
      // unsubscribe() can be called to avoid multiple listeners if remounted,
      // but if the service stays alive, we want it to keep updating when Admin forces ping!
      // We will only clear timeouts to prevent memory leaks on unmount.
      if (globalWatchdogTimeout) clearTimeout(globalWatchdogTimeout);
      if (globalThrottleTimer) clearTimeout(globalThrottleTimer);
      // Removed unsubscribe() so the listener doesn't die!
    };
  }, [userProfile]);
}
