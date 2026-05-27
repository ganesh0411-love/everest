const fs = require('fs');
const readline = require('readline');
const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/DELL/.gemini/antigravity/brain/b709ca33-fff3-44d8-987f-ff564be64dc3/.system_generated/logs/transcript.jsonl'),
  crlfDelay: Infinity
});

let codeStr = '';
rl.on('line', (line) => {
  try {
    const entry = JSON.parse(line);
    const time = new Date(entry.created_at);
    if (time > new Date('2026-05-27T05:40:00Z')) return;
    if (entry.type === 'PLANNER_RESPONSE' && entry.tool_calls) {
      for (const call of entry.tool_calls) {
        if (call.name === 'write_to_file' && call.args.TargetFile && call.args.TargetFile.includes('CustomerList.jsx')) {
           codeStr = call.args.CodeContent;
        }
      }
    }
  } catch(e) {}
});
rl.on('close', () => {
    console.log('Got codeStr');
    console.log('Starts with quote?', codeStr.startsWith('"'));
    console.log('Ends with quote?', codeStr.endsWith('"'));
    
    // Try to eval it:
    try {
        let val = eval('(' + codeStr + ')');
        console.log('Eval success! Length:', val.length);
        console.log('Sample:', val.substring(0, 50).replace(/\n/g, '[NEWLINE]'));
    } catch(e) {
        console.log('Eval failed:', e.message);
    }
    
    // Try JSON parse
    try {
        let val2 = JSON.parse(codeStr);
        console.log('JSON parse success!');
    } catch(e) {
        console.log('JSON parse failed:', e.message);
    }
});
