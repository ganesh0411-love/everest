const fs = require('fs');

const edits = JSON.parse(fs.readFileSync('../all_edits_clean.json', 'utf8'));
const targetPath = 'c:/Users/DELL/Desktop/Everest/everest-frontend/src/components/AdminDashboard.jsx';
let fileContent = fs.readFileSync(targetPath, 'utf8').replace(/\r\n/g, '\n');

let count = 0;
for (let e of edits) {
    try {
        if (e.name === 'write_to_file' && e.code) {
            if (!e.code.includes('<truncated')) {
                fileContent = e.code.replace(/\r\n/g, '\n');
                count++;
            }
        } else if (e.name === 'replace_file_content' && e.tc && e.rep) {
            let tc = e.tc.replace(/\r\n/g, '\n');
            let rep = e.rep.replace(/\r\n/g, '\n');
            if (!rep.includes('<truncated') && fileContent.includes(tc)) {
                fileContent = fileContent.replace(tc, rep);
                count++;
            }
        } else if (e.name === 'multi_replace_file_content' && e.chunks) {
            if (e.chunks.includes('<truncated')) continue;
            let chunks = typeof e.chunks === 'string' ? JSON.parse(e.chunks) : e.chunks;
            for (let chunk of chunks) {
                let tc = (chunk.TargetContent || '').replace(/\r\n/g, '\n');
                let rep = (chunk.ReplacementContent || '').replace(/\r\n/g, '\n');
                if (tc && fileContent.includes(tc)) {
                    fileContent = fileContent.replace(tc, rep);
                    count++;
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
}

fs.writeFileSync(targetPath, fileContent, 'utf8');
console.log('Replayed ' + count + ' successful chunks!');
