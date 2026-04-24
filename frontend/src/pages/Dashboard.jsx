import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

const categories = [
  { key: 'Properties', icon: '🏠', color: '#3b82f6', desc: 'Apartments, houses, cabins, and vacation rentals for any duration.' },
  { key: 'Vehicles', icon: '🚗', color: '#22c55e', desc: 'Cars, vans, motorcycles, and campers for road trips and daily use.' },
  { key: 'Electronics', icon: '📷', color: '#a855f7', desc: 'Cameras, laptops, drones, and pro gear for your creative projects.' },
  { key: 'Tools & Equipment', icon: '🔧', color: '#f97316', desc: 'Power tools, generators, and heavy equipment for any job.' },
  { key: 'Sports & Outdoor', icon: '🚴', color: '#14b8a6', desc: 'Bikes, kayaks, camping gear, and everything for outdoor adventures.' },
  { key: 'Event & Party', icon: '🎉', color: '#eab308', desc: 'Sound systems, tents, photo booths, and everything for your event.' },
];

export default function Dashboard() {
  const nav = useNavigate();
  const { apiFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [q, setQ] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    apiFetch('/api/listings/stats/overview').then(r => r.json()).then(setStats).catch(() => {});
    apiFetch('/api/listings/stats/my-analytics').then(r => r.json()).then(setAnalytics).catch(() => {});
  }, []);

  const catCount = (cat) => stats?.categories?.find(c => c.category === cat)?.count || 0;

  const askAI = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setAiLoading(true); setAiResult('');
    try {
      const res = await apiFetch('/api/ai/ask', { method: 'POST', body: JSON.stringify({ question: q }) });
      const data = await res.json();
      setAiResult(data.choices?.[0]?.message?.content || data.error?.message || 'No response. Check your OPENROUTER_API_KEY in .env');
    } catch { toast.error('AI request failed'); setAiResult('Failed. Set OPENROUTER_API_KEY in .env'); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="page">
      <div className="dash-head">
        <h1>RentHub Marketplace</h1>
        <p>Rent anything from anyone. Browse categories, list your items, and discover deals near you.</p>
      </div>

      <div className="stats">
        <div className="stat"><div className="val" style={{color:'var(--primary)'}}>{stats?.total_listings || 0}</div><div className="lbl">Total Listings</div></div>
        <div className="stat"><div className="val" style={{color:'var(--green)'}}>${stats?.avg_daily_price || 0}</div><div className="lbl">Avg Daily Price</div></div>
        <div className="stat"><div className="val" style={{color:'var(--orange)'}}>{stats?.total_bookings || 0}</div><div className="lbl">Bookings</div></div>
        <div className="stat"><div className="val" style={{color:'var(--yellow)'}}>{stats?.total_reviews || 0}</div><div className="lbl">Reviews</div></div>
        <div className="stat"><div className="val" style={{color:'var(--purple)'}}>{categories.length}</div><div className="lbl">Categories</div></div>
      </div>

      <h2 style={{marginBottom:'1rem',fontSize:'1.3rem'}}>Browse Categories</h2>
      <div className="cat-grid">
        {categories.map(c => (
          <div key={c.key} className="cat-card" onClick={() => nav(`/browse/${encodeURIComponent(c.key)}`)}>
            <div className="cat-icon" style={{background:`${c.color}20`}}>{c.icon}</div>
            <h3>{c.key}</h3>
            <p>{c.desc}</p>
            <span className="cat-count">{catCount(c.key)} listings</span>
          </div>
        ))}
      </div>

      {/* Host Analytics */}
      {analytics && (
        <div className="analytics-section">
          <h2 style={{marginBottom:'1rem',fontSize:'1.3rem'}}>My Analytics</h2>
          <div className="stats">
            <div className="stat"><div className="val" style={{color:'var(--green)'}}>${analytics.total_earnings}</div><div className="lbl">Earnings (Host)</div></div>
            <div className="stat"><div className="val" style={{color:'var(--red)'}}>${analytics.total_spent}</div><div className="lbl">Spent (Renter)</div></div>
            <div className="stat"><div className="val" style={{color:'var(--primary)'}}>{analytics.listings.length}</div><div className="lbl">My Listings</div></div>
            <div className="stat"><div className="val" style={{color:'var(--orange)'}}>{analytics.total_views}</div><div className="lbl">Total Views</div></div>
            <div className="stat">
              <div className="val" style={{color:'var(--teal)'}}>
                {analytics.bookings_by_status.reduce((a, b) => a + parseInt(b.count), 0)}
              </div>
              <div className="lbl">Bookings Received</div>
            </div>
            <div className="stat">
              <div className="val" style={{color:'var(--purple)'}}>
                {analytics.rentals_by_status.reduce((a, b) => a + parseInt(b.count), 0)}
              </div>
              <div className="lbl">My Rentals</div>
            </div>
          </div>

          {/* Renter Booking Status */}
          {analytics.rentals_by_status.length > 0 && (
            <div className="analytics-card" style={{marginTop:'1rem'}}>
              <h4>My Rental Status</h4>
              <div className="status-bars">
                {analytics.rentals_by_status.map(s => {
                  const total = analytics.rentals_by_status.reduce((a, b) => a + parseInt(b.count), 0);
                  const pct = total ? Math.round((parseInt(s.count) / total) * 100) : 0;
                  const colors = { pending: 'var(--yellow)', confirmed: 'var(--primary)', completed: 'var(--green)', cancelled: 'var(--red)' };
                  return (
                    <div key={s.status} className="status-bar-row">
                      <span className="status-bar-label">{s.status}</span>
                      <div className="status-bar-track">
                        <div className="status-bar-fill" style={{width: `${pct}%`, background: colors[s.status] || 'var(--bg-3)'}} />
                      </div>
                      <span className="status-bar-val">{s.count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Host Booking Status Breakdown */}
          {analytics.bookings_by_status.length > 0 && (
            <div className="analytics-card" style={{marginTop:'1rem'}}>
              <h4>Booking Status</h4>
              <div className="status-bars">
                {analytics.bookings_by_status.map(s => {
                  const total = analytics.bookings_by_status.reduce((a, b) => a + parseInt(b.count), 0);
                  const pct = total ? Math.round((parseInt(s.count) / total) * 100) : 0;
                  const colors = { pending: 'var(--yellow)', confirmed: 'var(--primary)', completed: 'var(--green)', cancelled: 'var(--red)' };
                  return (
                    <div key={s.status} className="status-bar-row">
                      <span className="status-bar-label">{s.status}</span>
                      <div className="status-bar-track">
                        <div className="status-bar-fill" style={{width: `${pct}%`, background: colors[s.status] || 'var(--bg-3)'}} />
                      </div>
                      <span className="status-bar-val">{s.count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Listings */}
          {analytics.listings.length > 0 && (
            <div className="analytics-card" style={{marginTop:'1rem'}}>
              <h4>Top Listings by Views</h4>
              <div className="top-listings">
                {analytics.listings.slice(0, 5).map((l, i) => (
                  <div key={l.id} className="top-listing-row" onClick={() => nav('/browse')}>
                    <span className="top-listing-rank">#{i + 1}</span>
                    <span className="top-listing-title">{l.title}</span>
                    <span className="stars" style={{fontSize:'.75rem'}}>{('★').repeat(Math.round(l.rating || 0))}{('☆').repeat(5 - Math.round(l.rating || 0))}</span>
                    <span className="tag">{l.views} views</span>
                    <span className="price-tag" style={{fontSize:'.85rem'}}>${l.price_per_day}/day</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.listings.length === 0 && (
            <div className="analytics-card" style={{marginTop:'1rem',textAlign:'center',padding:'2rem'}}>
              <p style={{color:'var(--text-3)',marginBottom:'.75rem'}}>You haven't listed any items yet.</p>
              <button className="btn btn-p btn-sm" onClick={() => nav('/my-listings')}>Create Your First Listing</button>
            </div>
          )}

          {/* My Recent Rentals */}
          {analytics.my_rentals.length > 0 && (
            <div className="analytics-card" style={{marginTop:'1rem'}}>
              <h4>My Recent Rentals</h4>
              {analytics.my_rentals.map(b => (
                <div key={b.id} className="activity-row">
                  <div className="activity-icon">🏷️</div>
                  <div className="activity-info">
                    <div className="activity-title">Rented "{b.title}" from {b.owner_name}</div>
                    <div className="activity-meta">${b.total_price} · {b.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Activity (as Host) */}
          <div style={{display:'grid', gridTemplateColumns: analytics.recent_bookings.length > 0 && analytics.recent_reviews.length > 0 ? '1fr 1fr' : '1fr', gap:'1rem', marginTop:'1rem'}}>
            {analytics.recent_bookings.length > 0 && (
              <div className="analytics-card">
                <h4>Bookings Received (Host)</h4>
                {analytics.recent_bookings.map(b => (
                  <div key={b.id} className="activity-row">
                    <div className="activity-icon">📅</div>
                    <div className="activity-info">
                      <div className="activity-title">{b.renter_name} booked "{b.title}"</div>
                      <div className="activity-meta">${b.total_price} · {b.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {analytics.recent_reviews.length > 0 && (
              <div className="analytics-card">
                <h4>Recent Reviews</h4>
                {analytics.recent_reviews.map(r => (
                  <div key={r.id} className="activity-row">
                    <div className="activity-icon">⭐</div>
                    <div className="activity-info">
                      <div className="activity-title">{r.reviewer_name} reviewed "{r.listing_title}"</div>
                      <div className="activity-meta">{'★'.repeat(r.rating)} · {r.comment?.slice(0, 50)}{r.comment?.length > 50 ? '...' : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ai-section">
        <h2>🤖 AI Rental Assistant</h2>
        <p style={{color:'var(--text-2)',marginBottom:'1rem',fontSize:'.9rem'}}>Ask about pricing, best practices, market trends, or anything about renting.</p>
        <form className="ai-form" onSubmit={askAI}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="e.g. What's a fair daily rate for a DSLR camera in NYC?" />
          <button type="submit" className="btn btn-purple" disabled={aiLoading}>{aiLoading ? 'Thinking...' : 'Ask AI'}</button>
        </form>
        {aiLoading && <div className="ai-load"><div className="spinner"></div>Analyzing...</div>}
        {aiResult && <div className="ai-box"><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
      </div>
    </div>
  );
}
