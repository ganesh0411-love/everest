import React, { useEffect, useRef, useState } from 'react';
import './SplashVideo.css';

const SplashVideo = ({ onComplete }) => {
  const videoRef = useRef(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    // 5.5 second timeout as a fallback (1.0s to 6.0s duration)
    const timer = setTimeout(() => {
      onComplete();
    }, 5500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      // Ensure time is set to 1.0 even if media fragment is ignored
      videoRef.current.currentTime = 1.0; 
    }
  };

  const handleTimeUpdate = () => {
    // Let the video run until 6.0s so the arrow animation fully completes
    if (videoRef.current && videoRef.current.currentTime >= 6.0) {
      onComplete();
    }
  };

  return (
    <div className="splash-video-container">
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        onCanPlay={() => setIsVideoReady(true)}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onComplete}
        className="splash-video"
        style={{ opacity: isVideoReady ? 1 : 0, transition: 'opacity 0.2s ease-in' }}
      >
        <source src="/splash_video.mp4#t=1.0" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default SplashVideo;
