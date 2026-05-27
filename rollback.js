const fs = require('fs');
const readline = require('readline');
const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/DELL/.gemini/antigravity/brain/b709ca33-fff3-44d8-987f-ff564be64dc3/.system_generated/logs/transcript.jsonl'),
  crlfDelay: Infinity
});

let files = {};
let latestTime = new Date('2026-05-27T05:40:00Z');

function cleanStr(str) {
  if (typeof str === 'string') {
    return str.replace(/^"|"$/g, '').replace(/\\\\/g, '\\');
  }
  return str;
}

function replaceContent(file, target, replacement, allowMultiple, startLine, endLine) {
  file = cleanStr(file).replace(/\\\\/g, '/');
  target = cleanStr(target);
  replacement = cleanStr(replacement);
  if (!files[file]) return;

  let lines = files[file].split('\n');
  let contentInRange = lines.slice(startLine - 1, endLine).join('\n');
  if (contentInRange.includes(target)) {
    if (allowMultiple) {
      contentInRange = contentInRange.split(target).join(replacement);
    } else {
      contentInRange = contentInRange.replace(target, replacement);
    }
    let newLines = lines.slice(0, startLine - 1).join('\n') + 
                   (startLine > 1 ? '\n' : '') + 
                   contentInRange + 
                   (endLine < lines.length ? '\n' : '') + 
                   lines.slice(endLine).join('\n');
    files[file] = newLines;
  }
}

rl.on('line', (line) => {
  try {
    const entry = JSON.parse(line);
    const time = new Date(entry.created_at);
    if (time > latestTime) return;
    
    if (entry.type === 'PLANNER_RESPONSE' && entry.tool_calls) {
      for (const call of entry.tool_calls) {
        if (call.name === 'write_to_file') {
           const file = cleanStr(call.args.TargetFile).replace(/\\\\/g, '/');
           if (file.includes('AddCustomerModal.jsx') || file.includes('CustomerList.jsx') || file.includes('ApplicationStatusView.jsx') || file.includes('pdfGenerator.js')) {
             files[file] = cleanStr(call.args.CodeContent);
           }
        }
        if (call.name === 'replace_file_content') {
           const file = cleanStr(call.args.TargetFile).replace(/\\\\/g, '/');
           if (file.includes('AddCustomerModal.jsx') || file.includes('CustomerList.jsx') || file.includes('ApplicationStatusView.jsx') || file.includes('pdfGenerator.js')) {
             replaceContent(file, call.args.TargetContent, call.args.ReplacementContent, call.args.AllowMultiple, call.args.StartLine, call.args.EndLine);
           }
        }
        if (call.name === 'multi_replace_file_content') {
           const file = cleanStr(call.args.TargetFile).replace(/\\\\/g, '/');
           if (file.includes('AddCustomerModal.jsx') || file.includes('CustomerList.jsx') || file.includes('ApplicationStatusView.jsx') || file.includes('pdfGenerator.js')) {
             for (const chunk of call.args.ReplacementChunks) {
                replaceContent(file, chunk.TargetContent, chunk.ReplacementContent, chunk.AllowMultiple, chunk.StartLine, chunk.EndLine);
             }
           }
        }
      }
    }
  } catch(e) {}
});

rl.on('close', () => {
  for (const [file, content] of Object.entries(files)) {
     if (fs.existsSync(file)) {
         fs.writeFileSync(file, content);
         console.log('Restored: ' + file);
     } else {
         console.log('Target file not found, skipping: ' + file);
     }
  }
});
