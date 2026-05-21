import fs from 'fs';
import readline from 'readline';

const transcriptPath = "C:\\Users\\lolo\\.gemini\\antigravity\\brain\\df5e75a5-cbaf-4029-bc4e-a39c68c45ea1\\.system_generated\\logs\\transcript.jsonl";

async function search() {
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("Searching history for USER_INPUT steps...");
  let matchCount = 0;
  for await (const line of rl) {
    const step = JSON.parse(line);
    if (step.type === "USER_INPUT") {
      matchCount++;
      console.log(`\n--- User Msg ${matchCount} (Step ${step.step_index}) ---`);
      console.log(step.content);
    }
  }
  console.log(`\nSearch complete. Found ${matchCount} user messages.`);
}

search();
