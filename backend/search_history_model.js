import fs from 'fs';

const filePath = "C:\\Users\\lolo\\.gemini\\antigravity\\brain\\df5e75a5-cbaf-4029-bc4e-a39c68c45ea1\\.system_generated\\steps\\6405\\content.md";

function run() {
  if (!fs.existsSync(filePath)) {
    console.error("File does not exist:", filePath);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Try to find the description and the readme article
  const descRegex = /<meta name="description" content="([^"]+)"/;
  const descMatch = content.match(descRegex);
  if (descMatch) {
    console.log("DESCRIPTION:", descMatch[1]);
  }
  
  // Find article tag
  const articleStart = content.indexOf('<article');
  const articleEnd = content.indexOf('</article>');
  
  if (articleStart !== -1 && articleEnd !== -1) {
    const articleHtml = content.substring(articleStart, articleEnd + 10);
    // Strip HTML tags to make it readable markdown-ish
    const text = articleHtml
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\n\s*\n+/g, '\n')
      .trim();
    console.log("\n--- README CONTENT ---");
    console.log(text.substring(0, 5000));
  } else {
    console.log("Could not find <article> tag in HTML.");
    // Print a segment of HTML body to inspect
    const bodyStart = content.indexOf('<body');
    if (bodyStart !== -1) {
      console.log(content.substring(bodyStart, bodyStart + 2000));
    }
  }
}

run();
