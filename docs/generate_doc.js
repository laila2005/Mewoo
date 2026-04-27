const fs = require('fs');
const { execSync } = require('child_process');

try {
  // We already have marked installed globally or we can use npx to run it.
  // Let's just run npx marked and get the output.
  const htmlContent = execSync('npx marked d:\\Mewoo\\docs\\Mewoo_Team_Plan.md').toString();
  
  const wordHtml = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" 
        xmlns:w="urn:schemas-microsoft-com:office:word" 
        xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8">
    <title>Mewoo Team Plan</title>
    <style>
      body { font-family: 'Calibri', sans-serif; line-height: 1.5; font-size: 11pt; padding: 20px; }
      h1 { font-size: 18pt; color: #2F5496; }
      h2 { font-size: 14pt; color: #2F5496; margin-top: 15px; }
      h3 { font-size: 12pt; color: #1F3763; margin-top: 10px; }
      p { margin-bottom: 10px; }
      li { margin-bottom: 5px; }
    </style>
  </head>
  <body>
    ${htmlContent}
  </body>
  </html>
  `;
  
  fs.writeFileSync('d:\\Mewoo\\docs\\Mewoo_Team_Plan.doc', wordHtml, 'utf8');
  console.log("Created DOC file successfully.");
} catch(e) {
  console.error("Error generating doc: ", e);
}
