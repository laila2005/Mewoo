import { query } from '../config/db.js';

export const submitApplication = async (req, res) => {
    try {
        const { pet_id, applicant_name, applicant_phone, applicant_message, pet_experience, housing_type } = req.body;
        const applicant_id = req.user.id;

        // Get pet and verify applicant is not the owner
        const petResult = await query('SELECT owner_id, name FROM pets WHERE id = $1', [pet_id]);
        if (petResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pet not found' });
        }
        const pet = petResult.rows[0];
        if (pet.owner_id === applicant_id) {
            return res.status(400).json({ error: 'You cannot adopt your own pet' });
        }

        const insertQuery = `
            INSERT INTO adoption_applications (pet_id, applicant_id, owner_id, applicant_name, applicant_phone, applicant_message, pet_experience, housing_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const result = await query(insertQuery, [
            pet_id, applicant_id, pet.owner_id, applicant_name,
            applicant_phone || null, applicant_message || null,
            pet_experience || null, housing_type || null
        ]);

        // Create notification for the pet owner
        try {
            await query(`
                INSERT INTO notifications (user_id, type, title, message, action_url, sender_id)
                VALUES ($1, 'adoption_request', $2, $3, $4, $5)
            `, [
                pet.owner_id,
                'New Adoption Application',
                `${applicant_name} wants to adopt ${pet.name}`,
                `/pet-profile?id=${pet_id}`,
                applicant_id
            ]);
        } catch (notifErr) {
            console.error('Failed to create notification:', notifErr);
        }

        const app = result.rows[0];

        // Write dynamic audit log
        try {
            const applicantName = `${req.user.first_name} ${req.user.last_name}`;
            const applicantRole = req.user.role || 'owner';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', applicantName, applicantRole, 'Submitted pet adoption request', `Applied for ${pet.name} adoption.`]
            );
        } catch (logErr) {
            console.error('Failed to write adoption submission audit log:', logErr);
        }

        res.status(201).json({ application: app });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'You have already applied to adopt this pet' });
        }
        console.error('Error submitting adoption application:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getMyApplications = async (req, res) => {
    try {
        const result = await query(`
            SELECT aa.*, p.name as pet_name, p.species, p.breed, p.avatar_url, p.age_years,
                   u.first_name as owner_first_name, u.last_name as owner_last_name
            FROM adoption_applications aa
            JOIN pets p ON p.id = aa.pet_id
            JOIN users u ON u.id = aa.owner_id
            WHERE aa.applicant_id = $1
            ORDER BY aa.created_at DESC
        `, [req.user.id]);

        res.status(200).json({ applications: result.rows });
    } catch (error) {
        console.error('Error fetching my applications:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getApplicationsForPet = async (req, res) => {
    try {
        const { petId } = req.params;

        // Verify the user owns this pet
        const petCheck = await query('SELECT owner_id FROM pets WHERE id = $1', [petId]);
        if (petCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Pet not found' });
        }
        if (petCheck.rows[0].owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await query(`
            SELECT aa.*, u.first_name, u.last_name, u.email, u.profile_pic_url
            FROM adoption_applications aa
            JOIN users u ON u.id = aa.applicant_id
            WHERE aa.pet_id = $1
            ORDER BY aa.created_at DESC
        `, [petId]);

        res.status(200).json({ applications: result.rows });
    } catch (error) {
        console.error('Error fetching applications for pet:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be approved or rejected' });
        }

        // Verify the user owns the pet associated with this application
        const appCheck = await query(`
            SELECT aa.*, p.owner_id, p.name as pet_name
            FROM adoption_applications aa
            JOIN pets p ON p.id = aa.pet_id
            WHERE aa.id = $1
        `, [id]);

        if (appCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }
        if (appCheck.rows[0].owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const reason = status === 'approved' ? null : (rejection_reason || null);

        const result = await query(
            'UPDATE adoption_applications SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *',
            [status, reason, id]
        );

        // Notify the applicant
        const app = appCheck.rows[0];
        try {
            await query(`
                INSERT INTO notifications (user_id, type, title, message, action_url, sender_id)
                VALUES ($1, 'adoption_update', $2, $3, $4, $5)
            `, [
                app.applicant_id,
                `Adoption Application ${status === 'approved' ? 'Approved! 🎉' : 'Update'}`,
                status === 'approved'
                    ? `Great news! Your application to adopt ${app.pet_name} has been approved!`
                    : `Your application to adopt ${app.pet_name} was not accepted at this time. Reason: ${reason || 'No specific reason was provided.'}`,
                `/pet-profile?id=${app.pet_id}`,
                req.user.id
            ]);
        } catch (notifErr) {
            console.error('Failed to create notification:', notifErr);
        }

        const updatedApp = result.rows[0];

        // Write dynamic audit log
        try {
            const actorName = `${req.user.first_name} ${req.user.last_name}`;
            const actorRole = req.user.role || 'owner';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [status === 'approved' ? 'success' : 'warning', actorName, actorRole, `Adoption application ${status}`, `${status === 'approved' ? 'Approved' : 'Rejected'} adoption application for ${app.pet_name}.`]
            );
        } catch (logErr) {
            console.error('Failed to write adoption status update audit log:', logErr);
        }

        res.status(200).json({ application: updatedApp });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
