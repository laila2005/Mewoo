import { query } from '../config/db.js';

export const logActivity = async ({ level, user_name, role, action, details }) => {
    try {
        const sql = `
            INSERT INTO audit_logs (level, user_name, role, action, details)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const result = await query(sql, [level || 'info', user_name || 'System', role || 'admin', action, details || '']);
        return result.rows[0];
    } catch (err) {
        console.error('Failed to log audit activity to DB:', err);
    }
};

export const logUserActivity = async (req, { level, action, details }) => {
    try {
        if (!req.user) {
            // Log as anonymous or system if not authenticated
            await logActivity({
                level: level || 'info',
                user_name: 'Anonymous User',
                role: 'owner',
                action,
                details
            });
            return;
        }
        const { first_name, last_name, role } = req.user;
        const user_name = `${first_name} ${last_name}`;
        await logActivity({
            level: level || 'info',
            user_name,
            role: role || 'owner',
            action,
            details
        });
    } catch (err) {
        console.error('Failed to log user activity:', err);
    }
};
