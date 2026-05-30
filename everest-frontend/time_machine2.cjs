const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\b709ca33-fff3-44d8-987f-ff564be64dc3\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf8').split('\n');

let req7Idx = 6462;

for (let i = 5694; i < req7Idx; i++) {
    if (!lines[i]) continue;
    let obj;
    try { obj = JSON.parse(lines[i]); } catch(e){ continue; }
    if (obj.tool_calls) {
        for (const call of obj.tool_calls) {
            if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
                let args;
                try {
                    args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
                } catch(e){ continue; }
                
                let targetFile = args.TargetFile;
                if (!targetFile) continue;
                targetFile = targetFile.replace(/^\"|\"$/g, '').replace(/\\\\/g, '\\').replace(/\//g, '\\');
                if (!targetFile.toLowerCase().includes('everest-frontend\\src\\')) continue;
                
                const relativeSrcPath = targetFile.substring(targetFile.toLowerCase().indexOf('everest-frontend\\src\\'));
                const actualFile = path.join('C:\\Users\\DELL\\Desktop\\Everest\\', relativeSrcPath);
                
                if (!fs.existsSync(actualFile)) continue;
                
                let content = fs.readFileSync(actualFile, 'utf8');
                
                if (call.name === 'replace_file_content') {
                    if (content.includes(args.TargetContent)) {
                        content = content.replace(args.TargetContent, args.ReplacementContent);
                        console.log(`Applied edit to ${actualFile} at step ${obj.step_index}`);
                    } else {
                        console.log(`FAILED edit to ${actualFile} at step ${obj.step_index}`);
                    }
                } else if (call.name === 'multi_replace_file_content') {
                    let appliedAll = true;
                    for (const chunk of args.ReplacementChunks) {
                        if (content.includes(chunk.TargetContent)) {
                            content = content.replace(chunk.TargetContent, chunk.ReplacementContent);
                        } else {
                            appliedAll = false;
                        }
                    }
                    if (appliedAll) {
                        console.log(`Applied multi-edit to ${actualFile} at step ${obj.step_index}`);
                    } else {
                        console.log(`FAILED (partial/full) multi-edit to ${actualFile} at step ${obj.step_index}`);
                    }
                }
                
                fs.writeFileSync(actualFile, content);
            }
        }
    }
}
