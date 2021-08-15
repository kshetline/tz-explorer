import nodemailer from 'nodemailer';
import { timeStamp } from './tze-util';

export async function sendMailMessage(subject: string, content: string): Promise<boolean> {
  if (!process.env.TZE_SMTP_HOST || !process.env.TZE_SMTP_USER ||
      !process.env.TZE_SMTP_PASSWORD || !process.env.TZE_CONTACT_EMAIL)
    return false;

  const transport = nodemailer.createTransport({
    host: process.env.TZE_SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.TZE_SMTP_USER,
      pass: process.env.TZE_SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false,
      ciphers:'SSLv3'
    }
  });

  const info = await transport.sendMail({
    from: process.env.TZE_SMTP_USER,
    to: process.env.TZE_CONTACT_EMAIL,
    subject: subject || '(no subject)',
    text: content || '(no content)'
  });

  console.log('%s: sent message %s', timeStamp(), info.messageId);

  return true;
}
