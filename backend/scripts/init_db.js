import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("❌ ERROR: Neither DATABASE_URL nor POSTGRES_URL was found in the environment variables.");
  console.error("Please add your remote PostgreSQL connection string (e.g. from Neon or Supabase) to your backend/.env file.");
  process.exit(1);
}

// Extract hostname for clean logging (mask credentials)
let dbHost = 'unknown';
try {
  const urlObj = new URL(connectionString);
  dbHost = urlObj.host;
} catch (e) {
  // If connection string format is slightly different
  const match = connectionString.match(/@([^/:]+)/);
  if (match) dbHost = match[1];
}

console.log(`🔌 Initializing database connection pool to remote host: ${dbHost}...`);

const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : {
    rejectUnauthorized: false // Enforce SSL for hosted services like Neon, Supabase, Render, Railway
  },
  max: 5, // Keep small for migration runner
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 15000
});

async function runMigrations() {
  console.log("⏳ Connecting to the remote database and running migrations...");

  try {
    // -------------------------------------------------------------
    // Step 1: Enable Extensions
    // -------------------------------------------------------------
    console.log("\n⚡ Step 1: Enabling PostgreSQL Extensions...");
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    console.log("✅ uuid-ossp and pgcrypto extensions enabled.");

    // -------------------------------------------------------------
    // Step 2: Create Custom Enum Types Safely
    // -------------------------------------------------------------
    console.log("\n⚡ Step 2: Declaring Custom ENUM types...");
    const enums = [
      { name: 'user_role', values: "'owner', 'vet', 'trainer', 'admin'" },
      { name: 'verification_status', values: "'pending', 'approved', 'rejected'" },
      { name: 'appointment_status', values: "'pending', 'confirmed', 'completed', 'cancelled'" },
      { name: 'lost_pet_status', values: "'lost', 'found', 'resolved'" },
      { name: 'found_report_status', values: "'open', 'verified', 'closed'" },
      { name: 'service_category', values: "'walking', 'sitting', 'training'" },
      { name: 'booking_status', values: "'requested', 'accepted', 'in_progress', 'completed', 'cancelled'" },
      { name: 'payment_status', values: "'pending', 'processing', 'completed', 'failed', 'refunded'" },
      { name: 'ai_session_status', values: "'active', 'completed', 'failed'" },
      { name: 'chat_request_status', values: "'pending', 'accepted', 'rejected'" }
    ];

    for (const e of enums) {
      await pool.query(`
        DO $$ BEGIN
          CREATE TYPE ${e.name} AS ENUM (${e.values});
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log(`   - ENUM type ${e.name} verified.`);
    }

    // -------------------------------------------------------------
    // Step 3: Run Core Schema (Idempotent Conversion)
    // -------------------------------------------------------------
    console.log("\n⚡ Step 3: Running core schema.sql...");
    
    // Look up schema.sql location
    const schemaPaths = [
      path.join(__dirname, '../../docs/diagrams/schema.sql'),
      path.join(__dirname, '../docs/diagrams/schema.sql'),
      path.join(__dirname, '../../docs/schema.sql')
    ];
    
    let schemaSql = '';
    for (const p of schemaPaths) {
      if (fs.existsSync(p)) {
        console.log(`   Found schema file at: ${p}`);
        schemaSql = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!schemaSql) {
      console.warn("⚠️ Warning: docs/diagrams/schema.sql not found dynamically. Creating table structures programmatically...");
    } else {
      // Modify schemaSql to ensure CREATE TABLE uses IF NOT EXISTS so it doesn't fail if ran twice.
      // Also remove duplicate CREATE TYPE commands because they were already declared in Step 2.
      let idempotentSchema = schemaSql.replace(/CREATE\s+TABLE\s+([a-zA-Z0-9_]+)/gi, (match, tableName) => {
        return `CREATE TABLE IF NOT EXISTS ${tableName}`;
      });
      idempotentSchema = idempotentSchema.replace(/CREATE\s+TYPE\s+[a-zA-Z0-9_]+\s+AS\s+ENUM\s*\([\s\S]*?\);/gi, '');

      console.log("   Executing base tables...");
      await pool.query(idempotentSchema);
      console.log("✅ Core database tables verified/created.");
    }

    // -------------------------------------------------------------
    // Step 4: Run Incremental Migration Tables (If not already present)
    // -------------------------------------------------------------
    console.log("\n⚡ Step 4: Creating feature-specific tables...");
    
    const incrementalTables = [
      {
        name: "chat_requests",
        query: `
          CREATE TABLE IF NOT EXISTS chat_requests (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
              status chat_request_status DEFAULT 'pending',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(sender_id, receiver_id, pet_id)
          );`
      },
      {
        name: "messages",
        query: `
          CREATE TABLE IF NOT EXISTS messages (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              content TEXT NOT NULL,
              is_read BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );`
      },
      {
        name: "user_subscriptions",
        query: `
          CREATE TABLE IF NOT EXISTS user_subscriptions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              plan_id VARCHAR NOT NULL,
              plan_name VARCHAR NOT NULL,
              status VARCHAR NOT NULL DEFAULT 'active',
              price NUMERIC NOT NULL,
              next_billing_date TIMESTAMP WITH TIME ZONE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );`
      },
      {
        name: "subscription_plans",
        query: `
          CREATE TABLE IF NOT EXISTS subscription_plans (
              id VARCHAR PRIMARY KEY,
              name VARCHAR NOT NULL,
              price NUMERIC NOT NULL,
              frequency VARCHAR NOT NULL DEFAULT '/month',
              description TEXT,
              features TEXT[] NOT NULL DEFAULT '{}',
              recommended BOOLEAN DEFAULT false,
              color VARCHAR NOT NULL DEFAULT 'blue',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );`
      },
      {
        name: "marketplace_products",
        query: `
          CREATE TABLE IF NOT EXISTS marketplace_products (
              id VARCHAR PRIMARY KEY,
              title VARCHAR NOT NULL,
              description TEXT,
              category VARCHAR NOT NULL,
              base_price NUMERIC NOT NULL,
              image VARCHAR,
              rating NUMERIC DEFAULT 5.0,
              reviews INTEGER DEFAULT 0,
              badge VARCHAR,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );`
      },
      {
        name: "ai_triages",
        query: `
          CREATE TABLE IF NOT EXISTS ai_triages (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID REFERENCES users(id) ON DELETE SET NULL,
              pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
              symptoms TEXT NOT NULL,
              result TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );`
      },
      {
        name: "post_likes",
        query: `
          CREATE TABLE IF NOT EXISTS post_likes (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(post_id, user_id)
          );`
      },
      {
        name: "post_comments",
        query: `
          CREATE TABLE IF NOT EXISTS post_comments (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              content TEXT NOT NULL,
              parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );`
      },
      {
        name: "notifications",
        query: `
          CREATE TABLE IF NOT EXISTS notifications (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              type VARCHAR(50) NOT NULL DEFAULT 'system_alert',
              title VARCHAR(255) NOT NULL,
              message TEXT NOT NULL,
              is_read BOOLEAN DEFAULT FALSE,
              action_url VARCHAR(512) DEFAULT '/messages',
              created_at TIMESTAMPTZ DEFAULT NOW()
          );`
      },
      {
        name: "community_post_comments",
        query: `
          CREATE TABLE IF NOT EXISTS community_post_comments (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              content TEXT NOT NULL,
              parent_id UUID REFERENCES community_post_comments(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );`
      },
      {
        name: "comment_reactions",
        query: `
          CREATE TABLE IF NOT EXISTS comment_reactions (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              emoji VARCHAR(10) NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(comment_id, user_id)
          );`
      },
      {
        name: "adoption_applications",
        query: `
          CREATE TABLE IF NOT EXISTS adoption_applications (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
              applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              applicant_name VARCHAR(100) NOT NULL,
              applicant_phone VARCHAR(30),
              applicant_message TEXT,
              pet_experience TEXT,
              housing_type VARCHAR(50),
              status VARCHAR(20) DEFAULT 'pending',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(pet_id, applicant_id)
          );`
      },
      {
        name: "mating_requests",
        query: `
          CREATE TABLE IF NOT EXISTS mating_requests (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
              applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              applicant_pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
              message TEXT,
              status VARCHAR(20) DEFAULT 'pending',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(pet_id, applicant_pet_id)
          );`
      },
      {
        name: "spam_reports",
        query: `
          CREATE TABLE IF NOT EXISTS spam_reports (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(reporter_id, reported_id)
          );`
      }
    ];

    for (const t of incrementalTables) {
      await pool.query(t.query);
      console.log(`   - Table ${t.name} verified/created.`);
    }

    // -------------------------------------------------------------
    // Step 5: Column Alterations & Enhancements
    // -------------------------------------------------------------
    console.log("\n⚡ Step 5: Verifying column extensions & updates...");
    const alterations = [
      // community_posts
      "ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);",
      "ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_soft_deleted BOOLEAN DEFAULT false;",
      "ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS soft_deleted_reason TEXT;",
      "ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;",
      "ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS flagged_reason TEXT;",
      "ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS review_requested BOOLEAN DEFAULT false;",
      
      // vet_profiles
      "ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS cover_url VARCHAR;",
      "ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS custom_sections JSONB DEFAULT '[]'::jsonb;",
      
      // trainer_profiles
      "ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS cover_url VARCHAR;",
      "ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS custom_sections JSONB DEFAULT '[]'::jsonb;",
      
      // users
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic_url VARCHAR;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_location VARCHAR(255);",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url VARCHAR;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS mute_connection_posts BOOLEAN DEFAULT FALSE;",
      
      // payments
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_details JSONB;",
      
      // pets
      "ALTER TABLE pets ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';",
      "ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_adoptable BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_mating BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE pets ADD COLUMN IF NOT EXISTS gender VARCHAR(20);",
      "ALTER TABLE pets ADD COLUMN IF NOT EXISTS location VARCHAR(300);",

      // lost_pets — support standalone reports without requiring pet_id
      "ALTER TABLE lost_pets ALTER COLUMN pet_id DROP NOT NULL;",
      "ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS pet_name VARCHAR(100);",
      "ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS species VARCHAR(50);",
      "ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS breed VARCHAR(100);",
      "ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);",
      "ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS last_seen_location VARCHAR(300);",
      "ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(30);",
      "ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS reporter_id UUID;",
      "ALTER TABLE lost_pets ALTER COLUMN latitude DROP NOT NULL;",
      "ALTER TABLE lost_pets ALTER COLUMN longitude DROP NOT NULL;",
      "ALTER TABLE lost_pets ALTER COLUMN lost_time DROP NOT NULL;",

      // pets — adoption enhancements
      "ALTER TABLE pets ADD COLUMN IF NOT EXISTS adoption_description TEXT;",
      "ALTER TABLE pets ADD COLUMN IF NOT EXISTS adoption_fee NUMERIC DEFAULT 0;",
      "ALTER TABLE pets ADD COLUMN IF NOT EXISTS gender VARCHAR(10);",
      "ALTER TABLE pets ADD COLUMN IF NOT EXISTS location VARCHAR(200);",

      // adoption applications — rejection reason
      "ALTER TABLE adoption_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;"
    ];

    for (const alt of alterations) {
      await pool.query(alt);
    }
    console.log("✅ Column alterations synced.");

    // -------------------------------------------------------------
    // Step 6: Seed Standard Business Metadata (Plans & Products)
    // -------------------------------------------------------------
    console.log("\n⚡ Step 6: Seeding standard products and subscription plans...");
    
    // Plans
    const plans = [
      {
        id: 'tier_starter',
        name: 'The Puppy Starter',
        price: 450,
        frequency: '/month',
        description: 'Perfect for new pet parents navigating the puppy phase.',
        features: ['Teething Toys', 'Training Treats', 'Puppy Wellness Guide', 'Basic Grooming Kit'],
        recommended: false,
        color: 'blue'
      },
      {
        id: 'tier_chewer',
        name: 'Premium Chewers Club',
        price: 650,
        frequency: '/month',
        description: 'Heavy-duty durability for large or aggressive chewers.',
        features: ['2 Ultra-Tough Toys', 'Long-lasting Chews', 'Joint Health Supplements', 'Dental Care Kit'],
        recommended: true,
        color: 'indigo'
      },
      {
        id: 'tier_senior',
        name: 'Senior Wellness Box',
        price: 550,
        frequency: '/month',
        description: 'Tailored comfort and health support for aging pets.',
        features: ['Orthopedic Comfort Items', 'Digestive Supplements', 'Soft Baked Treats', 'Vet-Approved Vitamins'],
        recommended: false,
        color: 'emerald'
      }
    ];

    for (const plan of plans) {
      await pool.query(`
        INSERT INTO subscription_plans (id, name, price, frequency, description, features, recommended, color)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            frequency = EXCLUDED.frequency,
            description = EXCLUDED.description,
            features = EXCLUDED.features,
            recommended = EXCLUDED.recommended,
            color = EXCLUDED.color;
      `, [plan.id, plan.name, plan.price, plan.frequency, plan.description, plan.features, plan.recommended, plan.color]);
    }
    console.log("   - Subscription plans seeded.");

    // Products
    const products = [
      { id: 'p1', category: 'food', title: 'Premium Grain-Free Dry Dog Food', description: 'High-protein kibble with real salmon and sweet potato for all life stages.', base_price: 2250, image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80', rating: 4.8, reviews: 124, badge: 'Best Seller' },
      { id: 'p2', category: 'accessories', title: 'Heavy Duty Rope Leash with Reflective Thread', description: 'Durable 6ft climbing rope leash with padded handle for maximum comfort.', base_price: 850, image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&q=80', rating: 4.9, reviews: 89, badge: 'New' },
      { id: 'p3', category: 'toys', title: 'Interactive Puzzle Toy for Dogs', description: 'Mental stimulation toy that hides treats to keep your dog entertained for hours.', base_price: 1200, image: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&q=80', rating: 4.6, reviews: 210, badge: null },
      { id: 'p4', category: 'food', title: 'Organic Beef Liver Training Treats', description: 'Single-ingredient freeze-dried liver treats perfect for obedience training.', base_price: 650, image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80', rating: 4.9, reviews: 432, badge: 'Top Rated' },
      { id: 'p5', category: 'wellness', title: 'Advanced Joint Supplement Chews', description: 'Glucosamine and chondroitin chews to support hip and joint health in senior dogs.', base_price: 1600, image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80', rating: 4.7, reviews: 156, badge: null },
      { id: 'p6', category: 'accessories', title: 'Orthopedic Memory Foam Pet Bed', description: 'Premium dog bed with washable cover and bolsters for neck support.', base_price: 4500, image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80', rating: 4.8, reviews: 320, badge: 'Sale' },
      { id: 'p7', category: 'wellness', title: 'Natural Flea & Tick Prevention Spray', description: 'Plant-based alternative to harsh chemicals. Safe for dogs and cats.', base_price: 950, image: 'https://images.unsplash.com/photo-1585559700398-1385b3a8aeb6?w=400&q=80', rating: 4.5, reviews: 67, badge: null },
      { id: 'p8', category: 'toys', title: 'Tough Chew Indestructible Bone', description: 'Designed for aggressive chewers. Made from durable non-toxic rubber.', base_price: 800, image: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=400&q=80', rating: 4.4, reviews: 840, badge: null }
    ];

    for (const prod of products) {
      await pool.query(`
        INSERT INTO marketplace_products (id, title, description, category, base_price, image, rating, reviews, badge)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            base_price = EXCLUDED.base_price,
            image = EXCLUDED.image,
            rating = EXCLUDED.rating,
            reviews = EXCLUDED.reviews,
            badge = EXCLUDED.badge;
      `, [prod.id, prod.title, prod.description, prod.category, prod.base_price, prod.image, prod.rating, prod.reviews, prod.badge]);
    }
    console.log("   - Marketplace products seeded.");

    console.log("\n🚀 DATABASE MIGRATION COMPLETED SUCCESSFULLY!");
    console.log("-------------------------------------------------------------");
    console.log("Your remote PostgreSQL database is now fully prepared!");
    console.log("If this is your first time setting up the database, you can");
    console.log("optionally seed standard mock data by running:");
    console.log("  node seed_real_data.js");
    console.log("-------------------------------------------------------------");
    
  } catch (error) {
    console.error("\n❌ Database initialization failed during migrations:");
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations().catch(e => {
  console.error("❌ Fatal runner failure:", e);
  process.exit(1);
});
