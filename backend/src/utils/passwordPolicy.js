import bcrypt from 'bcryptjs';

// bcrypt cost — 12 is the current sane default (was 10 across the codebase).
export const BCRYPT_ROUNDS = 12;

// Small denylist of the most common / breached passwords. Kept inline (no heavy
// dependency); covers the passwords that dominate breach corpora. Compared
// case-insensitively, and we also reject anything containing "petpluse"/"mewoo".
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'passw0rd', 'p@ssw0rd', 'p@ssword',
  '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop', '1q2w3e4r',
  'iloveyou', 'admin123', 'welcome1', 'welcome123', 'letmein1', 'abc12345',
  'football1', 'monkey123', 'dragon123', 'sunshine1', 'princess1', 'trustno1',
  'baseball1', 'superman1', 'michael1', 'shadow123', 'master123', 'changeme1',
  'password!', 'qwerty!23', 'aa123456', 'test1234', 'pass1234', 'ashley123',
]);

/**
 * Validate a password against the policy.
 * @returns {{ ok: boolean, error?: string }}
 */
export function validatePasswordStrength(password, { email = '', name = '' } = {}) {
  if (typeof password !== 'string') return { ok: false, error: 'Password is required.' };
  const pw = password;
  if (pw.length < 8) return { ok: false, error: 'Password must be at least 8 characters long.' };
  if (pw.length > 128) return { ok: false, error: 'Password is too long (max 128 characters).' };
  if (!/[a-z]/.test(pw)) return { ok: false, error: 'Password must include a lowercase letter.' };
  if (!/[A-Z]/.test(pw)) return { ok: false, error: 'Password must include an uppercase letter.' };
  if (!/[0-9]/.test(pw)) return { ok: false, error: 'Password must include a number.' };
  if (!/[^A-Za-z0-9]/.test(pw)) return { ok: false, error: 'Password must include a special character.' };

  const lower = pw.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return { ok: false, error: 'That password is too common. Please choose a stronger one.' };
  if (/petpluse|mewoo/.test(lower)) return { ok: false, error: 'Password must not contain the site name.' };

  // Reject the password containing the local-part of the email or the user's name.
  const localPart = (email || '').split('@')[0]?.toLowerCase();
  if (localPart && localPart.length >= 3 && lower.includes(localPart)) {
    return { ok: false, error: 'Password must not contain your email address.' };
  }
  for (const part of (name || '').toLowerCase().split(/\s+/).filter(p => p.length >= 3)) {
    if (lower.includes(part)) return { ok: false, error: 'Password must not contain your name.' };
  }
  return { ok: true };
}

/** Hash a password with the standard cost. */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(password, salt);
}
