import { query } from '../config/db.js';
import { parseCsv, validateProductRows, templateCsv } from '../services/csvImport.js';
import { slugFromShop, uniqueSlug } from '../services/shopSlug.js';
import crypto from 'crypto';

/**
 * Claim a free public address for a new shop.
 *
 * Read separately from the INSERT rather than generated inside it, because the
 * slug has to be unique across shops and four live shops already share a name.
 * The unique index on LOWER(slug) is the real guarantee; this picks a candidate
 * that will satisfy it.
 */
const claimSlug = async (shop) => {
    const rows = await query(`SELECT slug FROM pet_shops WHERE slug IS NOT NULL AND slug <> ''`);
    const taken = new Set(rows.rows.map((r) => String(r.slug).toLowerCase()));
    return uniqueSlug(slugFromShop(shop), taken);
};

/**
 * What is still missing from a storefront, and why the owner should care.
 *
 * An empty storefront looks worse than no storefront, so the dashboard needs to
 * name the gap in terms of what it costs the owner — not as a bare percentage.
 */
export const storefrontChecklist = (shop = {}) => {
    const items = [
        { key: 'logo_url',      label: 'Add a logo',              why: 'Customers recognise you in search and on every product',        done: !!shop.logo_url },
        { key: 'banner_url',    label: 'Add a cover photo',       why: 'A shop with no cover reads as abandoned',                       done: !!shop.banner_url },
        { key: 'bio',           label: 'Write a short bio',       why: 'Who runs this shop, and why someone should buy from you',       done: !!(shop.bio && String(shop.bio).trim().length >= 40) },
        { key: 'address',       label: 'Add your address',        why: 'Shoppers filter by how close you are',                          done: !!shop.address },
        { key: 'hours',         label: 'Set your opening hours',  why: 'Tells a customer whether it is worth coming now',               done: !!(shop.hours && Object.keys(shop.hours || {}).length) },
        { key: 'phone',         label: 'Add a phone or WhatsApp', why: 'The contact Egyptian shoppers actually use',                    done: !!(shop.phone || shop.whatsapp) },
        { key: 'delivery_note', label: 'Explain delivery',        why: 'The question you would otherwise answer in every message',      done: !!shop.delivery_note },
        { key: 'return_policy', label: 'Add a returns policy',    why: 'Confidence to buy without asking first',                        done: !!shop.return_policy },
    ];
    const done = items.filter((i) => i.done).length;
    return { items, done, total: items.length, percent: Math.round((done / items.length) * 100) };
};

export const getShopDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query('SELECT * FROM pet_shops WHERE owner_id = $1 LIMIT 1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        const shop = result.rows[0];

        // A shop created before slugs existed, or by an older code path, would
        // otherwise have no public address at all.
        if (!shop.slug) {
            try {
                const slug = await claimSlug(shop);
                await query('UPDATE pet_shops SET slug = $1 WHERE id = $2', [slug, shop.id]);
                shop.slug = slug;
            } catch (slugErr) {
                console.error('Failed to backfill shop slug:', slugErr);
            }
        }

        res.status(200).json({ shop, storefront: storefrontChecklist(shop) });
    } catch (error) {
        console.error('Error fetching shop:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateShopDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, category, address, image, tax_id } = req.body;
        
        let result = await query(
            `UPDATE pet_shops 
             SET name = $1, category = $2, address = $3, image = $4, tax_id = $5 
             WHERE owner_id = $6 RETURNING *`,
            [name, category, address, image, tax_id, userId]
        );
        
        if (result.rows.length === 0) {
            // Upsert: Create a new shop row if it doesn't exist for this user.
            // The slug is assigned here and never again — renaming the shop
            // changes the heading, not the address, so shared links survive.
            const id = crypto.randomUUID();
            const slug = await claimSlug({ id, name });
            result = await query(
                `INSERT INTO pet_shops (id, owner_id, name, category, address, image, tax_id, status, slug)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8) RETURNING *`,
                [id, userId, name, category || 'Food', address, image, tax_id, slug]
            );
        }
        const shop = result.rows[0];

        // Write dynamic audit log
        try {
            const actorName = `${req.user.first_name} ${req.user.last_name}`;
            const actorRole = req.user.role || 'vendor';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', actorName, actorRole, 'Registered new business storefront', `Established storefront: ${shop.name} with tax ID: ${tax_id || 'N/A'}.`]
            );
        } catch (logErr) {
            console.error('Failed to write storefront registration audit log:', logErr);
        }

        res.status(200).json({ shop });
    } catch (error) {
        console.error('Error updating shop:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SOCIAL_KEYS = ['instagram', 'facebook', 'tiktok', 'website'];
const HTTP_URL = /^https?:\/\/\S+$/i;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validate the owner-authored storefront fields.
 *
 * Returns { value } or { error }. Rejecting loudly beats storing something the
 * storefront then renders as a broken image or an empty opening-hours table.
 */
const validateStorefront = (body = {}) => {
    const out = {};
    const str = (v, max) => {
        const s = v == null ? '' : String(v).trim();
        if (!s) return null;
        return s.length > max ? { tooLong: max } : s;
    };

    for (const [field, max] of [['bio', 1500], ['delivery_note', 600], ['return_policy', 600]]) {
        const v = str(body[field], max);
        if (v && v.tooLong) return { error: `${field.replace('_', ' ')} must be ${max} characters or fewer.` };
        out[field] = v;
    }

    for (const field of ['logo_url', 'banner_url']) {
        const v = str(body[field], 500);
        if (v && v.tooLong) return { error: `${field} is too long.` };
        // A spreadsheet or a local path cannot be served; it would render as a
        // permanently broken image on the public page.
        if (v && !HTTP_URL.test(v)) return { error: `${field.replace('_url', '')} must be a full https:// image URL.` };
        out[field] = v;
    }

    for (const field of ['phone', 'whatsapp']) {
        const v = str(body[field], 32);
        if (v && v.tooLong) return { error: `${field} is too long.` };
        if (v && !/^[+0-9()\-\s]{6,32}$/.test(v)) return { error: `${field} does not look like a phone number.` };
        out[field] = v;
    }

    if (body.founded_year === '' || body.founded_year == null) {
        out.founded_year = null;
    } else {
        const y = Number(body.founded_year);
        const thisYear = new Date().getFullYear();
        if (!Number.isInteger(y) || y < 1900 || y > thisYear) {
            return { error: `Founded year must be a whole year between 1900 and ${thisYear}.` };
        }
        out.founded_year = y;
    }

    // Hours: { mon: { open: '09:00', close: '18:00' }, ... }. A day that is
    // absent or null is closed, which is how the page renders it.
    if (body.hours == null) {
        out.hours = null;
    } else if (typeof body.hours !== 'object' || Array.isArray(body.hours)) {
        return { error: 'Opening hours are not in the expected format.' };
    } else {
        const hours = {};
        for (const [day, v] of Object.entries(body.hours)) {
            const key = String(day).toLowerCase().slice(0, 3);
            if (!DAYS.includes(key)) return { error: `"${day}" is not a day of the week.` };
            if (v == null) continue;                        // closed
            const open = String(v.open || '').trim();
            const close = String(v.close || '').trim();
            if (!open && !close) continue;
            if (!HHMM.test(open) || !HHMM.test(close)) {
                return { error: `Hours for ${key} must be times like 09:00 and 18:00.` };
            }
            if (open >= close) return { error: `Closing time for ${key} must be after the opening time.` };
            hours[key] = { open, close };
        }
        out.hours = Object.keys(hours).length ? hours : null;
    }

    // Socials: only keys we render, and only real links.
    if (body.socials == null) {
        out.socials = null;
    } else if (typeof body.socials !== 'object' || Array.isArray(body.socials)) {
        return { error: 'Social links are not in the expected format.' };
    } else {
        const socials = {};
        for (const [k, raw] of Object.entries(body.socials)) {
            const key = String(k).toLowerCase();
            if (!SOCIAL_KEYS.includes(key)) continue;       // ignore unknown keys
            const v = String(raw ?? '').trim();
            if (!v) continue;
            if (v.length > 300) return { error: `${key} link is too long.` };
            if (!HTTP_URL.test(v)) return { error: `${key} must be a full link starting with https://` };
            socials[key] = v;
        }
        out.socials = Object.keys(socials).length ? socials : null;
    }

    return { value: out };
};

/**
 * PUT /api/vendor/storefront
 *
 * Only the owner-authored presentation fields. Name, category and tax id stay
 * with updateShopDetails, and the slug is intentionally not updatable — that is
 * the whole point of having one.
 */
export const updateStorefront = async (req, res) => {
    try {
        const userId = req.user.id;
        const { value, error } = validateStorefront(req.body);
        if (error) return res.status(400).json({ error });

        const result = await query(
            `UPDATE pet_shops SET
                bio = $1, logo_url = $2, banner_url = $3, phone = $4, whatsapp = $5,
                hours = $6::jsonb, delivery_note = $7, return_policy = $8,
                socials = $9::jsonb, founded_year = $10
              WHERE owner_id = $11
              RETURNING *`,
            [
                value.bio, value.logo_url, value.banner_url, value.phone, value.whatsapp,
                value.hours === null ? null : JSON.stringify(value.hours),
                value.delivery_note, value.return_policy,
                value.socials === null ? null : JSON.stringify(value.socials),
                value.founded_year, userId,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Create your shop profile first.' });
        }
        const shop = result.rows[0];

        return res.status(200).json({ shop, storefront: storefrontChecklist(shop) });
    } catch (err) {
        console.error('Error updating storefront:', err);
        return res.status(500).json({ error: 'Could not save your storefront.' });
    }
};

export const getVendorProducts = async (req, res) => {
    try {
        const userId = req.user.id;
        const shopRes = await query('SELECT id FROM pet_shops WHERE owner_id = $1', [userId]);
        if (shopRes.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        const shopId = shopRes.rows[0].id;
        const result = await query('SELECT * FROM marketplace_products WHERE shop_id = $1 ORDER BY created_at DESC', [shopId]);
        res.status(200).json({ products: result.rows });
    } catch (error) {
        console.error('Error fetching vendor products:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const addProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        // First get shop_id
        const shopRes = await query('SELECT id FROM pet_shops WHERE owner_id = $1', [userId]);
        if (shopRes.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        const shopId = shopRes.rows[0].id;
        
        const { title, description, category, base_price, image, badge, quantity } = req.body;
        const stockQty = quantity !== undefined ? parseInt(quantity) : 10;
        
        const result = await query(
            `INSERT INTO marketplace_products (id, shop_id, title, description, category, base_price, image, badge, quantity)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [crypto.randomUUID(), shopId, title, description, category, base_price, image, badge, stockQty]
        );
        
        const product = result.rows[0];

        // Write dynamic audit log
        try {
            const actorName = `${req.user.first_name} ${req.user.last_name}`;
            const actorRole = req.user.role || 'vendor';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', actorName, actorRole, 'Submitted product review', `Added marketplace product: ${title} under category ${category || 'Supplies'}.`]
            );
        } catch (logErr) {
            console.error('Failed to write product addition audit log:', logErr);
        }

        res.status(201).json({ product });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/vendor/products/import
 *
 * Bulk-create products from a CSV body. Adding one product at a time is fine for
 * a shop with five items and unusable for a shop with a real catalogue, which
 * made it a genuine barrier to onboarding shops at all.
 *
 * Body: { csv: string, commit?: boolean }
 * With commit falsy this is a DRY RUN: it validates and reports exactly what
 * would be created and what would be rejected, and writes nothing. The owner
 * sees the outcome before it happens rather than after.
 */
export const importProducts = async (req, res) => {
    try {
        const userId = req.user.id;
        const shopRes = await query('SELECT id FROM pet_shops WHERE owner_id = $1', [userId]);
        if (shopRes.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found. Create your shop profile first.' });
        }
        const shopId = shopRes.rows[0].id;

        const csv = req.body?.csv;
        if (typeof csv !== 'string' || !csv.trim()) {
            return res.status(400).json({ error: 'No CSV content was received.' });
        }
        // Bounded before parsing, so a huge paste cannot be turned into work.
        if (csv.length > 2_000_000) {
            return res.status(413).json({ error: 'That file is too large. Please split it into smaller batches.' });
        }

        // Duplicate check is against THIS shop only — two shops may legitimately
        // both sell "Rope Tug Toy".
        const existing = await query('SELECT LOWER(title) AS t FROM marketplace_products WHERE shop_id = $1', [shopId]);
        const existingTitles = new Set(existing.rows.map((r) => r.t));

        const result = validateProductRows(parseCsv(csv), existingTitles);
        if (result.error) {
            return res.status(400).json({ error: result.error, headers: result.headers });
        }

        const { accepted, rejected, total, mapping } = result;

        // Dry run — report and stop.
        if (!req.body?.commit) {
            return res.status(200).json({
                dry_run: true, total,
                mapped_columns: Object.keys(mapping),
                would_create: accepted.length,
                would_reject: rejected.length,
                preview: accepted.slice(0, 10),
                rejected,
            });
        }

        if (accepted.length === 0) {
            return res.status(400).json({ error: 'Nothing to import — every row was rejected.', rejected });
        }

        // One multi-row INSERT in a single statement: either the whole accepted
        // batch lands or none of it does, so a mid-way failure cannot leave a
        // half-imported catalogue the owner has to clean up by hand.
        const cols = ['id', 'shop_id', 'title', 'description', 'category', 'base_price', 'image', 'badge', 'quantity'];
        const values = [];
        const tuples = accepted.map((p, i) => {
            values.push(crypto.randomUUID(), shopId, p.title, p.description, p.category, p.base_price, p.image, p.badge, p.quantity);
            const base = i * cols.length;
            return `(${cols.map((_, j) => `$${base + j + 1}`).join(', ')})`;
        });
        const inserted = await query(
            `INSERT INTO marketplace_products (${cols.join(', ')}) VALUES ${tuples.join(', ')} RETURNING id, title`,
            values
        );

        try {
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', `${req.user.first_name} ${req.user.last_name}`, req.user.role || 'vendor',
                 'Bulk product import', `Imported ${inserted.rows.length} products (${rejected.length} rows rejected).`]
            );
        } catch (logErr) {
            console.error('Failed to write import audit log:', logErr);
        }

        return res.status(201).json({
            imported: inserted.rows.length,
            rejected,
            products: inserted.rows,
        });
    } catch (error) {
        console.error('Error importing products:', error);
        return res.status(500).json({ error: 'Could not import the products.' });
    }
};

/** GET /api/vendor/products/import/template — the CSV shape we expect. */
export const getImportTemplate = async (req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="petpluse-products-template.csv"');
    res.status(200).send(templateCsv());
};

export const updateProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { title, description, category, base_price, image, badge, quantity } = req.body;
        const stockQty = quantity !== undefined ? parseInt(quantity) : 10;

        // Verify that the product belongs to this vendor's shop
        const verifyRes = await query(
            `SELECT p.id FROM marketplace_products p 
             JOIN pet_shops s ON p.shop_id = s.id 
             WHERE p.id = $1 AND s.owner_id = $2`, 
            [id, userId]
        );
        if (verifyRes.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized to update this product' });
        }

        const result = await query(
            `UPDATE marketplace_products 
             SET title = $1, description = $2, category = $3, base_price = $4, image = $5, badge = $6, quantity = $7
             WHERE id = $8 RETURNING *`,
            [title, description, category, base_price, image, badge, stockQty, id]
        );

        res.status(200).json({ product: result.rows[0], message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Verify that the product belongs to this vendor's shop
        const verifyRes = await query(
            `SELECT p.id FROM marketplace_products p 
             JOIN pet_shops s ON p.shop_id = s.id 
             WHERE p.id = $1 AND s.owner_id = $2`, 
            [id, userId]
        );
        if (verifyRes.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized to delete this product' });
        }

        await query('DELETE FROM marketplace_products WHERE id = $1', [id]);
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createAdBanner = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, image_url, target_url, placement, duration, price } = req.body;
        
        if (!title || !image_url || !target_url || !placement || !duration || !price) {
            return res.status(400).json({ error: 'Missing required fields for ad banner request' });
        }

        const result = await query(
            `INSERT INTO ad_banners (id, vendor_id, title, image_url, target_url, placement, duration, price, status, payment_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'pending') RETURNING *`,
            [crypto.randomUUID(), userId, title, image_url, target_url, placement, duration, price]
        );

        res.status(201).json({ ad: result.rows[0], message: 'Ad banner request submitted successfully!' });
    } catch (error) {
        console.error('Error creating ad banner:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getVendorAdBanners = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query('SELECT * FROM ad_banners WHERE vendor_id = $1 ORDER BY created_at DESC', [userId]);
        res.status(200).json({ ads: result.rows });
    } catch (error) {
        console.error('Error fetching vendor ad banners:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateAdBanner = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { title, image_url, target_url, placement, duration, price } = req.body;

        if (!title || !image_url || !target_url || !placement || !duration || !price) {
            return res.status(400).json({ error: 'Missing required fields for ad banner request' });
        }

        // Editable only while still 'pending': an approved campaign has already
        // been reviewed (and may be paid/live) against its current content, and a
        // rejected one is a closed decision — resubmit as a new request instead.
        const result = await query(
            `UPDATE ad_banners
                SET title = $1, image_url = $2, target_url = $3, placement = $4, duration = $5, price = $6
              WHERE id = $7 AND vendor_id = $8 AND status = 'pending'
          RETURNING *`,
            [title, image_url, target_url, placement, duration, price, id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pending ad campaign not found, not yours, or already reviewed' });
        }

        res.status(200).json({ ad: result.rows[0], message: 'Ad campaign updated successfully!' });
    } catch (error) {
        console.error('Error updating ad banner:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const payForAdBanner = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await query(
            `UPDATE ad_banners 
             SET payment_status = 'paid' 
             WHERE id = $1 AND vendor_id = $2 AND status = 'approved' RETURNING *`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Approved ad banner not found or unauthorized' });
        }

        const ad = result.rows[0];

        // Write dynamic audit log
        try {
            const actorName = `${req.user.first_name} ${req.user.last_name}`;
            const actorRole = req.user.role || 'vendor';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['success', actorName, actorRole, 'Processed ad campaign payment', `Simulated payment of EGP ${ad.price} successfully processed for campaign: ${ad.title}.`]
            );
        } catch (logErr) {
            console.error('Failed to write ad payment audit log:', logErr);
        }

        res.status(200).json({ ad, message: 'Payment simulated successfully. Ad is now active!' });
    } catch (error) {
        console.error('Error paying for ad banner:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getVendorStats = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get shop details
        const shopRes = await query('SELECT id FROM pet_shops WHERE owner_id = $1', [userId]);
        if (shopRes.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        const shopId = shopRes.rows[0].id;

        // 1. Get Monthly Orders (completed payments where payee_id = vendor's user id in the current month)
        const ordersRes = await query(`
            SELECT COUNT(*) as count 
            FROM payments 
            WHERE payee_id = $1 AND status = 'completed'
              AND created_at >= date_trunc('month', CURRENT_DATE)
        `, [userId]);
        const monthlyOrders = parseInt(ordersRes.rows[0].count) || 0;

        // 2. Get Est. Earnings (completed payments sum where payee_id = vendor's user id in the current month)
        const earningsRes = await query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM payments 
            WHERE payee_id = $1 AND status = 'completed'
              AND created_at >= date_trunc('month', CURRENT_DATE)
        `, [userId]);
        const estEarnings = parseFloat(earningsRes.rows[0].total) || 0;

        // Platform commission (admin-adjustable) → net payout to the vendor.
        let commissionRate = 0.10;
        try {
            const rateRes = await query(`SELECT value FROM platform_settings WHERE key = 'commission_rate'`);
            const rv = rateRes.rows[0]?.value;
            const parsed = typeof rv === 'number' ? rv : parseFloat(rv);
            if (isFinite(parsed) && parsed >= 0 && parsed < 1) commissionRate = parsed;
        } catch (_) { /* default 0.10 */ }
        const netEarnings = Math.round(estEarnings * (1 - commissionRate));

        // 3. Get Store Rating & reviews count from marketplace_product_reviews
        const ratingRes = await query(`
            SELECT COALESCE(AVG(r.rating), 0) as avg_rating, COUNT(r.id) as count
            FROM marketplace_product_reviews r
            JOIN marketplace_products p ON r.product_id = p.id
            WHERE p.shop_id = $1
        `, [shopId]);
        // No reviews is "no rating" (null), never a fabricated perfect score —
        // this field isn't rendered by the current dashboard, but it's a real
        // API field other callers could read as-is.
        const avgRating = parseFloat(ratingRes.rows[0].avg_rating) > 0
            ? parseFloat(ratingRes.rows[0].avg_rating).toFixed(1)
            : null;
        const reviewsCount = parseInt(ratingRes.rows[0].count) || 0;

        res.status(200).json({
            stats: {
                monthlyOrders,
                estEarnings,
                commissionRate,
                netEarnings,
                avgRating,
                reviewsCount
            }
        });
    } catch (error) {
        console.error('Error fetching vendor stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ── Vendor orders (purchased items) for the sheet + report export ──
export const getVendorOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rows } = await query(
            `SELECT p.id, p.amount, p.currency, p.status, p.created_at, p.gateway_name, p.order_details,
                    u.first_name AS buyer_first, u.last_name AS buyer_last
               FROM payments p
               LEFT JOIN users u ON u.id = p.payer_id
              WHERE p.payee_id = $1
              ORDER BY p.created_at DESC`,
            [userId]
        );
        const orders = rows.map(r => {
            let items = [];
            try {
                const od = typeof r.order_details === 'string' ? JSON.parse(r.order_details) : r.order_details;
                if (Array.isArray(od)) items = od;
                else if (Array.isArray(od?.items)) items = od.items;
            } catch (_) { /* ignore */ }
            return {
                id: r.id,
                date: r.created_at,
                buyer: `${r.buyer_first || ''} ${r.buyer_last || ''}`.trim() || 'Customer',
                amount: Number(r.amount) || 0,
                currency: r.currency || 'EGP',
                status: r.status,
                gateway: r.gateway_name || null,
                items: items.map(it => ({ name: it.name || it.title || 'Item', qty: it.qty || it.quantity || 1, price: it.price || it.unit_price || null })),
            };
        });
        const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.amount, 0);
        let commissionRate = 0.10;
        try {
            const rr = await query(`SELECT value FROM platform_settings WHERE key = 'commission_rate'`);
            const rv = rr.rows[0]?.value;
            const p = typeof rv === 'number' ? rv : parseFloat(rv);
            if (isFinite(p) && p >= 0 && p < 1) commissionRate = p;
        } catch (_) { /* default */ }
        res.status(200).json({ orders, totalRevenue, commissionRate, netRevenue: Math.round(totalRevenue * (1 - commissionRate)) });
    } catch (error) {
        console.error('Error fetching vendor orders:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getVendorReviews = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get shop details
        const shopRes = await query('SELECT id FROM pet_shops WHERE owner_id = $1', [userId]);
        if (shopRes.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        const shopId = shopRes.rows[0].id;

        // Query all reviews for all products belonging to this shop
        const result = await query(`
            SELECT r.*, p.title as product_title, p.image as product_image,
                   u.first_name || ' ' || u.last_name as reviewer,
                   u.profile_pic_url as reviewer_avatar
            FROM marketplace_product_reviews r
            JOIN marketplace_products p ON r.product_id = p.id
            JOIN users u ON r.user_id = u.id
            WHERE p.shop_id = $1
            ORDER BY r.created_at DESC
        `, [shopId]);

        res.status(200).json({ reviews: result.rows });
    } catch (error) {
        console.error('Error fetching vendor reviews:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const replyToReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reviewId } = req.params;
        const { reply } = req.body;

        if (!reply || !reply.trim()) {
            return res.status(400).json({ error: 'Reply text is required' });
        }

        // Verify that the review belongs to a product owned by this vendor
        const verifyRes = await query(`
            SELECT r.id FROM marketplace_product_reviews r
            JOIN marketplace_products p ON r.product_id = p.id
            JOIN pet_shops s ON p.shop_id = s.id
            WHERE r.id = $1 AND s.owner_id = $2
        `, [reviewId, userId]);

        if (verifyRes.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized to reply to this review' });
        }

        const result = await query(
            `UPDATE marketplace_product_reviews SET vendor_reply = $1 WHERE id = $2 RETURNING *`,
            [reply, reviewId]
        );

        res.status(200).json({ review: result.rows[0], message: 'Reply submitted successfully!' });
    } catch (error) {
        console.error('Error replying to review:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

