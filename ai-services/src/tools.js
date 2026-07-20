/**
 * PetPulse — Agentic Tools (Vercel AI SDK + Zod)
 * 
 * Wraps Supabase operations into Vercel AI SDK tools with Zod schemas.
 * These tools enable Hermes 3 to autonomously:
 *   - Create user accounts (Seamless Onboarding)
 *   - Register pets
 *   - Book vet appointments
 *   - Look up available vets
 */

import { tool } from 'ai';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabaseClient.js';

// ─────────────────────────────────────────────────
// Tool 1: createAccount
// ─────────────────────────────────────────────────
export const createAccount = tool({
  description:
    'Create a new user account in PetPulse. Use this when a user wants to sign up, ' +
    'register, or when they provide their name and email for the first time. ' +
    'Always call this FIRST if the user does not have an account yet. ' +
    'Generate a temporary password for the user automatically.',
  parameters: z.object({
    email: z.string().email().describe('The user\'s email address.'),
    first_name: z.string().describe('The user\'s first name.'),
    last_name: z.string().default('').describe('The user\'s last name. Use empty string if not provided.'),
    role: z.enum(['owner', 'vet', 'trainer', 'admin']).default('owner')
      .describe('The user role. Default is "owner" (pet owner).'),
    phone: z.string().optional().describe('Phone number, if provided.'),
  }),
  execute: async ({ email, first_name, last_name, role, phone }) => {
    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('email', email)
      .single();

    if (existing) {
      return {
        success: true,
        message: `User already exists with email ${email}.`,
        user: existing,
        already_existed: true,
      };
    }

    // Hash a temporary password
    const tempPassword = `PetPulse_${Date.now()}`;
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(tempPassword, salt);

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password_hash,
        first_name,
        last_name: last_name || '',
        role: role || 'owner',
        phone: phone || null,
      })
      .select('id, email, first_name, last_name, role, phone, created_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: `Account created successfully for ${first_name}.`,
      user: data,
      already_existed: false,
    };
  },
});

// ─────────────────────────────────────────────────
// Tool 2: registerPet
// ─────────────────────────────────────────────────
export const registerPet = tool({
  description:
    'Register a pet for a user. A pet record is required before booking a vet appointment. ' +
    'If the user mentions their pet or wants to book an appointment, ensure they have a pet registered first.',
  parameters: z.object({
    owner_id: z.string().uuid().describe('The UUID of the pet owner (from createAccount result).'),
    name: z.string().describe('The pet\'s name.'),
    species: z.string().default('dog').describe('Species of the pet (e.g., "dog", "cat").'),
    breed: z.string().optional().describe('Breed of the pet, if known.'),
    age_years: z.number().int().optional().describe('Age of the pet in years.'),
  }),
  execute: async ({ owner_id, name, species, breed, age_years }) => {
    // Check if pet already exists for this owner with this name
    const { data: existing } = await supabaseAdmin
      .from('pets')
      .select('id, name, species, breed')
      .eq('owner_id', owner_id)
      .ilike('name', name)
      .single();

    if (existing) {
      return {
        success: true,
        message: `Pet "${name}" is already registered.`,
        pet: existing,
        already_existed: true,
      };
    }

    const { data, error } = await supabaseAdmin
      .from('pets')
      .insert({
        owner_id,
        name,
        species: species || 'dog',
        breed: breed || null,
        age_years: age_years || null,
      })
      .select('id, owner_id, name, species, breed, age_years, created_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: `Pet "${name}" registered successfully.`,
      pet: data,
      already_existed: false,
    };
  },
});

// ─────────────────────────────────────────────────
// Tool 3: findAvailableVets
// ─────────────────────────────────────────────────
export const findAvailableVets = tool({
  description:
    'Look up available veterinarians on PetPulse. Call this before booking an appointment ' +
    'to find a vet. Returns a list of approved vets with their clinic info.',
  parameters: z.object({
    limit: z.number().int().default(5).describe('Maximum number of vets to return.'),
  }),
  execute: async ({ limit }) => {
    const { data, error } = await supabaseAdmin
      .from('vet_profiles')
      .select('user_id, clinic_name, license_number, status, users!inner(first_name, last_name, email)')
      .eq('status', 'approved')
      .limit(limit || 5);

    if (error) {
      // Fallback: if the join fails, try fetching vets from users table directly
      const { data: vets, error: vetError } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('role', 'vet')
        .limit(limit || 5);

      if (vetError) {
        return { success: false, error: vetError.message };
      }

      return {
        success: true,
        vets: vets.map(v => ({
          vet_user_id: v.id,
          name: `Dr. ${v.first_name} ${v.last_name}`,
          email: v.email,
        })),
        count: vets.length,
      };
    }

    return {
      success: true,
      vets: (data || []).map(v => ({
        vet_user_id: v.user_id,
        clinic_name: v.clinic_name,
        name: v.users ? `Dr. ${v.users.first_name} ${v.users.last_name}` : 'Unknown',
      })),
      count: (data || []).length,
    };
  },
});

// ─────────────────────────────────────────────────
// Tool 4: bookAppointment
// ─────────────────────────────────────────────────
export const bookAppointment = tool({
  description:
    'Book a vet appointment for a user\'s pet. Requires the pet_id and vet_user_id. ' +
    'If you don\'t have a vet_user_id, call findAvailableVets first. ' +
    'If you don\'t have a pet_id, call registerPet first.',
  parameters: z.object({
    pet_id: z.string().uuid().describe('The UUID of the pet (from registerPet result).'),
    vet_user_id: z.string().uuid().describe('The UUID of the vet user (from findAvailableVets result).'),
    appointment_time: z.string().describe(
      'ISO 8601 datetime string for the appointment (e.g., "2026-07-21T10:00:00Z"). ' +
      'Must be a future date. If the user says "tomorrow", compute tomorrow\'s date.'
    ),
    reason: z.string().default('General check-up').describe('Reason for the appointment.'),
  }),
  execute: async ({ pet_id, vet_user_id, appointment_time, reason }) => {
    const appointmentDate = new Date(appointment_time);
    if (isNaN(appointmentDate.getTime())) {
      return { success: false, error: 'Invalid appointment time format.' };
    }

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        pet_id,
        vet_user_id,
        appointment_time,
        reason: reason || 'General check-up',
        handled_by_ai: true,
      })
      .select('id, pet_id, vet_user_id, status, appointment_time, reason, created_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: `Appointment booked successfully for ${appointmentDate.toLocaleString()}.`,
      appointment: data,
    };
  },
});

/**
 * All tools bundled for use with generateText({ tools: allTools })
 */
export const allTools = {
  createAccount,
  registerPet,
  findAvailableVets,
  bookAppointment,
};
