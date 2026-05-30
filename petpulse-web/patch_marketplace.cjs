const fs = require('fs');
const path = require('path');

const file = 'g:/Mewoo/petpulse-web/src/pages/Marketplace.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove MOCK_PRODUCTS
content = content.replace(/const MOCK_PRODUCTS = \[[^\]]+\];/s, '');

// 2. Change state initialization
content = content.replace(/const \[products, setProducts\] = useState\(MOCK_PRODUCTS\);/, 'const [products, setProducts] = useState([]);');

// 3. Remove mock products merging in fetchProducts
content = content.replace(/const subscriptionItems = MOCK_PRODUCTS\.filter\(p => p\.category === 'subscriptions'\);\s*setProducts\(\[\.\.\.liveProducts, \.\.\.subscriptionItems\]\);/, 'setProducts(liveProducts);');

// 4. Change `qty` to `quantity` globally where applicable.
content = content.replace(/c\.qty/g, 'c.quantity');
content = content.replace(/qty:/g, 'quantity:');

// Handle specific line in addToCart
content = content.replace(/quantity: c\.quantity \+ 1/g, 'quantity: c.quantity + 1'); // handled above
content = content.replace(/\{ \.\.\.item, quantity: 1 \}/g, '{ ...item, quantity: 1 }'); // handled above

fs.writeFileSync(file, content);
console.log('Marketplace.jsx patched');
