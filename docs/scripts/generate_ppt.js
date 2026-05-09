const puppeteer = require('puppeteer');
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log('Starting PowerPoint generation...');
    
    // 1. Setup Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Set viewport for 16:9 aspect ratio at 1080p
    await page.setViewport({ width: 1920, height: 1080 });
    
    const fileUrl = 'file:///' + path.resolve(__dirname, 'presentation.html').replace(/\\/g, '/');
    console.log('Loading page: ' + fileUrl);
    
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    
    // Activate PPT mode to disable animations and expand components
    await page.evaluate(() => document.body.classList.add('ppt-mode'));
    
    // Setup PPTX
    let pres = new pptxgen();
    pres.layout = 'LAYOUT_16x9';
    
    // Get total number of slides
    const slideCount = await page.evaluate(() => document.querySelectorAll('.slide').length);
    console.log(`Found ${slideCount} slides.`);
    
    for (let i = 0; i < slideCount; i++) {
        console.log(`Capturing slide ${i + 1} of ${slideCount}...`);
        
        // Navigate to the slide natively using the presentation's JS function
        await page.evaluate((index) => {
            if (typeof goToSlide === 'function') {
                goToSlide(index);
            }
        }, i);
        
        // Wait for rendering and internal transitions
        await new Promise(r => setTimeout(r, 500));
        
        // Ensure flip animations inside feature cards are bypassed by our CSS,
        // but just in case, we pause slightly.
        
        const screenshotBuffer = await page.screenshot({ type: 'png' });
        const base64Image = screenshotBuffer.toString('base64');
        
        // Add to PPTX
        let slide = pres.addSlide();
        slide.addImage({ 
            data: `image/png;base64,${base64Image}`, 
            x: 0, 
            y: 0, 
            w: '100%', 
            h: '100%' 
        });
    }
    
    await browser.close();
    
    // Save the PPTX
    const outputPath = path.resolve(__dirname, 'PetPulse_Presentation_v3.pptx');
    console.log('Saving PowerPoint to: ' + outputPath);
    
    await pres.writeFile({ fileName: outputPath });
    console.log('PowerPoint generated successfully!');
})();
