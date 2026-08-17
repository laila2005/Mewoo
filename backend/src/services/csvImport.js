/**
 * PetPulse — CSV parsing and product-import validation.
 *
 * No CSV library is installed and none is added: the correctness surface here is
 * small and well specified (RFC 4180), while an xlsx parser is a large
 * dependency with a poor security history. Excel and Google Sheets both export
 * CSV from "Save as", which is the path shop owners will actually take.
 *
 * Everything in this file is pure — no database, no request — so the row rules
 * can be unit-tested directly.
 */

/**
 * Parse CSV text into rows of strings.
 *
 * Handles the things real exports contain and a naive `split(',')` gets wrong:
 * quoted fields containing commas or newlines, doubled quotes as an escape,
 * CRLF endings, and a UTF-8 BOM (Excel writes one, and it silently corrupts the
 * first header so "title" never matches).
 */
export function parseCsv(text) {
  const src = String(text || '').replace(/^\uFEFF/, ''); // strip Excel's BOM
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } // "" is a literal quote
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;                    // CRLF -> handled by \n
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  // Trailing field / row (a file may not end with a newline).
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  // Drop rows that are entirely empty — trailing blank lines are extremely common.
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
}

/**
 * Column aliases.
 *
 * Nobody will name their columns exactly what we want. Matching is done on a
 * normalised key (lowercase, punctuation and spaces removed) so "Base Price",
 * "price (EGP)", "Unit_Price" and "PRICE" all land on the same field.
 */
const FIELD_ALIASES = {
  title: ['title', 'name', 'product', 'productname', 'producttitle', 'item', 'itemname', 'الاسم', 'المنتج'],
  category: ['category', 'type', 'productcategory', 'group', 'التصنيف', 'الفئة'],
  base_price: ['baseprice', 'price', 'unitprice', 'cost', 'amount', 'priceegp', 'سعر', 'السعر'],
  quantity: ['quantity', 'stock', 'qty', 'availablestock', 'instock', 'inventory', 'الكمية', 'المخزون'],
  description: ['description', 'desc', 'details', 'about', 'الوصف'],
  image: ['image', 'imageurl', 'imagelink', 'photo', 'picture', 'img', 'الصورة'],
  badge: ['badge', 'label', 'tag', 'salebadge'],
};

const normalizeKey = (h) => String(h || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');

/** Map the sheet's header row onto our fields. Returns { field: columnIndex }. */
export function mapHeaders(headerRow = []) {
  const mapping = {};
  headerRow.forEach((raw, index) => {
    const key = normalizeKey(raw);
    if (!key) return;
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (mapping[field] === undefined && aliases.includes(key)) {
        mapping[field] = index;
        return;
      }
    }
  });
  return mapping;
}

// Categories the marketplace actually filters on. Existing data has both
// "Food" and "food", so matching is case-insensitive and the canonical
// capitalisation is written back — otherwise an import silently creates a
// second, differently-cased category that no filter shows.
export const CATEGORIES = ['Food', 'Toys', 'Accessories', 'Wellness'];
const canonicalCategory = (v) => CATEGORIES.find((c) => c.toLowerCase() === String(v || '').trim().toLowerCase()) || null;

const MAX_ROWS = Number(process.env.IMPORT_MAX_ROWS) || 500;

/**
 * Validate parsed rows into products.
 *
 * Returns BOTH the accepted rows and the rejected ones with a reason, so the
 * caller can preview before writing and the owner can fix a 3-bad-row sheet
 * instead of having a 200-row import fail whole.
 *
 * @param {string[][]} rows        parseCsv output, including the header row
 * @param {Set<string>} existingTitles lowercased titles already in this shop
 */
export function validateProductRows(rows, existingTitles = new Set()) {
  if (!rows.length) return { error: 'The file is empty.' };

  const mapping = mapHeaders(rows[0]);
  const missing = ['title', 'category', 'base_price'].filter((f) => mapping[f] === undefined);
  if (missing.length) {
    return {
      error: `Could not find a column for: ${missing.join(', ')}. ` +
        `The first row must be a header row — download the template if unsure.`,
      headers: rows[0],
    };
  }

  const body = rows.slice(1);
  if (body.length > MAX_ROWS) {
    return { error: `That file has ${body.length} rows. Please split it — the limit is ${MAX_ROWS} per import.` };
  }

  const accepted = [];
  const rejected = [];
  // Duplicates WITHIN the sheet matter as much as against the catalogue: a
  // sheet listing the same product twice would otherwise create it twice.
  const seenInFile = new Set();

  body.forEach((row, i) => {
    const lineNo = i + 2; // 1-based, and the header is line 1
    const cell = (field) => (mapping[field] === undefined ? '' : String(row[mapping[field]] ?? '').trim());

    const title = cell('title');
    const rawCategory = cell('category');
    const rawPrice = cell('base_price');
    const rawQty = cell('quantity');
    const image = cell('image');

    const reject = (reason) => rejected.push({ line: lineNo, title: title || '(no title)', reason });

    if (!title) return reject('Missing a product name.');
    if (title.length > 200) return reject('Product name is longer than 200 characters.');

    const category = canonicalCategory(rawCategory);
    if (!category) return reject(`Category "${rawCategory || '(empty)'}" is not one of: ${CATEGORIES.join(', ')}.`);

    // Accept "1,200.50", "EGP 300", "300 EGP" — spreadsheets are full of these.
    // The sign and the decimal point are kept and then required to form a valid
    // number: stripping them instead would turn "-5" into 5 and "2.5" into 25,
    // which is far worse than refusing the row.
    const priceText = rawPrice.replace(/[^\d.\-]/g, '');
    const price = Number(priceText);
    if (!/^-?\d+(\.\d+)?$/.test(priceText) || !Number.isFinite(price) || price <= 0) {
      return reject(`Price "${rawPrice || '(empty)'}" is not a positive number.`);
    }
    if (price > 1_000_000) return reject(`Price ${price} looks wrong — the maximum is 1,000,000 EGP.`);

    let quantity = 0;
    if (rawQty !== '') {
      const qtyText = rawQty.replace(/[,\s]/g, '');
      if (!/^-?\d+$/.test(qtyText) || Number(qtyText) < 0) {
        return reject(`Stock "${rawQty}" is not a whole number of 0 or more.`);
      }
      quantity = Number(qtyText);
    }

    // Only http(s) image URLs. A spreadsheet cannot carry a file, and a local
    // path like C:\pics\dog.jpg would render as a broken image forever.
    if (image && !/^https?:\/\/\S+$/i.test(image)) {
      return reject('Image must be a full URL starting with http:// or https:// (a file path will not work).');
    }

    const key = title.toLowerCase();
    if (seenInFile.has(key)) return reject('This product appears more than once in the file.');
    if (existingTitles.has(key)) return reject('A product with this name is already in your catalogue.');
    seenInFile.add(key);

    accepted.push({
      title,
      category,
      base_price: price,
      quantity,
      description: cell('description') || null,
      image: image || null,
      badge: cell('badge') || null,
      line: lineNo,
    });
  });

  return { mapping, accepted, rejected, total: body.length };
}

/** The template we hand owners, so the expected shape is never a guess. */
export function templateCsv() {
  return [
    'Title,Category,Base Price,Stock,Description,Image URL,Badge',
    'Grain-Free Adult Dog Food 2kg,Food,450,25,Chicken and sweet potato recipe for adult dogs.,https://example.com/dog-food.jpg,NEW',
    'Rope Tug Toy,Toys,120,60,Durable cotton rope toy for medium breeds.,https://example.com/rope-toy.jpg,',
    'Adjustable Nylon Collar,Accessories,180,40,Reflective stitching. Fits necks 30-45cm.,,SALE',
    'Joint Support Chews,Wellness,900,15,Glucosamine chews for senior dogs.,,',
  ].join('\r\n') + '\r\n';
}

export default { parseCsv, mapHeaders, validateProductRows, templateCsv, CATEGORIES };
