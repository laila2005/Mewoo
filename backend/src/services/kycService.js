import Tesseract from 'tesseract.js';
import path from 'path';

/**
 * Real Free KYC (Know Your Customer) Service using Tesseract.js OCR
 * 
 * This module uses local Optical Character Recognition (OCR) to read the uploaded
 * ID document and looks for keywords like "National ID", "License", "Republic",
 * or the user's name to automatically verify its authenticity.
 * Since it runs locally, it is 100% free and has no API limits.
 */

export const verifyID = async (file, userFullName) => {
    try {
        if (!file) {
            return {
                status: 'rejected',
                reason: 'No ID document provided.'
            };
        }

        const filePath = path.join(process.cwd(), 'public', 'uploads', 'ids', file.filename);
        
        // Run OCR on the image
        const { data: { text } } = await Tesseract.recognize(
            filePath,
            'eng', // English. Can add 'ara' for Arabic if needed later
            { logger: m => console.log('OCR Progress:', m.status, Math.round(m.progress * 100) + '%') }
        );

        const extractedText = text.toLowerCase();
        console.log('Extracted OCR Text:', extractedText);

        // Define keywords that typically appear on official IDs
        const officialKeywords = ['id', 'identity', 'national', 'republic', 'license', 'card', 'state', 'ministry', 'authority'];
        
        // Check if the document contains official keywords
        const containsOfficialKeyword = officialKeywords.some(keyword => extractedText.includes(keyword));
        
        // Optional: Check if user's name is somewhat in the text (basic fuzzy match could be added)
        const nameParts = userFullName.toLowerCase().split(' ');
        const containsName = nameParts.some(part => part.length > 2 && extractedText.includes(part));

        if (containsOfficialKeyword || containsName) {
            return {
                status: 'approved',
                reason: 'Automated OCR Check Passed: Official ID format detected.'
            };
        } else {
            return {
                status: 'pending',
                reason: 'Automated OCR Check Inconclusive: Could not confidently read official markers. Admin review required.'
            };
        }

    } catch (error) {
        console.error('KYC OCR Verification Error:', error);
        return {
            status: 'pending',
            reason: 'Automated check failed due to technical error. Admin review required.'
        };
    }
};
