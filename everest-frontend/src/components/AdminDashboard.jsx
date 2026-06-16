import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// Cloud API base — reads from .env at build time, falls back to localhost for dev
const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.1.100:5000';

const loadPdfJsScript = () => new Promise((resolve, reject) => {
  if (window.pdfjsLib) return resolve(window.pdfjsLib);
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
  script.onload = () => {
     const lib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
     lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
     resolve(lib);
  };
  script.onerror = () => reject(new Error("pdf.js failed to load"));
  document.head.appendChild(script);
});

const AdminDashboard = ({ setCurrentView }) => {
  const cardShadowClass = "interactive-card";
  const [showLandSurveyDashboard, setShowLandSurveyDashboard] = React.useState(false);
  const [activeLandSurveyView, setActiveLandSurveyView] = React.useState('menu'); // 'menu', 'simple', 'fmb', 'recreate_fmb', 'dark_draw_manual'

  // --- MANUAL CAD ENGINE STATE ---
  const [cadLines, setCadLines] = React.useState([]);
  const [cadCircles, setCadCircles] = React.useState([]);
  const [cadScale, setCadScale] = React.useState(null);
  const [cadTool, setCadTool] = React.useState('IDLE');
  const [cadViewport, setCadViewport] = React.useState({ x: 0, y: 0, width: 2000, height: 2000 });
  const [cadActiveLine, setCadActiveLine] = React.useState(null);
  const [cadPrompt, setCadPrompt] = React.useState(null);
  const [cadPromptValue, setCadPromptValue] = React.useState('');
  const cadSvgRef = React.useRef(null);
  
  // Multi-Touch & Gesture State
    const cadPointersRef = React.useRef(new Map());
  const cadPanIntervalRef = React.useRef(null);

  const startCadPan = (dx, dy) => {
    if (cadPanIntervalRef.current) clearInterval(cadPanIntervalRef.current);
    cadPanIntervalRef.current = setInterval(() => {
      setCadViewport(prev => ({
         ...prev,
         x: prev.x + (dx * prev.width * 0.02),
         y: prev.y + (dy * prev.height * 0.02)
      }));
    }, 16); // ~60 FPS smooth scrolling
  };

  const stopCadPan = () => {
    if (cadPanIntervalRef.current) {
       clearInterval(cadPanIntervalRef.current);
       cadPanIntervalRef.current = null;
    }
  };

  const [cadPinchInitial, setCadPinchInitial] = React.useState(null);
  
  // Nodes & Selection
  const [cadHoveredNode, setCadHoveredNode] = React.useState(null);
  const [cadSelectedNode, setCadSelectedNode] = React.useState(null);
  const [cadPointerGesture, setCadPointerGesture] = React.useState(null);
  const [cadGlowingCircle, setCadGlowingCircle] = React.useState(null);
  const [cadBlinkingRadius, setCadBlinkingRadius] = React.useState(null);
  const [cadSnapIndicator, setCadSnapIndicator] = React.useState(null);

  // Extended Editing
  const [cadSelectedLine, setCadSelectedLine] = React.useState(null);
  const [cadSelectedCircle, setCadSelectedCircle] = React.useState(null);
  const [cadTexts, setCadTexts] = React.useState([]);
  const [cadSelectedText, setCadSelectedText] = React.useState(null);
  const [cadSelectedMetric, setCadSelectedMetric] = React.useState(null);
  const [cadDraggingNode, setCadDraggingNode] = React.useState(null); // { lineId, end: 'p1'|'p2' }
  const [cadEditInputs, setCadEditInputs] = React.useState({ length: '', weight: 4, hex: '#38bdf8', isMovingMetric: false });
  const [cadPopupOffset, setCadPopupOffset] = React.useState({ x: 0, y: 0 });
  const [savedProjects, setSavedProjects] = React.useState([]);
  const [cadMetricOffsets, setCadMetricOffsets] = React.useState({});

  const [cadHistory, setCadHistory] = React.useState({ past: [], future: [] });
  const cadStateBeforeActionRef = React.useRef(null);

  const handleSaveProject = () => {
     const project = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        state: {
           lines: cadLines,
           circles: cadCircles,
           texts: cadTexts,
           metricOffsets: cadMetricOffsets,
           viewport: cadViewport,
           scale: cadScale
        }
     };
     setSavedProjects(prev => [project, ...prev]);
     setShowDarkDrawSettings(false);
     alert("Project Saved Successfully to My Projects!");
  };

  const cadComputedArea = React.useMemo(() => {
    if (!cadScale || cadLines.length < 3) return null;
    
    const adj = new Map();
    cadLines.forEach(l => {
       const p1 = `${l.p1.x.toFixed(2)},${l.p1.y.toFixed(2)}`;
       const p2 = `${l.p2.x.toFixed(2)},${l.p2.y.toFixed(2)}`;
       if (!adj.has(p1)) adj.set(p1, []);
       if (!adj.has(p2)) adj.set(p2, []);
       adj.get(p1).push(p2);
       adj.get(p2).push(p1);
    });
    
    let isLoop = true;
    for (let [node, neighbors] of adj.entries()) {
       if (neighbors.length !== 2) { isLoop = false; break; }
    }
    if (!isLoop) return null;
    
    const vertices = [];
    const startNode = adj.keys().next().value;
    let curr = startNode;
    let prev = null;
    
    for (let i = 0; i < adj.size; i++) {
       const coords = curr.split(',').map(Number);
       vertices.push({ x: coords[0], y: coords[1] });
       const neighbors = adj.get(curr);
       const next = (neighbors[0] !== prev) ? neighbors[0] : neighbors[1];
       prev = curr;
       curr = next;
    }
    
    let areaPixels = 0;
    for (let i = 0; i < vertices.length; i++) {
       const j = (i + 1) % vertices.length;
       areaPixels += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    }
    areaPixels = Math.abs(areaPixels) / 2;
    
    const sqMeters = areaPixels * cadScale * cadScale;
    const sqFt = sqMeters * 10.76391;
    const cents = sqFt / 435.6;
    const acres = sqFt / 43560;
    const hectares = sqFt / 107639.104;
    
    return { hectareAre: hectares, acre: acres, cent: cents, sqFt: sqFt };
  }, [cadLines, cadScale]);

  const captureCadState = () => ({
     lines: JSON.parse(JSON.stringify(cadLines)),
     circles: JSON.parse(JSON.stringify(cadCircles)),
     texts: JSON.parse(JSON.stringify(cadTexts)),
     metricOffsets: JSON.parse(JSON.stringify(cadMetricOffsets))
  });

  const saveCadStateToHistory = (customState) => {
    const stateToSave = customState || captureCadState();
    setCadHistory(h => {
      const newPast = [...h.past, stateToSave];
      if (newPast.length > 40) newPast.shift(); // Max 40 steps
      return { past: newPast, future: [] };
    });
  };

  const handleCadUndo = () => {
    if (cadHistory.past.length === 0) return;
    const currentSnapshot = captureCadState();
    const previous = cadHistory.past[cadHistory.past.length - 1];
    const newPast = cadHistory.past.slice(0, cadHistory.past.length - 1);
    
    setCadHistory({ past: newPast, future: [currentSnapshot, ...cadHistory.future] });
    setCadLines(previous.lines);
    setCadCircles(previous.circles);
    setCadTexts(previous.texts);
    setCadMetricOffsets(previous.metricOffsets);
  };

  const handleCadRedo = () => {
    if (cadHistory.future.length === 0) return;
    const currentSnapshot = captureCadState();
    const next = cadHistory.future[0];
    const newFuture = cadHistory.future.slice(1);
    
    setCadHistory({ past: [...cadHistory.past, currentSnapshot], future: newFuture });
    setCadLines(next.lines);
    setCadCircles(next.circles);
    setCadTexts(next.texts);
    setCadMetricOffsets(next.metricOffsets);
  };

  const cadNodes = React.useMemo(() => {
    const nodes = [];
    cadLines.forEach(l => {
      if (!nodes.some(n => Math.hypot(n.x - l.p1.x, n.y - l.p1.y) < 1e-4)) nodes.push({ ...l.p1, id: 'n_' + Math.random().toString(36).substr(2, 9) });
      if (!nodes.some(n => Math.hypot(n.x - l.p2.x, n.y - l.p2.y) < 1e-4)) nodes.push({ ...l.p2, id: 'n_' + Math.random().toString(36).substr(2, 9) });
    });
    
    // Circle tangency points
    cadCircles.forEach(circle => {
      const cx = circle.center.x; const cy = circle.center.y; const r = circle.radiusPixels;
      nodes.push({ x: cx + r, y: cy, id: 'nc_' + Math.random().toString(36).substr(2, 9) });
      nodes.push({ x: cx - r, y: cy, id: 'nc_' + Math.random().toString(36).substr(2, 9) });
      nodes.push({ x: cx, y: cy + r, id: 'nc_' + Math.random().toString(36).substr(2, 9) });
      nodes.push({ x: cx, y: cy - r, id: 'nc_' + Math.random().toString(36).substr(2, 9) });
    });

    // Intersections between lines
    for (let i = 0; i < cadLines.length; i++) {
      for (let j = i + 1; j < cadLines.length; j++) {
        const l1 = cadLines[i]; const l2 = cadLines[j];
        const denom = (l1.p1.x - l1.p2.x) * (l2.p1.y - l2.p2.y) - (l1.p1.y - l1.p2.y) * (l2.p1.x - l2.p2.x);
        if (Math.abs(denom) > 1e-6) {
           const t = ((l1.p1.x - l2.p1.x) * (l2.p1.y - l2.p2.y) - (l1.p1.y - l2.p1.y) * (l2.p1.x - l2.p2.x)) / denom;
           const u = ((l1.p1.x - l2.p1.x) * (l1.p1.y - l1.p2.y) - (l1.p1.y - l2.p1.y) * (l1.p1.x - l1.p2.x)) / denom;
           if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
              nodes.push({ x: l1.p1.x + t * (l1.p2.x - l1.p1.x), y: l1.p1.y + t * (l1.p2.y - l1.p1.y), id: 'ni_' + Math.random().toString(36).substr(2, 9) });
           }
        }
      }
    }
    return nodes;
  }, [cadLines, cadCircles]);

  const getCadSvgCoords = (clientX, clientY) => {
    if (!cadSvgRef.current) return { x: 0, y: 0 };
    const CTM = cadSvgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return { x: (clientX - CTM.e) / CTM.a, y: (clientY - CTM.f) / CTM.d };
  };

  const getCadSnapPoint = (pt, excludeCircles = false) => {
    let snapped = { ...pt, snapType: 'NONE' };
    let minSnapDist = 50 * (cadViewport.width / 1000); 
    let didSnap = false;

    cadNodes.forEach(n => {
      const d = Math.hypot(n.x - pt.x, n.y - pt.y);
      if (d < minSnapDist) { minSnapDist = d; snapped = { ...n, snapType: 'NODE', targetId: n.id }; didSnap = true; }
    });

    if (!excludeCircles) {
      cadCircles.forEach(circle => {
        const dCenter = Math.hypot(circle.center.x - pt.x, circle.center.y - pt.y);
        const dPerimeter = Math.abs(dCenter - circle.radiusPixels);
        if (dPerimeter < minSnapDist) {
          minSnapDist = dPerimeter;
          const angle = Math.atan2(pt.y - circle.center.y, pt.x - circle.center.x);
          snapped = {
            x: circle.center.x + circle.radiusPixels * Math.cos(angle),
            y: circle.center.y + circle.radiusPixels * Math.sin(angle),
            snapType: 'CIRCLE',
            targetId: circle.id
          };
          didSnap = true;
        }
      });
    }
    
    setCadSnapIndicator(didSnap ? snapped : null);
    setCadGlowingCircle(snapped.snapType === 'CIRCLE' ? snapped.targetId : null);
    return snapped;
  };

  const getSvgPtToContainer = (svgX, svgY) => {
    if (!cadSvgRef.current) return { left: 0, top: 0 };
    const rect = cadSvgRef.current.getBoundingClientRect();
    const scaleX = rect.width / cadViewport.width;
    const scaleY = rect.height / cadViewport.height;
    return { left: (svgX - cadViewport.x) * scaleX, top: (svgY - cadViewport.y) * scaleY };
  };

  const handleCadPointerDown = (e) => {
    cadStateBeforeActionRef.current = captureCadState();
    e.target.setPointerCapture(e.pointerId);
    cadPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    if (cadPointersRef.current.size === 2) {
      const pts = Array.from(cadPointersRef.current.values());
      const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      const cx = (pts[0].clientX + pts[1].clientX) / 2;
      const cy = (pts[0].clientY + pts[1].clientY) / 2;
      setCadPinchInitial({ dist, cx, cy, view: { ...cadViewport } });
      setCadActiveLine(null); 
      setCadTool('IDLE');
      return;
    }

    if (cadPointersRef.current.size === 1) {
      const rawPt = getCadSvgCoords(e.clientX, e.clientY);

      if (cadPrompt || cadSelectedNode || cadSelectedLine || cadSelectedCircle || cadSelectedText || cadSelectedMetric) {
        if (!cadDraggingNode && !cadPointerGesture?.isDraggingMetric && !cadPointerGesture?.isDraggingText && !cadPointerGesture?.isDraggingLineBody) {
           setCadPrompt(null); setCadSelectedNode(null); setCadSelectedLine(null); setCadSelectedCircle(null); setCadSelectedText(null); setCadSelectedMetric(null);
           setCadPopupOffset({ x: 0, y: 0 }); 
        }
        return; 
      }
      
      let targetNode = null; let targetLine = null; let targetCircle = null; let targetText = null; let targetMetric = null;
      let minSnapDist = 50 * (cadViewport.width / 1000);

      if (cadTool === 'EDIT_LINE' || cadTool === 'SKETCH_LINE') {
         if (cadTool === 'SKETCH_LINE') {
            const activeL = cadLines.find(x => Math.hypot(x.p1.x - rawPt.x, x.p1.y - rawPt.y) < minSnapDist || Math.hypot(x.p2.x - rawPt.x, x.p2.y - rawPt.y) < minSnapDist);
            if (activeL) {
               if (Math.hypot(activeL.p1.x - rawPt.x, activeL.p1.y - rawPt.y) < minSnapDist) { setCadDraggingNode({ lineId: activeL.id, end: 'p1' }); setCadSelectedLine(activeL.id); return; }
               if (Math.hypot(activeL.p2.x - rawPt.x, activeL.p2.y - rawPt.y) < minSnapDist) { setCadDraggingNode({ lineId: activeL.id, end: 'p2' }); setCadSelectedLine(activeL.id); return; }
            }
         }
         
         // Legacy Move Mode removed for Sketch integration

         cadNodes.forEach(n => {
            if (Math.hypot(n.x - rawPt.x, n.y - rawPt.y) < minSnapDist) targetNode = n;
         });
         if (!targetNode) {
            let minLineDist = 20 * (cadViewport.width / 1000);
            cadLines.forEach(l => {
               const L2 = Math.pow(l.p1.x - l.p2.x, 2) + Math.pow(l.p1.y - l.p2.y, 2);
               if (L2 === 0) return;
               let t = ((rawPt.x - l.p1.x) * (l.p2.x - l.p1.x) + (rawPt.y - l.p1.y) * (l.p2.y - l.p1.y)) / L2;
               t = Math.max(0, Math.min(1, t));
               const projX = l.p1.x + t * (l.p2.x - l.p1.x);
               const projY = l.p1.y + t * (l.p2.y - l.p1.y);
               if (Math.hypot(rawPt.x - projX, rawPt.y - projY) < minLineDist) targetLine = l;
            });
         }
      } else if (cadTool === 'EDIT_RADIUS') {
         cadCircles.forEach(circle => {
            if (Math.abs(Math.hypot(circle.center.x - rawPt.x, circle.center.y - rawPt.y) - circle.radiusPixels) < minSnapDist) targetCircle = circle;
         });
      } else if (cadTool === 'SELECT_TEXT') {
         cadTexts.forEach(txt => {
            if (Math.hypot(txt.x - rawPt.x, txt.y - rawPt.y) < minSnapDist * 1.5) targetText = txt;
         });
      } else if (cadTool === 'SELECT_METRIC') {
         cadLines.forEach(l => {
            if (l.fixedLength) {
               const offset = cadMetricOffsets[l.id] || { dx: 0, dy: -cadViewport.width * 0.01 };
               const mx = (l.p1.x + l.p2.x) / 2 + offset.dx;
               const my = (l.p1.y + l.p2.y) / 2 + offset.dy;
               if (Math.hypot(mx - rawPt.x, my - rawPt.y) < minSnapDist * 1.5) targetMetric = l;
            }
         });
      }

      setCadPointerGesture({ 
         startX: e.clientX, startY: e.clientY, 
         isDragging: false, isDraggingMetric: false, isDraggingText: false, isDraggingLineBody: false,
         targetNode, targetLine, targetCircle, targetText, targetMetric 
      });

      if (cadTool === 'ADD_LINE' && !cadActiveLine) {
         const snapPt = getCadSnapPoint(rawPt, true);
         setCadActiveLine({ p1: snapPt, p2: snapPt });
      } else if (cadTool === 'ADD_TEXT') {
         const ctCoords = getSvgPtToContainer(rawPt.x, rawPt.y);
         setCadPrompt({ type: 'TEXT', x: ctCoords.left, y: ctCoords.top, svgPt: rawPt });
         setCadPromptValue('');
         setCadTool('IDLE');
      }
    }
  };

  const handleCadPointerMove = (e) => {
    e.preventDefault(); 
    if (!cadPointersRef.current.has(e.pointerId)) return;
    cadPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    if (cadPointersRef.current.size === 2 && cadPinchInitial) {
      const pts = Array.from(cadPointersRef.current.values());
      const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      const cx = (pts[0].clientX + pts[1].clientX) / 2;
      const cy = (pts[0].clientY + pts[1].clientY) / 2;

      const scaleDelta = dist > 5 ? cadPinchInitial.dist / dist : 1;
      const newWidth = cadPinchInitial.view.width * scaleDelta;
      const newHeight = cadPinchInitial.view.height * scaleDelta;

      const svgRect = cadSvgRef.current.getBoundingClientRect();
      const uniformScale = Math.max(cadPinchInitial.view.width / svgRect.width, cadPinchInitial.view.height / svgRect.height);
      const dx = (cadPinchInitial.cx - cx) * uniformScale;
      const dy = (cadPinchInitial.cy - cy) * uniformScale; 

      const centroidSvgX = cadPinchInitial.view.x + (cadPinchInitial.cx - svgRect.left) * uniformScale;
      const centroidSvgY = cadPinchInitial.view.y + (cadPinchInitial.cy - svgRect.top) * uniformScale;
      const zdx = (centroidSvgX - cadPinchInitial.view.x) * (1 - scaleDelta);
      const zdy = (centroidSvgY - cadPinchInitial.view.y) * (1 - scaleDelta);

      setCadViewport({ x: cadPinchInitial.view.x + dx + zdx, y: cadPinchInitial.view.y + dy + zdy, width: newWidth, height: newHeight });
      return;
    }

    if (cadPointersRef.current.size === 1) {
      const rawPt = getCadSvgCoords(e.clientX, e.clientY);
      const svgRect = cadSvgRef.current?.getBoundingClientRect();
      const uniformScale = svgRect ? Math.max(cadViewport.width / svgRect.width, cadViewport.height / svgRect.height) : 1;
      
      let hoveredNode = null;
      if (cadTool === 'ADD_LINE' || cadTool === 'EDIT_LINE') {
        let minSnapDist = 50 * (cadViewport.width / 1000);
        cadNodes.forEach(n => { if (Math.hypot(n.x - rawPt.x, n.y - rawPt.y) < minSnapDist) hoveredNode = n; });
      }
      setCadHoveredNode(hoveredNode);

      if (cadPointerGesture && !cadPointerGesture.isDragging && !cadPointerGesture.isDraggingMetric && !cadPointerGesture.isDraggingText && !cadPointerGesture.isDraggingLineBody ) {
         if (Math.hypot(e.clientX - cadPointerGesture.startX, e.clientY - cadPointerGesture.startY) > 5) {
            
            if (cadPointerGesture.targetNode) {
               setCadPointerGesture(p => ({ ...p, isDragging: true }));
               setShowDarkDrawSettings(false);
               const connectedLines = cadLines.filter(l => (Math.hypot(l.p1.x - cadPointerGesture.targetNode.x, l.p1.y - cadPointerGesture.targetNode.y) < 1e-4) || (Math.hypot(l.p2.x - cadPointerGesture.targetNode.x, l.p2.y - cadPointerGesture.targetNode.y) < 1e-4));
               if (connectedLines.length > 0) {
                  setCadSelectedLine(connectedLines[0].id);
                  const end = Math.hypot(connectedLines[0].p1.x - cadPointerGesture.targetNode.x, connectedLines[0].p1.y - cadPointerGesture.targetNode.y) < 1e-4 ? 'p1' : 'p2';
                  setCadDraggingNode({ lineId: connectedLines[0].id, end });
               }
            } else if (cadPointerGesture.targetMetric && cadEditInputs.isMovingMetric) {
               setCadPointerGesture(p => ({ ...p, isDraggingMetric: true }));
               setShowDarkDrawSettings(false);
            } else if (cadPointerGesture.targetText && cadEditInputs.isMovingText) {
               setCadPointerGesture(p => ({ ...p, isDraggingText: true }));
               setShowDarkDrawSettings(false);
            }
         }
      }



      if (cadPointerGesture?.isDraggingMetric) {
         const dxSvg = (e.clientX - cadPointerGesture.startX) * uniformScale;
         const dySvg = (e.clientY - cadPointerGesture.startY) * uniformScale;
         const lineId = cadPointerGesture.targetMetric.id;
         const baseOffset = cadPointerGesture.baseOffset || cadMetricOffsets[lineId] || { dx: 0, dy: -cadViewport.width * 0.01 };
         if (!cadPointerGesture.baseOffset) setCadPointerGesture(p => ({ ...p, baseOffset }));
         
         setCadMetricOffsets(prev => ({ ...prev, [lineId]: { dx: baseOffset.dx + dxSvg, dy: baseOffset.dy + dySvg } }));
         return;
      }

      if (cadPointerGesture?.isDraggingText) {
         const dxSvg = (e.clientX - cadPointerGesture.startX) * uniformScale;
         const dySvg = (e.clientY - cadPointerGesture.startY) * uniformScale;
         const textId = cadPointerGesture.targetText.id;
         const basePos = cadPointerGesture.basePos || { x: cadPointerGesture.targetText.x, y: cadPointerGesture.targetText.y };
         if (!cadPointerGesture.basePos) setCadPointerGesture(p => ({ ...p, basePos }));
         
         setCadTexts(prev => prev.map(t => t.id === textId ? { ...t, x: basePos.x + dxSvg, y: basePos.y + dySvg } : t));
         return;
      }

      if (cadDraggingNode) {
         const snapPt = getCadSnapPoint(rawPt, false); 
         setCadLines(prev => prev.map(l => {
            if (l.id === cadDraggingNode.lineId) {
               const nl = { ...l, [cadDraggingNode.end]: snapPt };
               if (cadScale) {
                  nl.fixedLength = (Math.hypot(nl.p1.x - nl.p2.x, nl.p1.y - nl.p2.y) * cadScale).toFixed(2);
               }
               setCadEditInputs(p => ({ ...p, length: nl.fixedLength }));
               return nl;
            }
            return l;
         }));
         return;
      }

      if (cadTool === 'ADD_LINE' && cadActiveLine) {
        const snapPt = getCadSnapPoint(rawPt, false); 
        setCadActiveLine({ ...cadActiveLine, p2: snapPt });

        const edgeThreshX = cadViewport.width * 0.1; const edgeThreshY = cadViewport.height * 0.1;
        let needsZoom = false; let nX = cadViewport.x, nY = cadViewport.y, nW = cadViewport.width, nH = cadViewport.height;

        if (snapPt.x < cadViewport.x + edgeThreshX) { nW *= 1.05; nH *= 1.05; nX -= cadViewport.width * 0.025; nY -= cadViewport.height * 0.025; needsZoom = true; }
        else if (snapPt.x > cadViewport.x + cadViewport.width - edgeThreshX) { nW *= 1.05; nH *= 1.05; nX += cadViewport.width * 0.025; nY -= cadViewport.height * 0.025; needsZoom = true; }
        
        if (snapPt.y < cadViewport.y + edgeThreshY) { nW *= 1.05; nH *= 1.05; nX -= cadViewport.width * 0.025; nY -= cadViewport.height * 0.025; needsZoom = true; }
        else if (snapPt.y > cadViewport.y + cadViewport.height - edgeThreshY) { nW *= 1.05; nH *= 1.05; nX -= cadViewport.width * 0.025; nY += cadViewport.height * 0.025; needsZoom = true; }
        
        if (needsZoom) setCadViewport({ x: nX, y: nY, width: nW, height: nH });
      }
    }
  };

  const handleCadPointerUp = (e) => {
    cadPointersRef.current.delete(e.pointerId);
    if (cadPointersRef.current.size < 2) setCadPinchInitial(null);
    if (cadPointersRef.current.size === 0) {
      setCadSnapIndicator(null);
      setCadGlowingCircle(null);
      
      if (cadDraggingNode) { setCadDraggingNode(null); setCadPointerGesture(null); return; }
      
      
      if (cadPointerGesture && !cadPointerGesture.isDragging && !cadPointerGesture.isDraggingMetric && !cadPointerGesture.isDraggingText && !cadPointerGesture.isDraggingLineBody) {
         if (cadPointerGesture.targetNode) {
            setShowDarkDrawSettings(false); setCadSelectedNode(cadPointerGesture.targetNode);
         } else if (cadPointerGesture.targetLine) {
            setShowDarkDrawSettings(false); setCadSelectedLine(cadPointerGesture.targetLine.id); setCadSelectedNode(null); setCadSelectedCircle(null);
            setCadEditInputs(p => ({ ...p, length: cadPointerGesture.targetLine.fixedLength || '', weight: cadPointerGesture.targetLine.strokeWidth || 4, hex: cadPointerGesture.targetLine.hexColor || '#38bdf8' }));
         } else if (cadPointerGesture.targetCircle) {
            setShowDarkDrawSettings(false); setCadSelectedCircle(cadPointerGesture.targetCircle.id); setCadSelectedNode(null); setCadSelectedLine(null);
            setCadEditInputs(p => ({ ...p, length: cadPointerGesture.targetCircle.radiusMeters, weight: cadPointerGesture.targetCircle.strokeWidth || 3, hex: cadPointerGesture.targetCircle.hexColor || '#4f46e5' }));
         } else if (cadPointerGesture.targetText) {
            setShowDarkDrawSettings(false); setCadSelectedText(cadPointerGesture.targetText.id);
            setCadPopupOffset({x:0, y:0});
         } else if (cadPointerGesture.targetMetric) {
            setShowDarkDrawSettings(false); setCadSelectedMetric(cadPointerGesture.targetMetric.id);
            setCadPopupOffset({x:0, y:0});
         }
      }
      setCadPointerGesture(null);

      if (cadTool === 'ADD_LINE' && cadActiveLine) {
        const d = Math.hypot(cadActiveLine.p1.x - cadActiveLine.p2.x, cadActiveLine.p1.y - cadActiveLine.p2.y);
        if (d > 5) {
          const newId = Date.now().toString();
          let finalLen = cadScale ? (Math.hypot(cadActiveLine.p1.x - cadActiveLine.p2.x, cadActiveLine.p1.y - cadActiveLine.p2.y) * cadScale).toFixed(2) : null;
          
          setCadLines(prev => [...prev, { id: newId, p1: cadActiveLine.p1, p2: cadActiveLine.p2, fixedLength: finalLen, strokeWidth: 4, hexColor: '#38bdf8' }]);
          
          if (!finalLen) {
             const midSvgX = (cadActiveLine.p1.x + cadActiveLine.p2.x) / 2;
             const midSvgY = (cadActiveLine.p1.y + cadActiveLine.p2.y) / 2;
             const ctCoords = getSvgPtToContainer(midSvgX, midSvgY);
             setCadPrompt({ type: 'LINE', targetId: newId, x: ctCoords.left, y: ctCoords.top });
             setCadPromptValue('');
          }
        }
        setCadActiveLine(null);
        setCadTool('IDLE');
      }
    }
  };

  const handleCadWheel = (e) => {
    if (cadPrompt || cadSelectedNode || cadSelectedLine || cadSelectedCircle) return;
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const rawPt = getCadSvgCoords(e.clientX, e.clientY);
    setCadViewport(prev => ({
      x: prev.x + (rawPt.x - prev.x) * (1 - zoomFactor),
      y: prev.y + (rawPt.y - prev.y) * (1 - zoomFactor),
      width: prev.width * zoomFactor,
      height: prev.height * zoomFactor
    }));
  };

  React.useEffect(() => {
    const el = cadSvgRef.current;
    if (el) {
      el.addEventListener('wheel', handleCadWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleCadWheel);
    }
  }, [cadViewport, cadPrompt, cadSelectedNode, cadSelectedLine, cadSelectedCircle]);


  
  const submitCadPrompt = (e) => {
    try {
      if (e && e.preventDefault) e.preventDefault();
      if (!cadPrompt) return;
      saveCadStateToHistory();

      if (cadPrompt.type === 'TEXT') {
         if (cadPromptValue && cadPromptValue.trim()) {
            setCadTexts(prev => [...prev, { id: Date.now().toString(), x: cadPrompt.svgPt.x, y: cadPrompt.svgPt.y, text: cadPromptValue, fontSize: cadViewport.width * 0.02, hexColor: '#e2e8f0' }]);
         }
         setCadPrompt(null);
         return;
      }

      const num = parseFloat(cadPromptValue);
      if (isNaN(num) || num <= 0) { setCadPrompt(null); return; }

      if (cadPrompt.type === 'LINE') {
        const line = cadLines.find(l => l.id === cadPrompt.targetId);
        if (!line) { setCadPrompt(null); return; }
        const pxLength = Math.hypot(line.p1.x - line.p2.x, line.p1.y - line.p2.y);
        if (!cadScale) {
          setCadScale(num / pxLength);
          setCadLines(prev => prev.map(l => l.id === line.id ? { ...l, fixedLength: num } : l));
        } else {
          const targetPx = num / cadScale;
          const ratio = targetPx / pxLength;
          const newP2 = {
            x: line.p1.x + (line.p2.x - line.p1.x) * ratio,
            y: line.p1.y + (line.p2.y - line.p1.y) * ratio
          };
          setCadLines(prev => prev.map(l => l.id === line.id ? { ...l, p2: newP2, fixedLength: num } : l));
        }
      } else if (cadPrompt.type === 'RADIUS') {
        if (!cadScale) { alert("Draw and dimension a baseline first to establish scale."); setCadPrompt(null); return; }
        const rPx = num / cadScale;
        setCadCircles(prev => [...prev, { id: Date.now().toString(), center: cadPrompt.center, radiusMeters: num, radiusPixels: rPx, strokeWidth: 3, hexColor: '#4f46e5' }]);
        
        const minX = cadPrompt.center.x - rPx, maxX = cadPrompt.center.x + rPx;
        const minY = cadPrompt.center.y - rPx, maxY = cadPrompt.center.y + rPx;
        const reqWidth = (maxX - minX) * 1.2, reqHeight = (maxY - minY) * 1.2;
        
        setCadViewport(prev => {
          let nX = prev.x, nY = prev.y, nW = prev.width, nH = prev.height;
          if (minX < prev.x || maxX > prev.x + prev.width || minY < prev.y || maxY > prev.y + prev.height) {
            nW = Math.max(prev.width, reqWidth); nH = Math.max(prev.height, reqHeight);
            if (minX < prev.x) nX = minX - nW * 0.1;
            if (maxX > nX + nW) nX = maxX - nW * 0.9;
            if (minY < prev.y) nY = minY - nH * 0.1;
            if (maxY > nY + nH) nY = maxY - nH * 0.9;
          }
          return { x: nX, y: nY, width: nW, height: nH };
        });
      }
      setCadPrompt(null);
    } catch (err) {
      console.error("submitCadPrompt critical failure:", err);
      setCadPrompt(null);
    }
  };

  const handleCadEditSave = () => {
      saveCadStateToHistory();
     if (cadSelectedLine) {
       const l = cadLines.find(x => x.id === cadSelectedLine);
       if (l && cadScale) {
         const num = parseFloat(cadEditInputs.length) || l.fixedLength;
         const pxLength = Math.hypot(l.p1.x - l.p2.x, l.p1.y - l.p2.y);
         const targetPx = num / cadScale;
         const ratio = targetPx / pxLength;
         const newP2 = {
            x: l.p1.x + (l.p2.x - l.p1.x) * ratio,
            y: l.p1.y + (l.p2.y - l.p1.y) * ratio
         };
         setCadLines(prev => prev.map(x => x.id === cadSelectedLine ? { ...x, p2: newP2, fixedLength: num, strokeWidth: cadEditInputs.weight, hexColor: cadEditInputs.hex } : x));
       } else {
         setCadLines(prev => prev.map(x => x.id === cadSelectedLine ? { ...x, strokeWidth: cadEditInputs.weight, hexColor: cadEditInputs.hex } : x));
       }
       setCadSelectedLine(null);
     }
     
     if (cadSelectedCircle) {
        const c = cadCircles.find(x => x.id === cadSelectedCircle);
        if (c && cadScale) {
           const num = parseFloat(cadEditInputs.length) || c.radiusMeters;
           const rPx = num / cadScale;
           setCadCircles(prev => prev.map(x => x.id === cadSelectedCircle ? { ...x, radiusMeters: num, radiusPixels: rPx, strokeWidth: cadEditInputs.weight, hexColor: cadEditInputs.hex } : x));
        }
        setCadSelectedCircle(null);
     }
  };
  
  const handleCadEditDelete = () => {
     if (cadSelectedLine) setCadLines(prev => prev.filter(x => x.id !== cadSelectedLine));
     if (cadSelectedCircle) setCadCircles(prev => prev.filter(x => x.id !== cadSelectedCircle));
     setCadSelectedLine(null);
     setCadSelectedCircle(null);
  };
  // --- END MANUAL CAD ENGINE STATE ---

  const [showDarkDrawSettings, setShowDarkDrawSettings] = React.useState(false);
  
  // FMB Scale Extraction State
  const [pdfScaleStatus, setPdfScaleStatus] = React.useState(''); // 'found', 'not_found', 'error'
  const [pdfScale, setPdfScale] = React.useState('');
  const [isExtractingScale, setIsExtractingScale] = React.useState(false);
  const [pdfBase64, setPdfBase64] = React.useState('');
  
  // Persistent Storage State
  const [projects, setProjects] = React.useState([]);
  const [activeMapMenuId, setActiveMapMenuId] = React.useState(null);
  const [currentProjectId, setCurrentProjectId] = React.useState(null);
  const [showAllProjects, setShowAllProjects] = React.useState(false);
  const [showWorkspaceCalculation, setShowWorkspaceCalculation] = React.useState(false);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [calculatedLandArea, setCalculatedLandArea] = React.useState({ hectareAres: '0 Hect, 0 Ares', acre: '0', cent: '0' });
  const [isSavingCalculations, setIsSavingCalculations] = React.useState(false);
  const [calculationsSaved, setCalculationsSaved] = React.useState(false);
  const [isMetricSquare, setIsMetricSquare] = React.useState(false);
  const [isFmbMetricSquare, setIsFmbMetricSquare] = React.useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = React.useState(false);

  const getHVal = () => workspaceArea ? (parseInt(workspaceArea.h, 10) || 0) : 0;
  const getAVal = () => workspaceArea ? (parseFloat(workspaceArea.a) || 0) : 0;
  const getSqm = () => ( (getHVal() + (getAVal() / 100)) * 10000 ).toFixed(2);
  const getSqft = () => ( (getHVal() + (getAVal() / 100)) * 107639.1 ).toFixed(2);

  const handleSaveCalculations = async () => {
    if (!currentProjectId) return;
    setIsSavingCalculations(true);
    setCalculationsSaved(false);
    try {
      const metadata = JSON.stringify({
        surveyNumber: workspaceSurveyNumber,
        subDivision: workspaceSubDivision,
        area: workspaceArea,
        calculated: calculatedLandArea
      });
      const res = await fetch(`${API_BASE}/api/fmb-maps/${currentProjectId}/calculations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata })
      });
      if (res.ok) setCalculationsSaved(true);
    } catch (err) {
      console.error("Failed to save calculations", err);
    }
    setIsSavingCalculations(false);
  };

  const handleCalculateClick = () => {
    if (showWorkspaceCalculation) {
      setShowWorkspaceCalculation(false);
      return;
    }
    
    setShowWorkspaceCalculation(true);
    setIsCalculating(true);
    setCalculationsSaved(false);

    setTimeout(() => {
        if (workspaceArea && workspaceArea.h !== undefined && workspaceArea.a !== undefined) {
          const h = parseInt(workspaceArea.h, 10) || 0;
          const a = parseFloat(workspaceArea.a) || 0;
          
          const totalHectare = h + (a / 100);
          const totalAcre = totalHectare * 2.47105;
          const totalCent = totalAcre * 100;

          setCalculatedLandArea({
            hectareAres: `${h.toString().padStart(2, '0')} Hect, ${a.toFixed(2)} Ares`,
            acre: totalAcre.toFixed(4),
            cent: totalCent.toFixed(2)
          });
        } else {
          setCalculatedLandArea({ hectareAres: '0 Hect, 0 Ares', acre: '0', cent: '0' });
        }
        setIsCalculating(false);
    }, 800);
  };

  React.useEffect(() => {
    if (!activeMapMenuId) return;
    const handleDismiss = () => setActiveMapMenuId(null);
    document.addEventListener('click', handleDismiss);
    window.addEventListener('scroll', handleDismiss, true);
    return () => {
      document.removeEventListener('click', handleDismiss);
      window.removeEventListener('scroll', handleDismiss, true);
    };
  }, [activeMapMenuId]);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/fmb-maps`);
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProjects([]);
    }
  };

  React.useEffect(() => {
    fetchProjects();
  }, []);

  const loadProject = async (id) => {
    setActiveLandSurveyView('recreate_fmb');
    setFmbWorkflowState('canvas');
    setCurrentProjectId(id);
    setIsLoadingWorkspace(true);
    setExtractedVectors(null);
    setPdfScale(null);
    setSourceImage('');
    setWorkspaceSurveyNumber('');
    setWorkspaceSubDivision('');
    setWorkspaceArea(null);
    setShowWorkspaceCalculation(false);
    setCalculatedLandArea({ hectareAres: '0 Hect, 0 Ares', acre: '0', cent: '0' });

    try {
      const response = await fetch(`${API_BASE}/api/fmb-maps/${id}`);
      const data = await response.json();
      setExtractedVectors(data.svg_data);
      setPdfScale(data.scale);
      if (data.source_image_base64) {
        setSourceImage(data.source_image_base64);
      }
      if (data.survey_number) {
         try {
           const metadata = JSON.parse(data.survey_number);
           setWorkspaceSurveyNumber(metadata.surveyNumber || '');
           setWorkspaceSubDivision(metadata.subDivision || '');
           setWorkspaceArea(metadata.area || null);
           if (metadata.calculated) {
               setCalculatedLandArea(metadata.calculated);
           }
         } catch(e) {
           const nameStr = data.name || '';
           if (nameStr.includes('/')) {
             const parts = nameStr.split('/');
             setWorkspaceSurveyNumber(parts[0].trim());
             setWorkspaceSubDivision(parts.slice(1).join('/').trim());
           } else {
             setWorkspaceSurveyNumber(nameStr);
             setWorkspaceSubDivision('');
           }
         }
      } else {
         const nameStr = data.name || '';
         if (nameStr.includes('/')) {
           const parts = nameStr.split('/');
           setWorkspaceSurveyNumber(parts[0].trim());
           setWorkspaceSubDivision(parts.slice(1).join('/').trim());
         } else {
           setWorkspaceSurveyNumber(nameStr);
           setWorkspaceSubDivision('');
         }
      }
    } catch (err) {
      console.error("Failed to load map", err);
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  const deleteProject = async (id) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await fetch(`${API_BASE}/api/fmb-maps/${id}`, { method: 'DELETE' });
      fetchProjects();
    } catch (err) {
      console.error(err);
    }
    setActiveMapMenuId(null);
  };

  const handleRename = async (id) => {
    const newName = prompt("Enter new map name:");
    if (!newName) return;
    try {
      await fetch(`${API_BASE}/api/fmb-maps/${id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      fetchProjects();
    } catch (err) {
      console.error(err);
    }
    setActiveMapMenuId(null);
  };
  
  // FMB Workflow States (Task 2)
  const [fmbWorkflowState, setFmbWorkflowState] = React.useState('extract'); // extract, crop, canvas
  const [workspaceSurveyNumber, setWorkspaceSurveyNumber] = React.useState('');
  const [workspaceSubDivision, setWorkspaceSubDivision] = React.useState('');
  const [workspaceArea, setWorkspaceArea] = React.useState(null);
  const [sourceImage, setSourceImage] = React.useState(null);
  const [croppedImage, setCroppedImage] = React.useState(null);
  const [extractedVectors, setExtractedVectors] = React.useState(null);
  const [isExtractingVectors, setIsExtractingVectors] = React.useState(false);
  const [cropBox, setCropBox] = React.useState({ x: 10, y: 10, width: 80, height: 80 });
  const [activeCropHandle, setActiveCropHandle] = React.useState(null);
  const cropContainerRef = React.useRef(null);

  const handleCropTouchStart = (e, handle) => {
    e.stopPropagation();
    setActiveCropHandle(handle);
  };

  const handleCropTouchMove = (e) => {
    if (!activeCropHandle || !cropContainerRef.current) return;
    const touch = e.touches[0];
    const rect = cropContainerRef.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));

    setCropBox(prev => {
      let newBox = { ...prev };
      if (activeCropHandle.includes('n')) {
        const diff = py - prev.y;
        newBox.y = py;
        newBox.height = prev.height - diff;
      }
      if (activeCropHandle.includes('s')) {
        newBox.height = py - prev.y;
      }
      if (activeCropHandle.includes('w')) {
        const diff = px - prev.x;
        newBox.x = px;
        newBox.width = prev.width - diff;
      }
      if (activeCropHandle.includes('e')) {
        newBox.width = px - prev.x;
      }
      if (newBox.width < 10) newBox.width = 10;
      if (newBox.height < 10) newBox.height = 10;
      return newBox;
    });
  };

  const handleCropTouchEnd = () => {
    setActiveCropHandle(null);
  };

  const confirmCrop = async () => {
    if (!sourceImage) return;
    setIsExtractingVectors(true);
    const img = new Image();
    img.src = sourceImage;
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const sx = (cropBox.x / 100) * img.naturalWidth;
      const sy = (cropBox.y / 100) * img.naturalHeight;
      const sw = (cropBox.width / 100) * img.naturalWidth;
      const sh = (cropBox.height / 100) * img.naturalHeight;
      
      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      
      const croppedBase64 = canvas.toDataURL('image/png');
      setCroppedImage(croppedBase64);

      try {
        const response = await fetch(`${API_BASE}/api/extract-vectors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: croppedBase64, pdfBase64: pdfBase64, fullImageBase64: sourceImage, projectId: currentProjectId })
        });
        const data = await response.json();
        if (data.svg) {
          setExtractedVectors(data.svg);
            if (data.detectedScale) {
               setPdfScale(data.detectedScale);
            }
            if (data.detectedSurveyNumber) {
               setWorkspaceSurveyNumber(data.detectedSurveyNumber);
            }
            if (data.detectedSubDivision) {
               setWorkspaceSubDivision(data.detectedSubDivision);
            }
            if (data.detectedArea) {
               setWorkspaceArea(data.detectedArea);
            }
            if (data.id) {
             setCurrentProjectId(data.id);
          }
          fetchProjects(); // refresh projects
        } else {
          console.error("No SVG returned from backend:", data);
        }
      } catch (err) {
        console.error("Backend extraction failed:", err);
      }
      
      setIsExtractingVectors(false);
      setFmbWorkflowState('canvas');
    };
  };
  
  // Engine A: Patta Land Area Converter
  const [landRows, setLandRows] = React.useState([{ id: Date.now(), hectare: '', ares: '', topCent: '' }]);
  
  const [acreOutput, setAcreOutput] = React.useState('');
  const [centOutput, setCentOutput] = React.useState('');
  const [sqftOutput, setSqftOutput] = React.useState('');
  const [sqmOutput, setSqmOutput] = React.useState('');

  const calculateFromTop = (rows) => {
    const totalSqFt = rows.reduce((acc, r) => {
      const h = parseFloat(r.hectare) || 0;
      const a = parseFloat(r.ares) || 0;
      const c = parseFloat(r.topCent) || 0;
      return acc + (h * 107639.1) + ((a / 100) * 107639.1) + (c * 435.6);
    }, 0);
    const totalH = totalSqFt / 107639.1;
    setAcreOutput(totalSqFt > 0 ? (totalH * 2.47105).toFixed(4) : '');
    setCentOutput(totalSqFt > 0 ? (totalSqFt / 435.6).toFixed(2) : '');
    setSqftOutput(totalSqFt > 0 ? totalSqFt.toFixed(2) : '');
    setSqmOutput(totalSqFt > 0 ? (totalH * 10000).toFixed(2) : '');
  };

  const handleRowChange = (id, field, val) => {
    const newRows = landRows.map(r => r.id === id ? { ...r, [field]: val } : r);
    setLandRows(newRows);
    calculateFromTop(newRows);
  };

  const addLandRow = () => {
    setLandRows([...landRows, { id: Date.now(), hectare: '', ares: '', topCent: '' }]);
  };
  
  const removeLandRow = (id) => {
    if (landRows.length > 1) {
      const newRows = landRows.filter(r => r.id !== id);
      setLandRows(newRows);
      calculateFromTop(newRows);
    }
  };

  const applyReverse = (totalH, source) => {
    if (totalH <= 0) {
      setLandRows([{ id: Date.now(), hectare: '', ares: '', topCent: '' }]);
      if (source !== 'acre') setAcreOutput('');
      if (source !== 'centOut') setCentOutput('');
      if (source !== 'sqft') setSqftOutput('');
      if (source !== 'sqm') setSqmOutput('');
      return;
    }
    const h = Math.floor(totalH);
    const a = (totalH - h) * 100;
    setLandRows([{ id: Date.now(), hectare: h > 0 ? h.toString() : '', ares: a > 0 ? a.toFixed(2) : '', topCent: '' }]);

    const totalSqFt = totalH * 107639.1;
    if (source !== 'acre') setAcreOutput((totalH * 2.47105).toFixed(4));
    if (source !== 'centOut') setCentOutput((totalSqFt / 435.6).toFixed(2));
    if (source !== 'sqft') setSqftOutput(totalSqFt.toFixed(2));
    if (source !== 'sqm') setSqmOutput((totalH * 10000).toFixed(2));
  };

  const handleAcreChange = (val) => { setAcreOutput(val); applyReverse((parseFloat(val) || 0) / 2.47105, 'acre'); };
  const handleCentOutChange = (val) => { setCentOutput(val); applyReverse(((parseFloat(val) || 0) * 435.6) / 107639.1, 'centOut'); };
  const handleSqftChange = (val) => { setSqftOutput(val); applyReverse((parseFloat(val) || 0) / 107639.1, 'sqft'); };
  const handleSqmChange = (val) => { setSqmOutput(val); applyReverse((parseFloat(val) || 0) / 10000, 'sqm'); };

  // Engine B: Length Converter
  const [lengthVal1, setLengthVal1] = React.useState('');
  const [lengthVal2, setLengthVal2] = React.useState('');
  const [lengthMode, setLengthMode] = React.useState('Feet');

  // Engine C: FMB Vector Canvas Engine
  const [fmbTop, setFmbTop] = React.useState('');
  const [fmbBottom, setFmbBottom] = React.useState('');
  const [fmbLeft, setFmbLeft] = React.useState('');
  const [fmbRight, setFmbRight] = React.useState('');
  const [fmbUnit, setFmbUnit] = React.useState('Meter');
  const [fmbScale, setFmbScale] = React.useState(1);
  const [fmbRotation, setFmbRotation] = React.useState(0);
  const [fmbPanX, setFmbPanX] = React.useState(0);
  const [fmbPanY, setFmbPanY] = React.useState(0);
  const [isFmbFullScreen, setIsFmbFullScreen] = React.useState(false);
  const initialTouchRef = React.useRef(null);
  
  const handleTouchStartFMB = (e) => {
    if (e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      initialTouchRef.current = { type: 'pinch', distance, angle, scale: fmbScale, rotation: fmbRotation };
    } else if (e.touches.length === 1) {
      initialTouchRef.current = {
        type: 'pan',
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        panX: fmbPanX,
        panY: fmbPanY
      };
    }
  };

  const handleTouchMoveFMB = (e) => {
    if (e.touches.length === 2 && initialTouchRef.current?.type === 'pinch') {
      if (e.cancelable) e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      const scaleFactor = distance / initialTouchRef.current.distance;
      let newScale = initialTouchRef.current.scale * scaleFactor;
      if (newScale < 0.2) newScale = 0.2;
      if (newScale > 5) newScale = 5;
      
      let angleDiff = angle - initialTouchRef.current.angle;
      let newRotation = initialTouchRef.current.rotation + angleDiff;
      
      setFmbScale(newScale);
      setFmbRotation(newRotation);
    } else if (e.touches.length === 1 && initialTouchRef.current?.type === 'pan') {
      if (e.cancelable) e.preventDefault();
      const dx = e.touches[0].clientX - initialTouchRef.current.startX;
      const dy = e.touches[0].clientY - initialTouchRef.current.startY;
      setFmbPanX(initialTouchRef.current.panX + dx);
      setFmbPanY(initialTouchRef.current.panY + dy);
    }
  };

  const handleTouchEndFMB = () => {
    initialTouchRef.current = null;
  };

  const handleResetFMB = () => {
    setFmbTop('');
    setFmbBottom('');
    setFmbLeft('');
    setFmbRight('');
    setFmbScale(1);
    setFmbRotation(0);
    setFmbPanX(0);
    setFmbPanY(0);
  };

  const handleLength1Change = (val, mode = lengthMode) => {
    setLengthVal1(val);
    if (!val) { setLengthVal2(''); return; }
    const v = parseFloat(val);
    if (isNaN(v)) { setLengthVal2(''); return; }
    if (mode === 'Feet') setLengthVal2((v * 0.3048).toFixed(4));
    else if (mode === 'Inches') setLengthVal2((v * 0.0254).toFixed(4));
    else if (mode === 'Yards') setLengthVal2((v * 0.9144).toFixed(4));
    else if (mode === 'Centimeter') setLengthVal2((v / 100).toFixed(4));
  };

  const handleLength2Change = (val, mode = lengthMode) => {
    setLengthVal2(val);
    if (!val) { setLengthVal1(''); return; }
    const v = parseFloat(val);
    if (isNaN(v)) { setLengthVal1(''); return; }
    if (mode === 'Feet') setLengthVal1((v / 0.3048).toFixed(4));
    else if (mode === 'Inches') setLengthVal1((v / 0.0254).toFixed(4));
    else if (mode === 'Yards') setLengthVal1((v / 0.9144).toFixed(4));
    else if (mode === 'Centimeter') setLengthVal1((v * 100).toFixed(4));
  };

  const handleLengthModeChange = (mode) => {
    setLengthMode(mode);
    handleLength1Change(lengthVal1, mode); // Re-evaluate based on new mode
  };

  const closeLandSurvey = () => {
    setShowLandSurveyDashboard(false);
    setActiveLandSurveyView('menu');
  };

  const [staffImages, setStaffImages] = React.useState({
    vignesh: "https://ui-avatars.com/api/?name=Vignesh&background=random",
    ganesh: "https://ui-avatars.com/api/?name=Ganesh&background=random",
    joseph: "https://ui-avatars.com/api/?name=Joseph+Vijay&background=random"
  });

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('everest_customers');
      if (saved) {
        const parsed = JSON.parse(saved);
        const vignesh = parsed.find(c => c.name && c.name.toLowerCase().includes('vignesh'));
        const ganesh = parsed.find(c => c.name && c.name.toLowerCase().includes('ganesh'));
        const joseph = parsed.find(c => c.name && c.name.toLowerCase().includes('joseph'));
        
        setStaffImages({
          vignesh: vignesh?.image || "https://ui-avatars.com/api/?name=Vignesh&background=random",
          ganesh: ganesh?.image || "https://ui-avatars.com/api/?name=Ganesh&background=random",
          joseph: joseph?.image || "https://ui-avatars.com/api/?name=Joseph+Vijay&background=random"
        });
      }
    } catch(e) {}
  }, []);

  // Ref to track currently hovered element during touch drag
  const currentTouchCardRef = React.useRef(null);

  const handleTouchStart = (e) => {
    const card = e.target.closest('.interactive-card');
    if (card) {
      card.classList.add('touch-boom');
      currentTouchCardRef.current = card;
    }
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = element?.closest('.interactive-card');
    
    if (currentTouchCardRef.current && currentTouchCardRef.current !== card) {
      currentTouchCardRef.current.classList.remove('touch-boom');
    }
    
    if (card && currentTouchCardRef.current !== card) {
      card.classList.add('touch-boom');
      currentTouchCardRef.current = card;
    }
  };

  const handleTouchEnd = () => {
    if (currentTouchCardRef.current) {
      currentTouchCardRef.current.classList.remove('touch-boom');
      currentTouchCardRef.current = null;
    }
  };

  return (
    <div 
      className="flex-1 w-full bg-[#f8fafc] p-3 font-sans pb-4 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Total Collections Progress */}
      <div className={`bg-white rounded-xl p-3 mb-3 ${cardShadowClass}`}>
        <div className="flex justify-between items-center text-[11px] font-bold mb-1">
          <div className="text-slate-900 flex items-center gap-1 font-black uppercase text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Collection <span className="text-emerald-600 text-[13px] ml-0.5">₹15,450</span>
          </div>
          <div className="text-slate-900 flex items-center gap-1 font-black uppercase text-[10px]">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
            Target <span className="text-red-500 text-[13px] ml-0.5">₹25,000</span>
          </div>
        </div>
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mt-2">
          <div className="bg-[#1ca3a6] h-full rounded-full" style={{ width: '65%' }}></div>
        </div>
      </div>

      <h2 className="text-[15px] font-black mb-3 uppercase tracking-wide text-black">
        Admin Dashboard
      </h2>

      {/* Asymmetrical Grid of 4 Cards */}
      <div className="flex gap-3 mb-3">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-3">
          {/* 1. Collections Donut Chart (Largest & Tallest) */}
          <div className={`h-48 rounded-xl p-3 flex flex-col items-center justify-between ${cardShadowClass}`} style={{ background: 'linear-gradient(135deg, #10637c 0%, #0a3d4f 100%)' }}>
            <h3 className="text-white text-sm font-black tracking-wider mb-1 uppercase">Collections</h3>
            <div className="relative w-24 h-24 my-auto">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <defs>
                  <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                <path
                  className="text-[#d8892f]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  stroke="url(#arcGradient)"
                  strokeDasharray="65, 100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeWidth="4"
                />
              
                  {cadTexts.map(t => {
                     const isSelected = cadSelectedText === t.id;
                     return (
                        <text 
                           key={t.id} x={t.x} y={t.y} fill={isSelected ? "#fbcfe8" : (t.hexColor || "#ffffff")} 
                           fontSize={t.fontSize || cadViewport.width * 0.02} fontWeight="bold" textAnchor="middle"
                           pointerEvents="auto"
                           style={{ opacity: 1, visibility: 'visible' }}
                        >
                           {t.text}
                        </text>
                     );
                  })}
</svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white/80 text-[8px] font-bold">Collected:</span>
                <span className="text-white font-black text-sm leading-none mt-0.5">65%</span>
              </div>
            </div>
            <div className="text-center mt-1 w-full flex flex-col gap-0.5">
              <div className="text-white font-bold text-[9px] uppercase tracking-wide">Target <span className="text-white text-[12px] ml-0.5">₹25,000</span></div>
              <div className="text-white font-black text-[10px] uppercase tracking-wide">Collection <span className="text-white text-[13px] ml-0.5">₹15,450</span></div>
            </div>
          </div>

          {/* 2. Customer Recent List (Smallest) */}
          <button 
            onClick={() => setCurrentView('Customer')}
            className={`h-24 bg-white rounded-xl p-3 flex items-center gap-3 text-left ${cardShadowClass}`}
          >
            <div className="p-2 bg-slate-50 rounded-full text-[#0369a1] shadow-sm border border-slate-100 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="flex flex-col justify-center">
              <div className="font-black text-slate-800 text-sm tracking-wider uppercase mb-0.5">CUSTOMER</div>
              <div className="text-slate-600 text-[10px] font-bold">Recent the List</div>
            </div>
          </button>
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col gap-3">
          {/* 3. Centers Overview (Medium-Large) */}
          <div className={`h-40 bg-white rounded-xl p-3 flex flex-col justify-between ${cardShadowClass}`}>
            <h3 className="font-black text-slate-800 text-[12px] uppercase text-center mb-1 whitespace-nowrap">Centers Overview</h3>
            <div className="text-center my-auto">
              <div className="text-[#d8892f] text-3xl font-black leading-none">33</div>
              <div className="text-slate-800 text-[10px] font-black mt-1 uppercase tracking-wide">All Centers</div>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5 mb-1.5 mt-auto">
              <div className="text-center w-1/2">
                <div className="flex items-center justify-center gap-1 text-[10px] font-black text-slate-800 pr-2">
                  ACTIVE <span className="text-emerald-600 ml-0.5">20</span>
                </div>
                <div className="text-[9px] text-slate-600 font-bold leading-tight mt-0.5 pr-2">Current Status</div>
              </div>
              <div className="text-center w-1/2 border-l border-slate-100">
                <div className="flex items-center justify-center gap-1 text-[10px] font-black text-slate-800">
                  CLOSED <span className="text-red-500 ml-0.5">13</span>
                </div>
                <div className="text-[9px] text-slate-600 font-bold leading-tight mt-0.5">Current Status</div>
              </div>
            </div>
            <div className="flex justify-between text-[9px] font-black uppercase">
              <button className="text-[#0369a1]">All Centers &gt;</button>
              <button className="text-red-600">Closed &gt;</button>
            </div>
          </div>

          {/* 4. EMI Calculator (Medium-Small) */}
          <div className={`h-24 bg-white rounded-xl p-2.5 flex flex-col justify-between relative overflow-hidden cursor-pointer ${cardShadowClass}`} onClick={() => setCurrentView('EMI Calculator')}>
            <div>
              <h3 className="font-black text-slate-800 text-[12px] uppercase mb-0.5 whitespace-nowrap">EMI Calculator</h3>
              <div className="text-slate-600 text-[9px] font-bold whitespace-nowrap">Calculate Your Loan EMI</div>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#0369a1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="2" y1="10" x2="22" y2="10"></line>
                <circle cx="8" cy="15" r="1.5"></circle>
                <circle cx="12" cy="15" r="1.5"></circle>
                <circle cx="16" cy="15" r="1.5"></circle>
                <circle cx="8" cy="19" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
                <circle cx="16" cy="19" r="1.5"></circle>
              </svg>
              <span className="text-slate-400 font-bold text-sm">&gt;</span>
            </div>
          </div>
        </div>
      </div>
      {/* Floating Analytics Title in the Gap */}
      <div className="relative w-full h-0 z-10 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-[25%] flex justify-center items-end pb-1.5">
          <h3 className="font-black text-[#0369a1] text-[12px] uppercase whitespace-nowrap pointer-events-auto">Analytics</h3>
        </div>
      </div>

      {/* Business Overview & Analytics */}
      <div className={`rounded-xl mb-3 flex overflow-hidden ${cardShadowClass}`} style={{ background: 'linear-gradient(90deg, #10637c 0%, #0a3d4f 100%)' }}>
        <div className="w-[75%] p-3 pr-2 flex flex-col relative">
          <h3 className="text-white text-[11px] font-black tracking-wider mb-2 uppercase">Business Overview</h3>
          <div className="flex items-center gap-3 mb-3 text-[8px] font-bold text-white/90">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#d8892f] rounded-sm"></span> LOAN DISBURSEMENTS</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#06b6d4] rounded-sm"></span> COLLECTIONS</span>
          </div>
          
          {/* SVG Chart: Two Solid Bars Per Month */}
          <div className="h-24 w-full relative mt-auto border-b border-white/20 pl-6 pb-2 flex items-end justify-between pr-2">
             {/* SVG Wave Line underneath */}
             <div className="absolute top-0 bottom-2 left-6 right-2 z-0 overflow-hidden pointer-events-none">
               <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                 <defs>
                   <linearGradient id="waveGradient" x1="0" x2="0" y1="0" y2="1">
                     <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
                     <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                   </linearGradient>
                 </defs>
                 <path 
                   d="M 0,60 L 8,60 L 25,40 L 42,50 L 58,15 L 75,45 L 92,10 L 100,10 L 100,100 L 0,100 Z" 
                   fill="url(#waveGradient)" 
                 />
                 <path 
                   d="M 0,60 L 8,60 L 25,40 L 42,50 L 58,15 L 75,45 L 92,10 L 100,10" 
                   fill="none" 
                   stroke="#06b6d4" 
                   strokeWidth="2.5" 
                   style={{ filter: 'drop-shadow(0px 2px 4px rgba(6,182,212,0.8))' }}
                 />
               </svg>
             </div>
             
             {/* Y-Axis Labels - Made 100% visible */}
             <div className="absolute left-0 top-0 bottom-2 flex flex-col justify-between text-[7px] font-bold text-white/90 h-full z-10">
               <span>1000</span>
               <span>800</span>
               <span>600</span>
               <span>400</span>
               <span>200</span>
               <span>0</span>
             </div>
             
             {/* X-Axis Labels */}
             <div className="absolute -bottom-3.5 left-6 right-2 flex justify-between text-[7px] font-bold text-white/90 z-10">
               <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
             </div>
             
             {/* Bars (Disbursements / Collections Pairs) */}
             <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[30%] bg-[#d8892f] relative z-20"></div><div className="w-1.5 h-[20%] bg-[#06b6d4] relative z-20"></div></div>
             <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[50%] bg-[#d8892f] relative z-20"></div><div className="w-1.5 h-[35%] bg-[#06b6d4] relative z-20"></div></div>
             <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[40%] bg-[#d8892f] relative z-20"></div><div className="w-1.5 h-[25%] bg-[#06b6d4] relative z-20"></div></div>
             <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[60%] bg-[#d8892f] relative z-20"></div><div className="w-1.5 h-[40%] bg-[#06b6d4] relative z-20"></div></div>
             <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[45%] bg-[#d8892f] relative z-20"></div><div className="w-1.5 h-[30%] bg-[#06b6d4] relative z-20"></div></div>
             <div className="flex items-end gap-0.5 h-full z-10"><div className="w-1.5 h-[70%] bg-[#d8892f] relative z-20"></div><div className="w-1.5 h-[50%] bg-[#06b6d4] relative z-20"></div></div>
          </div>
        </div>
        
        {/* Analytics Section - Right Cut-off Container */}
        <div className="w-[32%] my-auto bg-white py-3 pl-2 pr-7 flex flex-col justify-center text-center relative rounded-l-3xl translate-x-6 shadow-[-4px_0_12px_rgba(0,0,0,0.1)]">
          <div className="mt-2">
            <div className="text-[#d8892f] font-black text-xs">₹8,250</div>
            <div className="text-slate-800 text-[8px] font-black uppercase border-b border-slate-100 pb-1 mb-1">Disbursements</div>
            <div className="text-[#0369a1] font-black text-xs mt-1.5">₹5,450</div>
            <div className="text-slate-800 text-[8px] font-black uppercase">Collections</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Staff Management */}
        <div className={`bg-white rounded-xl p-3 flex flex-col justify-between ${cardShadowClass}`}>
          <h3 className="font-black text-slate-800 text-[10px] tracking-wider uppercase mb-2">Staff Management</h3>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <img src={staffImages.vignesh} className="w-7 h-7 rounded-full border-2 border-white shadow-sm object-cover" alt="Vignesh" />
              <img src={staffImages.ganesh} className="w-7 h-7 rounded-full border-2 border-white shadow-sm object-cover" alt="Ganesh" />
              <img src={staffImages.joseph} className="w-7 h-7 rounded-full border-2 border-white shadow-sm object-cover" alt="Joseph Vijay" />
            </div>
            <span className="text-slate-400 font-bold text-sm">&gt;</span>
          </div>
        </div>

        {/* Application Status */}
        <div 
          className={`bg-white rounded-xl p-3 flex flex-col justify-between ${cardShadowClass}`}
          onClick={() => setCurrentView('Application Status')}
        >
          <h3 className="font-black text-slate-800 text-[10px] tracking-wider uppercase mb-1">Application Status</h3>
          <div className="flex items-center justify-between relative mt-1 px-1">
            <div className="absolute top-1.5 left-2 right-2 h-0.5 bg-slate-200 z-0"></div>
            <div className="absolute top-1.5 left-2 w-1/2 h-0.5 bg-emerald-500 z-0"></div>
            
            <div className="flex flex-col items-center z-10">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] flex items-center justify-center font-black mb-1 shadow-sm border border-white">1</div>
              <div className="text-[7px] font-black text-slate-800 uppercase">Apply</div>
            </div>
            <div className="flex flex-col items-center z-10">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] flex items-center justify-center font-black mb-1 shadow-sm border border-white">2</div>
              <div className="text-[7px] font-black text-slate-800 uppercase">Progress</div>
            </div>
            <div className="flex flex-col items-center z-10">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 text-[7px] flex items-center justify-center font-black mb-1 shadow-sm border border-white">3</div>
              <div className="text-[7px] font-black text-slate-800 uppercase">Status</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`bg-white rounded-xl p-2 flex flex-col items-center justify-center text-center gap-1.5 py-3 ${cardShadowClass}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0369a1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <div className="font-black text-slate-800 text-[8px] uppercase tracking-wider">Collection<br/>Reports</div>
        </div>
        <div 
          className={`bg-white rounded-xl p-2 flex flex-col items-center justify-center text-center gap-1.5 py-3 ${cardShadowClass} cursor-pointer`}
          onClick={() => setShowLandSurveyDashboard(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0369a1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="font-black text-slate-800 text-[8px] uppercase tracking-wider">Land<br/>Survey</div>
        </div>
        <div className={`bg-white rounded-xl p-2 flex flex-col items-center justify-center text-center gap-1.5 py-3 ${cardShadowClass}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0369a1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="font-black text-slate-800 text-[8px] uppercase tracking-wider">Attendance</div>
        </div>
      </div>

      {/* Land Survey Dashboard Overlay Route */}
      {showLandSurveyDashboard && (
        <div className="fixed inset-0 z-[120] bg-[#f8fafc] flex flex-col animate-in slide-in-from-right-full duration-300">
          {activeLandSurveyView !== 'dark_draw_manual' && activeLandSurveyView !== 'dark_draw_submenu' && activeLandSurveyView !== 'dark_draw_projects' && (
          <div className="bg-white px-5 py-4 border-b border-slate-100 flex items-center gap-4 shadow-sm relative z-10">
            <button 
              onClick={() => {
                if (activeLandSurveyView === 'menu') {
                  setShowLandSurveyDashboard(false);
                } else {
                  if (activeLandSurveyView === 'fmb' || activeLandSurveyView === 'recreate_fmb') {
                    setPdfBase64('');
                    setPdfScaleStatus('');
                    setPdfScale('');
                    setSourceImage(null);
                    setCroppedImage(null);
                    setExtractedVectors(null);
                    setShowWorkspaceCalculation(false);
                    setCalculatedLandArea({ hectareAres: '0 Hect, 0 Ares', acre: '0', cent: '0' });
                    setCurrentProjectId(null);
                    setFmbTop(''); setFmbBottom(''); setFmbLeft(''); setFmbRight(''); setFmbUnit('Meter');
                  }
                  setActiveLandSurveyView('menu');
                }
              }}
              className="w-10 h-10 -ml-2 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mt-0.5">
              {activeLandSurveyView === 'simple' ? 'Simple Land View' : 
               activeLandSurveyView === 'recreate_fmb' ? 'FMB SCALE EXTRACTION' : 
               activeLandSurveyView === 'fmb' ? 'Field Measurement Book' : 
               activeLandSurveyView === 'dark_draw_manual' ? 'DARK DRAW FMB' : 
               'Land Survey'}
            </h2>
          </div>
        )}

          {activeLandSurveyView === 'menu' ? (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* Card 1 */}
              <div 
                className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-between active:scale-95 transition-transform cursor-pointer"
                onClick={() => setActiveLandSurveyView('simple')}
              >
                <div>
                  <h3 className="font-black text-[#0369a1] text-[15px] uppercase tracking-wide">Simple Lands View</h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-1 tracking-wide">View basic land parameters</p>
                </div>
                <div className="w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>

              {/* Card 2 */}
              <div 
                className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-between active:scale-95 transition-transform cursor-pointer"
                onClick={() => setActiveLandSurveyView('fmb')}
              >
                <div>
                  <h3 className="font-black text-[#0369a1] text-[15px] uppercase tracking-wide">Field Measurement Book</h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-1 tracking-wide">Access master measurements</p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>

              {/* Card 3 */}
              <div 
                className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-between active:scale-95 transition-transform cursor-pointer"
                onClick={() => {
                  setCurrentProjectId(null);
                  setExtractedVectors(null);
                  setPdfScale('');
                  setWorkspaceSurveyNumber('');
                  setWorkspaceSubDivision('');
                  setWorkspaceArea(null);
                  setCurrentProjectId(null);
                  setShowWorkspaceCalculation(false);
                  setCalculatedLandArea({ hectareAres: '0 Hect, 0 Ares', acre: '0', cent: '0' });
                  setFmbWorkflowState('extract');
                  setActiveLandSurveyView('recreate_fmb');
                }}
              >
                <div>
                  <h3 className="font-black text-[#0369a1] text-[15px] uppercase tracking-wide">Recreate FMB</h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-1 tracking-wide">Draft new measurement layouts</p>
                </div>
                <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
              {/* Card 4 */}
              <div 
                className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-between active:scale-95 transition-transform cursor-pointer"
                onClick={() => setActiveLandSurveyView('dark_draw_submenu')}
              >
                <div>
                  <h3 className="font-black text-[#0369a1] text-[15px] uppercase tracking-wide">DARK DRAW FMB</h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-1 tracking-wide">Advanced manual drawing mode</p>
                </div>
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </div>
              </div>
            </div>
          ) : activeLandSurveyView === 'simple' ? (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 animate-in slide-in-from-right-8 duration-300">
              {/* Engine A: Patta Land Area Converter */}
              <div className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-800 text-[12px] uppercase tracking-wide">Land Area Converter</h4>
                </div>

                <div className="flex flex-col gap-3">
                  {landRows.map((row, index) => (
                    <div key={row.id} className="flex gap-2 items-end relative">
                      <div className="flex-[1.2]">
                        {index === 0 && <label className="text-[10px] text-[#0369a1] font-black mb-1 block uppercase">Hectare</label>}
                        <input type="number" value={row.hectare} onChange={e => handleRowChange(row.id, 'hectare', e.target.value)} className="w-full bg-sky-50/50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-black text-slate-800 outline-none focus:border-[#0369a1] transition-colors shadow-inner" placeholder="0" />
                      </div>
                      <div className="flex-[1.2]">
                        {index === 0 && <label className="text-[10px] text-[#0369a1] font-black mb-1 block uppercase">Ares</label>}
                        <input type="number" value={row.ares} onChange={e => handleRowChange(row.id, 'ares', e.target.value)} className="w-full bg-sky-50/50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-black text-slate-800 outline-none focus:border-[#0369a1] transition-colors shadow-inner" placeholder="0" />
                      </div>
                      <div className="flex-[1.4]">
                        {index === 0 && <label className="text-[10px] text-[#0369a1] font-black mb-1 block uppercase">Cent</label>}
                        <div className="flex items-center gap-1">
                          <input type="number" value={row.topCent} onChange={e => handleRowChange(row.id, 'topCent', e.target.value)} className="w-full bg-sky-50/50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-black text-slate-800 outline-none focus:border-[#0369a1] transition-colors shadow-inner" placeholder="0" />
                          {index === landRows.length - 1 ? (
                            <button onClick={addLandRow} className="w-9 h-9 ml-1 bg-[#0369a1] text-white rounded-lg flex items-center justify-center shadow-md shrink-0 hover:bg-[#0284c7] transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            </button>
                          ) : (
                            <button onClick={() => removeLandRow(row.id)} className="w-9 h-9 ml-1 bg-red-50 text-red-500 border border-red-100 rounded-lg flex items-center justify-center shrink-0 hover:bg-red-100 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div>
                    <label className="text-[10px] text-emerald-600 font-black mb-1 block uppercase">Acre (Inverse)</label>
                    <input type="number" value={acreOutput} onChange={e => handleAcreChange(e.target.value)} className="w-full bg-[#f8fafc] border border-emerald-200/50 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-emerald-500 transition-colors shadow-inner" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-600 font-black mb-1 block uppercase">Cent (Inverse)</label>
                    <input type="number" value={centOutput} onChange={e => handleCentOutChange(e.target.value)} className="w-full bg-[#f8fafc] border border-emerald-200/50 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-emerald-500 transition-colors shadow-inner" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-600 font-black mb-1 block uppercase">Square Feet</label>
                    <input type="number" value={sqftOutput} onChange={e => handleSqftChange(e.target.value)} className="w-full bg-[#f8fafc] border border-emerald-200/50 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-emerald-500 transition-colors shadow-inner" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-600 font-black mb-1 block uppercase">Square Meter</label>
                    <input type="number" value={sqmOutput} onChange={e => handleSqmChange(e.target.value)} className="w-full bg-[#f8fafc] border border-emerald-200/50 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-emerald-500 transition-colors shadow-inner" placeholder="0.00" />
                  </div>
                </div>
              </div>

              {/* Engine B: Plot Length Converter */}
              <div className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-800 text-[12px] uppercase tracking-wide">Plot Length Converter</h4>
                  <select 
                    value={lengthMode}
                    onChange={(e) => handleLengthModeChange(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-1.5 outline-none shadow-sm focus:border-[#0369a1]"
                  >
                    <option value="Feet">Feet &lt;-&gt; Meter</option>
                    <option value="Inches">Inches &lt;-&gt; Meter</option>
                    <option value="Yards">Yards &lt;-&gt; Meter</option>
                    <option value="Centimeter">Centimeter &lt;-&gt; Meter</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-[#0369a1] font-black mb-1 block uppercase">{lengthMode}</label>
                    <input type="number" value={lengthVal1} onChange={e => handleLength1Change(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-slate-800 outline-none focus:border-[#0369a1] transition-colors shadow-inner" placeholder="0" />
                  </div>
                  <div className="mt-5 text-slate-300 shrink-0 px-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h8M8 17h8M12 4v16" /></svg>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-amber-600 font-black mb-1 block uppercase">Meter</label>
                    <input type="number" value={lengthVal2} onChange={e => handleLength2Change(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-slate-800 outline-none focus:border-amber-500 transition-colors shadow-inner" placeholder="0" />
                  </div>
                </div>
              </div>
            </div>
          ) : activeLandSurveyView === 'fmb' ? (
            <div className={`flex flex-col bg-slate-50 overflow-y-auto animate-in slide-in-from-right-8 duration-300 ${isFmbFullScreen ? 'fixed inset-0 z-[150] h-full' : 'flex-1 h-full relative'}`}>
              
              {/* Upper Section Scalable Screen */}
              <div className={`${isFmbFullScreen ? 'flex-1' : 'min-h-[60vh] shrink-0'} w-full relative flex flex-col items-center justify-center pt-8 pb-4 px-4 bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0]`}>
                {/* Floating Right Micro Controls */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2 bg-white/60 backdrop-blur-md p-1 rounded-xl shadow-sm border border-slate-200/50">
                  <button onClick={() => setIsFmbFullScreen(!isFmbFullScreen)} className="w-6 h-6 bg-slate-800 rounded-md flex items-center justify-center text-white shadow-md active:scale-95 transition-transform">
                    {isFmbFullScreen ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    )}
                  </button>
                </div>

                {/* Real-Time Auto-Scaling Vector Canvas */}
                <div 
                  className="flex-1 w-full bg-white rounded-3xl shadow-inner border-2 border-slate-200/50 relative flex items-center justify-center overflow-hidden touch-none"
                  onTouchStart={handleTouchStartFMB}
                  onTouchMove={handleTouchMoveFMB}
                  onTouchEnd={handleTouchEndFMB}
                  onTouchCancel={handleTouchEndFMB}
                >
                  {(() => {
                    let multiplier = 1;
                    if (fmbUnit === 'Feet') multiplier = 0.3048;
                    else if (fmbUnit === 'Centimeter (Cm)') multiplier = 0.01;
                    else if (fmbUnit === 'Millimeter (Mm)') multiplier = 0.001;

                    const t = (parseFloat(fmbTop) || 0) * multiplier;
                    const b = (parseFloat(fmbBottom) || 0) * multiplier;
                    const l = (parseFloat(fmbLeft) || 0) * multiplier;
                    const r = (parseFloat(fmbRight) || 0) * multiplier;
                    
                    if (t > 0 && b > 0 && l > 0 && r > 0) {
                      const avgLength = (l + r) / 2;
                      const avgWidth = (t + b) / 2;
                      const wMax = Math.max(t, b);
                      const hMax = avgLength;
                      
                      // Auto-Scaling ViewBox padding (Massive padding to replicate compact A4 layout)
                      const maxOverall = Math.max(wMax, hMax);
                      const vWidth = maxOverall * 4;
                      const vHeight = maxOverall * 4;
                      const cx = vWidth / 2;
                      const cy = vHeight / 2;

                      // Vector Coordinates (Perfect centering)
                      const p1 = `${cx - t/2},${cy - hMax/2}`;
                      const p2 = `${cx + t/2},${cy - hMax/2}`;
                      const p3 = `${cx + b/2},${cy + hMax/2}`;
                      const p4 = `${cx - b/2},${cy + hMax/2}`;

                      return (
                        <div style={{ transform: `translate(${fmbPanX}px, ${fmbPanY}px) scale(${fmbScale}) rotate(${fmbRotation}deg)`, transformOrigin: 'center', transition: fmbPanX === 0 && fmbPanY === 0 && fmbScale === 1 ? 'transform 0.2s ease-out' : 'none', width: '100%', height: '100%' }}>
                          <svg viewBox={`0 0 ${vWidth} ${vHeight}`} className="w-full h-full max-h-full drop-shadow-md">
                            {/* Closed Path Geometry */}
                            <polygon 
                              points={`${p1} ${p2} ${p3} ${p4}`} 
                              fill="transparent" 
                              stroke="#000000" 
                              strokeWidth="1.5" 
                              vectorEffect="non-scaling-stroke"
                              strokeLinejoin="miter"
                            />
                            {/* Top Label */}
                            <text x={cx} y={cy - hMax/2 - (vHeight*0.02)} textAnchor="middle" fill="#1d4ed8" fontSize={Math.max(vWidth, vHeight) * 0.02}>{parseFloat(fmbTop)}</text>
                            {/* Bottom Label */}
                            <text x={cx} y={cy + hMax/2 + (vHeight*0.03)} textAnchor="middle" fill="#1d4ed8" fontSize={Math.max(vWidth, vHeight) * 0.02}>{parseFloat(fmbBottom)}</text>
                            {/* Left Label */}
                            <text transform={`translate(${cx - Math.max(t,b)/2 - (vWidth*0.015)}, ${cy}) rotate(-90)`} textAnchor="middle" fill="#1d4ed8" fontSize={Math.max(vWidth, vHeight) * 0.02}>{parseFloat(fmbLeft)}</text>
                            {/* Right Label */}
                            <text transform={`translate(${cx + Math.max(t,b)/2 + (vWidth*0.015)}, ${cy}) rotate(-90)`} textAnchor="middle" fill="#1d4ed8" fontSize={Math.max(vWidth, vHeight) * 0.02}>{parseFloat(fmbRight)}</text>
                          </svg>
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-center text-slate-400 font-bold text-xs uppercase tracking-widest flex flex-col items-center opacity-60">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Enter 4 Coordinates
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Instant Trait Summary Labels Base */}
                <div className="w-full bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-slate-200/50 mt-3 flex flex-wrap justify-between gap-1 mb-2 shrink-0">
                  {(() => {
                    let multiplier = 1;
                    if (fmbUnit === 'Feet') multiplier = 0.3048;
                    else if (fmbUnit === 'Centimeter (Cm)') multiplier = 0.01;
                    else if (fmbUnit === 'Millimeter (Mm)') multiplier = 0.001;

                    const t = (parseFloat(fmbTop) || 0) * multiplier;
                    const b = (parseFloat(fmbBottom) || 0) * multiplier;
                    const l = (parseFloat(fmbLeft) || 0) * multiplier;
                    const r = (parseFloat(fmbRight) || 0) * multiplier;
                    
                    const avgLength = (l + r) / 2;
                    const avgWidth = (t + b) / 2;
                    const totalSqM = avgLength * avgWidth;
                    const totalHectares = totalSqM / 10000;
                    const fmb_h = Math.floor(totalHectares);
                    const fmb_a = (totalHectares - fmb_h) * 100;
                    const cent = totalSqM / 40.468;
                    const sqFt = totalSqM * 10.7639;
                    const acre = totalSqM / 4046.86;

                    return (
                      <>
                        <div className="w-[48%] bg-slate-50 rounded-lg p-2 border border-slate-100 flex flex-col items-center">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{isFmbMetricSquare ? 'Total Sq.M' : 'Hectare'}</span>
                          <span className="text-sm font-black text-slate-800">{isFmbMetricSquare ? (totalSqM > 0 ? totalSqM.toFixed(2) : '0.00') : (fmb_h > 0 ? fmb_h : '0')}</span>
                        </div>
                        <div className="w-[48%] bg-slate-50 rounded-lg p-2 border border-slate-100 flex flex-col items-center relative">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-0.5">
                            {isFmbMetricSquare ? 'Total Sq.Ft' : 'Ares'}
                            <button onClick={() => setIsFmbMetricSquare(!isFmbMetricSquare)} className="p-0.5 hover:bg-slate-200 rounded transition-colors active:scale-95 ml-0.5 text-slate-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                          </span>
                          <span className="text-sm font-black text-slate-800">{isFmbMetricSquare ? (sqFt > 0 ? sqFt.toFixed(2) : '0.00') : (fmb_a > 0 ? fmb_a.toFixed(2) : '0.00')}</span>
                        </div>
                        <div className="w-full bg-emerald-50/50 rounded-lg p-2 border border-emerald-100/50 flex flex-col items-center mt-1">
                          <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider mb-0.5">Estimated Cent</span>
                          <span className="text-xl font-black text-emerald-700">{cent > 0 ? cent.toFixed(2) : '0.00'}</span>
                          {cent >= 100 && (
                            <span className="text-[11px] text-emerald-700 font-bold mt-0.5 bg-emerald-100 px-3 py-0.5 rounded-full">
                              ~ {acre.toFixed(2)} Acres
                            </span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Lower Section Scrolling Inputs */}
              {!isFmbFullScreen && (
                <div className="bg-white border-t-2 border-slate-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] p-4 pt-5 z-10 flex flex-col justify-center gap-4 pb-8 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-wider text-slate-400">Boundary Dimensions</h4>
                    <div className="flex items-center gap-2">
                      <button onClick={handleResetFMB} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-red-100 shadow-sm active:scale-95 transition-transform">Reset</button>
                      <select 
                        value={fmbUnit}
                        onChange={(e) => setFmbUnit(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-[#0369a1] text-[10px] font-black rounded-lg px-2 py-1 outline-none shadow-sm focus:border-[#0369a1] uppercase"
                      >
                        <option value="Meter">Meter (Default)</option>
                        <option value="Feet">Feet</option>
                        <option value="Centimeter (Cm)">Centimeter (Cm)</option>
                        <option value="Millimeter (Mm)">Millimeter (Mm)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <div className="relative">
                      <label className="absolute -top-2 left-3 bg-white px-1 text-[9px] text-[#0369a1] font-black uppercase tracking-wider">Top ({fmbUnit === 'Meter' ? 'm' : fmbUnit === 'Feet' ? 'ft' : fmbUnit === 'Centimeter (Cm)' ? 'cm' : 'mm'})</label>
                      <input type="number" value={fmbTop} onChange={e => setFmbTop(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-800 outline-none focus:border-[#0369a1] transition-colors text-center shadow-inner" placeholder="0.0" />
                    </div>
                    <div className="relative">
                      <label className="absolute -top-2 left-3 bg-white px-1 text-[9px] text-[#0369a1] font-black uppercase tracking-wider">Bottom ({fmbUnit === 'Meter' ? 'm' : fmbUnit === 'Feet' ? 'ft' : fmbUnit === 'Centimeter (Cm)' ? 'cm' : 'mm'})</label>
                      <input type="number" value={fmbBottom} onChange={e => setFmbBottom(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-800 outline-none focus:border-[#0369a1] transition-colors text-center shadow-inner" placeholder="0.0" />
                    </div>
                    <div className="relative">
                      <label className="absolute -top-2 left-3 bg-white px-1 text-[9px] text-emerald-600 font-black uppercase tracking-wider">Left ({fmbUnit === 'Meter' ? 'm' : fmbUnit === 'Feet' ? 'ft' : fmbUnit === 'Centimeter (Cm)' ? 'cm' : 'mm'})</label>
                      <input type="number" value={fmbLeft} onChange={e => setFmbLeft(e.target.value)} className="w-full bg-emerald-50/30 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-emerald-800 outline-none focus:border-emerald-500 transition-colors text-center shadow-inner" placeholder="0.0" />
                    </div>
                    <div className="relative">
                      <label className="absolute -top-2 left-3 bg-white px-1 text-[9px] text-emerald-600 font-black uppercase tracking-wider">Right ({fmbUnit === 'Meter' ? 'm' : fmbUnit === 'Feet' ? 'ft' : fmbUnit === 'Centimeter (Cm)' ? 'cm' : 'mm'})</label>
                      <input type="number" value={fmbRight} onChange={e => setFmbRight(e.target.value)} className="w-full bg-emerald-50/30 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-emerald-800 outline-none focus:border-emerald-500 transition-colors text-center shadow-inner" placeholder="0.0" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeLandSurveyView === 'recreate_fmb' ? (
            <>
            {fmbWorkflowState === 'extract' && (
               <div className="flex flex-col bg-slate-50 overflow-y-auto animate-in slide-in-from-right-8 duration-300 flex-1 h-full relative">
              <div className="flex-1 w-full relative flex flex-col p-4 bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0]">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-4 text-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-wide">Select FMB File</h3>
                    <p className="text-xs text-slate-500 font-bold max-w-xs">Upload your PDF to automatically extract the scale matrix before rendering.</p>
                    
                    <label className="mt-2 bg-[#0369a1] hover:bg-[#0284c7] text-white px-6 py-3 rounded-xl font-black uppercase text-[13px] tracking-wider shadow-md cursor-pointer active:scale-95 transition-transform flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                       Upload PDF
                       <input type="file" accept=".pdf" className="hidden" onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                             const file = e.target.files[0];
                             setCurrentProjectId(null);
                             setIsExtractingScale(true);
                             setPdfScale('');
                             setPdfScaleStatus('');

                             const reader = new FileReader();
                             reader.readAsDataURL(file);
                             reader.onload = async () => {
                               setPdfBase64(reader.result);
                               try {
                                  const pdfLib = await loadPdfJsScript();
                                  const url = URL.createObjectURL(file);
                                  const loadingTask = pdfLib.getDocument(url);
                                  const pdf = await loadingTask.promise;
                                  const page = await pdf.getPage(1);
                                  
                                  // Render high-res image for cropping
                                  const viewport = page.getViewport({ scale: 2.5 });
                                  const canvas = document.createElement('canvas');
                                  const context = canvas.getContext('2d');
                                  canvas.height = viewport.height;
                                  canvas.width = viewport.width;
                                  await page.render({ canvasContext: context, viewport }).promise;
                                  setSourceImage(canvas.toDataURL('image/png'));
                                  
                                  // Automatically skip manual text extraction
                                  setFmbWorkflowState('crop');
                               } catch(err) {
                                  console.error("Error loading PDF:", err);
                               }
                               setIsExtractingScale(false);
                             };
                          }
                       }} />
                    </label>
                 </div>

                 {/* My Projects Grid */}
                 <div className="w-full mt-8 max-w-sm">
                    <h3 className="font-black text-slate-600 text-xs tracking-widest uppercase mb-4 text-center">My Projects</h3>
                    <div className="flex flex-col gap-2">
                       {projects.slice(0, showAllProjects ? projects.length : 3).map(p => (
                          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm relative hover:shadow-md transition-shadow">
                             <div className="flex flex-col cursor-pointer" onClick={() => loadProject(p.id)}>
                                <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Scale: {p.scale || 'N/A'} • {p.created_at ? new Date(p.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                             </div>
                             <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setActiveMapMenuId(activeMapMenuId === p.id ? null : p.id); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                </button>
                                {activeMapMenuId === p.id && (
                                   <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden">
                                      <button onClick={() => handleRename(p.id)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50">Rename</button>
                                      <button onClick={() => deleteProject(p.id)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">Delete</button>
                                   </div>
                                )}
                             </div>
                          </div>
                       ))}
                       {!showAllProjects && projects.length > 3 && (
                          <button onClick={() => setShowAllProjects(true)} className="mt-2 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors w-full shadow-sm">
                             Show More
                          </button>
                       )}
                       {showAllProjects && projects.length > 3 && (
                          <button onClick={() => setShowAllProjects(false)} className="mt-2 py-2 text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-wider transition-colors w-full">
                             Show Less
                          </button>
                       )}
                       {projects.length === 0 && (
                          <div className="text-center py-6 text-slate-400 text-[10px] font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">No saved projects</div>
                       )}
                    </div>
                 </div>

              </div>
            </div>
            )}
            
            {/* AutoCAD Dark Mode Views */}
            {fmbWorkflowState === 'crop' && (
              <div 
                className="flex flex-col bg-[#0f172a] overflow-hidden flex-1 h-full relative touch-none"
                onTouchMove={handleCropTouchMove}
                onTouchEnd={handleCropTouchEnd}
                onTouchCancel={handleCropTouchEnd}
              >
                <div className="bg-[#1e293b] px-5 py-4 border-b border-slate-700 flex items-center justify-between shadow-md relative z-20 shrink-0">
                  <div className="flex items-center gap-4">
                    <button onClick={() => {
                        setFmbWorkflowState('extract');
                        setCurrentProjectId(null);
                    }} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-300 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                      <h2 className="text-lg font-black text-slate-100 uppercase tracking-tight mt-0.5">Define Boundaries</h2>
                      <p className="text-[10px] text-slate-400 font-bold tracking-wider">AutoCAD Model Space</p>
                    </div>
                  </div>
                  <button disabled={isExtractingVectors} onClick={confirmCrop} className={`${isExtractingVectors ? 'bg-emerald-600/50' : 'bg-emerald-500 hover:bg-emerald-400'} text-white px-4 py-2 rounded-lg font-black uppercase text-[11px] tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-2`}>
                    {isExtractingVectors ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Extracting Vectors...
                      </>
                    ) : "Confirm Crop"}
                  </button>
                </div>
                
                <div className="flex-1 w-full relative p-6 flex items-center justify-center">
                  <div ref={cropContainerRef} className="relative max-w-full max-h-full border border-slate-700 shadow-2xl">
                    <img src={sourceImage} alt="Source" className="max-w-full max-h-full object-contain pointer-events-none" />
                    
                    {/* Dark Overlay Outside Crop */}
                    <div className="absolute inset-0 bg-black/60 pointer-events-none" style={{ clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${cropBox.x}% ${cropBox.y}%, ${cropBox.x}% ${cropBox.y + cropBox.height}%, ${cropBox.x + cropBox.width}% ${cropBox.y + cropBox.height}%, ${cropBox.x + cropBox.width}% ${cropBox.y}%, ${cropBox.x}% ${cropBox.y}%)` }}></div>
                    
                    {/* Crop Box Grid & Border */}
                    <div className="absolute border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] pointer-events-none" style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.width}%`, height: `${cropBox.height}%` }}>
                      <div className="w-full h-full border border-cyan-400/30 grid grid-cols-3 grid-rows-3">
                        <div className="border-r border-b border-cyan-400/20"></div><div className="border-r border-b border-cyan-400/20"></div><div className="border-b border-cyan-400/20"></div>
                        <div className="border-r border-b border-cyan-400/20"></div><div className="border-r border-b border-cyan-400/20"></div><div className="border-b border-cyan-400/20"></div>
                        <div className="border-r border-cyan-400/20"></div><div className="border-r border-cyan-400/20"></div><div></div>
                      </div>
                    </div>

                    {/* Corner Drag Handles */}
                    <div className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center cursor-nwse-resize" style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%` }} onTouchStart={(e) => handleCropTouchStart(e, 'nw')}><div className="w-4 h-4 bg-cyan-400 rounded-full shadow-md border-2 border-[#0f172a]"></div></div>
                    <div className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center cursor-nesw-resize" style={{ left: `${cropBox.x + cropBox.width}%`, top: `${cropBox.y}%` }} onTouchStart={(e) => handleCropTouchStart(e, 'ne')}><div className="w-4 h-4 bg-cyan-400 rounded-full shadow-md border-2 border-[#0f172a]"></div></div>
                    <div className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center cursor-sw-resize" style={{ left: `${cropBox.x}%`, top: `${cropBox.y + cropBox.height}%` }} onTouchStart={(e) => handleCropTouchStart(e, 'sw')}><div className="w-4 h-4 bg-cyan-400 rounded-full shadow-md border-2 border-[#0f172a]"></div></div>
                    <div className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center cursor-se-resize" style={{ left: `${cropBox.x + cropBox.width}%`, top: `${cropBox.y + cropBox.height}%` }} onTouchStart={(e) => handleCropTouchStart(e, 'se')}><div className="w-4 h-4 bg-cyan-400 rounded-full shadow-md border-2 border-[#0f172a]"></div></div>
                  </div>
                </div>
              </div>
            )}

            {fmbWorkflowState === 'canvas' && (
              <div className="flex flex-col bg-[#0f172a] overflow-hidden flex-1 h-full relative">
                <div className="bg-[#1e293b] px-5 py-4 border-b border-slate-700 flex items-center justify-between shadow-md relative z-20 shrink-0">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setFmbWorkflowState('crop')} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-300 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                      <h2 className="text-lg font-black text-cyan-400 uppercase tracking-tight mt-0.5">Workspace</h2>
                      <div className="flex items-center gap-2">
                         <p className="text-[10px] text-slate-400 font-bold tracking-wider">AutoCAD Mode Active</p>
                         <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[8px] font-black uppercase">Scale {pdfScale}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => {
                      setFmbWorkflowState('extract');
                      setCurrentProjectId(null);
                    }} className="w-8 h-8 bg-cyan-900/50 hover:bg-cyan-800 rounded-full flex items-center justify-center text-cyan-400 transition-colors shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  </button>
                </div>
                
                {isLoadingWorkspace ? (
                  <div className="flex-1 flex flex-col items-center justify-center relative p-8">
                    <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.4)]"></div>
                    <h3 className="text-cyan-400 font-black tracking-widest uppercase mb-2 animate-pulse">Loading Workspace</h3>
                    <p className="text-slate-500 text-xs font-bold text-center">Rendering geometric vectors...</p>
                  </div>
                ) : (
                  <>
                  {/* Workspace Inputs Card */}
                <div className="bg-[#1e293b] px-4 py-3 border-b border-slate-700 shadow-md relative z-10 shrink-0 flex items-stretch gap-4 justify-between w-full">
                  <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] sm:text-[10px] font-black text-cyan-400 uppercase w-20 sm:w-28 shrink-0 truncate">Survey No.</label>
                      <input type="text" value={workspaceSurveyNumber} onChange={e => setWorkspaceSurveyNumber(e.target.value)} className="flex-1 min-w-0 bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs sm:text-sm font-bold outline-none focus:border-cyan-500 shadow-inner" placeholder="e.g. 124" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] sm:text-[10px] font-black text-cyan-400 uppercase w-20 sm:w-28 shrink-0 truncate">Sub div</label>
                      <input type="text" value={workspaceSubDivision} onChange={e => setWorkspaceSubDivision(e.target.value)} className="flex-1 min-w-0 bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs sm:text-sm font-bold outline-none focus:border-cyan-500 shadow-inner" placeholder="e.g. 2A" />
                    </div>
                  </div>
                  <button onClick={handleCalculateClick} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 sm:px-6 rounded-xl font-black uppercase text-[10px] sm:text-[11px] tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center shrink-0 w-24">
                    {showWorkspaceCalculation ? 'Map View' : 'Calculate'}
                  </button>
                </div>
                
                {/* Main Dark Model Space Canvas */}
                <div className="flex-1 w-full relative p-4 flex items-center justify-center bg-[#0f172a] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
                  {showWorkspaceCalculation ? (
                    <div className="w-full h-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col border-4 border-slate-100/50">
                       <h3 className="font-black text-slate-800 text-lg uppercase tracking-wide mb-6 border-b border-slate-100 pb-4">Land Calculation Results</h3>
                       {isCalculating ? (
                          <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                             <div className="w-12 h-12 border-4 border-slate-200 border-t-cyan-500 rounded-full animate-spin"></div>
                             <p className="text-slate-500 font-bold text-sm tracking-wider uppercase animate-pulse">Calculating land metrics...</p>
                          </div>
                       ) : (
                         <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col">
                             <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                               <div className="flex-1 flex flex-col items-center border-r border-slate-200">
                                 <span className="text-slate-400 text-[9px] font-black uppercase tracking-wider mb-0.5">{isMetricSquare ? 'Total Square Meter' : 'Hectare'}</span>
                                 <span className="text-lg font-black text-slate-800">{isMetricSquare ? getSqm() : getHVal()}</span>
                               </div>
                               <div className="flex-1 flex flex-col items-center relative">
                                 <span className="text-slate-400 text-[9px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                   {isMetricSquare ? 'Total Square Feet' : 'Ares'}
                                   <button onClick={() => setIsMetricSquare(!isMetricSquare)} className="p-0.5 hover:bg-slate-200 rounded transition-colors active:scale-95 ml-0.5 text-slate-500">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                   </button>
                                 </span>
                                 <span className="text-lg font-black text-slate-800">{isMetricSquare ? getSqft() : getAVal().toFixed(2)}</span>
                               </div>
                             </div>
                             <div className="flex justify-between items-center">
                               <div className="flex-1 flex flex-col items-center border-r border-slate-200">
                                 <span className="text-slate-400 text-[9px] font-black uppercase tracking-wider mb-0.5">Total Acre</span>
                                 <span className="text-lg font-black text-slate-800">{calculatedLandArea.acre}</span>
                               </div>
                               <div className="flex-1 flex flex-col items-center">
                                 <span className="text-emerald-600/80 text-[9px] font-black uppercase tracking-wider mb-0.5">Total Cent</span>
                                 <span className="text-xl font-black text-emerald-700">{calculatedLandArea.cent}</span>
                               </div>
                             </div>
                           </div>
                       )}
                       <div className="mt-8 flex justify-end">
                             <button onClick={handleSaveCalculations} disabled={isSavingCalculations || calculationsSaved} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center min-w-[140px]">
                               {isSavingCalculations ? 'Saving...' : calculationsSaved ? 'Saved!' : 'Save Data'}
                             </button>
                           </div>
                    </div>
                  ) : extractedVectors ? (
                    <TransformWrapper 
                      initialScale={1} 
                      minScale={0.5} 
                      maxScale={20}
                      wheel={{ wheelDisabled: false }}
                      pinch={{ disabled: false }}
                      panning={{ disabled: false }}
                    >
                      <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div 
                          className="w-full h-full shadow-2xl border border-cyan-900/50 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                          dangerouslySetInnerHTML={{ __html: extractedVectors }} 
                        />
                      </TransformComponent>
                    </TransformWrapper>
                  ) : croppedImage ? (
                    <img src={croppedImage} alt="Cropped FMB" className="max-w-full max-h-full object-contain shadow-2xl border border-cyan-900/50" />
                  ) : null}
                </div>
                  </>
                )}
              </div>
            )}
            </>
          ) : activeLandSurveyView === 'dark_draw_submenu' ? (
             <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50 animate-in slide-in-from-right-8 duration-300">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
                 <h3 className="font-black text-[#0369a1] text-lg uppercase tracking-wide border-b border-slate-100 pb-2">Dark Draw Setup</h3>
                 <button onClick={() => setActiveLandSurveyView('dark_draw_manual')} className="w-full text-left bg-slate-50 hover:bg-[#0369a1] hover:text-white text-slate-800 p-4 rounded-xl border border-slate-200 transition-colors font-bold flex justify-between items-center group">
                   Manual Drawing Canvas
                   <span className="text-slate-400 group-hover:text-white">→</span>
                 </button>
                 <button disabled className="w-full text-left bg-slate-50 text-slate-800 p-4 rounded-xl border border-slate-200 font-bold opacity-50 pointer-events-none flex justify-between items-center">
                   Point 2
                   <span className="text-slate-400">→</span>
                 </button>
                 <button onClick={() => setActiveLandSurveyView('dark_draw_projects')} className="w-full text-left bg-slate-50 hover:bg-[#0369a1] hover:text-white text-slate-800 p-4 rounded-xl border border-slate-200 transition-colors font-bold flex justify-between items-center group">
                   My Projects
                   <span className="text-slate-400 group-hover:text-white">→</span>
                 </button>
               </div>
             </div>
          ) : activeLandSurveyView === 'dark_draw_projects' ? (
             <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50 animate-in slide-in-from-right-8 duration-300">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
                 <h3 className="font-black text-[#0369a1] text-lg uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-3">
                   <button onClick={() => setActiveLandSurveyView('dark_draw_submenu')} className="hover:text-slate-500 transition-colors">⬅️</button>
                   Saved Projects
                 </h3>
                 {savedProjects.length === 0 ? (
                   <p className="text-sm text-slate-500 italic">No projects saved yet.</p>
                 ) : (
                   savedProjects.map(proj => (
                     <button key={proj.id} onClick={() => {
                        setCadLines(proj.state.lines);
                        setCadCircles(proj.state.circles);
                        setCadTexts(proj.state.texts);
                        setCadMetricOffsets(proj.state.metricOffsets);
                        setCadViewport(proj.state.viewport);
                        setCadScale(proj.state.scale);
                        setCadHistory({ past: [], future: [] }); // Reset history
                        setActiveLandSurveyView('dark_draw_manual');
                     }} className="w-full text-left bg-slate-50 hover:bg-[#0369a1] hover:text-white text-slate-800 p-4 rounded-xl border border-slate-200 transition-colors font-bold flex justify-between items-center group">
                       Project - {proj.date}
                       <span className="text-slate-400 group-hover:text-white font-black text-xs uppercase tracking-widest">Load</span>
                     </button>
                   ))
                 )}
               </div>
             </div>
          ) : activeLandSurveyView === 'dark_draw_manual' ? (
             <div className="flex-1 flex flex-col bg-slate-950 animate-in slide-in-from-right-8 duration-300">
               {/* TOP NAVIGATION BAR OVERHAUL */}
               <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center shadow-md relative z-50 shrink-0 w-full justify-between">
                 <div className="flex items-center gap-4">
                    {/* Native Back Arrow */}
                    <button 
                      onClick={() => setActiveLandSurveyView('menu')}
                      className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-300 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                    
                    {/* WorkSpace Title */}
                    <h2 className="text-[14px] font-black text-slate-200 uppercase tracking-widest mt-0.5">
                      WORKSPACE
                    </h2>
                    
                    {/* Action Micro-Buttons (Undo / Redo) */}
                    <div className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-4">
                       <button onClick={handleCadUndo} disabled={cadHistory.past.length === 0} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                       </button>
                       <button onClick={handleCadRedo} disabled={cadHistory.future.length === 0} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                       </button>
                    </div>
                 </div>
                 
                 <div className="relative">
                   <button 
                     onClick={() => setShowDarkDrawSettings(!showDarkDrawSettings)}
                     className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-300 transition-colors"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                     </svg>
                   </button>
                   
                   {showDarkDrawSettings && (
                     <div className="absolute right-0 top-12 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[100] overflow-hidden py-1">
                       <button className="w-full text-left px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" onClick={() => { setCadTool('ADD_LINE'); setShowDarkDrawSettings(false); }}>Add Line</button>
                       <button className="w-full text-left px-5 py-3 text-[13px] font-bold text-fuchsia-400 hover:bg-slate-700 hover:text-fuchsia-300 transition-colors" onClick={() => { setCadTool('SKETCH_LINE'); setShowDarkDrawSettings(false); }}>Sketch / Extend Line</button>
                       <button className="w-full text-left px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" onClick={() => { setCadTool('EDIT_LINE'); setShowDarkDrawSettings(false); }}>Edit Line Attributes</button>
                       <button className="w-full text-left px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" onClick={() => { setCadTool('EDIT_RADIUS'); setShowDarkDrawSettings(false); }}>Edit Radius</button>
                       <button className="w-full text-left px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" onClick={() => { setCadTool('ADD_TEXT'); setShowDarkDrawSettings(false); }}>Add Text</button>
                       <button className="w-full text-left px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" onClick={() => { setCadTool('SELECT_METRIC'); setShowDarkDrawSettings(false); }}>Select Metric</button>
                       <button className="w-full text-left px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" onClick={() => { setCadTool('SELECT_TEXT'); setShowDarkDrawSettings(false); }}>Select Text</button>
                       <button className="w-full text-left px-5 py-3 text-[13px] font-black text-emerald-400 hover:bg-slate-700 hover:text-emerald-300 transition-colors border-t border-slate-700 uppercase tracking-widest" onClick={handleSaveProject}>Save Project</button>
                     </div>
                   )}
                 </div>
               </div>

{/* DARK CANVAS CONTAINER */}
              <div 
                className="flex-1 w-full relative overflow-hidden bg-slate-950 flex items-center justify-center touch-none" 
                onPointerDown={handleCadPointerDown}
                onPointerMove={handleCadPointerMove}
                onPointerUp={handleCadPointerUp}
                onPointerLeave={handleCadPointerUp}
                onClick={() => setShowDarkDrawSettings(false)}
              >
                 <svg 
                   ref={cadSvgRef}
                   className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                   viewBox={`${cadViewport.x} ${cadViewport.y} ${cadViewport.width} ${cadViewport.height}`}
                   preserveAspectRatio="xMidYMid slice"
                 >
                   <defs>
                     <pattern id="grid" width={cadViewport.width * 0.05} height={cadViewport.width * 0.05} patternUnits="userSpaceOnUse">
                       <path d={`M ${cadViewport.width * 0.05} 0 L 0 0 0 ${cadViewport.width * 0.05}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={cadViewport.width * 0.001}/>
                     </pattern>
                   </defs>
                   <rect x={cadViewport.x} y={cadViewport.y} width="100%" height="100%" fill="url(#grid)" />

                  {cadCircles.map(c => {
                    const isSelected = cadSelectedCircle === c.id;
                    const isGlowing = cadGlowingCircle === c.id;
                    return (
                    <g key={c.id}>
                      <circle 
                        cx={c.center.x} cy={c.center.y} r={c.radiusPixels} 
                        fill={isSelected ? "rgba(236,72,153,0.1)" : "none"}
                        stroke={isSelected || isGlowing ? "#ec4899" : (c.hexColor || "#4f46e5")} 
                        strokeWidth={cadViewport.width * (c.strokeWidth ? c.strokeWidth / 1000 : 0.003)} 
                        className={cadBlinkingRadius === c.id || isGlowing ? "animate-pulse stroke-fuchsia-500" : "transition-colors duration-200"}
                      />
                    </g>
                  )})}

                  {cadLines.map(l => {
                    const isSelected = cadSelectedLine === l.id;
                    const isMetricHovered = cadHoveredNode === null && !cadPointerGesture?.isDragging && !isSelected; // basic fallback
                    const isMetricSelected = cadSelectedMetric === l.id;
                    const offset = cadMetricOffsets[l.id] || { dx: 0, dy: -cadViewport.width * 0.01 };
                    const mx = (l.p1.x + l.p2.x) / 2 + offset.dx;
                    const my = (l.p1.y + l.p2.y) / 2 + offset.dy;
                    
                    return (
                    <g key={l.id}>
                      <line 
                        x1={l.p1.x} y1={l.p1.y} x2={l.p2.x} y2={l.p2.y} 
                        stroke={isSelected ? "#ec4899" : (l.hexColor || "#38bdf8")} 
                        strokeWidth={cadViewport.width * (l.strokeWidth ? l.strokeWidth / 1000 : 0.004)} 
                        strokeLinecap="round" 
                      />
                      {isSelected && cadEditInputs.isMovingLine && (
                        <>
                           <circle cx={l.p1.x} cy={l.p1.y} r={cadViewport.width * 0.015} fill="#0f172a" stroke="#ec4899" strokeWidth={cadViewport.width * 0.002} className="animate-pulse" />
                           <circle cx={l.p2.x} cy={l.p2.y} r={cadViewport.width * 0.015} fill="#0f172a" stroke="#ec4899" strokeWidth={cadViewport.width * 0.002} className="animate-pulse" />
                        </>
                      )}
                      {l.fixedLength && (
                        <text 
                          x={mx} y={my} 
                          fill={isSelected || isMetricSelected ? "#fbcfe8" : (l.metricHexColor || "#ffffff")} 
                          fontSize={l.metricFontSize || (cadViewport.width * (isMetricSelected ? 0.025 : 0.02))} 
                          fontWeight="bold" textAnchor="middle"
                          className="transition-all duration-200"
                        >
                          {l.fixedLength} m
                        </text>
                      )}
                      {isMetricSelected && l.fixedLength && (
                         <rect x={mx - cadViewport.width * 0.05} y={my - cadViewport.width * 0.03} width={cadViewport.width * 0.1} height={cadViewport.width * 0.04} fill="none" stroke="#fbcfe8" strokeWidth={cadViewport.width * 0.001} strokeDasharray="5,5" />
                      )}
                    </g>
                  )})}

                  {cadActiveLine && (
                    <g>
                      <line x1={cadActiveLine.p1.x} y1={cadActiveLine.p1.y} x2={cadActiveLine.p2.x} y2={cadActiveLine.p2.y} stroke="#f472b6" strokeWidth={cadViewport.width * 0.004} strokeDasharray="15, 10" strokeLinecap="round" />
                      <text x={(cadActiveLine.p1.x + cadActiveLine.p2.x) / 2} y={(cadActiveLine.p1.y + cadActiveLine.p2.y) / 2 - cadViewport.width * 0.01} fill="#fbcfe8" fontSize={cadViewport.width * 0.02} fontWeight="bold" textAnchor="middle">
                        {cadScale ? (Math.hypot(cadActiveLine.p1.x - cadActiveLine.p2.x, cadActiveLine.p1.y - cadActiveLine.p2.y) * cadScale).toFixed(2) + ' m' : 'Draft'}
                      </text>
                    </g>
                  )}
                  {/* Magnetic Snap Pulse Indicator */}
                  {cadSnapIndicator && (
                    <circle cx={cadSnapIndicator.x} cy={cadSnapIndicator.y} r={cadViewport.width * 0.01} fill="none" stroke="#d946ef" strokeWidth={cadViewport.width * 0.002} className="animate-ping" />
                  )}

                                    {cadTexts.map(txt => {
                     const isSelected = cadSelectedText === txt.id;
                     return (
                        <text
                           key={txt.id}
                           x={txt.x} y={txt.y}
                           fill={isSelected ? "#fbcfe8" : (txt.hexColor || "#e2e8f0")}
                           fontSize={txt.fontSize || (cadViewport.width * 0.02)}
                           fontWeight="bold"
                           className="transition-colors duration-200 cursor-pointer"
                        >
                           {txt.text}
                        </text>
                     );
                  })}
                  
                  {/* Dynamic Nodes */}
                  {(cadNodes || []).map(n => {
                    const isHovered = cadHoveredNode && cadHoveredNode.id === n.id;
                    const isSelected = cadSelectedNode && cadSelectedNode.id === n.id;
                    const nodeScale = isHovered || isSelected ? 2.5 : 1;
                    return (
                      <circle 
                        key={n.id} cx={n.x} cy={n.y} r={cadViewport.width * 0.004 * nodeScale} 
                        fill={isSelected ? "#ec4899" : "#38bdf8"} 
                        stroke="#0f172a" strokeWidth={cadViewport.width * 0.001}
                        className="transition-all duration-150 ease-out"
                      />
                    );
                  })}
                </svg>

                {cadSelectedNode && (
                  <div 
                    className="absolute z-[100] bg-slate-800 p-2 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-slate-600 animate-in zoom-in-95 flex flex-col gap-1 w-32" 
                    style={{ left: getSvgPtToContainer(cadSelectedNode.x, cadSelectedNode.y).left + 15, top: getSvgPtToContainer(cadSelectedNode.x, cadSelectedNode.y).top - 40 }}
                    onClick={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                  >
                    <button 
                      className="w-full text-left px-3 py-2 text-xs font-black text-white hover:bg-slate-700 rounded-lg transition-colors"
                      onClick={() => {
                        setCadSelectedNode(null);
                        setCadTool('ADD_LINE');
                        setCadActiveLine({ p1: { x: cadSelectedNode.x, y: cadSelectedNode.y }, p2: { x: cadSelectedNode.x, y: cadSelectedNode.y } });
                      }}
                    >
                      Add Line
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 text-xs font-black text-white hover:bg-slate-700 rounded-lg transition-colors"
                      onClick={() => {
                        setCadSelectedNode(null);
                        setCadPrompt({ type: 'RADIUS', center: cadSelectedNode, x: getSvgPtToContainer(cadSelectedNode.x, cadSelectedNode.y).left + 20, y: getSvgPtToContainer(cadSelectedNode.x, cadSelectedNode.y).top });
                        setCadPromptValue('');
                      }}
                    >
                      Radius
                    </button>
                  </div>
                )}

                {(cadSelectedLine || cadSelectedCircle) && (() => {
                   let target = null; let tType = ''; let midSvgX=0; let midSvgY=0;
                   if (cadSelectedLine) { target = cadLines.find(x => x.id === cadSelectedLine); tType='LINE'; if(target){ midSvgX = (target.p1.x + target.p2.x)/2; midSvgY = (target.p1.y + target.p2.y)/2; } }
                   if (cadSelectedCircle) { target = cadCircles.find(x => x.id === cadSelectedCircle); tType='CIRCLE'; if(target){ midSvgX = target.center.x; midSvgY = target.center.y - target.radiusPixels; } }
                   if (!target) return null;
                   const ctCoords = getSvgPtToContainer(midSvgX, midSvgY);
                   return (
                     <div 
                       className="absolute z-[110] bg-slate-800 p-4 rounded-xl shadow-2xl border border-slate-600 flex flex-col gap-3 w-56 animate-in slide-in-from-bottom-2" 
                       style={{ left: Math.min(ctCoords.left + cadPopupOffset.x, window.innerWidth - 250), top: Math.max(ctCoords.top - 180 + cadPopupOffset.y, 20) }}
                       onClick={e => e.stopPropagation()}
                       onPointerDown={e => e.stopPropagation()}
                     >
                       <div 
                         className="flex justify-between items-center cursor-move bg-slate-700 -mx-4 -mt-4 p-3 rounded-t-xl"
                         onPointerDown={e => { e.stopPropagation(); e.target.setPointerCapture(e.pointerId); e.target.dataset.dragStart = JSON.stringify({x: e.clientX, y: e.clientY, ox: cadPopupOffset.x, oy: cadPopupOffset.y}); }}
                         onPointerMove={e => {
                           if (e.target.hasPointerCapture(e.pointerId) && e.target.dataset.dragStart) {
                             const start = JSON.parse(e.target.dataset.dragStart);
                             setCadPopupOffset({ x: start.ox + (e.clientX - start.x), y: start.oy + (e.clientY - start.y) });
                           }
                         }}
                         onPointerUp={e => { e.target.releasePointerCapture(e.pointerId); delete e.target.dataset.dragStart; }}
                       >
                          <span className="text-xs font-bold text-slate-300 pointer-events-none">EDIT {tType}</span>
                          <button onClick={() => { setCadSelectedLine(null); setCadSelectedCircle(null); setCadPopupOffset({x:0, y:0}); }} className="text-xs font-black text-slate-400 hover:text-white">✕</button>
                       </div>
                       <input type="number" value={cadEditInputs.length} onChange={e => setCadEditInputs({...cadEditInputs, length: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder={tType === 'LINE' ? "Length (m)" : "Radius (m)"} />
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 uppercase">Weight: {cadEditInputs.weight}</span>
                          <input type="range" min="1" max="20" value={cadEditInputs.weight} onChange={e => setCadEditInputs({...cadEditInputs, weight: e.target.value})} className="accent-fuchsia-500" />
                       </div>
                       <div className="flex gap-2">
                          {['#38bdf8', '#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#e2e8f0'].map(hex => (
                             <button key={hex} onClick={() => setCadEditInputs({...cadEditInputs, hex})} className={`w-6 h-6 rounded-full border-2 ${cadEditInputs.hex === hex ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: hex }}></button>
                          ))}
                       </div>
                       {tType === 'LINE' && (
                         <button onClick={() => setCadEditInputs(p => ({ ...p, isMovingLine: !p.isMovingLine }))} className={`w-full font-bold py-2 rounded text-sm transition-colors ${cadEditInputs.isMovingLine ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                           {cadEditInputs.isMovingLine ? 'MOVE MODE ACTIVE' : 'MOVE'}
                         </button>
                       )}
                       <button onClick={handleCadEditSave} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-2 rounded text-sm transition-colors mt-2">SAVE</button>
                       <button onClick={handleCadEditDelete} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded text-sm transition-colors">{tType === 'LINE' ? 'DELETE LINE' : 'DELETE RADIUS'}</button>
                     </div>
                   );
                 })()}

                 {typeof cadSelectedText !== 'undefined' && cadSelectedText && (() => {
                   const txt = cadTexts.find(t => t.id === cadSelectedText);
                   if (!txt) return null;
                   const ctCoords = getSvgPtToContainer(txt.x, txt.y);
                   return (
                     <div 
                       className="absolute z-[110] bg-slate-800 p-4 rounded-xl shadow-2xl border border-slate-600 flex flex-col gap-3 w-56 animate-in slide-in-from-bottom-2" 
                       style={{ left: Math.min(ctCoords.left + cadPopupOffset.x, window.innerWidth - 250), top: Math.max(ctCoords.top - 180 + cadPopupOffset.y, 20) }}
                       onClick={e => e.stopPropagation()}
                       onPointerDown={e => e.stopPropagation()}
                     >
                       <div 
                         className="flex justify-between items-center cursor-move bg-slate-700 -mx-4 -mt-4 p-3 rounded-t-xl"
                         onPointerDown={e => { e.stopPropagation(); e.target.setPointerCapture(e.pointerId); e.target.dataset.dragStart = JSON.stringify({x: e.clientX, y: e.clientY, ox: cadPopupOffset.x, oy: cadPopupOffset.y}); }}
                         onPointerMove={e => {
                           if (e.target.hasPointerCapture(e.pointerId) && e.target.dataset.dragStart) {
                             const start = JSON.parse(e.target.dataset.dragStart);
                             setCadPopupOffset({ x: start.ox + (e.clientX - start.x), y: start.oy + (e.clientY - start.y) });
                           }
                         }}
                         onPointerUp={e => { e.target.releasePointerCapture(e.pointerId); delete e.target.dataset.dragStart; }}
                       >
                          <span className="text-xs font-bold text-slate-300 pointer-events-none">EDIT TEXT</span>
                          <button onClick={() => { setCadSelectedText(null); setCadPopupOffset({x:0, y:0}); }} className="text-xs font-black text-slate-400 hover:text-white">✕</button>
                       </div>
                       <input type="text" value={txt.text} onChange={e => setCadTexts(prev => prev.map(t => t.id === txt.id ? {...t, text: e.target.value} : t))} className="bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 uppercase">Font Size: {Math.round(txt.fontSize)}</span>
                          <input type="range" min="10" max={cadViewport.width * 0.2} value={txt.fontSize} onChange={e => setCadTexts(prev => prev.map(t => t.id === txt.id ? {...t, fontSize: parseInt(e.target.value)} : t))} className="accent-fuchsia-500" />
                       </div>
                       <div className="flex gap-2">
                          {['#38bdf8', '#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#e2e8f0'].map(hex => (
                             <button key={hex} onClick={() => setCadTexts(prev => prev.map(t => t.id === txt.id ? {...t, hexColor: hex} : t))} className={`w-6 h-6 rounded-full border-2 ${txt.hexColor === hex ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: hex }}></button>
                          ))}
                       </div>
                       <button onClick={() => setCadEditInputs(p => ({ ...p, isMovingText: !p.isMovingText }))} className={`w-full font-bold py-2 rounded text-sm transition-colors ${cadEditInputs.isMovingText ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                         {cadEditInputs.isMovingText ? 'MOVE MODE ACTIVE' : 'MOVE'}
                       </button>
                       <button onClick={() => { setCadTexts(prev => prev.filter(t => t.id !== txt.id)); setCadSelectedText(null); }} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded text-sm transition-colors mt-2">DELETE TEXT</button>
                     </div>
                   );
                 })()}

                 

                 {typeof cadSelectedMetric !== 'undefined' && cadSelectedMetric && (() => {
                   const line = cadLines.find(l => l.id === cadSelectedMetric);
                   if (!line || !line.fixedLength) return null;
                   const offset = cadMetricOffsets[line.id] || { dx: 0, dy: -cadViewport.width * 0.01 };
                   const mx = (line.p1.x + line.p2.x) / 2 + offset.dx;
                   const my = (line.p1.y + line.p2.y) / 2 + offset.dy;
                   const ctCoords = getSvgPtToContainer(mx, my);
                   return (
                     <div 
                       className="absolute z-[110] bg-slate-800 p-4 rounded-xl shadow-2xl border border-slate-600 flex flex-col gap-3 w-56 animate-in slide-in-from-bottom-2" 
                       style={{ left: Math.min(ctCoords.left + cadPopupOffset.x, window.innerWidth - 250), top: Math.max(ctCoords.top - 180 + cadPopupOffset.y, 20) }}
                       onClick={e => e.stopPropagation()}
                       onPointerDown={e => e.stopPropagation()}
                     >
                       <div 
                         className="flex justify-between items-center cursor-move bg-slate-700 -mx-4 -mt-4 p-3 rounded-t-xl"
                         onPointerDown={e => { e.stopPropagation(); e.target.setPointerCapture(e.pointerId); e.target.dataset.dragStart = JSON.stringify({x: e.clientX, y: e.clientY, ox: cadPopupOffset.x, oy: cadPopupOffset.y}); }}
                         onPointerMove={e => {
                           if (e.target.hasPointerCapture(e.pointerId) && e.target.dataset.dragStart) {
                             const start = JSON.parse(e.target.dataset.dragStart);
                             setCadPopupOffset({ x: start.ox + (e.clientX - start.x), y: start.oy + (e.clientY - start.y) });
                           }
                         }}
                         onPointerUp={e => { e.target.releasePointerCapture(e.pointerId); delete e.target.dataset.dragStart; }}
                       >
                          <span className="text-xs font-bold text-slate-300 pointer-events-none">METRIC</span>
                          <button onClick={() => { setCadSelectedMetric(null); setCadPopupOffset({x:0, y:0}); }} className="text-xs font-black text-slate-400 hover:text-white">✕</button>
                       </div>
                       
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 uppercase">Font Size</span>
                          <input type="range" min="10" max={cadViewport.width * 0.1} value={line.metricFontSize || cadViewport.width * 0.02} onChange={e => setCadLines(prev => prev.map(l => l.id === line.id ? {...l, metricFontSize: parseInt(e.target.value)} : l))} className="accent-fuchsia-500" />
                       </div>
                       <div className="flex gap-2">
                          {['#ffffff', '#38bdf8', '#ec4899', '#10b981', '#f59e0b', '#a855f7'].map(hex => (
                             <button key={hex} onClick={() => setCadLines(prev => prev.map(l => l.id === line.id ? {...l, metricHexColor: hex} : l))} className={`w-6 h-6 rounded-full border-2 ${line.metricHexColor === hex ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: hex }}></button>
                          ))}
                       </div>

                       <button onClick={() => setCadEditInputs(p => ({ ...p, isMovingMetric: !p.isMovingMetric }))} className={`w-full font-bold py-2 rounded text-sm transition-colors ${cadEditInputs.isMovingMetric ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                         {cadEditInputs.isMovingMetric ? 'MOVE MODE ACTIVE' : 'MOVE'}
                       </button>
                     </div>
                   );
                 })()}


            {cadComputedArea && (
                <div className="absolute bottom-8 left-8 z-[120] bg-slate-900/90 p-4 rounded-xl shadow-2xl border border-slate-700 pointer-events-none">
                  <div className="text-[10px] text-fuchsia-400 font-black mb-2 uppercase tracking-widest border-b border-slate-700 pb-1">Polygon Area</div>
                  <div className="font-mono text-xs text-white grid grid-cols-[100px_1fr] gap-x-2 gap-y-1">
                    <span className="text-slate-400 text-right">Hectare / Are :</span><span className="font-bold">{cadComputedArea.hectareAre.toFixed(4)}</span>
                    <span className="text-slate-400 text-right">Acre :</span><span className="font-bold">{cadComputedArea.acre.toFixed(4)}</span>
                    <span className="text-slate-400 text-right">Cent :</span><span className="font-bold">{cadComputedArea.cent.toFixed(2)}</span>
                    <span className="text-slate-400 text-right">Sq. Ft :</span><span className="font-bold">{cadComputedArea.sqFt.toFixed(2)}</span>
                  </div>
                </div>
             )}
             
            {/* VIRTUAL JOYSTICK D-PAD */}
            <div className="absolute bottom-8 right-8 z-[120] opacity-80 hover:opacity-100 transition-opacity bg-slate-800 rounded-full border-4 border-slate-700 shadow-2xl p-2 select-none touch-none"
                 onPointerDown={e => e.stopPropagation()}
            >
               <div className="flex flex-col items-center gap-1">
                  <button 
                     className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex justify-center items-center font-bold text-xl active:bg-fuchsia-600 transition-colors"
                     onPointerDown={() => startCadPan(0, -1)} onPointerUp={stopCadPan} onPointerLeave={stopCadPan}
                  >
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                  </button>
                  <div className="flex gap-1">
                     <button 
                        className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex justify-center items-center font-bold text-xl active:bg-fuchsia-600 transition-colors"
                        onPointerDown={() => startCadPan(-1, 0)} onPointerUp={stopCadPan} onPointerLeave={stopCadPan}
                     >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                     </button>
                     <button 
                        className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-fuchsia-400 border border-slate-600 flex justify-center items-center font-bold text-xl transition-colors"
                        onClick={() => setCadViewport({ x: 0, y: 0, width: 2000, height: 2000 })}
                        title="Reset Origin"
                     >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></svg>
                     </button>
                     <button 
                        className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex justify-center items-center font-bold text-xl active:bg-fuchsia-600 transition-colors"
                        onPointerDown={() => startCadPan(1, 0)} onPointerUp={stopCadPan} onPointerLeave={stopCadPan}
                     >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                     </button>
                  </div>
                  <button 
                     className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex justify-center items-center font-bold text-xl active:bg-fuchsia-600 transition-colors"
                     onPointerDown={() => startCadPan(0, 1)} onPointerUp={stopCadPan} onPointerLeave={stopCadPan}
                  >
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
               </div>
            </div>
{cadPrompt && (
                  <form 
                    onSubmit={submitCadPrompt}
                    className="absolute z-[120] bg-slate-800 p-3 rounded-xl shadow-2xl border border-slate-600 flex gap-2 animate-in fade-in" 
                    style={{ left: cadPrompt.x, top: cadPrompt.y }}
                    onClick={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                  >
                    <input autoFocus type={cadPrompt.type === "TEXT" ? "text" : "number"} step="0.01" value={cadPromptValue} onChange={e => setCadPromptValue(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-white w-24 text-sm font-bold text-center" placeholder={cadPrompt.type === "TEXT" ? "Enter text..." : "Metric (m)"} />
                    <button type="submit" className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-2 px-4 rounded text-sm transition-colors">OK</button>
                  </form>
                 )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
