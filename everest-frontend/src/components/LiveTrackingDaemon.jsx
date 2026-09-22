import React from 'react';
import { useLiveTracking } from '../hooks/useLiveTracking';

export default function LiveTrackingDaemon({ userProfile }) {
  useLiveTracking(userProfile);
  return null;
}
