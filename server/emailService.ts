/**
 * Outbound email helper.
 *
 * In production, plug in a real provider (e.g. Replit's SendGrid integration).
 * Until SENDGRID_API_KEY is configured, we log the message so the verification
 * flow remains fully testable in development. This mirrors the existing
 * password-reset behaviour in emailAuth.ts.
 */

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

let sgMailPromise: Promise<any> | null = null;

async function getSendGrid() {
  if (!process.env.SENDGRID_API_KEY) return null;
  if (!sgMailPromise) {
    sgMailPromise = import('@sendgrid/mail')
      .then((m) => {
        const sg = (m as any).default ?? m;
        sg.setApiKey(process.env.SENDGRID_API_KEY);
        return sg;
      })
      .catch((err) => {
        console.warn('SendGrid module not installed; falling back to console log.', err?.message);
        return null;
      });
  }
  return sgMailPromise;
}

// Backoff schedule between attempts, in ms. Two entries = up to 2 retries
// (3 attempts total) on transient failures only.
const RETRY_DELAYS_MS = [500, 1500];

const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

// Distinguishes transient failures (network blips, SendGrid 5xx) worth
// retrying from validation failures (bad API key, invalid `from` address,
// malformed payload) that will fail identically on every retry.
function isRetryableSendGridError(err: any): boolean {
  // No HTTP response at all (err.code is a string like 'ECONNRESET', or
  // there's no response/code info whatsoever) means the request never made
  // it to SendGrid — treat as a network-layer failure.
  if (typeof err?.code === 'string') {
    return RETRYABLE_NETWORK_CODES.has(err.code);
  }

  // @sendgrid/mail surfaces the HTTP status as a numeric `err.code`, with
  // `err.response.statusCode` as a fallback depending on the failure path.
  const status = typeof err?.code === 'number' ? err.code : err?.response?.statusCode;
  if (typeof status === 'number') return status >= 500;

  // Unknown shape (e.g. a bare Error with no code/response) — assume it's a
  // network-level problem rather than a validation one, so it's still worth
  // one retry before falling back to the console-log path.
  return true;
}

async function sendWithRetry(
  sg: any,
  payload: { to: string; from: string; subject: string; text: string }
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await sg.send(payload);
      return;
    } catch (err: any) {
      const attemptsRemaining = RETRY_DELAYS_MS.length - attempt;
      if (attemptsRemaining <= 0 || !isRetryableSendGridError(err)) {
        throw err;
      }
      const delayMs = RETRY_DELAYS_MS[attempt];
      console.warn(
        `SendGrid send failed (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}), retrying in ${delayMs}ms:`,
        err?.message ?? err
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function sendEmail(msg: OutgoingEmail): Promise<{ delivered: boolean }> {
  const sg = await getSendGrid();
  const fromAddress = process.env.MAIL_FROM_ADDRESS || 'no-reply@maverick-loyalty.local';

  if (sg && process.env.MAIL_FROM_ADDRESS) {
    try {
      await sendWithRetry(sg, { to: msg.to, from: fromAddress, subject: msg.subject, text: msg.text });
      return { delivered: true };
    } catch (err) {
      console.error('SendGrid send failed after retries, falling back to console:', err);
    }
  }

  console.log(
    `\n[email:dev]\n  to: ${msg.to}\n  subject: ${msg.subject}\n  ${msg.text.replace(/\n/g, '\n  ')}\n`
  );
  return { delivered: false };
}

export function buildVerificationEmail(firstName: string, code: string): Pick<OutgoingEmail, 'subject' | 'text'> {
  return {
    subject: 'Verify your Maverick Loyalty account',
    text:
      `Hi ${firstName || 'there'},\n\n` +
      `Your Maverick Loyalty verification code is: ${code}\n\n` +
      `Enter it in the app to confirm your email and phone number. ` +
      `The code expires in 15 minutes.\n\n` +
      `If you didn't request this, you can safely ignore this email.`,
  };
}
