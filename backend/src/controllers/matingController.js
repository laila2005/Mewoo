import { query } from '../config/db.js';

// Submit a mating request
export const submitMatingRequest = async (req, res) => {
    try {
        const applicant_id = req.user.id;
        const { pet_id, applicant_pet_id, message } = req.body;

        if (!pet_id || !applicant_pet_id) {
            return res.status(400).json({ error: 'Target pet_id and applicant_pet_id are required' });
        }

        // 1. Fetch target pet and verify it exists and is open for mating
        const targetPetResult = await query('SELECT * FROM pets WHERE id = $1', [pet_id]);
        if (targetPetResult.rows.length === 0) {
            return res.status(404).json({ error: 'Target pet not found' });
        }
        const targetPet = targetPetResult.rows[0];

        if (!targetPet.is_mating) {
            return res.status(400).json({ error: 'This pet is not listed for mating' });
        }

        if (targetPet.owner_id === applicant_id) {
            return res.status(400).json({ error: 'Cannot submit a mating proposal to your own pet' });
        }

        // 2. Fetch applicant pet and verify it exists and belongs to the applicant
        const applicantPetResult = await query('SELECT * FROM pets WHERE id = $1 AND owner_id = $2', [applicant_pet_id, applicant_id]);
        if (applicantPetResult.rows.length === 0) {
            return res.status(404).json({ error: 'Applicant pet not found or unauthorized' });
        }
        const applicantPet = applicantPetResult.rows[0];

        // 3. Verify same species
        if (targetPet.species.toLowerCase() !== applicantPet.species.toLowerCase()) {
            return res.status(400).json({ error: 'Pets must be of the same species for mating' });
        }

        // 4. Verify opposite gender (optional constraint to make the platform premium)
        if (targetPet.gender && applicantPet.gender && targetPet.gender.toLowerCase() === applicantPet.gender.toLowerCase()) {
            return res.status(400).json({ error: 'Mating pets should ideally be of opposite genders' });
        }

        // 5. Check if request already exists
        const checkResult = await query(
            'SELECT * FROM mating_requests WHERE pet_id = $1 AND applicant_pet_id = $2',
            [pet_id, applicant_pet_id]
        );
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ error: 'You have already submitted a proposal for these pets', request: checkResult.rows[0] });
        }

        // 6. Insert mating request
        const insertQuery = `
            INSERT INTO mating_requests (pet_id, applicant_id, applicant_pet_id, message, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING *;
        `;
        const result = await query(insertQuery, [pet_id, applicant_id, applicant_pet_id, message || '']);
        const newRequest = result.rows[0];

        // 7. Create notification for target pet owner
        try {
            const userResult = await query('SELECT first_name, last_name FROM users WHERE id = $1', [applicant_id]);
            const applicantName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
            const title = '🐾 New Mating Proposal';
            const notificationMessage = `${applicantName} proposed their pet ${applicantPet.name} to mate with ${targetPet.name}!`;
            
            await query(
                'INSERT INTO notifications (user_id, type, title, message, action_url) VALUES ($1, $2, $3, $4, $5)',
                [targetPet.owner_id, 'mating_request', title, notificationMessage, '/community?tab=mating']
            );
        } catch (notifErr) {
            console.error('Notification creation failed (non-critical):', notifErr.message);
        }

        // Write dynamic audit log
        try {
            const applicantName = `${req.user.first_name} ${req.user.last_name}`;
            const applicantRole = req.user.role || 'owner';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', applicantName, applicantRole, 'Proposed mating match', `Proposed their pet ${applicantPet.name} to mate with ${targetPet.name}.`]
            );
        } catch (logErr) {
            console.error('Failed to write mating proposal audit log:', logErr);
        }

        res.status(201).json({ message: 'Mating proposal submitted successfully', request: newRequest });
    } catch (error) {
        console.error('Error submitting mating request:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// Get incoming mating requests (submitted by others to user's pets)
export const getIncomingMatingRequests = async (req, res) => {
    try {
        const user_id = req.user.id;

        const sql = `
            SELECT 
                mr.id,
                mr.message,
                mr.status,
                mr.created_at,
                tp.id as target_pet_id,
                tp.name as target_pet_name,
                tp.avatar_url as target_pet_avatar,
                ap.id as applicant_pet_id,
                ap.name as applicant_pet_name,
                ap.species as applicant_pet_species,
                ap.breed as applicant_pet_breed,
                ap.age_years as applicant_pet_age,
                ap.weight_kg as applicant_pet_weight,
                ap.gender as applicant_pet_gender,
                ap.location as applicant_pet_location,
                ap.bio as applicant_pet_bio,
                ap.avatar_url as applicant_pet_avatar,
                u.id as applicant_id,
                u.first_name as applicant_first_name,
                u.last_name as applicant_last_name,
                u.profile_pic_url as applicant_avatar
            FROM mating_requests mr
            JOIN pets tp ON mr.pet_id = tp.id
            JOIN pets ap ON mr.applicant_pet_id = ap.id
            JOIN users u ON mr.applicant_id = u.id
            WHERE tp.owner_id = $1
            ORDER BY mr.created_at DESC
        `;

        const result = await query(sql, [user_id]);
        res.status(200).json({ requests: result.rows });
    } catch (error) {
        console.error('Error fetching incoming mating requests:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// Get outgoing mating requests (submitted by user)
export const getOutgoingMatingRequests = async (req, res) => {
    try {
        const user_id = req.user.id;

        const sql = `
            SELECT 
                mr.id,
                mr.message,
                mr.status,
                mr.created_at,
                tp.id as target_pet_id,
                tp.name as target_pet_name,
                tp.avatar_url as target_pet_avatar,
                tp.gender as target_pet_gender,
                tp.location as target_pet_location,
                tp.breed as target_pet_breed,
                ap.id as applicant_pet_id,
                ap.name as applicant_pet_name,
                ap.avatar_url as applicant_pet_avatar,
                u.id as owner_id,
                u.first_name as owner_first_name,
                u.last_name as owner_last_name,
                u.profile_pic_url as owner_avatar
            FROM mating_requests mr
            JOIN pets tp ON mr.pet_id = tp.id
            JOIN pets ap ON mr.applicant_pet_id = ap.id
            JOIN users u ON tp.owner_id = u.id
            WHERE mr.applicant_id = $1
            ORDER BY mr.created_at DESC
        `;

        const result = await query(sql, [user_id]);
        res.status(200).json({ requests: result.rows });
    } catch (error) {
        console.error('Error fetching outgoing mating requests:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// Approve or reject mating request
export const updateMatingStatus = async (req, res) => {
    try {
        const user_id = req.user.id;
        const request_id = req.params.id;
        const { status } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
        }

        // 1. Fetch request and check ownership of the target pet
        const checkSql = `
            SELECT 
                mr.*,
                tp.name as target_pet_name,
                tp.owner_id as target_owner_id,
                ap.name as applicant_pet_name
            FROM mating_requests mr
            JOIN pets tp ON mr.pet_id = tp.id
            JOIN pets ap ON mr.applicant_pet_id = ap.id
            WHERE mr.id = $1
        `;
        const checkResult = await query(checkSql, [request_id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Mating request not found' });
        }
        const request = checkResult.rows[0];

        if (request.target_owner_id !== user_id) {
            return res.status(403).json({ error: 'Unauthorized to update this mating request' });
        }

        // 2. Update status
        const updateSql = 'UPDATE mating_requests SET status = $1 WHERE id = $2 RETURNING *';
        const updateResult = await query(updateSql, [status, request_id]);
        const updatedRequest = updateResult.rows[0];

        // Fetch target pet owner's name for notification
        const ownerUserQuery = 'SELECT first_name, last_name FROM users WHERE id = $1';
        const ownerUserResult = await query(ownerUserQuery, [user_id]);
        const ownerName = `${ownerUserResult.rows[0].first_name} ${ownerUserResult.rows[0].last_name}`;

        if (status === 'approved') {
            // 3. Automatically unlock chat connectivity!
            // Create an 'accepted' chat request so both users can chat directly
            const chatRequestSql = `
                INSERT INTO chat_requests (sender_id, receiver_id, pet_id, status)
                VALUES ($1, $2, $3, 'accepted')
                ON CONFLICT (sender_id, receiver_id, pet_id) DO UPDATE SET status = 'accepted'
                RETURNING *;
            `;
            await query(chatRequestSql, [request.applicant_id, user_id, request.pet_id]);

            // 4. Create notification for applicant
            try {
                const title = '💖 Mating Proposal Approved!';
                const message = `${ownerName} approved your mating proposal for ${request.target_pet_name} with ${request.applicant_pet_name}! Direct chat is now unlocked.`;
                await query(
                    'INSERT INTO notifications (user_id, type, title, message, action_url) VALUES ($1, $2, $3, $4, $5)',
                    [request.applicant_id, 'mating_approved', title, message, '/messages']
                );

                // Notify via Socket.IO
                const io = req.app.get('io');
                if (io) {
                    io.to(String(request.applicant_id)).emit('chat_request_accepted', {
                        receiver_id: user_id,
                        receiver_name: ownerName,
                        message: `${ownerName} approved your mating proposal! Chat is now unlocked.`
                    });
                }
            } catch (notifErr) {
                console.error('Approval notification failed:', notifErr.message);
            }
        } else {
            // 4. Create notification for applicant (rejected)
            try {
                const title = '🐾 Mating Proposal Update';
                const message = `Unfortunately, your mating proposal for ${request.target_pet_name} with ${request.applicant_pet_name} was declined.`;
                await query(
                    'INSERT INTO notifications (user_id, type, title, message, action_url) VALUES ($1, $2, $3, $4, $5)',
                    [request.applicant_id, 'mating_rejected', title, message, '/community?tab=mating']
                );
            } catch (notifErr) {
                console.error('Rejection notification failed:', notifErr.message);
            }
        }

        // Write dynamic audit log
        try {
            const actorName = `${req.user.first_name} ${req.user.last_name}`;
            const actorRole = req.user.role || 'owner';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [status === 'approved' ? 'success' : 'warning', actorName, actorRole, `Mating request ${status}`, `${status === 'approved' ? 'Approved' : 'Declined'} mating proposal for ${request.target_pet_name} with ${request.applicant_pet_name}.`]
            );
        } catch (logErr) {
            console.error('Failed to write mating status update audit log:', logErr);
        }

        res.status(200).json({ message: `Mating request ${status} successfully`, request: updatedRequest });
    } catch (error) {
        console.error('Error updating mating request status:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
