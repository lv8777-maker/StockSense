import { createHash } from "crypto";

export function createReceiptFingerprint(contents: Buffer): string {
  return createHash("sha256").update(contents).digest("hex");
}

export function createReceiptDocumentFingerprint(ocrText: string): string {
  const invoiceNumber = ocrText.match(
    /invoice\s*(?:number|no\.?)\s*:?\s*([a-z0-9][a-z0-9 ._/-]*)/i,
  )?.[1];
  const normalized = invoiceNumber
    ? `invoice:${invoiceNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}`
    : `content:${ocrText.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  return createHash("sha256").update(normalized).digest("hex");
}

export function isReceiptDuplicateError(error: unknown): boolean {
  let current: any = error;

  for (let depth = 0; current && depth < 5; depth += 1) {
    if (
      current.code === "23505" &&
      (
        current.constraint === "receipt_uploads_user_file_hash_unique" ||
        current.constraint === "receipt_uploads_user_document_hash_unique" ||
        String(current.message ?? "").includes("receipt_uploads_user_file_hash_unique") ||
        String(current.message ?? "").includes("receipt_uploads_user_document_hash_unique")
      )
    ) {
      return true;
    }
    current = current.cause;
  }

  return false;
}