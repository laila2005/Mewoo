import sharp from 'sharp';
import path from 'path';

const inputPath = 'g:\\Mewoo\\petpulse-web\\public\\assets\\images\\logoo.png';
const outputPath = 'g:\\Mewoo\\petpulse-web\\public\\assets\\images\\og-image.jpg';

async function processImage() {
  try {
    await sharp(inputPath)
      .resize(1200, 630, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    console.log('Successfully created optimized OG image:', outputPath);
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processImage();
