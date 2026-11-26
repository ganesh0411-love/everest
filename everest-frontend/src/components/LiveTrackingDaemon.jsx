import React from 'react';
import { Capacitor } from '@capacitor/core';
import { useLiveTracking } from '../hooks/useLiveTracking';

function NativeTrackingRunner({ userProfile }) {
  useLiveTracking(userProfile);
  return null;
}

export default function LiveTrackingDaemon({ userProfile }) {
  // Guard native background GPS and foreground tracking service strictly to Android native runtime
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  return <NativeTrackingRunner userProfile={userProfile} />;
}
