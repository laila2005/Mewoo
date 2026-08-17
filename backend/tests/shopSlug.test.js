/**
 * PetPluse — shop slug tests.
 *
 * Each case below is a real shop name from the live database, or a shape that
 * would have produced a broken or duplicated public address.
 *
 * Usage:  node tests/shopSlug.test.js
 */
import { slugify, slugFromShop, uniqueSlug, isValidSlug, MAX_SLUG_LENGTH } from '../src/services/shopSlug.js';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✅ PASS  ${name}`); }
  else { fail++; console.log(`  ❌ FAIL  ${name} ${detail}`); }
};
const eq = (name, actual, expected) =>
  check(name, actual === expected, `→ got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);

console.log('\n── slugify: real shop names from production ──');
eq('CLAWS', slugify('CLAWS'), 'claws');
eq('Mewoo', slugify('Mewoo'), 'mewoo');
eq('E2E Test Shop', slugify('E2E Test Shop'), 'e2e-test-shop');
eq('kk (two letters is fine)', slugify('kk'), 'kk');
eq('101 (digits only)', slugify('101'), '101');
eq('Velora', slugify('Velora'), 'velora');
// This one is live and has a trailing space, which a naive slugify turns into a
// trailing dash.
eq('Arabic name transliterated', slugify('اكل كلاب '), 'akl-klab');

console.log('\n── slugify: shapes that would break a URL ──');
eq('spaces collapse', slugify('  Happy   Paws  '), 'happy-paws');
eq('punctuation dropped', slugify("Ahmed's Pet Store!"), 'ahmed-s-pet-store');
eq('ampersand becomes a separator', slugify('Cats & Dogs'), 'cats-dogs');
eq('accents keep their letter', slugify('Café Félin'), 'cafe-felin');
eq('emoji dropped', slugify('Pet Shop 🐾'), 'pet-shop');
eq('runs of separators collapse', slugify('a---b___c'), 'a-b-c');
eq('leading and trailing separators removed', slugify('--pets--'), 'pets');
eq('Arabic-Indic digits kept', slugify('متجر ٢'), 'mtjr-2');
eq('harakat stripped', slugify('كِتَاب'), 'ktab');
eq('nothing usable returns empty', slugify('!!!'), '');
eq('null-safe', slugify(null), '');
eq('undefined-safe', slugify(undefined), '');

console.log('\n── slugify: length ──');
const long = slugify('The Very Best Premium Organic Pet Food And Accessories Emporium Of Cairo');
check('long name truncated', long.length <= MAX_SLUG_LENGTH, `→ length ${long.length}`);
check('truncation does not leave a trailing dash', !long.endsWith('-'), `→ ${long}`);
check('truncation cuts on a word boundary', !long.split('-').some(p => p === ''), `→ ${long}`);

console.log('\n── slugify: reserved words ──');
eq('"new" would be ambiguous', slugify('new'), 'new-shop');
eq('"admin" would be ambiguous', slugify('Admin'), 'admin-shop');
eq('a name merely containing a reserved word is fine', slugify('New Paws'), 'new-paws');

console.log('\n── slugFromShop: always yields an address ──');
eq('normal name', slugFromShop({ id: 'abc', name: 'CLAWS' }), 'claws');
eq('unusable name falls back to the id', slugFromShop({ id: 'f1edbac9-1234-5678-9abc-def012345678', name: '!!!' }), 'shop-f1edbac9');
eq('no name at all', slugFromShop({ id: 'f1edbac9-1234' }), 'shop-f1edbac9');
eq('no name and no id', slugFromShop({}), 'shop');
check('the fallback is itself a valid slug', isValidSlug(slugFromShop({ id: 'f1edbac9', name: '؟؟؟' })));

console.log('\n── uniqueSlug: the four "E2E Test Shop" rows ──');
// This is the live collision. Without it three of the four shops would be
// unreachable, and which one won would depend on row order.
const taken = new Set();
const assigned = ['E2E Test Shop', 'E2E Test Shop', 'E2E Test Shop', 'E2E Test Shop'].map((n) => {
  const s = uniqueSlug(slugify(n), taken);
  taken.add(s);
  return s;
});
eq('four identical names get four addresses', JSON.stringify(assigned),
  JSON.stringify(['e2e-test-shop', 'e2e-test-shop-2', 'e2e-test-shop-3', 'e2e-test-shop-4']));
check('all four are distinct', new Set(assigned).size === 4);
// The first shop keeping the bare slug is what makes existing links safe when a
// second shop with the same name signs up later.
eq('first claimant keeps the bare slug', assigned[0], 'e2e-test-shop');
eq('a later duplicate does not disturb it', uniqueSlug('e2e-test-shop', taken), 'e2e-test-shop-5');
eq('empty base still yields something', uniqueSlug('', new Set()), 'shop');
eq('empty base collides safely', uniqueSlug('', new Set(['shop'])), 'shop-2');

console.log('\n── isValidSlug: route param guard ──');
check('accepts a generated slug', isValidSlug('e2e-test-shop-2'));
check('accepts digits only', isValidSlug('101'));
check('rejects uppercase', !isValidSlug('CLAWS'));
check('rejects spaces', !isValidSlug('pet shop'));
check('rejects a leading dash', !isValidSlug('-pets'));
check('rejects a trailing dash', !isValidSlug('pets-'));
check('rejects a double dash', !isValidSlug('a--b'));
check('rejects empty', !isValidSlug(''));
check('rejects path traversal', !isValidSlug('../etc/passwd'));
check('rejects a percent escape', !isValidSlug('%2e%2e'));
check('rejects SQL punctuation', !isValidSlug("claws'--"));
check('rejects over-long input', !isValidSlug('a'.repeat(MAX_SLUG_LENGTH + 1)));
check('rejects a non-string', !isValidSlug(null) && !isValidSlug(12) && !isValidSlug({}));

console.log('\n── every generated slug is a valid slug ──');
const names = ['CLAWS', 'Mewoo', 'E2E Test Shop', 'kk', '101', 'Velora', 'Dddd', 'اكل كلاب ',
  "Ahmed's Pet Store!", 'Cats & Dogs', 'Café Félin', 'Pet Shop 🐾', 'متجر ٢',
  'The Very Best Premium Organic Pet Food And Accessories Emporium Of Cairo', 'new'];
const bad = names.map(n => slugFromShop({ id: 'deadbeef', name: n })).filter(s => !isValidSlug(s));
check('round-trip: generate then validate', bad.length === 0, `→ invalid: ${JSON.stringify(bad)}`);

console.log(`\n${fail === 0 ? '✅' : '❌'} shopSlug: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
