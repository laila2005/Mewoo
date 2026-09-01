import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/common/SEO';
import BackButton from '../components/common/BackButton';
import Pagination, { usePagination } from '../components/common/Pagination';
import ReportDialog from '../components/common/ReportDialog';
import { PRODUCT_PLACEHOLDER, fallbackTo } from '../utils/imageFallback';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const BADGE_COLORS = { 'Best Seller': 'bg-amber-400 text-white', 'New': 'bg-emerald-500 text-white', 'Top Rated': 'bg-purple-500 text-white', 'Sale': 'bg-red-500 text-white', 'Popular Plan': 'bg-blue-600 text-white' };

const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const DAY_ORDER = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']; // the Egyptian week

const SOCIAL_ICONS = { instagram: 'photo_camera', facebook: 'thumb_up', tiktok: 'music_note', website: 'language' };

/** Grey until someone rates it — see the marketplace card, same rule. */
const Stars = ({ rating, reviews, size = 'text-[14px]' }) => {
  const count = Number(reviews) || 0;
  const score = Number(rating) || 0;
  const rated = count > 0 && score > 0;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i}
          className={`material-symbols-outlined ${size} ${rated && i <= Math.round(score) ? 'text-amber-400' : 'text-slate-200'}`}
          style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
      ))}
    </span>
  );
};

/**
 * A shop's own page.
 *
 * Replaces /marketplace?shop=<name>, which showed the global marketplace with a
 * filter applied under a banner promising "Fast local delivery" that no shop had
 * ever configured. Everything here comes from the shop.
 */
const ShopStorefront = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, token, isFeatureLive } = useAuth();

  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [reporting, setReporting] = useState(false);

  const marketplaceLive = isFeatureLive ? isFeatureLive('marketplace') : true;

  // Same localStorage cart the product page and checkout already use, so an
  // item added here is in the same basket.
  const [cart, setCart] = useState(() => {
    try { const saved = localStorage.getItem('cart'); return saved ? JSON.parse(saved) : []; }
    catch { return []; }
  });
  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await axios.get(`${API_BASE}/public/shops/${encodeURIComponent(slug)}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
        if (cancelled) return;
        setShop(res.data.shop);
        setProducts(res.data.products || []);
        setFollowing(!!res.data.shop.is_following);
        setFollowers(res.data.shop.follower_count || 0);

        // One shop, one address: if the link arrived with different casing,
        // rewrite it without adding a history entry.
        if (res.data.shop.slug && res.data.shop.slug !== slug) {
          window.history.replaceState(null, '', `/shop/${res.data.shop.slug}`);
        }
      } catch (err) {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [slug, token]);

  const addToCart = (item) => {
    if (!marketplaceLive) { toast('🛍️ The marketplace is coming soon!'); return; }
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id
          ? { ...c, quantity: Math.min(item.quantity !== undefined ? item.quantity : 99, (c.quantity || 1) + 1) }
          : c);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.title.slice(0, 30)} added to cart`);
  };

  const toggleFollow = async () => {
    if (!user) { toast.error('Sign in to follow this shop'); navigate('/login'); return; }
    try {
      const res = await axios.post(`${API_BASE}/public/shops/${shop.slug}/follow`, {},
        { headers: { Authorization: `Bearer ${token}` } });
      setFollowing(res.data.is_following);
      setFollowers(res.data.follower_count);
      toast.success(res.data.is_following ? `Following ${shop.name}` : `Unfollowed ${shop.name}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not update follow');
    }
  };

  const categories = useMemo(() => {
    const set = new Set(products.map(p => String(p.category || '').toLowerCase()).filter(Boolean));
    return ['all', ...[...set].sort()];
  }, [products]);

  const filtered = useMemo(() => products.filter(p => {
    const inCat = category === 'all' || String(p.category || '').toLowerCase() === category;
    const needle = q.trim().toLowerCase();
    const inSearch = !needle
      || String(p.title || '').toLowerCase().includes(needle)
      || String(p.description || '').toLowerCase().includes(needle);
    return inCat && inSearch;
  }), [products, category, q]);

  const pager = usePagination(filtered, 12);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center max-w-md">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">storefront</span>
          <h1 className="text-xl font-extrabold text-slate-800">We couldn't find that shop</h1>
          <p className="text-sm text-slate-500 mt-2">It may have closed, or the link may be out of date.</p>
          <button onClick={() => navigate('/pet-shops')}
            className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors">
            Browse all shops
          </button>
        </div>
      </div>
    );
  }

  const hours = shop.hours || null;
  const socials = shop.socials || null;
  const hasAside = !!(shop.bio || hours || shop.phone || shop.whatsapp || shop.delivery_note || shop.return_policy || socials);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <SEO
        title={`${shop.name} — Pet Shop in ${shop.address || 'Egypt'}`}
        description={shop.bio || `Browse ${shop.name}'s catalogue on PetPluse: pet food, toys, accessories and wellness products.`}
        keywords={`${shop.name}, pet shop egypt, ${shop.category || 'pet supplies'}, petpluse`}
        image={shop.banner_url || shop.logo_url || shop.image}
        type="website"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: shop.name,
          description: shop.bio || undefined,
          image: shop.logo_url || shop.image || undefined,
          address: shop.address || undefined,
          telephone: shop.phone || undefined,
          ...(Number(shop.reviews) > 0 && shop.rating
            ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: shop.rating, reviewCount: shop.reviews } }
            : {}),
        }}
      />

      {/* ── Cover ───────────────────────────────────────────── */}
      <div className="relative h-44 sm:h-60 bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden">
        {shop.banner_url && (
          <img src={shop.banner_url} alt="" aria-hidden="true"
            onError={(e) => { e.target.style.display = 'none'; }}
            className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="absolute top-4 left-4"><BackButton /></div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 sm:-mt-16 relative pb-16">

        {/* ── Identity ──────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
              {shop.logo_url || shop.image ? (
                <img src={shop.logo_url || shop.image} alt={`${shop.name} logo`}
                  onError={(e) => { e.target.style.display = 'none'; }}
                  className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-blue-500">storefront</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{shop.name}</h1>
                {/* Verification is real — an approved shop filed an ID document.
                    A pending shop says so instead of borrowing the badge. */}
                {shop.status === 'approved' && shop.is_verified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black uppercase tracking-wider border border-emerald-100">
                    <span className="material-symbols-outlined text-[14px]">verified</span> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">schedule</span> Not yet verified
                  </span>
                )}
                {shop.is_open === false && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[11px] font-black uppercase tracking-wider">Closed</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500 font-semibold">
                {shop.address && (
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-blue-500">location_on</span>{shop.address}
                  </span>
                )}
                {shop.category && (
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-blue-500">sell</span>{shop.category}
                  </span>
                )}
                {shop.founded_year && (
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-blue-500">history</span>Since {shop.founded_year}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Stars rating={shop.rating} reviews={shop.reviews} />
                  <span className="text-slate-500 font-semibold">
                    {Number(shop.reviews) > 0
                      ? `${Number(shop.rating).toFixed(1)} · ${shop.reviews} review${Number(shop.reviews) === 1 ? '' : 's'}`
                      : 'No reviews yet'}
                  </span>
                </span>
                <span className="text-slate-400 font-semibold">{shop.product_count} product{shop.product_count === 1 ? '' : 's'}</span>
                {followers > 0 && <span className="text-slate-400 font-semibold">{followers} follower{followers === 1 ? '' : 's'}</span>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button onClick={toggleFollow}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                  following ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}>
                <span className="material-symbols-outlined text-[18px]">{following ? 'check' : 'add'}</span>
                {following ? 'Following' : 'Follow'}
              </button>
              {shop.whatsapp && (
                <a href={`https://wa.me/${String(shop.whatsapp).replace(/[^0-9]/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">chat</span> WhatsApp
                </a>
              )}
              <button onClick={() => setReporting(true)}
                title="Report this shop"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-sm bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-rose-600 transition-colors">
                <span className="material-symbols-outlined text-[18px]">flag</span>
              </button>
            </div>
          </div>
        </div>

        <div className={`mt-6 grid gap-6 ${hasAside ? 'lg:grid-cols-[1fr_20rem]' : 'grid-cols-1'}`}>

          {/* ── Catalogue ───────────────────────────────────── */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-extrabold text-slate-800">
                {filtered.length === products.length ? 'Everything in this shop' : `${filtered.length} of ${products.length} products`}
              </h2>
              {products.length > 0 && (
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                  <input value={q} onChange={(e) => setQ(e.target.value)}
                    placeholder="Search this shop"
                    className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 transition-colors w-52" />
                </div>
              )}
            </div>

            {categories.length > 2 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {categories.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                      category === c ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                    {c === 'all' ? 'Everything' : c}
                  </button>
                ))}
              </div>
            )}

            {products.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inventory_2</span>
                <h3 className="font-bold text-slate-700">Nothing listed yet</h3>
                <p className="text-slate-400 text-xs mt-1">This shop hasn't added any products.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">search_off</span>
                <h3 className="font-bold text-slate-700">No match in this shop</h3>
                <button onClick={() => { setQ(''); setCategory('all'); }}
                  className="mt-3 text-xs font-bold text-blue-600 hover:underline">Clear the filters</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {pager.slice.map(item => (
                    <div key={item.id}
                      onClick={() => navigate(`/marketplace/product/${item.id}`)}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col border border-slate-100 group cursor-pointer">
                      <div className="relative h-44 overflow-hidden bg-slate-100 flex items-center justify-center">
                        <img src={item.image} alt={item.title}
                          onError={fallbackTo(PRODUCT_PLACEHOLDER)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        {item.badge && <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold ${BADGE_COLORS[item.badge] || 'bg-slate-600 text-white'}`}>{item.badge}</span>}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-slate-900 mb-1 leading-snug line-clamp-2">{item.title}</h3>
                        <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">{item.description}</p>
                        <div className="mt-auto">
                          <div className="flex items-center gap-1.5 mb-3">
                            <Stars rating={item.rating} reviews={item.reviews} />
                            <span className="text-xs text-slate-400">
                              {Number(item.reviews) > 0 ? `${item.reviews} review${Number(item.reviews) === 1 ? '' : 's'}` : 'No reviews yet'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-blue-600 text-lg">
                              {Number(item.base_price).toLocaleString()} <span className="text-sm font-bold">EGP</span>
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                              aria-label={`Add ${item.title} to cart`}
                              className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm active:scale-95">
                              <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination {...pager} label="products" />
              </>
            )}
          </section>

          {/* ── About ───────────────────────────────────────── */}
          {hasAside && (
            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              {shop.bio && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">About this shop</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{shop.bio}</p>
                </div>
              )}

              {hours && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Opening hours</h3>
                  <dl className="space-y-1.5">
                    {DAY_ORDER.map(d => (
                      <div key={d} className="flex items-center justify-between text-sm">
                        <dt className="text-slate-600 font-semibold">{DAY_LABELS[d]}</dt>
                        <dd className={hours[d] ? 'text-slate-800 font-bold tabular-nums' : 'text-slate-400 font-semibold'}>
                          {hours[d] ? `${hours[d].open} – ${hours[d].close}` : 'Closed'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {(shop.delivery_note || shop.return_policy) && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                  {shop.delivery_note && (
                    <div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-blue-500">local_shipping</span> Delivery
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{shop.delivery_note}</p>
                    </div>
                  )}
                  {shop.return_policy && (
                    <div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-blue-500">assignment_return</span> Returns
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{shop.return_policy}</p>
                    </div>
                  )}
                </div>
              )}

              {(shop.phone || socials) && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Get in touch</h3>
                  <div className="space-y-2">
                    {shop.phone && (
                      <a href={`tel:${String(shop.phone).replace(/\s/g, '')}`}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">
                        <span className="material-symbols-outlined text-[18px] text-blue-500">call</span>
                        <span dir="ltr">{shop.phone}</span>
                      </a>
                    )}
                    {socials && Object.entries(socials).map(([k, v]) => (
                      <a key={k} href={v} target="_blank" rel="noopener noreferrer nofollow"
                        className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors capitalize">
                        <span className="material-symbols-outlined text-[18px] text-blue-500">{SOCIAL_ICONS[k] || 'link'}</span>
                        {k}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-10">
          Looking for something else? <Link to="/pet-shops" className="font-bold text-blue-600 hover:underline">Browse all shops</Link>
        </p>
      </main>

      {reporting && (
        <ReportDialog
          targetType="shop"
          targetId={shop.id}
          targetLabel={shop.name}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
};

export default ShopStorefront;
