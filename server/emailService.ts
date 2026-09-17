/**
 * Outbound email helper.
 *
 * Primary provider is Brevo (formerly Sendinblue) transactional email API,
 * used when BREVO_API_KEY is set. Falls back to SendGrid for back-compat
 * when SENDGRID_API_KEY is set instead. Until either is configured, we log
 * the message so auth flows remain fully testable in development.
 */

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

async function sendViaBrevo(msg: OutgoingEmail, fromAddress: string, fromName: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY!,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: fromAddress, name: fromName },
        to: [{ email: msg.to }],
        subject: msg.subject,
        textContent: msg.text,
        ...(msg.html ? { htmlContent: msg.html } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Brevo send failed (${res.status}):`, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Brevo send failed, falling back to console:', err);
    return false;
  }
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

export async function sendEmail(msg: OutgoingEmail): Promise<{ delivered: boolean }> {
  const fromAddress = process.env.MAIL_FROM_ADDRESS || 'no-reply@maverick-loyalty.local';
  const fromName = process.env.MAIL_FROM_NAME || 'Maverick Loyalty';

  if (process.env.BREVO_API_KEY) {
    const delivered = await sendViaBrevo(msg, fromAddress, fromName);
    if (delivered) return { delivered: true };
  } else {
    const sg = await getSendGrid();
    if (sg) {
      try {
        await sg.send({ to: msg.to, from: fromAddress, subject: msg.subject, text: msg.text, ...(msg.html ? { html: msg.html } : {}) });
        return { delivered: true };
      } catch (err) {
        console.error('SendGrid send failed, falling back to console:', err);
      }
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

export function buildPasswordResetEmail(firstName: string, resetUrl: string): Pick<OutgoingEmail, 'subject' | 'text'> {
  return {
    subject: 'Reset your Maverick Loyalty password',
    text:
      `Hi ${firstName || 'there'},\n\n` +
      `We received a request to reset your Maverick Loyalty password.\n\n` +
      `Reset it here: ${resetUrl}\n\n` +
      `This link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
  };
}
