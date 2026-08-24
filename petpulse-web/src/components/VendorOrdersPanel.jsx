import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const STATUS_STYLE = {
    completed: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-600',
    refunded: 'bg-slate-100 text-slate-600',
};
const fmt = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const itemsText = (items) => (items || []).map(i => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}`).join('; ') || '—';

/** Vendor "Orders" tab — purchased-items sheet + CSV report export. */
const VendorOrdersPanel = () => {
    const { token } = useAuth();
    const [orders, setOrders] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [netRevenue, setNetRevenue] = useState(0);
    const [commissionRate, setCommissionRate] = useState(0.10);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        (async () => {
            if (!token) return;
            try {
                const res = await axios.get(`${API_BASE}/vendor/orders`, { headers: { Authorization: `Bearer ${token}` } });
                setOrders(res.data.orders || []);
                setTotalRevenue(res.data.totalRevenue || 0);
                setNetRevenue(res.data.netRevenue ?? res.data.totalRevenue ?? 0);
                setCommissionRate(res.data.commissionRate ?? 0.10);
            } catch (e) {
                console.error('Failed to load orders', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [token]);

    const shown = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    const exportCsv = () => {
        if (shown.length === 0) { toast.error('No orders to export'); return; }
        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const header = ['Order ID', 'Date', 'Customer', 'Items', 'Amount', 'Currency', 'Status', 'Gateway'];
        const rows = shown.map(o => [o.id, fmt(o.date), o.buyer, itemsText(o.items), o.amount.toFixed(2), o.currency, o.status, o.gateway || ''].map(esc).join(','));
        const csv = [header.map(esc).join(','), ...rows].join('\r\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `petpluse-orders-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${shown.length} order${shown.length === 1 ? '' : 's'}`);
    };

    return (
        <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Orders</h2>
                    <p className="text-slate-400 text-xs font-semibold mt-0.5">Purchased items across your shop — export a report anytime.</p>
                </div>
                <button onClick={exportCsv} className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors active:scale-95 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
                    <p className="text-2xl font-black text-slate-900">{orders.length}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Net Payout</p>
                    <p className="text-2xl font-black text-emerald-700">{netRevenue.toLocaleString()} <span className="text-sm font-bold">EGP</span></p>
                    <p className="text-[10px] text-emerald-600/70 font-semibold mt-0.5">Gross {totalRevenue.toLocaleString()} · {Math.round(commissionRate * 100)}% platform fee</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pending</p>
                    <p className="text-2xl font-black text-amber-700">{orders.filter(o => o.status === 'pending').length}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {['all', 'completed', 'pending', 'failed'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {f[0].toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-16 text-slate-400"><span className="material-symbols-outlined animate-spin text-3xl">refresh</span><p className="text-sm mt-2">Loading orders…</p></div>
            ) : shown.length === 0 ? (
                <div className="text-center py-16 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><span className="material-symbols-outlined text-3xl">receipt_long</span></div>
                    <h3 className="font-bold text-slate-800">No orders yet</h3>
                    <p className="text-sm text-slate-500 mt-1">Purchases from your shop will appear here.</p>
                </div>
            ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead>
                            <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Items</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {shown.map(o => (
                                <tr key={o.id} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmt(o.date)}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-800">{o.buyer}</td>
                                    <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate" title={itemsText(o.items)}>{itemsText(o.items)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">{o.amount.toLocaleString()} {o.currency}</td>
                                    <td className="px-4 py-3"><span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${STATUS_STYLE[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default VendorOrdersPanel;
