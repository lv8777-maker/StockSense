import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require('pdf-parse');
import Tesseract from 'tesseract.js';
import { pdf as pdfToImg } from 'pdf-to-img';
import { db } from './db';
import { packages } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface ParsedInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  accountNumber: string;
  msisdn: string | null;
  packageName: string;
  tariff: string;
  activationDate: string;
  contractDuration: string; // "24 Months" | "36 Months"
}

export interface InvoiceProcessResult {
  success: boolean;
  errorCode?:
    | 'INVALID_FILE'
    | 'PARSE_FAILED'
    | 'NAME_MISMATCH'
    | 'PACKAGE_NOT_ELIGIBLE'
    | 'DUPLICATE'
    | 'UNRECOGNISED_TERM';
  message: string;
  invoice?: ParsedInvoice;
  pointsAwarded?: number;
  matchedPackageName?: string;
}

/**
 * Validate that a multer-uploaded file is a PDF (by mimetype or extension).
 */
export function isValidInvoiceFile(mimetype: string, originalName: string): boolean {
  if (mimetype === 'application/pdf') return true;
  return /\.pdf$/i.test(originalName);
}

function findField(text: string, label: string): string | null {
  // Match "Label: value" or "Label value" up to end of line
  const re = new RegExp(`${label}\\s*[:\\-]?\\s*([^\\n\\r]+)`, 'i');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function extractContractDuration(tariff: string): string | null {
  const m = tariff.match(/(\d+)\s*MTH/i);
  if (!m) return null;
  const months = parseInt(m[1], 10);
  if (months === 24) return '24 Months';
  if (months === 36) return '36 Months';
  return null;
}

/**
 * Extract structured fields from raw invoice text.
 */
export function parseInvoiceText(text: string): ParsedInvoice | null {
  const invoiceNumber = findField(text, 'Invoice Number');
  const invoiceDate = findField(text, 'Invoice Date');
  const customerName = findField(text, 'CUSTOMER');
  const accountNumber = findField(text, 'Account Number');
  const packageName = findField(text, 'Package');
  const tariff = findField(text, 'Tariff');
  const activationDate = findField(text, 'Activation Date');
  const msisdn = findField(text, 'MSISDN');

  if (!invoiceNumber || !invoiceDate || !customerName || !accountNumber || !packageName || !tariff || !activationDate || !msisdn) {
    return null;
  }

  const contractDuration = extractContractDuration(tariff) || '';

  return {
    invoiceNumber: invoiceNumber.replace(/\s+/g, ''),
    invoiceDate,
    customerName,
    accountNumber: accountNumber.replace(/\s+/g, ''),
    msisdn: msisdn ? msisdn.replace(/\s+/g, '') : null,
    packageName,
    tariff,
    activationDate,
    contractDuration,
  };
}

// Bounds to keep OCR fallback from monopolising CPU/memory on a single request.
const OCR_MAX_PAGES = 5;
const OCR_RENDER_SCALE = 1.5;

/**
 * Render up to OCR_MAX_PAGES pages of the PDF, run Tesseract OCR on each
 * (reusing a single worker for the whole document), and concatenate the
 * results. Used for scanned / image-based invoices where pdf-parse
 * produces no usable text.
 */
async function ocrPdfPages(buffer: Buffer): Promise<string> {
  const document = await pdfToImg(buffer, { scale: OCR_RENDER_SCALE });
  const worker = await Tesseract.createWorker('eng');
  try {
    const pageTexts: string[] = [];
    let pageNum = 0;
    for await (const pageImage of document) {
      pageNum += 1;
      if (pageNum > OCR_MAX_PAGES) break;
      const { data: { text } } = await worker.recognize(pageImage);
      pageTexts.push(text);
    }
    return pageTexts.join('\n');
  } finally {
    await worker.terminate().catch(() => {});
  }
}

/**
 * Extract & parse an invoice PDF. First tries pdf-parse (fast, exact for
 * text-based PDFs); if parseInvoiceText() can't pull all required fields,
 * falls back to OCR (Tesseract.js on rendered page images) and re-parses.
 * Returns whichever attempt yields the most complete result, plus the raw
 * text used so callers can include it in error responses if needed.
 */
export async function extractAndParseInvoice(
  buffer: Buffer
): Promise<{ parsed: ParsedInvoice | null; text: string }> {
  let bestText = '';
  let bestParsed: ParsedInvoice | null = null;

  // Attempt 1: pdf-parse text extraction
  try {
    const result = await pdfParse(buffer);
    bestText = result.text || '';
    bestParsed = parseInvoiceText(bestText);
    if (bestParsed) return { parsed: bestParsed, text: bestText };
  } catch (err) {
    console.warn('pdf-parse failed, will try OCR fallback:', err);
  }

  // Attempt 2: OCR fallback for scanned / image-based PDFs
  console.log('Invoice text extraction falling back to OCR.');
  try {
    const ocrText = await ocrPdfPages(buffer);
    const ocrParsed = parseInvoiceText(ocrText);
    if (ocrParsed) return { parsed: ocrParsed, text: ocrText };
    // Neither attempt yielded a full parse; return the longer text for diagnostics.
    if (ocrText.length > bestText.length) bestText = ocrText;
  } catch (err) {
    console.error('OCR fallback failed:', err);
  }

  return { parsed: bestParsed, text: bestText };
}

/**
 * Backwards-compatible raw-text extractor (kept for any external callers).
 * Prefer extractAndParseInvoice() in new code.
 */
export async function extractInvoiceText(buffer: Buffer): Promise<string> {
  const { text } = await extractAndParseInvoice(buffer);
  return text;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Case-insensitive, whitespace-tolerant comparison of an invoice's customer name
 * against the logged-in user's full name.
 */
export function namesMatch(invoiceName: string, accountFirst: string | null | undefined, accountLast: string | null | undefined): boolean {
  const invoice = normalize(invoiceName);
  const account = normalize(`${accountFirst || ''} ${accountLast || ''}`);
  if (!invoice || !account) return false;
  return invoice === account;
}

/**
 * Look up a package row by partial-matching the invoice's package name AND
 * exact-matching the contract duration. Longer canonical names are preferred
 * so e.g. "Mobile Internet 20GB" wins over "Mobile Internet 2GB".
 */
export async function findPackage(
  invoicePackageName: string,
  contractDuration: string
): Promise<{ name: string; pointsAwarded: number } | null> {
  try {
    const rows = await db
      .select()
      .from(packages)
      .where(eq(packages.contractDuration, contractDuration));

    const invoiceNorm = normalize(invoicePackageName);
    const candidates = rows
      .map(p => ({ name: p.name, normalized: normalize(p.name), points: p.pointsAwarded, status: p.status }))
      .filter(p => p.status === 'active')
      .sort((a, b) => b.normalized.length - a.normalized.length);

    for (const c of candidates) {
      if (!c.normalized) continue;
      if (invoiceNorm.includes(c.normalized) || c.normalized.includes(invoiceNorm)) {
        return { name: c.name, pointsAwarded: c.points };
      }
    }
    return null;
  } catch (error) {
    console.error('Package lookup failed during invoice processing:', error);
    return null;
  }
}
