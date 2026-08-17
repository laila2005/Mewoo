/**
 * PetPluse — User Data Services (Supabase)
 * 
 * Two standard functions for inserting data into the `users` table
 * using @supabase/supabase-js:
 * 
 *   1. insertUser()       — Insert a single user
 *   2. insertUsersInBulk() — Insert multiple users in a batch
 * 
 * Both functions use the supabaseAdmin client (service_role key)
 * to bypass Row Level Security for trusted server-side operations.
 */

import { supabaseAdmin } from '../config/supabase.js';
import bcrypt from 'bcryptjs';

/**
 * Insert a single user into the `users` table.
 * 
 * @param {Object} userData - The user data to insert.
 * @param {string} userData.email          - User's email address (required, unique).
 * @param {string} userData.password       - User's plain-text password (will be hashed).
 * @param {string} userData.first_name     - User's first name (required).
 * @param {string} userData.last_name      - User's last name (required).
 * @param {string} [userData.role='owner'] - User role: 'owner' | 'vet' | 'trainer' | 'admin'.
 * @param {string} [userData.phone]        - Phone number.
 * @param {number} [userData.latitude]     - GPS latitude.
 * @param {number} [userData.longitude]    - GPS longitude.
 * @param {string} [userData.bio]          - Short user bio.
 * @param {string} [userData.profile_pic_url] - Profile picture URL.
 * @param {string} [userData.cover_url]    - Cover image URL.
 * @param {string} [userData.neighborhood] - User's neighborhood.
 * @param {string} [userData.push_token]   - Push notification token.
 * 
 * @returns {Promise<Object>} The inserted user row (without password_hash).
 * @throws {Error} If required fields are missing or insertion fails.
 * 
 * @example
 *   const user = await insertUser({
 *     email: 'ahmed@example.com',
 *     password: 'securePass123',
 *     first_name: 'Ahmed',
 *     last_name: 'Hassan',
 *     role: 'owner',
 *     phone: '+201234567890',
 *   });
 *   console.log('Created user:', user.id);
 */
export async function insertUser(userData) {
  const {
    email,
    password,
    first_name,
    last_name,
    role = 'owner',
    phone = null,
    latitude = null,
    longitude = null,
    bio = '',
    profile_pic_url = null,
    cover_url = null,
    neighborhood = null,
    push_token = null,
  } = userData;

  // --- Validation ---
  if (!email || !password || !first_name || !last_name) {
    throw new Error(
      'Missing required fields: email, password, first_name, and last_name are all required.'
    );
  }

  const validRoles = ['owner', 'vet', 'trainer', 'admin'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role "${role}". Must be one of: ${validRoles.join(', ')}`);
  }

  // --- Hash password ---
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // --- Insert into Supabase ---
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      email,
      password_hash,
      first_name,
      last_name,
      role,
      phone,
      latitude,
      longitude,
      bio,
      profile_pic_url,
      cover_url,
      neighborhood,
      push_token,
    })
    .select('id, email, first_name, last_name, role, phone, created_at')
    .single();

  if (error) {
    // Handle unique constraint violation (duplicate email)
    if (error.code === '23505') {
      throw new Error(`A user with email "${email}" already exists.`);
    }
    throw new Error(`Failed to insert user: ${error.message}`);
  }

  return data;
}

/**
 * Insert multiple users into the `users` table in a single batch.
 * 
 * @param {Object[]} usersArray - Array of user data objects.
 *   Each object has the same shape as the `userData` parameter of `insertUser()`.
 *   All objects must include: email, password, first_name, last_name.
 * 
 * @returns {Promise<Object[]>} Array of inserted user rows (without password_hash).
 * @throws {Error} If validation fails or the batch insertion encounters an error.
 * 
 * @example
 *   const users = await insertUsersInBulk([
 *     {
 *       email: 'sara@example.com',
 *       password: 'pass123',
 *       first_name: 'Sara',
 *       last_name: 'Ali',
 *       role: 'owner',
 *     },
 *     {
 *       email: 'dr.khaled@example.com',
 *       password: 'vetPass456',
 *       first_name: 'Khaled',
 *       last_name: 'Ibrahim',
 *       role: 'vet',
 *       phone: '+201098765432',
 *       latitude: 30.0444,
 *       longitude: 31.2357,
 *     },
 *   ]);
 *   console.log(`Inserted ${users.length} users`);
 */
export async function insertUsersInBulk(usersArray) {
  if (!Array.isArray(usersArray) || usersArray.length === 0) {
    throw new Error('usersArray must be a non-empty array of user objects.');
  }

  const validRoles = ['owner', 'vet', 'trainer', 'admin'];

  // --- Validate & hash all passwords ---
  const preparedRows = await Promise.all(
    usersArray.map(async (user, index) => {
      const { email, password, first_name, last_name } = user;

      if (!email || !password || !first_name || !last_name) {
        throw new Error(
          `User at index ${index} is missing required fields (email, password, first_name, last_name).`
        );
      }

      const role = user.role || 'owner';
      if (!validRoles.includes(role)) {
        throw new Error(
          `User at index ${index} has invalid role "${role}". Must be one of: ${validRoles.join(', ')}`
        );
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      return {
        email,
        password_hash,
        first_name,
        last_name,
        role,
        phone: user.phone || null,
        latitude: user.latitude || null,
        longitude: user.longitude || null,
        bio: user.bio || '',
        profile_pic_url: user.profile_pic_url || null,
        cover_url: user.cover_url || null,
        neighborhood: user.neighborhood || null,
        push_token: user.push_token || null,
      };
    })
  );

  // --- Batch insert into Supabase ---
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert(preparedRows)
    .select('id, email, first_name, last_name, role, phone, created_at');

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Bulk insert failed: one or more emails already exist. ${error.message}`);
    }
    throw new Error(`Bulk insert failed: ${error.message}`);
  }

  return data;
}
