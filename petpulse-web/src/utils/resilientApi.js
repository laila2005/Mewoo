import axios from 'axios';

// Local storage keys
const STORAGE_PREFIX = 'petpluse_mock_';
const getStorageItem = (key, defaultVal) => {
    try {
        const item = localStorage.getItem(STORAGE_PREFIX + key);
        return item ? JSON.parse(item) : defaultVal;
    } catch {
        return defaultVal;
    }
};

const setStorageItem = (key, value) => {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
        console.error('Mock storage write failed', e);
    }
};

// Seed mock data if not present
const initMockDB = () => {
    // 1. Users
    if (!localStorage.getItem(STORAGE_PREFIX + 'users')) {
        setStorageItem('users', [
            { id: 'u1', email: 'admin@petpluse.com', first_name: 'System', last_name: 'Admin', role: 'admin', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300' },
            { id: 'u2', email: 'sarah.vet@petpluse.com', first_name: 'Sarah', last_name: 'Chen', role: 'vet', clinic_name: 'Downtown Pet Clinic', bio: 'Over 10 years of experience in small animal surgery and preventive care.', is_emergency: true, status: 'approved', avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300' },
            { id: 'u3', email: 'michael.vet@petpluse.com', first_name: 'Michael', last_name: 'Scott', role: 'vet', clinic_name: 'Riverside Animal Hospital', bio: 'Specializing in feline medicine and behavioral consultation.', is_emergency: false, status: 'approved', avatar_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300' },
            { id: 'u4', email: 'jessica.train@petpluse.com', first_name: 'Jessica', last_name: 'Davis', role: 'trainer', specialties: ['Puppy Foundations', 'Obedience', 'Behavior Correction'], bio: 'Certified Professional Dog Trainer with a focus on positive reinforcement.', status: 'approved', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300' },
            { id: 'u5', email: 'alex.owner@petpluse.com', first_name: 'Alex', last_name: 'Johnson', role: 'owner', avatar_url: 'https://i.pravatar.cc/100?img=11' },
            { id: 'u6', email: 'emily.owner@petpluse.com', first_name: 'Emily', last_name: 'Clark', role: 'owner', avatar_url: 'https://i.pravatar.cc/100?img=9' }
        ]);
    }

    // 2. Providers (merged from users with rating details)
    if (!localStorage.getItem(STORAGE_PREFIX + 'providers')) {
        setStorageItem('providers', [
            {
                id: 'u2',
                first_name: 'Sarah',
                last_name: 'Chen',
                role: 'vet',
                clinic_name: 'Downtown Pet Clinic',
                bio: 'Over 10 years of experience in small animal surgery and preventive care.',
                is_emergency: true,
                status: 'approved',
                avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
                rating: 4.9,
                reviews_count: 24,
                specialties: ['General Medicine', 'Surgery', 'Vaccinations']
            },
            {
                id: 'u3',
                first_name: 'Michael',
                last_name: 'Scott',
                role: 'vet',
                clinic_name: 'Riverside Animal Hospital',
                bio: 'Specializing in feline medicine and behavioral consultation.',
                is_emergency: false,
                status: 'approved',
                avatar_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
                rating: 4.7,
                reviews_count: 18,
                specialties: ['Feline Health', 'Behavior Advice', 'Geriatric Care']
            },
            {
                id: 'u4',
                first_name: 'Jessica',
                last_name: 'Davis',
                role: 'trainer',
                specialties: ['Puppy Foundations', 'Obedience', 'Behavior Correction'],
                bio: 'Certified Professional Dog Trainer with a focus on positive reinforcement.',
                status: 'approved',
                avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
                rating: 4.8,
                reviews_count: 32
            }
        ]);
    }

    // 3. Pets
    if (!localStorage.getItem(STORAGE_PREFIX + 'pets')) {
        setStorageItem('pets', [
            { id: 'p1', owner_id: 'u5', name: 'Buddy', species: 'Dog', breed: 'Golden Retriever', age_years: 3, weight_kg: 25.5, avatar_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400', health_notes: 'Fully active, up to date on vaccines.' },
            { id: 'p2', owner_id: 'u6', name: 'Luna', species: 'Cat', breed: 'Siamese Mix', age_years: 2, weight_kg: 4.2, avatar_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400', health_notes: 'Playful, allergic to salmon-based dry food.' },
            { id: 'p3', owner_id: 'u5', name: 'Charlie', species: 'Dog', breed: 'Beagle', age_years: 1, weight_kg: 10.0, avatar_url: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=400', health_notes: 'Teething stage, very energetic.' }
        ]);
    }

    // 4. Products
    if (!localStorage.getItem(STORAGE_PREFIX + 'products')) {
        setStorageItem('products', [
            { id: 'prod1', name: 'Premium Leather Dog Collar', description: 'Handcrafted genuine leather collar with rust-resistant brass buckles.', price: 29.99, image_url: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=400', category: 'accessories', rating: 4.8 },
            { id: 'prod2', name: 'Organic CBD Calming Treats', description: 'Grain-free treats infused with pure chamomile and hemp extract to soothe anxious pets.', price: 24.95, image_url: 'https://images.unsplash.com/photo-1608454367599-c1139e6a0d4c?auto=format&fit=crop&w=400', category: 'food', rating: 4.9 },
            { id: 'prod3', name: 'Orthopedic memory foam Pet Bed', description: 'Dual-layer therapeutic memory foam base offers soothing support for muscles and joints.', price: 89.99, image_url: 'https://images.unsplash.com/photo-1541599540903-216a46ca1ad0?auto=format&fit=crop&w=400', category: 'beds', rating: 4.7 },
            { id: 'prod4', name: 'Interactive Laser Cat Toy', description: 'Automatic rotating laser light toy that keeps your cats active and entertained.', price: 19.99, image_url: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&w=400', category: 'toys', rating: 4.6 }
        ]);
    }

    // 5. Community Posts
    if (!localStorage.getItem(STORAGE_PREFIX + 'posts')) {
        setStorageItem('posts', [
            {
                id: 'post1',
                user_id: 'u5',
                user: { first_name: 'Alex', last_name: 'Johnson', role: 'owner', avatar_url: 'https://i.pravatar.cc/100?img=11' },
                content: 'Just had an amazing training session with Jessica Davis! Buddy is learning so fast.',
                likes_count: 15,
                image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&q=80&w=600',
                created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
                comments: [
                    { id: 'c_1', user: { first_name: 'Jessica', last_name: 'Davis', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100' }, content: 'He was a star student today! 🌟', reactions: [] }
                ]
            },
            {
                id: 'post2',
                user_id: 'u2',
                user: { first_name: 'Dr. Sarah', last_name: 'Chen', role: 'vet', avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300' },
                content: 'Reminder to all pet parents: Summer is coming! Keep your pets hydrated and avoid walking them on hot asphalt pavement during peak hours.',
                likes_count: 42,
                image_url: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?auto=format&fit=crop&q=80&w=600',
                created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
                comments: []
            }
        ]);
    }

    // 6. Bookings / Appointments
    if (!localStorage.getItem(STORAGE_PREFIX + 'appointments')) {
        setStorageItem('appointments', [
            {
                id: 'b1',
                pet_id: 'p1',
                pet_name: 'Buddy',
                vet_user_id: 'u2',
                vet_name: 'Dr. Sarah Chen',
                status: 'confirmed',
                appointment_time: new Date(Date.now() + 86400000).toISOString(),
                reason: 'Annual vaccination boosters and microchip check.'
            }
        ]);
    }

    // 7. Notifications
    if (!localStorage.getItem(STORAGE_PREFIX + 'notifications')) {
        setStorageItem('notifications', [
            { id: 'n1', title: 'Welcome to PetPluse', message: 'Set up your pets details to unlock premium care tracking!', read: false, created_at: new Date().toISOString() },
            { id: 'n2', title: 'Booking Confirmed', message: 'Your appointment with Dr. Sarah Chen is confirmed for tomorrow.', read: true, created_at: new Date().toISOString() }
        ]);
    }
};

initMockDB();

// Mock Request Handler
const handleMockRequest = (config) => {
    const { url, method, data } = config;
    const path = url.replace(/https?:\/\/[^\/]+/, '').replace(/^.*?\/api\//, '');
    const body = data ? (typeof data === 'string' ? JSON.parse(data) : data) : {};

    console.log(`[MOCK API REQUEST] ${method.toUpperCase()} /api/${path}`, body);

    const users = getStorageItem('users', []);
    const providers = getStorageItem('providers', []);
    const pets = getStorageItem('pets', []);
    const posts = getStorageItem('posts', []);
    const products = getStorageItem('products', []);
    const appointments = getStorageItem('appointments', []);
    const notifications = getStorageItem('notifications', []);

    // Helper to extract active user from token
    const token = axios.defaults.headers.common['Authorization']?.replace('Bearer ', '') || localStorage.getItem('token');
    let currentUser = null;
    if (token) {
        if (token.startsWith('mock_token_')) {
            const email = token.replace('mock_token_', '');
            currentUser = users.find(u => u.email === email);
        } else if (token === 'mock_admin_token') {
            currentUser = users.find(u => u.role === 'admin');
        } else {
            currentUser = users[0]; // fallback
        }
    }

    let responseData = null;
    let status = 200;

    // ─── 1. AUTH ROUTES ───
    if (path.startsWith('auth/login')) {
        const user = users.find(u => u.email.toLowerCase() === body.email?.toLowerCase());
        if (user && (body.password === 'password123' || body.password === 'admin123' || user.role !== 'admin')) {
            responseData = {
                token: 'mock_token_' + user.email,
                user
            };
        } else {
            status = 401;
            responseData = { error: 'Invalid credentials. Use password123 (or admin123 for admin).' };
        }
    } 
    else if (path.startsWith('auth/register')) {
        const exists = users.find(u => u.email.toLowerCase() === body.email?.toLowerCase());
        if (exists) {
            status = 400;
            responseData = { error: 'User with this email already exists' };
        } else {
            const newUser = {
                id: 'u_' + Date.now(),
                email: body.email,
                first_name: body.first_name || body.name?.split(' ')[0] || 'User',
                last_name: body.last_name || body.name?.split(' ').slice(1).join(' ') || '',
                role: body.role || 'owner',
                avatar_url: `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 50) + 1}`
            };
            const updatedUsers = [...users, newUser];
            setStorageItem('users', updatedUsers);
            responseData = {
                token: 'mock_token_' + newUser.email,
                user: newUser
            };
        }
    } 
    else if (path.startsWith('auth/google')) {
        // Authenticate Google Mock Login with customizable user info
        const exists = users.find(u => u.email.toLowerCase() === body.email?.toLowerCase());
        let googleUser;
        if (exists) {
            googleUser = exists;
            if (body.first_name) googleUser.first_name = body.first_name;
            if (body.last_name) googleUser.last_name = body.last_name;
        } else {
            googleUser = {
                id: 'u_g_' + Date.now(),
                email: body.email || 'google.user@gmail.com',
                first_name: body.first_name || 'Google',
                last_name: body.last_name || 'Guest',
                role: body.email?.toLowerCase().includes('admin') ? 'admin' : 'owner',
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent((body.first_name || 'Google') + ' ' + (body.last_name || 'Guest'))}&background=3b82f6&color=fff&size=128&bold=true`
            };
            const updatedUsers = [...users, googleUser];
            setStorageItem('users', updatedUsers);
        }
        responseData = {
            token: 'mock_token_' + googleUser.email,
            user: googleUser
        };
    } 
    else if (path.startsWith('auth/me')) {
        if (currentUser) {
            responseData = { user: currentUser };
        } else {
            status = 401;
            responseData = { error: 'Unauthorized session' };
        }
    } 

    // ─── 2. PROVIDER ROUTES ───
    else if (path.startsWith('providers')) {
        responseData = providers;
    }

    // ─── 3. PET ROUTES ───
    else if (path.startsWith('pets')) {
        if (method === 'post') {
            const newPet = {
                id: 'p_' + Date.now(),
                owner_id: currentUser?.id || 'u5',
                name: body.name,
                species: body.species,
                breed: body.breed,
                age_years: Number(body.age_years) || 0,
                weight_kg: Number(body.weight_kg) || 0,
                avatar_url: body.avatar_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400',
                health_notes: body.health_notes || ''
            };
            const updated = [...pets, newPet];
            setStorageItem('pets', updated);
            responseData = newPet;
        } else {
            // GET
            responseData = pets.filter(p => p.owner_id === currentUser?.id);
        }
    }

    // ─── 4. BOOKINGS / APPOINTMENTS ───
    else if (path.startsWith('bookings/appointments')) {
        if (method === 'post') {
            const newBooking = {
                id: 'b_' + Date.now(),
                pet_id: body.pet_id,
                pet_name: pets.find(p => p.id === body.pet_id)?.name || 'My Pet',
                vet_user_id: body.provider_id,
                vet_name: providers.find(p => p.id === body.provider_id)?.first_name ? `Dr. ${providers.find(p => p.id === body.provider_id).first_name} ${providers.find(p => p.id === body.provider_id).last_name}` : 'Provider',
                status: 'confirmed',
                appointment_time: body.appointment_time || new Date().toISOString(),
                reason: body.reason || 'General checkup'
            };
            const updated = [...appointments, newBooking];
            setStorageItem('appointments', updated);
            responseData = newBooking;
        } else {
            // GET
            responseData = appointments;
        }
    }
    else if (path.startsWith('bookings/guest-appointment')) {
        const guestBooking = {
            id: 'b_g_' + Date.now(),
            pet_name: body.pet_name || 'Guest Pet',
            vet_name: providers.find(p => p.id === body.provider_id)?.first_name ? `Dr. ${providers.find(p => p.id === body.provider_id).first_name} ${providers.find(p => p.id === body.provider_id).last_name}` : 'Provider',
            status: 'confirmed',
            appointment_time: body.appointment_time || new Date().toISOString(),
            reason: body.reason || 'Guest Consultation'
        };
        responseData = guestBooking;
    }

    // ─── 5. COMMUNITY POSTS ───
    else if (path.startsWith('community/posts')) {
        // Liked or Comments
        if (path.match(/posts\/[^\/]+\/like/)) {
            const postId = path.split('/')[1];
            const updated = posts.map(p => {
                if (p.id === postId) {
                    return { ...p, likes_count: (p.likes_count || 0) + 1 };
                }
                return p;
            });
            setStorageItem('posts', updated);
            responseData = { success: true };
        } 
        else if (path.match(/posts\/[^\/]+\/comments/)) {
            const postId = path.split('/')[1];
            if (method === 'post') {
                const newComment = {
                    id: 'c_' + Date.now(),
                    user: { 
                        first_name: currentUser?.first_name || 'Guest', 
                        last_name: currentUser?.last_name || 'User',
                        avatar_url: currentUser?.avatar_url || 'https://i.pravatar.cc/100?img=1'
                    },
                    content: body.content || body.text || '',
                    reactions: []
                };
                const updated = posts.map(p => {
                    if (p.id === postId) {
                        return { ...p, comments: [...(p.comments || []), newComment] };
                    }
                    return p;
                });
                setStorageItem('posts', updated);
                responseData = newComment;
            } else {
                const post = posts.find(p => p.id === postId);
                responseData = post ? post.comments || [] : [];
            }
        } 
        else {
            // GET / POST posts
            if (method === 'post') {
                const newPost = {
                    id: 'post_' + Date.now(),
                    user_id: currentUser?.id || 'u5',
                    user: currentUser || { first_name: 'Alex', last_name: 'Johnson', role: 'owner', avatar_url: 'https://i.pravatar.cc/100?img=11' },
                    content: body.content,
                    likes_count: 0,
                    image_url: body.image_url || null,
                    created_at: new Date().toISOString(),
                    comments: []
                };
                const updated = [newPost, ...posts];
                setStorageItem('posts', updated);
                responseData = newPost;
            } else {
                responseData = posts;
            }
        }
    }

    // ─── 6. CLOUDINARY FILE UPLOAD MOCK ───
    else if (path.startsWith('upload/cloudinary')) {
        // Just return a valid mock pet image depending on files uploaded
        responseData = {
            url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400'
        };
    }

    // ─── 7. NOTIFICATIONS ───
    else if (path.startsWith('users/notifications')) {
        if (method === 'put') {
            const updated = notifications.map(n => ({ ...n, read: true }));
            setStorageItem('notifications', updated);
            responseData = { success: true };
        } else {
            responseData = notifications;
        }
    }

    // ─── 8. ADMIN DASHBOARD & PRODUCTS ───
    else if (path.startsWith('public/products')) {
        responseData = products;
    }
    else if (path.startsWith('admin/products')) {
        if (method === 'post') {
            const newProd = {
                id: 'prod_' + Date.now(),
                name: body.name,
                description: body.description,
                price: Number(body.price) || 0.0,
                image_url: body.image_url || 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=400',
                category: body.category || 'accessories',
                rating: 5.0
            };
            const updated = [...products, newProd];
            setStorageItem('products', updated);
            responseData = newProd;
        } else if (method === 'put') {
            const prodId = path.split('/')[2];
            const updated = products.map(p => {
                if (p.id === prodId) {
                    return { ...p, ...body };
                }
                return p;
            });
            setStorageItem('products', updated);
            responseData = { success: true };
        } else if (method === 'delete') {
            const prodId = path.split('/')[2];
            const updated = products.filter(p => p.id !== prodId);
            setStorageItem('products', updated);
            responseData = { success: true };
        }
    }
    else if (path.startsWith('admin/analytics')) {
        responseData = {
            totalUsers: users.length + 120,
            activeAppointments: appointments.length + 8,
            totalSales: 1245.50,
            monthlyGrowth: 15,
            recentSales: [
                { id: '1', user: 'Emily Clark', product: 'Premium Collar', amount: 29.99, date: '2026-05-19' },
                { id: '2', user: 'Alex Johnson', product: 'CBD Calming Treats', amount: 24.95, date: '2026-05-18' }
            ]
        };
    }
    else if (path.startsWith('admin/users')) {
        responseData = users;
    }
    else if (path.startsWith('admin/bookings')) {
        responseData = appointments;
    }
    else if (path.startsWith('admin/posts')) {
        responseData = posts;
    }
    else if (path.startsWith('admin/subscriptions')) {
        responseData = [
            { id: 'sub1', name: 'Emily Clark', plan: 'Gold Plan', status: 'active', end_date: '2026-12-31' },
            { id: 'sub2', name: 'Alex Johnson', plan: 'Platinum Plan', status: 'active', end_date: '2027-02-15' }
        ];
    }
    else if (path.startsWith('admin/verify')) {
        responseData = { success: true };
    }
    else if (path.startsWith('admin/users/') && path.endsWith('/ban')) {
        responseData = { success: true };
    }

    // ─── 9. AGENTIC AI TRIAGE & CHATBOT ───
    else if (path.startsWith('ai/triage')) {
        const symptoms = body.symptoms || '';
        let aiAdvice = "Based on the symptoms described, we recommend monitoring your pet closely. Please ensure they remain fully hydrated and isolated from hot surfaces.";
        let urgency = "moderate";
        let shouldBook = true;

        if (symptoms.toLowerCase().includes('blood') || symptoms.toLowerCase().includes('vomit') || symptoms.toLowerCase().includes('breathing')) {
            aiAdvice = "🚨 EMERGENCY NOTICE: Your pet's symptoms suggest a high-priority cardiovascular or digestive issue. Please contact Downtown Pet Clinic immediately (Dr. Sarah Chen offers emergency care). Avoid feeding solid food and prepare transport.";
            urgency = "high";
            shouldBook = true;
        } else if (symptoms.toLowerCase().includes('scratch') || symptoms.toLowerCase().includes('itch') || symptoms.toLowerCase().includes('skin')) {
            aiAdvice = "🐾 AI Insight: Typical signs of local dermatitis, contact allergy, or flea irritation. We recommend scheduling an appointment with Riverside Animal Hospital (Dr. Michael Scott) for an allergen screening.";
            urgency = "low";
            shouldBook = true;
        } else if (symptoms.toLowerCase().includes('bark') || symptoms.toLowerCase().includes('train') || symptoms.toLowerCase().includes('chew')) {
            aiAdvice = "🐕 Training Recommendation: Behavioral patterns are highly corrective under consistent positive reinforcement. We highly recommend booking an Obedience session with our certified professional trainer, Jessica Davis.";
            urgency = "low";
            shouldBook = true;
        }

        responseData = {
            diagnosis: aiAdvice,
            urgency,
            suggestedAction: shouldBook ? "Book Consultation" : "Home Monitoring",
            suggestedProvider: urgency === 'high' ? 'u2' : 'u3'
        };
    }

    // Fallback response if not matched
    if (!responseData) {
        responseData = { message: 'Action successfully processed (Mock API Fallback)' };
    }

    // Return the response as a resolved Axios Promise
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                data: responseData,
                status: status,
                statusText: status === 200 ? 'OK' : 'Error',
                headers: { 'content-type': 'application/json' },
                config
            });
        }, 350); // Small delay to feel alive with beautiful loading states
    });
};

// Axios Request/Response Interceptors are disabled by default on production-ready environments.
// To enable showcase mock mode, set localStorage.setItem('enforce_showcase_mock', 'true')
const isMockEnabled = typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('enforce_showcase_mock') === 'true';

if (isMockEnabled) {
    // Axios Request Interceptor to trigger showcase mode
    axios.interceptors.request.use(
        (config) => {
            if (config.url.includes('/api/')) {
                config.adapter = handleMockRequest;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Axios Response Interceptor to fall back when the local Express server is not running
    axios.interceptors.response.use(
        (response) => response,
        async (error) => {
            const { config, response } = error;
            if (config && config.url.includes('/api/') && (!response || response.status === 404 || response.status === 500)) {
                console.warn('[PetPluse Resilient API] Network failed or server offline. Falling back to Showcase Mock Adapter.');
                config.adapter = handleMockRequest;
                return axios(config);
            }
            return Promise.reject(error);
        }
    );

    console.log('🐾 [PetPluse Resilient API Adapter] Active and monitoring network hooks.');
} else {
    console.log('🐾 [PetPluse Resilient API Adapter] Inactive. Real API endpoints will be utilized directly.');
}
