import { query } from '../config/db.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'missing_key'
});

export const getAnalytics = async (req, res) => {
    try {
        // In a real application, you'd calculate these accurately using complex queries.
        // We'll approximate for the dashboard presentation.
        
        const appointmentsRes = await query('SELECT COUNT(*) as total FROM appointments');
        const totalAppointments = parseInt(appointmentsRes.rows[0].total) || 0;
        
        const usersRes = await query('SELECT COUNT(*) as total FROM users WHERE role = $1', ['owner']);
        const totalUsers = parseInt(usersRes.rows[0].total) || 0;

        const subsRes = await query("SELECT COUNT(*) as count, SUM(price) as total_rev FROM user_subscriptions WHERE status = 'active'");
        const activeSubscriptionsCount = parseInt(subsRes.rows[0].count) || 0;
        const subscriptionRevenue = parseFloat(subsRes.rows[0].total_rev) || 0;

        const mockAvgBookingValue = 85;
        const totalRevenue = (totalAppointments * mockAvgBookingValue) + subscriptionRevenue;

        // Fetch actual AI Triage statistics from database
        const triageTotalRes = await query('SELECT COUNT(*) as total FROM ai_triages');
        const totalTriages = parseInt(triageTotalRes.rows[0].total) || 0;

        const currentWeekRes = await query("SELECT COUNT(*) as count FROM ai_triages WHERE created_at >= NOW() - INTERVAL '7 days'");
        const precedingWeekRes = await query("SELECT COUNT(*) as count FROM ai_triages WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'");
        
        const currentCount = parseInt(currentWeekRes.rows[0].count) || 0;
        const precedingCount = parseInt(precedingWeekRes.rows[0].count) || 0;

        let triageGrowth = '+0%';
        if (precedingCount > 0) {
            const pct = ((currentCount - precedingCount) / precedingCount) * 100;
            triageGrowth = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
        } else if (currentCount > 0) {
            triageGrowth = `+${currentCount}`;
        }

        // Mock growth percentages
        const revenueGrowth = '+12%';
        const bookingValueGrowth = '-2%';
        const customersGrowth = '+5%';
        const serviceFulfillment = '98.2%';

        // Mock detailed service performance
        const servicesPerformance = [
            { id: 1, name: 'Emergency Care', icon: 'medical_information', colorClass: 'primary', bookings: 432, revenue: 45200, growth: '+18.5%', status: 'Trending', statusClass: 'primary/10 text-primary' },
            { id: 2, name: 'Professional Grooming', icon: 'content_cut', colorClass: 'secondary', bookings: 891, revenue: 32150, growth: '+4.2%', status: 'Stable', statusClass: 'surface-container-high text-on-surface-variant' },
            { id: 3, name: 'Behavioral Training', icon: 'pets', colorClass: 'tertiary', bookings: 156, revenue: 12480, growth: '-2.1%', status: 'Declining', statusClass: 'error-container text-on-error-container' },
            { id: 4, name: 'Routine Vaccination', icon: 'health_and_safety', colorClass: 'primary', bookings: 1024, revenue: 25600, growth: '+12.8%', status: 'Trending', statusClass: 'primary/10 text-primary' }
        ];

        res.status(200).json({
            summary: {
                totalRevenue,
                avgBookingValue: mockAvgBookingValue,
                totalUsers,
                activeSubscriptionsCount,
                serviceFulfillment,
                aiTriagesCount: totalTriages,
                growth: {
                    revenue: revenueGrowth,
                    avgBookingValue: bookingValueGrowth,
                    customers: customersGrowth,
                    aiTriages: triageGrowth
                }
            },
            servicesPerformance
        });
    } catch (error) {
        console.error('Error fetching admin analytics:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getUsers = async (req, res) => {
    try {
        const queryText = `
            SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.profile_pic_url,
                   (u.password_hash LIKE 'BANNED:%') as is_banned,
                   COALESCE(vp.status::text, tp.status::text, ps.status::text, 'approved') as verification_status,
                   vp.license_number, vp.clinic_name, tp.specialties, ps.name as shop_name
            FROM users u
            LEFT JOIN vet_profiles vp ON u.id = vp.user_id
            LEFT JOIN trainer_profiles tp ON u.id = tp.user_id
            LEFT JOIN pet_shops ps ON u.id = ps.owner_id
            ORDER BY u.created_at DESC
        `;
        const result = await query(queryText);
        res.status(200).json({ users: result.rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const toggleBanUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_banned } = req.body; // boolean
        
        // Fetch current hash
        const userRes = await query('SELECT password_hash, role FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        if (userRes.rows[0].role === 'admin') {
            return res.status(403).json({ error: 'Cannot ban an admin' });
        }

        let hash = userRes.rows[0].password_hash;
        const currentlyBanned = hash.startsWith('BANNED:');
        
        if (is_banned && !currentlyBanned) {
            hash = 'BANNED:' + hash;
        } else if (!is_banned && currentlyBanned) {
            hash = hash.substring(7); // remove 'BANNED:'
        }
        
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
        res.status(200).json({ message: is_banned ? 'User banned' : 'User unbanned' });
    } catch (error) {
        console.error('Error toggling ban:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        const userRes = await query('SELECT role FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        if (userRes.rows[0].role === 'admin') {
            return res.status(403).json({ error: 'Cannot delete an admin' });
        }

        await query('DELETE FROM users WHERE id = $1', [id]);
        res.status(200).json({ message: 'User permanently deleted' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const verifyProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Check if user is vet or trainer
        const userRes = await query('SELECT role FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const role = userRes.rows[0].role;
        let updateQuery = '';

        if (role === 'vet') {
            updateQuery = 'UPDATE vet_profiles SET status = $1 WHERE user_id = $2 RETURNING *';
        } else if (role === 'trainer') {
            updateQuery = 'UPDATE trainer_profiles SET status = $1 WHERE user_id = $2 RETURNING *';
        } else if (role === 'vendor') {
            updateQuery = 'UPDATE pet_shops SET status = $1 WHERE owner_id = $2 RETURNING *';
        } else {
            return res.status(400).json({ error: 'User is not a professional or vendor' });
        }

        const result = await query(updateQuery, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Professional profile not found' });
        }

        res.status(200).json({ message: `Profile updated to ${status}` });
    } catch (error) {
        console.error('Error updating verification status:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllServices = async (req, res) => {
    try {
        const queryText = `
            SELECT s.*, u.first_name, u.last_name, u.email
            FROM services s
            JOIN users u ON s.provider_id = u.id
            ORDER BY s.created_at DESC
        `;
        const result = await query(queryText);
        res.status(200).json({ services: result.rows });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllBookings = async (req, res) => {
    try {
        const queryText = `
            SELECT b.id, b.status, b.start_time, b.total_price, b.created_at,
                   c.first_name as client_first_name, c.last_name as client_last_name,
                   p.first_name as provider_first_name, p.last_name as provider_last_name,
                   s.title as service_title
            FROM service_bookings b
            JOIN users c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id
            JOIN users p ON s.provider_id = p.id
            ORDER BY b.created_at DESC
        `;
        const result = await query(queryText);
        res.status(200).json({ bookings: result.rows });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllPosts = async (req, res) => {
    try {
        const queryText = `
            SELECT cp.id, cp.content, cp.image_url, cp.created_at, cp.likes_count,
                   u.first_name, u.last_name, u.email, u.profile_pic_url
            FROM community_posts cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.is_soft_deleted = false
            ORDER BY cp.created_at DESC
        `;
        const result = await query(queryText);
        res.status(200).json({ posts: result.rows });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getModerationQueue = async (req, res) => {
    try {
        const queryText = `
            SELECT cp.id, cp.content, cp.image_url, cp.created_at, cp.is_soft_deleted, cp.soft_deleted_reason, cp.is_flagged, cp.flagged_reason, cp.review_requested,
                   u.first_name, u.last_name, u.email, u.profile_pic_url
            FROM community_posts cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.is_soft_deleted = true OR cp.is_flagged = true
            ORDER BY cp.created_at DESC
        `;
        const result = await query(queryText);
        res.status(200).json({ queue: result.rows });
    } catch (error) {
        console.error('Error fetching moderation queue:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const restorePost = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            `UPDATE community_posts 
             SET is_soft_deleted = false, 
                 soft_deleted_reason = null, 
                 is_flagged = false, 
                 flagged_reason = null, 
                 review_requested = false 
             WHERE id = $1 RETURNING *`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Notify the author that their post was restored
        const post = result.rows[0];
        await query(
            `INSERT INTO notifications (user_id, type, title, message, action_url) 
             VALUES ($1, 'system', 'Post Restored', 'Your post was reviewed by administrators and successfully restored to the feed.', '/explore')`,
            [post.user_id]
        );
        
        res.status(200).json({ message: 'Post successfully restored and published' });
    } catch (error) {
        console.error('Error restoring post:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM community_posts WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllSubscriptions = async (req, res) => {
    try {
        const queryText = `
            SELECT us.*, u.first_name, u.last_name, u.email
            FROM user_subscriptions us
            JOIN users u ON us.user_id = u.id
            ORDER BY us.created_at DESC
        `;
        const result = await query(queryText);
        res.status(200).json({ subscriptions: result.rows });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAIInsights = async (req, res) => {
    try {
        // Fetch raw metrics from the DB
        const usersCountRes = await query('SELECT COUNT(*) as total FROM users');
        const totalUsers = parseInt(usersCountRes.rows[0].total) || 0;

        const vetsCountRes = await query("SELECT COUNT(*) as total FROM users WHERE role = 'vet'");
        const totalVets = parseInt(vetsCountRes.rows[0].total) || 0;

        const trainersCountRes = await query("SELECT COUNT(*) as total FROM users WHERE role = 'trainer'");
        const totalTrainers = parseInt(trainersCountRes.rows[0].total) || 0;

        const bookingsCountRes = await query('SELECT COUNT(*) as total FROM service_bookings');
        const totalBookings = parseInt(bookingsCountRes.rows[0].total) || 0;

        const subsRes = await query("SELECT COUNT(*) as count, SUM(price) as total_rev FROM user_subscriptions WHERE status = 'active'");
        const activeSubs = parseInt(subsRes.rows[0].count) || 0;
        const subRevenue = parseFloat(subsRes.rows[0].total_rev) || 0;

        const postsCountRes = await query('SELECT COUNT(*) as total FROM community_posts');
        const totalPosts = parseInt(postsCountRes.rows[0].total) || 0;

        const bannedCountRes = await query("SELECT COUNT(*) as total FROM users WHERE password_hash LIKE 'BANNED:%'");
        const totalBanned = parseInt(bannedCountRes.rows[0].total) || 0;

        const totalRevenue = (totalBookings * 85) + subRevenue;

        const statsPayload = {
            totalUsers,
            totalVets,
            totalTrainers,
            totalBookings,
            activeSubs,
            totalRevenue,
            totalPosts,
            totalBanned
        };

        // If no API key is provided, return structured mock JSON
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'missing_key') {
            const mockInsights = {
                executive_summary: `PetPulse platform metrics are showing exceptionally strong performance! We currently have ${totalUsers} registered users (including ${totalVets} certified veterinarians and ${totalTrainers} behavioral trainers). A total of ${totalBookings} services have been successfully booked, generating a cumulative estimate of $${totalRevenue.toLocaleString()} in revenue. The community remains highly active with ${totalPosts} forum discussions, while the administration has successfully maintained security by banning ${totalBanned} toxic accounts.`,
                key_growths: [
                    "User registration has increased by 15.4% week-over-week.",
                    `Vet bookings are trending upwards, currently at ${totalBookings} completed reservations.`,
                    `Active subscription plans generated $${subRevenue.toLocaleString()} in monthly recurring revenue.`
                ],
                alerts_and_warnings: [
                    totalBanned > 0 ? `${totalBanned} accounts are banned due to violating forum security policies.` : "No accounts currently flagged/banned.",
                    totalVets < 3 ? "Low veterinary density detected. Consider recruiting more certified professionals." : "Professional staffing levels are stable."
                ],
                actionable_recommendations: [
                    "Sponsor highlighted behavioral training courses to boost low-performing categories.",
                    "Integrate automated community badges for top-tier active pet owners.",
                    "Initiate a vet-partnership campaign in low-density districts."
                ]
            };
            return res.status(200).json(mockInsights);
        }

        // Call OpenAI to generate custom insights based on the stats
        const prompt = `You are AdminPulse AI, the intelligent executive command center co-pilot for PetPulse.
Analyze the following platform analytics data:
${JSON.stringify(statsPayload, null, 2)}

Provide high-level, human-like summaries, performance details, warnings, and suggested actions.
Return a valid JSON object ONLY. Do not wrap it in markdown code blocks. The JSON must exactly match this schema:
{
  "executive_summary": "A detailed paragraph summarizing the current health and state of the platform.",
  "key_growths": ["growth insight 1", "growth insight 2", ...],
  "alerts_and_warnings": ["alert 1", "alert 2", ...],
  "actionable_recommendations": ["recommendation 1", "recommendation 2", ...]
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const resultJson = JSON.parse(response.choices[0].message.content.trim());
        res.status(200).json(resultJson);

    } catch (error) {
        console.error('Error generating AI Insights:', error);
        res.status(500).json({ error: 'Failed to generate AI insights' });
    }
};

export const askAIQuery = async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        // Fetch some metadata to pass to the AI as context
        const usersRes = await query("SELECT id, first_name, last_name, email, role, created_at FROM users LIMIT 100");
        const bookingsRes = await query(`
            SELECT b.id, b.status, b.total_price, b.created_at, 
                   s.title as service_title
            FROM service_bookings b
            JOIN services s ON b.service_id = s.id
            LIMIT 50
        `);
        const postsRes = await query("SELECT id, content, likes_count, created_at FROM community_posts LIMIT 50");

        const dbContext = {
            users: usersRes.rows,
            bookings: bookingsRes.rows,
            posts: postsRes.rows
        };

        // If no API key is provided, return structured mock JSON
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'missing_key') {
            // Intelligent keyword search for mock demo
            const q = question.toLowerCase();
            let resultData = [];
            let textAnswer = "";

            if (q.includes('vet') || q.includes('doctor') || q.includes('trainer')) {
                resultData = usersRes.rows.filter(u => u.role === 'vet' || u.role === 'trainer');
                textAnswer = `I found ${resultData.length} registered healthcare/training professionals on PetPulse. Here is the active list:`;
            } else if (q.includes('booking') || q.includes('appointment') || q.includes('revenue')) {
                resultData = bookingsRes.rows;
                textAnswer = `Here are the active service bookings matching your inquiry:`;
            } else if (q.includes('post') || q.includes('community') || q.includes('forum')) {
                resultData = postsRes.rows;
                textAnswer = `Here are the latest community discussions and posts on the platform:`;
            } else {
                resultData = usersRes.rows.slice(0, 5);
                textAnswer = `Query matches general user records. Showing the top registered users:`;
            }

            return res.status(200).json({
                answer: textAnswer,
                data: resultData
            });
        }

        const prompt = `You are AdminPulse AI, the intelligent executive command center co-pilot for PetPulse.
An administrator has asked this question: "${question}"

Analyze the following subset of database records to find the answer:
${JSON.stringify(dbContext, null, 2)}

Provide a clear, helpful natural language answer (markdown formatted) summarizing your findings, and filter/extract the specific records requested.
Return a valid JSON object ONLY. Do not wrap it in markdown code blocks. The JSON must exactly match this schema:
{
  "answer": "Your markdown-formatted natural language explanation or answer.",
  "data": [
     // An array of JSON objects (e.g. filtered user records, bookings, etc.) that directly answer the query
  ]
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const resultJson = JSON.parse(response.choices[0].message.content.trim());
        res.status(200).json(resultJson);

    } catch (error) {
        console.error('Error answering AI query:', error);
        res.status(500).json({ error: 'Failed to process natural language query' });
    }
};

// ── CRUD for Platform Services ──────────────────────────────────────────

export const createAdminService = async (req, res) => {
    try {
        const { provider_id, title, description, category, base_price } = req.body;
        if (!provider_id || !title || !category || !base_price) {
            return res.status(400).json({ error: 'Missing required fields: provider_id, title, category, base_price' });
        }
        const insertQuery = `
            INSERT INTO services (provider_id, title, description, category, base_price, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING *;
        `;
        const result = await query(insertQuery, [provider_id, title, description, category, base_price]);
        res.status(201).json({ service: result.rows[0] });
    } catch (error) {
        console.error('Error creating admin service:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateAdminService = async (req, res) => {
    try {
        const { id } = req.params;
        const { provider_id, title, description, category, base_price, is_active } = req.body;
        const updateQuery = `
            UPDATE services
            SET provider_id = COALESCE($1, provider_id),
                title = COALESCE($2, title),
                description = COALESCE($3, description),
                category = COALESCE($4, category),
                base_price = COALESCE($5, base_price),
                is_active = COALESCE($6, is_active)
            WHERE id = $7
            RETURNING *;
        `;
        const result = await query(updateQuery, [provider_id, title, description, category, base_price, is_active, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        res.status(200).json({ service: result.rows[0] });
    } catch (error) {
        console.error('Error updating admin service:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteAdminService = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM services WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        res.status(200).json({ message: 'Service deleted successfully', service: result.rows[0] });
    } catch (error) {
        console.error('Error deleting admin service:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ── CRUD for Subscription Plans (Packages) ──────────────────────────────

export const createAdminPlan = async (req, res) => {
    try {
        const { id, name, price, frequency, description, features, recommended, color } = req.body;
        if (!id || !name || !price) {
            return res.status(400).json({ error: 'Missing required fields: id, name, price' });
        }
        const insertQuery = `
            INSERT INTO subscription_plans (id, name, price, frequency, description, features, recommended, color)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const result = await query(insertQuery, [id, name, price, frequency || '/month', description, features || [], recommended || false, color || 'blue']);
        res.status(201).json({ plan: result.rows[0] });
    } catch (error) {
        console.error('Error creating admin plan:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateAdminPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, frequency, description, features, recommended, color } = req.body;
        const updateQuery = `
            UPDATE subscription_plans
            SET name = COALESCE($1, name),
                price = COALESCE($2, price),
                frequency = COALESCE($3, frequency),
                description = COALESCE($4, description),
                features = COALESCE($5, features),
                recommended = COALESCE($6, recommended),
                color = COALESCE($7, color)
            WHERE id = $8
            RETURNING *;
        `;
        const result = await query(updateQuery, [name, price, frequency, description, features, recommended, color, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }
        res.status(200).json({ plan: result.rows[0] });
    } catch (error) {
        console.error('Error updating admin plan:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteAdminPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM subscription_plans WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }
        res.status(200).json({ message: 'Plan deleted successfully', plan: result.rows[0] });
    } catch (error) {
        console.error('Error deleting admin plan:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ── CRUD for Marketplace Products ───────────────────────────────────────

export const createAdminProduct = async (req, res) => {
    try {
        const { id, title, description, category, base_price, image, badge } = req.body;
        if (!title || !category || !base_price) {
            return res.status(400).json({ error: 'Missing required fields: title, category, base_price' });
        }
        const prodId = id || `p_${Date.now()}`;
        const insertQuery = `
            INSERT INTO marketplace_products (id, title, description, category, base_price, image, rating, reviews, badge)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
        `;
        const result = await query(insertQuery, [prodId, title, description, category, base_price, image || '', 5.0, 0, badge || null]);
        res.status(201).json({ product: result.rows[0] });
    } catch (error) {
        console.error('Error creating admin product:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateAdminProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, base_price, image, rating, reviews, badge } = req.body;
        const updateQuery = `
            UPDATE marketplace_products
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                base_price = COALESCE($4, base_price),
                image = COALESCE($5, image),
                rating = COALESCE($6, rating),
                reviews = COALESCE($7, reviews),
                badge = COALESCE($8, badge)
            WHERE id = $9
            RETURNING *;
        `;
        const result = await query(updateQuery, [title, description, category, base_price, image, rating, reviews, badge, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(200).json({ product: result.rows[0] });
    } catch (error) {
        console.error('Error updating admin product:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteAdminProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM marketplace_products WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(200).json({ message: 'Product deleted successfully', product: result.rows[0] });
    } catch (error) {
        console.error('Error deleting admin product:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllAdBanners = async (req, res) => {
    try {
        const result = await query(`
            SELECT a.*, u.first_name, u.last_name, u.email, s.name as shop_name 
            FROM ad_banners a
            JOIN users u ON a.vendor_id = u.id
            LEFT JOIN pet_shops s ON u.id = s.owner_id
            ORDER BY a.created_at DESC
        `);
        res.status(200).json({ ads: result.rows });
    } catch (error) {
        console.error('Error fetching all ad banners:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateAdBannerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' | 'rejected'

        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid ad banner status' });
        }

        const result = await query(
            `UPDATE ad_banners SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ad banner not found' });
        }

        const ad = result.rows[0];

        // Send a system notification to the vendor
        const notifTitle = 'Ad Campaign Request Update';
        const notifMsg = status === 'approved' 
            ? `Your ad campaign "${ad.title}" has been approved! You can now proceed to complete payment from your Vendor Dashboard.`
            : `Your ad campaign request "${ad.title}" was declined by administrators.`;
        
        await query(
            `INSERT INTO notifications (user_id, type, title, message, action_url)
             VALUES ($1, 'system', $2, $3, '/vendor-dashboard')`,
            [ad.vendor_id, notifTitle, notifMsg]
        );

        res.status(200).json({ ad, message: `Ad banner status updated to ${status} successfully!` });
    } catch (error) {
        console.error('Error updating ad banner status:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

