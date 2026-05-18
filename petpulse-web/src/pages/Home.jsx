import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SERVICES = [
  { icon: 'medical_services', color: 'text-blue-600', bg: 'bg-blue-50', title: 'Vet Booking', desc: 'Expert medical consultations and routine checkups with the best neighborhood vets.', link: '/vet-booking', cta: 'Book Now', wide: true },
  { icon: 'psychology', color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Trainers', desc: 'Positive reinforcement behavior training for all breeds.', link: '/trainers', cta: 'Find Trainers' },
  { icon: 'favorite', color: 'text-amber-600', bg: 'bg-amber-50', title: 'Adoption', desc: 'Give a forever home to pets waiting for love.', link: '/explore', cta: 'Adopt Today' },
  { icon: 'home', color: 'text-purple-600', bg: 'bg-purple-50', title: 'Pet Hosting', desc: "Safe and cozy environment for your pet when you're away.", link: '/community', cta: 'Find a Host' },
  { icon: 'groups', color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Community Support', desc: 'Connect with other pet parents, share tips, and attend local meetups.', link: '/community', cta: 'Join Groups', wide: true },
];

const STATS = [
  { value: '50k+', label: 'Happy Pets', color: 'text-blue-600' },
  { value: '1.2k+', label: 'Verified Vets', color: 'text-emerald-600' },
  { value: '15k+', label: 'Successful Adoptions', color: 'text-amber-600' },
  { value: '98%', label: 'Positive Reviews', color: 'text-purple-600' },
];

const PETS = [
  { name: 'Milo', type: 'DOG', desc: '2 years • Calm & Loving', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIYDqvNenCMOIcovCc3-8JiqPFIFVMge8QT3kBMGgY00RFtQZz36_5xeoOW6u0MeSzrPwrScDyyg5-PmQsx0vDvS33gAEL7AofIxjdu2mkHYU3JR6laFwWrOF-E9R5GDlnQPOBWNtOfKufF4lhgc4Dwztk2BpH4JSL_NInA1FCEUwfhpqx9AKWHdhOoGlYnSN3rtBpm1mrdIVYyiV4T5xAXLW--qQXHJOKiNqx3S0y0vDyaF70Yd0s8d8OeXirjFs5OhSGas3ruxiK' },
  { name: 'Luna', type: 'CAT', desc: '6 months • Energetic', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1HTaaBQPg3n_nYf7w6etlvKrVwf6dxEoFOZAPH95jlQc0X8myrLHYV0YL5Tjo0PUsuMLUWa_wz6B-FWk6aw_x0e2Y7Gt3afAJ-B-ZQbm9wvnJhqYFndgXfVSblSmxeC_6YPpgL9xIOClSCE8MnmBWbd-JVD25BfeKNsA2ALnh4F-E4L3LurtCfYQ7drMMb8AFlDhQhAgC_K1MwBGFKPVHsC4M8MgOQETv_vWP2OkI26iXeggtM98IefRiHj22amdfkyzpMNZEBBXd' },
];

const TESTIMONIALS = [
  { name: 'Emma Wilson', role: 'Dog Owner', time: '2 hours ago', text: "Just used the PetPulse trainer for Bella's leash training. The results in just one session are amazing! Highly recommend.", likes: 124, comments: 12, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7NSd1B77fUhW2VlbZEruYEZQexGQ3M0FOcS2S_Fx-tO5zgj7lSLKYWhj8FO84wrGodWgIlraolXhJhZYVHYrf-r8FoxfAFfAGJ2ySxEy4SrbTeQg1aXQcgg58i9jLZ2uXDsn5mwvzDprvqIMbUrvDNqor7c0a57UAtk3z9KeRJX438iXScAFtZwdaqwHUK2eMuVVhlTzeh07AFChSD-SFOS2q8jyiRtNaiIpL5CDGGdNJQ88pMR3ueSJq05YVumL9GHDHVS3eyhlb' },
  { name: 'David Miller', role: 'Cat Enthusiast', time: '5 hours ago', text: 'Any advice for introducing a new kitten to an older cat? Looking for tips from the community!', likes: 89, comments: 45, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtNljpDsOwNpMkejxe6j_8LaLqyegfu-xonuItALT2w873cVuX-YW58M_E9r9JpmScw_iCjiTiv8C1bZ-w4TN1wkT8o8TJZNigXCMQJyhr4aDkrlsNPHFM9zIopalyor6srA-GdeOFUL7NPnUwBZIlKNIIFtWRL8sXm16cMhyPQQn8JfV5WdiYkl018qxdNpI6UbSA5xm93cjFBt4uUdx7n9JF7ZkmCpovVAGkxkEnAQvCqq7SIf4R5dq6q6JXEi0l7qGQo2Y6PzWE' },
  { name: 'Sofia Rodriguez', role: 'Pet Host', time: '1 day ago', text: "Loved hosting Toby this weekend! He was such a polite guest. Can't wait for his next stay.", likes: 210, comments: 8, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmzcTNwkdAkFiV4GMy8nrtqifdzWEruLiOM0nG-gabzRZQn8gvFwjHzIdf7cX-7uhOsO5glEstzIMbWaFYVgGjtACz8JUStMjKAMGzDz-mBI8owuQgt6Tyf9j97PwkZaqM1cQrQCHyBzxLePt7Td6mFIgw9vIqF-FhWeVSs_N-dZlZsxdEEi2Py055N80HXSp-326KtGhq5T2NmVrZHaFjhDu1B_hCk-fZlmjIC_p5BANkP_QrVxdjB3WCuEz6mYPfwK79HWYfkLmg' },
];

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="bg-[#f7faf9] text-slate-800 font-sans antialiased">
      {/* HERO */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16 sm:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-8 sm:gap-16 items-center">
          <div className="z-10">
            <span className="inline-block py-1 px-3 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs mb-6 tracking-wider uppercase">All-in-One Pet Care</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
              Your Pet Care Companion <br className="hidden sm:block" />in One Place 🐾
            </h1>
            <p className="text-slate-600 text-lg mb-10 max-w-lg leading-relaxed">
              Connect with verified professionals, discover your next furry family member, and join a community that loves pets as much as you do.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              {user ? (
                <Link to="/marketplace" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-all inline-flex items-center justify-center">
                  Explore Marketplace
                </Link>
              ) : (
                <Link to="/signup" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-all inline-flex items-center justify-center">
                  Get Started
                </Link>
              )}
              <a href="#premiumServices" className="bg-emerald-100 text-emerald-800 px-8 py-4 rounded-xl font-semibold transition-all hover:bg-emerald-200 inline-flex items-center justify-center">
                Explore Services
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-100 rounded-full blur-3xl opacity-60"></div>
            <img
              className="relative z-10 w-full h-80 lg:h-[500px] object-cover rounded-[2rem] shadow-2xl border-4 border-white"
              alt="Cheerful golden retriever sitting with owner"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBysgy0KIwEM0GDDdTPfwcRVLFWjUDRNNC6G_TBGODvH1uHsdvQuB_kGeKmflTiCjGzWqqavszutzoCBax5H69uMdIgMAD-A42VUzYD2N6GNA-ySliMBgf9KFUXNvAtUWwBCzwnVNOH3VGQDgU-AvBPx5MweQjcUEcr_qeKgWEBR-f86FHzYtcpqAh8cNHfENhuvipWpJui-gmvgVc2hDEu8dobYH5BZmsNgbHhwmsHmnQA6W3F-JFRpn3zy8X9JqdR48J4I_QSG8ku"
            />
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="premiumServices" className="bg-slate-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900">Premium Pet Services</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Tailored care solutions designed to keep your companions happy, healthy, and safe.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((s, i) => (
              <div key={i} className={`bg-white p-8 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col justify-between ${s.wide ? 'sm:col-span-2 lg:col-span-2' : ''}`}>
                <div>
                  <span className={`material-symbols-outlined text-4xl ${s.color} mb-6 ${s.bg} p-3 rounded-xl inline-block`}>{s.icon}</span>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">{s.title}</h3>
                  <p className="text-slate-500 mb-6 leading-relaxed">{s.desc}</p>
                </div>
                <Link to={s.link} className={`flex items-center gap-2 ${s.color} font-bold hover:gap-4 transition-all`}>
                  {s.cta} <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-12">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <div className={`text-4xl font-extrabold ${s.color} mb-2`}>{s.value}</div>
              <div className="text-slate-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ADOPTION */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-bold mb-2 text-slate-900">Available for Adoption</h2>
              <p className="text-slate-500">Meet the newest residents looking for a family.</p>
            </div>
            <Link to="/community" className="text-blue-600 font-bold flex items-center gap-1 hover:underline">
              View All <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {PETS.map((pet, i) => (
              <div key={i} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="relative h-64 overflow-hidden">
                  <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={pet.img} alt={pet.name} />
                  <span className={`absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold ${pet.type === 'DOG' ? 'text-blue-600' : 'text-emerald-600'}`}>{pet.type}</span>
                </div>
                <div className="p-6">
                  <h4 className="font-bold text-lg mb-1 text-slate-900">{pet.name}</h4>
                  <p className="text-slate-500 text-sm mb-4">{pet.desc}</p>
                  <Link to="/explore" className="block w-full py-2 border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-600 hover:text-white transition-colors text-center text-sm">
                    Meet {pet.name}
                  </Link>
                </div>
              </div>
            ))}

            {/* Featured Vet Card */}
            <div className="bg-blue-600 text-white p-8 rounded-2xl flex flex-col justify-center items-center text-center shadow-sm">
              <div className="w-20 h-20 bg-white rounded-full mb-4 overflow-hidden border-4 border-blue-400">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDv07daU7cpGvrywTaxdqAxwOKU8PO9DTbmhxUW0hggbgqUdcfdquCXzQ4rY-GA44PpaR92ik69Ogt6uUXNpZJbuVV2fgO6vTlPoKSAjAs1UbFrPIjXOZ7kf3RmKUfdVIvTnBKnl9VyXRL8sAqyV-T3UWeNEbYHKBacWe6R8maD5Au7iZSjXUr0lZE0ALSKujQlOGn2f23Rx_xw6fqsIYNA2Qa6LntkQAoydxHqmpsnX5NaGEvy7WyQwtiZUY-quEsvuapJDw-77AKn" alt="Dr. Sarah" />
              </div>
              <h4 className="font-bold text-lg">Dr. Sarah Chen</h4>
              <p className="text-sm opacity-90 mb-4">Senior Veterinary Surgeon</p>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium mb-6">Online Now</span>
              <Link to="/vet-booking" className="bg-white text-blue-600 px-6 py-2 rounded-full font-bold text-sm w-full text-center block hover:bg-blue-50 transition-colors">
                Quick Chat
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: 'verified_user', color: 'text-blue-600', title: 'Verified Pros', desc: 'Every professional undergoes a rigorous 5-step verification process.' },
                { icon: 'calendar_month', color: 'text-emerald-600', title: 'Easy Booking', desc: 'Schedule appointments in seconds with our intuitive platform.' },
                { icon: 'security', color: 'text-amber-600', title: 'Safe Adoption', desc: 'Secure legal paperwork and home-readiness support for every pet.' },
                { icon: 'forum', color: 'text-purple-600', title: 'Active Community', desc: '24/7 access to peer advice and emergency community support.' },
              ].map((f, i) => (
                <div key={i} className={`bg-white p-6 rounded-2xl shadow-sm ${i % 2 !== 0 ? 'mt-4' : ''}`}>
                  <span className={`material-symbols-outlined ${f.color} mb-4 inline-block text-2xl`}>{f.icon}</span>
                  <h4 className="font-bold mb-2 text-slate-900">{f.title}</h4>
                  <p className="text-sm text-slate-500">{f.desc}</p>
                </div>
              ))}
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-6 text-slate-900">Designed for Peace of Mind</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                We understand that your pet is family. That's why PetPulse is built on a foundation of trust, safety, and expertise. We handle the logistics so you can focus on the cuddles.
              </p>
              <ul className="space-y-4">
                {['Direct communication with providers', 'Insured services for all bookings', 'Seamless digital records for health'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900">From Our Community</h2>
            <p className="text-slate-500">Join the conversation with thousands of pet parents.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <img className="w-10 h-10 rounded-full object-cover" src={t.img} alt={t.name} />
                  <div>
                    <h5 className="font-bold text-sm text-slate-900">{t.name}</h5>
                    <p className="text-xs text-slate-500">{t.time} • {t.role}</p>
                  </div>
                </div>
                <p className="text-sm mb-4 leading-relaxed text-slate-700">{t.text}</p>
                <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">favorite</span> {t.likes}</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">comment</span> {t.comments}</span>
                  </div>
                  <span className="material-symbols-outlined text-sm cursor-pointer hover:text-blue-600 transition-colors">share</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto bg-blue-600 rounded-[2rem] p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Ready to give your pet<br/>the best life?</h2>
            <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">Join 50,000+ pet parents who trust PetPulse for their companion's wellness journey.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup" className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition-all inline-flex items-center justify-center gap-2 shadow-lg">
                Get Started Free <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link to="/explore" className="bg-blue-500 text-white px-8 py-4 rounded-xl font-bold border-2 border-white/30 hover:bg-blue-400 transition-all inline-flex items-center justify-center">
                Browse Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-blue-400 text-2xl">pets</span>
              <span className="font-bold text-white text-lg">PetPulse</span>
            </div>
            <p className="text-sm leading-relaxed">Compassionate care for every companion. Egypt's #1 pet care platform.</p>
          </div>
          {[
            { title: 'Services', links: ['Vet Booking', 'Pet Trainers', 'Adoption', 'Marketplace'] },
            { title: 'Company', links: ['About Us', 'Community', 'Contact', 'FAQ'] },
            { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
          ].map((col, i) => (
            <div key={i}>
              <h4 className="font-bold text-white mb-4 text-sm">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l, j) => (
                  <li key={j}><a href="#" className="text-sm hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-800 mt-12 pt-8 text-center text-sm">
          © {new Date().getFullYear()} PetPulse. All rights reserved. Made with ❤️ for pets everywhere.
        </div>
      </footer>
    </div>
  );
};

export default Home;
