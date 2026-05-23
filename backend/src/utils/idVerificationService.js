import { createWorker } from 'tesseract.js';

/**
 * Autonomously extracts text from an ID document image and validates matches against profile credentials.
 * @param {string} filePath - Absolute path to the uploaded ID document image file.
 * @param {string} expectedName - The expected full name of the professional (e.g. Salma Mohammed).
 * @param {string} expectedLicense - The expected license number (e.g. VET-2024-001).
 * @param {string} expectedRole - The expected profile role ('vet', 'trainer', or 'vendor').
 * @returns {Promise<{passed: boolean, confidence: number, extractedText: string, reasons: string[], notes: string}>}
 */
export const verifyIDDocument = async (filePath, expectedName, expectedLicense, expectedRole) => {
    console.log(`🔍 [AI ID Verification] Starting autonomous check for: ${expectedName} (${expectedRole}) | Expected License: ${expectedLicense}`);
    
    let worker = null;
    try {
        worker = await createWorker();
        const ret = await worker.recognize(filePath);
        const text = ret.data.text || '';
        await worker.terminate();
        
        console.log(`📝 [AI ID Verification] Extracted OCR Text:\n${text}`);
        
        // 1. Text normalization
        const normalizedText = text.toLowerCase();
        const normalizedName = (expectedName || '').toLowerCase().trim();
        const normalizedLicense = expectedLicense ? expectedLicense.toLowerCase().trim() : '';
        const normalizedRole = expectedRole ? expectedRole.toLowerCase().trim() : '';
        
        // Split name into separate words/tokens to check individual name matches
        const nameTokens = normalizedName.split(/\s+/).filter(t => t.length > 2);
        
        // 2. Name-matching confidence score
        let matchedTokens = 0;
        for (const token of nameTokens) {
            if (normalizedText.includes(token)) {
                matchedTokens++;
            }
        }
        
        const nameMatchScore = nameTokens.length > 0 ? (matchedTokens / nameTokens.length) * 100 : 0;
        
        // 3. License number check
        const licenseMatched = normalizedLicense && normalizedText.includes(normalizedLicense);
        
        // 4. Role keyword check
        const roleKeywords = normalizedRole === 'vet' ? ['veterinary', 'vet', 'doctor', 'clinic', 'medicine', 'animal', 'ministry', 'health'] :
                             normalizedRole === 'trainer' ? ['trainer', 'training', 'canine', 'obedience', 'academy', 'k9', 'dog'] :
                             ['shop', 'store', 'retail', 'pet shop', 'tax', 'merchant', 'commercial', 'company', 'register'];
                             
        const roleMatched = roleKeywords.some(kw => normalizedText.includes(kw));
        
        // 5. Overall confidence calculation
        let confidence = 0;
        let reasons = [];
        
        if (nameMatchScore >= 50) {
            confidence += 40;
        } else {
            reasons.push('Name mismatch on document');
        }
        
        if (licenseMatched) {
            confidence += 40;
        } else {
            reasons.push('License number not found or mismatch');
        }
        
        if (roleMatched) {
            confidence += 20;
        } else {
            reasons.push('Role-specific keywords not matched');
        }
        
        console.log(`📊 [AI ID Verification] Results - Name Match: ${nameMatchScore}%, License Match: ${licenseMatched}, Role Match: ${roleMatched} | Overall Confidence: ${confidence}%`);
        
        // 80% confidence score required for instant auto-approval
        const passed = confidence >= 80;
        
        return {
            passed,
            confidence,
            extractedText: text,
            reasons: reasons.length > 0 ? reasons : ['Perfect Match'],
            notes: `Autonomous verification results: ${confidence}% confidence score. Matches - Name: ${nameMatchScore >= 50 ? 'YES' : 'NO'}, License: ${licenseMatched ? 'YES' : 'NO'}, Role Keywords: ${roleMatched ? 'YES' : 'NO'}. ${reasons.length > 0 ? 'Fails: ' + reasons.join(', ') : ''}`
        };
        
    } catch (error) {
        console.error('❌ [AI ID Verification] Error during OCR recognize:', error);
        if (worker) {
            try { await worker.terminate(); } catch (e) {}
        }
        return {
            passed: false,
            confidence: 0,
            extractedText: '',
            reasons: [`OCR Processing Error: ${error.message}`],
            notes: `Autonomous verification system error during OCR processing: ${error.message}`
        };
    }
};
