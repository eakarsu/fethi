import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Messages() {
  const { apiFetch, user } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(false);
  const [fd, setFd] = useState({ receiver_id: '', listing_id: '', content: '' });
  const [listings, setListings] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => apiFetch('/api/messages').then(r => r.json()).then(setMsgs).catch(() => {});
  useEffect(() => { load(); apiFetch('/api/listings').then(r=>r.json()).then(setListings).catch(()=>{}); }, []);

  const send = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await apiFetch('/api/messages', { method: 'POST', body: JSON.stringify(fd) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Message sent!');
      setForm(false); setFd({ receiver_id: '', listing_id: '', content: '' }); load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this message?')) return;
    try { await apiFetch(`/api/messages/${id}`, { method: 'DELETE' }); toast.success('Deleted'); setSel(null); load(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Messages</h1>
        <button className="btn btn-p" onClick={() => setForm(true)}>+ New Message</button>
      </div>

      {msgs.length === 0 ? (
        <div className="empty"><div className="ei">💬</div><h3>No messages yet</h3><p>Start a conversation about a listing.</p></div>
      ) : (
        <div className="grid">
          {msgs.map(m => (
            <div key={m.id} className="card" onClick={() => setSel(m)}>
              <div className="card-top">
                <h4>{m.listing_title || 'Direct Message'}</h4>
                <span className={`badge ${m.sender_id === user?.id ? 'badge-blue' : 'badge-green'}`}>{m.sender_id === user?.id ? 'Sent' : 'Received'}</span>
              </div>
              <div className="card-desc">{m.content}</div>
              <div className="card-meta">
                <span className="tag">👤 {m.sender_id === user?.id ? `To: ${m.receiver_name}` : `From: ${m.sender_name}`}</span>
                <span className="tag">📅 {new Date(m.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {sel && !form && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
          <div className="modal" style={{maxWidth:'600px'}}>
            <div className="modal-h"><h2>Message Details</h2><button className="modal-x" onClick={() => setSel(null)}>✕</button></div>
            <div className="modal-b">
              <div className="detail-grid">
                {sel.listing_title && <div className="detail-f"><label>Listing</label><div className="val">{sel.listing_title}</div></div>}
                <div className="detail-f"><label>From</label><div className="val">{sel.sender_name}</div></div>
                <div className="detail-f"><label>To</label><div className="val">{sel.receiver_name}</div></div>
                <div className="detail-f"><label>Date</label><div className="val">{new Date(sel.created_at).toLocaleString()}</div></div>
              </div>
              <div className="detail-f" style={{marginTop:'.75rem'}}><label>Message</label><div className="val" style={{whiteSpace:'pre-wrap'}}>{sel.content}</div></div>
            </div>
            <div className="modal-f">
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
            <div className="modal-h"><h2>Send Message</h2><button className="modal-x" onClick={() => setForm(false)}>✕</button></div>
            <form onSubmit={send}>
              <div className="modal-b">
                <div className="fg">
                  <label>Recipient User ID *</label>
                  <input type="number" value={fd.receiver_id} onChange={e => setFd({...fd, receiver_id: e.target.value})} required placeholder="User ID (e.g. 2 for Alice)" />
                  <small style={{color:'var(--text-3)',fontSize:'.75rem'}}>Users: 2=Alice, 3=Bob, 4=Carol, 5=Dave</small>
                </div>
                <div className="fg">
                  <label>About Listing (optional)</label>
                  <select value={fd.listing_id} onChange={e => setFd({...fd, listing_id: e.target.value})}>
                    <option value="">No specific listing</option>
                    {listings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Message *</label><textarea value={fd.content} onChange={e => setFd({...fd, content: e.target.value})} required placeholder="Write your message..." style={{minHeight:'100px'}} /></div>
              </div>
              <div className="modal-f">
                <button type="submit" className="btn btn-p btn-sm" disabled={saving}>{saving ? 'Sending...' : 'Send'}</button>
                <button type="button" className="btn btn-s btn-sm" onClick={() => setForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
