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

interface SendGridClient {
  setApiKey(apiKey: string): void;
  send(message: OutgoingEmail & { from: string }): Promise<unknown>;
}

let sgMailPromise: Promise<SendGridClient | null> | null = null;

async function getSendGrid() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return null;
  if (!sgMailPromise) {
    const sendGridModule = '@sendgrid/mail';
    sgMailPromise = import(sendGridModule)
      .then((m) => {
        const sg = (m.default ?? m) as SendGridClient;
        sg.setApiKey(apiKey);
        return sg;
      })
      .catch((err) => {
        console.warn('SendGrid module not installed; falling back to console log.', err?.message);
        return null;
      });
  }
  return sgMailPromise;
}

export async function sendEmail(msg: OutgoingEmail): Promise<{ delivered: boolean }> {
  const sg = await getSendGrid();
  const fromAddress = process.env.MAIL_FROM_ADDRESS || 'no-reply@maverick-loyalty.local';

  if (sg && process.env.MAIL_FROM_ADDRESS) {
    try {
      await sg.send({ to: msg.to, from: fromAddress, subject: msg.subject, text: msg.text });
      return { delivered: true };
    } catch (err) {
      console.error('SendGrid send failed, falling back to console:', err);
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
