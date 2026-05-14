import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

const sections = [
  {
    title: 'Main',
    links: [
      { to: '/', label: 'Dashboard', icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>) },
      { to: '/browse', label: 'Browse', icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>) },
    ],
  },
  {
    title: 'Marketplace',
    links: [
      { to: '/my-listings', label: 'My Listings', icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14h6m-6-4h6"/></svg>) },
      { to: '/bookings', label: 'Bookings', icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>) },
    ],
  },
  {
    title: 'Services',
    links: [
      { to: '/services', label: 'Service Hub', icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>) },
    ],
  },
  {
    title: 'Communication',
    links: [
      { to: '/messages', label: 'Messages', icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>) },
      { to: '/notifications', label: 'Notifications', icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>), hasNotifBadge: true },
      { to: '/ai', label: 'AI Assistant', icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M18 14h.5a2.5 2.5 0 0 1 0 5H18"/><path d="M6 14h-.5a2.5 2.5 0 0 0 0 5H6"/><path d="M6 14a6 6 0 0 0 12 0"/><path d="M12 20v2"/></svg>) },
      { to: '/ai-insights', label: 'AI Insights', icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>) },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/profile', label: 'My Profile', icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>) },
    ],
  },
];

export default function Navbar() {
  const { user, logout, apiFetch } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      apiFetch('/api/notifications/unread-count')
        .then(r => r.json())
        .then(d => setUnreadCount(d.count || 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (to) => to === '/' ? pathname === '/' : pathname.startsWith(to);

  const initials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      {/* Mobile toggle */}
      <button className="sidebar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          {mobileOpen
            ? <path d="M18 6 6 18M6 6l12 12"/>
            : <><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></>
          }
        </svg>
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand" onClick={() => setMobileOpen(false)}>
            <div className="sidebar-logo">R</div>
            {!collapsed && <span className="sidebar-title">RentHub</span>}
          </Link>
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {collapsed
                ? <path d="m9 18 6-6-6-6"/>
                : <path d="m15 18-6-6 6-6"/>
              }
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div key={section.title} className="sidebar-section">
              {!collapsed && <div className="sidebar-section-title">{section.title}</div>}
              {collapsed && <div className="sidebar-divider" />}
              {section.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`sidebar-link ${isActive(link.to) ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? link.label : undefined}
                >
                  <span className="sidebar-link-icon">{link.icon}</span>
                  {!collapsed && <span className="sidebar-link-label">{link.label}</span>}
                  {link.hasNotifBadge && unreadCount > 0 && (
                    <span className="sidebar-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                  {isActive(link.to) && <span className="sidebar-active-indicator" />}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer / User */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials(user?.name)}</div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.name || 'User'}</div>
                <div className="sidebar-user-email">{user?.email}</div>
              </div>
            )}
            <button
              className="sidebar-logout"
              onClick={logout}
              title="Logout"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
