import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Favorites() {
  const { apiFetch } = useAuth();
  const [favs, setFavs] = useState([]);
  const [sel, setSel] = useState(null);

  const load = () => apiFetch('/api/favorites').then(r => r.json()).then(setFavs).catch(() => {});
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    try { await apiFetch(`/api/favorites/${id}`, { method: 'DELETE' }); toast.success('Removed'); setSel(null); load(); }
    catch { toast.error('Failed'); }
  };

  const renderStars = (r) => '★'.repeat(Math.round(r || 0)) + '☆'.repeat(5 - Math.round(r || 0));

  return (
    <div className="page">
      <div className="page-head"><h1>My Favorites</h1></div>

      {favs.length === 0 ? (
        <div className="empty"><div className="ei">❤️</div><h3>No favorites yet</h3><p>Browse listings and add them to your favorites.</p></div>
      ) : (
        <div className="grid">
          {favs.map(f => (
            <div key={f.id} className="card" onClick={() => setSel(f)}>
              <div className="card-top">
                <h4>{f.title}</h4>
                <span className="badge">{f.category}</span>
              </div>
              <div className="card-desc">{f.description}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'.5rem'}}>
                <span className="price-tag">${f.price_per_day}/day</span>
                <span className="stars">{renderStars(f.rating)}</span>
              </div>
              <div className="card-meta">
                <span className="tag">📍 {f.city}</span>
                <span className="tag">👤 {f.owner_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {sel && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
          <div className="modal" style={{maxWidth:'600px'}}>
            <div className="modal-h"><h2>{sel.title}</h2><button className="modal-x" onClick={() => setSel(null)}>✕</button></div>
            <div className="modal-b">
              <div className="detail-grid">
                <div className="detail-f"><label>Category</label><div className="val">{sel.category}</div></div>
                <div className="detail-f"><label>Price/Day</label><div className="val price-tag">${sel.price_per_day}</div></div>
                <div className="detail-f"><label>Location</label><div className="val">{sel.location}, {sel.city}</div></div>
                <div className="detail-f"><label>Rating</label><div className="val stars">{renderStars(sel.rating)}</div></div>
                <div className="detail-f"><label>Owner</label><div className="val">{sel.owner_name}</div></div>
              </div>
              {sel.description && <div className="detail-f"><label>Description</label><div className="val">{sel.description}</div></div>}
            </div>
            <div className="modal-f">
              <button className="btn btn-d btn-sm" onClick={() => remove(sel.id)}>🗑 Remove from Favorites</button>
              <div style={{flex:1}} />
              <button className="btn btn-s btn-sm" onClick={() => setSel(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
