import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ActivitySummaryPDF() {
  const { apiFetch } = useAuth();
  const [range, setRange] = useState('30d');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true); setError(''); setText('');
    try {
      const r = await apiFetch(`/api/custom-views/activity-summary.pdf?range=${encodeURIComponent(range)}`);
      const body = await r.text();
      setText(body);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const download = () => {
    if (!text) return;
    const blob = new Blob([text], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renthub-activity-${range}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ color: '#f1f5f9', margin: 0 }}>Activity Summary PDF</h3>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Generate a downloadable activity report.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={range} onChange={e => setRange(e.target.value)}
            style={{ background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 6, padding: '6px 10px' }}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button onClick={generate} disabled={loading}
            style={{ background: '#6366f1', color: '#fff', border: 0, borderRadius: 6, padding: '6px 14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Generating...' : 'Generate'}
          </button>
          <button onClick={download} disabled={!text}
            style={{ background: text ? '#10b981' : '#334155', color: '#fff', border: 0, borderRadius: 6, padding: '6px 14px', cursor: text ? 'pointer' : 'not-allowed' }}>
            Download
          </button>
        </div>
      </div>
      {error && <div style={{ color: '#fca5a5' }}>{error}</div>}
      {text ? (
        <pre style={{ background: '#020617', color: '#cbd5e1', padding: 14, borderRadius: 8, fontSize: 12, lineHeight: 1.45, overflow: 'auto', maxHeight: 320 }}>{text}</pre>
      ) : (
        <div style={{ color: '#64748b', fontSize: 13, padding: 12 }}>Click Generate to build your activity report. It can then be downloaded as a .pdf file.</div>
      )}
    </div>
  );
}
