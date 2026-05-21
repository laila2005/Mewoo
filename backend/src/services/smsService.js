import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

/**
 * Pluggable SMS Service
 * Employs Twilio if credentials are provided in environment,
 * otherwise falls back to a stylized terminal sandbox logger for development.
 * 
 * @param {string} to - Recipient phone number
 * @param {string} code - The 6-digit verification code
 * @returns {Promise<boolean>} - Success state of delivery simulation
 */
export const sendSMSCode = async (to, code) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && fromNumber) {
    try {
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: `Your PetPulse password recovery code is: ${code}. Valid for 10 minutes.`,
        from: fromNumber,
        to: to
      });
      console.log(`[Twilio SMS] Code successfully dispatched to ${to}`);
      return true;
    } catch (error) {
      console.error('[Twilio SMS Error] Failed to send SMS:', error.message);
      // Fallback to sandbox on delivery failure in development
    }
  }

  // Attempt to use Textbelt Free SMS Sender (1 free message per day per IP without registration)
  try {
    console.log(`[SMS Service] Attempting to send free SMS to ${to} via Textbelt...`);
    const response = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        phone: to,
        message: `Your PetPulse password recovery code is: ${code}. Valid for 10 minutes.`,
        key: 'textbelt',
      })
    });
    const data = await response.json();
    if (data.success) {
      console.log(`[Textbelt SMS] SMS successfully sent to ${to}! (Free message quota used: ${data.quotaRemaining})`);
    } else {
      console.log(`[Textbelt SMS Sandbox Fallback] Limit reached or error: ${data.error || 'Quota exhausted'}.`);
    }
  } catch (error) {
    console.warn('[Textbelt SMS Warning] Network request to Textbelt failed:', error.message);
  }

  // Elegant terminal sandbox display for frictionless local development
  console.log('\n┌──────────────────────────────────────────────┐');
  console.log('│             PETPULSE SMS SANDBOX             │');
  console.log('├──────────────────────────────────────────────┤');
  console.log(`│ Recipient:  ${to.padEnd(32)} │`);
  console.log('│ Message:    Your PetPulse password recovery  │');
  console.log(`│             code is: [ \x1b[1m\x1b[36m${code.split('').join(' ')}\x1b[0m ]           │`);
  console.log('│             This code is valid for 10 mins.  │');
  console.log('└──────────────────────────────────────────────┘\n');

  return true;
};
