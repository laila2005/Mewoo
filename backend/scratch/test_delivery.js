import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

function printUsage() {
  console.log('\n🐾 PETPLUSE INTEGRATION TEST UTILITY 🐾');
  console.log('======================================');
  console.log('Usage:');
  console.log('  node test_delivery.js --info                  : Inspect environment variables');
  console.log('  node test_delivery.js --set-phone <em|ph>     : Set phone number for lolo@gmail.com');
  console.log('                                                  Example: node test_delivery.js --set-phone +1234567890');
  console.log('  node test_delivery.js --test-email <email>   : Send a real SMTP recovery email');
  console.log('  node test_delivery.js --test-sms <phone>     : Send a real Twilio recovery SMS');
  console.log('======================================\n');
}

async function handleInfo() {
  console.log('\n🔍 ENVIRONMENT DIAGNOSTICS:');
  console.log('---------------------------');
  console.log(`Database URL:        ${connectionString ? '✅ CONFIGURATION FOUND' : '❌ MISSING'}`);
  console.log(`SMTP Host:           ${process.env.SMTP_HOST || '❌ MISSING (Using local terminal fallback)'}`);
  console.log(`SMTP Port:           ${process.env.SMTP_PORT || '587 (Default)'}`);
  console.log(`SMTP User:           ${process.env.SMTP_USER || '❌ MISSING'}`);
  console.log(`SMTP Pass:           ${process.env.SMTP_PASS ? '✅ CONFIGURED (Hidden)' : '❌ MISSING'}`);
  console.log(`SMTP From:           ${process.env.SMTP_FROM || '❌ MISSING (Default: "PetPluse Recovery" <noreply@petpluse.com>)'}`);
  console.log(`Twilio Account SID:  ${process.env.TWILIO_ACCOUNT_SID || '❌ MISSING (Using Textbelt / Sandbox)'}`);
  console.log(`Twilio Auth Token:   ${process.env.TWILIO_AUTH_TOKEN ? '✅ CONFIGURED (Hidden)' : '❌ MISSING'}`);
  console.log(`Twilio Phone Number: ${process.env.TWILIO_PHONE_NUMBER || '❌ MISSING'}`);
  console.log('---------------------------\n');

  try {
    const res = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`✅ Database connection successful! Total registered users: ${res.rows[0].count}`);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  } finally {
    await pool.end();
  }
}

async function handleSetPhone(phone) {
  const email = 'lolo@gmail.com';
  console.log(`\n🔄 Attempting to update phone for account ${email} to: ${phone}`);
  try {
    const res = await pool.query(
      'UPDATE users SET phone = $1 WHERE email = $2 RETURNING id, email, phone, first_name',
      [phone, email]
    );
    if (res.rows.length === 0) {
      console.log(`❌ User with email ${email} was not found in the database.`);
    } else {
      console.log('✅ Success! User details updated:');
      console.log(JSON.stringify(res.rows[0], null, 2));
    }
  } catch (err) {
    console.error('❌ Error during update:', err.message);
  } finally {
    await pool.end();
  }
}

async function handleTestEmail(toEmail) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || '"PetPluse Recovery" <noreply@petpluse.com>';

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error('\n❌ ERROR: SMTP credentials missing in environment.');
    console.log('Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file.\n');
    await pool.end();
    return;
  }

  console.log(`\n✉️ Sending transactional SMTP test recovery email via ${smtpHost}:${smtpPort}...`);
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const testLink = 'http://localhost:5173/reset-password?token=test_hex_token_xyz_123';
    const htmlContent = `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #f1f5f9; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <span style="font-size: 28px; font-weight: 800; color: #1d4ed8;">🐾 PetPluse</span>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-align: center;">Reset Your Password (Live Provider Test)</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.6; text-align: center; margin-bottom: 32px;">
          This is a live integration test email for the secure password recovery link.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${testLink}" style="display: inline-block; padding: 14px 32px; background-color: #1d4ed8; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 12px;">
            Reset Password
          </a>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject: '🐾 PetPluse Password Recovery Integration Test',
      html: htmlContent
    });

    console.log(`✅ Success! SMTP test email successfully delivered to: ${toEmail}\n`);
  } catch (err) {
    console.error('❌ Failed to send SMTP email:', err.message);
  } finally {
    await pool.end();
  }
}

async function handleTestSMS(toPhone) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('\n❌ ERROR: Twilio credentials missing in environment.');
    console.log('Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your .env file.\n');
    await pool.end();
    return;
  }

  console.log(`\n💬 Dispatching live Twilio SMS test recovery OTP code to ${toPhone} from ${fromNumber}...`);
  try {
    const client = twilio(accountSid, authToken);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    await client.messages.create({
      body: `Your PetPluse password recovery code (Live Provider Integration Test) is: ${code}. Valid for 10 minutes.`,
      from: fromNumber,
      to: toPhone
    });

    console.log(`✅ Success! Real SMS containing test OTP [${code}] sent successfully to: ${toPhone}\n`);
  } catch (err) {
    console.error('❌ Failed to send SMS via Twilio API:', err.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === '--info') {
    await handleInfo();
  } else if (command === '--set-phone' && args[1]) {
    await handleSetPhone(args[1]);
  } else if (command === '--test-email' && args[1]) {
    await handleTestEmail(args[1]);
  } else if (command === '--test-sms' && args[1]) {
    await handleTestSMS(args[1]);
  } else {
    printUsage();
    await pool.end();
  }
}

main();
