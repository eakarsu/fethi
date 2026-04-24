import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Profile() {
  const { apiFetch, user, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await apiFetch('/api/profile');
      const data = await res.json();
      setProfile(data);
      setForm({ name: data.name || '', email: data.email || '', phone: data.phone || '' });
    } catch { toast.error('Failed to load profile'); }
  };

  useEffect(() => { loadProfile(); }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/api/profile', { method: 'PUT', body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const updated = await res.json();
      // Update auth context
      const token = localStorage.getItem('token');
      login({ id: updated.id, email: updated.email, name: updated.name, phone: updated.phone }, token);
      toast.success('Profile updated!');
      setEditing(false);
      loadProfile();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.new_password.length < 4) { toast.error('Password too short'); return; }
    setSaving(true);
    try {
      const res = await apiFetch('/api/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ current_password: pwForm.current_password, new_password: pwForm.new_password })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Password changed!');
      setShowPw(false);
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const initials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!profile) return <div className="page"><div className="ai-load"><div className="spinner"></div>Loading profile...</div></div>;

  return (
    <div className="page">
      <div className="page-head"><h1>My Profile</h1></div>

      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-card-header">
          <div className="profile-avatar-lg">{initials(profile.name)}</div>
          <div className="profile-info-lg">
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
            {profile.phone && <p>{profile.phone}</p>}
            <p className="profile-since">Member since {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
          </div>
          <div style={{flex:1}} />
          <div className="profile-actions">
            <button className="btn btn-p btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit Profile'}</button>
            <button className="btn btn-s btn-sm" onClick={() => setShowPw(!showPw)}>{showPw ? 'Cancel' : 'Change Password'}</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats" style={{marginTop:'1.5rem'}}>
        <div className="stat"><div className="val" style={{color:'var(--primary)'}}>{profile.stats.listings}</div><div className="lbl">My Listings</div></div>
        <div className="stat"><div className="val" style={{color:'var(--green)'}}>${profile.stats.total_earnings}</div><div className="lbl">Total Earnings</div></div>
        <div className="stat"><div className="val" style={{color:'var(--orange)'}}>{profile.stats.bookings_as_owner}</div><div className="lbl">Bookings Received</div></div>
        <div className="stat"><div className="val" style={{color:'var(--teal)'}}>{profile.stats.bookings_as_renter}</div><div className="lbl">My Rentals</div></div>
        <div className="stat"><div className="val" style={{color:'var(--yellow)'}}>{profile.stats.avg_listing_rating || '—'}</div><div className="lbl">Avg Rating</div></div>
        <div className="stat"><div className="val" style={{color:'var(--purple)'}}>{profile.stats.reviews_written}</div><div className="lbl">Reviews Written</div></div>
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="profile-section">
          <h3>Edit Profile</h3>
          <form onSubmit={saveProfile}>
            <div className="form-grid">
              <div className="fg"><label>Full Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="fg"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              <div className="fg"><label>Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Optional" /></div>
            </div>
            <button type="submit" className="btn btn-g btn-sm" disabled={saving} style={{marginTop:'.75rem'}}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </form>
        </div>
      )}

      {/* Password Form */}
      {showPw && (
        <div className="profile-section">
          <h3>Change Password</h3>
          <form onSubmit={changePassword}>
            <div className="form-grid">
              <div className="fg"><label>Current Password</label><input type="password" value={pwForm.current_password} onChange={e => setPwForm({...pwForm, current_password: e.target.value})} required /></div>
              <div className="fg"><label>New Password</label><input type="password" value={pwForm.new_password} onChange={e => setPwForm({...pwForm, new_password: e.target.value})} required /></div>
              <div className="fg"><label>Confirm New Password</label><input type="password" value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm: e.target.value})} required /></div>
            </div>
            <button type="submit" className="btn btn-g btn-sm" disabled={saving} style={{marginTop:'.75rem'}}>{saving ? 'Saving...' : 'Update Password'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
