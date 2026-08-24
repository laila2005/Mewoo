import pg from 'pg';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});


async function testAdminAi() {
    console.log("=== STARTING programmatical admin dashboard AI E2E test ===");
    const client = await pool.connect();
    try {
        // 1. Find or create an admin user
        let adminRes = await client.query("SELECT id, email, role, first_name, last_name FROM users WHERE role = 'admin' LIMIT 1");
        let adminUser;

        if (adminRes.rows.length === 0) {
            console.log("No admin user found. Creating a temporary test admin...");
            const insertRes = await client.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, role)
                VALUES ('temp.admin@petpluse.com', 'MOCK_HASH', 'System', 'Admin', 'admin')
                RETURNING id, email, role, first_name, last_name
            `);
            adminUser = insertRes.rows[0];
            console.log("Created test admin:", adminUser.email);
        } else {
            adminUser = adminRes.rows[0];
            console.log("Found existing admin user:", adminUser.email);
        }

        // 2. Sign JWT token for the admin
        const payload = {
            id: adminUser.id,
            email: adminUser.email,
            role: adminUser.role,
            first_name: adminUser.first_name,
            last_name: adminUser.last_name,
            profile_pic_url: null
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
        console.log("Signed Admin JWT successfully. Token length:", token.length);

        // 3. Verify AI Insights Route
        console.log("\nTesting GET /api/admin/ai/insights...");
        const insightsRes = await fetch("http://localhost:5000/api/admin/ai/insights", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const insights = await insightsRes.json();
        if (!insightsRes.ok) {
            console.error(`FAILED to fetch AI insights! Status: ${insightsRes.status}`);
            console.error(insights);
            process.exit(1);
        }

        console.log("SUCCESS! AI Insights returned successfully.");
        console.log("Executive Summary:", insights.executive_summary ? "Present" : "Missing");
        console.log("Key Growths Count:", insights.key_growths?.length);
        console.log("Alerts/Warnings Count:", insights.alerts_and_warnings?.length);
        console.log("Actionable Recommendations Count:", insights.actionable_recommendations?.length);

        if (!insights.executive_summary || !insights.key_growths || !insights.actionable_recommendations) {
            console.error("FAILED! Missing crucial elements in AI insights payload.");
            process.exit(1);
        }

        // 4. Verify AI Copilot Natural Language Queries Route
        console.log("\nTesting POST /api/admin/ai/query...");
        const queryPayload = {
            question: "Who are the doctors registered in Cairo Pet Clinic?"
        };
        
        const queryRes = await fetch("http://localhost:5000/api/admin/ai/query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(queryPayload)
        });

        const queryResult = await queryRes.json();
        if (!queryRes.ok) {
            console.error(`FAILED to execute AI query! Status: ${queryRes.status}`);
            console.error(queryResult);
            process.exit(1);
        }

        console.log("SUCCESS! AI Copilot Query resolved successfully.");
        console.log("AI Answer:", queryResult.answer);
        console.log("Data Rows Returned:", queryResult.data?.length);

        if (!queryResult.answer || !Array.isArray(queryResult.data)) {
            console.error("FAILED! AI Query response format is incorrect.");
            process.exit(1);
        }

        // 5. Clean up temporary admin if we created it
        if (adminUser.email === 'temp.admin@petpluse.com') {
            await client.query("DELETE FROM users WHERE email = 'temp.admin@petpluse.com'");
            console.log("\nCleaned up temporary test admin user.");
        }

        console.log("\n=== ALL Admin AI E2E Tests PASSED successfully! ===");
        process.exit(0);
    } catch (err) {
        console.error("E2E Test encountered exception:", err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

testAdminAi();
