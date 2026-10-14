// Google Maps JavaScript API Central Loader
// Guarantees singleton script injection, error resilience, and graceful fallback

const DEFAULT_API_KEY = "AIzaSyAvKl6gEhT_3Nv0L0_lvLEMv-QOEjb0f0k";

let loadPromise = null;

export function getGoogleMapsApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || DEFAULT_API_KEY;
}

export function isGoogleMapsLoaded() {
  return (
    typeof window !== 'undefined' &&
    typeof window.google === 'object' &&
    window.google !== null &&
    typeof window.google.maps === 'object' &&
    window.google.maps !== null &&
    typeof window.google.maps.Map === 'function'
  );
}

export function loadGoogleMaps(apiKey = getGoogleMapsApiKey()) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));

  if (isGoogleMapsLoaded()) {
    return Promise.resolve(window.google.maps);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    if (isGoogleMapsLoaded()) {
      resolve(window.google.maps);
      return;
    }

    let pollInterval = null;
    let timeoutId = null;

    const cleanup = () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };

    const handleSuccess = () => {
      cleanup();
      resolve(window.google.maps);
    };

    // Global callback explicitly triggered by Google Maps when Map constructor is ready
    window.__initGoogleMap = () => {
      if (isGoogleMapsLoaded()) {
        handleSuccess();
      }
    };

    // Active polling fallback in case callback or events fire out of order
    pollInterval = setInterval(() => {
      if (isGoogleMapsLoaded()) {
        handleSuccess();
      }
    }, 60);

    timeoutId = setTimeout(() => {
      cleanup();
      if (isGoogleMapsLoaded()) {
        resolve(window.google.maps);
      } else {
        loadPromise = null;
        reject(new Error('Google Maps initialization timeout: window.google.maps.Map is not ready'));
      }
    }, 20000);

    // Check if script element already exists in document
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (isGoogleMapsLoaded()) handleSuccess();
      });
      existingScript.addEventListener('error', (err) => {
        cleanup();
        loadPromise = null;
        reject(err || new Error('Failed to load existing Google Maps script'));
      });
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,drawing&callback=__initGoogleMap`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (isGoogleMapsLoaded()) {
        handleSuccess();
      }
    };

    script.onerror = (err) => {
      cleanup();
      loadPromise = null;
      reject(err || new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
