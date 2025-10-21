import Tesseract from 'tesseract.js';

export interface ProcessedReceipt {
  purchaseType: string;
  detectedAmount: number | null;
  detectedPlan: string | null;
  pointsAwarded: number;
  ocrText: string;
  description: string;
}

// Plan-based points mapping (same as signup bonus)
const planToPoints: Record<string, number> = {
  'Essential': 100,
  'Core': 100,
  'Plus': 200,
  'Prime': 200,
  'Deluxe': 300,
  'Elite': 300,
  'Bronze': 500,
  'Silver': 500,
  'Gold': 500,
  'Platinum': 500,
};

/**
 * Process receipt image using OCR and calculate points
 */
export async function processReceiptImage(imagePath: string): Promise<ProcessedReceipt> {
  try {
    // Perform OCR on the receipt image
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');

    const ocrText = text.toLowerCase();
    
    // Initialize result
    let purchaseType = 'unknown';
    let detectedAmount: number | null = null;
    let detectedPlan: string | null = null;
    let pointsAwarded = 0;
    let description = '';

    // 1. Check for Plan-based purchases
    for (const [planName, points] of Object.entries(planToPoints)) {
      if (ocrText.includes(planName.toLowerCase())) {
        purchaseType = 'plan';
        detectedPlan = planName;
        pointsAwarded = points;
        description = `${planName} plan purchase detected - ${points} points awarded`;
        return { purchaseType, detectedAmount, detectedPlan, pointsAwarded, ocrText: text, description };
      }
    }

    // 2. Check for Airtime purchase
    if (ocrText.includes('airtime')) {
      purchaseType = 'airtime';
      
      // Extract amount using regex patterns (supports currency symbols, thousands separators, non-breaking spaces)
      const airtimePatterns = [
        /airtime[:\s]*r?[\s\u00A0]*([\d,\s\u00A0]+(?:\.\d{2})?)/i,
        /r[\s\u00A0]*([\d,\s\u00A0]+(?:\.\d{2})?)[^\d]*airtime/i,
        /([\d,\s\u00A0]+(?:\.\d{2})?)[^\d]*airtime/i,
      ];

      for (const pattern of airtimePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          // Normalize amount by removing commas, spaces, and non-breaking spaces before parsing
          const normalizedAmount = match[1].replace(/[,\s\u00A0]/g, '');
          detectedAmount = parseFloat(normalizedAmount);
          break;
        }
      }

      // Calculate points: 1 point per R1 (minimum R100)
      if (detectedAmount && detectedAmount >= 100) {
        pointsAwarded = Math.floor(detectedAmount);
        description = `Airtime purchase of R${detectedAmount.toFixed(2)} - ${pointsAwarded} points awarded`;
      } else {
        description = `Airtime purchase detected but amount less than R100 minimum`;
      }
      
      return { purchaseType, detectedAmount, detectedPlan, pointsAwarded, ocrText: text, description };
    }

    // 3. Check for Accessory purchase
    if (ocrText.includes('accessory') || ocrText.includes('accessories') || 
        ocrText.includes('charger') || ocrText.includes('cable') || 
        ocrText.includes('case') || ocrText.includes('headphone')) {
      purchaseType = 'accessory';
      
      // Extract amount using regex patterns (supports currency symbols, thousands separators, non-breaking spaces)
      const amountPatterns = [
        /total[:\s]*r?[\s\u00A0]*([\d,\s\u00A0]+(?:\.\d{2})?)/i,
        /amount[:\s]*r?[\s\u00A0]*([\d,\s\u00A0]+(?:\.\d{2})?)/i,
        /r[\s\u00A0]*([\d,\s\u00A0]+(?:\.\d{2})?)/i,
      ];

      for (const pattern of amountPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          // Normalize amount by removing commas, spaces, and non-breaking spaces before parsing
          const normalizedAmount = match[1].replace(/[,\s\u00A0]/g, '');
          detectedAmount = parseFloat(normalizedAmount);
          break;
        }
      }

      // Calculate points based on tiers
      if (detectedAmount) {
        if (detectedAmount >= 2000) {
          pointsAwarded = 500;
          description = `Accessory purchase of R${detectedAmount.toFixed(2)} - 500 points awarded (R2000+ tier)`;
        } else if (detectedAmount >= 1000) {
          pointsAwarded = 250;
          description = `Accessory purchase of R${detectedAmount.toFixed(2)} - 250 points awarded (R1000-R1999 tier)`;
        } else if (detectedAmount >= 500) {
          pointsAwarded = 100;
          description = `Accessory purchase of R${detectedAmount.toFixed(2)} - 100 points awarded (R500-R999 tier)`;
        } else {
          description = `Accessory purchase of R${detectedAmount.toFixed(2)} - below R500 minimum for points`;
        }
      } else {
        description = `Accessory purchase detected but amount could not be determined`;
      }
      
      return { purchaseType, detectedAmount, detectedPlan, pointsAwarded, ocrText: text, description };
    }

    // No recognized purchase type
    return {
      purchaseType: 'unknown',
      detectedAmount: null,
      detectedPlan: null,
      pointsAwarded: 0,
      ocrText: text,
      description: 'Could not detect purchase type (airtime, accessory, or plan)'
    };
    
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error(`Failed to process receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate if file is an allowed image type
 */
export function isValidReceiptFile(mimetype: string): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return allowedTypes.includes(mimetype);
}
