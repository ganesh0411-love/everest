const fs = require('fs');
const lines = fs.readFileSync('C:/Users/DELL/.gemini/antigravity/brain/b709ca33-fff3-44d8-987f-ff564be64dc3/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');

let restored = {};

for (const line of lines) {
  if (!line.includes('write_to_file') && !line.includes('multi_replace_file_content')) continue;
  try {
    const obj = JSON.parse(line);
    if (!obj.tool_calls || !obj.tool_calls[0]) continue;
    const args = obj.tool_calls[0].args;
    
    if (obj.created_at < '2026-05-27T09:22:20Z' && obj.created_at > '2026-05-27T09:19:00Z') {
      if (args.TargetFile && args.CodeContent) {
        let filepath = JSON.parse(args.TargetFile);
        let content = JSON.parse(args.CodeContent);
        if (filepath.includes('src/components') || filepath.includes('src/utils')) {
          restored[filepath] = content;
          console.log('Queued restore for', filepath, 'from', obj.created_at);
        }
      }
    }
  } catch (e) {}
}

for (const [filepath, content] of Object.entries(restored)) {
  fs.writeFileSync(filepath, content);
  console.log('Successfully restored:', filepath);
}
