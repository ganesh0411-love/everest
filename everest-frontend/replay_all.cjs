const fs = require('fs');

const edits = JSON.parse(fs.readFileSync('edits.json', 'utf8'));
const targetPath = 'src/components/AdminDashboard.jsx';
let fileContent = fs.readFileSync(targetPath, 'utf8').replace(/\r\n/g, '\n');

let count = 0;
for (let e of edits) {
    if (e.name.includes('write_to_file') && e.args.CodeContent) {
        fileContent = e.args.CodeContent.replace(/\r\n/g, '\n');
        count++;
    } else if (e.name.includes('replace_file_content') && e.args.TargetContent && e.args.ReplacementContent) {
        let tc = e.args.TargetContent.replace(/\r\n/g, '\n');
        let rep = e.args.ReplacementContent.replace(/\r\n/g, '\n');
        if (fileContent.includes(tc)) {
            fileContent = fileContent.replace(tc, rep);
            count++;
        } else {
            console.error('Failed to find TargetContent at step ' + e.step);
        }
    } else if (e.name.includes('multi_replace_file_content') && e.args.ReplacementChunks) {
        let chunks = typeof e.args.ReplacementChunks === 'string' ? JSON.parse(e.args.ReplacementChunks) : e.args.ReplacementChunks;
        for (let chunk of chunks) {
            let tc = chunk.TargetContent.replace(/\r\n/g, '\n');
            let rep = chunk.ReplacementContent.replace(/\r\n/g, '\n');
            if (fileContent.includes(tc)) {
                fileContent = fileContent.replace(tc, rep);
                count++;
            } else {
                console.error('Failed to find Chunk TargetContent at step ' + e.step);
            }
        }
    }
}

fs.writeFileSync(targetPath, fileContent, 'utf8');
console.log('Applied ' + count + ' edits. Length is now ' + fileContent.split('\n').length);
