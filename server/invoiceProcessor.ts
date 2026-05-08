import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require('pdf-parse');
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

/**
 * Read a PDF file from disk and return its raw text.
 */
export async function extractInvoiceText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text || '';
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
