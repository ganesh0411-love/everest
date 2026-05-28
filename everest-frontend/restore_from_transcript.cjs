const fs = require('fs');
const lines = fs.readFileSync('C:/Users/DELL/.gemini/antigravity/brain/b709ca33-fff3-44d8-987f-ff564be64dc3/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');

let restored = {};

for (const line of lines) {
  if (!line.includes('write_to_file')) continue;
  try {
    const obj = JSON.parse(line);
    if (!obj.tool_calls || !obj.tool_calls[0]) continue;
    const args = obj.tool_calls[0].args;
    if (args.TargetFile && args.CodeContent) {
      if (obj.created_at < '2026-05-27T09:22:20Z' && obj.created_at > '2026-05-27T09:15:00Z') {
        let filepath = args.TargetFile.replace(/"/g, '');
        if (filepath.includes('src/components') || filepath.includes('src/utils')) {
          restored[filepath] = args.CodeContent;
        }
      }
    }
  } catch (e) {}
}

for (const [filepath, content] of Object.entries(restored)) {
  fs.writeFileSync(filepath, content);
  console.log('Restored:', filepath);
}
