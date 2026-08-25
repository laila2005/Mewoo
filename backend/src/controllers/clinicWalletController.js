import { query } from '../config/db.js';
import { isFeatureEnabled } from '../config/featureFlags.js';

const VETS_COMING_SOON = 'Vet booking is coming soon — we are onboarding verified veterinarians. Thanks for your patience!';

/**
 * PetPulse — Clinic Wallet (Phase 1): prepaid credit an owner holds against
 * one specific vet, spendable on appointments at that same clinic.
 *
 * Deposits are recorded the same way the rest of this codebase already
 * simulates payment success (see /api/payments/simulate-success in
 * paymentController.js) — there is no live Paymob wallet-top-up integration
 * yet, so this credits the balance directly rather than pretending to call a
 * gateway that isn't wired in.
 */

/** Get (or lazily create) the wallet for this owner+vet pair. */
const getOrCreateWallet = async (ownerId, vetId) => {
    const existing = await query('SELECT * FROM clinic_wallets WHERE owner_id = $1 AND vet_id = $2', [ownerId, vetId]);
    if (existing.rows.length > 0) return existing.rows[0];
    const created = await query(
        'INSERT INTO clinic_wallets (owner_id, vet_id) VALUES ($1, $2) ON CONFLICT (owner_id, vet_id) DO NOTHING RETURNING *',
        [ownerId, vetId]
    );
    if (created.rows.length > 0) return created.rows[0];
    // Lost the create race to a concurrent request — the row exists now.
    return (await query('SELECT * FROM clinic_wallets WHERE owner_id = $1 AND vet_id = $2', [ownerId, vetId])).rows[0];
};

export const getWallet = async (req, res) => {
    try {
        if (!(await isFeatureEnabled('vets'))) {
            return res.status(403).json({ error: VETS_COMING_SOON, feature: 'vets' });
        }
        const ownerId = req.user.id;
        const { vetId } = req.params;

        const vetCheck = await query(`SELECT id FROM users WHERE id = $1 AND role = 'vet'`, [vetId]);
        if (vetCheck.rows.length === 0) return res.status(404).json({ error: 'Vet not found.' });

        const wallet = await query('SELECT balance FROM clinic_wallets WHERE owner_id = $1 AND vet_id = $2', [ownerId, vetId]);
        const balance = wallet.rows[0]?.balance ?? 0;

        const txns = wallet.rows.length > 0
            ? (await query(
                `SELECT type, amount, appointment_id, created_at FROM clinic_wallet_transactions
                  WHERE wallet_id = (SELECT id FROM clinic_wallets WHERE owner_id = $1 AND vet_id = $2)
                  ORDER BY created_at DESC LIMIT 20`,
                [ownerId, vetId]
              )).rows
            : [];

        res.status(200).json({ balance: Number(balance), transactions: txns });
    } catch (error) {
        console.error('Error fetching clinic wallet:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const depositToWallet = async (req, res) => {
    try {
        if (!(await isFeatureEnabled('vets'))) {
            return res.status(403).json({ error: VETS_COMING_SOON, feature: 'vets' });
        }
        const ownerId = req.user.id;
        const { vetId } = req.params;
        const { amount } = req.body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number.' });
        }
        const vetCheck = await query(`SELECT id FROM users WHERE id = $1 AND role = 'vet'`, [vetId]);
        if (vetCheck.rows.length === 0) return res.status(404).json({ error: 'Vet not found.' });

        const wallet = await getOrCreateWallet(ownerId, vetId);
        const updated = await query(
            'UPDATE clinic_wallets SET balance = balance + $1 WHERE id = $2 RETURNING balance',
            [Number(amount), wallet.id]
        );
        await query(
            `INSERT INTO clinic_wallet_transactions (wallet_id, type, amount) VALUES ($1, 'deposit', $2)`,
            [wallet.id, Number(amount)]
        );

        res.status(200).json({ balance: Number(updated.rows[0].balance) });
    } catch (error) {
        console.error('Error depositing to clinic wallet:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
