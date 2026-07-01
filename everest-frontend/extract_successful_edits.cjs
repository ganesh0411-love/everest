const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:/Users/DELL/.gemini/antigravity/brain/04b8dc43-7d7c-4bd3-b4fb-f0b64eaafb8e/.system_generated/logs/transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let plannerCalls = {};
  let successfulEdits = [];

  for await (const line of rl) {
    try {
        const item = JSON.parse(line);
        if (item.type === 'PLANNER_RESPONSE' && item.tool_calls) {
            for (let i=0; i<item.tool_calls.length; i++) {
                let tc = item.tool_calls[i];
                if (tc.name.includes('write_to_file') || tc.name.includes('replace_file_content')) {
                    if (tc.args && tc.args.TargetFile && tc.args.TargetFile.includes('AdminDashboard.jsx')) {
                        // Store it using step_index + _ + index
                        plannerCalls[item.step_index + '_' + i] = { name: tc.name, args: tc.args, step: item.step_index };
                    }
                }
            }
        }
        if (item.type === 'TOOL_RESPONSE' && item.tool_calls) {
            // TOOL_RESPONSE tool_calls array maps 1:1 to the previous PLANNER_RESPONSE
            for (let i=0; i<item.tool_calls.length; i++) {
                let tc = item.tool_calls[i];
                let prevStep = item.step_index - 1;
                let key = prevStep + '_' + i;
                if (plannerCalls[key]) {
                    if (tc.status === 'DONE' && (!tc.error || tc.error === '')) {
                        // Some tools might return error inside output if they simulate success? 
                        // But let's assume status DONE means success.
                        if (tc.output && tc.output.includes('Error:')) {
                            // string error
                        } else {
                            successfulEdits.push(plannerCalls[key]);
                        }
                    }
                }
            }
        }
    } catch (e) {}
  }

  console.log('Found ' + successfulEdits.length + ' successful edits.');
  fs.writeFileSync('edits.json', JSON.stringify(successfulEdits, null, 2));
}

processLineByLine();
