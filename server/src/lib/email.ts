/**
 * Transactional email via Resend's REST API using Node's global `fetch`
 * (Node 18+) — no SDK dependency. Delivery problems are logged but swallowed
 * so auth endpoints can keep their anti-enumeration 200 responses.
 */
import {env} from '../env';

const API_URL = 'https://api.resend.com/emails';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!env.resendApiKey) {
    console.warn(`[email] RESEND_API_KEY not configured — not sending "${input.subject}" to ${input.to}`);
    return;
  }
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!res.ok) {
      // Don't throw the caller; log and degrade gracefully.
      const detail = await res.text();
      console.error(`[email] Resend ${res.status}: ${detail.slice(0, 300)}`);
    }
  } catch (err) {
    // Network errors must never take down an auth request.
    console.error('[email] send failed:', err instanceof Error ? err.message : err);
  }
}

export function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${env.appUrl}/auth/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: 'Reset your Paxa password',
    html: `<p>Use this link to reset your password. It expires in 30 minutes:</p><p><a href="${url}">${url}</a></p>`,
    text: `Reset link (valid for 30 minutes): ${url}`,
  });
}

export function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${env.appUrl}/auth/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: 'Verify your Paxa email address',
    html: `<p>Confirm your email address to finish setting up your Paxa account:</p><p><a href="${url}">${url}</a></p>`,
    text: `Verify your email: ${url}`,
  });
}