import fs from 'fs';

const filePath = 'g:\\Mewoo\\docs\\qms-submissions\\phase2-deck\\index.html';
let content = fs.readFileSync(filePath, 'utf8');

const aiEvolutionHTML = `
<!-- ═══ 10.5 · AI EVOLUTION ═══ -->
<section class="slide" id="s-ai-transition" data-nav="05 · AI Evolution">
  <div class="up"><p class="kicker" style="font-size:.85rem">05 — Agentic AI · Evolution</p>
    <h1 style="font-size:5rem;line-height:1.1">From a paid wrapper to<br><em>an in-house autonomous agent.</em></h1></div>
  <div class="body">
    <div class="up" style="display:grid;grid-template-columns:1fr 1fr;gap:0 60px;margin-top:20px;align-items:stretch">
      <!-- Phase 1 -->
      <div style="padding:44px;border-radius:20px;background:linear-gradient(180deg, rgba(255,122,147,.08), rgba(255,122,147,.02));border:1px solid rgba(255,122,147,.25);box-shadow:0 20px 40px rgba(0,0,0,.4)">
         <div style="font-family:var(--mono);font-size:1rem;letter-spacing:.15em;text-transform:uppercase;color:var(--rose);margin-bottom:24px">Phase 1: External Dependency</div>
         <h3 style="font-family:var(--display);font-size:2.6rem;font-weight:300;margin-bottom:24px;color:var(--w)">Paid OpenAI API</h3>
         <ul style="list-style:none;padding:0;margin:0;font-size:1.25rem;color:var(--w2);line-height:1.6">
           <li style="display:flex;gap:14px;margin-bottom:18px"><i style="color:var(--rose);font-style:normal">✕</i> Simple black-box wrapper</li>
           <li style="display:flex;gap:14px;margin-bottom:18px"><i style="color:var(--rose);font-style:normal">✕</i> High recurring monthly costs ($26/mo)</li>
           <li style="display:flex;gap:14px"><i style="color:var(--rose);font-style:normal">✕</i> Complete vendor lock-in</li>
         </ul>
      </div>
      <!-- Phase 2 -->
      <div style="padding:44px;border-radius:20px;background:linear-gradient(180deg, rgba(74,222,158,.08), rgba(74,222,158,.02));border:1px solid rgba(74,222,158,.3);box-shadow:0 20px 40px rgba(0,0,0,.4);position:relative;overflow:hidden">
         <div style="position:absolute;top:0;left:0;right:0;height:4px;background:var(--green);box-shadow:0 0 20px var(--green)"></div>
         <div style="font-family:var(--mono);font-size:1rem;letter-spacing:.15em;text-transform:uppercase;color:var(--green);margin-bottom:24px">Phase 2: Built from Scratch</div>
         <h3 style="font-family:var(--display);font-size:2.6rem;font-weight:300;margin-bottom:24px;color:var(--w)">In-House Agentic Loop</h3>
         <ul style="list-style:none;padding:0;margin:0;font-size:1.25rem;color:var(--w2);line-height:1.6">
           <li style="display:flex;gap:14px;margin-bottom:18px"><i style="color:var(--green);font-style:normal">✓</i> Full architectural control & custom tool schemas</li>
           <li style="display:flex;gap:14px;margin-bottom:18px"><i style="color:var(--green);font-style:normal">✓</i> Zero recurring costs via open-weight models</li>
           <li style="display:flex;gap:14px"><i style="color:var(--green);font-style:normal">✓</i> Provider-agnostic (Groq, Ollama, Mock fallback)</li>
         </ul>
      </div>
    </div>
  </div>
</section>
`;

content = content.replace(/(<!-- ═══ 10 · AGENTIC AI ① — what it became ═══ -->)/, aiEvolutionHTML + '\n$1');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully injected the AI Evolution slide!");
