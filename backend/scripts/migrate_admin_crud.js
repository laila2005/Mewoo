import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  password: 'medfylolo',
  host: 'localhost',
  port: 5432,
  database: 'petpluse_db',
});

const query = (text, params) => pool.query(text, params);

async function runMigration() {
    try {
        console.log('🚀 Starting Admin CRUD database migration (Superuser Mode)...');

        // 1. Create subscription_plans table
        console.log('📋 Creating subscription_plans table...');
        await query(`
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
            );
        `);

        // 2. Create marketplace_products table
        console.log('📦 Creating marketplace_products table...');
        await query(`
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
            );
        `);

        // 3. Grant privileges to petpluse_app
        console.log('🔑 Granting permissions to petpluse_app...');
        await query(`GRANT ALL PRIVILEGES ON TABLE subscription_plans TO petpluse_app;`);
        await query(`GRANT ALL PRIVILEGES ON TABLE marketplace_products TO petpluse_app;`);

        // 4. Seed subscription_plans
        console.log('🌱 Seeding subscription_plans...');
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
            await query(`
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

        // 5. Seed marketplace_products
        console.log('🌱 Seeding marketplace_products...');
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
            await query(`
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

        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
