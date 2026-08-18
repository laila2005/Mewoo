import { query } from '../config/db.js';

/**
 * PetPluse — user-submitted content reports.
 *
 * Deliberately generic: shops need reporting first, but products, community
 * posts and lost-and-found listings reuse the same table and the same admin
 * queue rather than growing their own.
 *
 * Reporting is itself an abuse surface — an unguarded report button is a tool
 * for burying a competitor — so the guards ship with the button, not after it:
 * signed-in only, a fixed reason list, one open report per person per target
 * (enforced by a partial unique index, not just by this check), a daily ceiling,
 * and nobody reporting their own content.
 */

/** Fixed list. Free text goes in `details`, where it cannot become a category. */
export const REPORT_REASONS = {
  scam: 'Scam or fraud',
  counterfeit: 'Counterfeit or misrepresented goods',
  unsafe: 'Unsafe or harmful to animals',
  not_delivered: 'Paid but never delivered',
  offensive: 'Offensive or inappropriate content',
  impersonation: 'Impersonating someone else',
  spam: 'Spam or advertising',
  other: 'Something else',
};

// Owner columns differ per table and one of them is not called what you would
// guess: lost_pets records the person as `reporter_id`, not `user_id`.
const TARGETS = {
  shop:     { table: 'pet_shops',            idCol: 'id', ownerCol: 'owner_id',    labelCol: 'name',     uuidId: true },
  product:  { table: 'marketplace_products', idCol: 'id', ownerCol: null,          labelCol: 'title',    uuidId: false },
  post:     { table: 'community_posts',      idCol: 'id', ownerCol: 'user_id',     labelCol: null,       uuidId: true },
  lost_pet: { table: 'lost_pets',            idCol: 'id', ownerCol: 'reporter_id', labelCol: 'pet_name', uuidId: true },
};

// Postgres raises 22P02 rather than returning no rows when a non-uuid string is
// compared against a uuid column, so a junk id would surface as a 500. Reports
// carry ids from mixed-type tables, so the shape is checked before the query.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_REPORTS_PER_DAY = 10;

/** GET /api/reports/reasons — so the dialog and the server cannot disagree. */
export const getReportReasons = async (_req, res) => {
  res.status(200).json({
    reasons: Object.entries(REPORT_REASONS).map(([key, label]) => ({ key, label })),
  });
};

/** POST /api/reports  { target_type, target_id, reason, details } */
export const createReport = async (req, res) => {
  try {
    const reporterId = req.user.id;
    const targetType = String(req.body?.target_type || '').toLowerCase().trim();
    let targetId = String(req.body?.target_id || '').trim();
    const reason = String(req.body?.reason || '').toLowerCase().trim();
    const details = String(req.body?.details || '').trim().slice(0, 2000);

    const target = TARGETS[targetType];
    if (!target) return res.status(400).json({ error: 'That is not something you can report.' });
    if (!targetId) return res.status(400).json({ error: 'Nothing was selected to report.' });
    if (!REPORT_REASONS[reason]) return res.status(400).json({ error: 'Please choose a reason from the list.' });
    if (reason === 'other' && details.length < 10) {
      return res.status(400).json({ error: 'Please tell us briefly what is wrong.' });
    }

    if (target.uuidId) {
      if (!UUID_RE.test(targetId)) {
        return res.status(404).json({ error: 'We could not find that.' });
      }
      // Normalise case BEFORE the insert. A uuid column compares
      // case-insensitively, so every spelling of an id resolves to the same
      // row — but target_id is TEXT, so the partial unique index enforcing one
      // open report per person per target saw "A0EEBC99-..." and
      // "a0eebc99-..." as different targets. One account could file a shop's
      // worth of duplicate reports by varying the hex case, and the admin's
      // "N reports on this" counter (also an exact text match) would show 1
      // against each — making one attacker look like a crowd.
      targetId = targetId.toLowerCase();
    }

    // The target must exist, or the queue fills with reports about nothing.
    const found = await query(
      `SELECT ${target.idCol} AS id
            ${target.ownerCol ? `, ${target.ownerCol} AS owner_id` : ', NULL AS owner_id'}
            ${target.labelCol ? `, ${target.labelCol} AS label` : ", '' AS label"}
         FROM ${target.table} WHERE ${target.idCol} = $1 LIMIT 1`,
      [targetId]
    );
    if (found.rows.length === 0) return res.status(404).json({ error: 'We could not find that.' });

    if (found.rows[0].owner_id && String(found.rows[0].owner_id) === String(reporterId)) {
      return res.status(400).json({ error: 'You cannot report your own listing.' });
    }

    // A ceiling per person per day. Someone with a genuine grievance never hits
    // ten; someone weaponising the queue does.
    const todays = await query(
      `SELECT COUNT(*)::int AS n FROM content_reports
        WHERE reporter_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [reporterId]
    );
    if (todays.rows[0].n >= MAX_REPORTS_PER_DAY) {
      return res.status(429).json({ error: 'You have sent a lot of reports today. Please try again tomorrow.' });
    }

    try {
      const inserted = await query(
        `INSERT INTO content_reports (target_type, target_id, target_label, reporter_id, reason, details)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [targetType, targetId, found.rows[0].label || null, reporterId, reason, details || null]
      );
      return res.status(201).json({
        report: inserted.rows[0],
        message: 'Thank you — our team will review this.',
      });
    } catch (err) {
      // 23505 is the partial unique index: this person already has an open
      // report on this target. Say so rather than silently creating a duplicate.
      if (err.code === '23505') {
        return res.status(409).json({ error: 'You have already reported this. We are still reviewing it.' });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error creating report:', error);
    return res.status(500).json({ error: 'Could not send that report.' });
  }
};

/** GET /api/admin/reports?status=open — the queue. */
export const listReports = async (req, res) => {
  try {
    const status = String(req.query.status || 'open').toLowerCase();
    if (!['open', 'resolved', 'dismissed', 'all'].includes(status)) {
      return res.status(400).json({ error: 'Unknown status filter.' });
    }
    const params = [];
    let where = '';
    if (status !== 'all') { params.push(status); where = `WHERE r.status = $1`; }

    const rows = await query(
      `SELECT r.*,
              u.first_name  AS reporter_first_name,
              u.last_name   AS reporter_last_name,
              u.email       AS reporter_email,
              a.first_name  AS reviewer_first_name,
              a.last_name   AS reviewer_last_name,
              (SELECT COUNT(*)::int FROM content_reports o
                WHERE o.target_type = r.target_type AND o.target_id = r.target_id) AS reports_on_target
         FROM content_reports r
         JOIN users u ON u.id = r.reporter_id
    LEFT JOIN users a ON a.id = r.reviewed_by
         ${where}
     ORDER BY r.created_at DESC
        LIMIT 200`,
      params
    );

    const counts = await query(
      `SELECT status, COUNT(*)::int AS n FROM content_reports GROUP BY status`
    );

    return res.status(200).json({
      reports: rows.rows,
      counts: Object.fromEntries(counts.rows.map((c) => [c.status, c.n])),
      reasons: REPORT_REASONS,
    });
  } catch (error) {
    console.error('Error listing reports:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * PATCH /api/admin/reports/:id  { status, resolution_note }
 *
 * A report that vanishes teaches customers not to send the next one, so every
 * decision is recorded against the reviewer and written to the audit log.
 */
export const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const status = String(req.body?.status || '').toLowerCase();
    const note = String(req.body?.resolution_note || '').trim().slice(0, 1000);

    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'A report can only be resolved or dismissed.' });
    }

    const updated = await query(
      `UPDATE content_reports
          SET status = $1, resolution_note = $2, reviewed_by = $3, reviewed_at = NOW()
        WHERE id = $4
        RETURNING *`,
      [status, note || null, req.user.id, id]
    );
    if (updated.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const report = updated.rows[0];

    try {
      await query(
        `INSERT INTO audit_logs (level, user_name, role, action, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          status === 'resolved' ? 'warning' : 'info',
          `${req.user.first_name} ${req.user.last_name}`,
          req.user.role || 'admin',
          `Report ${status}`,
          `${REPORT_REASONS[report.reason] || report.reason} — ${report.target_type} "${report.target_label || report.target_id}"${note ? `. Note: ${note}` : ''}`,
        ]
      );
    } catch (logErr) {
      console.error('Failed to write report audit log:', logErr);
    }

    return res.status(200).json({ report });
  } catch (error) {
    console.error('Error resolving report:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

export default { getReportReasons, createReport, listReports, resolveReport };
