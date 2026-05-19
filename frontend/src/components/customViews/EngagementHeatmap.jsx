import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function EngagementHeatmap() {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [feature, setFeature] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = (f) => {
    setLoading(true); setError('');
    apiFetch(`/api/custom-views/engagement-heatmap?feature=${encodeURIComponent(f)}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setData(j); else setError(j.error || 'Failed'); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(feature); /* eslint-disable-line */ }, []);

  const cellColor = (v, max) => {
    if (!max) return '#1e293b';
    const t = v / max;
    // dark slate -> indigo gradient
    const r = Math.round(30 + (99 - 30) * t);
    const g = Math.round(41 + (102 - 41) * t);
    const b = Math.round(59 + (241 - 59) * t);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <h3 style={{ color: '#f1f5f9', margin: 0 }}>Feature Engagement Heatmap</h3>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Day-of-week vs. hour bucket interaction intensity.</div>
        </div>
        <div>
          <label style={{ color: '#94a3b8', fontSize: 13, marginRight: 8 }}>Feature</label>
          <select value={feature} onChange={e => { setFeature(e.target.value); load(e.target.value); }}
            style={{ background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px' }}>
            <option value="all">All</option>
            <option value="browse">Browse</option>
            <option value="bookings">Bookings</option>
            <option value="messages">Messages</option>
            <option value="ai">AI</option>
            <option value="favorites">Favorites</option>
          </select>
        </div>
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>Loading...</div>}
      {error && <div style={{ color: '#fca5a5' }}>{error}</div>}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${data.hourBuckets.length}, 1fr)`, gap: 4 }}>
            <div />
            {data.hourBuckets.map(h => (
              <div key={h} style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>{h}</div>
            ))}
            {data.dayLabels.map((day, di) => (
              <div key={day} style={{ display: 'contents' }}>
                <div style={{ color: '#cbd5e1', fontSize: 12, alignSelf: 'center' }}>{day}</div>
                {data.hourBuckets.map((_, hi) => {
                  const cell = data.cells.find(c => c.day === di && c.hour === hi);
                  const v = cell?.value ?? 0;
                  return (
                    <div key={hi}
                      title={`${day} ${data.hourBuckets[hi]}: ${v}`}
                      style={{ background: cellColor(v, data.max), height: 32, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: v / data.max > 0.5 ? '#f1f5f9' : '#94a3b8', fontSize: 11 }}>
                      {v}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, color: '#cbd5e1', fontSize: 13 }}>
            <div>Top day: <strong style={{ color: '#f1f5f9' }}>{data.summary.topDay}</strong></div>
            <div>Total events: <strong style={{ color: '#f1f5f9' }}>{data.summary.totalEvents}</strong></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Low</span>
              <div style={{ width: 80, height: 10, background: 'linear-gradient(to right, rgb(30,41,59), rgb(99,102,241))', borderRadius: 4 }} />
              <span>High</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
