import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const statusColors = { pending: 'badge-yellow', confirmed: 'badge-green', completed: 'badge-blue', cancelled: 'badge-red' };

export default function Bookings() {
  const { apiFetch } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState('all');

  const load = async () => {
    try {
      const res = await apiFetch('/api/bookings');
      setBookings(await res.json());
    } catch { toast.error('Failed to load bookings'); }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await apiFetch(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      toast.success(`Booking ${status}`);
      setSel(null); load();
    } catch { toast.error('Update failed'); }
  };

  const del = async (id) => {
    if (!confirm('Delete this booking?')) return;
    try {
      await apiFetch(`/api/bookings/${id}`, { method: 'DELETE' });
      toast.success('Deleted'); setSel(null); load();
    } catch { toast.error('Delete failed'); }
  };

  const filtered = tab === 'all' ? bookings : bookings.filter(b => b.status === tab);

  const openDetail = async (b) => {
    try {
      const res = await apiFetch(`/api/bookings/${b.id}`);
      setSel(await res.json());
    } catch { setSel(b); }
  };

  return (
    <div className="page">
      <div className="page-head"><h1>Bookings</h1></div>

      <div style={{display:'flex',gap:'6px',marginBottom:'1.25rem',flexWrap:'wrap'}}>
        {['all','pending','confirmed','completed','cancelled'].map(t => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-p' : 'btn-s'}`} onClick={()=>setTab(t)} style={{textTransform:'capitalize'}}>{t}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><div className="ei">📋</div><h3>No bookings found</h3></div>
      ) : (
        <div className="grid">
          {filtered.map(b => (
            <div key={b.id} className="card" onClick={() => openDetail(b)}>
              <div className="card-top">
                <h4>{b.title || 'Booking #' + b.id}</h4>
                <span className={`badge ${statusColors[b.status]}`}>{b.status}</span>
              </div>
              <div className="card-desc">{b.message || 'No message'}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'.5rem'}}>
                <span className="price-tag">${b.total_price}</span>
                <span className="tag">{b.category}</span>
              </div>
              <div className="card-meta">
                <span className="tag">📅 {new Date(b.start_date).toLocaleDateString()} - {new Date(b.end_date).toLocaleDateString()}</span>
                {b.renter_name && <span className="tag">🧑 {b.renter_name}</span>}
                {b.owner_name && <span className="tag">👤 {b.owner_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {sel && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
          <div className="modal">
            <div className="modal-h"><h2>Booking #{sel.id}</h2><button className="modal-x" onClick={() => setSel(null)}>✕</button></div>
            <div className="modal-b">
              <div className="detail-grid">
                <div className="detail-f"><label>Listing</label><div className="val">{sel.title}</div></div>
                <div className="detail-f"><label>Status</label><div className="val"><span className={`badge ${statusColors[sel.status]}`}>{sel.status}</span></div></div>
                <div className="detail-f"><label>Total Price</label><div className="val price-tag">${sel.total_price}</div></div>
                <div className="detail-f"><label>Start Date</label><div className="val">{new Date(sel.start_date).toLocaleDateString()}</div></div>
                <div className="detail-f"><label>End Date</label><div className="val">{new Date(sel.end_date).toLocaleDateString()}</div></div>
                <div className="detail-f"><label>Category</label><div className="val">{sel.category}</div></div>
                {sel.renter_name && <div className="detail-f"><label>Renter</label><div className="val">{sel.renter_name} {sel.renter_email ? `(${sel.renter_email})` : ''}</div></div>}
                {sel.owner_name && <div className="detail-f"><label>Owner</label><div className="val">{sel.owner_name} {sel.owner_email ? `(${sel.owner_email})` : ''}</div></div>}
                {sel.location && <div className="detail-f"><label>Location</label><div className="val">{sel.location}</div></div>}
              </div>
              {sel.message && <div className="detail-f"><label>Message</label><div className="val">{sel.message}</div></div>}
            </div>
            <div className="modal-f">
              {sel.status === 'pending' && <button className="btn btn-g btn-sm" onClick={() => updateStatus(sel.id, 'confirmed')}>✓ Confirm</button>}
              {sel.status === 'confirmed' && <button className="btn btn-p btn-sm" onClick={() => updateStatus(sel.id, 'completed')}>✓ Complete</button>}
              {(sel.status === 'pending' || sel.status === 'confirmed') && <button className="btn btn-d btn-sm" onClick={() => updateStatus(sel.id, 'cancelled')}>✕ Cancel</button>}
              <button className="btn btn-d btn-sm" onClick={() => del(sel.id)}>🗑 Delete</button>
              <div style={{flex:1}} />
              <button className="btn btn-s btn-sm" onClick={() => setSel(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
