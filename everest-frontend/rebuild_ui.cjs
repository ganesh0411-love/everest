const fs = require('fs');

const edits = JSON.parse(fs.readFileSync('ui_codes_full.json', 'utf8'));
const targetPath = 'src/components/AdminDashboard.jsx';

// Start from fresh git checkout of AdminDashboard.jsx
require('child_process').execSync('git checkout ' + targetPath);
let fileContent = fs.readFileSync(targetPath, 'utf8').replace(/\r\n/g, '\n');

let appliedCount = 0;
for (let e of edits) {
    if (e.step_index >= 16964) continue; // Skip edits from Task 52
    
    try {
        if (e.name === 'write_to_file' && e.args.CodeContent) {
            fileContent = e.args.CodeContent.replace(/\r\n/g, '\n');
            appliedCount++;
        } else if (e.name === 'replace_file_content' && e.args.TargetContent && e.args.ReplacementContent) {
            let tc = e.args.TargetContent.replace(/\r\n/g, '\n');
            let rep = e.args.ReplacementContent.replace(/\r\n/g, '\n');
            if (fileContent.includes(tc)) {
                fileContent = fileContent.replace(tc, rep);
                appliedCount++;
            }
        } else if (e.name === 'multi_replace_file_content' && e.args.ReplacementChunks) {
            let chunks = typeof e.args.ReplacementChunks === 'string' ? JSON.parse(e.args.ReplacementChunks) : e.args.ReplacementChunks;
            for (let chunk of chunks) {
                let tc = (chunk.TargetContent || '').replace(/\r\n/g, '\n');
                let rep = (chunk.ReplacementContent || '').replace(/\r\n/g, '\n');
                if (tc && fileContent.includes(tc)) {
                    fileContent = fileContent.replace(tc, rep);
                    appliedCount++;
                }
            }
        }
    } catch (err) {
        console.error("Error at step: " + e.step_index, err);
    }
}

fs.writeFileSync(targetPath, fileContent, 'utf8');
console.log('Applied ' + appliedCount + ' edits to recreate state before Task 52!');
