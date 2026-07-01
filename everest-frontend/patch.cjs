const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// 1. Add states around line 134
content = content.replace(
  '  const fileInputRef = React.useRef(null);\n  const cameraInputRef = React.useRef(null);\n',
  `  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);

  const [cadCropActive, setCadCropActive] = React.useState(false);
  const [cadCropImage, setCadCropImage] = React.useState(null);
  const [cadCropRect, setCadCropRect] = React.useState({ x: 10, y: 10, w: 80, h: 80 });
  const [cadCropDragHandle, setCadCropDragHandle] = React.useState(null);

  const [svgRect, setSvgRect] = React.useState({ width: window.innerWidth, height: window.innerHeight });

  React.useEffect(() => {
    const el = cadSvgRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
        for (let entry of entries) {
            setSvgRect({ width: entry.contentRect.width, height: entry.contentRect.height });
        }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);\n`
);

// 2. Replace addImageLayer with triggerCropOverlay in handleFileUpload
content = content.replace(
  `    const addImageLayer = (url) => {
        const img = new Image();
        img.onload = () => {
            const imgAspect = img.width / img.height;
            const viewAspect = cadViewport.width / cadViewport.height;
            
            let w, h;
            if (imgAspect > viewAspect) {
                w = cadViewport.width * 0.8;
                h = w / imgAspect;
            } else {
                h = cadViewport.height * 0.8;
                w = h * imgAspect;
            }
            
            const x = cadViewport.x + (cadViewport.width - w) / 2;
            const y = cadViewport.y + (cadViewport.height - h) / 2;
            
            setBackgroundLayers(prev => [...prev, {
                id: 'bg_' + Date.now(),
                url,
                x,
                y,
                w,
                h,
                scale: 1,
                isVisible: true,
                isFrozen: false,
                isLinked: false,
                surveyNo: activeSurveyId ? (multiSurveyData.find(s => s.id === activeSurveyId)?.surveyNo || '-') : '-'
            }]);
        };
        img.src = url;
    };`,
  `    const triggerCropOverlay = (url) => {
        const img = new Image();
        img.onload = () => {
            setCadCropImage({ url, width: img.width, height: img.height });
            setCadCropActive(true);
            setCadCropRect({ x: 10, y: 10, w: 80, h: 80 });
        };
        img.src = url;
    };`
);

content = content.replace(
  `        const url = canvas.toDataURL('image/png');\n        addImageLayer(url);`,
  `        const url = canvas.toDataURL('image/png');\n        triggerCropOverlay(url);`
);

content = content.replace(
  `      reader.onload = (ev) => {\n        const url = ev.target.result;\n        addImageLayer(url);\n      };`,
  `      reader.onload = (ev) => {\n        const url = ev.target.result;\n        triggerCropOverlay(url);\n      };`
);

// Add handleCropSubmit before useEffect
content = content.replace(
  `  React.useEffect(() => {\n    if (cadLines.length === 0) {`,
  `  const handleCropSubmit = () => {
      if (!cadCropImage) return;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const srcX = (cadCropRect.x / 100) * cadCropImage.width;
      const srcY = (cadCropRect.y / 100) * cadCropImage.height;
      const srcW = (cadCropRect.w / 100) * cadCropImage.width;
      const srcH = (cadCropRect.h / 100) * cadCropImage.height;
      
      canvas.width = srcW;
      canvas.height = srcH;
      
      const img = new Image();
      img.onload = () => {
          ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
          const croppedUrl = canvas.toDataURL('image/png');
          
          const imgAspect = srcW / srcH;
          const viewAspect = cadViewport.width / cadViewport.height;
          
          let w, h;
          if (imgAspect > viewAspect) {
              w = cadViewport.width * 0.8;
              h = w / imgAspect;
          } else {
              h = cadViewport.height * 0.8;
              w = h * imgAspect;
          }
          
          const x = cadViewport.x + (cadViewport.width - w) / 2;
          const y = cadViewport.y + (cadViewport.height - h) / 2;
          
          setBackgroundLayers(prev => [...prev, {
              id: 'bg_' + Date.now(),
              url: croppedUrl,
              x,
              y,
              w,
              h,
              scale: 1,
              isVisible: true,
              isFrozen: false,
              isLinked: false,
              surveyNo: activeSurveyId ? (multiSurveyData.find(s => s.id === activeSurveyId)?.surveyNo || '-') : '-'
          }]);
          
          setCadCropActive(false);
          setCadCropImage(null);
      };
      img.src = cadCropImage.url;
  };

  React.useEffect(() => {
    if (cadLines.length === 0) {`
);

// 3. New Canvas Update
content = content.replace(
  `setCadLines([]); setCadCircles([]); setCadTexts([]); setCadMetricOffsets({});\n                           setCadHistory({ past: [], future: [] });`,
  `setCadLines([]); setCadCircles([]); setCadTexts([]); setCadMetricOffsets({}); setBackgroundLayers([]); setCadPolygons([]); setMultiSurveyData([]);\n                           setCadHistory({ past: [], future: [] });`
);


// 4. Auto close Menus
content = content.replace(
  `onClick={() => setShowDarkDrawSettings(false)}\n              >\n                 <svg`,
  `onClick={() => { setShowDarkDrawSettings(false); setIsLayersDropdownOpen(false); setIsAreaDropdownOpen(false); setIsSurveyDropdownOpen(false); setIsSubDivDropdownOpen(false); setIsFloatingStackExpanded(false); setIsScaleModalOpen(false); setIsPerimeterDropdownOpen(false); }}\n              >\n                 <svg`
);


// 5. SVG viewBox & Master Transform wrapper
content = content.replace(
  `                   viewBox={\`\${cadViewport.x} \${cadViewport.y} \${cadViewport.width} \${cadViewport.height}\`}\n                   preserveAspectRatio="xMidYMid slice"`,
  ``
);

content = content.replace(
  `                    </defs>\n                    <rect x={cadViewport.x} y={cadViewport.y} width="100%" height="100%" fill="url(#grid)" />`,
  `                    </defs>\n                    <g id="global-canvas-transform" transform={\`translate(\${(svgRect.width - (cadViewport.width * Math.max(svgRect.width / cadViewport.width, svgRect.height / cadViewport.height))) / 2 - cadViewport.x * Math.max(svgRect.width / cadViewport.width, svgRect.height / cadViewport.height)}, \${(svgRect.height - (cadViewport.height * Math.max(svgRect.width / cadViewport.width, svgRect.height / cadViewport.height))) / 2 - cadViewport.y * Math.max(svgRect.width / cadViewport.width, svgRect.height / cadViewport.height)}) scale(\${Math.max(svgRect.width / cadViewport.width, svgRect.height / cadViewport.height)})\`}>\n                    <rect x={cadViewport.x} y={cadViewport.y} width="100%" height="100%" fill="url(#grid)" />`
);

// Append closing </g> for the global-canvas-transform right before closing </svg> (around line 4310)
content = content.replace(
  `                     </g>\n                  </svg>\n              </div>`,
  `                     </g>\n                    </g>\n                  </svg>\n              </div>`
);


// 6. getScreenCTM fixes for global matrix
content = content.replace(
  /cadSvgRef\.current\.getScreenCTM\(\)/g,
  "(document.getElementById('global-canvas-transform') ? document.getElementById('global-canvas-transform').getScreenCTM() : cadSvgRef.current.getScreenCTM())"
);

content = content.replace(
  /e\.currentTarget\.ownerSVGElement\.getScreenCTM\(\)/g,
  "(document.getElementById('global-canvas-transform') ? document.getElementById('global-canvas-transform').getScreenCTM() : e.currentTarget.ownerSVGElement.getScreenCTM())"
);

// 7. uniformScale pinch to zoom update
content = content.replace(
  `const uniformScale = svgRect ? Math.max(cadViewport.width / svgRect.width, cadViewport.height / svgRect.height) : 1;`,
  ``
);

content = content.replace(
  `const dx = (cadPointerGesture.lastClientX - e.clientX) * uniformScale;`,
  `const dx = (cadPointerGesture.lastClientX - e.clientX) * (cadViewport.width / svgRect.width);`
);

content = content.replace(
  `const dy = (cadPointerGesture.lastClientY - e.clientY) * uniformScale;`,
  `const dy = (cadPointerGesture.lastClientY - e.clientY) * (cadViewport.height / svgRect.height);`
);

content = content.replace(
  `const dx = rawPt.x - (cadPointerGesture.lastSvgX || (cadPointerGesture.startX / uniformScale));`,
  `const dx = rawPt.x - (cadPointerGesture.lastSvgX || (cadPointerGesture.startX / (svgRect.width / cadViewport.width)));`
);

content = content.replace(
  `const dy = rawPt.y - (cadPointerGesture.lastSvgY || (cadPointerGesture.startY / uniformScale));`,
  `const dy = rawPt.y - (cadPointerGesture.lastSvgY || (cadPointerGesture.startY / (svgRect.height / cadViewport.height)));`
);

content = content.replace(
  `const dxSvg = (e.clientX - cadPointerGesture.startX) * uniformScale;`,
  `const dxSvg = (e.clientX - cadPointerGesture.startX) * (cadViewport.width / svgRect.width);`
);

content = content.replace(
  `const dySvg = (e.clientY - cadPointerGesture.startY) * uniformScale;`,
  `const dySvg = (e.clientY - cadPointerGesture.startY) * (cadViewport.height / svgRect.height);`
);


// 8. Add crop UI before the main workspace return statement
content = content.replace(
  `{activeLandSurveyView === 'split_gallery' ? (`,
  `{cadCropActive && cadCropImage && (
        <div className="fixed inset-0 z-[999] bg-slate-950 flex flex-col pointer-events-auto touch-none">
            <div className="flex justify-between items-center px-4 py-3 bg-slate-900 border-b border-slate-800">
                <h3 className="text-white font-black text-sm tracking-widest uppercase">Smart Crop Map</h3>
                <div className="flex items-center gap-3">
                    <button onClick={() => setCadCropActive(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={handleCropSubmit} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded shadow">Confirm Crop</button>
                </div>
            </div>
            <div className="flex-1 relative flex items-center justify-center p-4">
                <div className="relative" style={{ maxWidth: '100%', maxHeight: '100%' }}>
                    <img src={cadCropImage.url} className="max-w-full max-h-full object-contain pointer-events-none" />
                    
                    <div className="absolute inset-0 z-10" 
                        onPointerMove={(e) => {
                            if (!cadCropDragHandle) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                            const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                            
                            setCadCropRect(prev => {
                                let next = { ...prev };
                                if (cadCropDragHandle === 'tl') {
                                    next.w = prev.w + (prev.x - xPct);
                                    next.h = prev.h + (prev.y - yPct);
                                    next.x = xPct;
                                    next.y = yPct;
                                } else if (cadCropDragHandle === 'tr') {
                                    next.w = xPct - prev.x;
                                    next.h = prev.h + (prev.y - yPct);
                                    next.y = yPct;
                                } else if (cadCropDragHandle === 'bl') {
                                    next.w = prev.w + (prev.x - xPct);
                                    next.h = yPct - prev.y;
                                    next.x = xPct;
                                } else if (cadCropDragHandle === 'br') {
                                    next.w = xPct - prev.x;
                                    next.h = yPct - prev.y;
                                }
                                next.w = Math.max(5, next.w);
                                next.h = Math.max(5, next.h);
                                return next;
                            });
                        }}
                        onPointerUp={() => setCadCropDragHandle(null)}
                        onPointerLeave={() => setCadCropDragHandle(null)}
                    >
                        {/* Overlay Masks */}
                        <div className="absolute bg-black/60" style={{ top: 0, left: 0, right: 0, height: \`\${cadCropRect.y}%\` }} />
                        <div className="absolute bg-black/60" style={{ bottom: 0, left: 0, right: 0, height: \`\${100 - (cadCropRect.y + cadCropRect.h)}%\` }} />
                        <div className="absolute bg-black/60" style={{ top: \`\${cadCropRect.y}%\`, bottom: \`\${100 - (cadCropRect.y + cadCropRect.h)}%\`, left: 0, width: \`\${cadCropRect.x}%\` }} />
                        <div className="absolute bg-black/60" style={{ top: \`\${cadCropRect.y}%\`, bottom: \`\${100 - (cadCropRect.y + cadCropRect.h)}%\`, right: 0, width: \`\${100 - (cadCropRect.x + cadCropRect.w)}%\` }} />
                        
                        {/* Crop Box */}
                        <div className="absolute border-2 border-indigo-500 box-border" style={{ top: \`\${cadCropRect.y}%\`, left: \`\${cadCropRect.x}%\`, width: \`\${cadCropRect.w}%\`, height: \`\${cadCropRect.h}%\` }}>
                            {/* Grid lines */}
                            <div className="absolute inset-0 flex flex-col justify-evenly pointer-events-none opacity-30"><div className="w-full h-px bg-white"/><div className="w-full h-px bg-white"/></div>
                            <div className="absolute inset-0 flex flex-row justify-evenly pointer-events-none opacity-30"><div className="h-full w-px bg-white"/><div className="h-full w-px bg-white"/></div>
                            
                            {/* Handles */}
                            <div className="absolute -top-3 -left-3 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full cursor-nwse-resize" onPointerDown={() => setCadCropDragHandle('tl')} />
                            <div className="absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full cursor-nesw-resize" onPointerDown={() => setCadCropDragHandle('tr')} />
                            <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full cursor-nesw-resize" onPointerDown={() => setCadCropDragHandle('bl')} />
                            <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full cursor-nwse-resize" onPointerDown={() => setCadCropDragHandle('br')} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {activeLandSurveyView === 'split_gallery' ? (`
);

fs.writeFileSync('src/components/AdminDashboard.jsx', content);
console.log('Patched AdminDashboard.jsx');
