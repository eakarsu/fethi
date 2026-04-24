import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const tabs = ['Dashboard', 'Contracts', 'Tickets', 'Maintenance'];
const priorityColors = { urgent: 'var(--red)', high: 'var(--orange)', medium: 'var(--yellow)', low: 'var(--green)' };
const statusBadge = { active: 'badge-green', expired: 'badge-red', cancelled: 'badge-red', pending: 'badge-yellow', open: 'badge-blue', in_progress: 'badge-yellow', resolved: 'badge-green', closed: 'badge-purple', scheduled: 'badge-blue', overdue: 'badge-red', completed: 'badge-green' };

export default function ServiceDashboard() {
  const { apiFetch, user } = useAuth();
  const [tab, setTab] = useState('Dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [selContract, setSelContract] = useState(null);
  const [selTicket, setSelTicket] = useState(null);
  const [contractFilter, setContractFilter] = useState('all');
  const [ticketFilter, setTicketFilter] = useState('all');
  const [ticketTypeFilter, setTicketTypeFilter] = useState('all');

  // Create ticket form
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({ contract_id: '', type: 'maintenance', priority: 'medium', title: '', description: '', estimated_cost: '' });

  // Create maintenance form
  const [showCreateMaint, setShowCreateMaint] = useState(false);
  const [maintForm, setMaintForm] = useState({ contract_id: '', title: '', description: '', frequency: 'monthly', next_due_date: '' });

  // Comment form
  const [comment, setComment] = useState('');

  const loadDashboard = () => apiFetch('/api/subscriptions/dashboard').then(r => r.json()).then(setDashboard).catch(() => {});
  const loadContracts = () => apiFetch('/api/subscriptions/contracts').then(r => r.json()).then(setContracts).catch(() => {});
  const loadTickets = () => apiFetch('/api/subscriptions/requests').then(r => r.json()).then(setTickets).catch(() => {});
  const loadMaintenance = () => apiFetch('/api/subscriptions/maintenance').then(r => r.json()).then(setMaintenance).catch(() => {});

  useEffect(() => { loadDashboard(); loadContracts(); loadTickets(); loadMaintenance(); }, []);

  const openTicketDetail = async (ticket) => {
    try {
      const res = await apiFetch(`/api/subscriptions/requests/${ticket.id}`);
      setSelTicket(await res.json());
    } catch { setSelTicket(ticket); }
  };

  const openContractDetail = async (contract) => {
    try {
      const res = await apiFetch(`/api/subscriptions/contracts/${contract.id}`);
      setSelContract(await res.json());
    } catch { setSelContract(contract); }
  };

  const toggleAutoRenew = async () => {
    try {
      const res = await apiFetch(`/api/subscriptions/contracts/${selContract.id}`, { method: 'PUT', body: JSON.stringify({ auto_renew: !selContract.auto_renew }) });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setSelContract({ ...selContract, ...updated });
      toast.success(updated.auto_renew ? 'Auto-renew enabled' : 'Auto-renew disabled');
      loadContracts();
    } catch { toast.error('Failed to update'); }
  };

  const cancelContract = async () => {
    if (!confirm('Cancel this service contract?')) return;
    try {
      await apiFetch(`/api/subscriptions/contracts/${selContract.id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) });
      toast.success('Contract cancelled');
      setSelContract(null);
      loadContracts(); loadDashboard();
    } catch { toast.error('Failed to cancel'); }
  };

  const updateTicketStatus = async (newStatus) => {
    try {
      await apiFetch(`/api/subscriptions/requests/${selTicket.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      toast.success(`Status updated to ${newStatus}`);
      openTicketDetail(selTicket);
      loadTickets(); loadDashboard();
    } catch { toast.error('Failed to update'); }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await apiFetch(`/api/subscriptions/requests/${selTicket.id}/updates`, { method: 'POST', body: JSON.stringify({ comment }) });
      toast.success('Comment added');
      setComment('');
      openTicketDetail(selTicket);
    } catch { toast.error('Failed to add comment'); }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      const body = { ...ticketForm };
      if (body.estimated_cost) body.estimated_cost = parseFloat(body.estimated_cost);
      else delete body.estimated_cost;
      const res = await apiFetch('/api/subscriptions/requests', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Service request created!');
      setShowCreateTicket(false);
      setTicketForm({ contract_id: '', type: 'maintenance', priority: 'medium', title: '', description: '', estimated_cost: '' });
      loadTickets(); loadDashboard();
    } catch (err) { toast.error(err.message); }
  };

  const deleteTicket = async (id) => {
    if (!confirm('Delete this service request?')) return;
    try {
      await apiFetch(`/api/subscriptions/requests/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      setSelTicket(null);
      loadTickets(); loadDashboard();
    } catch { toast.error('Failed to delete'); }
  };

  const createMaintenance = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/subscriptions/maintenance', { method: 'POST', body: JSON.stringify(maintForm) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Maintenance scheduled!');
      setShowCreateMaint(false);
      setMaintForm({ contract_id: '', title: '', description: '', frequency: 'monthly', next_due_date: '' });
      loadMaintenance(); loadDashboard();
    } catch (err) { toast.error(err.message); }
  };

  const markMaintCompleted = async (id) => {
    try {
      await apiFetch(`/api/subscriptions/maintenance/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'completed' }) });
      toast.success('Marked as completed');
      loadMaintenance(); loadDashboard();
    } catch { toast.error('Failed to update'); }
  };

  const deleteMaintenance = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await apiFetch(`/api/subscriptions/maintenance/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      loadMaintenance();
    } catch { toast.error('Failed to delete'); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const filteredContracts = contracts.filter(c => contractFilter === 'all' || c.status === contractFilter);
  const filteredTickets = tickets.filter(t => (ticketFilter === 'all' || t.status === ticketFilter) && (ticketTypeFilter === 'all' || t.type === ticketTypeFilter));

  const activeContractsForForm = contracts.filter(c => c.status === 'active' && c.renter_id === user?.id);
  const ownerContracts = contracts.filter(c => c.status === 'active' && c.owner_id === user?.id);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Service Hub</h1>
      </div>

      {/* Tabs */}
      <div className="service-tabs">
        {tabs.map(t => (
          <button key={t} className={`service-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ==================== DASHBOARD TAB ==================== */}
      {tab === 'Dashboard' && dashboard && (
        <div>
          <div className="stats">
            <div className="stat"><div className="val" style={{color:'var(--primary)'}}>{dashboard.open_tickets}</div><div className="lbl">Open Tickets</div></div>
            <div className="stat"><div className="val" style={{color:'var(--teal)'}}>{dashboard.avg_resolution_hours}h</div><div className="lbl">Avg Resolution</div></div>
            <div className="stat"><div className="val" style={{color:'var(--green)'}}>{dashboard.active_contracts}</div><div className="lbl">Active Contracts</div></div>
            <div className="stat"><div className="val" style={{color:'var(--orange)'}}>{dashboard.expiring_soon}</div><div className="lbl">Expiring Soon</div></div>
            <div className="stat"><div className="val" style={{color:'var(--yellow)'}}>{dashboard.maintenance_due}</div><div className="lbl">Maintenance Due</div></div>
            <div className="stat"><div className="val" style={{color:'var(--purple)'}}>${dashboard.service_costs}</div><div className="lbl">Service Costs</div></div>
          </div>

          <div className="cat-grid" style={{marginBottom:'1.5rem'}}>
            <div className="analytics-card">
              <h4>Requests by Type</h4>
              <div className="status-bars">
                {dashboard.by_type.map(t => {
                  const max = Math.max(...dashboard.by_type.map(x => parseInt(x.count)), 1);
                  return (
                    <div key={t.type} className="status-bar-row">
                      <span className="status-bar-label">{t.type.replace('_', ' ')}</span>
                      <div className="status-bar-track"><div className="status-bar-fill" style={{width:`${(parseInt(t.count)/max)*100}%`, background:'var(--primary)'}} /></div>
                      <span className="status-bar-val">{t.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="analytics-card">
              <h4>Requests by Priority</h4>
              <div className="status-bars">
                {dashboard.by_priority.map(p => {
                  const max = Math.max(...dashboard.by_priority.map(x => parseInt(x.count)), 1);
                  return (
                    <div key={p.priority} className="status-bar-row">
                      <span className="status-bar-label" style={{color: priorityColors[p.priority]}}>{p.priority}</span>
                      <div className="status-bar-track"><div className="status-bar-fill" style={{width:`${(parseInt(p.count)/max)*100}%`, background: priorityColors[p.priority]}} /></div>
                      <span className="status-bar-val">{p.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="cat-grid">
            <div className="analytics-card">
              <h4>Recent Open Tickets</h4>
              {dashboard.recent_open.length === 0 ? <p style={{color:'var(--text-3)', fontSize:'.85rem'}}>No open tickets</p> : (
                <div className="top-listings">
                  {dashboard.recent_open.map(t => (
                    <div key={t.id} className="top-listing-row" onClick={() => { setTab('Tickets'); openTicketDetail(t); }}>
                      <span style={{width:4, height:28, borderRadius:2, background: priorityColors[t.priority]}} />
                      <span className="top-listing-title">{t.title}</span>
                      <span className={`badge ${statusBadge[t.status]}`}>{t.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="analytics-card">
              <h4>Upcoming Maintenance</h4>
              {dashboard.upcoming_maintenance.length === 0 ? <p style={{color:'var(--text-3)', fontSize:'.85rem'}}>No upcoming maintenance</p> : (
                <div className="top-listings">
                  {dashboard.upcoming_maintenance.map(m => (
                    <div key={m.id} className="top-listing-row" onClick={() => setTab('Maintenance')}>
                      <span className="maint-date-sm">{formatDate(m.next_due_date)}</span>
                      <span className="top-listing-title">{m.title}</span>
                      <span className={`badge ${statusBadge[m.status]}`}>{m.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONTRACTS TAB ==================== */}
      {tab === 'Contracts' && (
        <div>
          <div className="notif-filters">
            {['all','active','expired','cancelled'].map(f => (
              <button key={f} className={`notif-filter ${contractFilter === f ? 'active' : ''}`} onClick={() => setContractFilter(f)}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
          {filteredContracts.length === 0 ? (
            <div className="empty"><div className="ei">📋</div><h3>No contracts found</h3><p>Subscribe to a service plan when booking a listing.</p></div>
          ) : (
            <div className="grid">
              {filteredContracts.map(c => (
                <div key={c.id} className="card" onClick={() => openContractDetail(c)}>
                  <div className="card-top">
                    <h4>{c.plan_name} Plan</h4>
                    <span className={`badge ${statusBadge[c.status]}`}>{c.status}</span>
                  </div>
                  <div className="card-desc">{c.listing_title}</div>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'.5rem'}}>
                    <span className="price-tag">${c.monthly_price}/mo</span>
                    <span style={{fontSize:'.8rem', color:'var(--text-3)'}}>{formatDate(c.start_date)} - {formatDate(c.end_date)}</span>
                  </div>
                  <div className="card-meta">
                    {c.includes_maintenance && <span className="tag">Maintenance</span>}
                    {c.includes_repair && <span className="tag">Repair</span>}
                    {c.includes_parts && <span className="tag">Parts</span>}
                    {c.includes_priority_support && <span className="tag">Priority</span>}
                    {c.auto_renew && <span className="tag" style={{color:'var(--green)'}}>Auto-Renew</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TICKETS TAB ==================== */}
      {tab === 'Tickets' && (
        <div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'8px'}}>
            <div className="notif-filters" style={{marginBottom:0}}>
              {['all','open','in_progress','resolved','closed'].map(f => (
                <button key={f} className={`notif-filter ${ticketFilter === f ? 'active' : ''}`} onClick={() => setTicketFilter(f)}>{f === 'all' ? 'All' : f.replace('_', ' ')}</button>
              ))}
            </div>
            <div style={{display:'flex', gap:'8px'}}>
              <select className="browse-sort" value={ticketTypeFilter} onChange={e => setTicketTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="maintenance">Maintenance</option>
                <option value="repair">Repair</option>
                <option value="parts_replacement">Parts</option>
                <option value="inspection">Inspection</option>
                <option value="emergency">Emergency</option>
              </select>
              {activeContractsForForm.length > 0 && (
                <button className="btn btn-p btn-sm" onClick={() => setShowCreateTicket(true)}>+ New Request</button>
              )}
            </div>
          </div>
          {filteredTickets.length === 0 ? (
            <div className="empty"><div className="ei">🎫</div><h3>No tickets found</h3><p>Create a service request from an active contract.</p></div>
          ) : (
            <div className="grid">
              {filteredTickets.map(t => (
                <div key={t.id} className="card" style={{borderLeft: `4px solid ${priorityColors[t.priority]}`}} onClick={() => openTicketDetail(t)}>
                  <div className="card-top">
                    <h4>{t.title}</h4>
                    <span className={`badge ${statusBadge[t.status]}`}>{t.status.replace('_', ' ')}</span>
                  </div>
                  <div className="card-desc">{t.description || t.listing_title}</div>
                  <div className="card-meta">
                    <span className="tag">{t.type.replace('_', ' ')}</span>
                    <span className="tag" style={{color: priorityColors[t.priority]}}>{t.priority}</span>
                    <span className="tag">{t.listing_title}</span>
                    {t.estimated_cost && <span className="tag">${t.estimated_cost} est.</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== MAINTENANCE TAB ==================== */}
      {tab === 'Maintenance' && (
        <div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
            <h3 style={{fontSize:'1rem', fontWeight:700}}>Maintenance Schedules</h3>
            {ownerContracts.length > 0 && (
              <button className="btn btn-p btn-sm" onClick={() => setShowCreateMaint(true)}>+ New Schedule</button>
            )}
          </div>
          {maintenance.length === 0 ? (
            <div className="empty"><div className="ei">🔧</div><h3>No maintenance schedules</h3><p>Create a maintenance schedule from an active contract.</p></div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {maintenance.map(m => (
                <div key={m.id} className={`maint-card ${m.status === 'overdue' ? 'maint-overdue' : ''}`}>
                  <div className="maint-card-left">
                    <div className="maint-date">{formatDate(m.next_due_date)}</div>
                    <span className={`badge ${m.frequency === 'weekly' ? 'badge-blue' : m.frequency === 'monthly' ? 'badge-purple' : m.frequency === 'quarterly' ? 'badge-yellow' : 'badge-green'}`}>{m.frequency}</span>
                  </div>
                  <div className="maint-card-center">
                    <div style={{fontWeight:600, fontSize:'.92rem'}}>{m.title}</div>
                    <div style={{color:'var(--text-3)', fontSize:'.82rem'}}>{m.listing_title}{m.description ? ` - ${m.description}` : ''}</div>
                    {m.last_completed_date && <div style={{color:'var(--text-3)', fontSize:'.75rem'}}>Last completed: {formatDate(m.last_completed_date)}</div>}
                  </div>
                  <div className="maint-card-right">
                    <span className={`badge ${statusBadge[m.status]}`}>{m.status}</span>
                    <div style={{display:'flex', gap:'4px'}}>
                      {m.status !== 'completed' && m.owner_id === user?.id && (
                        <button className="btn btn-g btn-sm" onClick={() => markMaintCompleted(m.id)}>Complete</button>
                      )}
                      {m.owner_id === user?.id && (
                        <button className="btn btn-d btn-sm" onClick={() => deleteMaintenance(m.id)}>Delete</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== CONTRACT DETAIL MODAL ==================== */}
      {selContract && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setSelContract(null); }}>
          <div className="modal">
            <div className="modal-h">
              <h2>{selContract.plan_name} Plan - {selContract.listing_title}</h2>
              <button className="modal-x" onClick={() => setSelContract(null)}>✕</button>
            </div>
            <div className="modal-b">
              <div className="detail-grid">
                <div className="detail-f"><label>Status</label><div className="val"><span className={`badge ${statusBadge[selContract.status]}`}>{selContract.status}</span></div></div>
                <div className="detail-f"><label>Monthly Price</label><div className="val price-tag">${selContract.monthly_price}/mo</div></div>
                <div className="detail-f"><label>Start Date</label><div className="val">{formatDate(selContract.start_date)}</div></div>
                <div className="detail-f"><label>End Date</label><div className="val">{formatDate(selContract.end_date)}</div></div>
                <div className="detail-f"><label>Response Time</label><div className="val">{selContract.response_time_hours} hours</div></div>
                <div className="detail-f"><label>Max Requests</label><div className="val">{selContract.max_service_requests}</div></div>
                <div className="detail-f"><label>Duration</label><div className="val">{selContract.contract_duration_months} months</div></div>
                <div className="detail-f"><label>Auto-Renew</label><div className="val">{selContract.auto_renew ? 'Yes' : 'No'}</div></div>
              </div>
              <div className="detail-f" style={{marginBottom:'.75rem'}}>
                <label>Included Services</label>
                <div className="contract-services">
                  <div className={`contract-service ${selContract.includes_maintenance ? 'included' : ''}`}>{selContract.includes_maintenance ? '✓' : '✗'} Maintenance</div>
                  <div className={`contract-service ${selContract.includes_repair ? 'included' : ''}`}>{selContract.includes_repair ? '✓' : '✗'} Repair</div>
                  <div className={`contract-service ${selContract.includes_parts ? 'included' : ''}`}>{selContract.includes_parts ? '✓' : '✗'} Parts Replacement</div>
                  <div className={`contract-service ${selContract.includes_inspection ? 'included' : ''}`}>{selContract.includes_inspection ? '✓' : '✗'} Inspection</div>
                  <div className={`contract-service ${selContract.includes_priority_support ? 'included' : ''}`}>{selContract.includes_priority_support ? '✓' : '✗'} Priority Support</div>
                </div>
              </div>
              {selContract.terms && <div className="detail-f" style={{marginBottom:'.75rem'}}><label>Terms</label><div className="val">{selContract.terms}</div></div>}
            </div>
            <div className="modal-f">
              {selContract.status === 'active' && (
                <>
                  <button className="btn btn-p btn-sm" onClick={toggleAutoRenew}>{selContract.auto_renew ? 'Disable Auto-Renew' : 'Enable Auto-Renew'}</button>
                  <button className="btn btn-d btn-sm" onClick={cancelContract}>Cancel Contract</button>
                </>
              )}
              <div style={{flex:1}} />
              <button className="btn btn-s btn-sm" onClick={() => setSelContract(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TICKET DETAIL MODAL ==================== */}
      {selTicket && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setSelTicket(null); }}>
          <div className="modal modal-wide">
            <div className="modal-h">
              <h2>{selTicket.title}</h2>
              <button className="modal-x" onClick={() => setSelTicket(null)}>✕</button>
            </div>
            <div className="modal-b">
              <div className="detail-grid">
                <div className="detail-f"><label>Status</label><div className="val"><span className={`badge ${statusBadge[selTicket.status]}`}>{selTicket.status?.replace('_', ' ')}</span></div></div>
                <div className="detail-f"><label>Type</label><div className="val">{selTicket.type?.replace('_', ' ')}</div></div>
                <div className="detail-f"><label>Priority</label><div className="val" style={{color: priorityColors[selTicket.priority]}}>{selTicket.priority}</div></div>
                <div className="detail-f"><label>Listing</label><div className="val">{selTicket.listing_title}</div></div>
                {selTicket.estimated_cost && <div className="detail-f"><label>Estimated Cost</label><div className="val">${selTicket.estimated_cost}</div></div>}
                {selTicket.actual_cost && <div className="detail-f"><label>Actual Cost</label><div className="val price-tag">${selTicket.actual_cost}</div></div>}
                <div className="detail-f"><label>Opened</label><div className="val">{formatDateTime(selTicket.opened_at)}</div></div>
                {selTicket.resolved_at && <div className="detail-f"><label>Resolved</label><div className="val">{formatDateTime(selTicket.resolved_at)}</div></div>}
              </div>
              {selTicket.description && <div className="detail-f" style={{marginBottom:'1rem'}}><label>Description</label><div className="val">{selTicket.description}</div></div>}

              {/* Status action buttons */}
              {selTicket.status !== 'closed' && (
                <div style={{display:'flex', gap:'8px', marginBottom:'1rem', flexWrap:'wrap'}}>
                  {selTicket.status === 'open' && <button className="btn btn-p btn-sm" onClick={() => updateTicketStatus('in_progress')}>Start Working</button>}
                  {selTicket.status === 'in_progress' && <button className="btn btn-g btn-sm" onClick={() => updateTicketStatus('resolved')}>Mark Resolved</button>}
                  {selTicket.status === 'resolved' && <button className="btn btn-purple btn-sm" onClick={() => updateTicketStatus('closed')}>Close Ticket</button>}
                </div>
              )}

              {/* Timeline */}
              {selTicket.updates && selTicket.updates.length > 0 && (
                <div className="timeline">
                  <h4 style={{marginBottom:'.75rem', fontSize:'.95rem'}}>Timeline</h4>
                  {selTicket.updates.map(u => (
                    <div key={u.id} className="timeline-item">
                      <div className="timeline-meta">
                        <span style={{fontWeight:600, fontSize:'.85rem'}}>{u.user_name}</span>
                        <span style={{color:'var(--text-3)', fontSize:'.75rem'}}>{formatDateTime(u.created_at)}</span>
                        {u.new_status && <span className={`badge ${statusBadge[u.new_status]}`}>{u.new_status.replace('_', ' ')}</span>}
                      </div>
                      <div style={{color:'var(--text-2)', fontSize:'.87rem', lineHeight:1.5}}>{u.comment}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment */}
              {selTicket.status !== 'closed' && (
                <form onSubmit={addComment} style={{marginTop:'1rem'}}>
                  <div className="fg">
                    <label>Add Comment</label>
                    <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write an update..." rows={3} />
                  </div>
                  <button type="submit" className="btn btn-p btn-sm">Post Update</button>
                </form>
              )}
            </div>
            <div className="modal-f">
              <button className="btn btn-d btn-sm" onClick={() => deleteTicket(selTicket.id)}>Delete</button>
              <div style={{flex:1}} />
              <button className="btn btn-s btn-sm" onClick={() => setSelTicket(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CREATE TICKET MODAL ==================== */}
      {showCreateTicket && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreateTicket(false); }}>
          <div className="modal" style={{maxWidth:'550px'}}>
            <div className="modal-h"><h2>New Service Request</h2><button className="modal-x" onClick={() => setShowCreateTicket(false)}>✕</button></div>
            <form onSubmit={createTicket}>
              <div className="modal-b">
                <div className="form-grid">
                  <div className="fg form-full">
                    <label>Contract *</label>
                    <select value={ticketForm.contract_id} onChange={e => setTicketForm({...ticketForm, contract_id: e.target.value})} required>
                      <option value="">Select contract...</option>
                      {activeContractsForForm.map(c => <option key={c.id} value={c.id}>{c.plan_name} - {c.listing_title}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label>Type *</label>
                    <select value={ticketForm.type} onChange={e => setTicketForm({...ticketForm, type: e.target.value})}>
                      <option value="maintenance">Maintenance</option>
                      <option value="repair">Repair</option>
                      <option value="parts_replacement">Parts Replacement</option>
                      <option value="inspection">Inspection</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  <div className="fg"><label>Priority *</label>
                    <select value={ticketForm.priority} onChange={e => setTicketForm({...ticketForm, priority: e.target.value})}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="fg form-full"><label>Title *</label><input value={ticketForm.title} onChange={e => setTicketForm({...ticketForm, title: e.target.value})} required placeholder="Brief summary..." /></div>
                  <div className="fg form-full"><label>Description</label><textarea value={ticketForm.description} onChange={e => setTicketForm({...ticketForm, description: e.target.value})} placeholder="Detailed description..." /></div>
                  <div className="fg"><label>Estimated Cost ($)</label><input type="number" step="0.01" value={ticketForm.estimated_cost} onChange={e => setTicketForm({...ticketForm, estimated_cost: e.target.value})} /></div>
                </div>
              </div>
              <div className="modal-f">
                <button type="submit" className="btn btn-p btn-sm">Create Request</button>
                <button type="button" className="btn btn-s btn-sm" onClick={() => setShowCreateTicket(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE MAINTENANCE MODAL ==================== */}
      {showCreateMaint && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreateMaint(false); }}>
          <div className="modal" style={{maxWidth:'550px'}}>
            <div className="modal-h"><h2>New Maintenance Schedule</h2><button className="modal-x" onClick={() => setShowCreateMaint(false)}>✕</button></div>
            <form onSubmit={createMaintenance}>
              <div className="modal-b">
                <div className="form-grid">
                  <div className="fg form-full">
                    <label>Contract *</label>
                    <select value={maintForm.contract_id} onChange={e => setMaintForm({...maintForm, contract_id: e.target.value})} required>
                      <option value="">Select contract...</option>
                      {ownerContracts.map(c => <option key={c.id} value={c.id}>{c.plan_name} - {c.listing_title}</option>)}
                    </select>
                  </div>
                  <div className="fg form-full"><label>Title *</label><input value={maintForm.title} onChange={e => setMaintForm({...maintForm, title: e.target.value})} required placeholder="Maintenance task..." /></div>
                  <div className="fg"><label>Frequency *</label>
                    <select value={maintForm.frequency} onChange={e => setMaintForm({...maintForm, frequency: e.target.value})}>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="one_time">One Time</option>
                    </select>
                  </div>
                  <div className="fg"><label>Next Due Date *</label><input type="date" value={maintForm.next_due_date} onChange={e => setMaintForm({...maintForm, next_due_date: e.target.value})} required /></div>
                  <div className="fg form-full"><label>Description</label><textarea value={maintForm.description} onChange={e => setMaintForm({...maintForm, description: e.target.value})} placeholder="Details..." /></div>
                </div>
              </div>
              <div className="modal-f">
                <button type="submit" className="btn btn-p btn-sm">Schedule</button>
                <button type="button" className="btn btn-s btn-sm" onClick={() => setShowCreateMaint(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
