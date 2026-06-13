import { query } from './src/config/db.js';

const MOCK_PRODUCTS = [
    { id: 'p1', category: 'food', title: 'Premium Grain-Free Dry Dog Food', description: 'High-protein kibble with real salmon and sweet potato for all life stages.', base_price: 2250, image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80', rating: 4.8, reviews: 124, badge: 'Best Seller' },
    { id: 'p2', category: 'accessories', title: 'Heavy Duty Rope Leash with Reflective Thread', description: 'Durable 6ft climbing rope leash with padded handle for maximum comfort.', base_price: 850, image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&q=80', rating: 4.9, reviews: 89, badge: 'New' },
    { id: 'p3', category: 'toys', title: 'Interactive Puzzle Toy for Dogs', description: 'Mental stimulation toy that hides treats to keep your dog entertained for hours.', base_price: 1200, image: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&q=80', rating: 4.6, reviews: 210, badge: null },
    { id: 'p4', category: 'food', title: 'Organic Beef Liver Training Treats', description: 'Single-ingredient freeze-dried liver treats perfect for obedience training.', base_price: 650, image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80', rating: 4.9, reviews: 432, badge: 'Top Rated' },
    { id: 'p5', category: 'wellness', title: 'Advanced Joint Supplement Chews', description: 'Glucosamine and chondroitin chews to support hip and joint health in senior dogs.', base_price: 1600, image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80', rating: 4.7, reviews: 156, badge: null },
    { id: 'p6', category: 'accessories', title: 'Orthopedic Memory Foam Pet Bed', description: 'Premium dog bed with washable cover and bolsters for neck support.', base_price: 4500, image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80', rating: 4.8, reviews: 320, badge: 'Sale' },
    { id: 'p7', category: 'wellness', title: 'Natural Flea & Tick Prevention Spray', description: 'Plant-based alternative to harsh chemicals. Safe for dogs and cats.', base_price: 950, image: 'https://images.unsplash.com/photo-1585559700398-1385b3a8aeb6?w=400&q=80', rating: 4.5, reviews: 67, badge: null },
    { id: 'p8', category: 'toys', title: 'Tough Chew Indestructible Bone', description: 'Designed for aggressive chewers. Made from durable non-toxic rubber.', base_price: 800, image: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=400&q=80', rating: 4.4, reviews: 840, badge: null },
];

async function seedProducts() {
    try {
        console.log('Seeding products...');
        for (const p of MOCK_PRODUCTS) {
            // Check if exists
            const existing = await query('SELECT id FROM marketplace_products WHERE id = $1', [p.id]);
            if (existing.rows.length === 0) {
                await query(`
                    INSERT INTO marketplace_products (id, title, description, category, base_price, image, rating, reviews, badge, quantity)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [p.id, p.title, p.description, p.category, p.base_price, p.image, p.rating, p.reviews, p.badge, 50]); // Default 50 in stock
                console.log(`Inserted ${p.title}`);
            } else {
                console.log(`Product ${p.id} already exists. Skipping.`);
            }
        }
        console.log('Done!');
        process.exit(0);
    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    }
}

seedProducts();
