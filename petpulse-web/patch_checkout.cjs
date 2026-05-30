const fs = require('fs');
const file = 'g:/Mewoo/petpulse-web/src/pages/Checkout.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace cart initialization total
content = content.replace(
    /const total = storedCart\.reduce\(\(sum, item\) => sum \+ parseFloat\(item\?\.base_price \|\| 0\), 0\);/g,
    'const total = storedCart.reduce((sum, item) => sum + (parseFloat(item?.base_price || 0) * (parseInt(item?.quantity) || 1)), 0);'
);

// Replace removeItem total
content = content.replace(
    /const total = newCart\.reduce\(\(sum, item\) => sum \+ parseFloat\(item\.base_price \|\| 0\), 0\);/g,
    'const total = newCart.reduce((sum, item) => sum + (parseFloat(item?.base_price || 0) * (parseInt(item?.quantity) || 1)), 0);'
);

// Fix the Order Summary rendering to show quantity and line total
content = content.replace(
    /<p className="text-xs text-slate-500">\{parseFloat\(item\.base_price \|\| 0\)\.toFixed\(2\)\} EGP<\/p>/g,
    '<p className="text-xs text-slate-500">{parseFloat(item.base_price || 0).toFixed(2)} EGP x {parseInt(item.quantity) || 1} = {(parseFloat(item.base_price || 0) * (parseInt(item.quantity) || 1)).toFixed(2)} EGP</p>'
);

fs.writeFileSync(file, content);
console.log('Checkout.jsx patched');
