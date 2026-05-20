const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const mockShops = [
    {
        name: "Paws & Play Superstore",
        category: "Premium Food",
        rating: 4.8,
        address: "123 Tails Blvd, Cairo",
        lat: 30.0444, lng: 31.2357,
        image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=400",
        is_open: true
    },
    {
        name: "Happy Tails Boutique",
        category: "Grooming",
        rating: 4.9,
        address: "45 Whiskers Ave, Giza",
        lat: 30.0131, lng: 31.2089,
        image: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?auto=format&fit=crop&q=80&w=400",
        is_open: true
    },
    {
        name: "The Healthy Hound",
        category: "Premium Food",
        rating: 4.7,
        address: "78 Bark Street, Heliopolis",
        lat: 30.0924, lng: 31.3216,
        image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=400",
        is_open: false
    },
    {
        name: "Feline Friends Emporium",
        category: "Toys",
        rating: 4.6,
        address: "99 Meow Lane, Maadi",
        lat: 29.9602, lng: 31.2569,
        image: "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=400",
        is_open: true
    },
    {
        name: "Pawsitive Play Boutique",
        category: "Toys",
        rating: 4.5,
        address: "22 Fetch Rd, Nasr City",
        lat: 30.0583, lng: 31.3477,
        image: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400",
        is_open: true
    },
    {
        name: "Bark & Meow Bakery",
        category: "Premium Food",
        rating: 4.8,
        address: "5 Paws Drive, Zamalek",
        lat: 30.0626, lng: 31.2223,
        image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400",
        is_open: false
    }
];

async function migrateShops() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Creating pet_shops table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS pet_shops (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                rating NUMERIC(3, 1),
                address TEXT,
                lat NUMERIC(9, 6),
                lng NUMERIC(9, 6),
                image TEXT,
                is_open BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Adding shop_id to marketplace_products...');
        await client.query(`
            ALTER TABLE marketplace_products 
            ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES pet_shops(id) ON DELETE SET NULL;
        `);

        console.log('Seeding pet shops...');
        const insertedShops = [];
        for (const shop of mockShops) {
            const res = await client.query(`
                INSERT INTO pet_shops (name, category, rating, address, lat, lng, image, is_open)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, name
            `, [shop.name, shop.category, shop.rating, shop.address, shop.lat, shop.lng, shop.image, shop.is_open]);
            insertedShops.push(res.rows[0]);
        }

        console.log('Assigning existing products to shops...');
        const productsRes = await client.query('SELECT id, category FROM marketplace_products');
        
        for (const product of productsRes.rows) {
            // Assign products randomly, or based on category
            // For example, if category is 'food', assign to a 'Premium Food' shop
            let targetShop = insertedShops[0]; // default
            if (product.category === 'food' || product.category === 'wellness') {
                targetShop = insertedShops.find(s => s.name.includes('Paws & Play') || s.name.includes('Healthy Hound')) || insertedShops[0];
            } else if (product.category === 'toys' || product.category === 'accessories') {
                targetShop = insertedShops.find(s => s.name.includes('Feline Friends') || s.name.includes('Pawsitive Play')) || insertedShops[0];
            } else if (product.category === 'subscriptions') {
                targetShop = insertedShops.find(s => s.name.includes('Happy Tails')) || insertedShops[0];
            }

            // Assign to target shop (just a fun distribution)
            // Or just a random shop
            const randomShop = insertedShops[Math.floor(Math.random() * insertedShops.length)];
            const finalShop = Math.random() > 0.5 ? targetShop : randomShop;

            await client.query('UPDATE marketplace_products SET shop_id = $1 WHERE id = $2', [finalShop.id, product.id]);
        }

        await client.query('COMMIT');
        console.log('Successfully migrated shops and linked products!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateShops();
