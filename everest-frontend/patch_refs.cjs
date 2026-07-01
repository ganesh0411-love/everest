const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

// 1. Replace cadPolygons and add visibleCadLines
const cadPolyStart = content.indexOf('  const cadPolygons = React.useMemo(() => {');
const cadPolyEndStr = '  }, [visibleCadLines]);\n';
const cadPolyEnd = content.indexOf(cadPolyEndStr, cadPolyStart) + cadPolyEndStr.length;

if (cadPolyStart === -1 || cadPolyEnd === -1) {
    console.log('Failed to find cadPolygons block');
    process.exit(1);
}

const newCadPolygonsAndLines = `  const cadPolygons = React.useMemo(() => {
    if (cadLines.length < 3) return [];

    const nodesMap = new Map();
    const getOrAddNode = (x, y) => {
       const key = \`\${x.toFixed(3)},\${y.toFixed(3)}\`;
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
                let newestIdx = -1;
                let polySurveyId = null;
                faceEdges.forEach(edge => {
                    const lnIdx = cadLines.findIndex(l => 
                        (Math.hypot(l.p1.x - edge.from.x, l.p1.y - edge.from.y) < 1e-3 && Math.hypot(l.p2.x - edge.to.x, l.p2.y - edge.to.y) < 1e-3) ||
                        (Math.hypot(l.p2.x - edge.from.x, l.p2.y - edge.from.y) < 1e-3 && Math.hypot(l.p1.x - edge.to.x, l.p1.y - edge.to.y) < 1e-3)
                    );
                    if (lnIdx > newestIdx) {
                        newestIdx = lnIdx;
                        polySurveyId = cadLines[lnIdx].surveyId;
                    }
                });
                faces.push({ id: \`poly_\${faceId++}\`, pts, area: Math.abs(area), surveyId: polySurveyId, faceEdges });
            }
        }
    });
    return faces;
  }, [cadLines]);

  const visibleCadLines = React.useMemo(() => {
    const visibleSurveyIds = new Set(cadSurveys.filter(s => s.isVisible).map(s => s.id));
    const visiblePolyEdges = new Set();
    
    cadPolygons.forEach(p => {
       if (visibleSurveyIds.has(p.surveyId)) {
          p.faceEdges.forEach(edge => {
             const k1 = \`\${edge.from.x.toFixed(3)},\${edge.from.y.toFixed(3)}->\${edge.to.x.toFixed(3)},\${edge.to.y.toFixed(3)}\`;
             const k2 = \`\${edge.to.x.toFixed(3)},\${edge.to.y.toFixed(3)}->\${edge.from.x.toFixed(3)},\${edge.from.y.toFixed(3)}\`;
             visiblePolyEdges.add(k1);
             visiblePolyEdges.add(k2);
          });
       }
    });

    return cadLines.filter(l => {
      if (!l.surveyId) return true;
      if (visibleSurveyIds.has(l.surveyId)) return true;
      
      const lk1 = \`\${l.p1.x.toFixed(3)},\${l.p1.y.toFixed(3)}->\${l.p2.x.toFixed(3)},\${l.p2.y.toFixed(3)}\`;
      const lk2 = \`\${l.p2.x.toFixed(3)},\${l.p2.y.toFixed(3)}->\${l.p1.x.toFixed(3)},\${l.p1.y.toFixed(3)}\`;
      return visiblePolyEdges.has(lk1) || visiblePolyEdges.has(lk2);
    });
  }, [cadLines, cadSurveys, cadPolygons]);
`;

content = content.substring(0, cadPolyStart) + newCadPolygonsAndLines + content.substring(cadPolyEnd);


// 2. Add visibleCadPolygons before cadComputedArea and modify cadComputedArea
const cadAreaStart = content.indexOf('  const cadComputedArea = React.useMemo(() => {');
const cadAreaEndStr = '  }, [cadLines, cadScale, cadPolygons, cadSelectedPolygon]);\n';
const cadAreaEnd = content.indexOf(cadAreaEndStr, cadAreaStart) + cadAreaEndStr.length;

if (cadAreaStart === -1 || cadAreaEnd === -1) {
    console.log('Failed to find cadComputedArea block');
    process.exit(1);
}

const newCadArea = `  const visibleCadPolygons = React.useMemo(() => {
    return cadPolygons.filter(p => {
       if (!p.surveyId) return true;
       const s = cadSurveys.find(s => s.id === p.surveyId);
       return s ? s.isVisible : true;
    });
  }, [cadPolygons, cadSurveys]);

  const cadComputedArea = React.useMemo(() => {
    if (!cadScale || cadLines.length < 3 || visibleCadPolygons.length === 0) return null;
    
    let areaPixels = 0;
    if (cadSelectedPolygon) {
        const poly = visibleCadPolygons.find(p => p.id === cadSelectedPolygon);
        if (poly) areaPixels = poly.area;
    } else {
        const poly = visibleCadPolygons.find(p => {
            const centroid = p.pts.reduce((acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }), { x: 0, y: 0 });
            centroid.x /= p.pts.length;
            centroid.y /= p.pts.length;
            const centerNode = cadNodes.find(n => Math.hypot(n.x - centroid.x, n.y - centroid.y) < 20);
            return !!centerNode;
        });
        if (poly) areaPixels = poly.area;
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
  }, [cadLines, cadScale, visibleCadPolygons, cadSelectedPolygon, cadNodes]);
`;

content = content.substring(0, cadAreaStart) + newCadArea + content.substring(cadAreaEnd);

// 3. Fix the rendering to use visibleCadPolygons
const renderPolyStartStr = '                  {cadPolygons.map(p => {';
const renderPolyStart = content.indexOf(renderPolyStartStr);
if (renderPolyStart !== -1) {
    const renderPolyEndStr = '                  })}';
    const renderPolyEnd = content.indexOf(renderPolyEndStr, renderPolyStart) + renderPolyEndStr.length;
    
    const newRenderPoly = `                  {visibleCadPolygons.map(p => {
                    const isSelected = cadSelectedPolygon === p.id;
                    const polySurvey = p.surveyId ? cadSurveys.find(s => s.id === p.surveyId) : null;
                    const baseColor = polySurvey ? polySurvey.hexColor : '#38bdf8';
                    const fillColor = isSelected ? baseColor + '80' : baseColor + '26';
                    return (
                        <polygon
                            key={p.id}
                            points={p.pts.map(pt => \`\${pt.x},\${pt.y}\`).join(' ')}
                            fill={fillColor}
                            stroke={isSelected ? baseColor : "rgba(255,255,255,0.1)"}
                            strokeWidth={cadViewport.width * 0.001}
                            style={{ pointerEvents: 'none' }} 
                        />
                    );
                  })}`;
    content = content.substring(0, renderPolyStart) + newRenderPoly + content.substring(renderPolyEnd);
} else {
    const altRenderStart = content.indexOf('                  {cadPolygons.filter(p => {');
    if (altRenderStart !== -1) {
        const altRenderEndStr = '                  })}';
        const altRenderEnd = content.indexOf(altRenderEndStr, altRenderStart) + altRenderEndStr.length;
        const newRenderPoly = `                  {visibleCadPolygons.map(p => {
                    const isSelected = cadSelectedPolygon === p.id;
                    const polySurvey = p.surveyId ? cadSurveys.find(s => s.id === p.surveyId) : null;
                    const baseColor = polySurvey ? polySurvey.hexColor : '#38bdf8';
                    const fillColor = isSelected ? baseColor + '80' : baseColor + '26';
                    return (
                        <polygon
                            key={p.id}
                            points={p.pts.map(pt => \`\${pt.x},\${pt.y}\`).join(' ')}
                            fill={fillColor}
                            stroke={isSelected ? baseColor : "rgba(255,255,255,0.1)"}
                            strokeWidth={cadViewport.width * 0.001}
                            style={{ pointerEvents: 'none' }} 
                        />
                    );
                  })}`;
        content = content.substring(0, altRenderStart) + newRenderPoly + content.substring(altRenderEnd);
    }
}

// 4. Update the line rendering loop to use visibleCadLines
const renderLinesStartStr = '                    return cadLines.map(l => {';
const renderLinesStart = content.indexOf(renderLinesStartStr);
if (renderLinesStart !== -1) {
    const renderLinesEndStr = '                    });';
    const renderLinesEnd = content.indexOf(renderLinesEndStr, renderLinesStart) + renderLinesEndStr.length;
    const newRenderLines = `                    return visibleCadLines.map(l => {
                      const isSelected = cadSelectedLine === l.id;
                      const lineSurvey = l.surveyId ? cadSurveys.find(s => s.id === l.surveyId) : null;
                      const lineColor = lineSurvey ? lineSurvey.hexColor : '#3b82f6';
                      return (
                          <line
                              key={l.id}
                              x1={l.p1.x} y1={l.p1.y} x2={l.p2.x} y2={l.p2.y}
                              stroke={isSelected ? '#f472b6' : lineColor}
                              strokeWidth={isSelected ? cadViewport.width * 0.003 : cadViewport.width * 0.001}
                              style={{ pointerEvents: 'none' }} 
                          />
                      );
                    });`;
    content = content.substring(0, renderLinesStart) + newRenderLines + content.substring(renderLinesEnd);
}


fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
console.log('Successfully patched all dependencies.');
