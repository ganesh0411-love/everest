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
        if (item.type === 'TOOL_RESPONSE') {
            console.log(JSON.stringify(item).substring(0, 500));
            break;
        }
    } catch (e) {}
  }
}

processLineByLine();
