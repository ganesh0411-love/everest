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

const pointInPolygon = (pt, vs) => {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y;
        let xj = vs[j].x, yj = vs[j].y;
        let intersect = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

const splitIntersectingLines = (lines, cadMetricOffsets) => {
  let newLines = [...lines];
  let splitsOccurred = true;
  let newOffsets = { ...cadMetricOffsets };

  while (splitsOccurred) {
    splitsOccurred = false;
    for (let i = 0; i < newLines.length; i++) {
      for (let j = i + 1; j < newLines.length; j++) {
        const l1 = newLines[i];
        const l2 = newLines[j];
        
        const denom = (l1.p1.x - l1.p2.x) * (l2.p1.y - l2.p2.y) - (l1.p1.y - l1.p2.y) * (l2.p1.x - l2.p2.x);
        if (Math.abs(denom) > 1e-6) {
           const t = ((l1.p1.x - l2.p1.x) * (l2.p1.y - l2.p2.y) - (l1.p1.y - l2.p1.y) * (l2.p1.x - l2.p2.x)) / denom;
           const u = ((l1.p1.x - l2.p1.x) * (l1.p1.y - l1.p2.y) - (l1.p1.y - l2.p1.y) * (l1.p1.x - l1.p2.x)) / denom;
           
           const intersectX = l1.p1.x + t * (l1.p2.x - l1.p1.x);
           const intersectY = l1.p1.y + t * (l1.p2.y - l1.p1.y);
           
           const onL1 = t > 1e-4 && t < 1 - 1e-4;
           const onL2 = u > 1e-4 && u < 1 - 1e-4;

           if (onL1 && u >= -1e-4 && u <= 1 + 1e-4) {
               // split L1
               const origL1 = { ...l1 };
               const origLen = parseFloat(l1.fixedLength || "0");
               const newId = origL1.id + "_" + Math.random().toString(36).substr(2,4);
               const pMid = { x: intersectX, y: intersectY };
               
               l1.p2 = pMid;
               l1.fixedLength = origLen > 0 ? (origLen * t).toFixed(2) : null;
               delete newOffsets[l1.id];
               
               const newL = { ...origL1, id: newId, p1: pMid, p2: origL1.p2, fixedLength: origLen > 0 ? (origLen * (1 - t)).toFixed(2) : null };
               newLines.push(newL);
               splitsOccurred = true;
               break;
           }
           if (onL2 && t >= -1e-4 && t <= 1 + 1e-4) {
               // split L2
               const origL2 = { ...l2 };
               const origLen = parseFloat(l2.fixedLength || "0");
               const newId = origL2.id + "_" + Math.random().toString(36).substr(2,4);
               const pMid = { x: intersectX, y: intersectY };
               
               l2.p2 = pMid;
               l2.fixedLength = origLen > 0 ? (origLen * u).toFixed(2) : null;
               delete newOffsets[l2.id];
               
               const newL = { ...origL2, id: newId, p1: pMid, p2: origL2.p2, fixedLength: origLen > 0 ? (origLen * (1 - u)).toFixed(2) : null };
               newLines.push(newL);
               splitsOccurred = true;
               break;
           }
        }
      }
      if (splitsOccurred) break;
    }
  }
  return { lines: newLines, offsets: newOffsets };
};

const AdminDashboard = ({ setCurrentView }) => {
  const cardShadowClass = "interactive-card";
  const [showLandSurveyDashboard, setShowLandSurveyDashboard] = React.useState(false);
  const [activeLandSurveyView, setActiveLandSurveyView] = React.useState('menu'); // 'menu', 'simple', 'fmb', 'recreate_fmb', 'dark_draw_manual'

  // --- MANUAL CAD ENGINE STATE ---
  const [cadSurveys, setCadSurveys] = React.useState([]); // [{ id, surveyNo, subDivisionNo, hexColor, isVisible }]
  const [cadPromptSurveyNo, setCadPromptSurveyNo] = React.useState('');
  const [cadPromptSubDiv, setCadPromptSubDiv] = React.useState('');
  const [cadPromptColor, setCadPromptColor] = React.useState('#3b82f6'); // Default to blue-500
  const [cadActiveSurveyId, setCadActiveSurveyId] = React.useState(null);
  const [isSurveyDropdownOpen, setIsSurveyDropdownOpen] = React.useState(false);
    const [isSubDivisionDropdownOpen, setIsSubDivisionDropdownOpen] = React.useState(false);
    const [checkedSurveyNos, setCheckedSurveyNos] = React.useState([]);
  const [cadLines, setCadLines] = React.useState([]);
  const [cadCircles, setCadCircles] = React.useState([]);
  const [cadScale, setCadScale] = React.useState(null);
  const [cadTool, setCadTool] = React.useState('IDLE');
  const [cadViewport, setCadViewport] = React.useState({ x: 0, y: 0, width: 2000, height: 2000 });
  const cadViewportRef = React.useRef({ x: 0, y: 0, width: 2000, height: 2000 });
  React.useEffect(() => { cadViewportRef.current = cadViewport; }, [cadViewport]);
  const [cadAnchorNode, setCadAnchorNode] = React.useState(null);
  const [cadPrompt, setCadPrompt] = React.useState(null);
  const [cadPromptValue, setCadPromptValue] = React.useState('');
  const [cadPromptUnit, setCadPromptUnit] = React.useState('meters');
  const cadSvgRef = React.useRef(null);
  
  const [isFloatingStackExpanded, setIsFloatingStackExpanded] = React.useState(false);
  const [isPolygonAreaCardVisible, setIsPolygonAreaCardVisible] = React.useState(true);

  const [selectedAreaUnit, setSelectedAreaUnit] = React.useState('Ares');
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = React.useState(false);

  const [selectedPerimeterUnit, setSelectedPerimeterUnit] = React.useState('Ft');

  const [cadBackgroundImage, setCadBackgroundImage] = React.useState(null);
  const [isBackgroundImageVisible, setIsBackgroundImageVisible] = React.useState(true);
  const [isGalleryPopupOpen, setIsGalleryPopupOpen] = React.useState(false);
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsGalleryPopupOpen(false);
    
    if (file.type === 'application/pdf') {
      try {
        const pdfjsLib = await loadPdfJsScript();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        setCadBackgroundImage(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error("Error loading PDF", err);
        alert("Failed to load PDF.");
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCadBackgroundImage(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  React.useEffect(() => {
    if (cadLines.length === 0) {
      if (cadScale !== null) setCadScale(null);
      setIsPolygonAreaCardVisible(true);
    }
  }, [cadLines.length, cadScale]);
  
  // Multi-Touch & Gesture State
  const cadPointersRef = React.useRef(new Map());
  const cadMultiTouchActiveRef = React.useRef(false);
  const [isGlobalMetricFeet, setIsGlobalMetricFeet] = React.useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = React.useState(false);
  const [scaleDisplayUnit, setScaleDisplayUnit] = React.useState('mm');
  const [cadPinchInitial, setCadPinchInitial] = React.useState(null);
  
  // Nodes & Selection
  const [cadHoveredNode, setCadHoveredNode] = React.useState(null);
  const [cadSelectedNode, setCadSelectedNode] = React.useState(null);
  const [isAddRadiusEnabled, setIsAddRadiusEnabled] = React.useState(false);
  const [isSketchExtendEnabled, setIsSketchExtendEnabled] = React.useState(false);
  const [isMetricsVisible, setIsMetricsVisible] = React.useState(true);
  const [isSurveyNoVisible, setIsSurveyNoVisible] = React.useState(true);
  const [isSubDivVisible, setIsSubDivVisible] = React.useState(true);
  const [cadPointerGesture, setCadPointerGesture] = React.useState(null);
  const [cadGlowingCircles, setCadGlowingCircles] = React.useState([]);
  const [cadBlinkingRadius, setCadBlinkingRadius] = React.useState(null);
  const [cadSnapIndicator, setCadSnapIndicator] = React.useState(null);
  const [cadSelectedPolygon, setCadSelectedPolygon] = React.useState(null);
  const [cadMultiSelectMode, setCadMultiSelectMode] = React.useState(false);
  const [cadMultiSelectedPolygons, setCadMultiSelectedPolygons] = React.useState([]);
  const [cadContextMenu, setCadContextMenu] = React.useState(null);
  const cadLongPressTimerRef = React.useRef(null);
  const cadMultiSelectModeRef = React.useRef(false);
  const [cadRotation, setCadRotation] = React.useState(0);
  // Extended Editing
  const [isEditingLineMode, setIsEditingLineMode] = React.useState(false);
  const [isLineMoving, setIsLineMoving] = React.useState(false);
  const [cadSelectedLine, setCadSelectedLine] = React.useState(null);
  const [cadSelectedCircle, setCadSelectedCircle] = React.useState(null);
  const [cadTexts, setCadTexts] = React.useState([]);
  const [cadSelectedText, setCadSelectedText] = React.useState(null);
  const [cadSelectedMetric, setCadSelectedMetric] = React.useState(null);
  const [cadDraggingNode, setCadDraggingNode] = React.useState(null); // { lineId, end: 'p1'|'p2' }
  const [cadEditInputs, setCadEditInputs] = React.useState({ length: '', weight: 4, hex: '#38bdf8', isMovingMetric: false });
  const [cadPopupOffset, setCadPopupOffset] = React.useState({ x: 0, y: 0 });
  const [cadPopupScale, setCadPopupScale] = React.useState(1);
  const [savedProjects, setSavedProjects] = React.useState(() => {
    try {
      const item = localStorage.getItem('cad_saved_projects');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.warn("localStorage read failed", error);
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem('cad_saved_projects', JSON.stringify(savedProjects));
  }, [savedProjects]);

  const [cadMetricOffsets, setCadMetricOffsets] = React.useState({});

  const [cadHistory, setCadHistory] = React.useState({ past: [], future: [] });
  const [cadLoadedProjectId, setCadLoadedProjectId] = React.useState(null);
  const [cadMagnifierPos, setCadMagnifierPos] = React.useState(null);
  const cadStateBeforeActionRef = React.useRef(null);
  const [cadWindowSize, setCadWindowSize] = React.useState({ width: '100vw', height: '100vh' });

  React.useEffect(() => {
    const handleResize = () => {
      setCadWindowSize({ width: `${window.innerWidth}px`, height: `${window.innerHeight}px` });
    };
    handleResize(); // Initialize on mount
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const resetCadState = () => {
     setCadLines([]);
     setCadCircles([]);
     setCadTexts([]);
     setCadMetricOffsets({});
     setCadSurveys([]);
     setCadActiveSurveyId(null);
     setCheckedSurveyNos([]);
     setCadScale(null);
     setCadTool('IDLE');
     setCadViewport({ x: 0, y: 0, width: 2000, height: 2000 });
     setCadAnchorNode(null);
     setCadPrompt(null);
     setCadPromptValue('');
     setCadPromptUnit('meters');
     setCadBackgroundImage(null);
     setCadHoveredNode(null);
     setCadSelectedNode(null);
     setCadPointerGesture(null);
     setIsMetricsVisible(true);
     setIsSurveyNoVisible(true);
     setIsSubDivVisible(true);
     setIsAddRadiusEnabled(false);
     setIsSketchExtendEnabled(false);
     setCadGlowingCircles([]);
     setCadBlinkingRadius(null);
     setCadSnapIndicator(null);
     setCadSelectedPolygon(null);
     setCadSelectedLine(null);
     setCadSelectedCircle(null);
     setCadSelectedText(null);
     setCadSelectedMetric(null);
     setCadDraggingNode(null);
     setCadHistory({ past: [], future: [] });
     setCadLoadedProjectId(null);
     setCadMagnifierPos(null);
     setIsFloatingStackExpanded(false);
     setIsPolygonAreaCardVisible(true);
     setIsAreaDropdownOpen(false);
     setIsSurveyDropdownOpen(false);
     setIsSubDivisionDropdownOpen(false);
     setIsScaleModalOpen(false);
     setCadContextMenu(null);
     setIsGalleryPopupOpen(false);
     setShowDarkDrawSettings(false);
  };

  // Auto-Split Intersection Engine
  React.useEffect(() => {
     if (cadLines.length === 0) return;
     const { lines: newLines, offsets: newOffsets } = splitIntersectingLines(cadLines, cadMetricOffsets);
     if (newLines.length !== cadLines.length) {
         setCadLines(newLines);
         setCadMetricOffsets(newOffsets);
         
         // Overwrite the most recent history state with the post-split sanitized graph
         setCadHistory(h => {
            if (h.past.length === 0) return h;
            const newPast = [...h.past];
            const lastState = newPast[newPast.length - 1];
            newPast[newPast.length - 1] = {
               ...lastState,
               lines: JSON.parse(JSON.stringify(newLines)),
               metricOffsets: JSON.parse(JSON.stringify(newOffsets))
            };
            return { ...h, past: newPast };
         });
     }
  }, [cadLines]); // cadMetricOffsets intentionally omitted to prevent loop

  // Dynamic Closed Sub-Polygon Generation (Planar Graph Face Extraction)
  const cadPolygons = React.useMemo(() => {
    if (cadLines.length < 3) return [];

    const nodesMap = new Map();
    const getOrAddNode = (x, y) => {
       const key = `${x.toFixed(3)},${y.toFixed(3)}`;
       if (!nodesMap.has(key)) nodesMap.set(key, { x, y, edges: [] });
       return nodesMap.get(key);
    };

    cadLines.forEach(l => {
       const n1 = getOrAddNode(l.p1.x, l.p1.y);
       const n2 = getOrAddNode(l.p2.x, l.p2.y);
       n1.edges.push({ to: n2, line: l });
       n2.edges.push({ to: n1, line: l });
    });

    const halfEdges = [];
    nodesMap.forEach(node => {
       node.edges.forEach(edge => {
          halfEdges.push({
             from: node,
             to: edge.to,
             angle: Math.atan2(edge.to.y - node.y, edge.to.x - node.x),
             line: edge.line
          });
       });
    });

    const edgesByFrom = new Map();
    halfEdges.forEach(he => {
       if (!edgesByFrom.has(he.from)) edgesByFrom.set(he.from, []);
       edgesByFrom.get(he.from).push(he);
    });
    
    edgesByFrom.forEach(edges => {
       edges.sort((a, b) => a.angle - b.angle);
    });

    halfEdges.forEach(he => {
       const toEdges = edgesByFrom.get(he.to) || [];
       let revIdx = toEdges.findIndex(e => e.to === he.from);
       he.next = toEdges[(revIdx + 1) % toEdges.length];
    });

    const faces = [];
    let faceId = 0;
    halfEdges.forEach(he => {
        if (!he.visited) {
            const pts = [];
            let curr = he;
            let area = 0;
            const faceEdges = [];
            while (!curr.visited) {
                curr.visited = true;
                pts.push({ x: curr.from.x, y: curr.from.y });
                faceEdges.push(curr);
                area += (curr.from.x * curr.to.y - curr.to.x * curr.from.y);
                curr = curr.next;
            }
            area /= 2;
              if (area < -1e-4) {
                  const surveyCounts = {};
                  const surveyLengths = {};
                  let maxCount = 0;
                  let fallbackSurveyId = null;
                  faceEdges.forEach(edge => {
                      const lnIdx = cadLines.findIndex(l => 
                          (Math.hypot(l.p1.x - edge.from.x, l.p1.y - edge.from.y) < 1e-3 && Math.hypot(l.p2.x - edge.to.x, l.p2.y - edge.to.y) < 1e-3) ||
                          (Math.hypot(l.p2.x - edge.from.x, l.p2.y - edge.from.y) < 1e-3 && Math.hypot(l.p1.x - edge.to.x, l.p1.y - edge.to.y) < 1e-3)
                      );
                      if (lnIdx !== -1) {
                          const sId = cadLines[lnIdx].surveyId;
                          const len = Math.hypot(edge.to.x - edge.from.x, edge.to.y - edge.from.y);
                          if (sId) {
                             surveyCounts[sId] = (surveyCounts[sId] || 0) + 1;
                             surveyLengths[sId] = (surveyLengths[sId] || 0) + len;
                             if (surveyCounts[sId] > maxCount) {
                                 maxCount = surveyCounts[sId];
                                 fallbackSurveyId = sId;
                             }
                          }
                      }
                  });
                  faces.push({ id: `poly_${faceId++}`, pts, area: Math.abs(area), faceEdges, surveyCounts, surveyLengths, fallbackSurveyId, polySurveyId: null });
              }
          }
      });

      // Bipartite Resolution Algorithm for Topological FMB Sync
      // 1. Sort surveys by created_at descending (newest first)
      const sortedSurveys = [...cadSurveys].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      
      sortedSurveys.forEach(survey => {
          const sId = survey.id;
          let bestFace = null;
          let highestPercentage = -1;
          
          faces.forEach(face => {
              if (face.polySurveyId === null && face.surveyLengths[sId]) {
                  const totalLen = Object.values(face.surveyLengths).reduce((acc, val) => acc + val, 0);
                  const perc = face.surveyLengths[sId] / totalLen;
                  if (perc > highestPercentage) {
                      highestPercentage = perc;
                      bestFace = face;
                  }
              }
          });
          
          if (bestFace) {
              bestFace.polySurveyId = sId;
          }
      });
      
      // Fallback for any unassigned faces
      faces.forEach(face => {
          if (face.polySurveyId === null) {
              face.polySurveyId = face.fallbackSurveyId;
              face._isSurplus = true;
          }
          // Normalize the output format expected by the rest of the app
          face.surveyId = face.polySurveyId;
      });

      return faces;
  }, [cadLines, cadSurveys]);

  // Auto-Isolation Engine for Surplus Polygons
  React.useEffect(() => {
      const surplusFaces = cadPolygons.filter(f => f._isSurplus);
      if (surplusFaces.length === 0) return;

      const newSurveys = [];
      const linesToUpdate = new Map();

      surplusFaces.forEach(face => {
          const fallbackSurvey = cadSurveys.find(s => s.id === face.fallbackSurveyId);
          const newSurveyId = 's_' + Math.random().toString(36).substr(2, 9);
          
          let sNo = fallbackSurvey ? fallbackSurvey.surveyNo : 'New';
          let sdNo = fallbackSurvey ? fallbackSurvey.subDivisionNo : '';
          
          newSurveys.push({
              id: newSurveyId,
              surveyNo: sNo,
              subDivisionNo: sdNo,
              hexColor: fallbackSurvey ? fallbackSurvey.hexColor : '#38bdf8',
              isVisible: fallbackSurvey ? fallbackSurvey.isVisible : true,
              created_at: Date.now()
          });

          face.faceEdges.forEach(edge => {
              linesToUpdate.set(edge.line.id, newSurveyId);
          });
      });

      if (newSurveys.length > 0) {
          setCadSurveys(prev => [...prev, ...newSurveys]);
          const newSurveyNos = [...new Set(newSurveys.map(s => s.surveyNo))];
          setCheckedSurveyNos(prev => {
              const toAdd = newSurveyNos.filter(no => !prev.includes(no));
              return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
          });
          setCadLines(prev => prev.map(l => linesToUpdate.has(l.id) ? { ...l, surveyId: linesToUpdate.get(l.id) } : l));
      }
  }, [cadPolygons, cadSurveys]);

  const visibleCadLines = React.useMemo(() => {
    const visibleSurveyIds = new Set(cadSurveys.filter(s => {
          if (!checkedSurveyNos.includes(s.surveyNo)) return false;
          
          const isMasterDash = !cadSurveys.some(sub => sub.surveyNo === s.surveyNo && sub.isVisible);
          if (isMasterDash) return true;
          
          return s.isVisible;
      }).map(s => s.id));
      return cadLines.filter(l => {
          const parentSurveys = new Set();
          if (l.surveyId) parentSurveys.add(l.surveyId);
          
          cadPolygons.forEach(p => {
               const hasEdge = p.faceEdges.some(edge => 
                   (Math.hypot(l.p1.x - edge.from.x, l.p1.y - edge.from.y) < 1e-3 && Math.hypot(l.p2.x - edge.to.x, l.p2.y - edge.to.y) < 1e-3) ||
                   (Math.hypot(l.p2.x - edge.from.x, l.p2.y - edge.from.y) < 1e-3 && Math.hypot(l.p1.x - edge.to.x, l.p1.y - edge.to.y) < 1e-3)
               );
               if (hasEdge && p.surveyId) {
                   parentSurveys.add(p.surveyId);
               }
          });
          
          const surveyIds = Array.from(parentSurveys);
          l.surveyIds = surveyIds; // Dynamic state array mapping
          
          if (cadSurveys.length === 0) return true;
          if (cadPrompt && cadPrompt.targetId === l.id) return true;
          if (!l.surveyId && cadSurveys.length > 0) return false;
          return surveyIds.some(id => visibleSurveyIds.has(id));
      });
  }, [cadLines, cadSurveys, cadPolygons, checkedSurveyNos]);

  const getMetricDefaultOffset = (l) => {
      let rot = Math.atan2(l.p2.y - l.p1.y, l.p2.x - l.p1.x) * (180 / Math.PI);
      if (rot > 90) rot -= 180;
      else if (rot < -90) rot += 180;
      const finalRot = l.metricRotation !== undefined ? l.metricRotation : rot;
      const theta = finalRot * (Math.PI / 180);
      return { dx: 25 * Math.sin(theta), dy: -25 * Math.cos(theta) };
  };

  const handleSaveProject = () => {
     if (cadLoadedProjectId) {
         setSavedProjects(prev => prev.map(p => {
             if (p.id === cadLoadedProjectId) {
                 return {
                     ...p,
                     state: {
                        lines: cadLines,
                        circles: cadCircles,
                        texts: cadTexts,
                        metricOffsets: cadMetricOffsets,
                        viewport: cadViewport,
                        scale: cadScale,
                        surveys: cadSurveys,
                        checkedSurveys: checkedSurveyNos
                     },
                     uiSettings: {
                        isMetricsVisible,
                        isSurveyNoVisible,
                        isSubDivVisible,
                        isAddRadiusEnabled,
                        isSketchExtendEnabled,
                        showDarkDrawSettings,
                        isFloatingStackExpanded,
                        isGalleryPopupOpen,
                        isScaleModalOpen,
                        isAreaDropdownOpen,
                        isSurveyDropdownOpen,
                        isSubDivisionDropdownOpen
                     }
                 };
             }
             return p;
         }));
         setShowDarkDrawSettings(false);
         alert("Project Updated Successfully!");
     } else {
         const now = new Date();
         const d = String(now.getDate()).padStart(2, '0');
         const mo = String(now.getMonth() + 1).padStart(2, '0');
         const y = now.getFullYear();
         const h = String(now.getHours()).padStart(2, '0');
         const mi = String(now.getMinutes()).padStart(2, '0');
         const defaultName = `${d}/${mo}/${y} - ${h}:${mi}`;
         const customName = window.prompt("Enter Project/Survey Name", defaultName);
         if (customName === null) return;

         const project = {
            id: Date.now().toString(),
            date: customName.trim() || defaultName,
            state: {
               lines: cadLines,
               circles: cadCircles,
               texts: cadTexts,
               metricOffsets: cadMetricOffsets,
               viewport: cadViewport,
               scale: cadScale,
               surveys: cadSurveys,
               checkedSurveys: checkedSurveyNos
            },
            uiSettings: {
               isMetricsVisible,
               isSurveyNoVisible,
               isSubDivVisible,
               isAddRadiusEnabled,
               isSketchExtendEnabled,
               showDarkDrawSettings,
               isFloatingStackExpanded,
               isGalleryPopupOpen,
               isScaleModalOpen,
               isAreaDropdownOpen,
               isSurveyDropdownOpen,
               isSubDivisionDropdownOpen
            }
         };
         setCadLoadedProjectId(project.id);
         setSavedProjects(prev => [project, ...prev]);
         setShowDarkDrawSettings(false);
         alert("Project Saved Successfully to My Projects!");
     }
  };


  const handleDeleteSavedProject = (id) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    setSavedProjects(prev => {
       const filtered = prev.filter(p => p.id !== id);
       localStorage.setItem('cad_saved_projects', JSON.stringify(filtered));
       return filtered;
    });
  };

  const handleRenameSavedProject = (id) => {
    const newName = prompt("Enter new project name:");
    if (!newName) return;
    setSavedProjects(prev => {
       const updated = prev.map(p => p.id === id ? { ...p, date: newName } : p);
       localStorage.setItem('cad_saved_projects', JSON.stringify(updated));
       return updated;
    });
  };

  const cadNodes = React.useMemo(() => {
    const nodes = [];
    visibleCadLines.forEach(l => {
      if (!nodes.some(n => Math.hypot(n.x - l.p1.x, n.y - l.p1.y) < 1e-4)) nodes.push({ ...l.p1, id: 'n_' + Math.random().toString(36).substr(2, 9) });
      if (!nodes.some(n => Math.hypot(n.x - l.p2.x, n.y - l.p2.y) < 1e-4)) nodes.push({ ...l.p2, id: 'n_' + Math.random().toString(36).substr(2, 9) });
    });
    
    // Circle tangency points (Type A)
    cadCircles.forEach(circle => {
      const cx = circle.center.x; const cy = circle.center.y; const r = circle.radiusPixels;
      nodes.push({ x: cx + r, y: cy, id: 'nc_' + Math.random().toString(36).substr(2, 9), targetCircleId: circle.id, type: 'CARDINAL' });
      nodes.push({ x: cx - r, y: cy, id: 'nc_' + Math.random().toString(36).substr(2, 9), targetCircleId: circle.id, type: 'CARDINAL' });
      nodes.push({ x: cx, y: cy + r, id: 'nc_' + Math.random().toString(36).substr(2, 9), targetCircleId: circle.id, type: 'CARDINAL' });
      nodes.push({ x: cx, y: cy - r, id: 'nc_' + Math.random().toString(36).substr(2, 9), targetCircleId: circle.id, type: 'CARDINAL' });
    });

    // Circle Intersections (Type C)
    for (let i = 0; i < cadCircles.length; i++) {
      for (let j = i + 1; j < cadCircles.length; j++) {
         const c1 = cadCircles[i];
         const c2 = cadCircles[j];
         const d = Math.hypot(c1.center.x - c2.center.x, c1.center.y - c2.center.y);
         if (d > c1.radiusPixels + c2.radiusPixels || d < Math.abs(c1.radiusPixels - c2.radiusPixels) || d === 0) continue;
         
         const a = (c1.radiusPixels * c1.radiusPixels - c2.radiusPixels * c2.radiusPixels + d * d) / (2 * d);
         const h = Math.sqrt(Math.max(0, c1.radiusPixels * c1.radiusPixels - a * a));
         const x2 = c1.center.x + a * (c2.center.x - c1.center.x) / d;
         const y2 = c1.center.y + a * (c2.center.y - c1.center.y) / d;
         
         nodes.push({ 
           x: x2 + h * (c2.center.y - c1.center.y) / d, 
           y: y2 - h * (c2.center.x - c1.center.x) / d, 
           id: 'ncci_' + Math.random().toString(36).substr(2, 9),
           targetCircleId1: c1.id, targetCircleId2: c2.id,
           type: 'CIRCLE_INT'
         });
         nodes.push({ 
           x: x2 - h * (c2.center.y - c1.center.y) / d, 
           y: y2 + h * (c2.center.x - c1.center.x) / d, 
           id: 'ncci_' + Math.random().toString(36).substr(2, 9),
           targetCircleId1: c1.id, targetCircleId2: c2.id,
           type: 'CIRCLE_INT'
         });
      }
    }

    // Intersections between lines and circles (Type B)
      for (let i = 0; i < visibleCadLines.length; i++) {
          for (let j = 0; j < cadCircles.length; j++) {
              const l = visibleCadLines[i];
            const c = cadCircles[j];
            const dx = l.p2.x - l.p1.x;
            const dy = l.p2.y - l.p1.y;
            const fx = l.p1.x - c.center.x;
            const fy = l.p1.y - c.center.y;
            
            const a = dx * dx + dy * dy;
            const b = 2 * (fx * dx + fy * dy);
            const c_val = fx * fx + fy * fy - c.radiusPixels * c.radiusPixels;
            
            let disc = b * b - 4 * a * c_val;
            if (disc >= 0) {
                disc = Math.sqrt(disc);
                const t1 = (-b - disc) / (2 * a);
                const t2 = (-b + disc) / (2 * a);
                
                if (t1 >= 0 && t1 <= 1) {
                    nodes.push({ x: l.p1.x + t1 * dx, y: l.p1.y + t1 * dy, id: 'ncli_' + Math.random().toString(36).substr(2, 9), type: 'LINE_CIRCLE_INT' });
                }
                if (t2 >= 0 && t2 <= 1) {
                    nodes.push({ x: l.p1.x + t2 * dx, y: l.p1.y + t2 * dy, id: 'ncli_' + Math.random().toString(36).substr(2, 9), type: 'LINE_CIRCLE_INT' });
                }
            }
        }
    }

    // Intersections between lines
      for (let i = 0; i < visibleCadLines.length; i++) {
        for (let j = i + 1; j < visibleCadLines.length; j++) {
          const l1 = visibleCadLines[i]; const l2 = visibleCadLines[j];
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
  }, [visibleCadLines, cadCircles]);

  const visibleCadPolygons = React.useMemo(() => {
      return cadPolygons.filter(p => {
         if (!p.surveyId) return true;
         const s = cadSurveys.find(s => s.id === p.surveyId);
         if (!s) return true;
         if (!checkedSurveyNos.includes(s.surveyNo)) return false;
         
         const isMasterDash = !cadSurveys.some(sub => sub.surveyNo === s.surveyNo && sub.isVisible);
         if (isMasterDash) return true;
         
         return s.isVisible;
      });
    }, [cadPolygons, cadSurveys, checkedSurveyNos]);

  const cadComputedArea = React.useMemo(() => {
    if (!cadScale || cadLines.length < 3 || visibleCadPolygons.length === 0) return null;
    
    let areaPixels = 0;
    if (cadMultiSelectMode && cadMultiSelectedPolygons.length > 0) {
        cadMultiSelectedPolygons.forEach(id => {
            const poly = visibleCadPolygons.find(p => p.id === id);
            if (poly) areaPixels += poly.area;
        });
    } else if (!cadMultiSelectMode && cadSelectedPolygon) {
        const poly = visibleCadPolygons.find(p => p.id === cadSelectedPolygon);
        if (poly) areaPixels = poly.area;
    } else {
        areaPixels = visibleCadPolygons.reduce((sum, p) => sum + p.area, 0);
    }
    
    if (areaPixels <= 0) return null;
    
    const sqMeters = areaPixels * cadScale * cadScale;
    return {
       sqMeters,
       hectare: sqMeters / 10000,
       are: sqMeters / 100,
       acre: sqMeters / 4046.86,
       cent: sqMeters / 40.4686,
       sqFt: sqMeters * 10.7639
    };
  }, [cadLines, cadScale, visibleCadPolygons, cadSelectedPolygon, cadMultiSelectMode, cadMultiSelectedPolygons, cadNodes]);

  const cadOpenNodes = React.useMemo(() => {
      if (visibleCadLines.length < 3) return [];
      const adj = new Map();
      visibleCadLines.forEach(l => {
       const p1 = `${l.p1.x.toFixed(2)},${l.p1.y.toFixed(2)}`;
       const p2 = `${l.p2.x.toFixed(2)},${l.p2.y.toFixed(2)}`;
       if (!adj.has(p1)) adj.set(p1, { x: l.p1.x, y: l.p1.y, count: 0 });
       if (!adj.has(p2)) adj.set(p2, { x: l.p2.x, y: l.p2.y, count: 0 });
       adj.get(p1).count++;
       adj.get(p2).count++;
    });
    const open = [];
    for (let val of adj.values()) {
       if (val.count === 1) open.push({ x: val.x, y: val.y });
    }
    return open;
    }, [visibleCadLines]);

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

    if (cadAnchorNode) {
        const anchorStillValid = previous.lines.some(l => 
            (Math.hypot(l.p1.x - cadAnchorNode.x, l.p1.y - cadAnchorNode.y) < 1e-4) || 
            (Math.hypot(l.p2.x - cadAnchorNode.x, l.p2.y - cadAnchorNode.y) < 1e-4)
        );

        if (!anchorStillValid) {
            const deletedLine = currentSnapshot.lines.find(l => !previous.lines.some(pl => pl.id === l.id));
            if (deletedLine) {
                const p1Survives = previous.lines.some(l => Math.hypot(l.p1.x - deletedLine.p1.x, l.p1.y - deletedLine.p1.y) < 1e-4 || Math.hypot(l.p2.x - deletedLine.p1.x, l.p2.y - deletedLine.p1.y) < 1e-4);
                if (p1Survives) {
                    setCadAnchorNode({ ...deletedLine.p1 });
                } else {
                    setCadAnchorNode({ ...deletedLine.p2 });
                }
            } else if (previous.lines.length > 0) {
                setCadAnchorNode({ ...previous.lines[previous.lines.length - 1].p2 });
            } else {
                setCadAnchorNode(null);
            }
        }
    }
  };

  const handleCadRedo = () => {
    if (cadHistory.future.length === 0) return;
    const currentSnapshot = captureCadState();
    const nextState = cadHistory.future[0];
    const newFuture = cadHistory.future.slice(1);
    
    setCadHistory({ past: [...cadHistory.past, currentSnapshot], future: newFuture });
    setCadLines(nextState.lines);
    setCadCircles(nextState.circles);
    setCadTexts(nextState.texts);
    setCadMetricOffsets(nextState.metricOffsets);

    if (cadAnchorNode) {
        const addedLine = nextState.lines.find(l => !currentSnapshot.lines.some(cl => cl.id === l.id));
        if (addedLine) {
            setCadAnchorNode({ ...addedLine.p2 });
        }
    }
  };


  const interactiveNodes = React.useMemo(() => {
    if (cadSelectedLine && cadEditInputs.isMovingLine) {
      const sl = cadLines.find(l => l.id === cadSelectedLine);
      if (sl) return cadNodes.filter(n => Math.hypot(n.x - sl.p1.x, n.y - sl.p1.y) < 1e-4 || Math.hypot(n.x - sl.p2.x, n.y - sl.p2.y) < 1e-4);
    }
    return cadNodes;
  }, [cadNodes, cadSelectedLine, cadEditInputs.isMovingLine, cadLines]);

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
    let forceSnap = null;
    let nodeThreshold = 8 * (cadViewport.width / (window.innerWidth || 1000));

    cadNodes.forEach(n => {
      const d = Math.hypot(n.x - pt.x, n.y - pt.y);
      if (d < nodeThreshold && (n.targetCircleId || n.targetCircleId1)) {
         nodeThreshold = d;
         forceSnap = { ...n, snapType: n.targetCircleId1 ? 'CIRCLE_INTERSECT' : 'CIRCLE_NODE', targetId: n.id };
      } else if (!forceSnap && d < minSnapDist) { 
         minSnapDist = d; 
         snapped = { ...n, snapType: 'NODE', targetId: n.id }; 
         if (n.targetCircleId) snapped.snapType = 'CIRCLE_NODE';
         if (n.targetCircleId1) snapped.snapType = 'CIRCLE_INTERSECT';
         didSnap = true; 
      }
    });

    if (forceSnap) {
       snapped = forceSnap;
       didSnap = true;
    } else if (!excludeCircles) {
      cadCircles.forEach(circle => {
        const dCenter = Math.hypot(circle.center.x - pt.x, circle.center.y - pt.y);
        const dPerimeter = Math.abs(dCenter - circle.radiusPixels);
        if (dPerimeter < minSnapDist) {
          minSnapDist = dPerimeter;
          snapped = {
            x: circle.center.x + (pt.x - circle.center.x) / dCenter * circle.radiusPixels,
            y: circle.center.y + (pt.y - circle.center.y) / dCenter * circle.radiusPixels,
            snapType: 'CIRCLE_PERIMETER',
            targetId: circle.id
          };
          didSnap = true;
        }
      });
    }
    
    setCadSnapIndicator(didSnap ? snapped : null);
    
    if (snapped.snapType === 'CIRCLE_NODE' || snapped.snapType === 'CIRCLE_PERIMETER') {
       setCadGlowingCircles([snapped.targetCircleId || snapped.targetId]);
    } else if (snapped.snapType === 'CIRCLE_INTERSECT') {
       setCadGlowingCircles([snapped.targetCircleId1, snapped.targetCircleId2]);
    } else {
       setCadGlowingCircles([]);
    }
    return snapped;
  };

  const getSvgPtToContainer = (svgX, svgY) => {
    if (!cadSvgRef.current) return { left: 0, top: 0 };
    const rect = cadSvgRef.current.getBoundingClientRect();
    const scaleX = rect.width / cadViewport.width;
    const scaleY = rect.height / cadViewport.height;
    return { left: (svgX - cadViewport.x) * scaleX, top: (svgY - cadViewport.y) * scaleY };
  };

  const handlePopupResizeDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startScale = cadPopupScale;
    const handleMove = (e2) => {
      const deltaX = e2.clientX - startX;
      setCadPopupScale(Math.max(0.5, Math.min(2.5, startScale + deltaX / 200)));
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handleCadPointerDown = (e) => {
    cadStateBeforeActionRef.current = captureCadState();
    e.target.setPointerCapture(e.pointerId);
    cadPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    if (cadPointersRef.current.size > 1) {
      cadMultiTouchActiveRef.current = true;
    }

    if (cadPointersRef.current.size === 2) {
      const pts = Array.from(cadPointersRef.current.values());
      const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      const cx = (pts[0].clientX + pts[1].clientX) / 2;
      const cy = (pts[0].clientY + pts[1].clientY) / 2;
      const angle = Math.atan2(pts[1].clientY - pts[0].clientY, pts[1].clientX - pts[0].clientX) * (180 / Math.PI);
      setCadPinchInitial({ dist, cx, cy, angle, rotation: cadRotation, view: { ...cadViewport } });
      return;
    }

    if (cadPointersRef.current.size === 1 && !cadMultiTouchActiveRef.current) {
      const rawPt = getCadSvgCoords(e.clientX, e.clientY);

      const targetDataType = e.target.getAttribute?.('data-type') || e.target.parentElement?.getAttribute?.('data-type');
      // Anchor-handle drag only fires when actively placing a line (ADD_LINE tool)
      if (targetDataType === 'anchor-handle' && cadTool === 'ADD_LINE') {
         if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
         const connectedLineRefs = cadLines.filter(l => Math.hypot(l.p1.x - cadAnchorNode.x, l.p1.y - cadAnchorNode.y) < 1e-4 || Math.hypot(l.p2.x - cadAnchorNode.x, l.p2.y - cadAnchorNode.y) < 1e-4).map(l => ({ id: l.id, isP1: Math.hypot(l.p1.x - cadAnchorNode.x, l.p1.y - cadAnchorNode.y) < 1e-4 }));
         setCadPointerGesture({ isDraggingAnchor: true, startX: e.clientX, startY: e.clientY, offsetX: cadAnchorNode.x - rawPt.x, offsetY: cadAnchorNode.y - rawPt.y, connectedLineRefs });
         return;
      }

      if (!isEditingLineMode && cadTool !== 'EDIT_RADIUS' && (cadSelectedNode || cadSelectedLine || cadSelectedCircle || cadSelectedText || cadSelectedMetric)) {
        if (!cadDraggingNode && !cadPointerGesture?.isDraggingMetric && !cadPointerGesture?.isDraggingText && !cadPointerGesture?.isDraggingLineBody) {
           setCadPrompt(null); setCadSelectedNode(null); setCadSelectedLine(null); setCadSelectedCircle(null); setCadSelectedText(null); setCadSelectedMetric(null);
           setIsLineMoving(false);
           setIsEditingLineMode(false);
           setCadPopupOffset({ x: 0, y: 0 }); 
           if (cadTool !== 'SELECT_METRIC' && cadTool !== 'SELECT_TEXT') {
               setCadTool('IDLE');
           }
        }
        return; 
      }
      
      let targetNode = null; let targetLine = null; let targetCircle = null; let targetText = null; let targetMetric = null;
      let minSnapDist = 50 * (cadViewport.width / 1000);

      if (cadTool === 'IDLE' || isEditingLineMode || cadTool === 'SKETCH_LINE' || cadTool === 'ADD_LINE' || cadTool === 'ADD_RADIUS') {
         // TWO-WAY VERTEX HIT-TEST: check both p1 (start) and p2 (end) for all lines
         if (cadTool === 'ADD_LINE' && cadPrompt) {
            for (const line of cadLines) {
               if (Math.hypot(line.p1.x - rawPt.x, line.p1.y - rawPt.y) < minSnapDist) {
                  setCadMagnifierPos({ screenX: e.clientX, screenY: e.clientY, svgX: line.p1.x, svgY: line.p1.y });
                  setCadAnchorNode(line.p1);
                  if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
                  const connectedLineRefs = cadLines.filter(l => Math.hypot(l.p1.x - line.p1.x, l.p1.y - line.p1.y) < 1e-4 || Math.hypot(l.p2.x - line.p1.x, l.p2.y - line.p1.y) < 1e-4).map(l => ({ id: l.id, isP1: Math.hypot(l.p1.x - line.p1.x, l.p1.y - line.p1.y) < 1e-4 }));
                  setCadPointerGesture({ isDraggingAnchor: true, startX: e.clientX, startY: e.clientY, offsetX: line.p1.x - rawPt.x, offsetY: line.p1.y - rawPt.y, connectedLineRefs });
                  return;
               }
               if (Math.hypot(line.p2.x - rawPt.x, line.p2.y - rawPt.y) < minSnapDist) {
                  setCadMagnifierPos({ screenX: e.clientX, screenY: e.clientY, svgX: line.p2.x, svgY: line.p2.y });
                  setCadAnchorNode(line.p2);
                  if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
                  const connectedLineRefs = cadLines.filter(l => Math.hypot(l.p1.x - line.p2.x, l.p1.y - line.p2.y) < 1e-4 || Math.hypot(l.p2.x - line.p2.x, l.p2.y - line.p2.y) < 1e-4).map(l => ({ id: l.id, isP1: Math.hypot(l.p1.x - line.p2.x, l.p1.y - line.p2.y) < 1e-4 }));
                  setCadPointerGesture({ isDraggingAnchor: true, startX: e.clientX, startY: e.clientY, offsetX: line.p2.x - rawPt.x, offsetY: line.p2.y - rawPt.y, connectedLineRefs });
                  return;
               }
            }
         }
         if (cadTool === 'SKETCH_LINE') {
            if (isSketchExtendEnabled) {
               const activeL = cadLines.find(x => Math.hypot(x.p1.x - rawPt.x, x.p1.y - rawPt.y) < minSnapDist || Math.hypot(x.p2.x - rawPt.x, x.p2.y - rawPt.y) < minSnapDist);
               if (activeL) {
                  if (Math.hypot(activeL.p1.x - rawPt.x, activeL.p1.y - rawPt.y) < minSnapDist) { setCadDraggingNode({ lineId: activeL.id, end: 'p1' }); setCadSelectedLine(activeL.id); return; }
                  if (Math.hypot(activeL.p2.x - rawPt.x, activeL.p2.y - rawPt.y) < minSnapDist) { setCadDraggingNode({ lineId: activeL.id, end: 'p2' }); setCadSelectedLine(activeL.id); return; }
               }
            }
         }
         
         // Legacy Move Mode removed for Sketch integration

         if ((cadTool !== 'IDLE' || isAddRadiusEnabled) && cadTool !== 'SELECT_TEXT' && cadTool !== 'SELECT_METRIC') {
             interactiveNodes.forEach(n => {
                if (Math.hypot(n.x - rawPt.x, n.y - rawPt.y) < minSnapDist) targetNode = n;
             });
             
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

         if (isEditingLineMode) {
            targetNode = null; // Prevent nodes from swallowing the line tap event
            if (isLineMoving) {
               if (!(targetLine && targetLine.id === cadSelectedLine)) {
                  setIsLineMoving(false);
                  setCadSelectedLine(null);
                  setIsEditingLineMode(false);
                  setCadTool('IDLE');
                  setCadPopupOffset({ x: 0, y: 0 });
                  return;
               }
            } else {
               if (!targetLine) {
                  setIsLineMoving(false);
                  setCadSelectedLine(null);
                  setIsEditingLineMode(false);
                  setCadTool('IDLE');
                  setCadPopupOffset({ x: 0, y: 0 });
                  return;
               }
            }
         } else if (cadTool === 'SKETCH_LINE') {
            if (targetNode) targetLine = null;
         }
      } else if (cadTool === 'EDIT_RADIUS') {
         cadCircles.forEach(circle => {
            if (Math.abs(Math.hypot(circle.center.x - rawPt.x, circle.center.y - rawPt.y) - circle.radiusPixels) < minSnapDist) targetCircle = circle;
         });
         if (!targetCircle) {
            setCadTool('IDLE');
            setCadSelectedCircle(null);
            setCadPopupOffset({ x: 0, y: 0 });
            return;
         }
      } else if (cadTool === 'SELECT_TEXT') {
         // Target text hit detection is now handled natively by SVG invisible padded bounding boxes.
      } else if (cadTool === 'SELECT_METRIC') {
         // Target metric hit detection is now handled natively by SVG invisible padded bounding boxes.
      }

      if (!isAddRadiusEnabled && cadTool === 'IDLE') {
          if (e.target && e.target.tagName === 'polygon' && e.target.id && e.target.id.startsWith('poly-svg-')) {
              const polyId = e.target.id.replace('poly-svg-', '');
              if (e.pointerType === 'touch') {
                  cadLongPressTimerRef.current = setTimeout(() => {
                      setCadContextMenu({ x: e.clientX, y: e.clientY, type: 'POLYGON', targetId: polyId });
                  }, 600);
              }
          }
      }

      setCadPointerGesture({ 
         startX: e.clientX, startY: e.clientY, 
         isDragging: false, isDraggingMetric: false, isDraggingText: false, isDraggingLineBody: !!(isSketchExtendEnabled && targetLine && isEditingLineMode && isLineMoving),
         targetNode, targetLine, targetCircle, targetText, targetMetric 
      });
    }
  };

  const handleCadPointerMove = (e) => {
    if (cadLongPressTimerRef.current) {
        clearTimeout(cadLongPressTimerRef.current);
        cadLongPressTimerRef.current = null;
    }
    if (!cadPointersRef.current.has(e.pointerId)) return;
    cadPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    if (cadPointersRef.current.size === 2 && cadPinchInitial) {
      const pts = Array.from(cadPointersRef.current.values());
      const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      const cx = (pts[0].clientX + pts[1].clientX) / 2;
      const cy = (pts[0].clientY + pts[1].clientY) / 2;

      const currentAngle = Math.atan2(pts[1].clientY - pts[0].clientY, pts[1].clientX - pts[0].clientX) * (180 / Math.PI);
      const angleDelta = currentAngle - cadPinchInitial.angle;
      setCadRotation(cadPinchInitial.rotation + angleDelta);

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

    if (cadPointersRef.current.size === 1 && !cadMultiTouchActiveRef.current) {
      const rawPt = getCadSvgCoords(e.clientX, e.clientY);
      const svgRect = cadSvgRef.current?.getBoundingClientRect();
      const uniformScale = svgRect ? Math.max(cadViewport.width / svgRect.width, cadViewport.height / svgRect.height) : 1;
      
      let hoveredNode = null;
      if (cadTool === 'ADD_LINE' || cadTool === 'EDIT_LINE') {
        let minSnapDist = 50 * (cadViewport.width / 1000);
        interactiveNodes.forEach(n => { if (Math.hypot(n.x - rawPt.x, n.y - rawPt.y) < minSnapDist) hoveredNode = n; });
      }
      setCadHoveredNode(hoveredNode);

      if (cadDraggingNode || cadPointerGesture?.isDragging || cadPointerGesture?.isDraggingAnchor || cadPointerGesture?.isDraggingMetric || cadPointerGesture?.isDraggingText) {
         let magSvgX = rawPt.x;
         let magSvgY = rawPt.y;
         if (cadPointerGesture?.isDraggingAnchor) {
             magSvgX = rawPt.x + cadPointerGesture.offsetX;
             magSvgY = rawPt.y + cadPointerGesture.offsetY;
         } else if (cadDraggingNode) {
             if (isSketchExtendEnabled) {
                 const snapPt = getCadSnapPoint(rawPt, false);
                 magSvgX = snapPt.x;
                 magSvgY = snapPt.y;
             } else {
                 const dragLine = cadLines.find(l => l.id === cadDraggingNode.lineId);
                 if (dragLine) {
                     magSvgX = dragLine[cadDraggingNode.end].x;
                     magSvgY = dragLine[cadDraggingNode.end].y;
                 }
             }
         } else if (cadPointerGesture?.isDraggingText) {
             const dxSvg = (e.clientX - cadPointerGesture.startX) * uniformScale;
             const dySvg = (e.clientY - cadPointerGesture.startY) * uniformScale;
             const basePos = cadPointerGesture.basePos || { x: cadPointerGesture.targetText.x, y: cadPointerGesture.targetText.y };
             magSvgX = basePos.x + dxSvg;
             magSvgY = basePos.y + dySvg;
         } else if (cadPointerGesture?.isDraggingMetric) {
             const lineId = cadPointerGesture.targetMetric.id;
             const baseOffset = cadPointerGesture.baseOffset || cadMetricOffsets[lineId] || getMetricDefaultOffset(cadPointerGesture.targetMetric);
             const dxSvg = (e.clientX - cadPointerGesture.startX) * uniformScale;
             const dySvg = (e.clientY - cadPointerGesture.startY) * uniformScale;
             const targetLine = cadLines.find(l => l.id === lineId) || cadPointerGesture.targetMetric;
             magSvgX = (targetLine.p1.x + targetLine.p2.x) / 2 + baseOffset.dx + dxSvg;
             magSvgY = (targetLine.p1.y + targetLine.p2.y) / 2 + baseOffset.dy + dySvg;
         }
         setCadMagnifierPos({ screenX: e.clientX, screenY: e.clientY, svgX: magSvgX, svgY: magSvgY });
      } else {
         setCadMagnifierPos(null);
      }

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
            } else if (!cadPointerGesture.targetNode && !cadPointerGesture.targetLine && !cadPointerGesture.targetCircle && !cadPointerGesture.targetText && !cadPointerGesture.targetMetric) {
               setCadPointerGesture(p => ({ ...p, isDraggingPan: true, lastClientX: e.clientX, lastClientY: e.clientY }));
               setShowDarkDrawSettings(false);
            }
         }
      }

      if (cadPointerGesture?.isDraggingAnchor) {
         const rawPt = getCadSvgCoords(e.clientX, e.clientY);
         const newAnchor = { x: rawPt.x + cadPointerGesture.offsetX, y: rawPt.y + cadPointerGesture.offsetY };
         
         if (cadPointerGesture.connectedLineRefs && cadPointerGesture.connectedLineRefs.length > 0) {
             setCadLines(prev => prev.map(l => {
                 const ref = cadPointerGesture.connectedLineRefs.find(r => r.id === l.id);
                 if (ref) {
                     return { ...l, [ref.isP1 ? 'p1' : 'p2']: newAnchor };
                 }
                 return l;
             }));
             if (cadPrompt?.type === 'LINE' && cadScale) {
                 const activeL = cadLines.find(x => x.id === cadPrompt.targetId);
                 if (activeL) {
                     const ref = cadPointerGesture.connectedLineRefs.find(r => r.id === activeL.id);
                     if (ref) {
                         const otherX = ref.isP1 ? activeL.p2.x : activeL.p1.x;
                         const otherY = ref.isP1 ? activeL.p2.y : activeL.p1.y;
                         setCadPromptValue((Math.hypot(otherX - newAnchor.x, otherY - newAnchor.y) * cadScale).toFixed(2));
                     }
                 }
             }
         } else if (cadPrompt?.type === 'LINE' && cadPrompt.targetId) {
             setCadLines(prev => prev.map(l => l.id === cadPrompt.targetId ? { ...l, p2: newAnchor } : l));
             if (cadScale) {
                 const activeL = cadLines.find(x => x.id === cadPrompt.targetId);
                 if (activeL) {
                     setCadPromptValue((Math.hypot(activeL.p1.x - newAnchor.x, activeL.p1.y - newAnchor.y) * cadScale).toFixed(2));
                 }
             }
         }

         setCadAnchorNode(newAnchor);
         return;
      }

      if (cadPointerGesture?.isDraggingPan) {
         const dx = (cadPointerGesture.lastClientX - e.clientX) * uniformScale;
         const dy = (cadPointerGesture.lastClientY - e.clientY) * uniformScale;
         
         const newX = cadViewportRef.current.x + dx;
         const newY = cadViewportRef.current.y + dy;
         cadViewportRef.current = { ...cadViewportRef.current, x: newX, y: newY };
         
         if (cadSvgRef.current) {
            cadSvgRef.current.setAttribute('viewBox', `${newX} ${newY} ${cadViewportRef.current.width} ${cadViewportRef.current.height}`);
         }
         
         // Direct mutation of drag state avoids continuous React re-renders during 60FPS dragging
         cadPointerGesture.lastClientX = e.clientX;
         cadPointerGesture.lastClientY = e.clientY;
         return;
      }

      if (cadPointerGesture?.isDraggingLineBody && cadSelectedLine) {
         if (isSketchExtendEnabled) {
            const dx = rawPt.x - (cadPointerGesture.lastSvgX || (cadPointerGesture.startX / uniformScale));
            const dy = rawPt.y - (cadPointerGesture.lastSvgY || (cadPointerGesture.startY / uniformScale));
            
            setCadLines(prev => prev.map(l => l.id === cadSelectedLine ? { ...l, p1: { x: l.p1.x + dx, y: l.p1.y + dy }, p2: { x: l.p2.x + dx, y: l.p2.y + dy } } : l));
            setCadPointerGesture(p => ({ ...p, lastSvgX: rawPt.x, lastSvgY: rawPt.y }));
         }
         return;
      }

      if (cadPointerGesture?.isDraggingMetric) {
         const dxSvg = (e.clientX - cadPointerGesture.startX) * uniformScale;
         const dySvg = (e.clientY - cadPointerGesture.startY) * uniformScale;
         const lineId = cadPointerGesture.targetMetric.id;
         const baseOffset = cadPointerGesture.baseOffset || cadMetricOffsets[lineId] || getMetricDefaultOffset(cadPointerGesture.targetMetric);
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
         if (isSketchExtendEnabled) {
            const snapPt = getCadSnapPoint(rawPt, false); 
            
            if (cadTool === 'ADD_LINE' && cadAnchorNode) {
               const dragLine = cadLines.find(l => l.id === cadDraggingNode.lineId);
               if (dragLine && Math.hypot(cadAnchorNode.x - dragLine[cadDraggingNode.end].x, cadAnchorNode.y - dragLine[cadDraggingNode.end].y) < 1e-4) {
                   setCadAnchorNode(snapPt);
               }
            }

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
         }
         return;
      }

      if (cadTool === 'ADD_LINE' && cadAnchorNode && !cadPrompt) {
        const snapPt = getCadSnapPoint(rawPt, false); 
        
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
    if (cadLongPressTimerRef.current) {
        clearTimeout(cadLongPressTimerRef.current);
        cadLongPressTimerRef.current = null;
    }
    cadPointersRef.current.delete(e.pointerId);
    setCadMagnifierPos(null);
    if (cadPointersRef.current.size < 2) setCadPinchInitial(null);

    if (cadPointersRef.current.size === 0) {
      const wasMultiTouch = cadMultiTouchActiveRef.current;
      cadMultiTouchActiveRef.current = false;

      setCadSnapIndicator(null);
      setCadGlowingCircles([]);

      if (wasMultiTouch) {
         setCadPointerGesture(null);
         return; // Abort single-finger click logic!
      }
      
      if (cadDraggingNode) { 
         if (cadStateBeforeActionRef.current && JSON.stringify(cadStateBeforeActionRef.current) !== JSON.stringify(captureCadState())) saveCadStateToHistory(cadStateBeforeActionRef.current);
         cadStateBeforeActionRef.current = null;
         setCadDraggingNode(null); 
         if (cadPointerGesture?.isDraggingPan) {
         setCadViewport(cadViewportRef.current);
      }
      setCadPointerGesture(null); 
         return; 
      }

      if (cadPointerGesture?.isDraggingAnchor) {
          const dist = Math.hypot(e.clientX - cadPointerGesture.startX, e.clientY - cadPointerGesture.startY);
          if (dist > 5 && cadScale) {
              setCadLines(prev => prev.map(l => {
                  if (cadPointerGesture.connectedLineRefs?.some(r => r.id === l.id) || (cadPrompt?.type === 'LINE' && cadPrompt.targetId === l.id)) {
                      return { ...l, fixedLength: (Math.hypot(l.p1.x - l.p2.x, l.p1.y - l.p2.y) * cadScale).toFixed(2) };
                  }
                  return l;
              }));
          }
          if (cadStateBeforeActionRef.current && JSON.stringify(cadStateBeforeActionRef.current) !== JSON.stringify(captureCadState())) saveCadStateToHistory(cadStateBeforeActionRef.current);
          cadStateBeforeActionRef.current = null;
          setCadPointerGesture(null);
          return;
      }
      
      
      if (cadPointerGesture && (cadPointerGesture.isDragging || cadPointerGesture.isDraggingMetric || cadPointerGesture.isDraggingText || cadPointerGesture.isDraggingLineBody || cadPointerGesture.isDraggingPan)) {
         if (cadStateBeforeActionRef.current && JSON.stringify(cadStateBeforeActionRef.current) !== JSON.stringify(captureCadState())) saveCadStateToHistory(cadStateBeforeActionRef.current);
         if (cadPointerGesture.isDraggingLineBody) {
             setCadSelectedLine(null);
             setIsLineMoving(false);
             setIsEditingLineMode(false);
             setCadTool('IDLE');
         }
         if (cadPointerGesture.isDraggingMetric || cadPointerGesture.isDraggingText) {
             setCadEditInputs(p => ({ ...p, isMovingMetric: false, isMovingText: false }));
         }
      }
      
      if (cadPointerGesture && !cadPointerGesture.isDragging && !cadPointerGesture.isDraggingMetric && !cadPointerGesture.isDraggingText && !cadPointerGesture.isDraggingLineBody && !cadPointerGesture.isDraggingPan && !cadPointerGesture.isDraggingAnchor) {
         const rawPt = getCadSvgCoords(e.clientX, e.clientY);
         
         // 1. Strict Event Guard with requested variable names
         const addRadiusActive = isAddRadiusEnabled;
         const isDrawingMode = ['ADD_LINE', 'SKETCH_LINE', 'EDIT_LINE'].includes(cadTool) || isSketchExtendEnabled;
         
         // If we are strictly in read-only pan/inspection mode and somehow a drafting tool is triggered
         if (!addRadiusActive && !isDrawingMode && cadTool !== 'IDLE' && cadTool !== 'SELECT_TEXT' && cadTool !== 'SELECT_METRIC' && cadTool !== 'ADD_TEXT') {
             return; // Stop execution immediately, do NOT drop dots or lines!
         }

         let effTargetNode = cadPointerGesture.targetNode;
         if (cadTool === 'ADD_LINE' && !effTargetNode) {
             let minSnapDist = 50 * (cadViewport.width / 1000);
             interactiveNodes.forEach(n => {
                 if (Math.hypot(n.x - rawPt.x, n.y - rawPt.y) < minSnapDist) effTargetNode = n;
             });
         }

         if (cadTool === 'ADD_LINE' && cadAnchorNode?.isInitialCenter && !cadPrompt) {
             const tPt = effTargetNode ? { x: effTargetNode.x, y: effTargetNode.y } : getCadSnapPoint(rawPt, false);
             setCadAnchorNode({ x: tPt.x, y: tPt.y });
             setCadSelectedNode(null);
             setShowDarkDrawSettings(false);
             return;
         }

         if (cadTool === 'ADD_LINE' && effTargetNode && !cadPrompt) {
             const tNode = effTargetNode;
             const isSameNode = cadAnchorNode && Math.hypot(cadAnchorNode.x - tNode.x, cadAnchorNode.y - tNode.y) < 1e-4;
             
             if (isSameNode) {
                 setShowDarkDrawSettings(false);
             } else if (cadAnchorNode) {
                 const lineExists = cadLines.some(l => 
                     (Math.hypot(l.p1.x - cadAnchorNode.x, l.p1.y - cadAnchorNode.y) < 1e-4 && Math.hypot(l.p2.x - tNode.x, l.p2.y - tNode.y) < 1e-4) ||
                     (Math.hypot(l.p2.x - cadAnchorNode.x, l.p2.y - cadAnchorNode.y) < 1e-4 && Math.hypot(l.p1.x - tNode.x, l.p1.y - tNode.y) < 1e-4)
                 );
                 
                 if (lineExists) {
                     setCadAnchorNode(tNode);
                     setCadSelectedNode(null);
                     setShowDarkDrawSettings(false);
                 } else {
                     if (cadStateBeforeActionRef.current) saveCadStateToHistory(cadStateBeforeActionRef.current);
                     const newId = Date.now().toString();
                     let finalLen = cadScale ? (Math.hypot(cadAnchorNode.x - tNode.x, cadAnchorNode.y - tNode.y) * cadScale).toFixed(2) : null;
                     
                     const activeSurvey = cadSurveys.find(s => s.id === cadActiveSurveyId);
                     const assignedHexColor = activeSurvey ? activeSurvey.hexColor : '#38bdf8';
                     setCadLines(prev => [...prev, { id: newId, p1: { x: cadAnchorNode.x, y: cadAnchorNode.y }, p2: { x: tNode.x, y: tNode.y }, fixedLength: finalLen, strokeWidth: 4, hexColor: assignedHexColor, surveyId: cadActiveSurveyId }]);
                     
                     if (!finalLen) {
                         if (cadSurveys.length === 0) {
                             setCadPrompt({ type: 'FIRST_SURVEY', targetId: newId, x: 32, y: window.innerHeight - 200 });
                         } else {
                             setCadPrompt({ type: 'LINE', targetId: newId, x: window.innerWidth / 2 - 140, y: window.innerHeight - 200 });
                         }
                         setCadPromptValue('');
                     }
                     
                     setCadAnchorNode({ x: tNode.x, y: tNode.y });
                     setCadSelectedNode(null);
                     setShowDarkDrawSettings(false);
                 }
             } else {
                 setCadAnchorNode(tNode);
                 setCadSelectedNode(null);
                 setShowDarkDrawSettings(false);
             }
         } else if (cadTool === 'ADD_LINE' && cadAnchorNode && !cadPrompt && !cadPointerGesture.targetLine && !cadPointerGesture.targetCircle && !cadPointerGesture.targetText && !cadPointerGesture.targetMetric) {
            const snapPt = getCadSnapPoint(rawPt, false);
            
            if (cadStateBeforeActionRef.current) saveCadStateToHistory(cadStateBeforeActionRef.current);
            const newId = Date.now().toString();
            let finalLen = cadScale ? (Math.hypot(cadAnchorNode.x - snapPt.x, cadAnchorNode.y - snapPt.y) * cadScale).toFixed(2) : null;
              
              const activeSurvey = cadSurveys.find(s => s.id === cadActiveSurveyId);
              const assignedHexColor = activeSurvey ? activeSurvey.hexColor : '#38bdf8';
              
              setCadLines(prev => [...prev, { id: newId, p1: { x: cadAnchorNode.x, y: cadAnchorNode.y }, p2: snapPt, fixedLength: finalLen, strokeWidth: 4, hexColor: assignedHexColor, surveyId: cadActiveSurveyId }]);
            
            if (!finalLen) {
                 if (cadSurveys.length === 0) {
                     setCadPrompt({ type: 'FIRST_SURVEY', targetId: newId, x: 32, y: window.innerHeight - 200 });
                 } else {
                     setCadPrompt({ type: 'LINE', targetId: newId, x: window.innerWidth / 2 - 140, y: window.innerHeight - 200 });
                 }
                 setCadPromptValue('');
            }
            
            setCadAnchorNode(snapPt);
            setShowDarkDrawSettings(false);
         } else if (cadTool === 'ADD_TEXT' && !cadPointerGesture.targetNode && !cadPointerGesture.targetLine && !cadPointerGesture.targetCircle && !cadPointerGesture.targetMetric && !cadPointerGesture.targetText) {
            const ctCoords = getSvgPtToContainer(rawPt.x, rawPt.y);
            setCadPrompt({ type: 'TEXT', x: ctCoords.left, y: ctCoords.top, svgPt: rawPt });
            setCadPromptValue('');
            setCadTool('IDLE');
         } else {
            if (cadPointerGesture.targetNode) {
               setShowDarkDrawSettings(false); 
               
               const addRadiusActive = isAddRadiusEnabled;
               if (!addRadiusActive) {
                   setCadSelectedNode(null); // Force dismiss/hide the menu box
                   return; // Break out immediately to prevent rendering
               }
               
               setCadSelectedNode(cadPointerGesture.targetNode);
               setCadSelectedPolygon(null);
            } else if (cadPointerGesture.targetLine && isEditingLineMode) {
               setShowDarkDrawSettings(false); 
               setCadSelectedLine(cadPointerGesture.targetLine.id); setCadSelectedNode(null); setCadSelectedCircle(null);
               setCadSelectedPolygon(null);
               setCadEditInputs(p => ({ ...p, length: cadPointerGesture.targetLine.fixedLength || '', weight: cadPointerGesture.targetLine.strokeWidth || 4, hex: cadPointerGesture.targetLine.hexColor || '#38bdf8' }));
            } else if (cadPointerGesture.targetCircle) {
               setShowDarkDrawSettings(false); setCadSelectedCircle(cadPointerGesture.targetCircle.id); setCadSelectedNode(null); setCadSelectedLine(null);
               setCadSelectedPolygon(null);
               setCadEditInputs(p => ({ ...p, length: cadPointerGesture.targetCircle.radiusMeters, weight: cadPointerGesture.targetCircle.strokeWidth || 3, hex: cadPointerGesture.targetCircle.hexColor || '#4f46e5' }));
            } else if (cadPointerGesture.targetText) {
               setShowDarkDrawSettings(false); setCadSelectedText(cadPointerGesture.targetText.id);
               setCadSelectedPolygon(null);
               setCadPopupOffset({x:0, y:0});
            } else if (cadPointerGesture.targetMetric) {
               setShowDarkDrawSettings(false); setCadSelectedMetric(cadPointerGesture.targetMetric.id);
               setCadSelectedPolygon(null);
               setCadPopupOffset({x:0, y:0});
            } else {
               if (cadTool === 'IDLE' && !isAddRadiusEnabled && cadPolygons.length > 0) {
                     const rawPt = getCadSvgCoords(e.clientX, e.clientY);
                       let hitPoly = null;
                       let hitSurveyId = null;

                       if (e.target && e.target.tagName === 'polygon' && e.target.id && e.target.id.startsWith('poly-svg-')) {
                           const targetId = e.target.id.replace('poly-svg-', '');
                           const matchingPoly = visibleCadPolygons.find(vp => String(vp.id) === String(targetId));
                           if (matchingPoly) {
                               hitPoly = matchingPoly.id;
                               hitSurveyId = matchingPoly.surveyId;
                           }
                       }

                       if (!hitPoly) {
                           for (let p of visibleCadPolygons) {
                             if (pointInPolygon(rawPt, p.pts)) {
                                 hitPoly = p.id;
                                 hitSurveyId = p.surveyId;
                                 break;
                             }
                         }
                       }
                     if (hitPoly) {
                         if (cadMultiSelectModeRef.current) {
                             setCadMultiSelectedPolygons(prev => {
                                 if (prev.includes(hitPoly)) {
                                     return prev.filter(id => id !== hitPoly);
                                 } else {
                                     return [...prev, hitPoly];
                                 }
                             });
                         } else {
                             setCadSelectedPolygon(prev => {
                                 if (prev === hitPoly) return null;
                                 if (hitSurveyId) setCadActiveSurveyId(hitSurveyId);
                                 return hitPoly;
                             });
                         }
                         setCadSelectedNode(null);
                         setCadSelectedLine(null);
                         setCadSelectedCircle(null);
                     } else {
                         if (!cadMultiSelectModeRef.current) {
                             setCadSelectedPolygon(null);
                         }
                     }
               }
            }
         }
      }
      setCadPointerGesture(null);

      cadStateBeforeActionRef.current = null;
    }
  };

  const cadWheelTimeoutRef = React.useRef(null);
  const handleCadWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const rawPt = getCadSvgCoords(e.clientX, e.clientY);
    
    const prev = cadViewportRef.current;
    const next = {
      x: prev.x + (rawPt.x - prev.x) * (1 - zoomFactor),
      y: prev.y + (rawPt.y - prev.y) * (1 - zoomFactor),
      width: prev.width * zoomFactor,
      height: prev.height * zoomFactor
    };
    
    cadViewportRef.current = next;
    
    if (cadSvgRef.current) {
        cadSvgRef.current.setAttribute('viewBox', `${next.x} ${next.y} ${next.width} ${next.height}`);
    }
    
    if (cadWheelTimeoutRef.current) clearTimeout(cadWheelTimeoutRef.current);
    cadWheelTimeoutRef.current = setTimeout(() => {
        setCadViewport(cadViewportRef.current);
    }, 150);
  };

  React.useEffect(() => {
    const el = cadSvgRef.current;
    if (el) {
      el.addEventListener('wheel', handleCadWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleCadWheel);
    }
  }, [cadViewport, cadPrompt, cadSelectedNode, cadSelectedLine, cadSelectedCircle, activeLandSurveyView, cadBackgroundImage]);


  
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

      if (cadPrompt.type === 'FIRST_SURVEY' || cadPrompt.type === 'NEW_SURVEY') {
          if (!cadPromptSurveyNo.trim()) { alert("Survey No is required"); return; }
          const newSurveyId = Date.now().toString();
          const surveyColor = cadPrompt.type === 'NEW_SURVEY' ? cadPromptColor : '#3b82f6';
          setCadSurveys(prev => [...prev, { id: newSurveyId, surveyNo: cadPromptSurveyNo, subDivisionNo: cadPromptSubDiv, hexColor: surveyColor, isVisible: false, created_at: Date.now() }]);
          setCheckedSurveyNos(prev => prev.includes(cadPromptSurveyNo) ? prev : [...prev, cadPromptSurveyNo]);
          setCadActiveSurveyId(newSurveyId);
          
          if (cadPrompt.targetId) {
                let valStr = cadPromptValue.trim();
                let num = parseFloat(valStr);
                if (isNaN(num) || num <= 0) { setCadPrompt(null); return; }
                
                if (cadPromptUnit === 'feet') {
                    num = num * 0.3048;
                    valStr = num.toFixed(2);
                }
                
                const line = cadLines.find(l => l.id === cadPrompt.targetId);
                if (line) {
                   const pxLength = Math.hypot(line.p1.x - line.p2.x, line.p1.y - line.p2.y);
                   if (!cadScale) {
                     setCadScale(num / pxLength);
                     setCadLines(prev => prev.map(l => l.id === line.id ? { ...l, fixedLength: valStr, surveyId: newSurveyId, hexColor: surveyColor } : l));
                   } else {
                     const targetPx = num / cadScale;
                     const ratio = targetPx / pxLength;
                     const newP2 = {
                       x: line.p1.x + (line.p2.x - line.p1.x) * ratio,
                       y: line.p1.y + (line.p2.y - line.p1.y) * ratio
                     };
                     setCadLines(prev => prev.map(l => l.id === line.id ? { ...l, p2: newP2, fixedLength: valStr, surveyId: newSurveyId, hexColor: surveyColor } : l));
                     if (cadTool === 'ADD_LINE' && cadAnchorNode) {
                        if (Math.hypot(cadAnchorNode.x - line.p2.x, cadAnchorNode.y - line.p2.y) < 1e-4) {
                           setCadAnchorNode(newP2);
                        }
                     }
                   }
                }
            } else if (cadPrompt.node) {
              setCadAnchorNode(cadPrompt.node);
              setIsAddRadiusEnabled(true);
              setCadTool('ADD_LINE');
          }
          
          setCadPrompt(null);
          setCadPromptSurveyNo('');
          setCadPromptSubDiv('');
          setCadPromptValue('');
          return;
      }

      const valStr = cadPromptValue.trim();
      const num = parseFloat(valStr);
      if (isNaN(num) || num <= 0) { setCadPrompt(null); return; }

      if (cadPrompt.type === 'LINE') {
        const line = cadLines.find(l => l.id === cadPrompt.targetId);
        if (!line) { setCadPrompt(null); return; }
        const pxLength = Math.hypot(line.p1.x - line.p2.x, line.p1.y - line.p2.y);
        if (!cadScale) {
          setCadScale(num / pxLength);
          setCadLines(prev => prev.map(l => l.id === line.id ? { ...l, fixedLength: valStr } : l));
        } else {
          const targetPx = num / cadScale;
          const ratio = targetPx / pxLength;
          const newP2 = {
            x: line.p1.x + (line.p2.x - line.p1.x) * ratio,
            y: line.p1.y + (line.p2.y - line.p1.y) * ratio
          };
          setCadLines(prev => prev.map(l => l.id === line.id ? { ...l, p2: newP2, fixedLength: valStr } : l));
          if (cadTool === 'ADD_LINE' && cadAnchorNode) {
             if (Math.hypot(cadAnchorNode.x - line.p2.x, cadAnchorNode.y - line.p2.y) < 1e-4) {
                setCadAnchorNode(newP2);
             }
          }
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
     if (cadSelectedLine) {
        const l = cadLines.find(x => x.id === cadSelectedLine);
        if (l && cadScale) {
          const num = parseFloat(cadEditInputs.length);
          if (num && num !== parseFloat(l.fixedLength)) {
             const pxLength = Math.hypot(l.p1.x - l.p2.x, l.p1.y - l.p2.y);
             const targetPx = num / cadScale;
             const ratio = targetPx / pxLength;
             const newP2 = { x: l.p1.x + (l.p2.x - l.p1.x) * ratio, y: l.p1.y + (l.p2.y - l.p1.y) * ratio };
             setCadLines(prev => prev.map(x => x.id === cadSelectedLine ? { ...x, p2: newP2, fixedLength: cadEditInputs.length.trim(), strokeWidth: parseInt(cadEditInputs.weight) || 4, hexColor: cadEditInputs.hex || '#38bdf8' } : x));
          } else if (cadEditInputs.length.trim() !== '') {
             setCadLines(prev => prev.map(x => x.id === cadSelectedLine ? { ...x, fixedLength: cadEditInputs.length.trim(), strokeWidth: parseInt(cadEditInputs.weight) || 4, hexColor: cadEditInputs.hex || '#38bdf8' } : x));
          } else {
             setCadLines(prev => prev.map(x => x.id === cadSelectedLine ? { ...x, strokeWidth: parseInt(cadEditInputs.weight) || 4, hexColor: cadEditInputs.hex || '#38bdf8' } : x));
          }
        } else {
          setCadLines(prev => prev.map(x => x.id === cadSelectedLine ? { ...x, strokeWidth: parseInt(cadEditInputs.weight) || 4, hexColor: cadEditInputs.hex || '#38bdf8' } : x));
        }
        setCadSelectedLine(null);
     }
     
     if (cadSelectedCircle) {
        const c = cadCircles.find(x => x.id === cadSelectedCircle);
        if (c && cadScale) {
           const num = parseFloat(cadEditInputs.length);
           if (num && num !== parseFloat(c.radiusMeters)) {
              const rPx = num / cadScale;
              setCadCircles(prev => prev.map(x => x.id === cadSelectedCircle ? { ...x, radiusMeters: num.toString(), radiusPixels: rPx, strokeWidth: parseInt(cadEditInputs.weight) || 3, hexColor: cadEditInputs.hex || '#4f46e5' } : x));
           } else {
              setCadCircles(prev => prev.map(x => x.id === cadSelectedCircle ? { ...x, strokeWidth: parseInt(cadEditInputs.weight) || 3, hexColor: cadEditInputs.hex || '#4f46e5' } : x));
           }
        } else {
           setCadCircles(prev => prev.map(x => x.id === cadSelectedCircle ? { ...x, strokeWidth: parseInt(cadEditInputs.weight) || 3, hexColor: cadEditInputs.hex || '#4f46e5' } : x));
        }
        setCadSelectedCircle(null);
     }
     setIsLineMoving(false);
     setIsEditingLineMode(false);
     if (cadTool !== 'EDIT_RADIUS') setCadTool('IDLE');
  };
  
  const handleCadEditDelete = () => {
     if (cadSelectedLine) setCadLines(prev => prev.filter(x => x.id !== cadSelectedLine));
     if (cadSelectedCircle) setCadCircles(prev => prev.filter(x => x.id !== cadSelectedCircle));
     setCadSelectedLine(null);
     setCadSelectedCircle(null);
     setIsLineMoving(false);
     setIsEditingLineMode(false);
     if (cadTool !== 'EDIT_RADIUS') setCadTool('IDLE');
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

  // Auto-sync active UI settings to the loaded project
  React.useEffect(() => {
    if (cadLoadedProjectId) {
       setSavedProjects(prev => prev.map(p => {
          if (p.id === cadLoadedProjectId) {
             return {
                ...p,
                uiSettings: {
                   isMetricsVisible,
                   isSurveyNoVisible,
                   isSubDivVisible,
                   isAddRadiusEnabled,
                   isSketchExtendEnabled,
                   showDarkDrawSettings,
                   isFloatingStackExpanded,
                   isGalleryPopupOpen,
                   isScaleModalOpen,
                   isAreaDropdownOpen,
                   isSurveyDropdownOpen,
                   isSubDivisionDropdownOpen
                }
             };
          }
          return p;
       }));
    }
  }, [
    cadLoadedProjectId,
    isMetricsVisible, isSurveyNoVisible, isSubDivVisible,
    isAddRadiusEnabled, isSketchExtendEnabled,
    showDarkDrawSettings, isFloatingStackExpanded,
    isGalleryPopupOpen, isScaleModalOpen,
    isAreaDropdownOpen, isSurveyDropdownOpen, isSubDivisionDropdownOpen
  ]);

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
    resetCadState();
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
        <div className="fixed inset-0 z-[120] bg-[#f8fafc] flex flex-col animate-in slide-in-from-right-full duration-300" style={{ width: cadWindowSize.width, height: cadWindowSize.height }}>
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
                          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-between shadow-sm relative hover:shadow-md transition-shadow">
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
                 <h3 className="font-black text-[#0369a1] text-lg uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-3">
                   <button onClick={() => { setActiveLandSurveyView('menu'); resetCadState(); }} className="hover:text-slate-500 transition-colors">⬅️</button>
                   Dark Draw Setup
                 </h3>
                 <button onClick={() => { resetCadState(); setActiveLandSurveyView('dark_draw_manual'); }} className="w-full text-left bg-slate-50 hover:bg-[#0369a1] hover:text-white text-slate-800 p-4 rounded-xl border border-slate-200 transition-colors font-bold flex justify-between items-center group">
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
                   <button onClick={() => { setActiveLandSurveyView('dark_draw_submenu'); resetCadState(); }} className="hover:text-slate-500 transition-colors">⬅️</button>
                   Saved Projects
                 </h3>
                 {savedProjects.length === 0 ? (
                   <p className="text-sm text-slate-500 italic">No projects saved yet.</p>
                 ) : (
                   savedProjects.map(proj => (
                     <div key={proj.id} className="relative bg-slate-50 hover:bg-[#0369a1] text-slate-800 hover:text-white p-2 rounded-xl border border-slate-200 transition-colors flex items-center justify-between group">
                        <button onClick={() => {
                           resetCadState();
                           setCadLoadedProjectId(proj.id);
                           setCadLines(proj.state.lines);
                           setCadCircles(proj.state.circles);
                           setCadTexts(proj.state.texts);
                           setCadMetricOffsets(proj.state.metricOffsets);
                           setCadViewport(proj.state.viewport);
                           setCadScale(proj.state.scale);
                           if (proj.state.surveys) setCadSurveys(proj.state.surveys); else setCadSurveys([]);
                           if (proj.state.checkedSurveys) setCheckedSurveyNos(proj.state.checkedSurveys); else if (proj.state.surveys) setCheckedSurveyNos([...new Set(proj.state.surveys.map(s => s.surveyNo))]); else setCheckedSurveyNos([]);
                           
                           const ui = proj.uiSettings || {};
                           setIsMetricsVisible(ui.isMetricsVisible !== undefined ? ui.isMetricsVisible : (proj.state.isMetricsVisible !== undefined ? proj.state.isMetricsVisible : true));
                           setIsSurveyNoVisible(ui.isSurveyNoVisible !== undefined ? ui.isSurveyNoVisible : (proj.state.isSurveyNoVisible !== undefined ? proj.state.isSurveyNoVisible : true));
                           setIsSubDivVisible(ui.isSubDivVisible !== undefined ? ui.isSubDivVisible : (proj.state.isSubDivVisible !== undefined ? proj.state.isSubDivVisible : true));
                           setIsAddRadiusEnabled(ui.isAddRadiusEnabled || false);
                           setIsSketchExtendEnabled(ui.isSketchExtendEnabled || false);
                           setShowDarkDrawSettings(ui.showDarkDrawSettings || false);
                           setIsFloatingStackExpanded(ui.isFloatingStackExpanded || false);
                           setIsGalleryPopupOpen(ui.isGalleryPopupOpen || false);
                           setIsScaleModalOpen(ui.isScaleModalOpen || false);
                           setIsAreaDropdownOpen(ui.isAreaDropdownOpen || false);
                           setIsSurveyDropdownOpen(ui.isSurveyDropdownOpen || false);
                           setIsSubDivisionDropdownOpen(ui.isSubDivisionDropdownOpen || false);

                           setCadHistory({ past: [], future: [] }); // Reset history
                           setActiveLandSurveyView('dark_draw_manual');
                        }} className="flex-1 text-left font-bold text-sm bg-transparent border-none outline-none">
                          Project - {proj.date}
                        </button>
                        <div className="relative flex items-center gap-2">
                           <span className="text-slate-400 group-hover:text-white font-black text-xs uppercase tracking-widest pointer-events-none">Load</span>
                           <button onClick={(e) => { e.stopPropagation(); setActiveMapMenuId(activeMapMenuId === proj.id ? null : proj.id); }} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                           </button>
                           {activeMapMenuId === proj.id && (
                              <div className="absolute right-0 top-full mt-2 w-36 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden">
                                 <button onClick={() => handleRenameSavedProject(proj.id)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50">Rename</button>
                                 <button onClick={() => handleDeleteSavedProject(proj.id)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">Delete</button>
                              </div>
                           )}
                        </div>
                     </div>
                   ))
                 )}
               </div>
             </div>
          ) : activeLandSurveyView === 'dark_draw_manual' ? (
             <div className="flex-1 flex flex-col bg-slate-950 animate-in slide-in-from-right-8 duration-300 relative">
               {/* TOP NAVIGATION BAR OVERHAUL */}
               <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center shadow-md relative z-[200] shrink-0 w-full justify-between">
                 <div className="flex items-center gap-4">
                    {/* Native Back Arrow */}
                    <button 
                      onClick={() => {
                         if (cadLoadedProjectId) {
                            setCadLines([]); setCadCircles([]); setCadTexts([]); setCadMetricOffsets({});
                            setCadHistory({ past: [], future: [] }); setCadLoadedProjectId(null);
                            setActiveLandSurveyView('dark_draw_projects');
                         } else {
                            setActiveLandSurveyView('dark_draw_submenu');
                         }
                        resetCadState();
                      }}
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
                     <div className="absolute right-0 top-12 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[150] overflow-hidden py-1">
                       <div className="flex items-center justify-between w-full px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer border-b border-slate-700" onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          const nextVal = !isAddRadiusEnabled;
                          setIsAddRadiusEnabled(nextVal);
                          if (!nextVal) {
                              setCadTool('IDLE');
                          } else {
                              setCadSelectedPolygon(null);
                              setCadMultiSelectMode(false);
                              cadMultiSelectModeRef.current = false;
                              setCadMultiSelectedPolygons([]);
                              if (cadContextMenu) setCadContextMenu(null);
                          }
                      }}>
                         <span>Add Radius</span>
                         <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors duration-200 ${isAddRadiusEnabled ? 'bg-sky-500' : 'bg-slate-600'}`}>
                           <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${isAddRadiusEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                         </div>
                       </div>
                       <div className="flex items-center justify-between w-full px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer border-b border-slate-700" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsSketchExtendEnabled(!isSketchExtendEnabled); }}>
                         <span>Sketch / Extend</span>
                         <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors duration-200 ${isSketchExtendEnabled ? 'bg-fuchsia-500' : 'bg-slate-600'}`}>
                           <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${isSketchExtendEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                         </div>
                       </div>
                       <div className="flex items-center justify-between w-full px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer border-b border-slate-700" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMetricsVisible(!isMetricsVisible); }}>
                         <span>Metrics</span>
                         <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors duration-200 ${isMetricsVisible ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                           <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${isMetricsVisible ? 'translate-x-5' : 'translate-x-0'}`}></div>
                         </div>
                       </div>
                       
                       <div className="flex items-center justify-between w-full px-5 py-3 border-b border-slate-700 gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-[13px] font-bold text-slate-300 hover:text-white transition-colors" onClick={e => e.stopPropagation()}>
                              <span>S/n.o</span>
                              <input type="checkbox" className="accent-fuchsia-500 w-4 h-4 cursor-pointer" checked={isSurveyNoVisible} onChange={(e) => { e.stopPropagation(); setIsSurveyNoVisible(e.target.checked); }} />
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-[13px] font-bold text-slate-300 hover:text-white transition-colors" onClick={e => e.stopPropagation()}>
                              <span>SUB</span>
                              <input type="checkbox" className="accent-fuchsia-500 w-4 h-4 cursor-pointer" checked={isSubDivVisible} onChange={(e) => { e.stopPropagation(); setIsSubDivVisible(e.target.checked); }} />
                          </label>
                       </div>

                       <div className="flex items-center justify-between w-full px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer border-b border-slate-700" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (cadTool === 'EDIT_RADIUS') { setCadTool('IDLE'); setCadSelectedNode(null); setCadHoveredNode(null); setCadDraggingNode(null); } else { setIsEditingLineMode(false); setIsLineMoving(false); setCadSelectedLine(null); setCadTool('EDIT_RADIUS'); } }}>
                         <span>Edit Radius</span>
                         <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors duration-200 ${cadTool === 'EDIT_RADIUS' ? 'bg-fuchsia-500' : 'bg-slate-600'}`}>
                           <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${cadTool === 'EDIT_RADIUS' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                         </div>
                       </div>
                       <button className="w-full text-left px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700" onClick={() => { if (cadTool === 'ADD_TEXT') { setCadTool('IDLE'); } else { setIsEditingLineMode(false); setIsLineMoving(false); setCadSelectedLine(null); setCadTool('ADD_TEXT'); } setShowDarkDrawSettings(false); }}>Add Text</button>
                       <div className="flex items-center justify-between w-full px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer border-b border-slate-700" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (cadTool === 'SELECT_METRIC') { setCadTool('IDLE'); setCadSelectedNode(null); setCadHoveredNode(null); setCadDraggingNode(null); } else { setIsEditingLineMode(false); setIsLineMoving(false); setCadSelectedLine(null); setCadTool('SELECT_METRIC'); } }}>
                         <span>Select Metric</span>
                         <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors duration-200 ${cadTool === 'SELECT_METRIC' ? 'bg-fuchsia-500' : 'bg-slate-600'}`}>
                           <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${cadTool === 'SELECT_METRIC' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                         </div>
                       </div>
                       <div className="flex items-center justify-between w-full px-5 py-3 text-[13px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (cadTool === 'SELECT_TEXT') { setCadTool('IDLE'); setCadSelectedNode(null); setCadHoveredNode(null); setCadDraggingNode(null); setCadSelectedText(null); } else { setIsEditingLineMode(false); setIsLineMoving(false); setCadSelectedLine(null); setCadTool('SELECT_TEXT'); } }}>
                         <span>Select Text</span>
                         <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors duration-200 ${cadTool === 'SELECT_TEXT' ? 'bg-fuchsia-500' : 'bg-slate-600'}`}>
                           <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${cadTool === 'SELECT_TEXT' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                         </div>
                       </div>
                       <button className="w-full text-left px-5 py-3 text-[13px] font-black text-rose-500 hover:bg-slate-700 hover:text-rose-400 transition-colors border-t border-slate-700 uppercase tracking-widest" onClick={() => {
                          setCadLines([]); setCadCircles([]); setCadTexts([]); setCadMetricOffsets({});
                          setCadHistory({ past: [], future: [] }); setCadLoadedProjectId(null);
                          setPdfBase64(''); setSourceImage(''); setCroppedImage(null); setExtractedVectors(null);
                          setPdfScale(''); setPdfScaleStatus(''); setCadScale(null);
                          setCadViewport({ x: 0, y: 0, width: 2000, height: 2000 });
                          setShowDarkDrawSettings(false);
                          
                          // STRICT HARD RESET
                          setCadBackgroundImage(null);
                          setCadSurveys([]);
                          setCadActiveSurveyId(null);
                          setCheckedSurveyNos([]);
                          setCadPromptSurveyNo('');
                          setCadPromptSubDiv('');

                          // ABSOLUTE RESET OF PINS AND ACTIVE TOOLS
                          setCadAnchorNode(null);
                          setCadHoveredNode(null);
                          setCadDraggingNode(null);
                          setCadSelectedNode(null);
                          setCadSelectedLine(null);
                          setCadSelectedCircle(null);
                          setCadSelectedText(null);
                          setCadSelectedMetric(null);
                          setCadTool('IDLE');
                          setCadPointerGesture(null);
                          setCadMagnifierPos(null);
                          setIsLineMoving(false);
                          setIsEditingLineMode(false);
                          setCadPrompt(null);
                          setCadPinchInitial(null);
                       }}>New Canvas</button>
                       <button className="w-full text-left px-5 py-3 text-[13px] font-black text-emerald-400 hover:bg-slate-700 hover:text-emerald-300 transition-colors border-t border-slate-700 uppercase tracking-widest" onClick={handleSaveProject}>Save Project</button>
                     </div>
                   )}
                 </div>
               </div>

               {/* WORKSPACE SPLIT SUMMARY CARD */}
               <div className="bg-slate-800/90 backdrop-blur border-b border-r border-slate-700 w-[calc(100%-60px)] flex items-center shrink-0 shadow-sm z-[150] relative rounded-br-2xl">
                 <div className="flex-1 flex flex-col justify-center px-3 py-1.5 border-r border-slate-700/50 min-w-0">
                    <button onClick={() => { setIsAreaDropdownOpen(!isAreaDropdownOpen); setIsPerimeterDropdownOpen(false); }} className="flex items-center justify-between w-full text-white font-black text-[13px] hover:text-emerald-400 transition-colors outline-none leading-tight">
                      <span>{cadComputedArea ? (
                          selectedAreaUnit === 'Hectare' ? cadComputedArea.hectare.toFixed(4) :
                          selectedAreaUnit === 'Ares' ? cadComputedArea.are.toFixed(4) :
                          selectedAreaUnit === 'Acre' ? cadComputedArea.acre.toFixed(4) :
                          selectedAreaUnit === 'Cent' ? cadComputedArea.cent.toFixed(2) :
                          selectedAreaUnit === 'Sq. Ft' ? cadComputedArea.sqFt.toFixed(2) :
                          selectedAreaUnit === 'Sq. M' ? cadComputedArea.sqMeters.toFixed(2) : '--'
                      ) : "--"}</span> <span className="text-[10px] text-slate-400 whitespace-nowrap">{selectedAreaUnit} ▼</span>
                    </button>
                    <button onClick={() => { setSelectedPerimeterUnit(selectedPerimeterUnit === 'Ft' ? 'M' : 'Ft'); setIsAreaDropdownOpen(false); }} className="flex items-center justify-between w-full text-slate-400 font-bold text-[10px] hover:text-fuchsia-400 transition-colors outline-none leading-tight mt-0.5">
                      <span>{(() => {
                          if (cadPointerGesture?.isDraggingAnchor) {
                              let activeSegmentMeters = null;
                              
                              if (cadPointerGesture.connectedLineRefs && cadPointerGesture.connectedLineRefs.length > 0) {
                                  const activeL = cadLines.find(x => x.id === cadPointerGesture.connectedLineRefs[0].id);
                                  if (activeL && cadScale) activeSegmentMeters = Math.hypot(activeL.p1.x - activeL.p2.x, activeL.p1.y - activeL.p2.y) * cadScale;
                              } else if (cadPrompt?.type === 'LINE') {
                                  const activeL = cadLines.find(x => x.id === cadPrompt.targetId);
                                  if (activeL && cadScale) activeSegmentMeters = Math.hypot(activeL.p1.x - activeL.p2.x, activeL.p1.y - activeL.p2.y) * cadScale;
                              }

                              if (activeSegmentMeters !== null) {
                                  if (selectedPerimeterUnit === 'Ft') {
                                      return (activeSegmentMeters * 3.28084).toFixed(2);
                                  } else {
                                      return activeSegmentMeters.toFixed(2);
                                  }
                              }
                          }

                          let totalMeters = cadLines.reduce((acc, l) => acc + (l.fixedLength ? parseFloat(l.fixedLength) : (cadScale ? Math.hypot(l.p1.x - l.p2.x, l.p1.y - l.p2.y) * cadScale : 0)), 0);
                          if (selectedPerimeterUnit === 'Ft') {
                              return (totalMeters * 3.28084).toFixed(2);
                          } else {
                              return totalMeters.toFixed(2);
                          }
                      })()}</span> <span className="whitespace-nowrap text-[9px]">{cadPointerGesture?.isDraggingAnchor ? 'Seg ' + selectedPerimeterUnit : 'Tot ' + selectedPerimeterUnit} ▼</span>
                    </button>
                 </div>
                 <div className="flex-1 flex flex-col justify-center px-3 py-1.5 min-w-0">
                    <button onClick={() => { setIsSurveyDropdownOpen(!isSurveyDropdownOpen); setIsSubDivisionDropdownOpen(false); }} className="flex items-center justify-between w-full text-white font-black text-[13px] hover:text-sky-400 transition-colors outline-none leading-tight">
                      <span className="truncate">
                        {(() => {
                           const activeObj = cadSurveys.find(s => s.id === cadActiveSurveyId);
                           if (activeObj) return `Survey No ${activeObj.surveyNo}`;
                           return checkedSurveyNos.length > 0 ? `Survey No ${checkedSurveyNos[0]}` : 'Survey No';
                        })()}
                      </span> 
                      <span className="text-[10px] text-slate-400">▼</span>
                    </button>
                    <button onClick={() => { setIsSubDivisionDropdownOpen(!isSubDivisionDropdownOpen); setIsSurveyDropdownOpen(false); }} className="flex items-center justify-between w-full text-slate-400 font-bold text-[10px] hover:text-sky-400 transition-colors outline-none leading-tight mt-0.5">
                      <span className="truncate">
                        {(() => {
                           if (checkedSurveyNos.length === 0) return 'Sub-division -';
                           const activeObj = cadSurveys.find(s => s.id === cadActiveSurveyId);
                           if (activeObj) return `Sub-division - ${activeObj.subDivisionNo || '-'}`;
                           return 'Sub-division - All';
                        })()}
                      </span> 
                      <span className="text-[9px]">▼</span>
                    </button>
                 </div>

                 {/* DROPDOWNS OUTSIDE OVERFLOW CONTEXTS */}
                 {isAreaDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsAreaDropdownOpen(false)}></div>
                      <div className="absolute top-full left-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-[120px] flex flex-col">
                         {['Hectare', 'Ares', 'Acre', 'Cent', 'Sq. Ft', 'Sq. M'].map(unit => (
                             <button key={unit} onClick={() => { setSelectedAreaUnit(unit); setIsAreaDropdownOpen(false); }} className={`px-4 py-2 text-xs font-bold text-left hover:bg-slate-700 transition-colors ${selectedAreaUnit === unit ? 'text-emerald-400' : 'text-slate-300'}`}>
                                {unit}
                             </button>
                         ))}
                      </div>
                    </>
                 )}
                 {isSurveyDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSurveyDropdownOpen(false)}></div>
                        <div className="absolute top-full right-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50 min-w-[120px] flex flex-col max-h-[300px] overflow-y-auto">
                           {cadSurveys.length === 0 ? (
                               <div className="px-4 py-2 text-xs text-slate-400 italic text-center">No surveys</div>
                           ) : (
                               Array.from(new Set(cadSurveys.map(s => s.surveyNo))).map(surveyNo => (
                                   <div key={surveyNo} className="flex items-center gap-3 px-3 py-1.5 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700/50 last:border-0" onClick={(e) => { e.stopPropagation(); setCheckedSurveyNos(prev => prev.includes(surveyNo) ? prev.filter(n => n !== surveyNo) : [...prev, surveyNo]); }}>
                                       <input 
                                           type="checkbox" 
                                           checked={checkedSurveyNos.includes(surveyNo)} 
                                           onChange={(e) => { e.stopPropagation(); setCheckedSurveyNos(prev => e.target.checked ? [...prev, surveyNo] : prev.filter(n => n !== surveyNo)); }} 
                                           onClick={(e) => e.stopPropagation()}
                                           className="w-3.5 h-3.5 rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-700 cursor-pointer" 
                                       />
                                       <span className="text-xs font-bold text-slate-200">{surveyNo}</span>
                                   </div>
                               ))
                           )}
                        </div>
                      </>
                   )}
                   {isSubDivisionDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSubDivisionDropdownOpen(false)}></div>
                        <div className="absolute top-full right-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50 min-w-[180px] flex flex-col max-h-[300px] overflow-y-auto">
                           {/* MASTER DASH ROW */}
                           <div className="flex items-center gap-3 px-3 py-1.5 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700/50" onClick={(e) => { e.stopPropagation(); setCadSurveys(prev => prev.map(s => checkedSurveyNos.includes(s.surveyNo) ? { ...s, isVisible: false } : s)); }}>
                               <input 
                                   type="checkbox" 
                                   checked={!cadSurveys.some(s => checkedSurveyNos.includes(s.surveyNo) && s.isVisible)} 
                                   onChange={(e) => { e.stopPropagation(); setCadSurveys(prev => prev.map(s => checkedSurveyNos.includes(s.surveyNo) ? { ...s, isVisible: false } : s)); }} 
                                   onClick={(e) => e.stopPropagation()}
                                   className="w-3.5 h-3.5 rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-700 cursor-pointer" 
                               />
                               <span className="text-xs font-bold text-slate-200">- (All Sub-divisions)</span>
                           </div>

                           {/* DEPENDENT CASCADE ROWS */}
                           {cadSurveys.filter(s => checkedSurveyNos.includes(s.surveyNo)).length === 0 ? (
                               <div className="px-4 py-2 text-xs text-slate-400 italic text-center">No active sub-divisions</div>
                           ) : (
                               cadSurveys.filter(s => checkedSurveyNos.includes(s.surveyNo)).map(survey => (
                                   <div key={survey.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700/50 last:border-0" onClick={(e) => { e.stopPropagation(); setCadSurveys(prev => prev.map(s => s.id === survey.id ? { ...s, isVisible: !s.isVisible } : s)); setCadActiveSurveyId(survey.id); }}>
                                       <div className="flex items-center gap-3">
                                           <input 
                                               type="checkbox" 
                                               checked={survey.isVisible} 
                                               onChange={(e) => { e.stopPropagation(); setCadSurveys(prev => prev.map(s => s.id === survey.id ? { ...s, isVisible: e.target.checked } : s)); setCadActiveSurveyId(survey.id); }} 
                                               onClick={(e) => e.stopPropagation()}
                                               className="w-3.5 h-3.5 rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-700 cursor-pointer" 
                                           />
                                           <span className={`text-xs font-bold ${cadActiveSurveyId === survey.id ? 'text-white' : 'text-slate-300'}`}>{survey.subDivisionNo || '-'}</span>
                                       </div>
                                       <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: survey.hexColor }}></div>
                                   </div>
                               ))
                           )}
                        </div>
                      </>
                   )}
               </div>

               {/* RIGHT-TOP CORNER VERTICAL FLOATING ICONS */}
               <div className="absolute top-[76px] right-3 z-[90] flex flex-col gap-2 items-center">
                 {/* Gallery / Image Upload Icon - ALWAYS VISIBLE */}
                 <button onClick={() => setIsGalleryPopupOpen(true)} className="w-10 h-10 shrink-0 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-500 transition-all shadow-md z-10">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                 </button>

                 {/* COLLAPSIBLE ICONS */}
                 <div className={`flex flex-col gap-3 overflow-hidden transition-all duration-500 ease-in-out ${isFloatingStackExpanded ? 'max-h-[300px] opacity-100 mb-1' : 'max-h-0 opacity-0 mb-0 -mt-2'}`}>
                   {/* Eye Icon */}
                   <button className={`w-10 h-10 shrink-0 rounded-full bg-slate-900 flex items-center justify-center transition-all shadow-md relative ${!isBackgroundImageVisible ? 'border border-rose-500 text-rose-500 bg-rose-500/10' : 'border border-slate-600 text-slate-400 hover:border-cyan-500 hover:text-white hover:bg-cyan-500'}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsBackgroundImageVisible(!isBackgroundImageVisible); }}>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                       <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                     </svg>
                     {!isBackgroundImageVisible && (
                       <svg xmlns="http://www.w3.org/2000/svg" className="absolute h-6 w-6 text-rose-500 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                         <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" strokeLinejoin="round" />
                       </svg>
                     )}
                   </button>
                   {/* Scale / Ruler Icon */}
                   <button onClick={() => setIsScaleModalOpen(true)} className="w-10 h-10 shrink-0 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:border-amber-500 hover:bg-amber-500 transition-all shadow-md" title="Scale Calibration">
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                       <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
                       <line x1="6" y1="6" x2="6" y2="10"></line>
                       <line x1="10" y1="6" x2="10" y2="10"></line>
                       <line x1="14" y1="6" x2="14" y2="10"></line>
                       <line x1="18" y1="6" x2="18" y2="10"></line>
                     </svg>
                   </button>
                   {/* 5th Icon: Edit Line Attributes */}
                   <button onClick={() => { setIsEditingLineMode(true); setIsLineMoving(false); setCadTool('EDIT_LINE'); setShowDarkDrawSettings(false); }} className="w-10 h-10 shrink-0 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-500 hover:bg-cyan-500 transition-all shadow-md" title="Edit Line Attributes">
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                       <circle cx="12" cy="12" r="3"></circle>
                       <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                     </svg>
                   </button>
                 </div>
                 {/* Collapse/Expand Toggle Arrow (Simplified) */}
                 <button onClick={() => setIsFloatingStackExpanded(!isFloatingStackExpanded)} className="flex items-center justify-center text-slate-500 hover:text-white transition-all pt-1">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-300 ${isFloatingStackExpanded ? 'rotate-180' : 'rotate-0'}`}>
                     <path d="M6 9l6 6 6-6"/>
                   </svg>
                 </button>
               </div>

               {/* SCALE CALIBRATION MODAL */}
               {isScaleModalOpen && (
                 <>
                   <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsScaleModalOpen(false)}>
                     <div className="bg-slate-800 border border-slate-600 p-6 rounded-2xl shadow-2xl min-w-[300px]" onClick={e => e.stopPropagation()}>
                       <h3 className="text-white font-black uppercase text-lg mb-4 border-b border-slate-700 pb-2">Map Scale Calibration</h3>
                       <table className="w-full text-left text-white border-collapse">
                          <thead>
                             <tr>
                               <th className="border-b border-slate-600 py-2 px-2 text-xs uppercase text-slate-400">Map Scale</th>
                               <th className="border-b border-slate-600 py-2 px-2 text-xs uppercase text-slate-400 text-center">Ratio</th>
                               <th className="border-b border-slate-600 py-2 px-2 text-xs uppercase text-slate-400">Physical Distance (X)</th>
                             </tr>
                          </thead>
                          <tbody>
                             <tr>
                               <td className="py-3 px-2 font-black text-lg text-slate-300 whitespace-nowrap">1</td>
                               <td className="py-3 px-2 font-black text-lg text-slate-400 text-center">:</td>
                               <td className="py-3 px-2 flex items-center gap-2">
                                  {(() => {
                                      const FMB_PIXELS_PER_MM = 170 / 25.4;
                                      const unitMultiplier = scaleDisplayUnit === 'mm' ? 1000 : scaleDisplayUnit === 'cm' ? 100 : 1;
                                      const displayValue = cadScale ? parseFloat((cadScale * unitMultiplier * FMB_PIXELS_PER_MM).toFixed(1)) : '';
                                      
                                      return (
                                        <input type="number" step="0.1" value={displayValue} onChange={e => {
                                           const val = parseFloat(e.target.value);
                                           if (!isNaN(val) && val > 0) {
                                              setCadScale(val / FMB_PIXELS_PER_MM / unitMultiplier);
                                           }
                                        }} className="w-24 bg-slate-900 border border-slate-600 p-2 rounded text-emerald-400 font-mono font-bold text-lg text-right" placeholder="0" />
                                      );
                                  })()}
                                  <select className="bg-slate-900 border border-slate-600 p-2 rounded text-slate-300 font-bold outline-none" value={scaleDisplayUnit} onChange={e => setScaleDisplayUnit(e.target.value)}>
                                     <option value="mm">mm</option>
                                     <option value="cm">cm</option>
                                     <option value="m">m</option>
                                  </select>
                               </td>
                             </tr>
                          </tbody>
                       </table>
                       <p className="text-[10px] text-slate-400 mt-2">The scale factor updates automatically when drawing the first master baseline line segment. Standard ratio format (1:X) correlates map unit distance to real-world ground distance.</p>
                       <div className="mt-6 flex justify-end">
                          <button onClick={() => setIsScaleModalOpen(false)} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">Done</button>
                       </div>
                     </div>
                   </div>
                 </>
               )}

               {/* GALLERY POPUP MENU */}
               {isGalleryPopupOpen && (
                 <>
                   <div className="fixed inset-0 z-[200]" onClick={() => setIsGalleryPopupOpen(false)}></div>
                   <div className="absolute top-[76px] right-16 z-[210] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col w-48">
                     <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleFileUpload} />
                     <input type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                     <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-700 hover:text-indigo-400 transition-colors border-b border-slate-700">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                       Open Camera
                     </button>
                     <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-700 hover:text-indigo-400 transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                       Upload Files
                     </button>
                   </div>
                 </>
               )}

              {/* DARK CANVAS CONTAINER */}
              <div 
                className="flex-1 w-full relative overflow-hidden bg-slate-950 flex items-center justify-center touch-none" 
                onPointerDown={handleCadPointerDown}
                onPointerMove={handleCadPointerMove}
                onPointerUp={handleCadPointerUp}
                onPointerLeave={handleCadPointerUp}
                onClick={() => setShowDarkDrawSettings(false)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    // On touch devices, we rely solely on the 600ms long press timer loop to trigger this menu.
                    // This blocks mobile browsers from firing fake context menus on short taps or default long presses.
                    if (e.nativeEvent.pointerType === 'touch' || ('ontouchstart' in window && e.type !== 'contextmenu')) return;
                    if ('ontouchstart' in window && navigator.maxTouchPoints > 0) return;
                    
                    if (!isAddRadiusEnabled && cadTool === 'IDLE') {
                        if (e.target && e.target.tagName === 'polygon' && e.target.id && e.target.id.startsWith('poly-svg-')) {
                            const polyId = e.target.id.replace('poly-svg-', '');
                            setCadContextMenu({ x: e.clientX, y: e.clientY, type: 'POLYGON', targetId: polyId });
                        } else {
                            setCadContextMenu({ x: e.clientX, y: e.clientY, type: 'CANVAS' });
                        }
                    }
                }}
              >
              {cadContextMenu && (
                <div 
                    className="absolute bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-[200] overflow-hidden py-1 text-sm font-medium text-slate-200"
                    style={{ left: cadContextMenu.x, top: cadContextMenu.y }}
                >
                    {cadContextMenu.type === 'CANVAS' && (
                        <div 
                            className="px-4 py-2 hover:bg-slate-700 cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                const newMode = !cadMultiSelectMode;
                                setCadMultiSelectMode(newMode);
                                cadMultiSelectModeRef.current = newMode;
                                if (newMode && cadSelectedPolygon) {
                                    setCadMultiSelectedPolygons([cadSelectedPolygon]);
                                    setCadSelectedPolygon(null);
                                } else if (!newMode) {
                                    setCadMultiSelectedPolygons([]);
                                }
                                setCadContextMenu(null);
                            }}
                        >
                            {cadMultiSelectMode ? "Disable Multi-selection" : "Enable Multi-selection"}
                        </div>
                    )}
                    {cadContextMenu.type === 'POLYGON' && (
                        <>
                            {!cadMultiSelectModeRef.current && (
                                <div 
                                    className="px-4 py-2 hover:bg-slate-700 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCadMultiSelectMode(true);
                                        cadMultiSelectModeRef.current = true;
                                        const newSelections = [cadContextMenu.targetId];
                                        if (cadSelectedPolygon && cadSelectedPolygon !== cadContextMenu.targetId) {
                                            newSelections.push(cadSelectedPolygon);
                                        }
                                        setCadMultiSelectedPolygons(newSelections);
                                        setCadSelectedPolygon(null);
                                        setCadContextMenu(null);
                                    }}
                                >
                                    Select Multiple
                                </div>
                            )}
                            {cadMultiSelectModeRef.current && (
                                <div 
                                    className="px-4 py-2 hover:bg-red-600 hover:text-white text-red-400 cursor-pointer border-t border-slate-700"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCadMultiSelectedPolygons([]);
                                        setCadMultiSelectMode(false);
                                        cadMultiSelectModeRef.current = false;
                                        setCadContextMenu(null);
                                    }}
                                >
                                    Clear All
                                </div>
                            )}
                            <div 
                                className="px-4 py-2 hover:bg-slate-700 cursor-pointer border-t border-slate-700 text-slate-400"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCadContextMenu(null);
                                }}
                            >
                                Close Menu
                            </div>
                        </>
                    )}
                </div>
              )}
                 <svg 
                   ref={cadSvgRef}
                   className="absolute inset-0 w-full h-full cursor-crosshair touch-none transition-transform duration-75 ease-linear"
                   style={{ transform: `rotate(${cadRotation}deg)` }}
                   viewBox={`${cadViewport.x} ${cadViewport.y} ${cadViewport.width} ${cadViewport.height}`}
                   preserveAspectRatio="xMidYMid slice"
                 >
                   <defs>
                     <pattern id="grid" width={cadViewport.width * 0.05} height={cadViewport.width * 0.05} patternUnits="userSpaceOnUse">
                       <path d={`M ${cadViewport.width * 0.05} 0 L 0 0 0 ${cadViewport.width * 0.05}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={cadViewport.width * 0.001}/>
                     </pattern>
                   </defs>
                   <rect x={cadViewport.x} y={cadViewport.y} width="100%" height="100%" fill="url(#grid)" />
                   
                     <g id="cad-drawing-layer">
                      {(cadBackgroundImage && isBackgroundImageVisible) && (
                         <image href={cadBackgroundImage} x={0} y={0} width={2000} height={2000} preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
                      )}

                  {visibleCadPolygons.map(p => {
                    const isSelected = cadMultiSelectMode ? cadMultiSelectedPolygons.includes(p.id) : (cadSelectedPolygon === p.id);
                    const polySurvey = p.surveyId ? cadSurveys.find(s => s.id === p.surveyId) : null;
                    const baseColor = polySurvey ? polySurvey.hexColor : '#38bdf8';
                    const fillColor = isSelected ? baseColor + '80' : baseColor + '26';

                    let labelText = '';
                    if (polySurvey) {
                       const sNo = isSurveyNoVisible ? polySurvey.surveyNo : '';
                       const sdNo = (isSubDivVisible && polySurvey.subDivisionNo) ? polySurvey.subDivisionNo : '';
                       if (sNo && sdNo) labelText = sNo + '/' + sdNo;
                       else if (sNo) labelText = sNo;
                       else if (sdNo) labelText = sdNo;
                    }
                    
                    const isPromoted = cadTexts.some(t => t.id === `poly-${p.id}`);
                    
                    let textNode = null;
                    if (labelText && !isPromoted) {
                        let signedArea = 0;
                        let cxSum = 0;
                        let cySum = 0;
                        const pts = p.pts;
                        const n = pts.length;
                        for (let i = 0; i < n; i++) {
                            const p1 = pts[i];
                            const p2 = pts[(i + 1) % n];
                            const a = p1.x * p2.y - p2.x * p1.y;
                            signedArea += a;
                            cxSum += (p1.x + p2.x) * a;
                            cySum += (p1.y + p2.y) * a;
                        }
                        signedArea *= 0.5;
                        
                        let cx = 0, cy = 0;
                        if (Math.abs(signedArea) > 1e-6) {
                            cx = cxSum / (6 * signedArea);
                            cy = cySum / (6 * signedArea);
                        } else {
                            const minX = Math.min(...pts.map(pt => pt.x));
                            const maxX = Math.max(...pts.map(pt => pt.x));
                            const minY = Math.min(...pts.map(pt => pt.y));
                            const maxY = Math.max(...pts.map(pt => pt.y));
                            cx = (minX + maxX) / 2;
                            cy = (minY + maxY) / 2;
                        }
                        
                        // 1. Calculate horizontal space AT the centroid
                        let lefts = [], rights = [], tops = [], bottoms = [];
                        for (let i = 0; i < n; i++) {
                            const p1 = pts[i];
                            const p2 = pts[(i + 1) % n];
                            
                            // Intersect horizontal line y = cy
                            if ((p1.y <= cy && p2.y > cy) || (p1.y > cy && p2.y <= cy)) {
                                const xInt = p1.x + (cy - p1.y) * (p2.x - p1.x) / (p2.y - p1.y);
                                if (xInt <= cx) lefts.push(xInt);
                                if (xInt >= cx) rights.push(xInt);
                            }
                            // Intersect vertical line x = cx
                            if ((p1.x <= cx && p2.x > cx) || (p1.x > cx && p2.x <= cx)) {
                                const yInt = p1.y + (cx - p1.x) * (p2.y - p1.y) / (p2.x - p1.x);
                                if (yInt <= cy) tops.push(yInt);
                                if (yInt >= cy) bottoms.push(yInt);
                            }
                        }
                        
                        let horizW = 0;
                        if (lefts.length > 0 && rights.length > 0) {
                            horizW = Math.min(...rights) - Math.max(...lefts);
                        } else {
                            // Fallback to bounding box width
                            const minX = Math.min(...pts.map(pt => pt.x));
                            const maxX = Math.max(...pts.map(pt => pt.x));
                            horizW = maxX - minX;
                        }
                        
                        let horizH = 0;
                        if (tops.length > 0 && bottoms.length > 0) {
                            horizH = Math.min(...bottoms) - Math.max(...tops);
                        } else {
                            const minY = Math.min(...pts.map(pt => pt.y));
                            const maxY = Math.max(...pts.map(pt => pt.y));
                            horizH = maxY - minY;
                        }
                        
                        const horizLenConst = (horizW * 0.75) / Math.max(1, labelText.length * 0.6);
                        const horizHeightConst = horizH * 0.65;
                        const horizFontSize = Math.min(horizLenConst, horizHeightConst);

                        // 2. Calculate Diagonal Space (Principal Axis) AT the centroid
                        let ixx = 0, iyy = 0, ixy = 0;
                        for (let i = 0; i < n; i++) {
                            ixx += (pts[i].x - cx) ** 2;
                            iyy += (pts[i].y - cy) ** 2;
                            ixy += (pts[i].x - cx) * (pts[i].y - cy);
                        }
                        let angleRad = 0.5 * Math.atan2(2 * ixy, ixx - iyy);
                        let angleDeg = angleRad * (180 / Math.PI);
                        if (angleDeg > 90) angleDeg -= 180;
                        if (angleDeg < -90) angleDeg += 180;
                        
                        const cosA = Math.cos(angleRad);
                        const sinA = Math.sin(angleRad);
                        
                        let uMins = [], uMaxs = [], vMins = [], vMaxs = [];
                        for (let i = 0; i < n; i++) {
                            const p1 = pts[i];
                            const p2 = pts[(i + 1) % n];
                            
                            const u1 = (p1.x - cx) * cosA + (p1.y - cy) * sinA;
                            const v1 = -(p1.x - cx) * sinA + (p1.y - cy) * cosA;
                            const u2 = (p2.x - cx) * cosA + (p2.y - cy) * sinA;
                            const v2 = -(p2.x - cx) * sinA + (p2.y - cy) * cosA;
                            
                            // Intersect V=0
                            if ((v1 <= 0 && v2 > 0) || (v1 > 0 && v2 <= 0)) {
                                const uInt = u1 + (0 - v1) * (u2 - u1) / (v2 - v1);
                                if (uInt <= 0) uMins.push(uInt);
                                if (uInt >= 0) uMaxs.push(uInt);
                            }
                            
                            // Intersect U=0
                            if ((u1 <= 0 && u2 > 0) || (u1 > 0 && u2 <= 0)) {
                                const vInt = v1 + (0 - u1) * (v2 - v1) / (u2 - u1);
                                if (vInt <= 0) vMins.push(vInt);
                                if (vInt >= 0) vMaxs.push(vInt);
                            }
                        }
                        
                        let diagW = 0, diagH = 0;
                        if (uMins.length > 0 && uMaxs.length > 0) {
                            diagW = Math.min(...uMaxs) - Math.max(...uMins);
                        } else {
                            diagW = horizW; // Fallback
                        }
                        
                        if (vMins.length > 0 && vMaxs.length > 0) {
                            diagH = Math.min(...vMaxs) - Math.max(...vMins);
                        } else {
                            diagH = horizH; // Fallback
                        }

                        const diagLenConst = (diagW * 0.75) / Math.max(1, labelText.length * 0.6);
                        const diagHeightConst = diagH * 0.65;
                        const diagFontSize = Math.min(diagLenConst, diagHeightConst);

                        // 3. Evaluation & Orientation
                        let finalAngle = 0;
                        let finalFontSize = horizFontSize;
                        
                        // Strict check: if horizontal fits fine (e.g. >= 14px), keep it straight!
                        // Only flip to diagonal if horizontal is very tight (< 14) and diagonal actually helps.
                        if (horizFontSize < 14 && diagFontSize > horizFontSize * 1.3) {
                            finalAngle = angleDeg;
                            finalFontSize = diagFontSize;
                        }
                        
                        // Scale proportionally: Restrict min 8px, safely uncap max to 60px 
                        let calculatedFontSize = Math.max(8, Math.min(60, finalFontSize));
                        
                        // Pass finalAngle down to the transform block
                        const angleDegTransform = finalAngle;
                        
                        textNode = (
                            <g
                                className={`transition-transform duration-200 ${cadTool === 'SELECT_TEXT' ? 'cursor-pointer hover:scale-[1.15] group' : ''}`}
                                style={{ transformOrigin: 'center', transformBox: 'fill-box', pointerEvents: cadTool === 'SELECT_TEXT' ? 'auto' : 'none' }}
                                onPointerDown={(e) => {
                                    if (cadTool === 'SELECT_TEXT') {
                                        e.stopPropagation();
                                        const newTxt = { 
                                            id: `poly-${p.id}`, 
                                            text: labelText, 
                                            x: cx, 
                                            y: cy, 
                                            fontSize: calculatedFontSize, 
                                            hexColor: '#ffffff', 
                                            rotation: angleDegTransform 
                                        };
                                        setCadTexts(prev => {
                                            if (prev.some(t => t.id === newTxt.id)) return prev;
                                            return [...prev, newTxt];
                                        });
                                        if (cadEditInputs.isMovingText) {
                                            if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
                                            cadPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
                                            const rawPt = getCadSvgCoords(e.clientX, e.clientY);
                                            setCadPointerGesture({
                                                startX: e.clientX, startY: e.clientY,
                                                offsetX: cx - rawPt.x,
                                                offsetY: cy - rawPt.y,
                                                isDraggingText: true,
                                                targetText: newTxt
                                            });
                                        } else {
                                            setCadSelectedText(`poly-${p.id}`);
                                            setCadPopupOffset({ x: 0, y: 0 });
                                        }
                                    }
                                }}
                            >
                                <text
                                    x={cx}
                                    y={cy}
                                    fill="transparent"
                                    fontSize={calculatedFontSize}
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    className={`${cadTool === 'SELECT_TEXT' ? 'pointer-events-auto' : 'pointer-events-none'} select-none`}
                                    transform={`rotate(${angleDegTransform}, ${cx}, ${cy})`}
                                    paintOrder="stroke"
                                    stroke="transparent"
                                    strokeWidth={calculatedFontSize * 1.5}
                                >
                                    {labelText}
                                </text>
                                <text
                                    x={cx}
                                    y={cy}
                                    fill="#FFFFFF"
                                    fontSize={calculatedFontSize}
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    className="pointer-events-none select-none"
                                    transform={`rotate(${angleDegTransform}, ${cx}, ${cy})`}
                                    stroke="#000000"
                                    strokeWidth="1.5px"
                                    paintOrder="stroke fill"
                                >
                                    {labelText}
                                </text>
                            </g>
                        );
                    }

                    return (
                        <g key={p.id}>
                            {/* Hitbox buffer polygon to guarantee easy touch/click on small polygons */}
                            <polygon
                                id={`poly-svg-${p.id}`}
                                points={p.pts.map(pt => `${pt.x},${pt.y}`).join(' ')}
                                fill="transparent"
                                stroke="transparent"
                                strokeWidth={cadViewport.width * 0.02}
                                strokeLinejoin="round"
                                style={{ pointerEvents: cadTool === 'IDLE' ? 'all' : 'none', cursor: cadTool === 'IDLE' ? 'pointer' : 'crosshair' }} 
                            />
                            {/* Visual polygon */}
                            <polygon
                                points={p.pts.map(pt => `${pt.x},${pt.y}`).join(' ')}
                                fill={fillColor}
                                stroke={isSelected ? baseColor : "rgba(255,255,255,0.1)"}
                                strokeWidth={cadViewport.width * 0.001}
                                style={{ pointerEvents: 'none' }} 
                            />
                            {textNode}
                        </g>
                    );
                  })}

                  {cadCircles.map(c => {
                    const isSelected = cadSelectedCircle === c.id;
                    const isGlowing = cadGlowingCircles.includes(c.id);
                    
                    let angles = [];
                    cadLines.forEach(l => {
                        if (Math.hypot(l.p1.x - c.center.x, l.p1.y - c.center.y) < 1) angles.push(Math.atan2(l.p2.y - c.center.y, l.p2.x - c.center.x));
                        else if (Math.hypot(l.p2.x - c.center.x, l.p2.y - c.center.y) < 1) angles.push(Math.atan2(l.p1.y - c.center.y, l.p1.x - c.center.x));
                    });
                    angles.sort((a,b) => a-b);
                    let bestAngle = -Math.PI / 4;
                    if (angles.length === 1) {
                        bestAngle = angles[0] + Math.PI;
                    } else if (angles.length > 1) {
                        let maxGap = 0;
                        for (let i=0; i<angles.length; i++) {
                            let gap = angles[(i+1)%angles.length] - angles[i];
                            if (gap < 0) gap += 2 * Math.PI;
                            if (gap > maxGap) {
                                maxGap = gap;
                                bestAngle = angles[i] + gap / 2;
                            }
                        }
                    }
                    
                    const rayEndX = c.center.x + c.radiusPixels * Math.cos(bestAngle);
                    const rayEndY = c.center.y + c.radiusPixels * Math.sin(bestAngle);
                    const textX = c.center.x + (c.radiusPixels / 2) * Math.cos(bestAngle);
                    const textY = c.center.y + (c.radiusPixels / 2) * Math.sin(bestAngle);
                    
                    const strokeW = cadViewport.width * (c.strokeWidth ? c.strokeWidth / 1000 : 0.003);
                    const drawColor = isSelected ? "#ec4899" : isGlowing ? "#ff2a6d" : (c.hexColor || "#4f46e5");
                    const guideColor = "#FF1493";
                    
                    return (
                    <g key={c.id}>
                      <circle 
                        cx={c.center.x} cy={c.center.y} r={c.radiusPixels} 
                        fill={isSelected ? "rgba(236,72,153,0.1)" : "none"}
                        stroke={drawColor} 
                        strokeWidth={strokeW} 
                        className={cadBlinkingRadius === c.id || isGlowing ? "animate-pulse" : "transition-colors duration-200"}
                        style={{ pointerEvents: (cadTool === 'IDLE' || cadTool === 'SELECT_TEXT' || cadTool === 'SELECT_METRIC') ? 'none' : 'auto' }}
                      />
                      <line
                        x1={c.center.x} y1={c.center.y} x2={rayEndX} y2={rayEndY}
                        stroke={guideColor}
                        strokeWidth={cadViewport.width * 0.0015}
                        strokeDasharray={`${cadViewport.width * 0.005},${cadViewport.width * 0.005}`}
                        className="pointer-events-none"
                      />
                      <text
                        x={textX} y={textY}
                        fill={guideColor}
                        fontSize={cadViewport.width * 0.012}
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="pointer-events-none"
                        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)' }}
                      >
                        {c.radiusMeters ? parseFloat(c.radiusMeters).toFixed(2) + ' m' : ''}
                      </text>
                      <circle cx={c.center.x} cy={c.center.y} r={cadViewport.width * 0.004} fill={guideColor} stroke="#ffffff" strokeWidth={cadViewport.width * 0.001} className="pointer-events-none" />
                    </g>
                  )})}

                  {(() => {
                    const renderedMetrics = [];
                    return visibleCadLines.map(l => {
                    const isSelected = cadSelectedLine === l.id;
                    const isMetricHovered = cadHoveredNode === null && !cadPointerGesture?.isDragging && !isSelected; // basic fallback
                    const isMetricSelected = cadSelectedMetric === l.id;
                    
                    const isLiveDrag = cadPointerGesture?.isDraggingAnchor && ((cadPointerGesture.connectedLineRefs?.some(r => r.id === l.id)) || (cadPrompt?.type === 'LINE' && cadPrompt.targetId === l.id));
                    
                    let displayLen = 0;
                    if (isLiveDrag && cadScale) {
                        displayLen = Math.hypot(l.p1.x - l.p2.x, l.p1.y - l.p2.y) * cadScale;
                    } else if (l.fixedLength) {
                        displayLen = parseFloat(l.fixedLength);
                    }
                    
                    // Check if it's an internal partition
                    let count = 0;
                    let parentPoly = null;
                    if (cadPolygons && cadPolygons.length > 0) {
                        for (let p of cadPolygons) {
                            let hasEdge = false;
                            for (let i = 0; i < p.pts.length; i++) {
                                const n1 = p.pts[i];
                                const n2 = p.pts[(i + 1) % p.pts.length];
                                const match1 = Math.hypot(n1.x - l.p1.x, n1.y - l.p1.y) < 1e-3 && Math.hypot(n2.x - l.p2.x, n2.y - l.p2.y) < 1e-3;
                                const match2 = Math.hypot(n1.x - l.p2.x, n1.y - l.p2.y) < 1e-3 && Math.hypot(n2.x - l.p1.x, n2.y - l.p1.y) < 1e-3;
                                if (match1 || match2) {
                                    hasEdge = true;
                                    break;
                                }
                            }
                            if (hasEdge) {
                                count++;
                                parentPoly = p;
                            }
                        }
                    }
                    const isInternalPartition = count > 1;
                    
                    let finalRot = 0;
                    let scaledFontSize = 40;
                    let textStr = "";
                    let textLen = 0;
                    
                    if (displayLen && isMetricsVisible) {
                        let defaultRot = Math.atan2(l.p2.y - l.p1.y, l.p2.x - l.p1.x) * (180 / Math.PI);
                        if (defaultRot > 90) defaultRot -= 180;
                        else if (defaultRot < -90) defaultRot += 180;
                        finalRot = l.metricRotation !== undefined ? l.metricRotation : defaultRot;
                        
                        textStr = isGlobalMetricFeet ? (displayLen * 3.28084).toFixed(1) + ' ft' : displayLen.toFixed(1) + ' m';
                        const svgLen = Math.hypot(l.p1.x - l.p2.x, l.p1.y - l.p2.y);
                        const baseFontSize = l.metricFontSize || (isMetricSelected || isLiveDrag ? 50 : (isInternalPartition ? 12 : 32));
                        const maxAllowedFontSize = (svgLen * 0.9) / (Math.max(1, textStr.length) * 0.65);
                        scaledFontSize = Math.min(baseFontSize, Math.max(10, maxAllowedFontSize));
                        textLen = textStr.length * (scaledFontSize * 0.65);
                    }
                    
                    let offset = cadMetricOffsets[l.id] || getMetricDefaultOffset(l);
                    
                    // Override default offset magnitude with scaledFontSize padding
                    if (!cadMetricOffsets[l.id] && displayLen && isMetricsVisible) {
                        const theta = finalRot * (Math.PI / 180);
                        const pad = (scaledFontSize / 2) + (isInternalPartition ? 8 : 15);
                        offset = { dx: pad * Math.sin(theta), dy: -pad * Math.cos(theta) };
                        
                        // Push outer boundary labels OUTSIDE the polygon
                        if (count === 1 && parentPoly) {
                            const testMx = (l.p1.x + l.p2.x) / 2 + offset.dx;
                            const testMy = (l.p1.y + l.p2.y) / 2 + offset.dy;
                            if (pointInPolygon({x: testMx, y: testMy}, parentPoly.pts)) {
                                offset.dx *= -1;
                                offset.dy *= -1;
                            }
                        }
                    }
                    
                    let mx = (l.p1.x + l.p2.x) / 2 + offset.dx;
                    let my = (l.p1.y + l.p2.y) / 2 + offset.dy;
                    
                    if (!cadMetricOffsets[l.id] && isMetricsVisible && displayLen) {
                        const dirX = Math.cos(finalRot * Math.PI / 180);
                        const dirY = Math.sin(finalRot * Math.PI / 180);
                        let bestMx = mx;
                        let bestMy = my;
                        let foundSafe = false;
                        
                        const states = [
                            { dx: offset.dx, dy: offset.dy, shift: 0 },
                            { dx: -offset.dx, dy: -offset.dy, shift: 0 },
                            { dx: offset.dx, dy: offset.dy, shift: textLen * 0.6 },
                            { dx: offset.dx, dy: offset.dy, shift: -textLen * 0.6 },
                            { dx: -offset.dx, dy: -offset.dy, shift: textLen * 0.6 },
                            { dx: -offset.dx, dy: -offset.dy, shift: -textLen * 0.6 },
                            { dx: offset.dx, dy: offset.dy, shift: textLen * 1.0 },
                            { dx: offset.dx, dy: offset.dy, shift: -textLen * 1.0 },
                            { dx: -offset.dx, dy: -offset.dy, shift: textLen * 1.0 },
                            { dx: -offset.dx, dy: -offset.dy, shift: -textLen * 1.0 }
                        ];
                        
                        for (let state of states) {
                            let currentMx = (l.p1.x + l.p2.x) / 2 + state.dx + dirX * state.shift;
                            let currentMy = (l.p1.y + l.p2.y) / 2 + state.dy + dirY * state.shift;
                            
                            let isColliding = false;
                            for (let c of renderedMetrics) {
                                const angleDiff = Math.abs(c.rot - finalRot);
                                const isParallel = angleDiff < 5 || (angleDiff > 175 && angleDiff < 185);
                                const dist = Math.hypot(c.mx - currentMx, c.my - currentMy);
                                
                                if (isParallel) {
                                    if (dist < (c.len / 2) + (textLen / 2) + 5) {
                                        isColliding = true; break;
                                    }
                                } else {
                                    if (dist < (c.len / 2 + textLen / 2) * 0.75) {
                                        isColliding = true; break;
                                    }
                                }
                            }
                            if (!isColliding) {
                                bestMx = currentMx;
                                bestMy = currentMy;
                                foundSafe = true;
                                break;
                            }
                        }
                        
                        if (!foundSafe) {
                            bestMx = (l.p1.x + l.p2.x) / 2 - offset.dx;
                            bestMy = (l.p1.y + l.p2.y) / 2 - offset.dy;
                        }
                        
                        mx = bestMx;
                        my = bestMy;
                        renderedMetrics.push({ mx, my, rot: finalRot, len: textLen, size: scaledFontSize });
                    }
                    
                    return (
                    <g key={l.id}>
                      <line 
                        x1={l.p1.x} y1={l.p1.y} x2={l.p2.x} y2={l.p2.y} 
                        stroke={isSelected ? "#ec4899" : (l.hexColor || "#38bdf8")} 
                        strokeWidth={cadViewport.width * (l.strokeWidth ? l.strokeWidth / 1000 : 0.004)} 
                        strokeLinecap="round" 
                        style={{ pointerEvents: (cadTool === 'IDLE' || cadTool === 'SELECT_TEXT' || cadTool === 'SELECT_METRIC') ? 'none' : 'auto' }}
                      />
                      {isMetricsVisible && displayLen > 0 && (() => {
                        const isSelectedMetricNow = isSelected || isMetricSelected || isLiveDrag;
                        return (
                          <g
                             className={`transition-transform duration-200 ${cadTool === 'SELECT_METRIC' ? 'cursor-pointer hover:scale-[1.15] group' : ''}`}
                             style={{ transformOrigin: 'center', transformBox: 'fill-box', pointerEvents: cadTool === 'SELECT_METRIC' ? 'auto' : 'none' }}
                             onPointerDown={(e) => {
                                if (cadTool === 'SELECT_METRIC') {
                                    e.stopPropagation();
                                    if (cadEditInputs.isMovingMetric) {
                                        if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
                                        cadPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
                                        const rawPt = getCadSvgCoords(e.clientX, e.clientY);
                                        const offset = cadMetricOffsets[l.id] || getMetricDefaultOffset(l);
                                        const mx = (l.p1.x + l.p2.x) / 2 + offset.dx;
                                        const my = (l.p1.y + l.p2.y) / 2 + offset.dy;
                                        setCadPointerGesture({
                                            startX: e.clientX, startY: e.clientY,
                                            offsetX: mx - rawPt.x,
                                            offsetY: my - rawPt.y,
                                            isDraggingMetric: true,
                                            targetMetric: l
                                        });
                                    } else {
                                        setCadSelectedMetric(l.id);
                                        setCadSelectedLine(l.id);
                                        setCadPopupOffset({x:0, y:0});
                                    }
                                }
                             }}
                          >
                            <rect
                               x={mx - textLen/2 - (scaledFontSize * 0.4)}
                               y={my - (scaledFontSize * 0.6)}
                               width={textLen + (scaledFontSize * 0.8)}
                               height={scaledFontSize * 1.2}
                               fill="transparent"
                               stroke="#fbcfe8"
                               strokeWidth={scaledFontSize * 0.05}
                               strokeDasharray={`${scaledFontSize * 0.2},${scaledFontSize * 0.2}`}
                               className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                               transform={`rotate(${finalRot}, ${mx}, ${my})`}
                            />
                            <text 
                              x={mx} y={my} 
                              fill="transparent"
                              fontSize={scaledFontSize} 
                              fontWeight="bold" textAnchor="middle"
                              className={`${cadTool === 'SELECT_METRIC' ? 'pointer-events-auto' : 'pointer-events-none'} select-none`}
                              transform={`rotate(${finalRot}, ${mx}, ${my})`}
                              paintOrder="stroke"
                              stroke="transparent"
                              strokeWidth={scaledFontSize * 1.5}
                            >
                              {textStr}
                            </text>
                            <text 
                              x={mx} y={my} 
                              fill={isSelectedMetricNow ? "#fbcfe8" : (l.metricHexColor || "#38bdf8")} 
                              fontSize={scaledFontSize} 
                              fontWeight="bold" textAnchor="middle"
                              className="transition-colors duration-200 pointer-events-none select-none"
                              transform={`rotate(${finalRot}, ${mx}, ${my})`}
                              paintOrder="stroke"
                              stroke={l.metricStrokeColor || "transparent"}
                              strokeWidth={l.metricStrokeColor && l.metricStrokeColor !== "transparent" ? scaledFontSize * 0.15 : 0}
                              strokeLinejoin="round"
                            >
                              {textStr}
                            </text>
                          </g>
                        );
                      })()}
                    </g>
                  );
                });
              })()}

                  {cadTool === 'ADD_LINE' && cadAnchorNode && (() => {
                     const pinScale = cadViewport.width * 0.0012; 
                     return (
                        <g transform={`translate(${cadAnchorNode.x}, ${cadAnchorNode.y}) scale(${pinScale})`} style={{ touchAction: 'none' }}>
                            <path 
                               d="M0,0 C15,15 24,28 24,40 C24,53 13,64 0,64 C-13,64 -24,53 -24,40 C-24,28 -15,15 0,0 Z" 
                               fill="#475569" stroke="#ffffff" strokeWidth="3" 
                               cursor="move"
                               data-type="anchor-handle"
                            />
                            <circle cx="0" cy="40" r="10" fill="#f8fafc" pointerEvents="none" />
                            {/* Dynamic Bulge & Highlight for the active dot */}
                            <circle cx="0" cy="0" r="10" fill="#ef4444" opacity="0.3" pointerEvents="none">
                                <animate attributeName="r" values="8;16;8" dur="1.5s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="0" cy="0" r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" pointerEvents="none" />
                            {/* Hitbox overlay for bulletproof dragging */}
                            <circle cx="0" cy="30" r="40" fill="transparent" data-type="anchor-handle" cursor="move" />
                        </g>
                     );
                  })()}

                  {/* Live Angular Guide & Deviation Tracker */}
                  {(() => {
                     let fixedVert = null;
                     let movingVert = null;
                     if (cadDraggingNode && cadSelectedLine) {
                        const dragLine = cadLines.find(l => l.id === cadDraggingNode.lineId);
                        if (dragLine) {
                           fixedVert = cadDraggingNode.end === 'p1' ? dragLine.p2 : dragLine.p1;
                           movingVert = cadDraggingNode.end === 'p1' ? dragLine.p1 : dragLine.p2;
                        }
                     }
                     if (!fixedVert || !movingVert) return null;

                     let angle = Math.atan2(movingVert.x - fixedVert.x, movingVert.y - fixedVert.y) * (180 / Math.PI);
                     let dev = -Math.round(angle);
                     if (dev === -0) dev = 0;
                     let sign = dev > 0 ? '+' : '';

                     return (
                        <g pointerEvents="none">
                           <line 
                              x1={fixedVert.x} y1={fixedVert.y} 
                              x2={fixedVert.x} y2={fixedVert.y + 5000} 
                              stroke="#fbbf24" strokeWidth={cadViewport.width * 0.002} 
                              strokeDasharray="4 4" opacity="0.5" 
                           />
                           <text 
                              x={movingVert.x + cadViewport.width * 0.02} 
                              y={movingVert.y - cadViewport.width * 0.02} 
                              fill="#fbbf24" 
                              fontSize={cadViewport.width * 0.02} 
                              fontWeight="bold"
                           >
                              {sign}{dev}°
                           </text>
                        </g>
                     );
                  })()}
                  {/* RED PULSING WARNING RINGS FOR UNCLOSED POLYGON GAPS */}
                  {cadLines.length >= 3 && !cadComputedArea && cadOpenNodes.map((n, i) => (
                    <circle 
                      key={`open-${i}`} cx={n.x} cy={n.y} r={cadViewport.width * 0.015} 
                      fill="none" stroke="#ff0033" strokeWidth={cadViewport.width * 0.003} 
                      className="animate-pulse" 
                      pointerEvents="none"
                    />
                  ))}
                  {/* Magnetic Snap Pulse Indicator */}
                  {cadSnapIndicator && (
                    <circle cx={cadSnapIndicator.x} cy={cadSnapIndicator.y} r={cadViewport.width * 0.01} fill="none" stroke="#d946ef" strokeWidth={cadViewport.width * 0.002} className="animate-ping" />
                  )}

                                    {cadTexts.map(txt => {
                     let displayText = txt.text;
                     if (txt.id.startsWith('poly-')) {
                         const polyId = txt.id.replace('poly-', '');
                         const poly = visibleCadPolygons.find(p => p.id === polyId);
                         if (!poly) return null;
                         if (poly && poly.surveyId) {
                             const polySurvey = cadSurveys.find(s => s.id === poly.surveyId);
                             if (polySurvey) {
                                 const sNo = isSurveyNoVisible ? polySurvey.surveyNo : '';
                                 const sdNo = (isSubDivVisible && polySurvey.subDivisionNo) ? polySurvey.subDivisionNo : '';
                                 if (sNo && sdNo) displayText = sNo + '/' + sdNo;
                                 else if (sNo) displayText = sNo;
                                 else if (sdNo) displayText = sdNo;
                                 else displayText = '';
                             }
                         }
                     }
                     if (!displayText) return null;

                     const isSelected = cadSelectedText === txt.id;
                     return (
                        <g
                           key={txt.id}
                           className={`transition-transform duration-200 ${cadTool === 'SELECT_TEXT' ? 'cursor-pointer hover:scale-[1.15] group' : ''}`}
                           style={{ transformOrigin: 'center', transformBox: 'fill-box', pointerEvents: cadTool === 'SELECT_TEXT' ? 'auto' : 'none' }}
                           onPointerDown={(e) => {
                              if (cadTool === 'SELECT_TEXT') {
                                 e.stopPropagation();
                                 if (cadEditInputs.isMovingText) {
                                     if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
                                     cadPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
                                     const rawPt = getCadSvgCoords(e.clientX, e.clientY);
                                     setCadPointerGesture({
                                         startX: e.clientX, startY: e.clientY,
                                         offsetX: txt.x - rawPt.x,
                                         offsetY: txt.y - rawPt.y,
                                         isDraggingText: true,
                                         targetText: txt
                                     });
                                 } else {
                                     setCadSelectedText(txt.id);
                                     setCadPopupOffset({x:0, y:0});
                                 }
                              }
                           }}
                        >
                           <text
                              x={txt.x} y={txt.y}
                              fill="transparent"
                              fontSize={txt.fontSize || 40}
                              fontWeight="bold"
                              textAnchor="middle"
                              dominantBaseline="central"
                              className={`${cadTool === 'SELECT_TEXT' ? 'pointer-events-auto' : 'pointer-events-none'} select-none`}
                              transform={txt.rotation ? `rotate(${txt.rotation}, ${txt.x}, ${txt.y})` : undefined}
                              paintOrder="stroke"
                              stroke="transparent"
                              strokeWidth={txt.fontSize ? txt.fontSize * 1.5 : 60}
                           >
                              {displayText}
                           </text>
                           <text
                              x={txt.x} y={txt.y}
                              fill={isSelected ? "#fbcfe8" : (txt.hexColor || "#e2e8f0")}
                              fontSize={txt.fontSize || 40}
                              fontWeight="bold"
                              textAnchor="middle"
                              dominantBaseline="central"
                              className="transition-colors duration-200 pointer-events-none select-none"
                              transform={txt.rotation ? `rotate(${txt.rotation}, ${txt.x}, ${txt.y})` : undefined}
                           >
                              {displayText}
                           </text>
                        </g>
                     );
                  })}
                  
                  {/* Dynamic Nodes */}
                  {cadTool !== 'IDLE' && cadTool !== 'SELECT_TEXT' && cadTool !== 'SELECT_METRIC' && (interactiveNodes || []).map(n => {
                    const isHovered = cadHoveredNode && cadHoveredNode.id === n.id;
                    const isSelected = cadSelectedNode && cadSelectedNode.id === n.id;
                    const nodeScale = isHovered || isSelected ? 2.5 : 1;
                    
                    let fillCol = isSelected ? "#ec4899" : "#38bdf8";
                    let strokeCol = "#0f172a";
                    let strokeW = cadViewport.width * 0.001;
                    let rad = cadViewport.width * 0.004 * nodeScale;
                    
                    if (n.type === 'CARDINAL') {
                        fillCol = "#3b82f6";
                        rad = cadViewport.width * 0.002 * nodeScale;
                        strokeW = 0;
                    } else if (n.type === 'LINE_CIRCLE_INT') {
                        fillCol = "#2563eb";
                        rad = cadViewport.width * 0.004 * nodeScale;
                        strokeW = cadViewport.width * 0.001;
                        strokeCol = "#ffffff";
                    } else if (n.type === 'CIRCLE_INT') {
                        fillCol = "#60a5fa";
                        rad = cadViewport.width * 0.006 * nodeScale;
                        strokeW = cadViewport.width * 0.002;
                        strokeCol = "#ffffff";
                    }

                    return (
                      <circle 
                        key={n.id} cx={n.x} cy={n.y} r={rad} 
                        fill={fillCol} 
                        stroke={strokeCol} strokeWidth={strokeW}
                        className="transition-all duration-150 ease-out"
                        pointerEvents="none"
                      />
                    );
                  })}
                   </g>
                </svg>

                 {/* FLOATING MAGNIFIER MIRROR — pin-free, crosshair only */}
                 {cadMagnifierPos && (() => {
                    const isRightHalf = cadMagnifierPos.screenX > (window.innerWidth / 2);
                    let mLeft = isRightHalf ? (cadMagnifierPos.screenX - 270) : (cadMagnifierPos.screenX + 150);
                    let mTop = cadMagnifierPos.screenY - 150;
                    if (mLeft < 10) mLeft = 10;
                    if (mLeft + 130 > window.innerWidth) mLeft = window.innerWidth - 130;
                    if (mTop < 10) mTop = 10;
                    let focusX = cadMagnifierPos.svgX;
                    let focusY = cadMagnifierPos.svgY;
                    const isDraggingMetric = cadPointerGesture && cadPointerGesture.isDraggingMetric && cadPointerGesture.targetMetric;
                    const isDraggingText = cadPointerGesture && cadPointerGesture.isDraggingText && cadPointerGesture.targetText;
                    
                    if (isDraggingMetric || isDraggingText) {
                         focusX += (cadPointerGesture.offsetX || 0);
                         focusY += (cadPointerGesture.offsetY || 0);
                    }

                    const vbX = focusX - (cadViewport.width / 8);
                    const vbY = focusY - (cadViewport.height / 8);
                    const vbW = cadViewport.width / 4;
                    const vbH = cadViewport.height / 4;
                    const chLen = cadViewport.width * 0.014; // crosshair arm length
                    const dotR  = cadViewport.width * 0.004; // center dot radius
                    const sw    = cadViewport.width * 0.0022; // stroke width
                    return (
                    <div style={{
                       position: 'absolute',
                       left: mLeft,
                       top: mTop,
                       width: '140px', height: '140px',
                       borderRadius: '50%',
                       border: '2.5px solid #fbbf24',
                       overflow: 'hidden',
                       background: '#0f172a',
                       pointerEvents: 'none',
                       zIndex: 200,
                       boxShadow: '0 0 0 1px rgba(251,191,36,0.3), 0 12px 28px rgba(0,0,0,0.6)'
                    }}>
                       <svg width="140" height="140" viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}>
                          {/* Grid lines for spatial context */}
                          <line
                            x1={vbX} y1={focusY}
                            x2={vbX + vbW} y2={focusY}
                            stroke="rgba(255,255,255,0.04)" strokeWidth={sw * 0.6}
                          />
                          <line
                            x1={focusX} y1={vbY}
                            x2={focusX} y2={vbY + vbH}
                            stroke="rgba(255,255,255,0.04)" strokeWidth={sw * 0.6}
                          />
                          {/* Background image injected to mirror main canvas zoom */}
                          {(cadBackgroundImage && isBackgroundImageVisible) && (
                             <image href={cadBackgroundImage} x={0} y={0} width={2000} height={2000} preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
                          )}
                          {/* Render only raw line geometry — NO map pin */}
                          {visibleCadLines.map(l => (
                                <line
                                key={`mag-l-${l.id}`}
                              x1={l.p1.x} y1={l.p1.y}
                              x2={l.p2.x} y2={l.p2.y}
                              stroke={l.hexColor || '#38bdf8'}
                              strokeWidth={cadViewport.width * 0.003}
                              strokeLinecap="round"
                            />
                          ))}
                          {/* Render circle geometry */}
                          {cadCircles.map(c => (
                            <circle
                              key={`mag-c-${c.id}`}
                              cx={c.center.x} cy={c.center.y}
                              r={c.radiusPixels}
                              fill="none"
                              stroke={c.hexColor || '#38bdf8'}
                              strokeWidth={cadViewport.width * 0.003}
                            />
                          ))}
                          {/* Vertex endpoint dots — show p1 and p2 of every line */}
                          {cadTool !== 'IDLE' && cadTool !== 'SELECT_TEXT' && cadTool !== 'SELECT_METRIC' && visibleCadLines.map(l => (
                              <React.Fragment key={`mag-pts-${l.id}`}>
                              <circle cx={l.p1.x} cy={l.p1.y} r={dotR * 1.4} fill="#10b981" />
                              <circle cx={l.p2.x} cy={l.p2.y} r={dotR * 1.4} fill="#38bdf8" />
                            </React.Fragment>
                          ))}
                          {/* Contextual Center: Crosshair or Dragged String */}
                          {(() => {
                             if (isDraggingMetric) {
                                 const mLine = visibleCadLines.find(l => l.id === cadPointerGesture.targetMetric.id) || cadPointerGesture.targetMetric;
                                 const scaledFontSize = Math.max(cadViewport.width * 0.01, 14);
                                 let defaultRot = Math.atan2(mLine.p2.y - mLine.p1.y, mLine.p2.x - mLine.p1.x) * (180 / Math.PI);
                                 if (defaultRot > 90 || defaultRot < -90) defaultRot += 180;
                                 return (
                                     <text transform={`rotate(${defaultRot}, ${focusX}, ${focusY})`} x={focusX} y={focusY} fill="#fbcfe8" fontSize={scaledFontSize} fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                                         {mLine.fixedLength} m
                                     </text>
                                 );
                             } else if (isDraggingText) {
                                 let displayText = cadPointerGesture.targetText.text;
                                 if (cadPointerGesture.targetText.id.startsWith('poly-')) {
                                     const polyId = cadPointerGesture.targetText.id.replace('poly-', '');
                                     const poly = visibleCadPolygons.find(p => p.id === polyId);
                                     if (poly && poly.surveyId) {
                                         const polySurvey = cadSurveys.find(s => s.id === poly.surveyId);
                                         if (polySurvey) {
                                             const sNo = isSurveyNoVisible ? polySurvey.surveyNo : '';
                                             const sdNo = (isSubDivVisible && polySurvey.subDivisionNo) ? polySurvey.subDivisionNo : '';
                                             if (sNo && sdNo) displayText = sNo + '/' + sdNo;
                                             else if (sNo) displayText = sNo;
                                             else if (sdNo) displayText = sdNo;
                                             else displayText = '';
                                         }
                                     }
                                 }
                                 const rot = cadPointerGesture.targetText.rotation || 0;
                                 return (
                                     <text transform={rot ? `rotate(${rot}, ${focusX}, ${focusY})` : undefined} x={focusX} y={focusY} fill="#fbcfe8" fontSize={cadPointerGesture.targetText.fontSize || 40} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
                                         {displayText}
                                     </text>
                                 );
                             } else {
                                 return (
                                     <>
                                         <line x1={focusX - chLen} y1={focusY} x2={focusX + chLen} y2={focusY} stroke="#fbbf24" strokeWidth={sw} />
                                         <line x1={focusX} y1={focusY - chLen} x2={focusX} y2={focusY + chLen} stroke="#fbbf24" strokeWidth={sw} />
                                         <circle cx={focusX} cy={focusY} r={dotR} fill="#fbbf24" />
                                     </>
                                 );
                             }
                          })()}
                       </svg>
                    </div>
                    );
                 })()}

                {cadSelectedNode && isAddRadiusEnabled && (() => {
                  const pt = getSvgPtToContainer(cadSelectedNode.x, cadSelectedNode.y);
                  let pLeft = pt.left + 15;
                  let pTop = pt.top - 40;
                  if (pLeft + 140 > window.innerWidth) pLeft = pt.left - 140; // Flip left
                  if (pTop < 20) pTop = pt.top + 20; // Flip down
                  return (
                  <div 
                    className="absolute z-[100] bg-slate-800 p-2 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-slate-600 animate-in zoom-in-95 flex flex-col gap-1 w-32" 
                    style={{ left: pLeft, top: pTop }}
                    onClick={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                    onPointerUp={e => e.stopPropagation()}
                  >
                    <button 
                      className="w-full text-left px-3 py-2 text-xs font-black text-white hover:bg-slate-700 rounded-lg transition-colors"
                      onClick={() => {
                        setCadSelectedNode(null);
                        setCadTool('ADD_LINE');
                        setCadAnchorNode({ x: cadSelectedNode.x, y: cadSelectedNode.y });
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
                    <button 
                      className="w-full text-left px-3 py-2 text-xs font-black text-emerald-400 hover:bg-slate-700 hover:text-emerald-300 rounded-lg transition-colors border-t border-slate-700 mt-1 pt-3"
                      onClick={(e) => {
                        e.preventDefault();
                        setCadPrompt({ type: 'NEW_SURVEY', x: window.innerWidth / 2 - 140, y: window.innerHeight - 200, node: cadSelectedNode });
                        setCadSelectedNode(null);
                      }}
                    >
                      New Survey
                    </button>
                  </div>
                  );
                })()}

                {((isEditingLineMode && cadSelectedLine && !isLineMoving) || (cadSelectedCircle && !cadEditInputs.isMovingLine)) && (() => {
                   let target = null; let tType = ''; let midSvgX=0; let midSvgY=0;
                   if (cadSelectedLine) { target = cadLines.find(x => x.id === cadSelectedLine); tType='LINE'; if(target){ midSvgX = (target.p1.x + target.p2.x)/2; midSvgY = (target.p1.y + target.p2.y)/2; } }
                   if (cadSelectedCircle) { target = cadCircles.find(x => x.id === cadSelectedCircle); tType='CIRCLE'; if(target){ midSvgX = target.center.x; midSvgY = target.center.y - target.radiusPixels; } }
                   if (!target) return null;
                   const ctCoords = getSvgPtToContainer(midSvgX, midSvgY);
                   return (
                     <div 
                       className="absolute bottom-6 left-1/2 z-[110] bg-slate-800 p-4 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-slate-600 flex flex-col gap-3 min-w-[14rem] animate-in slide-in-from-bottom-6" 
                       style={{ transform: `translate(calc(-50% + ${cadPopupOffset.x}px), ${cadPopupOffset.y}px) scale(${cadPopupScale})`, transformOrigin: 'bottom center' }}
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
                          <button onClick={() => { setCadSelectedLine(null); setCadSelectedCircle(null); setCadPopupOffset({x:0, y:0}); setIsLineMoving(false); setIsEditingLineMode(false); setCadTool('IDLE'); }} className="text-xs font-black text-slate-400 hover:text-white">✕</button>
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
                       <div className="flex flex-row gap-2 mt-2 w-full">
                         <button onClick={handleCadEditSave} className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-1.5 rounded text-[10px] transition-colors">SAVE</button>
                         <button onClick={handleCadEditDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 rounded text-[10px] transition-colors">{tType === 'LINE' ? 'DELETE LINE' : 'DELETE RADIUS'}</button>
                       </div>
                       <div onPointerDown={handlePopupResizeDown} className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1.5 text-slate-500 hover:text-white transition-colors opacity-70"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 0L10 10L0 10L10 0Z" /></svg></div>
                     </div>
                   );
                 })()}

                 {typeof cadSelectedText !== 'undefined' && cadSelectedText && !cadEditInputs.isMovingText && (() => {
                   const txt = cadTexts.find(t => t.id === cadSelectedText);
                   if (!txt) return null;
                   const ctCoords = getSvgPtToContainer(txt.x, txt.y);
                   const polyId = txt.id.startsWith('poly-') ? txt.id.replace('poly-', '') : null;
                   const poly = polyId ? cadPolygons.find(p => p.id === polyId) : null;
                   const polySurvey = (poly && poly.surveyId) ? cadSurveys.find(s => s.id === poly.surveyId) : null;

                   return (
                     <div 
                       className="absolute z-[110] bg-slate-800 p-3 rounded-xl shadow-2xl border border-slate-600 flex flex-col gap-2.5 w-44 animate-in slide-in-from-bottom-2" 
                       style={{ left: Math.min(ctCoords.left + cadPopupOffset.x, window.innerWidth - 190), top: Math.max(ctCoords.top - 180 + cadPopupOffset.y, 20), transform: `scale(${cadPopupScale})`, transformOrigin: 'top left' }}
                       onClick={e => e.stopPropagation()}
                       onPointerDown={e => e.stopPropagation()}
                     >
                       <div 
                         className="flex justify-between items-center cursor-move bg-slate-700 -mx-3 -mt-3 p-2 rounded-t-xl"
                         onPointerDown={e => { e.stopPropagation(); e.target.setPointerCapture(e.pointerId); e.target.dataset.dragStart = JSON.stringify({x: e.clientX, y: e.clientY, ox: cadPopupOffset.x, oy: cadPopupOffset.y}); }}
                         onPointerMove={e => {
                           if (e.target.hasPointerCapture(e.pointerId) && e.target.dataset.dragStart) {
                             const start = JSON.parse(e.target.dataset.dragStart);
                             setCadPopupOffset({ x: start.ox + (e.clientX - start.x), y: start.oy + (e.clientY - start.y) });
                           }
                         }}
                         onPointerUp={e => { e.target.releasePointerCapture(e.pointerId); delete e.target.dataset.dragStart; }}
                       >
                          <span className="text-[11px] font-bold text-slate-300 pointer-events-none px-1">EDIT TEXT</span>
                          <button onClick={() => { setCadSelectedText(null); setCadPopupOffset({x:0, y:0}); }} className="text-xs font-black text-slate-400 hover:text-white px-1">✕</button>
                       </div>
                       
                       <div className="flex gap-1.5 w-full mt-1">
                           <input type="text" value={txt.text} onChange={e => setCadTexts(prev => prev.map(t => t.id === txt.id ? {...t, text: e.target.value} : t))} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs min-w-0 flex-1" />
                           <button onClick={(e) => {
                               e.stopPropagation();
                               if (polySurvey) {
                                   const parts = txt.text.split('/');
                                   const newSurveyNo = parts[0]?.trim() || '';
                                   const newSubDivNo = parts[1]?.trim() || '';
                                   setCadSurveys(prev => prev.map(s => s.id === polySurvey.id ? { ...s, surveyNo: newSurveyNo, subDivisionNo: newSubDivNo } : s));
                               }
                               setCadSelectedText(null);
                               setCadPopupOffset({x:0, y:0});
                           }} className="bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-1.5 rounded text-[10px] transition-colors shrink-0">OK</button>
                       </div>

                       <div className="flex flex-col gap-2 w-full mt-1">
                           <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-500 uppercase font-bold w-6">Size</span>
                              <input type="range" min="10" max={200} value={txt.fontSize || 40} onChange={e => setCadTexts(prev => prev.map(t => t.id === txt.id ? {...t, fontSize: parseInt(e.target.value)} : t))} className="accent-fuchsia-500 flex-1 min-w-0" />
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-500 uppercase font-bold w-6">Rot</span>
                              <input type="range" min="0" max="360" value={txt.rotation || 0} onChange={e => setCadTexts(prev => prev.map(t => t.id === txt.id ? {...t, rotation: parseInt(e.target.value)} : t))} className="accent-fuchsia-500 flex-1 min-w-0" />
                           </div>
                       </div>

                       <div className="flex flex-row items-center justify-between gap-2 mt-1 bg-slate-900/50 p-2 rounded border border-slate-700/50">
                           <div className="flex flex-col items-center gap-1 flex-1">
                               <span className="text-[9px] font-bold text-slate-400 uppercase">Fill Color</span>
                               <input type="color" value={txt.hexColor || '#ffffff'} onChange={(e) => setCadTexts(prev => prev.map(t => t.id === txt.id ? {...t, hexColor: e.target.value} : t))} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                           </div>
                           {polySurvey && (
                               <div className="flex flex-col items-center gap-1 flex-1 border-l border-slate-700/50 pl-2">
                                   <span className="text-[9px] font-bold text-slate-400 uppercase">Border</span>
                                   <input type="color" value={polySurvey.hexColor || '#38bdf8'} onChange={(e) => setCadSurveys(prev => prev.map(s => s.id === polySurvey.id ? {...s, hexColor: e.target.value} : s))} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                               </div>
                           )}
                       </div>

                       <div className="flex flex-row gap-2 w-full mt-1">
                         <button onClick={(e) => { e.stopPropagation(); setCadEditInputs(p => ({ ...p, isMovingText: true })); setCadSelectedText(null); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-1.5 rounded text-[10px] transition-colors">MOVE</button>
                         <button onClick={() => { setCadTexts(prev => prev.filter(t => t.id !== txt.id)); setCadSelectedText(null); }} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 rounded text-[10px] transition-colors">DEL</button>
                       </div>
                       <div onPointerDown={handlePopupResizeDown} className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1.5 text-slate-500 hover:text-white transition-colors opacity-70"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 0L10 10L0 10L10 0Z" /></svg></div>
                     </div>
                   );
                 })()}

                 

                 {typeof cadSelectedMetric !== 'undefined' && cadSelectedMetric && (() => {
                   const line = cadLines.find(l => l.id === cadSelectedMetric);
                   if (!line || !line.fixedLength || !isMetricsVisible) return null;
                   const offset = cadMetricOffsets[line.id] || getMetricDefaultOffset(line);
                   const mx = (line.p1.x + line.p2.x) / 2 + offset.dx;
                   const my = (line.p1.y + line.p2.y) / 2 + offset.dy;
                   const ctCoords = getSvgPtToContainer(mx, my);
                   return (
                     <div 
                       className="absolute z-[110] bg-slate-800 p-4 rounded-xl shadow-2xl border border-slate-600 flex flex-col gap-3 min-w-[14rem] animate-in slide-in-from-bottom-2" 
                       style={{ left: Math.min(ctCoords.left + 80 + cadPopupOffset.x, window.innerWidth - 250), top: Math.max(ctCoords.top - 80 + cadPopupOffset.y, 20), transform: `scale(${cadPopupScale})`, transformOrigin: 'top left' }}
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
                          <div className="flex items-center justify-between">
                             <span className="text-[10px] text-slate-500 uppercase">Font Size</span>
                             <input 
                               type="number" min="10" max="200" 
                               value={line.metricFontSize || 40} 
                               onChange={e => setCadLines(prev => prev.map(l => l.id === line.id ? {...l, metricFontSize: parseInt(e.target.value) || 40} : l))} 
                               className="w-14 bg-slate-700 text-white text-[10px] text-center rounded border border-slate-600 focus:outline-none focus:border-fuchsia-500 py-0.5" 
                             />
                          </div>
                          <input type="range" min="10" max="200" value={line.metricFontSize || 40} onChange={e => setCadLines(prev => prev.map(l => l.id === line.id ? {...l, metricFontSize: parseInt(e.target.value)} : l))} className="accent-fuchsia-500" />
                       </div>
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 uppercase">Rotation: {Math.round(line.metricRotation || 0)}°</span>
                          <input type="range" min="0" max="360" value={line.metricRotation || 0} onChange={e => setCadLines(prev => prev.map(l => l.id === line.id ? {...l, metricRotation: parseInt(e.target.value)} : l))} className="accent-fuchsia-500" />
                       </div>
                       <div className="flex gap-2">
                          <div className="flex-1 flex flex-col gap-1">
                             <span className="text-[10px] text-slate-500 uppercase text-center">Fill Color</span>
                             <input type="color" value={line.metricHexColor || '#38bdf8'} onChange={e => setCadLines(prev => prev.map(l => l.id === line.id ? {...l, metricHexColor: e.target.value} : l))} className="w-full h-8 cursor-pointer rounded bg-transparent p-0 border-0" />
                          </div>
                          <div className="flex-1 flex flex-col gap-1">
                             <span className="text-[10px] text-slate-500 uppercase text-center">Border Color</span>
                             <input type="color" value={line.metricStrokeColor || '#transparent'} onChange={e => setCadLines(prev => prev.map(l => l.id === line.id ? {...l, metricStrokeColor: e.target.value} : l))} className="w-full h-8 cursor-pointer rounded bg-transparent p-0 border-0" />
                          </div>
                       </div>

                       <div className="flex flex-row gap-2 mt-2 w-full">
                         <button onClick={(e) => { e.stopPropagation(); setCadEditInputs(p => ({ ...p, isMovingMetric: true })); setCadSelectedMetric(null); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-1.5 rounded text-[10px] transition-colors">
                           MOVE
                         </button>
                         <button onClick={() => { 
                            setCadLines(prev => prev.map(l => l.id === line.id ? {...l, fixedLength: null} : l));
                            setCadSelectedMetric(null); 
                         }} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 rounded text-[10px] transition-colors">DEL</button>
                       </div>
                       <div onPointerDown={handlePopupResizeDown} className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1.5 text-slate-500 hover:text-white transition-colors opacity-70"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 0L10 10L0 10L10 0Z" /></svg></div>
                     </div>
                   );
                 })()}


            {cadComputedArea ? (
               isPolygonAreaCardVisible ? (
                <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className="absolute bottom-8 left-8 z-[120] bg-slate-900/90 p-3 rounded-xl shadow-2xl border border-slate-700 w-max flex flex-col pointer-events-auto animate-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1 gap-4">
                     <span className="text-[10px] text-fuchsia-400 font-black uppercase tracking-widest">Polygon Area</span>
                     <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsPolygonAreaCardVisible(false); }} className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-slate-800" title="Minimize">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                     </button>
                  </div>
                  <div className="font-mono text-xs text-white grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 whitespace-nowrap pointer-events-none">
                    <span className="text-slate-400 text-left">Hectare:</span><span className="font-bold text-right">{cadComputedArea.hectare.toFixed(4)}</span>
                    <span className="text-slate-400 text-left">Are:</span><span className="font-bold text-right">{cadComputedArea.are.toFixed(4)}</span>
                    <span className="text-slate-400 text-left">Acre:</span><span className="font-bold text-right">{cadComputedArea.acre.toFixed(4)}</span>
                    <span className="text-slate-400 text-left">Cent:</span><span className="font-bold text-right">{cadComputedArea.cent.toFixed(2)}</span>
                    <span className="text-slate-400 text-left">Sq. Ft:</span><span className="font-bold text-right">{cadComputedArea.sqFt.toFixed(2)}</span>
                  </div>
                </div>
               ) : (
                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsPolygonAreaCardVisible(true); }} className="absolute bottom-8 left-8 z-[120] bg-slate-900/90 p-3 rounded-xl shadow-2xl border border-slate-700 text-fuchsia-400 hover:text-fuchsia-300 pointer-events-auto flex items-center justify-center animate-in zoom-in-75 hover:bg-slate-800 transition-colors" title="Restore Polygon Area">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>
               )
             ) : (
                cadLines.length >= 3 && cadOpenNodes && cadOpenNodes.length > 0 && (
                  <div className="absolute bottom-8 left-8 z-[120] animate-in slide-in-from-bottom-4">
                   <button 
                     onPointerDown={(e) => { e.stopPropagation(); }}
                     onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const errNode = cadOpenNodes[0];
                        setCadViewport({ x: errNode.x - 125, y: errNode.y - 125, width: 250, height: 250 });
                     }}
                     className="bg-red-600/90 hover:bg-red-500 text-white font-black text-xs px-4 py-2 rounded-full shadow-[0_0_15px_rgba(255,0,51,0.5)] border border-red-400 animate-pulse uppercase tracking-widest transition-all flex items-center gap-2 backdrop-blur-sm"
                   >
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                     Fix Error
                   </button>
                  </div>
                )
             )}
             
            {/* VIRTUAL JOYSTICK D-PAD */}
            <div className="absolute bottom-8 right-8 z-[120] opacity-80 hover:opacity-100 transition-opacity bg-slate-800 rounded-full border-4 border-slate-700 shadow-2xl p-2 select-none touch-none scale-75 origin-bottom-right"
                 onPointerDown={e => e.stopPropagation()}
            >
               <div className="flex flex-col items-center gap-1">
                  {/* Top Button: ADD LINE TRIGGER */}
                  <button 
                     className={`w-10 h-10 rounded-full flex justify-center items-center font-bold text-xl transition-colors ${cadTool === 'ADD_LINE' ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white active:bg-fuchsia-600'}`}
                     onClick={() => { 
                        if (cadTool === 'ADD_LINE') {
                           setCadTool('IDLE');
                           setCadAnchorNode(null);
                        } else {
                           setCadTool('ADD_LINE');
                           setCadAnchorNode({ x: cadViewport.x + cadViewport.width / 2, y: cadViewport.y + cadViewport.height / 2, isInitialCenter: true });
                        }
                        setCadSelectedNode(null); 
                     }}
                     title="Add Line"
                  >
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                     </svg>
                  </button>
                  
                  <div className="flex gap-1">
                     {/* Left Button: GPS */}
                     <button 
                        className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex justify-center items-center font-bold transition-colors"
                        title="GPS"
                     >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                           <text x="12" y="16" fontSize="10" fontWeight="900" textAnchor="middle" fill="currentColor" stroke="none">GPS</text>
                        </svg>
                     </button>
                     
                     {/* Center Axis Button: Reset Origin */}
                     <button 
                        className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-fuchsia-400 border border-slate-600 flex justify-center items-center font-bold text-xl transition-colors"
                        onClick={() => setCadViewport({ x: 0, y: 0, width: 2000, height: 2000 })}
                        title="Reset Origin"
                     >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></svg>
                     </button>
                     
                     {/* Right Button: METRIC INSTANT TOGGLE */}
                     <button 
                        className={`w-10 h-10 rounded-full flex justify-center items-center transition-colors bg-slate-700 hover:bg-slate-600 text-white active:bg-fuchsia-600`}
                        onClick={() => setIsGlobalMetricFeet(p => !p)}
                        title="Toggle Metric Units (m/ft)"
                     >
                        <span className="font-bold text-lg font-mono leading-none tracking-tight">
                           {isGlobalMetricFeet ? 'ft' : 'm'}
                        </span>
                     </button>
                  </div>
                  
                  {/* Bottom Button: Map Layers */}
                  <button 
                     className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex justify-center items-center font-bold transition-colors"
                     title="Map Layers"
                  >
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                        <polyline points="2 12 12 17 22 12"/>
                        <polyline points="2 17 12 22 22 17"/>
                     </svg>
                  </button>
               </div>
            </div>
{cadPrompt && (() => {
                  let l = cadPrompt.x;
                  let t = cadPrompt.y;
                  if (l + 200 > window.innerWidth) l = cadPrompt.x - 200; // Flip left
                  if (t < 50) t = cadPrompt.y + 50; // Flip down
                  if (cadPrompt.type === 'FIRST_SURVEY' || cadPrompt.type === 'NEW_SURVEY') {
                        return (
                            <form 
                                onSubmit={submitCadPrompt}
                                className="absolute bottom-8 left-8 z-[120] bg-slate-900/90 p-3 rounded-xl shadow-2xl border border-slate-700 w-[180px] flex flex-col gap-1.5 pointer-events-auto animate-in slide-in-from-bottom-4" 
                                onClick={e => e.stopPropagation()}
                                onPointerDown={e => e.stopPropagation()}
                            >
                                <div className="text-[10px] text-fuchsia-400 font-black uppercase tracking-widest border-b border-slate-700 pb-1 mb-1 text-center">
                                    {cadPrompt.type === 'FIRST_SURVEY' ? 'Survey Attributes' : 'New Survey'}
                                </div>
                                <div className="flex flex-row items-center justify-between gap-2">
                                      <label className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Metric</label>
                                      <div className="flex items-center w-[90px] gap-1">
                                          <input type="number" step="0.01" value={cadPromptValue} onChange={e => setCadPromptValue(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white w-full text-[10px] font-bold outline-none focus:border-sky-500 text-right" placeholder="0.00" required={!!cadPrompt.targetId} />
                                          <select value={cadPromptUnit} onChange={e => setCadPromptUnit(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-white text-[9px] font-bold outline-none focus:border-sky-500 cursor-pointer appearance-none">
                                              <option value="meters">▼ M</option>
                                              <option value="feet">▼ Ft</option>
                                          </select>
                                      </div>
                                  </div>
                                <div className="flex flex-row items-center justify-between gap-2">
                                    <label className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Survey No.</label>
                                    <input autoFocus type="text" value={cadPromptSurveyNo} onChange={e => setCadPromptSurveyNo(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white w-[90px] text-[10px] font-bold outline-none focus:border-sky-500 text-right" placeholder="e.g. 101" required />
                                </div>
                                <div className="flex flex-row items-center justify-between gap-2">
                                    <label className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Sub-div</label>
                                    <input type="text" value={cadPromptSubDiv} onChange={e => setCadPromptSubDiv(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white w-[90px] text-[10px] font-bold outline-none focus:border-sky-500 text-right" placeholder="Opt." />
                                </div>
                                {cadPrompt.type === 'NEW_SURVEY' && (
                                    <div className="flex flex-row items-center justify-between gap-2">
                                        <label className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Color</label>
                                        <input type="color" value={cadPromptColor} onChange={e => setCadPromptColor(e.target.value)} className="w-[90px] h-5 cursor-pointer rounded border border-slate-600 bg-slate-800 p-0 outline-none focus:border-sky-500" />
                                    </div>
                                )}
                                <button type="submit" className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-1 mt-1 rounded text-[10px] uppercase tracking-wider transition-colors w-full outline-none">OK</button>
                            </form>
                        );
                    }

                  return (
                  <form 
                    onSubmit={submitCadPrompt}
                    className="absolute z-[120] bg-slate-800 p-3 rounded-xl shadow-2xl border border-slate-600 flex gap-2 animate-in fade-in" 
                    style={{ left: Math.max(10, l), top: Math.max(10, t) }}
                    onClick={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                  >
                    <input autoFocus type={cadPrompt.type === "TEXT" ? "text" : "number"} step="0.01" value={cadPromptValue} onChange={e => setCadPromptValue(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-white w-24 text-sm font-bold text-center" placeholder={cadPrompt.type === "TEXT" ? "Enter text..." : "Metric (m)"} />
                    <button type="submit" className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-2 px-4 rounded text-sm transition-colors">OK</button>
                  </form>
                  );
                 })()}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
