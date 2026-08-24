import { query } from '../config/db.js';
import { isValidSlug, slugify } from '../services/shopSlug.js';

/**
 * PetPluse — public shop storefronts.
 *
 * Replaces /marketplace?shop=<name>, which was the global marketplace with one
 * filter applied and a hardcoded delivery promise no shop had configured.
 *
 * The shop's rating is DERIVED here from its products' reviews rather than read
 * from pet_shops.rating. That column was NULL for every live shop while the
 * vendor dashboard computed its own answer at read time — two sources of truth,
 * one of them wrong. An unrated shop reports null, and the storefront says so
 * instead of showing stars nobody gave.
 */

/** Fields a customer is allowed to see. `tax_id`, `id_document_url`,
 *  `verification_notes` and `owner_id` are deliberately absent — they are KYC
 *  and internal moderation, not content. Exported so every public shop query
 *  uses one list: the sibling /api/public/shops endpoint was returning `s.*`,
 *  which handed all of them to anonymous callers. */
export const PUBLIC_SHOP_FIELDS = `
  s.id, s.name, s.slug, s.category, s.address, s.lat, s.lng,
  s.image, s.logo_url, s.banner_url, s.is_open, s.status,
  s.bio, s.phone, s.whatsapp, s.hours, s.delivery_note, s.return_policy,
  s.socials, s.founded_year, s.created_at,
  s.id_document_url IS NOT NULL AS is_verified
`;

/**
 * The shop's rating is the review-weighted average of its own products' ratings.
 *
 * Aggregated from marketplace_products, NOT from marketplace_product_reviews
 * directly, so the header and the product cards below it always agree — the
 * cards render p.rating/p.reviews, and reading the reviews table instead made a
 * shop report "No reviews yet" above products showing 67, 124 and 432 reviews.
 * Those columns are recomputed on every new review, so this stays accurate.
 *
 * Weighted, so a single 5-star product cannot outrank one with 400 reviews.
 */
const RATING_SUBQUERY = `
  LEFT JOIN LATERAL (
    SELECT ROUND((SUM(p.rating * p.reviews) / NULLIF(SUM(p.reviews), 0))::numeric, 1) AS avg_rating,
           COALESCE(SUM(p.reviews), 0)::int AS review_count
    FROM marketplace_products p
    WHERE p.shop_id = s.id AND COALESCE(p.reviews, 0) > 0
  ) rev ON TRUE
`;

/**
 * GET /api/public/shops/:slug
 * The storefront in one request: the shop, its catalogue, its derived rating,
 * and — when the caller is signed in — whether they already follow it.
 */
export const getShopBySlug = async (req, res) => {
    try {
        // Case-insensitive on the way in so a link typed or auto-capitalised by
        // a phone keyboard still resolves, but the canonical slug is returned in
        // the payload so the page can normalise its own URL. One shop, one
        // address.
        const slug = String(req.params.slug || '').toLowerCase();
        // Validated rather than trusted: the slug reaches a LOWER() comparison
        // and an error message, and a route param is user input like any other.
        if (!isValidSlug(slug)) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        const shopRes = await query(
            `SELECT ${PUBLIC_SHOP_FIELDS},
                    rev.avg_rating, rev.review_count,
                    (SELECT COUNT(*)::int FROM shop_follows f WHERE f.shop_id = s.id) AS follower_count,
                    (SELECT COUNT(*)::int FROM marketplace_products p WHERE p.shop_id = s.id) AS product_count
               FROM pet_shops s
               ${RATING_SUBQUERY}
              WHERE LOWER(s.slug) = LOWER($1)
              LIMIT 1`,
            [slug]
        );

        if (shopRes.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        const shop = shopRes.rows[0];

        // 'pending' is deliberately allowed: /api/public/products applies no
        // shop-status filter, so pending shops' products are already listed in
        // the marketplace and already link here. Gating them would 404 the exact
        // shops the marketplace sends people to. The page reports the state
        // honestly instead of implying a vetting that has not happened.
        //
        // 'rejected' is NOT allowed. That is an admin actively revoking a shop —
        // the outcome of the report queue — and leaving its storefront live
        // (bio, address, WhatsApp deep link, full catalogue) behind a neutral
        // "not yet verified" badge would make the moderation decision cosmetic.
        // The owner can still open it, so a revoked vendor is not left guessing.
        if (String(shop.status).toLowerCase() === 'rejected') {
            let ownsIt = false;
            if (req.user?.id) {
                const owns = await query(
                    'SELECT 1 FROM pet_shops WHERE id = $1 AND owner_id = $2',
                    [shop.id, req.user.id]
                );
                ownsIt = owns.rows.length > 0;
            }
            if (!ownsIt) return res.status(404).json({ error: 'Shop not found' });
        }

        // Same shape the marketplace card already renders, so the storefront
        // reuses that component instead of forking it.
        const productsRes = await query(
            `SELECT p.*, s.name AS shop_name, s.slug AS shop_slug
               FROM marketplace_products p
               JOIN pet_shops s ON s.id = p.shop_id
              WHERE p.shop_id = $1
              ORDER BY p.created_at DESC`,
            [shop.id]
        );

        let is_following = false;
        if (req.user?.id) {
            const f = await query(
                'SELECT 1 FROM shop_follows WHERE shop_id = $1 AND user_id = $2',
                [shop.id, req.user.id]
            );
            is_following = f.rows.length > 0;
        }

        // Fire-and-forget: a failed counter must never fail the page.
        query('UPDATE pet_shops SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1', [shop.id])
            .catch((e) => console.error('shop view counter failed:', e.message));

        return res.status(200).json({
            shop: {
                ...shop,
                rating: shop.avg_rating === null ? null : Number(shop.avg_rating),
                reviews: shop.review_count || 0,
                is_following,
            },
            products: productsRes.rows,
        });
    } catch (error) {
        console.error('Error fetching storefront:', error);
        return res.status(500).json({ error: 'Could not load that shop.' });
    }
};

/**
 * GET /api/public/shops/resolve?name=<shop name>
 *
 * Every link ever shared points at /marketplace?shop=<name>. Rather than break
 * them, the old URL resolves the name to a slug and redirects. Names are not
 * unique, so the oldest shop wins — the same shop those links already reached.
 */
export const resolveShopSlug = async (req, res) => {
    try {
        const name = String(req.query.name || '').trim();
        if (!name) return res.status(400).json({ error: 'A shop name is required.' });

        let r = await query(
            `SELECT slug FROM pet_shops
              WHERE LOWER(name) = LOWER($1) AND slug IS NOT NULL
              ORDER BY created_at NULLS LAST LIMIT 1`,
            [name]
        );

        // A name that has since been edited will not match, so fall back to the
        // slug that name would have produced.
        if (r.rows.length === 0) {
            const guess = slugify(name);
            if (guess) {
                r = await query('SELECT slug FROM pet_shops WHERE LOWER(slug) = $1 LIMIT 1', [guess]);
            }
        }

        if (r.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        return res.status(200).json({ slug: r.rows[0].slug });
    } catch (error) {
        console.error('Error resolving shop slug:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/public/shops/:slug/follow  — toggles.
 * Following is what makes a customer come back, so it is one tap and reversible.
 */
export const toggleFollowShop = async (req, res) => {
    try {
        const { slug } = req.params;
        if (!isValidSlug(String(slug || '').toLowerCase())) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        const shopRes = await query('SELECT id, owner_id, name, notify_on_follow FROM pet_shops WHERE LOWER(slug) = LOWER($1)', [slug]);
        if (shopRes.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        const shop = shopRes.rows[0];

        if (shop.owner_id === req.user.id) {
            return res.status(400).json({ error: 'You cannot follow your own shop.' });
        }

        const existing = await query(
            'DELETE FROM shop_follows WHERE shop_id = $1 AND user_id = $2 RETURNING id',
            [shop.id, req.user.id]
        );
        const nowFollowing = existing.rows.length === 0;

        if (nowFollowing) {
            await query(
                'INSERT INTO shop_follows (shop_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [shop.id, req.user.id]
            );

            if (shop.notify_on_follow) {
                // Looked up fresh rather than trusted from the JWT: the token can be
                // up to 7 days old, and a name change since login shouldn't show up
                // stale in someone else's notification.
                const followerRow = await query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
                const follower = followerRow.rows[0]
                    ? `${followerRow.rows[0].first_name} ${followerRow.rows[0].last_name}`
                    : 'A pet owner';
                await query(
                    `INSERT INTO notifications (user_id, type, title, message, sender_id, action_url)
                     VALUES ($1, 'new_follower', 'New Follower', $2, $3, '/vendor-dashboard')`,
                    [shop.owner_id, `${follower} started following ${shop.name}.`, req.user.id]
                );
                const io = req.app.get('io');
                if (io) {
                    io.to(String(shop.owner_id)).emit('new_follower', { shop_id: shop.id, follower_name: follower });
                }
            }
        }

        const count = await query('SELECT COUNT(*)::int AS n FROM shop_follows WHERE shop_id = $1', [shop.id]);
        return res.status(200).json({
            is_following: nowFollowing,
            follower_count: count.rows[0].n,
        });
    } catch (error) {
        console.error('Error following shop:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

/**
 * PUT /api/vendor/shop/follow-notifications — owner-only mute toggle.
 * Follow itself is untouched; this only silences the "X followed your shop"
 * notification for owners of shops popular enough to find it noisy.
 */
export const setFollowNotificationPref = async (req, res) => {
    try {
        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: '"enabled" must be a boolean' });
        }
        const result = await query(
            'UPDATE pet_shops SET notify_on_follow = $1 WHERE owner_id = $2 RETURNING notify_on_follow',
            [enabled, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No shop found for this account' });
        }
        return res.status(200).json({ notify_on_follow: result.rows[0].notify_on_follow });
    } catch (error) {
        console.error('Error updating follow-notification preference:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

export default { getShopBySlug, resolveShopSlug, toggleFollowShop, setFollowNotificationPref };
