const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:/Users/DELL/.gemini/antigravity/brain/04b8dc43-7d7c-4bd3-b4fb-f0b64eaafb8e/.system_generated/logs/transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
        const item = JSON.parse(line);
        if (item.type === 'PLANNER_RESPONSE' && item.tool_calls) {
            for (let tc of item.tool_calls) {
                if (tc.name.includes('run_command')) {
                    if (tc.args && tc.args.CommandLine && tc.args.CommandLine.includes('node ')) {
                        console.log(tc.args.CommandLine.substring(0, 150));
                    }
                }
            }
        }
    } catch (e) {}
  }
}

processLineByLine();
