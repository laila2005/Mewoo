/**
 * PetPluse — Clinic team management (Vet Tools, Epic 1.1).
 * A vet creates/enables/disables/removes an assistant (secretary) seat tied to
 * their clinic. Assistants get a reception role (accept/cancel appointments)
 * without full vet access. All actions are vet-owned and audit-logged.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { sendNotificationEmail } from '../services/emailService.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ASSISTANTS = 5;

async function audit(req, action, details) {
  try {
    const name = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Vet';
    await query(
      `INSERT INTO audit_logs (level, user_name, role, action, details) VALUES ($1, $2, $3, $4, $5)`,
      ['info', name, req.user.role || 'vet', action, details]
    );
  } catch (e) { console.warn('[clinic] audit failed:', e.message); }
}

/** Vet creates an assistant seat. Emails a temp password to the assistant. */
export const createAssistant = async (req, res) => {
  try {
    const vetId = req.user.id;
    const first_name = String(req.body?.first_name || '').trim();
    const last_name = String(req.body?.last_name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'First name, last name and email are required.' });
    }
    if (!EMAIL_RE.test(email) || email.length > 255) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const { rows: existing } = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }

    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS n FROM users WHERE manager_vet_id = $1 AND role = 'clinic_assistant'`,
      [vetId]
    );
    if (countRows[0].n >= MAX_ASSISTANTS) {
      return res.status(400).json({ error: `You can have at most ${MAX_ASSISTANTS} assistant seats.` });
    }

    const tempPassword = `PetPluse-${crypto.randomBytes(4).toString('hex')}`;
    const password_hash = await bcrypt.hash(tempPassword, await bcrypt.genSalt(12));

    const { rows } = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, manager_vet_id, assistant_disabled, email_verified)
       VALUES ($1, $2, $3, $4, 'clinic_assistant', $5, FALSE, TRUE)
       RETURNING id, email, first_name, last_name, assistant_disabled, created_at`,
      [email, password_hash, first_name, last_name, vetId]
    );
    const assistant = rows[0];

    // Email the assistant their sign-in details (best-effort — never logged).
    try {
      const clinicName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'your clinic';
      await sendNotificationEmail(email, {
        subject: 'Your PetPluse assistant account',
        heading: 'Welcome to the clinic team',
        message: `${clinicName} added you as a reception assistant on PetPluse.\n\nSign in with:\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nPlease change your password after your first sign-in.`,
        ctaLabel: 'Sign in to PetPluse',
        ctaLink: '/login',
      });
    } catch (e) { console.warn('[clinic] assistant invite email failed:', e.message); }

    await audit(req, 'Created clinic assistant', `Added assistant ${first_name} ${last_name} (${email}).`);

    // temporary_password returned once so the vet can share it if email didn't arrive.
    res.status(201).json({ assistant, temporary_password: tempPassword });
  } catch (error) {
    console.error('Error creating assistant:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

/** List the vet's assistant seats. */
export const listAssistants = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, first_name, last_name, email, assistant_disabled, created_at
         FROM users WHERE manager_vet_id = $1 AND role = 'clinic_assistant'
        ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.status(200).json({ assistants: rows });
  } catch (error) {
    console.error('Error listing assistants:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

/** Enable or disable an assistant seat (blocks their sign-in while disabled). */
export const setAssistantStatus = async (req, res) => {
  try {
    const disabled = req.body?.disabled === true || req.body?.disabled === 'true';
    const { rows } = await query(
      `UPDATE users SET assistant_disabled = $1
        WHERE id = $2 AND manager_vet_id = $3 AND role = 'clinic_assistant'
        RETURNING id, first_name, last_name, email, assistant_disabled`,
      [disabled, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assistant not found.' });
    await audit(req, disabled ? 'Disabled clinic assistant' : 'Enabled clinic assistant', `${rows[0].email}`);
    res.status(200).json({ assistant: rows[0] });
  } catch (error) {
    console.error('Error updating assistant status:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

/** Remove an assistant seat entirely (only the vet's own, only assistants). */
export const removeAssistant = async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM users WHERE id = $1 AND manager_vet_id = $2 AND role = 'clinic_assistant' RETURNING email`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assistant not found.' });
    await audit(req, 'Removed clinic assistant', `${rows[0].email}`);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error removing assistant:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};
