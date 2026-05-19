import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const FIELDS = ['price_per_day', 'category', 'city', 'min_rating', 'item_condition', 'availability'];
const OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains'];

export default function PreferenceRulesEditor() {
  const { apiFetch } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ field: 'price_per_day', op: 'lte', value: '100', label: '' });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/api/custom-views/preference-rules');
      const j = await r.json();
      if (j.ok) setRules(j.rules);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      const r = await apiFetch('/api/custom-views/preference-rules', { method: 'POST', body: JSON.stringify(form) });
      const j = await r.json();
      if (j.ok) { setRules(j.rules); toast.success('Rule added'); setForm({ field: 'price_per_day', op: 'lte', value: '100', label: '' }); }
      else toast.error(j.error || 'Failed');
    } catch (e) { toast.error(e.message); }
  };

  const toggle = async (rule) => {
    try {
      const r = await apiFetch('/api/custom-views/preference-rules', { method: 'PUT', body: JSON.stringify({ id: rule.id, active: !rule.active }) });
      const j = await r.json();
      if (j.ok) setRules(j.rules);
    } catch (e) { toast.error(e.message); }
  };

  const saveEdit = async () => {
    try {
      const r = await apiFetch('/api/custom-views/preference-rules', { method: 'PUT', body: JSON.stringify({ id: editingId, ...editDraft }) });
      const j = await r.json();
      if (j.ok) { setRules(j.rules); toast.success('Updated'); setEditingId(null); }
      else toast.error(j.error || 'Failed');
    } catch (e) { toast.error(e.message); }
  };

  const remove = async (id) => {
    try {
      const r = await apiFetch('/api/custom-views/preference-rules', { method: 'DELETE', body: JSON.stringify({ id }) });
      const j = await r.json();
      if (j.ok) { setRules(j.rules); toast.success('Deleted'); }
      else toast.error(j.error || 'Failed');
    } catch (e) { toast.error(e.message); }
  };

  const cellStyle = { padding: '8px 10px', color: '#cbd5e1', fontSize: 13, borderBottom: '1px solid #1e293b' };
  const headStyle = { padding: '8px 10px', color: '#94a3b8', fontSize: 12, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5 };
  const inputStyle = { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' };

  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: 18 }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ color: '#f1f5f9', margin: 0 }}>Preference Rules Editor</h3>
        <div style={{ color: '#94a3b8', fontSize: 13 }}>Create rules to personalize recommendations and Browse filtering.</div>
      </div>

      <form onSubmit={create} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <select value={form.field} onChange={e => setForm({ ...form, field: e.target.value })} style={inputStyle}>
          {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={form.op} onChange={e => setForm({ ...form, op: e.target.value })} style={inputStyle}>
          {OPS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <input placeholder="Value" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} style={{ ...inputStyle, minWidth: 120 }} />
        <input placeholder="Label (optional)" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} style={{ ...inputStyle, minWidth: 160 }} />
        <button type="submit" style={{ background: '#6366f1', color: '#fff', border: 0, borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>Add Rule</button>
      </form>

      {loading && <div style={{ color: '#94a3b8' }}>Loading...</div>}
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#020617' }}>
            <th style={headStyle}>Label</th>
            <th style={headStyle}>Field</th>
            <th style={headStyle}>Op</th>
            <th style={headStyle}>Value</th>
            <th style={headStyle}>Active</th>
            <th style={headStyle}>Actions</th>
          </tr></thead>
          <tbody>
            {rules.length === 0 && !loading && (
              <tr><td colSpan="6" style={{ ...cellStyle, textAlign: 'center', color: '#64748b' }}>No rules yet. Add one above.</td></tr>
            )}
            {rules.map(r => editingId === r.id ? (
              <tr key={r.id}>
                <td style={cellStyle}><input value={editDraft.label ?? r.label} onChange={e => setEditDraft({ ...editDraft, label: e.target.value })} style={inputStyle} /></td>
                <td style={cellStyle}>
                  <select value={editDraft.field ?? r.field} onChange={e => setEditDraft({ ...editDraft, field: e.target.value })} style={inputStyle}>
                    {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </td>
                <td style={cellStyle}>
                  <select value={editDraft.op ?? r.op} onChange={e => setEditDraft({ ...editDraft, op: e.target.value })} style={inputStyle}>
                    {OPS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td style={cellStyle}><input value={editDraft.value ?? r.value} onChange={e => setEditDraft({ ...editDraft, value: e.target.value })} style={inputStyle} /></td>
                <td style={cellStyle}>{r.active ? 'yes' : 'no'}</td>
                <td style={cellStyle}>
                  <button onClick={saveEdit} style={{ background: '#10b981', color: '#fff', border: 0, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginRight: 6 }}>Save</button>
                  <button onClick={() => { setEditingId(null); setEditDraft({}); }} style={{ background: '#334155', color: '#fff', border: 0, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={r.id}>
                <td style={cellStyle}>{r.label}</td>
                <td style={cellStyle}>{r.field}</td>
                <td style={cellStyle}><code style={{ color: '#a5b4fc' }}>{r.op}</code></td>
                <td style={cellStyle}>{r.value}</td>
                <td style={cellStyle}>
                  <button onClick={() => toggle(r)} style={{ background: r.active ? '#10b981' : '#475569', color: '#fff', border: 0, borderRadius: 999, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>
                    {r.active ? 'Active' : 'Off'}
                  </button>
                </td>
                <td style={cellStyle}>
                  <button onClick={() => { setEditingId(r.id); setEditDraft({}); }} style={{ background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginRight: 6 }}>Edit</button>
                  <button onClick={() => remove(r.id)} style={{ background: '#7f1d1d', color: '#fff', border: 0, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
