import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const typeIcons = {
  booking: '📅',
  review: '⭐',
  message: '💬',
  system: '🔔',
};

const typeColors = {
  booking: 'var(--green)',
  review: 'var(--yellow)',
  message: 'var(--primary)',
  system: 'var(--purple)',
};

export default function Notifications() {
  const { apiFetch } = useAuth();
  const nav = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    try {
      const res = await apiFetch('/api/notifications');
      setNotifications(await res.json());
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const deleteNotif = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  const handleClick = (notif) => {
    if (!notif.read) markRead(notif.id);
    if (notif.link) nav(notif.link);
  };

  const formatDate = (d) => {
    const now = new Date();
    const date = new Date(d);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filtered = filter === 'all' ? notifications
    : filter === 'unread' ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Notifications {unreadCount > 0 && <span className="notif-count-badge">{unreadCount}</span>}</h1>
        <div className="page-head-actions">
          {unreadCount > 0 && (
            <button className="btn btn-p btn-sm" onClick={markAllRead}>Mark All Read</button>
          )}
        </div>
      </div>

      <div className="notif-filters">
        {['all', 'unread', 'booking', 'review', 'message'].map(f => (
          <button
            key={f}
            className={`notif-filter ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '🔔 All' : f === 'unread' ? `📬 Unread (${unreadCount})` : `${typeIcons[f]} ${f.charAt(0).toUpperCase() + f.slice(1)}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ai-load"><div className="spinner"></div>Loading notifications...</div>
      ) : filtered.length === 0 ? (
        <div className="empty"><div className="ei">🔕</div><h3>No notifications</h3><p>{filter === 'all' ? 'You\'re all caught up!' : 'No notifications in this category.'}</p></div>
      ) : (
        <div className="notif-list">
          {filtered.map(n => (
            <div
              key={n.id}
              className={`notif-item ${n.read ? '' : 'unread'}`}
              onClick={() => handleClick(n)}
            >
              <div className="notif-icon" style={{background: `${typeColors[n.type]}15`, color: typeColors[n.type]}}>
                {typeIcons[n.type] || '🔔'}
              </div>
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                {n.message && <div className="notif-message">{n.message}</div>}
                <div className="notif-time">{formatDate(n.created_at)}</div>
              </div>
              <div className="notif-actions">
                {!n.read && <div className="notif-dot" />}
                <button
                  className="notif-delete"
                  onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                  title="Delete"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
