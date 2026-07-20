/**
 * PetPulse — Test Script for userSupabaseService.js
 * 
 * Tests both insertUser() and insertUsersInBulk() against the live Supabase database.
 * 
 * Usage:
 *   node tests/test_user_supabase.js
 * 
 * Required env vars in backend/.env:
 *   SUPABASE_URL=https://sffdyrgnqruvjmecvveu.supabase.co
 *   SUPABASE_ANON_KEY=<your-anon-key>
 *   SUPABASE_SERVICE_KEY=<your-service-role-key>
 */

import { insertUser, insertUsersInBulk } from '../src/services/userSupabaseService.js';

const timestamp = Date.now();

async function testInsertUser() {
  console.log('\n── Test 1: insertUser() ──────────────────────────');
  try {
    const user = await insertUser({
      email: `test-single-${timestamp}@petpulse.dev`,
      password: 'TestPassword123!',
      first_name: 'Test',
      last_name: 'User',
      role: 'owner',
      phone: '+201000000001',
      bio: 'Inserted by test script',
    });
    console.log('✅ Single user inserted successfully:');
    console.log(JSON.stringify(user, null, 2));
    return user;
  } catch (err) {
    console.error('❌ insertUser failed:', err.message);
    return null;
  }
}

async function testInsertUsersInBulk() {
  console.log('\n── Test 2: insertUsersInBulk() ───────────────────');
  try {
    const users = await insertUsersInBulk([
      {
        email: `test-bulk-1-${timestamp}@petpulse.dev`,
        password: 'BulkPass123!',
        first_name: 'Bulk',
        last_name: 'UserOne',
        role: 'owner',
      },
      {
        email: `test-bulk-2-${timestamp}@petpulse.dev`,
        password: 'BulkPass456!',
        first_name: 'Bulk',
        last_name: 'UserTwo',
        role: 'vet',
        phone: '+201000000002',
        latitude: 30.0444,
        longitude: 31.2357,
      },
    ]);
    console.log(`✅ Bulk insert: ${users.length} users inserted successfully:`);
    console.log(JSON.stringify(users, null, 2));
    return users;
  } catch (err) {
    console.error('❌ insertUsersInBulk failed:', err.message);
    return null;
  }
}

async function testValidation() {
  console.log('\n── Test 3: Validation (should fail) ──────────────');
  try {
    await insertUser({ email: 'missing@fields.com' });
    console.error('❌ Should have thrown but did not.');
  } catch (err) {
    console.log('✅ Validation error caught:', err.message);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   PetPulse — Supabase User Insertion Tests      ║');
  console.log('╚══════════════════════════════════════════════════╝');

  await testInsertUser();
  await testInsertUsersInBulk();
  await testValidation();

  console.log('\n── All tests complete ────────────────────────────\n');
  process.exit(0);
}

main();
