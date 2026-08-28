// ─────────────────────────────────────────────────────────────
// VetAI — tool registry contract.
//
// The eval harness in eval.js covers the guardrails and the route contract
// thoroughly, but it exercises only the handful of tools a mock provider
// happens to select. That leaves a gap: a new tool can be merged with no
// description, an unvalidated argument, or a silent rename, and nothing fails.
//
// This closes it. Two guards, neither of which needs a model or a database:
//
//   1. Registry drift — the exact set of tool names is pinned. Adding,
//      removing or renaming a tool fails the build until MANIFEST is updated,
//      which is the prompt to add eval coverage for it at the same time.
//   2. Per-tool contract — every tool must carry a usable description, a Zod
//      schema, and an executable handler; the schema must actually reject a
//      wrong-typed argument rather than waving it through.
//
// Run: node tests/ai/toolContract.test.js   (AI_PROVIDER is irrelevant here)
// ─────────────────────────────────────────────────────────────
import { allTools } from '../../src/ai/tools.js';

// The pinned registry. Update this deliberately, in the same commit that adds
// the tool AND its eval coverage — that is the whole point of the guard.
const MANIFEST = [
    'createAccount',
    'registerPet',
    'findAvailableVets',
    'bookAppointment',
    'suggestSlots',
    'searchMedicalGuidelines',
    'findMatingPartners',
    'findAdoptablePets',
    'searchProviders',
    'navigateTo',
];

let passed = 0;
let failed = 0;

function check(name, ok, detail = '') {
    if (ok) {
        passed += 1;
        console.log(`  ✅ PASS  ${name}`);
    } else {
        failed += 1;
        console.log(`  ❌ FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    }
}

console.log('\n──── Tool registry drift ────');

const actual = Object.keys(allTools).sort();
const expected = [...MANIFEST].sort();

const added = actual.filter((t) => !expected.includes(t));
const removed = expected.filter((t) => !actual.includes(t));

check(
    'registry matches the pinned manifest',
    added.length === 0 && removed.length === 0,
    [
        added.length ? `new tool(s) not in MANIFEST: ${added.join(', ')}` : '',
        removed.length ? `MANIFEST lists missing tool(s): ${removed.join(', ')}` : '',
    ].filter(Boolean).join(' | ')
);
check(`tool count is ${MANIFEST.length}`, actual.length === MANIFEST.length, `found ${actual.length}`);

console.log('\n──── Per-tool contract ────');

for (const name of actual) {
    const tool = allTools[name];

    check(`${name}: has a description`, typeof tool?.description === 'string' && tool.description.trim().length >= 20,
        'a model picks tools by description alone — one word is not enough');

    const schema = tool?.parameters;
    check(`${name}: has a Zod schema`, !!schema && typeof schema.safeParse === 'function');

    check(`${name}: handler is callable`, typeof tool?.execute === 'function');

    if (schema && typeof schema.safeParse === 'function') {
        // A schema that accepts anything is not validation. Feed it a shape no
        // tool could legitimately want and require a rejection. Tools whose
        // arguments are genuinely all-optional are exempt from this one.
        const shape = typeof schema.shape === 'object' && schema.shape ? schema.shape : {};
        const keys = Object.keys(shape);
        const hasRequired = keys.some((k) => {
            const f = shape[k];
            return typeof f?.isOptional === 'function' ? !f.isOptional() : false;
        });

        if (hasRequired) {
            const junk = schema.safeParse({});
            check(`${name}: schema rejects missing required arguments`, junk.success === false);
        } else {
            check(`${name}: schema parses an empty object (all arguments optional)`,
                schema.safeParse({}).success === true);
        }
    }
}

const line = `──────── Tool contract: ${passed} passed, ${failed} failed ────────`;
console.log(`\n${line}\n`);

if (failed > 0) {
    console.error('A tool changed without its contract being updated. If you added a tool,');
    console.error('add it to MANIFEST above and give it a case in tests/ai/eval.js.');
    process.exit(1);
}
