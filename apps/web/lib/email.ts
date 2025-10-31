import nodemailer from 'nodemailer';

export type EmailOptions = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

function getEnv(name: string): string | undefined {
  return process.env[name] || process.env[`SUPABASE_${name}`];
}

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  const host = getEnv('SMTP_HOST');
  const port = Number(getEnv('SMTP_PORT') || 587);
  const user = getEnv('SMTP_USER');
  const pass = getEnv('SMTP_PASS');
  const from = getEnv('SMTP_FROM') || 'no-reply@digiclient.local';

  if (!host || !user || !pass) {
    // Soft-fail to avoid breaking dev without SMTP; log and return
    console.warn('[email] SMTP not configured; skipping send to', to);
    return { skipped: true } as const;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to, subject, text, html });
  return { ok: true } as const;
}