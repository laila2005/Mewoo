/**
 * PetPulse — CSV product-import tests.
 *
 * These rules exist because real spreadsheets are messy: Excel writes a BOM,
 * owners quote fields containing commas, prices arrive as "1,200.50" or
 * "EGP 300", and nobody names their columns what we expect. Each case below is
 * something that WOULD have silently mangled or dropped a product.
 *
 * Usage:  node tests/csvImport.test.js
 * Exit code 0 if all pass, 1 if any fail.
 */
import { parseCsv, mapHeaders, validateProductRows, templateCsv, CATEGORIES } from '../src/services/csvImport.js';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✅ PASS  ${name}`); }
  else { fail++; console.log(`  ❌ FAIL  ${name} ${detail}`); }
};
const eq = (name, actual, expected) =>
  check(name, JSON.stringify(actual) === JSON.stringify(expected), `→ got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);

console.log('\n── parseCsv ──');
eq('plain rows', parseCsv('a,b\n1,2\n'), [['a', 'b'], ['1', '2']]);
eq('quoted comma stays one field', parseCsv('a,b\n"x, y",2\n'), [['a', 'b'], ['x, y', '2']]);
eq('doubled quote is a literal quote', parseCsv('a\n"say ""hi"""\n'), [['a'], ['say "hi"']]);
eq('newline inside quotes', parseCsv('a,b\n"one\ntwo",2\n'), [['a', 'b'], ['one\ntwo', '2']]);
eq('CRLF endings', parseCsv('a,b\r\n1,2\r\n'), [['a', 'b'], ['1', '2']]);
eq('no trailing newline', parseCsv('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
eq('blank rows dropped', parseCsv('a,b\n1,2\n\n\n'), [['a', 'b'], ['1', '2']]);
eq('empty fields preserved', parseCsv('a,b,c\n1,,3\n'), [['a', 'b', 'c'], ['1', '', '3']]);
// Excel prepends a BOM; without stripping it the first header never matches and
// every import fails with "no title column".
check('BOM stripped from first header', parseCsv('\uFEFFtitle,b\n1,2\n')[0][0] === 'title');
eq('empty input', parseCsv(''), []);

console.log('\n── mapHeaders ──');
eq('exact names', mapHeaders(['Title', 'Category', 'Base Price']), { title: 0, category: 1, base_price: 2 });
eq('aliases and punctuation', mapHeaders(['Product Name', 'TYPE', 'price (EGP)', 'Qty']), { title: 0, category: 1, base_price: 2, quantity: 3 });
eq('underscores and case', mapHeaders(['ITEM', 'Unit_Price']), { title: 0, base_price: 1 });
eq('Arabic headers', mapHeaders(['الاسم', 'التصنيف', 'السعر']), { title: 0, category: 1, base_price: 2 });
eq('unknown columns ignored', mapHeaders(['Title', 'SKU', 'Supplier']), { title: 0 });
// A sheet with both "Name" and "Product Name" must not have the second silently
// win — first match holds, so column order is predictable.
eq('first matching column wins', mapHeaders(['Name', 'Product Name']), { title: 0 });

console.log('\n── validateProductRows: file-level errors ──');
check('empty file', validateProductRows([]).error?.includes('empty'));
check('missing required columns named in the error', (() => {
  const e = validateProductRows(parseCsv('Widget,Thing\nfoo,bar\n')).error || '';
  return e.includes('title') && e.includes('category') && e.includes('base_price');
})());
check('row limit enforced', (() => {
  const rows = ['Title,Category,Base Price', ...Array.from({ length: 501 }, (_, i) => `P${i},Food,10`)].join('\n');
  return (validateProductRows(parseCsv(rows)).error || '').includes('501');
})());

console.log('\n── validateProductRows: row rules ──');
const run = (body, existing = new Set()) =>
  validateProductRows(parseCsv('Title,Category,Base Price,Stock,Description,Image URL,Badge\n' + body), existing);

const ok = run('Kibble,Food,450,25,Tasty,https://ex.com/a.jpg,NEW\n');
eq('good row accepted', ok.accepted.length, 1);
eq('good row parsed', { ...ok.accepted[0] }, {
  title: 'Kibble', category: 'Food', base_price: 450, quantity: 25,
  description: 'Tasty', image: 'https://ex.com/a.jpg', badge: 'NEW', line: 2,
});

// Spreadsheets format numbers for humans. Rejecting these would reject most
// real files.
eq('thousands separator', run('"P","Food","1,200.50",1,,,\n').accepted[0]?.base_price, 1200.5);
eq('currency prefix', run('P,Food,EGP 300,1,,,\n').accepted[0]?.base_price, 300);
eq('currency suffix', run('P,Food,300 EGP,1,,,\n').accepted[0]?.base_price, 300);
eq('stock defaults to 0 when blank', run('P,Food,10,,,,\n').accepted[0]?.quantity, 0);
eq('blank optional fields become null', {
  d: run('P,Food,10,1,,,\n').accepted[0]?.description,
  i: run('P,Food,10,1,,,\n').accepted[0]?.image,
  b: run('P,Food,10,1,,,\n').accepted[0]?.badge,
}, { d: null, i: null, b: null });

// Existing data has both "Food" and "food". Writing back the canonical spelling
// stops an import from creating a category no marketplace filter shows.
eq('category canonicalised', run('P,fOOd,10,1,,,\n').accepted[0]?.category, 'Food');
eq('category whitespace tolerated', run('P,  toys ,10,1,,,\n').accepted[0]?.category, 'Toys');

const reason = (body) => run(body).rejected[0]?.reason || '(not rejected)';
check('missing title rejected', reason(',Food,10,1,,,\n').includes('Missing a product name'));
check('unknown category rejected', reason('P,Grooming,10,1,,,\n').includes('Grooming'));
check('every valid category listed in the message', CATEGORIES.every(c => reason('P,Nope,10,1,,,\n').includes(c)));
check('empty price rejected', reason('P,Food,,1,,,\n').includes('not a positive number'));
check('non-numeric price rejected', reason('P,Food,free,1,,,\n').includes('not a positive number'));
check('zero price rejected', reason('P,Food,0,1,,,\n').includes('not a positive number'));
check('negative price rejected', reason('P,Food,-5,1,,,\n').includes('not a positive number'));
check('absurd price rejected', reason('P,Food,99999999,1,,,\n').includes('maximum'));
check('fractional stock rejected', reason('P,Food,10,2.5,,,\n').includes('whole number'));
// A local path renders as a permanently broken image, so it must fail loudly at
// import time rather than quietly in the storefront.
check('local file path as image rejected', reason('P,Food,10,1,,C:\\pics\\dog.jpg,\n').includes('http'));
check('overlong title rejected', reason(`${'x'.repeat(201)},Food,10,1,,,\n`).includes('200'));

const dupFile = run('Rope,Toys,10,1,,,\nrope,Toys,20,1,,,\n');
eq('duplicate within the file: one accepted', dupFile.accepted.length, 1);
check('duplicate within the file: reason names the file', dupFile.rejected[0].reason.includes('more than once in the file'));

const dupCatalogue = run('Rope,Toys,10,1,,,\n', new Set(['rope']));
eq('duplicate against catalogue: none accepted', dupCatalogue.accepted.length, 0);
check('duplicate against catalogue: reason names the catalogue', dupCatalogue.rejected[0].reason.includes('already in your catalogue'));

console.log('\n── line numbers and counts ──');
const mixed = run('Good,Food,10,1,,,\nBad,Nope,10,1,,,\nAlso Good,Toys,20,2,,,\n');
eq('accepted line numbers account for the header', mixed.accepted.map(a => a.line), [2, 4]);
eq('rejected line number', mixed.rejected[0].line, 3);
eq('total counts body rows only', mixed.total, 3);

console.log('\n── template ──');
const tpl = validateProductRows(parseCsv(templateCsv()));
// If the template we hand owners does not itself import cleanly, every first
// attempt fails.
check('our own template validates', !tpl.error && tpl.rejected.length === 0, JSON.stringify(tpl.rejected || tpl.error));
eq('template has example rows', tpl.accepted.length, 4);

console.log(`\n${fail === 0 ? '✅' : '❌'} csvImport: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
