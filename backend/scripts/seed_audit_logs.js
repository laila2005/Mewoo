import { query } from '../src/config/db.js';

async function seedAuditLogs() {
    try {
        console.log("Checking if audit_logs table has data...");
        const countRes = await query('SELECT COUNT(*) FROM audit_logs');
        const count = parseInt(countRes.rows[0].count);
        
        if (count > 0) {
            console.log(`Table already contains ${count} rows. Skipping seed.`);
            process.exit(0);
        }

        console.log("Seeding platform historical events audit logs...");
        const insertSql = `
            INSERT INTO audit_logs (timestamp, level, user_name, role, action, details)
            VALUES 
            ('2026-05-23T13:02:11.000Z', 'info', 'Alex Johnson', 'owner', 'Published a new community post', 'Buddy is learning so fast under Jessica Davis!'),
            ('2026-05-23T12:45:00.000Z', 'warning', 'Dr. Sarah Chen', 'vet', 'Flagged vet triage emergency', 'Flagged cardiovascular and breathing symptoms for Milo.'),
            ('2026-05-23T11:30:15.000Z', 'info', 'Jessica Davis', 'trainer', 'Updated specialties in profile builder', 'Added Puppy Foundations and positive reinforcement methodologies.'),
            ('2026-05-23T10:15:32.000Z', 'danger', 'Dave Smith', 'owner', 'Account banned by Admin', 'Reason: Spamming promotional links in Egyptian community feed.'),
            ('2026-05-23T09:42:00.000Z', 'success', 'Paws & Claws Store', 'vendor', 'Processed ad campaign payment', 'Simulated payment of 500 EGP successfully processed for Home Banner.'),
            ('2026-05-23T08:30:00.000Z', 'info', 'Emily Clark', 'owner', 'Registered a new pet profile', 'Added Luna (Cat - Siamese Mix, 6 months old).'),
            ('2026-05-23T07:15:45.000Z', 'info', 'Ahmed Ali', 'owner', 'Submitted product review', '5 stars for Premium Leather Dog Collar: "Excellent quality!"'),
            ('2026-05-22T22:11:00.000Z', 'info', 'Dr. Michael Scott', 'vet', 'Updated clinic location details', 'Updated clinic address: 12 El Nasr Rd, Maadi, Cairo.'),
            ('2026-05-22T20:30:00.000Z', 'warning', 'Dave Smith', 'owner', 'Flagged 3 failed login attempts', 'IP address 197.34.88.21 triggered rate limit warning.'),
            ('2026-05-22T18:45:00.000Z', 'info', 'Paws & Claws Store', 'vendor', 'Registered new business storefront', 'Established Maadi store with tax ID TAX-123456.'),
            ('2026-05-22T16:12:10.000Z', 'info', 'Alex Johnson', 'owner', 'Booked veterinary appointment', 'Scheduled annual vaccination booster slot with Dr. Sarah Chen.'),
            ('2026-05-22T14:05:00.000Z', 'info', 'Emily Clark', 'owner', 'Submitted pet adoption request', 'Applied for Golden Retriever adoption (Milo).'),
            ('2026-05-22T11:22:15.000Z', 'success', 'Dr. Sarah Chen', 'vet', 'Marked appointment completed', 'Successfully finalized appointment #b1 and uploaded clinical charts.'),
            ('2026-05-22T09:00:00.000Z', 'info', 'System Cron', 'admin', 'Database backup completed', 'Automated offsite backup serialized successfully.');
        `;
        
        await query(insertSql);
        console.log("Historical audit logs seeded successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Failed to seed audit logs:", err);
        process.exit(1);
    }
}

seedAuditLogs();
