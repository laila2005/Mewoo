import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from './src/config/db.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function setupTestUsers() {
    console.log('--- Setting Up Test Users ---');
    
    // Ensure clean state: delete previous test data
    await query('DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['test_author@petpluse.com', 'test_admin@petpluse.com']);
    await query('DELETE FROM community_posts WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['test_author@petpluse.com', 'test_admin@petpluse.com']);
    await query('DELETE FROM users WHERE email IN ($1, $2)', ['test_author@petpluse.com', 'test_admin@petpluse.com']);

    // Create Test Author (User role: owner)
    const authorRes = await query(`
        INSERT INTO users (first_name, last_name, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
    `, ['Alice', 'Author', 'test_author@petpluse.com', 'hashedpassword', 'owner']);
    
    // Create Test Admin (User role: admin)
    const adminRes = await query(`
        INSERT INTO users (first_name, last_name, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
    `, ['Bob', 'Admin', 'test_admin@petpluse.com', 'hashedpassword', 'admin']);

    const author = { id: authorRes.rows[0].id, name: 'Alice Author', email: 'test_author@petpluse.com' };
    const admin = { id: adminRes.rows[0].id, name: 'Bob Admin', email: 'test_admin@petpluse.com' };

    console.log(`Created Test Author: ${author.name} (${author.id})`);
    console.log(`Created Test Admin: ${admin.name} (${admin.id})`);
    
    return { author, admin };
}

async function cleanUpUsers(authorId, adminId) {
    console.log('--- Cleaning Up Test Data ---');
    await query('DELETE FROM notifications WHERE user_id IN ($1, $2)', [authorId, adminId]);
    await query('DELETE FROM community_posts WHERE user_id IN ($1, $2)', [authorId, adminId]);
    await query('DELETE FROM users WHERE id IN ($1, $2)', [authorId, adminId]);
    console.log('Test database cleaned successfully.');
}

async function runTest() {
    let author, admin;
    try {
        const users = await setupTestUsers();
        author = users.author;
        admin = users.admin;

        // Generate JWT Tokens
        const tokenAuthor = jwt.sign({ id: author.id, role: 'owner', email: author.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const tokenAdmin = jwt.sign({ id: admin.id, role: 'admin', email: admin.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        console.log('\n--- Step 1: User creates a clean post ---');
        const cleanPostRes = await fetch(`${API_BASE}/community/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenAuthor}`
            },
            body: JSON.stringify({ content: 'Hello everyone! I love my golden retriever puppy.' })
        });
        
        const cleanPostData = await cleanPostRes.json();
        if (!cleanPostRes.ok) {
            throw new Error(`Failed to create clean post: ${JSON.stringify(cleanPostData)}`);
        }
        
        const cleanPost = cleanPostData.post;
        console.log(`Success: Clean post created with ID: ${cleanPost.id}. is_soft_deleted: ${cleanPost.is_soft_deleted}`);
        if (cleanPost.is_soft_deleted) {
            throw new Error('Clean post should not be soft deleted');
        }

        console.log('\n--- Step 2: User creates a violating post (spam/scam content) ---');
        const badPostRes = await fetch(`${API_BASE}/community/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenAuthor}`
            },
            body: JSON.stringify({ content: 'Get FREE money and instant RICH spam crypto scam guaranteed!' })
        });
        
        const badPostData = await badPostRes.json();
        if (!badPostRes.ok) {
            throw new Error(`Failed to create bad post: ${JSON.stringify(badPostData)}`);
        }
        
        const badPost = badPostData.post;
        console.log(`Success: Bad post created with ID: ${badPost.id}. is_soft_deleted: ${badPost.is_soft_deleted}, Reason: ${badPost.soft_deleted_reason}`);
        if (!badPost.is_soft_deleted) {
            throw new Error('Bad post should be automatically soft deleted by auto-moderator');
        }

        console.log('\n--- Step 3: Fetch public feed and verify soft-deleted post is hidden ---');
        const feedRes = await fetch(`${API_BASE}/community/posts`);
        const feedData = await feedRes.json();
        if (!feedRes.ok) {
            throw new Error(`Failed to get public feed: ${JSON.stringify(feedData)}`);
        }
        
        const publicPosts = feedData.posts || [];
        const hasBadPost = publicPosts.some(p => p.id === badPost.id);
        const hasCleanPost = publicPosts.some(p => p.id === cleanPost.id);
        
        console.log(`Public feed verified. Contains clean post: ${hasCleanPost}, Contains bad post: ${hasBadPost}`);
        if (hasBadPost) {
            throw new Error('Soft-deleted post must NOT be visible on public feed');
        }
        if (!hasCleanPost) {
            throw new Error('Clean post should be visible on public feed');
        }

        console.log('\n--- Step 4: Author fetches their soft-deleted posts ---');
        const myDeletedRes = await fetch(`${API_BASE}/community/posts/deleted`, {
            headers: { Authorization: `Bearer ${tokenAuthor}` }
        });
        const myDeletedData = await myDeletedRes.json();
        if (!myDeletedRes.ok) {
            throw new Error(`Failed to fetch user deleted posts: ${JSON.stringify(myDeletedData)}`);
        }
        
        const myDeletedList = myDeletedData.posts || [];
        const foundBadPost = myDeletedList.some(p => p.id === badPost.id);
        console.log(`Success: User deleted list contains bad post: ${foundBadPost}`);
        if (!foundBadPost) {
            throw new Error('User should be able to view their own soft-deleted posts');
        }

        console.log('\n--- Step 5: Author appeals the soft-deleted post ---');
        const appealRes = await fetch(`${API_BASE}/community/posts/${badPost.id}/appeal`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${tokenAuthor}` }
        });
        const appealData = await appealRes.json();
        if (!appealRes.ok) {
            throw new Error(`Failed to appeal post: ${JSON.stringify(appealData)}`);
        }
        console.log(`Success: Appeal response message: ${appealData.message}`);

        console.log('\n--- Step 6: Admin fetches Moderation Queue and verifies appeal is pending ---');
        const queueRes = await fetch(`${API_BASE}/admin/posts/moderation`, {
            headers: { Authorization: `Bearer ${tokenAdmin}` }
        });
        const queueData = await queueRes.json();
        if (!queueRes.ok) {
            throw new Error(`Failed to load admin moderation queue: ${JSON.stringify(queueData)}`);
        }
        
        const modQueue = queueData.queue || [];
        const queuedItem = modQueue.find(p => p.id === badPost.id);
        if (!queuedItem) {
            throw new Error('Soft-deleted post should be listed in the admin moderation queue');
        }
        console.log(`Success: Found in queue. review_requested: ${queuedItem.review_requested}`);
        if (!queuedItem.review_requested) {
            throw new Error('Queue item should show review_requested = true after appeal');
        }

        console.log('\n--- Step 7: Admin restores the appealed post ---');
        const restoreRes = await fetch(`${API_BASE}/admin/posts/${badPost.id}/restore`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${tokenAdmin}` }
        });
        const restoreData = await restoreRes.json();
        if (!restoreRes.ok) {
            throw new Error(`Failed to restore post: ${JSON.stringify(restoreData)}`);
        }
        console.log(`Success: Restore response message: ${restoreData.message}`);

        console.log('\n--- Step 8: Verify restored post is now visible in public feed ---');
        const feedAfterRestoreRes = await fetch(`${API_BASE}/community/posts`);
        const feedAfterRestoreData = await feedAfterRestoreRes.json();
        if (!feedAfterRestoreRes.ok) {
            throw new Error(`Failed to get public feed after restore: ${JSON.stringify(feedAfterRestoreData)}`);
        }
        
        const publicPostsAfter = feedAfterRestoreData.posts || [];
        const hasRestoredPost = publicPostsAfter.some(p => p.id === badPost.id);
        console.log(`Success: Public feed contains restored post: ${hasRestoredPost}`);
        if (!hasRestoredPost) {
            throw new Error('Restored post should be visible on public feed');
        }

        console.log('\n--- Step 9: Admin hard deletes both posts to leave a clean slate ---');
        const deleteCleanRes = await fetch(`${API_BASE}/admin/posts/${cleanPost.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${tokenAdmin}` }
        });
        const deleteBadRes = await fetch(`${API_BASE}/admin/posts/${badPost.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${tokenAdmin}` }
        });
        
        if (!deleteCleanRes.ok || !deleteBadRes.ok) {
            throw new Error('Failed to clean posts via admin delete');
        }
        console.log('Success: Both posts hard deleted by admin.');

        console.log('\n======================================');
        console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
        console.log('======================================');
        
    } catch (e) {
        console.error('❌ Integration Test Failure:', e);
        process.exit(1);
    } finally {
        if (author && admin) {
            await cleanUpUsers(author.id, admin.id);
        }
        process.exit(0);
    }
}

runTest();
