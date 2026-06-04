import React, { useState, useEffect } from 'react';

const OfflineImage = ({ src, alt, className, style, fallback }) => {
  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    let isMounted = true;

    const loadImage = async () => {
      if (!src) {
        if (isMounted) setImgSrc(fallback || '');
        return;
      }
      
      // If it's already a local data URI or blob URL, just use it
      if (src.startsWith('data:') || src.startsWith('blob:')) {
        if (isMounted) setImgSrc(src);
        return;
      }

      try {
        const cache = await caches.open('everest-image-cache');
        const cachedResponse = await cache.match(src);
        
        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          objectUrl = URL.createObjectURL(blob);
          if (isMounted) setImgSrc(objectUrl);
        } else {
          // If not in cache and online, fetch it
          if (navigator.onLine) {
            try {
              const fetchResponse = await fetch(src);
              if (fetchResponse.ok) {
                // Cache it for future offline use
                cache.put(src, fetchResponse.clone());
                const blob = await fetchResponse.blob();
                objectUrl = URL.createObjectURL(blob);
                if (isMounted) setImgSrc(objectUrl);
              } else {
                if (isMounted) setImgSrc(src);
              }
            } catch (err) {
              // Might fail due to CORS, fallback to normal src
              if (isMounted) setImgSrc(src);
            }
          } else {
            // Offline and not in cache
            if (isMounted) setImgSrc(src); // Let native browser cache try, or fail
          }
        }
      } catch (error) {
        console.warn("Offline image cache error:", error);
        if (isMounted) setImgSrc(src);
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, fallback]);

  // Show a blank space or placeholder while loading
  if (!imgSrc) {
    return <div className={`bg-slate-200 animate-pulse ${className}`} style={style} />;
  }

  return <img src={imgSrc} alt={alt} className={className} style={style} />;
};

export default OfflineImage;
