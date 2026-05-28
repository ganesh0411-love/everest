const fs = require('fs');
const readline = require('readline');
const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/DELL/.gemini/antigravity/brain/b709ca33-fff3-44d8-987f-ff564be64dc3/.system_generated/logs/transcript.jsonl'),
  crlfDelay: Infinity
});

let files = {};

function decodeArg(arg) {
  if (typeof arg !== 'string') return arg;
  try {
    let parsed = JSON.parse(arg);
    if (typeof parsed === 'string' && parsed.startsWith('"')) {
       try {
           let doubleParsed = JSON.parse(parsed);
           return doubleParsed;
       } catch(e) {}
    }
    return parsed;
  } catch (e) {
    return arg;
  }
}

function replaceContent(file, target, replacement, allowMultiple, startLine, endLine) {
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
    if (time > new Date('2026-05-27T03:51:00Z')) return;
    
    if (entry.type === 'PLANNER_RESPONSE' && entry.tool_calls) {
      for (const call of entry.tool_calls) {
        if (call.name === 'write_to_file') {
           let file = decodeArg(call.args.TargetFile).replace(/\\\\/g, '/');
           if (file.includes('everest-frontend/src')) {
             files[file] = decodeArg(call.args.CodeContent);
           }
        }
        if (call.name === 'replace_file_content') {
           let file = decodeArg(call.args.TargetFile).replace(/\\\\/g, '/');
           if (file.includes('everest-frontend/src')) {
             replaceContent(file, decodeArg(call.args.TargetContent), decodeArg(call.args.ReplacementContent), call.args.AllowMultiple, call.args.StartLine, call.args.EndLine);
           }
        }
        if (call.name === 'multi_replace_file_content') {
           let file = decodeArg(call.args.TargetFile).replace(/\\\\/g, '/');
           if (file.includes('everest-frontend/src')) {
             let chunks = decodeArg(call.args.ReplacementChunks);
             if (typeof chunks === 'string') chunks = JSON.parse(chunks);
             for (const chunk of chunks) {
                replaceContent(file, chunk.TargetContent, chunk.ReplacementContent, chunk.AllowMultiple, chunk.StartLine, chunk.EndLine);
             }
           }
        }
      }
    }
  } catch(e) {}
});

rl.on('close', () => {
  let count = 0;
  for (const [file, content] of Object.entries(files)) {
     if (fs.existsSync(file)) {
        fs.writeFileSync(file, content);
        count++;
     }
  }
  console.log('Restored ' + count + ' files exactly as they were at 9:21 AM IST (03:51 UTC).');
});
