import { query } from '../src/config/db.js';

const migrate = async () => {
    try {
        console.log('🚀 Starting subscription_plans migration...');

        // 1. Add target_role column to subscription_plans
        console.log('📋 Adding target_role column...');
        await query(`
            ALTER TABLE subscription_plans 
            ADD COLUMN IF NOT EXISTS target_role VARCHAR(50) DEFAULT 'owner';
        `);
        console.log('✅ target_role column added or already exists.');

        // 2. Define standard and professional plans
        console.log('🌱 Seeding plans with target_role...');
        const plans = [
            // Owners (Standard)
            {
                id: 'tier_starter',
                name: 'The Puppy Starter',
                price: 450,
                frequency: '/month',
                description: 'Perfect for new pet parents navigating the puppy phase.',
                features: ['Teething Toys', 'Training Treats', 'Puppy Wellness Guide', 'Basic Grooming Kit'],
                recommended: false,
                color: 'blue',
                target_role: 'owner'
            },
            {
                id: 'tier_chewer',
                name: 'Premium Chewers Club',
                price: 650,
                frequency: '/month',
                description: 'Heavy-duty durability for large or aggressive chewers.',
                features: ['2 Ultra-Tough Toys', 'Long-lasting Chews', 'Joint Health Supplements', 'Dental Care Kit'],
                recommended: true,
                color: 'indigo',
                target_role: 'owner'
            },
            {
                id: 'tier_senior',
                name: 'Senior Wellness Box',
                price: 550,
                frequency: '/month',
                description: 'Tailored comfort and health support for aging pets.',
                features: ['Orthopedic Comfort Items', 'Digestive Supplements', 'Soft Baked Treats', 'Vet-Approved Vitamins'],
                recommended: false,
                color: 'emerald',
                target_role: 'owner'
            },
            // Vets
            {
                id: 'vet_starter',
                name: 'Clinic Starter',
                price: 300,
                frequency: '/month',
                description: 'Essential digital presence and standard booking management for veterinary clinics.',
                features: ['Digital Profile & Hours', 'Basic Appointment Booking', 'Email Notifications', 'Standard Map Pin'],
                recommended: false,
                color: 'teal',
                target_role: 'vet'
            },
            {
                id: 'vet_professional',
                name: 'Clinic Professional',
                price: 800,
                frequency: '/month',
                description: 'All-inclusive package for maximum clinic growth, priority search and telehealth tools.',
                features: ['Verified Telehealth Portal', 'Priority Glowing Map Pin', 'Premium Profile Badge', 'Unlimited Appointments', 'SMS Reminders'],
                recommended: true,
                color: 'emerald',
                target_role: 'vet'
            },
            // Vendors
            {
                id: 'vendor_essential',
                name: 'Marketplace Essential',
                price: 400,
                frequency: '/month',
                description: 'Establish your storefront and list your pet products on the Egypt Marketplace.',
                features: ['Storefront Profile', 'Up to 20 Product Listings', 'Standard Checkout Integration', 'Basic Analytics Dashboard'],
                recommended: false,
                color: 'rose',
                target_role: 'vendor'
            },
            {
                id: 'vendor_powerhouse',
                name: 'Marketplace Powerhouse',
                price: 1200,
                frequency: '/month',
                description: 'For established retailers seeking dominance with ads, unlimited catalog, and advanced analytics.',
                features: ['Unlimited Product Listings', 'Sponsored Storefront Pin', 'Priority Listing Boosts', 'Advanced Sales Analytics', 'Monthly Featured Spotlight'],
                recommended: true,
                color: 'indigo',
                target_role: 'vendor'
            },
            // Trainers
            {
                id: 'trainer_standard',
                name: 'Academy Standard',
                price: 250,
                frequency: '/month',
                description: 'Essential platform exposure and booking schedule for certified animal behaviorists.',
                features: ['Certified Trainer Badge', 'Standard Class Booking', 'Client Chat Access', 'Standard Directory Listing'],
                recommended: false,
                color: 'violet',
                target_role: 'trainer'
            },
            {
                id: 'trainer_elite',
                name: 'Master Academy Elite',
                price: 600,
                frequency: '/month',
                description: 'Premium exposure for top academies offering complex group classes, glow status and boosted leads.',
                features: ['Priority Glowing Map Pin', 'Premium "Elite Trainer" Badge', 'Group Class Scheduling', 'Unlimited Clients', 'Advanced Client Progress Tracking'],
                recommended: true,
                color: 'violet',
                target_role: 'trainer'
            }
        ];

        for (const plan of plans) {
            await query(`
                INSERT INTO subscription_plans (id, name, price, frequency, description, features, recommended, color, target_role)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    price = EXCLUDED.price,
                    frequency = EXCLUDED.frequency,
                    description = EXCLUDED.description,
                    features = EXCLUDED.features,
                    recommended = EXCLUDED.recommended,
                    color = EXCLUDED.color,
                    target_role = EXCLUDED.target_role;
            `, [plan.id, plan.name, plan.price, plan.frequency, plan.description, plan.features, plan.recommended, plan.color, plan.target_role]);
        }

        console.log('✅ Seeding complete. All plans loaded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
