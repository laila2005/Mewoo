import fs from 'fs';
import readline from 'readline';

const transcriptPath = "C:\\Users\\lolo\\.gemini\\antigravity\\brain\\df5e75a5-cbaf-4029-bc4e-a39c68c45ea1\\.system_generated\\logs\\transcript.jsonl";

async function search() {
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("Searching history for keys/SMTP/Twilio mentions...");
  let matchCount = 0;
  for await (const line of rl) {
    const step = JSON.parse(line);
    const contentLower = (step.content || '').toLowerCase();
    const toolCallsString = JSON.stringify(step.tool_calls || '').toLowerCase();
    
    if (contentLower.includes("brevo") || 
        contentLower.includes("smtp_") ||
        contentLower.includes("api.sendinblue.com") ||
        contentLower.includes("78985b") || // Brevo/smtp keys usually look like this
        contentLower.includes("smtp.brevo.com") ||
        toolCallsString.includes("brevo") ||
        toolCallsString.includes("smtp_")
    ) {
      matchCount++;
      console.log(`\n--- Match ${matchCount} (Step ${step.step_index}, Source: ${step.source}, Type: ${step.type}) ---`);
      if (step.content) {
        console.log(step.content.substring(0, 1500));
      }
      if (step.tool_calls) {
        console.log(JSON.stringify(step.tool_calls).substring(0, 1500));
      }
    }
  }
  console.log(`\nSearch complete. Found ${matchCount} matches.`);
}

search();
