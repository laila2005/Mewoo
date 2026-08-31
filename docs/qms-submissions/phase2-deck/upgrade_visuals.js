import fs from 'fs';

const filePath = 'g:\\Mewoo\\docs\\qms-submissions\\phase2-deck\\index.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Upgrade Tech Stack slide to include inline SVGs instead of just text
const stackReplacement = `
  /* 8 stack — every entry verified against package.json and the import graph */
  const SVGS = {
    react: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"></circle><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30)"></ellipse><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(150)"></ellipse><ellipse cx="12" cy="12" rx="10" ry="4"></ellipse></svg>',
    node: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    db: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
    auth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>',
    pay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>',
    ocr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"></path><circle cx="12" cy="12" r="3"></circle></svg>'
  };
  into('stackgrid',[['Frontend','React 19 · Vite · Tailwind', SVGS.react],['Backend','Node.js · Express 4', SVGS.node],
    ['Database','PostgreSQL on Supabase', SVGS.db],['Auth','JWT · bcrypt · Google Sign-In', SVGS.auth],
    ['AI','Vercel AI SDK · Zod · Groq / Ollama', SVGS.ai],
    ['Media & maps','Cloudinary · Leaflet + OpenStreetMap', SVGS.map],
    ['Payments & email','Paymob · Brevo SMTP', SVGS.pay],['OCR & realtime','Tesseract.js · Socket.IO', SVGS.ocr]],
    function(d){return el('div','sg','<div style="width:28px;height:28px;margin-bottom:12px;color:var(--blue)">'+d[2]+'</div><div class="k">'+d[0]+'</div><b>'+d[1]+'</b>');});
`;
content = content.replace(/\/\* 8 stack.*\}\);\}\);/s, stackReplacement.trim());


// 2. Upgrade Team Avatars to high-end UI gradients instead of just solid flat colors, giving them a more premium "avatar" feel
content = content.replace(
  /background:color-mix\(in srgb,var\(--c\) 18%,transparent\);/g,
  'background:linear-gradient(135deg, color-mix(in srgb,var(--c) 25%,transparent), color-mix(in srgb,var(--c) 5%,transparent));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 30%,transparent);'
);
content = content.replace(
  /border:1px solid color-mix\(in srgb,var\(--c\) 40%,transparent\)/g,
  'border:none'
);


// 3. Upgrade Core Platform Grid to use Image Snippets instead of Emojis
const coreReplacement = `
  /* 9 core */
  into('coregrid',[['assets/m-marketplace.jpeg','Appointments','Real availability, conflict prevention, calendar invite'],
    ['assets/m-shops.jpeg','Marketplace','Verified shops, bulk import, signed Paymob checkout'],
    ['assets/m-community.jpeg','Community','Posts, reactions, AI moderation with appeals'],
    ['assets/m-petmatch.jpeg','Lost & Found','Map-pinned reports, confidence-scored matching'],
    ['assets/m-marketplace.jpeg','Messaging','Unaccepted senders isolated, no inbox spam'],
    ['assets/m-shops.jpeg','Discovery','Nearest-first, live OpenStreetMap shops']],
    function(d){return el('div','cg','<div style="width:100%;height:100px;border-radius:12px;margin-bottom:16px;background:url('+d[0]+') center/cover;border:1px solid var(--hair);box-shadow:0 10px 20px rgba(0,0,0,0.4)"></div><b>'+d[1]+'</b><p>'+d[2]+'</p>');});
`;
content = content.replace(/\/\* 9 core.*\}\);\}\);/s, coreReplacement.trim());

// 4. Update the Market Persona to include a generic placeholder/silhouette or beautiful styling
content = content.replace(
  /<h3 style="font-family:var\(--display\);font-size:2.2rem;font-weight:300;margin-bottom:8px">Sara Ahmed, 23<\/h3>/,
  '<div style="display:flex;gap:16px;align-items:center;margin-bottom:16px"><div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg, var(--amber), #ff8a00);box-shadow:0 8px 16px rgba(255,194,77,0.3);display:flex;align-items:center;justify-content:center;font-size:1.6rem">👩🏽‍💻</div><h3 style="font-family:var(--display);font-size:2.2rem;font-weight:300;margin:0">Sara Ahmed, 23</h3></div>'
);

// 5. Update Competitors to include a visual badge
content = content.replace(
  /'<span class="was"/g,
  `'<div style="width:32px;height:32px;border-radius:6px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;margin-right:12px;float:left;font-size:.9rem;border:1px solid var(--hair2)">🏢</div><span class="was"`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully upgraded presentation visuals!");
