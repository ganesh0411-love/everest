const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

// Patch cadNodes Type B intersections
let newContent = content.replace(
    /\/\/ Intersections between lines and circles \(Type B\)\s*for \(let i = 0; i < cadLines\.length; i\+\+\) \{\s*for \(let j = 0; j < cadCircles\.length; j\+\+\) \{\s*const l = cadLines\[i\];/gm,
    `// Intersections between lines and circles (Type B)
      for (let i = 0; i < visibleCadLines.length; i++) {
          for (let j = 0; j < cadCircles.length; j++) {
              const l = visibleCadLines[i];`
);

// Patch cadNodes Type C intersections (Intersections between lines)
newContent = newContent.replace(
    /\/\/ Intersections between lines\s*for \(let i = 0; i < cadLines\.length; i\+\+\) \{\s*for \(let j = i \+ 1; j < cadLines\.length; j\+\+\) \{\s*const l1 = cadLines\[i\]; const l2 = cadLines\[j\];/gm,
    `// Intersections between lines
      for (let i = 0; i < visibleCadLines.length; i++) {
        for (let j = i + 1; j < visibleCadLines.length; j++) {
          const l1 = visibleCadLines[i]; const l2 = visibleCadLines[j];`
);

// Patch cadOpenNodes
newContent = newContent.replace(
    /const cadOpenNodes = React\.useMemo\(\(\) => \{\s*if \(cadLines\.length < 3\) return \[\];\s*const adj = new Map\(\);\s*cadLines\.forEach\(l => \{/gm,
    `const cadOpenNodes = React.useMemo(() => {
      if (visibleCadLines.length < 3) return [];
      const adj = new Map();
      visibleCadLines.forEach(l => {`
);

// Change the dependency array for cadOpenNodes
newContent = newContent.replace(
    /return open;\s*\}, \[cadLines\]\);/gm,
    `return open;
    }, [visibleCadLines]);`
);

if (content !== newContent) {
    fs.writeFileSync('src/components/AdminDashboard.jsx', newContent, 'utf-8');
    console.log("Replacement successful.");
} else {
    console.log("Replacement failed, no changes made.");
}
