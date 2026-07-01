import React, { useState, useRef, useEffect } from 'react';

const SmartCropOverlay = ({ src, onCrop, onCancel }) => {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 }); // Percentages
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState(null);

  const startDrag = (e, handle = null) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setResizeHandle(handle);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    
    const container = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.x) / container.width) * 100;
    const dy = ((e.clientY - dragStart.y) / container.height) * 100;

    setDragStart({ x: e.clientX, y: e.clientY });

    setCrop(prev => {
      let newCrop = { ...prev };
      
      if (resizeHandle === 'nw') {
        newCrop.x += dx; newCrop.y += dy;
        newCrop.width -= dx; newCrop.height -= dy;
      } else if (resizeHandle === 'ne') {
        newCrop.y += dy;
        newCrop.width += dx; newCrop.height -= dy;
      } else if (resizeHandle === 'sw') {
        newCrop.x += dx;
        newCrop.width -= dx; newCrop.height += dy;
      } else if (resizeHandle === 'se') {
        newCrop.width += dx; newCrop.height += dy;
      } else if (resizeHandle === 'n') {
        newCrop.y += dy; newCrop.height -= dy;
      } else if (resizeHandle === 's') {
        newCrop.height += dy;
      } else if (resizeHandle === 'e') {
        newCrop.width += dx;
      } else if (resizeHandle === 'w') {
        newCrop.x += dx; newCrop.width -= dx;
      } else {
        // move entire box
        newCrop.x += dx;
        newCrop.y += dy;
      }

      // Constrain
      newCrop.x = Math.max(0, Math.min(newCrop.x, 100 - newCrop.width));
      newCrop.y = Math.max(0, Math.min(newCrop.y, 100 - newCrop.height));
      newCrop.width = Math.max(5, Math.min(newCrop.width, 100 - newCrop.x));
      newCrop.height = Math.max(5, Math.min(newCrop.height, 100 - newCrop.y));

      return newCrop;
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setResizeHandle(null);
  };
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
  }, [isDragging, dragStart, resizeHandle]);

  const commitCrop = () => {
    if (!imageRef.current) return;
    
    const canvas = document.createElement('canvas');
    const img = imageRef.current;
    
    // Calculate actual pixel dimensions
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    
    const rect = img.getBoundingClientRect();
    const cRect = containerRef.current.getBoundingClientRect();
    
    // relative to container
    const imgLeft = rect.left - cRect.left;
    const imgTop = rect.top - cRect.top;
    
    // crop box coordinates in container pixels
    const cropXPx = (crop.x / 100) * cRect.width;
    const cropYPx = (crop.y / 100) * cRect.height;
    const cropWPx = (crop.width / 100) * cRect.width;
    const cropHPx = (crop.height / 100) * cRect.height;
    
    // intersect with image
    const finalX = Math.max(0, cropXPx - imgLeft);
    const finalY = Math.max(0, cropYPx - imgTop);
    const finalW = Math.min(cropWPx, img.width - finalX);
    const finalH = Math.min(cropHPx, img.height - finalY);
    
    canvas.width = finalW * scaleX;
    canvas.height = finalH * scaleY;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(
      img,
      finalX * scaleX, finalY * scaleY, finalW * scaleX, finalH * scaleY,
      0, 0, canvas.width, canvas.height
    );
    
    onCrop(canvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 flex flex-col items-center justify-center">
       <div className="absolute top-4 w-full flex justify-between px-8 z-[1010]">
         <h2 className="text-white font-black text-xl tracking-widest uppercase">Smart Crop</h2>
         <div className="flex gap-4">
           <button onClick={onCancel} className="text-slate-400 hover:text-white px-4 py-2 font-bold transition-colors">CANCEL</button>
           <button onClick={commitCrop} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-500/30 transition-all active:scale-95">CROP & IMPORT</button>
         </div>
       </div>

       <div 
         ref={containerRef}
         className="relative w-full max-w-4xl max-h-[80vh] flex items-center justify-center bg-black overflow-hidden border-2 border-slate-800 rounded-xl"
         style={{ aspectRatio: '4/3' }}
       >
         <img ref={imageRef} src={src} className="w-full h-full object-contain pointer-events-none" alt="To Crop" />
         
         <div className="absolute inset-0 pointer-events-none bg-black/50"></div>
         
         <div 
           className="absolute border-2 border-indigo-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move touch-none"
           style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }}
           onPointerDown={(e) => startDrag(e)}
         >
           {/* Guidelines */}
           <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
             <div className="border-r border-b border-indigo-500/30"></div>
             <div className="border-r border-b border-indigo-500/30"></div>
             <div className="border-b border-indigo-500/30"></div>
             <div className="border-r border-b border-indigo-500/30"></div>
             <div className="border-r border-b border-indigo-500/30"></div>
             <div className="border-b border-indigo-500/30"></div>
             <div className="border-r border-indigo-500/30"></div>
             <div className="border-r border-indigo-500/30"></div>
             <div></div>
           </div>

           {/* Handles */}
           <div className="absolute -top-2 -left-2 w-6 h-6 bg-white border-4 border-indigo-500 rounded-full cursor-nw-resize shadow-md touch-none" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'nw'); }} />
           <div className="absolute -top-2 left-1/2 -ml-3 w-6 h-6 bg-white border-4 border-indigo-500 rounded-full cursor-n-resize shadow-md touch-none" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'n'); }} />
           <div className="absolute -top-2 -right-2 w-6 h-6 bg-white border-4 border-indigo-500 rounded-full cursor-ne-resize shadow-md touch-none" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'ne'); }} />
           
           <div className="absolute top-1/2 -mt-3 -right-2 w-6 h-6 bg-white border-4 border-indigo-500 rounded-full cursor-e-resize shadow-md touch-none" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'e'); }} />
           <div className="absolute top-1/2 -mt-3 -left-2 w-6 h-6 bg-white border-4 border-indigo-500 rounded-full cursor-w-resize shadow-md touch-none" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'w'); }} />
           
           <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white border-4 border-indigo-500 rounded-full cursor-sw-resize shadow-md touch-none" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'sw'); }} />
           <div className="absolute -bottom-2 left-1/2 -ml-3 w-6 h-6 bg-white border-4 border-indigo-500 rounded-full cursor-s-resize shadow-md touch-none" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 's'); }} />
           <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white border-4 border-indigo-500 rounded-full cursor-se-resize shadow-md touch-none" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'se'); }} />
         </div>
       </div>
    </div>
  );
};

export default SmartCropOverlay;
