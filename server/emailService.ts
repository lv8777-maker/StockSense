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

export function buildWelcomeEmail(firstName: string): Pick<OutgoingEmail, 'subject' | 'text'> {
  return {
    subject: 'Welcome to Maverick Loyalty!',
    text:
      `Hi ${firstName || 'there'},\n\n` +
      `You're verified and your account is ready to go — welcome aboard!\n\n` +
      `Earn points by uploading your MTN Tax Invoice or a purchase receipt in the app, then redeem them for ` +
      `rewards from the catalog. The more you earn, the higher your loyalty tier climbs, unlocking better perks along the way.\n\n` +
      `Glad to have you with us.`,
  };
}

export function buildPointsEarnedEmail(
  firstName: string,
  pointsEarned: number,
  description: string,
  newBalance?: number
): Pick<OutgoingEmail, 'subject' | 'text'> {
  return {
    subject: `You just earned ${pointsEarned} points!`,
    text:
      `Hi ${firstName || 'there'},\n\n` +
      `Good news — you've earned ${pointsEarned} points for: ${description}.\n\n` +
      (typeof newBalance === 'number' ? `Your new points balance is ${newBalance}.\n\n` : '') +
      `Log in to Maverick Loyalty to see your updated balance and browse rewards.`,
  };
}

export function buildRedemptionEmail(
  firstName: string,
  rewardName: string,
  pointsSpent: number,
  redemptionCode: string
): Pick<OutgoingEmail, 'subject' | 'text'> {
  return {
    subject: `Your reward is confirmed: ${rewardName}`,
    text:
      `Hi ${firstName || 'there'},\n\n` +
      `You've redeemed ${pointsSpent} points for: ${rewardName}.\n\n` +
      `Your redemption code is: ${redemptionCode}\n\n` +
      `Keep this code handy — you'll need it to claim your reward. This code is valid for 30 days.`,
  };
}

export function buildTierUpgradeEmail(firstName: string, newTier: string): Pick<OutgoingEmail, 'subject' | 'text'> {
  const tierLabel = newTier.charAt(0).toUpperCase() + newTier.slice(1);
  return {
    subject: `You've reached ${tierLabel} tier!`,
    text:
      `Hi ${firstName || 'there'},\n\n` +
      `Congratulations — you've been upgraded to ${tierLabel} tier!\n\n` +
      `Log in to Maverick Loyalty to see the perks that come with your new tier.`,
  };
}
