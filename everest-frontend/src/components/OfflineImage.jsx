import React, { useState, useEffect } from 'react';
import { saveImageToIDB, getImageFromIDB } from '../utils/idbHelper';

const OfflineImage = ({ src, alt, className, style, fallback }) => {
  const [imgSrc, setImgSrc] = useState('');

  useEffect(() => {
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
        const cachedBase64 = await getImageFromIDB(src);
        if (cachedBase64) {
          if (isMounted) setImgSrc(cachedBase64);
        } else if (navigator.onLine) {
          try {
            const response = await fetch(src);
            if (response.ok) {
              const blob = await response.blob();
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64 = reader.result;
                if (isMounted) setImgSrc(base64);
                await saveImageToIDB(src, base64);
              };
              reader.readAsDataURL(blob);
            } else {
              if (isMounted) setImgSrc(src);
            }
          } catch (err) {
            if (isMounted) setImgSrc(src);
          }
        } else {
          // Offline and not in cache
          if (isMounted) setImgSrc(src);
        }
      } catch (e) {
        console.error("Error caching image", e);
        if (isMounted) setImgSrc(src);
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [src, fallback]);

  // Show a blank space or placeholder while loading
  if (!imgSrc) {
    return <div className={`bg-slate-200 animate-pulse ${className}`} style={style} />;
  }

  return <img src={imgSrc} alt={alt} className={className} style={style} />;
};

export default OfflineImage;
