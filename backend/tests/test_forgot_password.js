import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { forgotPassword, verifyRecoveryCode, resetPassword } from '../src/controllers/authController.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("❌ ERROR: DATABASE_URL or POSTGRES_URL not found.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

// Helper to query db in tests
const dbQuery = (text, params) => pool.query(text, params);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('🧪 Starting Password Recovery E2E Integration Simulation...\n');

  const testEmail = 'recovery_test@petpluse.com';
  const testPhone = '+19998887777';
  const initialPassword = 'InitialPassword123!';
  const newPassword = 'BrandNewPassword999!';

  try {
    // 1. Clean up old test data
    console.log('🧹 Cleaning up old test users...');
    await dbQuery('DELETE FROM users WHERE email = $1', [testEmail]);

    // 2. Create test user
    console.log('👤 Registering test user with email and phone...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(initialPassword, salt);
    const userRes = await dbQuery(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, 'Recovery', 'Tester', 'owner') RETURNING id`,
      [testEmail, testPhone, passwordHash]
    );
    const testUserId = userRes.rows[0].id;
    console.log(`✅ Test user created with ID: ${testUserId}\n`);

    // 3. Test 1: Email Code Recovery Flow
    console.log('📬 --- TEST 1: EMAIL OTP CODE RECOVERY ---');
    let req = {
      body: {
        deliveryMethod: 'email',
        identifier: testEmail,
        emailMethod: 'code'
      }
    };
    let resData = {};
    let res = {
      status: (code) => {
        resData.status = code;
        return {
          json: (data) => { resData.body = data; }
        };
      }
    };

    await forgotPassword(req, res);
    console.log(`forgotPassword Response Status: ${resData.status}`);
    console.log('forgotPassword Response:', resData.body);

    if (resData.status !== 200) {
      throw new Error(`Test 1 forgotPassword failed with status ${resData.status}`);
    }

    // Capture the generated OTP from database
    const codeRecord = await dbQuery(
      `SELECT * FROM password_recoveries 
       WHERE user_id = $1 AND verification_type = 'email_code' AND is_used = FALSE 
       ORDER BY created_at DESC LIMIT 1`,
      [testUserId]
    );

    if (codeRecord.rows.length === 0) {
      throw new Error('Verification code record not found in database.');
    }
    console.log('Found recovery record in database.');

    // We can't read the hashed code, but let's test rate limiting while we are here!
    console.log('\n🔒 Testing Rate Limiting (Attempting a second request immediately)...');
    let rateResData = {};
    let rateRes = {
      status: (code) => {
        rateResData.status = code;
        return {
          json: (data) => { rateResData.body = data; }
        };
      }
    };
    await forgotPassword(req, rateRes);
    console.log(`Rate limit response status: ${rateResData.status}`);
    console.log('Rate limit response:', rateResData.body);
    if (rateResData.status !== 429) {
      throw new Error(`Expected rate limit 429 status but got ${rateResData.status}`);
    }
    console.log('✅ Rate limiting correctly blocked back-to-back requests!');

    // Since we don't know the generated plaintext code directly from DB, we will fetch it from
    // the logs or we can bypass the hash checking for verify by query, but wait!
    // We can mock checking by inserting a known OTP hash into the database so we can test the verification API!
    console.log('\n✏️ Inserting a known OTP code [123456] hash into DB to test verify api...');
    const knownCode = '123456';
    const knownHash = crypto.createHash('sha256').update(knownCode).digest('hex');
    await dbQuery(
      `UPDATE password_recoveries 
       SET otp_code_hash = $1 
       WHERE id = $2`,
      [knownHash, codeRecord.rows[0].id]
    );

    console.log('Verifying recovery code...');
    let verifyReq = {
      body: {
        identifier: testEmail,
        code: knownCode
      }
    };
    let verifyResData = {};
    let verifyRes = {
      status: (code) => {
        verifyResData.status = code;
        return {
          json: (data) => { verifyResData.body = data; }
        };
      }
    };

    await verifyRecoveryCode(verifyReq, verifyRes);
    console.log(`verifyRecoveryCode Response Status: ${verifyResData.status}`);
    console.log('verifyRecoveryCode Response:', verifyResData.body);

    if (verifyResData.status !== 200 || !verifyResData.body.resetToken) {
      throw new Error('Recovery code verification failed.');
    }
    console.log('✅ OTP Code Verification successful!');

    // Check single-use constraint
    const checkUsed = await dbQuery('SELECT is_used FROM password_recoveries WHERE id = $1', [codeRecord.rows[0].id]);
    console.log(`Is recovery record marked used? ${checkUsed.rows[0].is_used}`);
    if (!checkUsed.rows[0].is_used) {
      throw new Error('Single-use policy violated: record not marked as used.');
    }
    console.log('✅ Single-use policy verified!');

    // Test reset password with the JWT
    console.log('\n🔐 Resetting password using JWT resetToken...');
    let resetReq = {
      body: {
        newPassword: newPassword,
        resetToken: verifyResData.body.resetToken
      }
    };
    let resetResData = {};
    let resetRes = {
      status: (code) => {
        resetResData.status = code;
        return {
          json: (data) => { resetResData.body = data; }
        };
      }
    };

    await resetPassword(resetReq, resetRes);
    console.log(`resetPassword Response Status: ${resetResData.status}`);
    console.log('resetPassword Response:', resetResData.body);

    if (resetResData.status !== 200) {
      throw new Error('Password reset failed.');
    }

    // Verify password update in users table
    const updatedUser = await dbQuery('SELECT password_hash FROM users WHERE id = $1', [testUserId]);
    const isNewMatch = await bcrypt.compare(newPassword, updatedUser.rows[0].password_hash);
    console.log(`Bcrypt validation with new password: ${isNewMatch}`);
    if (!isNewMatch) {
      throw new Error('New password was not properly hashed or stored in database.');
    }
    console.log('✅ Test 1 Passed! Email code recovery E2E fully validated!\n');


    // 4. Test 2: Email Link Recovery Flow
    console.log('🔗 --- TEST 2: EMAIL SECURE LINK RECOVERY ---');
    // Clear recoveries for test
    await dbQuery('DELETE FROM password_recoveries WHERE user_id = $1', [testUserId]);

    let linkReq = {
      body: {
        deliveryMethod: 'email',
        identifier: testEmail,
        emailMethod: 'link'
      }
    };
    let linkResData = {};
    let linkRes = {
      status: (code) => {
        linkResData.status = code;
        return {
          json: (data) => { linkResData.body = data; }
        };
      }
    };

    await forgotPassword(linkReq, linkRes);
    console.log(`forgotPassword (Link) Response Status: ${linkResData.status}`);
    console.log('forgotPassword (Link) Response:', linkResData.body);

    if (linkResData.status !== 200) {
      throw new Error('forgotPassword (Link) request failed.');
    }

    // Grab the token from DB
    const linkRecord = await dbQuery(
      `SELECT * FROM password_recoveries 
       WHERE user_id = $1 AND verification_type = 'email_link' AND is_used = FALSE 
       LIMIT 1`,
      [testUserId]
    );
    if (linkRecord.rows.length === 0) {
      throw new Error('Email link record not found in database.');
    }

    // Since we don't know the raw hex token (which is secure in transit), we can simulate capturing it
    // by creating a known raw hex token and hash, updating DB, then calling resetPassword
    console.log('✏️ Simulating reset link redirection by updating DB with known token hash...');
    const dummyRawToken = crypto.randomBytes(32).toString('hex');
    const dummyHash = crypto.createHash('sha256').update(dummyRawToken).digest('hex');
    await dbQuery(
      `UPDATE password_recoveries 
       SET reset_token_hash = $1 
       WHERE id = $2`,
      [dummyHash, linkRecord.rows[0].id]
    );

    console.log(`Attempting password reset using link token: ${dummyRawToken}`);
    let linkResetReq = {
      body: {
        newPassword: 'EvenNewerPassword123!',
        resetToken: dummyRawToken
      }
    };
    let linkResetResData = {};
    let linkResetRes = {
      status: (code) => {
        linkResetResData.status = code;
        return {
          json: (data) => { linkResetResData.body = data; }
        };
      }
    };

    await resetPassword(linkResetReq, linkResetRes);
    console.log(`resetPassword (Link) Response Status: ${linkResetResData.status}`);
    console.log('resetPassword (Link) Response:', linkResetResData.body);

    if (linkResetResData.status !== 200) {
      throw new Error('Direct link password reset failed.');
    }

    // Verify password update in users table
    const linkUpdatedUser = await dbQuery('SELECT password_hash FROM users WHERE id = $1', [testUserId]);
    const isLinkMatch = await bcrypt.compare('EvenNewerPassword123!', linkUpdatedUser.rows[0].password_hash);
    console.log(`Bcrypt validation with link password: ${isLinkMatch}`);
    if (!isLinkMatch) {
      throw new Error('Link-based password reset was not properly stored.');
    }
    console.log('✅ Test 2 Passed! Email secure link recovery E2E fully validated!\n');

    // Clean up
    console.log('🧹 Cleaning up test user and recovery logs...');
    await dbQuery('DELETE FROM users WHERE id = $1', [testUserId]);
    console.log('🎉 ALL INTEGRATION SIMULATIONS COMPLETED SUCCESSFULLY WITH 100% SUCCESS!');

  } catch (err) {
    console.error('❌ SIMULATION RUN ERROR:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
