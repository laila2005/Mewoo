/**
 * PetPluse — Email notifications for direct messages and connection requests.
 *
 * Both are fire-and-forget: a mail failure must never stop a message being
 * delivered or a request being sent. Callers should NOT await these.
 *
 * Anti-spam matters more here than anywhere else in the product. A chat is a
 * rapid back-and-forth, and one email per message would make PetPluse the thing
 * people mute. So a message email is sent only when the conversation has gone
 * quiet — the recipient is told once that they have something waiting, not once
 * per line typed.
 */

import { query } from '../config/db.js';
import { sendNotificationEmail } from './emailService.js';

// Don't email again if this sender already reached this recipient recently.
const QUIET_PERIOD_MINUTES = Number(process.env.MESSAGE_EMAIL_QUIET_MINUTES) || 30;

const fullName = (r) => `${r?.first_name || ''} ${r?.last_name || ''}`.trim() || 'A PetPluse member';

/**
 * Email the recipient that they have a new direct message.
 * @param {string} senderId
 * @param {string} receiverId
 * @param {string} content   the message body, used only for a short preview
 */
export async function emailOnNewMessage(senderId, receiverId, content) {
  try {
    if (!senderId || !receiverId || senderId === receiverId) return;

    // Quiet-period check: was there an earlier message from this sender to this
    // recipient inside the window? If so they have already been emailed for this
    // burst. Counting only PRIOR messages, so the one just inserted is excluded.
    const recent = await query(
      `SELECT 1 FROM messages
        WHERE sender_id = $1 AND receiver_id = $2
          AND created_at > NOW() - ($3 || ' minutes')::interval
        OFFSET 1 LIMIT 1`,
      [senderId, receiverId, String(QUIET_PERIOD_MINUTES)]
    );
    if (recent.rows.length) return; // already notified during this exchange

    const { rows } = await query(
      `SELECT
         (SELECT email FROM users WHERE id = $2) AS to_email,
         (SELECT first_name FROM users WHERE id = $2) AS to_first_name,
         s.first_name, s.last_name, s.role
       FROM users s WHERE s.id = $1`,
      [senderId, receiverId]
    );
    const row = rows[0];
    if (!row?.to_email) return;

    const sender = fullName(row);
    // A short preview helps the reader decide whether to open it, but the full
    // message stays in the app — email is not the place for private content.
    const preview = String(content || '').replace(/\s+/g, ' ').trim().slice(0, 140);

    await sendNotificationEmail(row.to_email, {
      subject: `${sender} sent you a message on PetPluse`,
      heading: `New message from ${sender}`,
      message:
        `${row.to_first_name ? 'Hi ' + row.to_first_name + ', y' : 'Y'}ou have a new message from <strong>${sender}</strong>.` +
        (preview ? `<br/><br/><em>“${preview}${preview.length >= 140 ? '…' : ''}”</em>` : '') +
        `<br/><br/>Open PetPluse to read it and reply.`,
      ctaLabel: 'Open Conversation',
      // Messages.jsx reads ?user= and opens that thread directly.
      ctaLink: `/messages?user=${senderId}`,
    });
  } catch (err) {
    console.error('New-message email failed (non-fatal):', err.message);
  }
}

/**
 * Email the recipient that someone wants to connect with them.
 * Connection requests are rare and one-per-pair, so there is no quiet period —
 * but a duplicate request should not produce a second email.
 */
export async function emailOnConnectionRequest(senderId, receiverId) {
  try {
    if (!senderId || !receiverId || senderId === receiverId) return;

    const { rows } = await query(
      `SELECT
         (SELECT email FROM users WHERE id = $2) AS to_email,
         (SELECT first_name FROM users WHERE id = $2) AS to_first_name,
         s.first_name, s.last_name, s.role
       FROM users s WHERE s.id = $1`,
      [senderId, receiverId]
    );
    const row = rows[0];
    if (!row?.to_email) return;

    const sender = fullName(row);
    const role = String(row.role || '').toLowerCase();
    const roleLabel = { vet: 'a veterinarian', trainer: 'a trainer', vendor: 'a pet shop' }[role] || 'a pet owner';

    await sendNotificationEmail(row.to_email, {
      subject: `${sender} wants to connect with you on PetPluse`,
      heading: 'New connection request',
      message:
        `${row.to_first_name ? 'Hi ' + row.to_first_name + ', ' : ''}<strong>${sender}</strong> (${roleLabel}) ` +
        `would like to connect with you on PetPluse.<br/><br/>Accept the request to start chatting.`,
      ctaLabel: 'View Request',
      ctaLink: '/messages',
    });
  } catch (err) {
    console.error('Connection-request email failed (non-fatal):', err.message);
  }
}

export default { emailOnNewMessage, emailOnConnectionRequest };
