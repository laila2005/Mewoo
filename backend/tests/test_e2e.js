const API_BASE = 'http://localhost:5000/api';
const testVendorEmail = `vendor_${Date.now()}@example.com`;
const testVendorPassword = 'password123';

async function runE2ETests() {
    console.log('--- STARTING E2E TEST ---');
    try {
        // 1. Register as Vendor
        console.log(`1. Registering new vendor: ${testVendorEmail}...`);
        const registerRes = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first_name: 'Test',
                last_name: 'Vendor',
                email: testVendorEmail,
                password: testVendorPassword,
                role: 'vendor',
                shop_name: 'E2E Test Shop',
                shop_category: 'General',
                business_address: '123 Test St',
                tax_id: 'TAX-1234'
            })
        });
        const registerData = await registerRes.json();
        if (!registerRes.ok) throw new Error(JSON.stringify(registerData));
        const vendorToken = registerData.token;
        console.log('Vendor Registration successful. Token received.');

        // 2. Vendor tries to get shop details
        console.log('2. Fetching vendor shop details (Should be pending)...');
        const shopRes = await fetch(`${API_BASE}/vendor/shop`, {
            headers: { Authorization: `Bearer ${vendorToken}` }
        });
        const shopData = await shopRes.json();
        if (!shopRes.ok) throw new Error(JSON.stringify(shopData));
        const shop = shopData.shop;
        console.log(`Shop found: ${shop.name}, Status: ${shop.status}`);

        // 3. Admin logs in
        console.log('3. Logging in as Admin...');
        const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@petpulse.com',
                password: 'admin'
            })
        });
        const adminData = await adminLoginRes.json();
        if (!adminLoginRes.ok) throw new Error(JSON.stringify(adminData));
        const adminToken = adminData.token;
        console.log('Admin Login successful.');

        // 4. Admin verifies the shop (using user ID)
        const vendorUserId = registerData.user.id;
        console.log(`4. Admin verifying vendor profile (User ID: ${vendorUserId})...`);
        const verifyRes = await fetch(`${API_BASE}/admin/verify/${vendorUserId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}` 
            },
            body: JSON.stringify({ status: 'approved' })
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(JSON.stringify(verifyData));
        console.log('Vendor verified successfully.');

        // 5. Vendor fetches shop again
        console.log('5. Fetching vendor shop details again...');
        const updatedShopRes = await fetch(`${API_BASE}/vendor/shop`, {
            headers: { Authorization: `Bearer ${vendorToken}` }
        });
        const updatedShopData = await updatedShopRes.json();
        if (!updatedShopRes.ok) throw new Error(JSON.stringify(updatedShopData));
        console.log(`Updated Shop Status: ${updatedShopData.shop.status}`);

        // 6. Vendor adds a product
        console.log('6. Vendor adding a new product...');
        const addProductRes = await fetch(`${API_BASE}/vendor/products`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${vendorToken}` 
            },
            body: JSON.stringify({
                title: 'Test Premium Dog Food',
                category: 'Food',
                base_price: 199.99,
                description: 'E2E Test Product Description',
                image: 'http://example.com/food.jpg'
            })
        });
        const addProductData = await addProductRes.json();
        if (!addProductRes.ok) throw new Error(JSON.stringify(addProductData));
        console.log(`Product added successfully: ${addProductData.product.title} (ID: ${addProductData.product.id})`);

        // 7. Fetch marketplace products publicly
        console.log('7. Fetching marketplace products publicly...');
        const publicRes = await fetch(`${API_BASE}/public/products`);
        const publicData = await publicRes.json();
        if (!publicRes.ok) throw new Error(JSON.stringify(publicData));
        const products = publicData.products;
        const found = products.find(p => p.id === addProductData.product.id);
        if (found) {
            console.log(`SUCCESS: Test product found in public marketplace! Shop Name: ${found.shop_name}`);
        } else {
            console.log('ERROR: Test product not found in public marketplace!');
        }

        console.log('--- E2E TEST COMPLETED SUCCESSFULLY ---');
    } catch (error) {
        console.error('--- E2E TEST FAILED ---');
        console.error(error.message);
    }
}

runE2ETests();
