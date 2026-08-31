import React, { useState, useEffect } from 'react';
import { saveImageToIDB, getImageFromIDB } from '../utils/idbHelper';

const API_BASE = import.meta.env?.VITE_API_BASE_URL || 'https://everest-backend-f9nt.onrender.com';


const OfflineImage = ({ src, alt, className, style, fallback }) => {
  const [imgSrc, setImgSrc] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      if (!src) {
        if (isMounted) setImgSrc(fallback || '');
        return;
      }
      
      // Rewrite legacy paths to the live backend API
      let targetSrc = src;
      if (targetSrc.startsWith('/')) {
        targetSrc = `${API_BASE}${targetSrc}`;
      }
      if (targetSrc.includes('localhost:5000')) {
        targetSrc = targetSrc.replace('http://localhost:5000', API_BASE);
      }
      
      // If it's already a local data URI or blob URL, just use it
      if (targetSrc.startsWith('data:') || targetSrc.startsWith('blob:')) {
        if (isMounted) setImgSrc(targetSrc);
        return;
      }

      try {
        const cachedBase64 = await getImageFromIDB(targetSrc);
        if (cachedBase64) {
          if (isMounted) setImgSrc(cachedBase64);
        } else if (navigator.onLine) {
          try {
            const response = await fetch(targetSrc);
            if (response.ok) {
              const blob = await response.blob();
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64 = reader.result;
                if (isMounted) setImgSrc(base64);
                await saveImageToIDB(targetSrc, base64);
              };
              reader.readAsDataURL(blob);
            } else {
              if (isMounted) setImgSrc(targetSrc);
            }
          } catch (err) {
            if (isMounted) setImgSrc(targetSrc);
          }
        } else {
          // Offline and not in cache
          if (isMounted) setImgSrc(targetSrc);
        }
      } catch (e) {
        console.error("Error caching image", e);
        if (isMounted) setImgSrc(targetSrc);
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

  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className={className} 
      style={style} 
      onError={(e) => {
        if (fallback && imgSrc !== fallback) {
          setImgSrc(fallback);
        } else {
          e.target.style.display = 'none';
        }
      }} 
    />
  );
};

export default OfflineImage;
