import React, { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { MapPin, ChevronRight } from 'lucide-react';

const NativeSettings = registerPlugin('NativeSettings');

const PermissionGate = ({ children }) => {
  const [isOnboarded, setIsOnboarded] = useState(() => {
    return localStorage.getItem('field_sync_onboarded') === 'true';
  });
  
  const [isLocationGranted, setIsLocationGranted] = useState(true); // Default true
  const [isChecking, setIsChecking] = useState(false);

  const checkPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsLocationGranted(true);
      return;
    }
    
    // Check persistence lock first
    if (localStorage.getItem('field_sync_onboarded') === 'true') {
      setIsOnboarded(true);
      setIsLocationGranted(true);
      return;
    }

    try {
      setIsChecking(true);
      // Check native background location explicitly
      const result = await NativeSettings.checkBackgroundLocationPermission();
      
      if (result && result.granted) {
          setIsLocationGranted(true);
          completeOnboarding();
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

  const completeOnboarding = () => {
    localStorage.setItem('field_sync_onboarded', 'true');
    setIsOnboarded(true);
    setIsLocationGranted(true);
  };

  useEffect(() => {
    if (!isOnboarded) {
      checkPermissions();

      // Re-check when app resumes
      const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
        if (isActive && !isOnboarded) {
          checkPermissions();
        }
      });

      return () => {
        appStateListener.then(listener => listener.remove());
      };
    }
  }, [isOnboarded]);

  const handleContinue = async () => {
    try {
      // First attempt to open app settings to allow the user to enable permissions
      await NativeSettings.openAppSettings();
      // We do not call battery exemption here anymore to avoid native battery drain dialogs!
    } catch (error) {
      console.error('Error opening settings:', error);
    }
    // We let the appStateListener pick up when they return from settings, or they can just complete onboarding if we want.
    // However, if the user continues, we want to make sure it actually opens settings.
  };

  const handleSkip = () => {
      // Even if they skip or close, we can lock it so they are never bothered again.
      completeOnboarding();
  };

  if (isOnboarded) {
    return <>{children}</>;
  }

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
          
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8">
            <MapPin size={48} className="text-indigo-600" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 text-center mb-4">
            Everest Field Operations
          </h2>
          
          <p className="text-slate-600 text-center text-lg mb-10 leading-relaxed">
            Enable daily field synchronization and offline attendance updates with the branch.
          </p>

          <div className="w-full max-w-sm space-y-4">
            <button
              onClick={handleContinue}
              className="w-full bg-indigo-600 text-white font-semibold text-lg py-4 px-6 rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Continue to Dashboard
              <ChevronRight size={20} />
            </button>
            <button
              onClick={handleSkip}
              className="w-full bg-slate-100 text-slate-600 font-medium text-base py-3 px-6 rounded-xl active:scale-95 transition-all mt-2"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionGate;
