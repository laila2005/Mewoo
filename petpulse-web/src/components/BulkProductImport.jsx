import React, { useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Bulk product import for shop owners.
 *
 * Adding products one at a time is fine for five items and unusable for a real
 * catalogue, which made it a barrier to shops joining at all.
 *
 * The flow is deliberately two-step: the file is validated first and the owner
 * is shown exactly what WOULD be created and what would be rejected and why,
 * before anything is written. An import that silently skips rows is worse than
 * one that refuses, because the owner discovers the gap weeks later.
 */
const BulkProductImport = ({ apiBase, token, onImported }) => {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);   // dry-run result
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setCsv(''); setFileName(''); setPreview(null); setError(''); if (fileRef.current) fileRef.current.value = ''; };

  /**
   * The template comes from the server so it can never drift from the column
   * names the parser accepts. It's fetched rather than linked because the route
   * needs the auth header — a plain <a href> would download a 401 page.
   */
  const downloadTemplate = async () => {
    try {
      const res = await axios.get(`${apiBase}/vendor/products/import/template`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'petpluse-products-template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't download the template. Please try again.");
    }
  };

  const readFile = (file) => {
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError('Please choose a .csv file. In Excel or Google Sheets use File → Save as / Download → CSV.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setCsv(String(reader.result || '')); setFileName(file.name); setPreview(null); setError(''); };
    reader.onerror = () => setError("Couldn't read that file. Please try again.");
    reader.readAsText(file, 'utf-8');
  };

  const send = async (commit) => {
    setBusy(true); setError('');
    try {
      const res = await axios.post(`${apiBase}/vendor/products/import`, { csv, commit },
        { headers: { Authorization: `Bearer ${token}` } });
      if (commit) {
        toast.success(`Imported ${res.data.imported} product${res.data.imported === 1 ? '' : 's'}.`);
        onImported?.();
        reset();
      } else {
        setPreview(res.data);
      }
    } catch (e) {
      // The server explains WHICH columns are missing — surface that, not a generic failure.
      setError(e?.response?.data?.error || 'Something went wrong reading that file.');
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Import products from a spreadsheet</h3>
        <p className="text-slate-400 text-xs font-semibold mt-0.5">
          Add your whole catalogue at once instead of one product at a time.
        </p>
      </div>

      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
        <p className="m-0 font-bold text-slate-700 mb-1">How it works</p>
        <ol className="list-decimal ms-4 space-y-1 m-0">
          <li>Download the template so your columns match what we expect.</li>
          <li>Fill in one product per row. In Excel or Google Sheets, save it as <strong>CSV</strong>.</li>
          <li>Upload it here — we check every row and show you the result <strong>before</strong> anything is added.</li>
        </ol>
        <button type="button" onClick={downloadTemplate}
                className="inline-flex items-center gap-1 mt-3 font-bold text-blue-700 hover:underline">
          <span className="material-symbols-outlined text-[16px]">download</span>
          Download the CSV template
        </button>
      </div>

      <div>
        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Your file</label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Choose CSV file
          </button>
          {fileName && <span className="text-xs font-semibold text-slate-600">{fileName}</span>}
          {csv && !preview && (
            <button type="button" onClick={() => send(false)} disabled={busy}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              {busy ? 'Checking…' : 'Check the file'}
            </button>
          )}
          {(csv || preview) && (
            <button type="button" onClick={reset} className="text-xs font-bold text-slate-500 hover:text-slate-700 underline">
              Start over
            </button>
          )}
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                 onChange={(e) => readFile(e.target.files?.[0])} />
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-rose-800 m-0">We couldn't use that file</p>
          <p className="text-xs text-rose-700 mt-1 m-0">{error}</p>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: 'Rows read', v: preview.total, cls: 'text-slate-800' },
              { k: 'Will be added', v: preview.would_create, cls: 'text-emerald-600' },
              { k: 'Will be skipped', v: preview.would_reject, cls: 'text-rose-600' },
            ].map((s) => (
              <div key={s.k} className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
                <p className={`text-2xl font-black m-0 tabular-nums ${s.cls}`}>{s.v}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 m-0">{s.k}</p>
              </div>
            ))}
          </div>

          {preview.would_reject > 0 && (
            <div className="bg-white border border-rose-100 rounded-2xl overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 px-4 pt-3 pb-2 m-0">
                Rows we can't add — fix these in your sheet and upload again
              </p>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                {preview.rejected.map((r) => (
                  <div key={`${r.line}-${r.title}`} className="px-4 py-2 flex gap-3 items-start">
                    <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0 tabular-nums">line {r.line}</span>
                    <span className="text-xs font-bold text-slate-700 shrink-0 max-w-[9rem] truncate">{r.title}</span>
                    <span className="text-xs text-rose-700">{r.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.would_create > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 pt-3 pb-2 m-0">
                Preview — first {Math.min(10, preview.would_create)} of {preview.would_create}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ minWidth: 420 }}>
                  <thead>
                    <tr className="bg-slate-50 text-slate-400">
                      <th className="text-left font-black uppercase tracking-wider px-4 py-2">Product</th>
                      <th className="text-left font-black uppercase tracking-wider px-4 py-2">Category</th>
                      <th className="text-right font-black uppercase tracking-wider px-4 py-2">Price</th>
                      <th className="text-right font-black uppercase tracking-wider px-4 py-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {preview.preview.map((p) => (
                      <tr key={p.line}>
                        <td className="px-4 py-2 font-bold text-slate-800">{p.title}</td>
                        <td className="px-4 py-2 text-slate-500">{p.category}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-700">{p.base_price} EGP</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-700">{p.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview.would_create > 0 ? (
            <button type="button" onClick={() => send(true)} disabled={busy}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">publish</span>
              {busy ? 'Importing…' : `Add ${preview.would_create} product${preview.would_create === 1 ? '' : 's'} to my catalogue`}
            </button>
          ) : (
            <p className="text-xs text-slate-500 text-center m-0">
              Nothing can be added yet — fix the rows above and upload the file again.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkProductImport;
