import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg, { removeBackgroundFromImage } from '../utils/cropImage';
import { Eraser, Palette, Check, ArrowLeft, Wand2 } from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';

const bgColors = [
  { id: 'transparent', label: 'Transparent', value: 'transparent', class: 'bg-transparent border border-dashed border-slate-400' },
  { id: 'white', label: 'White', value: '#ffffff', class: 'bg-white border border-slate-200' },
  { id: 'blue', label: 'Corporate Blue', value: '#e0f2fe', class: 'bg-sky-100 border border-sky-200' },
  { id: 'gray', label: 'Studio Gray', value: '#f1f5f9', class: 'bg-slate-100 border border-slate-200' },
  { id: 'dark', label: 'Dark Mode', value: '#1e293b', class: 'bg-slate-800 border border-slate-700' }
];

const ImageCropModal = ({ imageSrc, onCropComplete, onCancel }) => {
  const [localImageSrc, setLocalImageSrc] = useState(imageSrc);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');

  // AI Background Removal States
  const [step, setStep] = useState('crop'); // 'crop' | 'bg_removal'
  const [transparentBlobUrl, setTransparentBlobUrl] = useState(null);
  const [selectedBgColor, setSelectedBgColor] = useState('transparent');

  const onCropChange = (crop) => setCrop(crop);
  const onZoomChange = (zoom) => setZoom(zoom);

  const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // FAST LOCAL REMOVAL (Original Logic)
  const handleRemoveBgFast = async () => {
    setIsProcessing(true);
    setProgress('Removing...');
    try {
      const transparentImage = await removeBackgroundFromImage(localImageSrc);
      setLocalImageSrc(transparentImage);
    } catch (e) {
      console.error('BG Removal Error', e);
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  // HEAVY AI REMOVAL (Isolated Logic)
  const handleRemoveBgAI = async () => {
    try {
      setIsProcessing(true);
      setProgress('Cropping...');
      const croppedImageB64 = await getCroppedImg(localImageSrc, croppedAreaPixels);
      
      setProgress('AI analyzing subject...');
      const blob = await removeBackground(croppedImageB64, {
        progress: (key, current, total) => {
          setProgress(`AI: ${Math.round((current / total) * 100)}%`);
        }
      });
      
      const url = URL.createObjectURL(blob);
      setTransparentBlobUrl(url);
      setStep('bg_removal');
    } catch (e) {
      console.error('AI BG Removal Error', e);
      alert('Failed to run AI model. Please check network connectivity or try again.');
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  const handleFinalSave = async () => {
    try {
      setIsProcessing(true);
      setProgress('Saving...');
      
      if (step === 'crop') {
        const croppedImage = await getCroppedImg(localImageSrc, croppedAreaPixels);
        onCropComplete(croppedImage);
      } else {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = transparentBlobUrl;
        });

        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (selectedBgColor !== 'transparent') {
          ctx.fillStyle = selectedBgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);
        
        const mimeType = selectedBgColor === 'transparent' ? 'image/png' : 'image/jpeg';
        const finalBase64 = canvas.toDataURL(mimeType, 0.9);
        
        onCropComplete(finalBase64);
      }
    } catch (e) {
      console.error('Final Save Error', e);
      onCancel();
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  useEffect(() => {
    return () => {
      if (transparentBlobUrl) URL.revokeObjectURL(transparentBlobUrl);
    };
  }, [transparentBlobUrl]);

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col animate-in fade-in duration-200">
      
      {/* Viewport Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        
        {/* Top Left AI Button */}
        {step === 'crop' && (
          <div className="absolute top-4 left-4 z-20">
            <button 
              onClick={handleRemoveBgAI}
              disabled={isProcessing}
              className="bg-slate-900/80 backdrop-blur border border-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-brand-blue/90 hover:border-brand-blue transition-colors shadow-lg"
            >
              <Wand2 className="w-4 h-4 text-purple-400" />
              Advanced AI
            </button>
          </div>
        )}

        {step === 'crop' ? (
          <Cropper
            image={localImageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={onZoomChange}
          />
        ) : (
          <div className="w-full h-full p-8 flex items-center justify-center pattern-bg">
            <style>{`
              .pattern-bg {
                background-image: linear-gradient(45deg, #1f2937 25%, transparent 25%, transparent 75%, #1f2937 75%, #1f2937),
                                  linear-gradient(45deg, #1f2937 25%, transparent 25%, transparent 75%, #1f2937 75%, #1f2937);
                background-size: 20px 20px;
                background-position: 0 0, 10px 10px;
              }
              .custom-scrollbar::-webkit-scrollbar {
                height: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.05);
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.2);
                border-radius: 4px;
              }
            `}</style>
            <div 
              className="relative rounded-2xl overflow-hidden shadow-2xl transition-colors duration-300 w-full max-w-sm aspect-square flex items-center justify-center"
              style={{ backgroundColor: selectedBgColor !== 'transparent' ? selectedBgColor : 'transparent' }}
            >
              {selectedBgColor === 'transparent' && (
                <div className="absolute inset-0 pattern-bg opacity-50"></div>
              )}
              <img src={transparentBlobUrl} alt="Isolated Subject" className="relative z-10 w-full h-full object-contain" />
            </div>
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(16,163,127,0.5)]"></div>
            <p className="text-white font-bold tracking-widest uppercase text-sm animate-pulse drop-shadow-md">{progress || 'Processing...'}</p>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="p-6 bg-slate-900 pb-10 border-t border-slate-800 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        
        {step === 'crop' ? (
          <>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-white text-sm font-bold">Zoom</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(e.target.value)}
                className="w-full accent-brand-blue"
              />
            </div>
            <div className="flex justify-between gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3.5 bg-slate-800 text-white rounded-xl font-bold active:bg-slate-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveBgFast}
                disabled={isProcessing}
                className="flex-[1.5] py-3.5 bg-slate-700 text-white rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 text-sm disabled:opacity-70"
              >
                <Eraser className="w-4 h-4" />
                Remove BG
              </button>
              <button
                onClick={handleFinalSave}
                disabled={isProcessing}
                className="flex-1 py-3.5 bg-brand-blue text-white rounded-xl font-bold active:bg-blue-600 text-sm disabled:opacity-70"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">Background Options</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {bgColors.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBgColor(bg.value)}
                    className={`flex flex-col items-center gap-2 shrink-0 group`}
                  >
                    <div className={`w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center ${bg.class} ${selectedBgColor === bg.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg' : 'opacity-70 group-hover:opacity-100 hover:scale-105'}`}>
                      {selectedBgColor === bg.value && <Check className={`w-5 h-5 ${bg.id === 'white' || bg.id === 'gray' || bg.id === 'blue' ? 'text-slate-800' : 'text-white'}`} />}
                    </div>
                    <span className={`text-[10px] font-bold ${selectedBgColor === bg.value ? 'text-white' : 'text-slate-500'}`}>{bg.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between gap-3">
              <button
                onClick={() => setStep('crop')}
                className="flex-1 py-3.5 bg-slate-800 text-white rounded-xl font-bold active:bg-slate-700 text-sm flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Crop
              </button>
              <button
                onClick={handleFinalSave}
                disabled={isProcessing}
                className="flex-[2] py-3.5 bg-brand-blue text-white rounded-xl font-bold active:bg-blue-600 shadow-[0_0_15px_rgba(16,163,127,0.3)] text-sm flex items-center justify-center gap-2 disabled:opacity-70"
              >
                <Check className="w-4 h-4" />
                Save Profile Photo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageCropModal;
