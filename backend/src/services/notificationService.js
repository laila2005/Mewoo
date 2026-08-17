/**
 * PetPluse — shared notification helper.
 * Writes an in-app notification and, if an email is given, sends a branded email
 * (best-effort: an email failure never blocks the in-app notification).
 */
import { query } from '../config/db.js';
import { sendNotificationEmail } from './emailService.js';

export async function notifyUser(userId, { type = 'system', title, message, action_url = null, email = null }) {
  await query(
    `INSERT INTO notifications (user_id, type, title, message, action_url) VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, message, action_url]
  );
  if (email) {
    try {
      await sendNotificationEmail(email, {
        subject: title,
        heading: title,
        message,
        ctaLabel: 'Open PetPluse',
        ctaLink: action_url || '/',
      });
    } catch (e) {
      console.warn('[notify] email failed:', e.message);
    }
  }
}

export default { notifyUser };
