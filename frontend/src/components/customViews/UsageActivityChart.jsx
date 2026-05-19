import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function UsageActivityChart() {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(14);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = (d) => {
    setLoading(true); setError('');
    apiFetch(`/api/custom-views/usage-activity?days=${d}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setData(j); else setError(j.error || 'Failed'); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(days); /* eslint-disable-line */ }, []);

  const W = 720, H = 240, PAD = 36;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const allVals = data ? data.series.flatMap(s => s.values) : [0];
  const max = Math.max(1, ...allVals);
  const n = data?.labels.length || 1;
  const step = n > 1 ? innerW / (n - 1) : 0;

  const path = (vals) => vals.map((v, i) => {
    const x = PAD + step * i;
    const y = PAD + innerH - (v / max) * innerH;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <h3 style={{ color: '#f1f5f9', margin: 0 }}>Usage Activity</h3>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Daily counts across your key actions{data?.source === 'synthetic' ? ' (synthetic preview)' : ''}.</div>
        </div>
        <div>
          <label style={{ color: '#94a3b8', fontSize: 13, marginRight: 8 }}>Range</label>
          <select value={days} onChange={e => { const d = Number(e.target.value); setDays(d); load(d); }}
            style={{ background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px' }}>
            <option value={7}>7d</option>
            <option value={14}>14d</option>
            <option value={30}>30d</option>
          </select>
        </div>
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>Loading...</div>}
      {error && <div style={{ color: '#fca5a5' }}>{error}</div>}

      {data && (
        <>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
            {/* grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
              <line key={i} x1={PAD} x2={W - PAD} y1={PAD + innerH * p} y2={PAD + innerH * p} stroke="#1e293b" />
            ))}
            {data.series.map((s, si) => (
              <g key={s.name}>
                <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2" />
                {s.values.map((v, i) => (
                  <circle key={i} cx={PAD + step * i} cy={PAD + innerH - (v / max) * innerH} r="2.5" fill={s.color} />
                ))}
              </g>
            ))}
            {/* x-axis sample labels */}
            {data.labels.map((lab, i) => (i % Math.ceil(n / 6) === 0) ? (
              <text key={i} x={PAD + step * i} y={H - 8} fill="#64748b" fontSize="10" textAnchor="middle">{lab.slice(5)}</text>
            ) : null)}
            <text x={PAD - 6} y={PAD + 4} fill="#64748b" fontSize="10" textAnchor="end">{max}</text>
            <text x={PAD - 6} y={PAD + innerH} fill="#64748b" fontSize="10" textAnchor="end">0</text>
          </svg>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
            {data.series.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1', fontSize: 13 }}>
                <span style={{ width: 10, height: 10, background: s.color, borderRadius: 2, display: 'inline-block' }} />
                {s.name}: <strong style={{ color: '#f1f5f9' }}>{data.totals[s.name.toLowerCase()] ?? 0}</strong>
              </div>
            ))}
            <div style={{ color: '#94a3b8', fontSize: 13, marginLeft: 'auto' }}>Peak day: <strong style={{ color: '#f1f5f9' }}>{data.peak}</strong></div>
          </div>
        </>
      )}
    </div>
  );
}
