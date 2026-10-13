import React, { useMemo, useState, useEffect } from 'react';
import { GoogleMap, MarkerF, PolylineF, PolygonF } from '@react-google-maps/api';
import { loadGoogleMaps, getGoogleMapsApiKey } from '../utils/googleMapsLoader';
import { Loader2, AlertCircle } from 'lucide-react';

export const defaultMapOptions = {
  mapTypeId: 'hybrid', // Combines crisp satellite photography with clear survey/road vectors
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true, // Allows field officer to toggle Satellite / Road / Terrain
  fullscreenControl: true,
  tilt: 45 // Enables 3D tilt perspective where high-res imagery is available
};

// Default custom motorbike icon for Google Maps
export function createMotorbikeSvgIcon(heading = 0) {
  const svg = `
    <svg width="36" height="60" viewBox="0 0 36 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading}deg); transform-origin: 18px 30px;">
      <ellipse cx="18" cy="10" rx="3.5" ry="9" fill="#1e293b" />
      <rect x="15" y="14" width="6" height="22" rx="3" fill="#eab308" />
      <ellipse cx="18" cy="48" rx="4" ry="10" fill="#0f172a" />
      <path d="M6 19 L30 19" stroke="#334155" stroke-width="3" stroke-linecap="round" />
      <circle cx="6" cy="19" r="2.5" fill="#f8fafc" />
      <circle cx="30" cy="19" r="2.5" fill="#f8fafc" />
      <ellipse cx="18" cy="27" rx="8" ry="6" fill="#3b82f6" />
      <circle cx="18" cy="24" r="6" fill="#f8fafc" stroke="#0284c7" stroke-width="1.5" />
      <path d="M15 22 Q18 20 21 22" stroke="#0f172a" stroke-width="2" stroke-linecap="round" />
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: typeof window !== 'undefined' && window.google?.maps ? new window.google.maps.Size(36, 60) : undefined,
    anchor: typeof window !== 'undefined' && window.google?.maps ? new window.google.maps.Point(18, 30) : undefined
  };
}

export default function LiveTrackingMap({
  staffLat,
  staffLng,
  staffPosition,
  staffIcon,
  heading = 0,
  trackingHistoryCoordinates = [],
  polygons = [],
  markers = [],
  zoom = 17,
  options = defaultMapOptions,
  className = "w-full h-full",
  onMapLoad,
  mapTypeId = 'hybrid'
}) {
  const [isLoaded, setIsLoaded] = useState(Boolean(typeof window !== 'undefined' && window.google?.maps));
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    loadGoogleMaps()
      .then(() => {
        if (isMounted) setIsLoaded(true);
      })
      .catch((err) => {
        console.warn('Google Maps Load Warning:', err);
        if (isMounted) setLoadError(err);
      });

    return () => { isMounted = false; };
  }, []);

  // Normalize position
  const resolvedPosition = useMemo(() => {
    if (staffPosition && typeof staffPosition.lat === 'number' && typeof staffPosition.lng === 'number') {
      return staffPosition;
    }
    if (typeof staffLat === 'number' && typeof staffLng === 'number' && (staffLat !== 0 || staffLng !== 0)) {
      return { lat: staffLat, lng: staffLng };
    }
    return null;
  }, [staffPosition, staffLat, staffLng]);

  // Normalize breadcrumb trail: handles both [{lat, lng}] and [[lat, lng]]
  const normalizedHistory = useMemo(() => {
    if (!Array.isArray(trackingHistoryCoordinates)) return [];
    return trackingHistoryCoordinates.map(p => {
      if (Array.isArray(p)) return { lat: p[0], lng: p[1] };
      if (p && typeof p.lat === 'number' && typeof p.lng === 'number') return { lat: p.lat, lng: p.lng };
      if (p && typeof p.latitude === 'number' && typeof p.longitude === 'number') return { lat: p.latitude, lng: p.longitude };
      return null;
    }).filter(Boolean);
  }, [trackingHistoryCoordinates]);

  // Combined options
  const mergedOptions = useMemo(() => ({
    ...defaultMapOptions,
    ...options,
    mapTypeId: mapTypeId || options?.mapTypeId || defaultMapOptions.mapTypeId
  }), [options, mapTypeId]);

  // Fallback & Error Guard: Network delay or temporary billing verification wait
  if (loadError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-900 text-slate-300 p-6 ${className}`}>
        <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
        <p className="font-semibold text-sm text-center">Google Maps Field Service Alert</p>
        <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">
          Awaiting API connection. Retrying satellite hybrid imagery link...
        </p>
        <button
          onClick={() => {
            setLoadError(null);
            loadGoogleMaps().then(() => setIsLoaded(true)).catch(setLoadError);
          }}
          className="mt-3 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 ${className}`}>
        <div className="relative mb-3 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-sky-400/30 border-t-sky-400 animate-spin"></div>
          <Loader2 className="w-5 h-5 text-sky-400 absolute animate-pulse" />
        </div>
        <p className="text-xs font-medium text-slate-300">Loading Google Maps Hybrid Satellite...</p>
      </div>
    );
  }

  const center = resolvedPosition || { lat: 10.3673, lng: 77.9803 }; // Default to Dindigul / Tamil Nadu if pending

  const defaultIcon = staffIcon || (window.google?.maps ? createMotorbikeSvgIcon(heading) : undefined);

  return (
    <GoogleMap
      mapContainerClassName={className}
      center={center}
      zoom={zoom}
      options={mergedOptions}
      onLoad={(map) => {
        if (onMapLoad) onMapLoad(map);
      }}
    >
      {/* Staff Location Marker */}
      {resolvedPosition && (
        <MarkerF
          position={resolvedPosition}
          icon={defaultIcon}
          title="Staff Location"
        />
      )}

      {/* Live Breadcrumb Trail / Path */}
      {normalizedHistory.length > 1 && (
        <PolylineF
          path={normalizedHistory}
          options={{
            strokeColor: '#2563EB', // Requirement: strokeColor #2563EB
            strokeWeight: 4,        // Requirement: strokeWeight 4
            strokeOpacity: 0.9,
            geodesic: true
          }}
        />
      )}

      {/* Land Survey Polygons */}
      {polygons.map((poly, idx) => (
        <PolygonF
          key={poly.id || `poly_${idx}`}
          paths={poly.paths || poly.coordinates || poly}
          options={{
            strokeColor: poly.strokeColor || '#10B981',
            strokeOpacity: poly.strokeOpacity || 0.8,
            strokeWeight: poly.strokeWeight || 2,
            fillColor: poly.fillColor || '#10B981',
            fillOpacity: poly.fillOpacity || 0.25,
            ...poly.options
          }}
        />
      ))}

      {/* Extra Survey / Customer Markers */}
      {markers.map((m, idx) => (
        <MarkerF
          key={m.id || `marker_${idx}`}
          position={{ lat: m.lat, lng: m.lng }}
          title={m.title || m.name}
          icon={m.icon}
        />
      ))}
    </GoogleMap>
  );
}
