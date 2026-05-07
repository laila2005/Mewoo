const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log('Starting PDF generation...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    const fileUrl = 'file:///' + path.resolve(__dirname, 'presentation.html').replace(/\\/g, '/');
    console.log('Loading page: ' + fileUrl);
    
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    
    // Set to print media type
    await page.emulateMediaType('print');
    
    const outputPath = path.resolve(__dirname, 'PetPulse_Presentation.pdf');
    console.log('Saving PDF to: ' + outputPath);
    
    await page.pdf({
        path: outputPath,
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    
    await browser.close();
    console.log('PDF generated successfully!');
})();
