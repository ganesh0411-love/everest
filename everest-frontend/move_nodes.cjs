const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const startStr = '  const cadNodes = React.useMemo(() => {';
const startIdx = content.indexOf(startStr);

const endStr = '  }, [visibleCadLines, cadCircles]);\n';
const endIdx = content.indexOf(endStr, startIdx) + endStr.length;

const cadNodesBlock = content.substring(startIdx, endIdx);

let newContent = content.substring(0, startIdx) + content.substring(endIdx);

const targetStr = '  const cadComputedArea = React.useMemo(() => {';
const insertIdx = newContent.indexOf(targetStr);

if (insertIdx === -1) {
    console.log('Error: targetStr not found.');
    process.exit(1);
}

newContent = newContent.substring(0, insertIdx) + cadNodesBlock + '\n' + newContent.substring(insertIdx);

fs.writeFileSync('src/components/AdminDashboard.jsx', newContent, 'utf-8');
console.log('Moved cadNodes successfully!');
