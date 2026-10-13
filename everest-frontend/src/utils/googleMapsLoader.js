// Google Maps JavaScript API Central Loader
// Guarantees singleton script injection, error resilience, and graceful fallback

const DEFAULT_API_KEY = "AIzaSyAvKl6gEhT_3Nv0L0_lvLEMv-QOEjb0f0k";

let loadPromise = null;

export function getGoogleMapsApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || DEFAULT_API_KEY;
}

export function loadGoogleMaps(apiKey = getGoogleMapsApiKey()) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));

  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    // Check if script element already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
        return;
      }
      existingScript.addEventListener('load', () => {
        if (window.google && window.google.maps) resolve(window.google.maps);
        else reject(new Error('Google Maps script loaded but window.google.maps not found'));
      });
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,drawing&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;

    const timeout = setTimeout(() => {
      reject(new Error('Google Maps load timeout (15s)'));
    }, 15000);

    script.onload = () => {
      clearTimeout(timeout);
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        // Fallback check after small tick
        setTimeout(() => {
          if (window.google && window.google.maps) resolve(window.google.maps);
          else reject(new Error('Google Maps loaded but api missing'));
        }, 100);
      }
    };

    script.onerror = (err) => {
      clearTimeout(timeout);
      loadPromise = null;
      reject(err || new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
