const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:/Users/DELL/.gemini/antigravity/brain/04b8dc43-7d7c-4bd3-b4fb-f0b64eaafb8e/.system_generated/logs/transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let edits = [];

  for await (const line of rl) {
    try {
        const item = JSON.parse(line);
        if (item.type === 'PLANNER_RESPONSE' && item.tool_calls) {
            for (let tc of item.tool_calls) {
                if (tc.name.includes('write_to_file') || tc.name.includes('replace_file_content')) {
                    if (tc.args && tc.args.TargetFile && tc.args.TargetFile.includes('AdminDashboard.jsx')) {
                        edits.push({ name: tc.name, args: tc.args, step: item.step_index });
                    }
                }
            }
        }
    } catch (e) {}
  }

  console.log('Found ' + edits.length + ' edits.');
  fs.writeFileSync('edits.json', JSON.stringify(edits, null, 2));
}

processLineByLine();
