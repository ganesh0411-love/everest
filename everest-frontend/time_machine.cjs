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
    // Because transcript logs tool args as JSON strings, `parsed` is often still a string.
    // If it's still a JSON string representing the file content, it will start with " and have literal \n
    // Let's just return it and we will unescape it later if needed.
    return parsed;
  } catch (e) {
    return arg;
  }
}

function fullyUnescape(str) {
    if (typeof str !== 'string') return str;
    // If it looks like a JSON string literal inside a string (starts and ends with quote, and contains \n)
    if (str.startsWith('"') && str.endsWith('"') && str.includes('\\n')) {
        try {
            return JSON.parse(str);
        } catch(e) {}
    }
    return str;
}

function replaceContent(file, target, replacement, allowMultiple, startLine, endLine) {
  if (!files[file]) return;
  let lines = files[file].split('\n');
  
  target = fullyUnescape(target);
  replacement = fullyUnescape(replacement);

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
    // Cut off at exactly 9:21 AM IST (03:51:00Z)
    if (time > new Date('2026-05-27T03:51:00Z')) return;
    
    if (entry.type === 'PLANNER_RESPONSE' && entry.tool_calls) {
      for (const call of entry.tool_calls) {
        if (call.name === 'write_to_file') {
           let file = fullyUnescape(decodeArg(call.args.TargetFile)).replace(/\\\\/g, '/');
           if (file.includes('everest-frontend/src')) {
             files[file] = fullyUnescape(decodeArg(call.args.CodeContent));
           }
        }
        if (call.name === 'replace_file_content') {
           let file = fullyUnescape(decodeArg(call.args.TargetFile)).replace(/\\\\/g, '/');
           if (file.includes('everest-frontend/src')) {
             replaceContent(file, decodeArg(call.args.TargetContent), decodeArg(call.args.ReplacementContent), call.args.AllowMultiple, call.args.StartLine, call.args.EndLine);
           }
        }
        if (call.name === 'multi_replace_file_content') {
           let file = fullyUnescape(decodeArg(call.args.TargetFile)).replace(/\\\\/g, '/');
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
  console.log('Successfully restored ' + count + ' files using Time Machine to 9:21 AM IST (03:51 UTC).');
});
