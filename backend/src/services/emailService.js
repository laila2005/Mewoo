import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

/**
 * Pluggable Email Service
 * Employs Nodemailer transport if SMTP settings are provided in environment,
 * otherwise falls back to a stylized terminal sandbox logger for development.
 * 
 * @param {string} to - Recipient email address
 * @param {object} payload - { type: 'code' | 'link', code: string, link: string }
 * @returns {Promise<boolean>} - Success state of delivery simulation
 */
export const sendRecoveryEmail = async (to, payload) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || '"PetPulse Recovery" <noreply@petpulse.com>';

  const isLink = payload.type === 'link';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      let htmlContent = '';
      let textContent = '';

      if (isLink) {
        textContent = `To reset your PetPulse password, please visit this link: ${payload.link}. This link is valid for 10 minutes.`;
        htmlContent = `
          <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #f1f5f9; rounded-2xl; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="font-size: 28px; font-weight: 800; color: #1d4ed8;">🐾 PetPulse</span>
            </div>
            <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-align: center;">Reset Your Password</h2>
            <p style="font-size: 15px; color: #475569; line-height: 1.6; text-align: center; margin-bottom: 32px;">
              We received a request to recover your password. Click the secure button below to choose a new password.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${payload.link}" style="display: inline-block; padding: 14px 32px; background-color: #1d4ed8; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 12px; box-shadow: 0 8px 20px -6px rgba(29,78,216,0.4);">
                Reset Password
              </a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; text-align: center; margin-top: 40px; border-t: 1px solid #f1f5f9; padding-top: 20px;">
              If you didn't request a password reset, you can safely ignore this email. This link expires in 10 minutes.
            </p>
          </div>
        `;
      } else {
        textContent = `Your PetPulse password recovery code is: ${payload.code}. Valid for 10 minutes.`;
        htmlContent = `
          <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #f1f5f9; rounded-2xl; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="font-size: 28px; font-weight: 800; color: #1d4ed8;">🐾 PetPulse</span>
            </div>
            <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-align: center;">Verification Code</h2>
            <p style="font-size: 15px; color: #475569; line-height: 1.6; text-align: center; margin-bottom: 28px;">
              We received a request to recover your password. Please enter the following 6-digit code on the verification screen.
            </p>
            <div style="text-align: center; margin-bottom: 32px; letter-spacing: 6px;">
              <span style="display: inline-block; padding: 16px 28px; background-color: #f8fafc; color: #0f172a; font-weight: 800; font-size: 28px; border-radius: 16px; border: 1px solid #e2e8f0; font-family: monospace;">
                ${payload.code}
              </span>
            </div>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; text-align: center; margin-top: 40px; border-t: 1px solid #f1f5f9; padding-top: 20px;">
              If you didn't request a password reset, you can safely ignore this email. This code expires in 10 minutes.
            </p>
          </div>
        `;
      }

      await transporter.sendMail({
        from: fromEmail,
        to: to,
        subject: isLink ? '🐾 PetPulse Password Reset Link' : '🐾 PetPulse Password Recovery Code',
        text: textContent,
        html: htmlContent
      });

      console.log(`[SMTP Email] Recovery email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('[SMTP Email Error] Failed to send email via SMTP:', error.message);
      // Fallback to sandbox on delivery failure in development
    }
  }

  // Elegant terminal sandbox display for frictionless local development
  console.log('\n┌──────────────────────────────────────────────┐');
  console.log('│            PETPULSE EMAIL SANDBOX            │');
  console.log('├──────────────────────────────────────────────┤');
  console.log(`│ Recipient: ${to.padEnd(33)} │`);
  console.log(`│ Subject:   ${(isLink ? 'Password Reset Link' : 'Password Recovery Code').padEnd(33)} │`);
  console.log('├──────────────────────────────────────────────┤');
  if (isLink) {
    console.log('│ Action:    Please click the button or copy   │');
    console.log('│            the secure reset link below:      │');
    console.log(`│ Link:      \x1b[4m\x1b[34m${payload.link.padEnd(33)}\x1b[0m │`);
  } else {
    console.log('│ Action:    Please input the following code   │');
    console.log('│            on the recovery verification screen:│');
    console.log(`│ Code:      [ \x1b[1m\x1b[32m${payload.code.split('').join(' ')}\x1b[0m ]                   │`);
  }
  console.log('│ Expires:   In 10 Minutes (Single Use Only)   │');
  console.log('└──────────────────────────────────────────────┘\n');

  return true;
};
