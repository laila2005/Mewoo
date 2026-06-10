const fs = require('fs');
const path = require('path');

const file = 'g:/Mewoo/petpulse-web/src/pages/Admin.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add State
const stateRegex = /const \[subscriptions, setSubscriptions\] = useState\(\[\]\);/;
const stateInjection = `const [subscriptions, setSubscriptions] = useState([]);
    const [subscriptionPlans, setSubscriptionPlans] = useState([]);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [planFormData, setPlanFormData] = useState({ id: '', name: '', price: '', frequency: '/month', description: '', features: '', recommended: false, color: 'blue', target_role: 'owner' });`;
content = content.replace(stateRegex, stateInjection);

// 2. Add Fetch Logic
const fetchRegex = /\} else if \(activeTab === 'subscriptions'\) \{/;
const fetchInjection = `} else if (activeTab === 'subscription_plans') {
                    const res = await axios.get(\`\${API_BASE}/plans\`);
                    setSubscriptionPlans(res.data.plans || []);
                } else if (activeTab === 'subscriptions') {`;
content = content.replace(fetchRegex, fetchInjection);

// 3. Add Handlers & Render
const renderSubscriptionsEndRegex = /        \);\n    \};/g;

// Find the last occurrence or just place it before renderMarketplaceProducts
const renderSplit = content.split('const renderMarketplaceProducts = () => {');
const handlersAndRender = `
    const handleSavePlan = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...planFormData,
                features: typeof planFormData.features === 'string' ? planFormData.features.split(',').map(f => f.trim()) : planFormData.features
            };
            if (currentPlan) {
                await axios.put(\`\${API_BASE}/admin/plans/\${currentPlan.id}\`, payload, { headers });
                toast.success('Plan updated successfully');
            } else {
                await axios.post(\`\${API_BASE}/admin/plans\`, payload, { headers });
                toast.success('Plan created successfully');
            }
            setIsPlanModalOpen(false);
            const res = await axios.get(\`\${API_BASE}/plans\`);
            setSubscriptionPlans(res.data.plans || []);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save plan');
        }
    };

    const handleDeletePlan = async (id) => {
        if (!window.confirm('Are you sure you want to delete this plan?')) return;
        try {
            await axios.delete(\`\${API_BASE}/admin/plans/\${id}\`, { headers });
            toast.success('Plan deleted successfully');
            const res = await axios.get(\`\${API_BASE}/plans\`);
            setSubscriptionPlans(res.data.plans || []);
        } catch (error) {
            toast.error('Failed to delete plan');
        }
    };

    const renderSubscriptionPlans = () => {
        let filteredPlans = subscriptionPlans.filter(p => 
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.id?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">PulseBox Plans Catalogue</h1>
                        <p className="text-sm text-slate-500">Manage your subscription tiers and pricing.</p>
                    </div>
                    <button onClick={() => { setCurrentPlan(null); setPlanFormData({ id: '', name: '', price: '', frequency: '/month', description: '', features: '', recommended: false, color: 'blue', target_role: 'owner' }); setIsPlanModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">add</span> Add New Plan
                    </button>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900">Available Plans</h2>
                        <div className="relative w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input type="text" placeholder="Search plans..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest border-b border-slate-200">
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Color</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && subscriptionPlans.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">Loading plans...</td></tr>
                                ) : filteredPlans.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No plans found.</td></tr>
                                ) : (
                                    filteredPlans.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{p.id}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-600">{p.name} {p.recommended && <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">Recommended</span>}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">{p.price} EGP {p.frequency}</td>
                                            <td className="px-6 py-4"><span className={\`inline-block w-4 h-4 rounded-full bg-\${p.color}-500\`}></span> {p.color}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500 capitalize">{p.target_role}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { setCurrentPlan(p); setPlanFormData({...p, features: p.features?.join(', ') || ''}); setIsPlanModalOpen(true); }} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-slate-200" title="Edit Plan"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                    <button onClick={() => handleDeletePlan(p.id)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-slate-200" title="Delete Plan"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Plan Form Modal */}
                {isPlanModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-900">{currentPlan ? 'Edit Plan' : 'Create New Plan'}</h3>
                                <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined">close</span></button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                <form id="planForm" onSubmit={handleSavePlan} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Plan ID</label>
                                            <input type="text" required disabled={!!currentPlan} value={planFormData.id} onChange={(e) => setPlanFormData({...planFormData, id: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500" placeholder="e.g. p1, sub_starter"/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Target Role</label>
                                            <select value={planFormData.target_role} onChange={(e) => setPlanFormData({...planFormData, target_role: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                                                <option value="owner">Pet Owner</option>
                                                <option value="trainer">Trainer</option>
                                                <option value="vet">Vet</option>
                                                <option value="shop">Shop</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Plan Name</label>
                                        <input type="text" required value={planFormData.name} onChange={(e) => setPlanFormData({...planFormData, name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Price (EGP)</label>
                                            <input type="number" step="0.01" required value={planFormData.price} onChange={(e) => setPlanFormData({...planFormData, price: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Frequency</label>
                                            <input type="text" required value={planFormData.frequency} onChange={(e) => setPlanFormData({...planFormData, frequency: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="/month"/>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                                        <textarea required value={planFormData.description} onChange={(e) => setPlanFormData({...planFormData, description: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Features (comma separated)</label>
                                        <textarea required value={planFormData.features} onChange={(e) => setPlanFormData({...planFormData, features: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24" placeholder="Feature 1, Feature 2, Feature 3" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Card Color</label>
                                            <select value={planFormData.color} onChange={(e) => setPlanFormData({...planFormData, color: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                                                <option value="blue">Blue</option>
                                                <option value="emerald">Emerald</option>
                                                <option value="purple">Purple</option>
                                                <option value="amber">Amber</option>
                                                <option value="slate">Slate</option>
                                                <option value="indigo">Indigo</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col justify-end">
                                            <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                                <input type="checkbox" checked={planFormData.recommended} onChange={(e) => setPlanFormData({...planFormData, recommended: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-sm font-semibold text-slate-700">Recommended Badge</span>
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                                <button type="button" onClick={() => setIsPlanModalOpen(false)} className="px-6 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors">Cancel</button>
                                <button type="submit" form="planForm" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors">Save Plan</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderMarketplaceProducts = () => {`;

content = renderSplit[0] + handlersAndRender + renderSplit[1];

// 4. Add Sidebar Nav Button
const sidebarRegex = /onClick=\{\(\) => \{ setActiveTab\('subscriptions'\); setSearchTerm\(''\); \}\}\s*className=\{`w-full flex items-center gap-3 px-3 py-2\.5 font-semibold rounded-lg transition-colors \$\{activeTab === 'subscriptions' \? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'\}`\}\s*>\s*<span className="material-symbols-outlined text-\[20px\]">receipt_long<\/span>\s*Subscriptions\s*<\/button>/g;

const sidebarInjection = `onClick={() => { setActiveTab('subscriptions'); setSearchTerm(''); }}
                        className={\`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors \${activeTab === 'subscriptions' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}\`}
                    >
                        <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                        Subscriptions Ledger
                    </button>
                    <button 
                        onClick={() => { setActiveTab('subscription_plans'); setSearchTerm(''); }}
                        className={\`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors \${activeTab === 'subscription_plans' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}\`}
                    >
                        <span className="material-symbols-outlined text-[20px]">redeem</span>
                        PulseBox Plans
                    </button>`;
content = content.replace(sidebarRegex, sidebarInjection);

// 5. Add rendering to switch case
const renderSwitchRegex = /\{activeTab === 'subscriptions' && renderSubscriptions\(\)\}/g;
const renderSwitchInjection = `{activeTab === 'subscriptions' && renderSubscriptions()}
                        {activeTab === 'subscription_plans' && renderSubscriptionPlans()}`;
content = content.replace(renderSwitchRegex, renderSwitchInjection);

fs.writeFileSync(file, content);
console.log('Admin.jsx patched with Subscription Plans');
