import fs from 'fs';

const filePath = 'g:\\Mewoo\\docs\\qms-submissions\\phase2-deck\\index.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Insert Market Research slide after s-problem
const sMarketHTML = `
<!-- ═══ 5.5 · MARKET RESEARCH ═══ -->
<section class="slide" id="s-market" data-nav="03 · Market Research">
  <div class="up"><p class="kicker">03 — Market Research</p>
    <h1>The market is fragmented.<br><em>We built to unify it.</em></h1></div>
  <div class="body">
    <div class="up" style="display:grid;grid-template-columns:1fr 1fr;gap:0 60px;align-items:center">
      <div style="background:rgba(255,255,255,.03);border:1px solid var(--hair2);border-radius:16px;padding:34px;box-shadow:0 20px 40px rgba(0,0,0,.5)">
        <div style="font-family:var(--mono);font-size:.66rem;letter-spacing:.18em;text-transform:uppercase;color:var(--amber);margin-bottom:12px">Target Persona</div>
        <h3 style="font-family:var(--display);font-size:2.2rem;font-weight:300;margin-bottom:8px">Sara Ahmed, 23</h3>
        <p style="font-size:1.05rem;color:var(--w2);line-height:1.5;margin-bottom:24px">Graphic Designer from Cairo. Struggles with a busy work schedule and finding trustworthy pet care.</p>
        <div style="padding-top:20px;border-top:1px solid var(--hair2)">
          <div style="font-family:var(--mono);font-size:.66rem;letter-spacing:.18em;text-transform:uppercase;color:var(--rose);margin-bottom:12px">Core Pain Points</div>
          <ul style="list-style:none;padding:0;margin:0;font-size:1rem;color:var(--w2);line-height:1.7">
            <li style="display:flex;gap:12px;margin-bottom:8px"><i style="color:var(--rose);font-style:normal">✕</i>Difficulty finding verified adoptions or mating partners</li>
            <li style="display:flex;gap:12px;margin-bottom:8px"><i style="color:var(--rose);font-style:normal">✕</i>Scattered clinics with highly manual booking</li>
            <li style="display:flex;gap:12px"><i style="color:var(--rose);font-style:normal">✕</i>Lack of reliable, safe pet hosting during travel</li>
          </ul>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;justify-content:center">
        <div style="font-family:var(--mono);font-size:.66rem;letter-spacing:.18em;text-transform:uppercase;color:var(--blue);margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--hair)">Competitor Analysis</div>
        <div id="market-comp" style="display:flex;flex-direction:column;gap:16px"></div>
      </div>
    </div>
  </div>
  <div class="note"><span class="l">The Opportunity</span>
    <p>Collaborate with clinics and stores to provide a unified platform, dominating the fragmented Egyptian market.</p></div>
</section>
`;
content = content.replace(/(<!-- ═══ 6 · ROLES — radial diagram ═══ -->)/, sMarketHTML + '\n$1');

// 2. Insert Community Features slide after s-core
const sAdoptionsHTML = `
<!-- ═══ 9.5 · COMMUNITY FEATURES ═══ -->
<section class="slide" id="s-adoptions" data-nav="05 · Community features">
  <div class="up"><p class="kicker">05 — Community Features</p>
    <h1>Adoptions &amp; Mating Hub.<br><em>Built on PostGIS &amp; verified data.</em></h1></div>
  <div class="body">
    <div class="up" id="adoptgrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:0 24px"></div>
    <div class="up" style="margin-top:40px;padding-top:24px;border-top:1px solid var(--hair2);display:flex;gap:60px;justify-content:center">
      <div style="text-align:center"><div style="font-family:var(--display);font-size:2.8rem;color:var(--green)">100%</div><div style="font-family:var(--mono);font-size:.7rem;color:var(--faint);letter-spacing:.1em;text-transform:uppercase;margin-top:6px">Verified Profiles</div></div>
      <div style="text-align:center"><div style="font-family:var(--display);font-size:2.8rem;color:var(--blue)">Live</div><div style="font-family:var(--mono);font-size:.7rem;color:var(--faint);letter-spacing:.1em;text-transform:uppercase;margin-top:6px">Spatial Queries</div></div>
    </div>
  </div>
</section>
`;
content = content.replace(/(<!-- ═══ 10 · AGENTIC AI ① — what it became ═══ -->)/, sAdoptionsHTML + '\n$1');

// 3. Update TOC (Agenda) indices in JS
// Old indices: 2, 3, 4, 6, 8, 12, 14, 19
// New indices: 2, 3, 4, 7, 10, 14, 16, 21
content = content.replace(
  /\/\* 2 contents \*\/\s*\[\['01','Phase 1 → Phase 2','What changed',2\],\['02','Team','Ten members',3\],\s*\['03','Problem & Solution','Four failures, six roles',4\],\['04','Architecture & Stack','How it fits together',6\],\s*\['05','What We Delivered','Platform, AI, admin',8\],\['06','Demonstration','The running system',12\],\s*\['07','Security','The workstream, findings, fixes and defences',14\],\['08','Results & Roadmap','Evidence and next',19\]\s*\]/,
  `/* 2 contents */
  [['01','Phase 1 → Phase 2','What changed',2],['02','Team','Ten members',3],
   ['03','Problem & Market','Failures, competitors & roles',4],['04','Architecture & Stack','How it fits together',7],
   ['05','What We Delivered','Platform, AI, admin',10],['06','Demonstration','The running system',14],
   ['07','Security','The workstream, findings, fixes and defences',16],['08','Results & Roadmap','Evidence and next',21]
  ]`
);

// 4. Inject JS for Market Research and Adoptions
const jsPayload = `
  /* Market Competitors */
  into('market-comp',[
    ['7Pets / PetSmart','Weak online experience','AI recommendations & unified app'],
    ['EGY Puppy','High prices, limited focus','Affordable & premium tiers'],
    ['Ziggy Pupps / Pets Home','Weak digital presence','Scalable architecture & seamless UX'],
    ['Rover / Zooplus (Global)','Fragmented services','Integrated marketplace & trusted booking']
  ],function(d){
    return el('div','hr','<b style="font-size:1.1rem;margin-bottom:6px">'+d[0]+'</b><div class="ba" style="font-size:.85rem">'+
      '<span class="was" style="color:var(--faint)">'+d[1]+'</span><span style="color:var(--faint);margin:0 8px">→</span><span class="now" style="color:var(--green)">'+d[2]+'</span></div>');
  });

  /* Adoptions & Mating */
  into('adoptgrid',[
    ['🩺','Verified Adoptions','var(--green)','The pet\\'s medical history is transparently attached to the profile, allowing potential owners to see exact vaccination records securely.'],
    ['🧬','Mating Matching','var(--blue)','Owners looking to breed their pets can securely list requests. PostGIS spatial coordinates find the nearest perfect match by breed and age.'],
    ['🏡','Localized Pet Hosting','var(--amber)','Find verified, vetted hosts and pet-sitters nearby. Our engine dynamically filters caretakers within a custom radius for secure travel hosting.']
  ],function(d){
    var e=el('div','dcc',
        '<div class="hd"><div class="ic" style="font-size:1.4rem;background:color-mix(in srgb,'+d[2]+' 15%,transparent);border-color:color-mix(in srgb,'+d[2]+' 32%,transparent)">'+d[0]+'</div>'+
        '<div><h3 style="margin-bottom:0;color:var(--w)">'+d[1]+'</h3></div></div>'+
        '<p style="margin-bottom:0;font-size:.95rem;color:var(--w2)">'+d[3]+'</p>');
    e.style.setProperty('--c',d[2]);
    e.style.justifyContent='flex-start';
    e.style.paddingBottom='26px';
    return e;
  });
`;

content = content.replace(/(?=\/\* 6 radial \*\/)/, jsPayload + '\n  ');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated the presentation with missing content!");
