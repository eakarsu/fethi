import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Reviews() {
  const { apiFetch } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [fd, setFd] = useState({ listing_id: '', rating: 5, comment: '' });
  const [listings, setListings] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => apiFetch('/api/reviews').then(r => r.json()).then(setReviews).catch(() => {});
  useEffect(() => { load(); apiFetch('/api/listings').then(r=>r.json()).then(setListings).catch(()=>{}); }, []);

  const openCreate = () => { setEdit(null); setFd({ listing_id: '', rating: 5, comment: '' }); setForm(true); };
  const openEdit = (r) => { setEdit(r); setFd({ listing_id: r.listing_id, rating: r.rating, comment: r.comment }); setSel(null); setForm(true); };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = edit ? `/api/reviews/${edit.id}` : '/api/reviews';
      const method = edit ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(fd) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(edit ? 'Updated!' : 'Review posted!');
      setForm(false); load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this review?')) return;
    try { await apiFetch(`/api/reviews/${id}`, { method: 'DELETE' }); toast.success('Deleted'); setSel(null); load(); }
    catch { toast.error('Delete failed'); }
  };

  const renderStars = (r) => '★'.repeat(r) + '☆'.repeat(5 - r);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Reviews</h1>
        <button className="btn btn-p" onClick={openCreate}>+ Write Review</button>
      </div>

      {reviews.length === 0 ? (
        <div className="empty"><div className="ei">⭐</div><h3>No reviews yet</h3></div>
      ) : (
        <div className="grid">
          {reviews.map(r => (
            <div key={r.id} className="card" onClick={() => setSel(r)}>
              <div className="card-top">
                <h4>{r.listing_title}</h4>
                <span className="badge">{r.category}</span>
              </div>
              <div style={{color:'var(--yellow)',fontSize:'1rem',marginBottom:'.35rem'}}>{renderStars(r.rating)}</div>
              <div className="card-desc">{r.comment}</div>
              <div className="card-meta">
                <span className="tag">👤 {r.reviewer_name}</span>
                <span className="tag">📅 {new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {sel && !form && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
          <div className="modal" style={{maxWidth:'600px'}}>
            <div className="modal-h"><h2>Review Details</h2><button className="modal-x" onClick={() => setSel(null)}>✕</button></div>
            <div className="modal-b">
              <div className="detail-grid">
                <div className="detail-f"><label>Listing</label><div className="val">{sel.listing_title}</div></div>
                <div className="detail-f"><label>Category</label><div className="val">{sel.category}</div></div>
                <div className="detail-f"><label>Rating</label><div className="val"><span className="stars" style={{fontSize:'1.2rem'}}>{renderStars(sel.rating)}</span></div></div>
                <div className="detail-f"><label>Reviewer</label><div className="val">{sel.reviewer_name}</div></div>
                <div className="detail-f"><label>Date</label><div className="val">{new Date(sel.created_at).toLocaleDateString()}</div></div>
              </div>
              <div className="detail-f"><label>Comment</label><div className="val">{sel.comment}</div></div>
            </div>
            <div className="modal-f">
              <button className="btn btn-g btn-sm" onClick={() => openEdit(sel)}>✏ Edit</button>
              <button className="btn btn-d btn-sm" onClick={() => del(sel.id)}>🗑 Delete</button>
              <div style={{flex:1}} />
              <button className="btn btn-s btn-sm" onClick={() => setSel(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {form && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setForm(false); }}>
          <div className="modal" style={{maxWidth:'500px'}}>
            <div className="modal-h"><h2>{edit ? 'Edit Review' : 'Write Review'}</h2><button className="modal-x" onClick={() => setForm(false)}>✕</button></div>
            <form onSubmit={save}>
              <div className="modal-b">
                {!edit && (
                  <div className="fg">
                    <label>Listing *</label>
                    <select value={fd.listing_id} onChange={e => setFd({...fd, listing_id: e.target.value})} required>
                      <option value="">Select a listing...</option>
                      {listings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                    </select>
                  </div>
                )}
                <div className="fg">
                  <label>Rating *</label>
                  <div style={{display:'flex',gap:'8px',marginTop:'.25rem'}}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setFd({...fd, rating: n})}
                        style={{background:'none',border:'none',cursor:'pointer',fontSize:'1.5rem',color: n <= fd.rating ? 'var(--yellow)' : 'var(--bg-3)'}}>★</button>
                    ))}
                  </div>
                </div>
                <div className="fg"><label>Comment *</label><textarea value={fd.comment} onChange={e => setFd({...fd, comment: e.target.value})} required placeholder="Share your experience..." style={{minHeight:'100px'}} /></div>
              </div>
              <div className="modal-f">
                <button type="submit" className="btn btn-p btn-sm" disabled={saving}>{saving ? 'Saving...' : edit ? 'Update' : 'Post Review'}</button>
                <button type="button" className="btn btn-s btn-sm" onClick={() => setForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
