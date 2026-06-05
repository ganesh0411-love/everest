import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg, { removeBackgroundFromImage } from '../utils/cropImage';
import { Eraser } from 'lucide-react';

const ImageCropModal = ({ imageSrc, onCropComplete, onCancel }) => {
  const [localImageSrc, setLocalImageSrc] = useState(imageSrc);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (crop) => setCrop(crop);
  const onZoomChange = (zoom) => setZoom(zoom);

  const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleRemoveBg = async () => {
    setIsProcessing(true);
    try {
      const transparentImage = await removeBackgroundFromImage(localImageSrc);
      setLocalImageSrc(transparentImage);
    } catch (e) {
      console.error('BG Removal Error', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(localImageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
      onCancel();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col animate-in fade-in duration-200">
      <div className="flex-1 relative">
        <Cropper
          image={localImageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={onZoomChange}
        />
      </div>
      <div className="p-6 bg-slate-900 pb-10">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-white text-sm font-bold">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(e.target.value)}
            className="w-full accent-brand-blue"
          />
        </div>
        <div className="flex justify-between gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold active:bg-slate-700 text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleRemoveBg}
            disabled={isProcessing}
            className="flex-[1.5] py-3 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50 text-sm sm:text-base"
          >
            <Eraser className="w-4 h-4" />
            Remove BG
          </button>
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="flex-1 py-3 bg-brand-blue text-white rounded-xl font-bold active:bg-blue-600 disabled:opacity-50 text-sm sm:text-base"
          >
            {isProcessing ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
