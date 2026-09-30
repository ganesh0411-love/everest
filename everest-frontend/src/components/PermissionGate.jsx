import React, { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { MapPin, BatteryCharging, ChevronRight, CheckCircle2, ShieldAlert } from 'lucide-react';

const NativeSettings = registerPlugin('NativeSettings');

const PermissionGate = ({ children }) => {
  const [isLocationGranted, setIsLocationGranted] = useState(true); // default true for web
  const [isChecking, setIsChecking] = useState(false);
  const [batteryOptimizationRequested, setBatteryOptimizationRequested] = useState(false);

  const checkPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsLocationGranted(true);
      return;
    }
    try {
      setIsChecking(true);
      // Check native background location explicitly
      const result = await NativeSettings.checkBackgroundLocationPermission();
      
      if (result && result.granted) {
          setIsLocationGranted(true);
      } else {
          setIsLocationGranted(false);
      }
    } catch (error) {
      console.error('Error checking background permissions', error);
      setIsLocationGranted(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkPermissions();

    // Re-check when app resumes
    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        checkPermissions();
      }
    });

    return () => {
      appStateListener.then(listener => listener.remove());
    };
  }, []);

  const handleOpenSettings = async () => {
    try {
      await NativeSettings.openAppSettings();
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  };

  const handleRequestBatteryExemption = async () => {
    try {
      await NativeSettings.requestBatteryOptimizationExemption();
      setBatteryOptimizationRequested(true);
    } catch (error) {
      console.error('Error requesting battery exemption:', error);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isLocationGranted) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-12 flex flex-col items-center justify-center">
          
          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-8">
            <MapPin size={48} className="text-indigo-600" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 text-center mb-4">
            Location Permission Required
          </h2>
          
          <p className="text-slate-600 text-center text-lg mb-10 leading-relaxed">
            To enable seamless field synchronization and background attendance tracking, please grant <span className="font-bold text-indigo-700">"Allow all the time"</span> in app settings.
          </p>

          <div className="w-full max-w-sm space-y-4">
            <button
              onClick={handleOpenSettings}
              className="w-full bg-indigo-600 text-white font-semibold text-lg py-4 px-6 rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Enable in Settings
              <ChevronRight size={20} />
            </button>
            
            <p className="text-xs text-slate-400 text-center mt-6">
              You will need to select "Permissions" <br/>then "Location" and choose "Allow all the time".
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If location is granted but we haven't asked for battery optimization yet
  if (isLocationGranted && !batteryOptimizationRequested) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-12 flex flex-col items-center justify-center">
          
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-8">
            <BatteryCharging size={48} className="text-orange-600" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 text-center mb-4">
            Battery Optimization
          </h2>
          
          <p className="text-slate-600 text-center text-lg mb-10 leading-relaxed">
            To ensure background tracking is not killed by the system (especially on Oppo/Vivo/Xiaomi devices), please allow the app to run without battery restrictions.
          </p>

          <div className="w-full max-w-sm space-y-4">
            <button
              onClick={handleRequestBatteryExemption}
              className="w-full bg-orange-600 text-white font-semibold text-lg py-4 px-6 rounded-xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Exempt from Restrictions
              <ChevronRight size={20} />
            </button>
            
            <button
              onClick={() => setBatteryOptimizationRequested(true)}
              className="w-full bg-slate-100 text-slate-600 font-medium text-base py-3 px-6 rounded-xl active:scale-95 transition-all mt-2"
            >
              I've already done this
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionGate;
