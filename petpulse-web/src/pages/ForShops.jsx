import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import Footer from '../components/layout/Footer';

const BENEFITS = [
    { icon: 'storefront', title: 'A storefront, not a filter', text: 'Your shop gets its own public page at its own clean link — something you can put in a bio or send to a customer, rather than a filtered view of the marketplace.' },
    { icon: 'upload_file', title: 'Import your whole catalogue', text: 'Export a spreadsheet from Excel or Google Sheets and upload it. Listing a hundred products stops being a hundred separate jobs.' },
    { icon: 'rule', title: 'Told exactly what to fix', text: 'Every row is checked on its own. A sheet with three mistakes imports the rest and tells you which three lines need attention — it does not reject the whole file.' },
    { icon: 'checklist', title: 'A checklist that earns its keep', text: 'We score your storefront against eight things customers actually look for, and explain what each one costs you if it is missing.' },
    { icon: 'favorite', title: 'Customers who follow you', text: 'Shoppers can follow your shop and get told when you post something new. You see the follower count live, and can mute the alerts if it gets noisy.' },
    { icon: 'verified', title: 'Verified badge = trust', text: 'Once your documents are checked, your storefront carries a Verified badge. What we never publish is the document itself.' },
];

const CHECKLIST = [
    { item: 'A logo', why: 'Customers recognise you in search and on every product' },
    { item: 'A cover photo', why: 'A shop with no cover reads as abandoned' },
    { item: 'A short bio', why: 'Who runs this shop, and why someone should buy from you' },
    { item: 'Your address', why: 'Shoppers filter by how close you are' },
    { item: 'Opening hours', why: 'Tells a customer whether it is worth coming now' },
    { item: 'Phone or WhatsApp', why: 'The contact Egyptian shoppers actually use' },
    { item: 'Delivery explained', why: 'The question you would otherwise answer in every message' },
    { item: 'A returns policy', why: 'Confidence to buy without asking first' },
];

const STEPS = [
    { n: 1, title: 'Create your shop', text: 'Sign up as a shop and add your name, category and business address.' },
    { n: 2, title: 'Get verified', text: 'We check your documents. Approved shops carry the Verified badge and appear in the marketplace.' },
    { n: 3, title: 'Upload your catalogue', text: 'Download our template, paste in your products, and import the lot in one go.' },
];

const ForShops = () => {
    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)]">
            <SEO
                title="For Pet Shops — Join PetPluse"
                description="Sell on PetPluse. Your own public storefront, bulk catalogue import from a spreadsheet, a storefront completeness checklist, followers, and a Verified badge. Free to list."
                keywords="pet shop egypt, sell pet products online cairo, pet store marketplace, bulk product import, petpluse for shops"
            />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #831843 55%, #be123c 100%)' }}></div>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 40%, rgba(244,63,94,0.55) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(251,191,36,0.4) 0%, transparent 45%)' }}></div>
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
                    <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-rose-100 text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-5">
                        <span className="material-symbols-outlined text-[16px]">storefront</span> For Pet Shops
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight text-balance max-w-3xl mx-auto">
                        Your shop online in <span className="text-rose-300">an afternoon</span>
                    </h1>
                    <p className="text-rose-100/90 text-base sm:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
                        Get a real storefront with its own address, upload your entire catalogue from a spreadsheet, and start taking orders from pet owners across Egypt — for free.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to="/signup?role=vendor" className="inline-flex items-center justify-center gap-2 bg-white text-rose-700 font-extrabold px-7 py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[20px]">how_to_reg</span> Join as a Shop
                        </Link>
                        <Link to="/pet-shops" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-bold px-7 py-3.5 rounded-2xl hover:bg-white/20 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[20px]">visibility</span> See shops on PetPluse
                        </Link>
                    </div>
                    <p className="text-rose-200/70 text-xs mt-4">Free to list • Verified badge • Cancel anytime</p>
                </div>
            </section>

            {/* Benefits */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Why shops choose PetPluse</h2>
                    <p className="text-slate-500 mt-2 max-w-xl mx-auto">The parts of selling online that usually take a developer — already built.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {BENEFITS.map((b) => (
                        <div key={b.title} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[26px]">{b.icon}</span>
                            </div>
                            <h3 className="font-bold text-slate-900 text-base mb-1.5">{b.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{b.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Bulk import */}
            <section className="bg-white border-y border-slate-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <span className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 text-[11px] font-black uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full mb-4">
                                <span className="material-symbols-outlined text-[15px]">upload_file</span> Bulk import
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Bring the whole catalogue with you</h2>
                            <p className="text-slate-500 mt-3 leading-relaxed">
                                Save your products as a CSV from Excel or Google Sheets and upload it. You get a preview before anything is created, so nothing is a surprise.
                            </p>
                            <ul className="mt-6 space-y-3">
                                {[
                                    'Name your columns whatever you already call them — “Base Price”, “price (EGP)” and the Arabic equivalents all match.',
                                    'Messy prices are understood: “1,200.50”, “EGP 300” and “300 EGP” all read as a number.',
                                    'Duplicates are caught, both inside the file and against products you already sell.',
                                    'Up to 500 products per upload, with a clear message rather than a silent cut-off.',
                                ].map((line) => (
                                    <li key={line} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                                        <span className="material-symbols-outlined text-[20px] text-emerald-600 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                        <span>{line}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-slate-400 mt-6">A template with example rows is included, so the expected shape is never a guess.</p>
                        </div>

                        {/* Import preview mockup */}
                        <div className="bg-slate-900 rounded-3xl p-5 shadow-2xl shadow-slate-900/20">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                                <span className="text-slate-400 text-xs font-mono ml-2">catalogue.csv</span>
                            </div>
                            <div className="bg-slate-800/60 rounded-2xl p-4 space-y-2.5">
                                <div className="flex items-center justify-between text-xs font-mono">
                                    <span className="text-emerald-400">✓ 197 products ready</span>
                                    <span className="text-slate-500">200 rows</span>
                                </div>
                                <div className="h-px bg-slate-700"></div>
                                {[
                                    ['Royal Canin Adult 4kg', 'Food', '1,200.50', 'ok'],
                                    ['Rope Tug Toy', 'Toys', 'EGP 85', 'ok'],
                                    ['Leather Collar (M)', 'Accessories', '240', 'ok'],
                                    ['Flea Drops', '—', '150', 'err'],
                                ].map(([name, cat, price, state]) => (
                                    <div key={name} className="flex items-center gap-3 text-xs font-mono">
                                        <span className={state === 'ok' ? 'text-emerald-400' : 'text-rose-400'}>{state === 'ok' ? '✓' : '✕'}</span>
                                        <span className="text-slate-200 flex-1 truncate">{name}</span>
                                        <span className="text-slate-500 w-24 truncate">{cat}</span>
                                        <span className="text-slate-300">{price}</span>
                                    </div>
                                ))}
                                <div className="h-px bg-slate-700"></div>
                                <p className="text-[11px] text-rose-300 font-mono leading-relaxed">
                                    Row 4 — category must be Food, Toys, Accessories or Wellness
                                </p>
                            </div>
                            <p className="text-slate-500 text-[11px] mt-4 text-center">The other 197 still import. You fix one line.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Storefront checklist */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                <div className="text-center mb-12">
                    <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-[11px] font-black uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full mb-4">
                        <span className="material-symbols-outlined text-[15px]">checklist</span> Storefront score
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Eight things, and why each one matters</h2>
                    <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
                        Your dashboard scores your storefront out of eight and shows the gap as a percentage. Every item comes with the reason it is on the list — an empty storefront looks worse than no storefront.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {CHECKLIST.map((c, i) => (
                        <div key={c.item} className="bg-white rounded-2xl border border-slate-100 p-5 flex gap-4 items-start shadow-sm">
                            <span className="w-8 h-8 shrink-0 rounded-xl bg-amber-50 text-amber-700 font-black text-xs flex items-center justify-center">{String(i + 1).padStart(2, '0')}</span>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">{c.item}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed mt-0.5">{c.why}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="bg-white border-y border-slate-100">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Live in three steps</h2>
                        <p className="text-slate-500 mt-2">From sign-up to your first order.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {STEPS.map((s) => (
                            <div key={s.n} className="relative bg-slate-50/60 rounded-3xl border border-slate-100 p-6 text-center">
                                <div className="w-11 h-11 rounded-full bg-rose-600 text-white font-black text-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-600/25">{s.n}</div>
                                <h3 className="font-bold text-slate-900 mb-1.5">{s.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{s.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Ready to open your storefront?</h2>
                <p className="text-slate-500 mt-2 mb-7 max-w-lg mx-auto">Create your shop today — it takes a couple of minutes and costs nothing to start.</p>
                <Link to="/signup?role=vendor" className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-rose-600/25 hover:-translate-y-0.5 active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-[22px]">how_to_reg</span> Join as a Shop
                </Link>
                <p className="text-xs text-slate-400 mt-4">
                    Already have an account? <Link to="/login" className="text-rose-600 font-bold hover:underline">Log in</Link>
                </p>
            </section>

            <Footer />
        </div>
    );
};

export default ForShops;
