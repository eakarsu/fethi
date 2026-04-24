import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

const catOptions = ['Properties', 'Vehicles', 'Electronics', 'Tools & Equipment', 'Sports & Outdoor', 'Event & Party'];
const condOptions = ['New', 'Excellent', 'Good', 'Fair'];

const emptyForm = { title: '', description: '', category: '', subcategory: '', price_per_day: '', price_per_week: '', price_per_month: '', location: '', city: '', item_condition: 'Good', features: '', rules: '', image_url: '' };

export default function MyListings() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [fd, setFd] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Plans state
  const [plans, setPlans] = useState([]);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [planFd, setPlanFd] = useState({ plan_name: '', monthly_price: '', includes_maintenance: false, includes_repair: false, includes_parts: false, includes_inspection: false, includes_priority_support: false, max_service_requests: 5, response_time_hours: 48, contract_duration_months: 3, description: '' });

  const load = () => apiFetch('/api/listings/mine').then(r => r.json()).then(setItems).catch(() => toast.error('Failed to load'));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEdit(null); setFd({ ...emptyForm }); setForm(true); };
  const openEdit = (item) => {
    setEdit(item);
    const d = {};
    Object.keys(emptyForm).forEach(k => { d[k] = item[k] || ''; });
    setFd(d);
    setSel(null); setForm(true);
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = edit ? `/api/listings/${edit.id}` : '/api/listings';
      const method = edit ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(fd) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(edit ? 'Updated!' : 'Created!');
      setForm(false); load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const del = async (item) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      await apiFetch(`/api/listings/${item.id}`, { method: 'DELETE' });
      toast.success('Deleted'); setSel(null); load();
    } catch { toast.error('Delete failed'); }
  };

  const loadPlans = (listingId) => {
    apiFetch(`/api/subscriptions/plans/listing/${listingId}`).then(r => r.json()).then(setPlans).catch(() => setPlans([]));
  };

  const openPlanCreate = () => {
    setEditPlan(null);
    setPlanFd({ plan_name: '', monthly_price: '', includes_maintenance: false, includes_repair: false, includes_parts: false, includes_inspection: false, includes_priority_support: false, max_service_requests: 5, response_time_hours: 48, contract_duration_months: 3, description: '' });
    setShowPlanForm(true);
  };

  const openPlanEdit = (plan) => {
    setEditPlan(plan);
    setPlanFd({ plan_name: plan.plan_name, monthly_price: plan.monthly_price, includes_maintenance: plan.includes_maintenance, includes_repair: plan.includes_repair, includes_parts: plan.includes_parts, includes_inspection: plan.includes_inspection, includes_priority_support: plan.includes_priority_support, max_service_requests: plan.max_service_requests, response_time_hours: plan.response_time_hours, contract_duration_months: plan.contract_duration_months, description: plan.description || '' });
    setShowPlanForm(true);
  };

  const savePlan = async (e) => {
    e.preventDefault();
    try {
      const url = editPlan ? `/api/subscriptions/plans/${editPlan.id}` : '/api/subscriptions/plans';
      const method = editPlan ? 'PUT' : 'POST';
      const body = editPlan ? planFd : { ...planFd, listing_id: sel.id };
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(editPlan ? 'Plan updated!' : 'Plan created!');
      setShowPlanForm(false);
      loadPlans(sel.id);
    } catch (err) { toast.error(err.message); }
  };

  const delPlan = async (planId) => {
    if (!confirm('Delete this plan?')) return;
    try {
      await apiFetch(`/api/subscriptions/plans/${planId}`, { method: 'DELETE' });
      toast.success('Plan deleted');
      loadPlans(sel.id);
    } catch { toast.error('Failed to delete plan'); }
  };

  const suggestPrice = async () => {
    setAiLoading(true); setAiResult('');
    try {
      const res = await apiFetch('/api/ai/suggest-price', { method: 'POST', body: JSON.stringify(fd) });
      const data = await res.json();
      setAiResult(data.choices?.[0]?.message?.content || 'No response. Check OPENROUTER_API_KEY.');
    } catch { setAiResult('AI request failed.'); }
    finally { setAiLoading(false); }
  };

  const genDesc = async () => {
    setAiLoading(true); setAiResult('');
    try {
      const res = await apiFetch('/api/ai/generate-description', { method: 'POST', body: JSON.stringify(fd) });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) { setFd({ ...fd, description: content }); setAiResult('Description generated and applied!'); }
      else { setAiResult('No response. Check OPENROUTER_API_KEY.'); }
    } catch { setAiResult('AI request failed.'); }
    finally { setAiLoading(false); }
  };

  const renderStars = (r) => '★'.repeat(Math.round(r || 0)) + '☆'.repeat(5 - Math.round(r || 0));

  return (
    <div className="page">
      <div className="page-head">
        <h1>My Listings</h1>
        <button className="btn btn-p" onClick={openCreate}>+ New Listing</button>
      </div>

      {items.length === 0 ? (
        <div className="empty"><div className="ei">📦</div><h3>No listings yet</h3><p>Create your first listing to start renting!</p></div>
      ) : (
        <div className="grid">
          {items.map(item => (
            <div key={item.id} className="card" onClick={() => { setSel(item); setAiResult(''); loadPlans(item.id); setShowPlanForm(false); }}>
              <div className="card-top">
                <h4>{item.title}</h4>
                <span className={`badge ${item.availability_status === 'available' ? 'badge-green' : 'badge-red'}`}>{item.availability_status}</span>
              </div>
              <div className="card-desc">{item.description}</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'.5rem'}}>
                <span className="price-tag">${item.price_per_day}/day</span>
                <span className="stars">{renderStars(item.rating)} ({item.review_count})</span>
              </div>
              <div className="card-meta">
                <span className="tag">📍 {item.city}</span>
                <span className="tag">{item.category}</span>
                <span className="tag">👁 {item.views}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {sel && !form && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
          <div className="modal">
            <div className="modal-h"><h2>{sel.title}</h2><button className="modal-x" onClick={() => setSel(null)}>✕</button></div>
            <div className="modal-b">
              <div className="detail-grid">
                <div className="detail-f"><label>Category</label><div className="val">{sel.category}</div></div>
                <div className="detail-f"><label>Price/Day</label><div className="val price-tag">${sel.price_per_day}</div></div>
                {sel.price_per_week && <div className="detail-f"><label>Price/Week</label><div className="val">${sel.price_per_week}</div></div>}
                {sel.price_per_month && <div className="detail-f"><label>Price/Month</label><div className="val">${sel.price_per_month}</div></div>}
                <div className="detail-f"><label>Location</label><div className="val">{sel.location}, {sel.city}</div></div>
                <div className="detail-f"><label>Condition</label><div className="val">{sel.item_condition}</div></div>
                <div className="detail-f"><label>Status</label><div className="val">{sel.availability_status}</div></div>
                <div className="detail-f"><label>Views</label><div className="val">{sel.views}</div></div>
              </div>
              {sel.description && <div className="detail-f" style={{marginBottom:'.75rem'}}><label>Description</label><div className="val">{sel.description}</div></div>}
              {sel.features && <div className="detail-f" style={{marginBottom:'.75rem'}}><label>Features</label><div className="val">{sel.features}</div></div>}
              {sel.rules && <div className="detail-f" style={{marginBottom:'.75rem'}}><label>Rules</label><div className="val">{sel.rules}</div></div>}

              {/* Subscription Plans Management */}
              <div className="plans-section">
                <h4>Service Plans <button className="btn btn-p btn-sm" style={{marginLeft:'auto'}} onClick={openPlanCreate}>+ Add Plan</button></h4>
                {plans.length === 0 ? (
                  <p style={{color:'var(--text-3)', fontSize:'.85rem'}}>No plans yet. Add service plans to offer maintenance and support.</p>
                ) : (
                  <div className="plan-manage-list">
                    {plans.map(p => (
                      <div key={p.id} className="plan-manage-item">
                        <div className="plan-manage-info">
                          <div className="plan-manage-name">{p.plan_name}</div>
                          <div className="plan-manage-price">${p.monthly_price}/mo</div>
                          <div style={{fontSize:'.72rem', color:'var(--text-3)', marginTop:'2px'}}>
                            {[p.includes_maintenance && 'Maintenance', p.includes_repair && 'Repair', p.includes_parts && 'Parts', p.includes_inspection && 'Inspection', p.includes_priority_support && 'Priority'].filter(Boolean).join(', ')}
                          </div>
                        </div>
                        <button className="btn btn-s btn-sm" onClick={() => openPlanEdit(p)}>Edit</button>
                        <button className="btn btn-d btn-sm" onClick={() => delPlan(p.id)}>Delete</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Plan Form */}
                {showPlanForm && (
                  <form onSubmit={savePlan} style={{marginTop:'1rem', background:'var(--bg-0)', border:'1px solid var(--teal)', borderRadius:'var(--radius)', padding:'1rem'}}>
                    <h4 style={{fontSize:'.9rem', color:'var(--teal)', marginBottom:'.75rem'}}>{editPlan ? 'Edit Plan' : 'New Plan'}</h4>
                    <div className="form-grid">
                      <div className="fg"><label>Plan Name *</label><input value={planFd.plan_name} onChange={e => setPlanFd({...planFd, plan_name: e.target.value})} required placeholder="e.g. Basic, Standard, Premium" /></div>
                      <div className="fg"><label>Monthly Price ($) *</label><input type="number" step="0.01" value={planFd.monthly_price} onChange={e => setPlanFd({...planFd, monthly_price: e.target.value})} required /></div>
                      <div className="fg"><label>Max Requests</label><input type="number" value={planFd.max_service_requests} onChange={e => setPlanFd({...planFd, max_service_requests: parseInt(e.target.value) || 5})} /></div>
                      <div className="fg"><label>Response Time (hours)</label><input type="number" value={planFd.response_time_hours} onChange={e => setPlanFd({...planFd, response_time_hours: parseInt(e.target.value) || 48})} /></div>
                      <div className="fg"><label>Duration (months)</label><input type="number" value={planFd.contract_duration_months} onChange={e => setPlanFd({...planFd, contract_duration_months: parseInt(e.target.value) || 3})} /></div>
                      <div className="fg form-full"><label>Description</label><textarea value={planFd.description} onChange={e => setPlanFd({...planFd, description: e.target.value})} placeholder="Describe what this plan covers..." /></div>
                    </div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:'12px', marginTop:'.5rem', marginBottom:'.75rem'}}>
                      <label className="filter-checkbox"><input type="checkbox" checked={planFd.includes_maintenance} onChange={e => setPlanFd({...planFd, includes_maintenance: e.target.checked})} /> Maintenance</label>
                      <label className="filter-checkbox"><input type="checkbox" checked={planFd.includes_repair} onChange={e => setPlanFd({...planFd, includes_repair: e.target.checked})} /> Repair</label>
                      <label className="filter-checkbox"><input type="checkbox" checked={planFd.includes_parts} onChange={e => setPlanFd({...planFd, includes_parts: e.target.checked})} /> Parts</label>
                      <label className="filter-checkbox"><input type="checkbox" checked={planFd.includes_inspection} onChange={e => setPlanFd({...planFd, includes_inspection: e.target.checked})} /> Inspection</label>
                      <label className="filter-checkbox"><input type="checkbox" checked={planFd.includes_priority_support} onChange={e => setPlanFd({...planFd, includes_priority_support: e.target.checked})} /> Priority Support</label>
                    </div>
                    <div style={{display:'flex', gap:'8px'}}>
                      <button type="submit" className="btn btn-g btn-sm">{editPlan ? 'Update' : 'Create'}</button>
                      <button type="button" className="btn btn-s btn-sm" onClick={() => setShowPlanForm(false)}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
            <div className="modal-f">
              <button className="btn btn-g btn-sm" onClick={() => openEdit(sel)}>✏ Edit</button>
              <button className="btn btn-d btn-sm" onClick={() => del(sel)}>🗑 Delete</button>
              <div style={{flex:1}} />
              <button className="btn btn-s btn-sm" onClick={() => setSel(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {form && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setForm(false); }}>
          <div className="modal">
            <div className="modal-h"><h2>{edit ? 'Edit Listing' : 'New Listing'}</h2><button className="modal-x" onClick={() => setForm(false)}>✕</button></div>
            <form onSubmit={save}>
              <div className="modal-b">
                <div className="form-grid">
                  <div className="fg"><label>Title *</label><input value={fd.title} onChange={e=>setFd({...fd,title:e.target.value})} required placeholder="What are you renting?" /></div>
                  <div className="fg"><label>Category *</label><select value={fd.category} onChange={e=>setFd({...fd,category:e.target.value})} required><option value="">Select...</option>{catOptions.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                  <div className="fg"><label>Subcategory</label><input value={fd.subcategory} onChange={e=>setFd({...fd,subcategory:e.target.value})} placeholder="e.g. Apartment, Camera" /></div>
                  <div className="fg"><label>Price/Day ($) *</label><input type="number" step="0.01" value={fd.price_per_day} onChange={e=>setFd({...fd,price_per_day:e.target.value})} required /></div>
                  <div className="fg"><label>Price/Week ($)</label><input type="number" step="0.01" value={fd.price_per_week} onChange={e=>setFd({...fd,price_per_week:e.target.value})} /></div>
                  <div className="fg"><label>Price/Month ($)</label><input type="number" step="0.01" value={fd.price_per_month} onChange={e=>setFd({...fd,price_per_month:e.target.value})} /></div>
                  <div className="fg"><label>Location</label><input value={fd.location} onChange={e=>setFd({...fd,location:e.target.value})} placeholder="Address or area" /></div>
                  <div className="fg"><label>City</label><input value={fd.city} onChange={e=>setFd({...fd,city:e.target.value})} placeholder="City" /></div>
                  <div className="fg"><label>Condition</label><select value={fd.item_condition} onChange={e=>setFd({...fd,item_condition:e.target.value})}>{condOptions.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                  <div className="fg form-full"><label>Features</label><textarea value={fd.features} onChange={e=>setFd({...fd,features:e.target.value})} placeholder="List key features..." /></div>
                  <div className="fg form-full"><label>Description</label><textarea value={fd.description} onChange={e=>setFd({...fd,description:e.target.value})} placeholder="Detailed description..." style={{minHeight:'100px'}} /></div>
                  <div className="fg form-full"><label>Rules</label><textarea value={fd.rules} onChange={e=>setFd({...fd,rules:e.target.value})} placeholder="Rental rules and conditions..." /></div>
                </div>

                <div style={{display:'flex',gap:'8px',marginTop:'1rem',flexWrap:'wrap'}}>
                  <button type="button" className="btn btn-purple btn-sm" onClick={suggestPrice} disabled={aiLoading}>🤖 AI Price Suggestion</button>
                  <button type="button" className="btn btn-t btn-sm" onClick={genDesc} disabled={aiLoading}>🤖 AI Generate Description</button>
                </div>
                {aiLoading && <div className="ai-load"><div className="spinner"></div>AI working...</div>}
                {aiResult && <div className="ai-box" style={{marginTop:'.75rem'}}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
              </div>
              <div className="modal-f">
                <button type="submit" className="btn btn-p btn-sm" disabled={saving}>{saving ? 'Saving...' : edit ? 'Update' : 'Create'}</button>
                <button type="button" className="btn btn-s btn-sm" onClick={() => setForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
