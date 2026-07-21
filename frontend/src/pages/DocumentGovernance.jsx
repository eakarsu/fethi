import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const today = new Date().toISOString().slice(0, 10);

export default function DocumentGovernance() {
  const { apiFetch } = useAuth();
  const [matters, setMatters] = useState([]);
  const [matter, setMatter] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [document, setDocument] = useState(null);
  const [matterForm, setMatterForm] = useState({ name: '', jurisdiction: '', retentionUntil: '' });
  const [docForm, setDocForm] = useState({ title: '', kind: 'contract', content: '', sourceType: 'manual', modelName: '', promptVersion: '', privileged: false });
  const [reviewForm, setReviewForm] = useState({ decision: 'approved', effectiveDate: today, notes: '' });
  const [redactionTerms, setRedactionTerms] = useState('');

  const json = async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const loadMatters = async () => {
    try {
      const data = await json(await apiFetch('/api/documents/matters'));
      setMatters(data);
      if (matter) setMatter(data.find((item) => item.id === matter.id) || null);
    } catch (error) { toast.error(error.message); }
  };

  const loadDocuments = async (selectedMatter = matter) => {
    if (!selectedMatter) return;
    try {
      const data = await json(await apiFetch(`/api/documents/matters/${selectedMatter.id}/documents`));
      setDocuments(data);
      if (document) {
        const match = data.find((item) => item.id === document.id);
        if (match) await loadDocument(match.id);
      }
    } catch (error) { toast.error(error.message); }
  };

  const loadDocument = async (id) => {
    try { setDocument(await json(await apiFetch(`/api/documents/documents/${id}`))); }
    catch (error) { toast.error(error.message); }
  };

  useEffect(() => { loadMatters(); }, []);

  const createMatter = async (event) => {
    event.preventDefault();
    try {
      const created = await json(await apiFetch('/api/documents/matters', {
        method: 'POST',
        body: JSON.stringify({ ...matterForm, retentionUntil: matterForm.retentionUntil || null }),
      }));
      setMatterForm({ name: '', jurisdiction: '', retentionUntil: '' });
      await loadMatters();
      setMatter({ ...created, role: 'owner' });
      setDocuments([]);
      toast.success('Matter created');
    } catch (error) { toast.error(error.message); }
  };

  const selectMatter = async (selected) => {
    setMatter(selected); setDocument(null); setDocuments([]);
    await loadDocuments(selected);
  };

  const createDocument = async (event) => {
    event.preventDefault();
    try {
      await json(await apiFetch(`/api/documents/matters/${matter.id}/documents`, {
        method: 'POST', body: JSON.stringify(docForm),
      }));
      setDocForm({ title: '', kind: 'contract', content: '', sourceType: 'manual', modelName: '', promptVersion: '', privileged: false });
      await loadDocuments();
      toast.success('Immutable version 1 created');
    } catch (error) { toast.error(error.message); }
  };

  const redactCurrent = async () => {
    try {
      await json(await apiFetch(`/api/documents/documents/${document.id}/redactions`, {
        method: 'POST', body: JSON.stringify({ terms: redactionTerms.split(',').map((term) => term.trim()).filter(Boolean) }),
      }));
      setRedactionTerms(''); await loadDocuments(); toast.success('Redacted version created');
    } catch (error) { toast.error(error.message); }
  };

  const reviewCurrent = async (event) => {
    event.preventDefault();
    try {
      await json(await apiFetch(`/api/documents/documents/${document.id}/reviews`, {
        method: 'POST', body: JSON.stringify({
          ...reviewForm, version: Number(document.current_version), jurisdiction: matter.jurisdiction,
        }),
      }));
      setReviewForm({ decision: 'approved', effectiveDate: today, notes: '' });
      await loadDocuments(); toast.success('Human review recorded');
    } catch (error) { toast.error(error.message); }
  };

  const exportCurrent = async () => {
    try {
      const bundle = await json(await apiFetch(`/api/documents/documents/${document.id}/export`, { method: 'POST' }));
      const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
      const link = window.document.createElement('a');
      link.href = url; link.download = `document-${document.id}-v${document.current_version}.json`; link.click();
      URL.revokeObjectURL(url);
      await loadDocument(document.id);
    } catch (error) { toast.error(error.message); }
  };

  const canEdit = matter && ['editor', 'counsel', 'owner'].includes(matter.role);
  const canReview = matter && ['counsel', 'owner'].includes(matter.role);

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Governed Documents</h1><p>Versioned contracts, claims, filings, and tax records with scoped access and audit evidence.</p></div>
      </div>

      <div className="analytics-card" style={{ marginBottom: 16 }}>
        <h3>Create matter</h3>
        <form className="form-grid" onSubmit={createMatter}>
          <div className="fg"><label>Name</label><input required value={matterForm.name} onChange={(event) => setMatterForm({ ...matterForm, name: event.target.value })} /></div>
          <div className="fg"><label>Jurisdiction</label><input required placeholder="NY-US" value={matterForm.jurisdiction} onChange={(event) => setMatterForm({ ...matterForm, jurisdiction: event.target.value })} /></div>
          <div className="fg"><label>Retain until</label><input type="date" value={matterForm.retentionUntil} onChange={(event) => setMatterForm({ ...matterForm, retentionUntil: event.target.value })} /></div>
          <div className="fg" style={{ justifyContent: 'end' }}><button className="btn btn-p" type="submit">Create matter</button></div>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, .7fr) minmax(360px, 1.3fr)', gap: 16 }}>
        <div className="analytics-card">
          <h3>My matters</h3>
          {matters.length === 0 && <p>No matters yet.</p>}
          {matters.map((item) => (
            <button key={item.id} className={`btn ${matter?.id === item.id ? 'btn-p' : 'btn-s'}`} style={{ width: '100%', marginTop: 8, textAlign: 'left' }} onClick={() => selectMatter(item)}>
              {item.name}<br /><small>{item.jurisdiction} · {item.role}</small>
            </button>
          ))}
        </div>

        <div>
          {matter && canEdit && (
            <div className="analytics-card" style={{ marginBottom: 16 }}>
              <h3>New document in {matter.name}</h3>
              <form onSubmit={createDocument}>
                <div className="form-grid">
                  <div className="fg"><label>Title</label><input required value={docForm.title} onChange={(event) => setDocForm({ ...docForm, title: event.target.value })} /></div>
                  <div className="fg"><label>Kind</label><select value={docForm.kind} onChange={(event) => setDocForm({ ...docForm, kind: event.target.value })}>{['contract', 'tax', 'claim', 'dispute', 'filing', 'other'].map((kind) => <option key={kind}>{kind}</option>)}</select></div>
                  <div className="fg"><label>Source</label><select value={docForm.sourceType} onChange={(event) => setDocForm({ ...docForm, sourceType: event.target.value })}><option value="manual">Manual</option><option value="generated">Generated draft</option></select></div>
                  <label className="filter-checkbox"><input type="checkbox" checked={docForm.privileged} onChange={(event) => setDocForm({ ...docForm, privileged: event.target.checked })} /> Privileged</label>
                  {docForm.sourceType === 'generated' && <><div className="fg"><label>Model</label><input required value={docForm.modelName} onChange={(event) => setDocForm({ ...docForm, modelName: event.target.value })} /></div><div className="fg"><label>Prompt version</label><input required value={docForm.promptVersion} onChange={(event) => setDocForm({ ...docForm, promptVersion: event.target.value })} /></div></>}
                  <div className="fg form-full"><label>Content</label><textarea required rows="8" value={docForm.content} onChange={(event) => setDocForm({ ...docForm, content: event.target.value })} /></div>
                </div>
                <button className="btn btn-p" type="submit">Create immutable version</button>
              </form>
            </div>
          )}

          {matter && <div className="analytics-card">
            <h3>Documents</h3>
            {documents.map((item) => <button key={item.id} className={`btn ${document?.id === item.id ? 'btn-p' : 'btn-s'} btn-sm`} style={{ margin: '8px 8px 0 0' }} onClick={() => loadDocument(item.id)}>{item.title} · v{item.current_version} · {item.status}</button>)}
            {documents.length === 0 && <p>No accessible documents.</p>}
          </div>}

          {document && <div className="analytics-card" style={{ marginTop: 16 }}>
            <h3>{document.title}</h3>
            <p><strong>Status:</strong> {document.status} · <strong>Version:</strong> {document.current_version} · <strong>Jurisdiction:</strong> {document.matter_jurisdiction}</p>
            <p>Provenance hash: <code>{document.versions?.[0]?.content_sha256}</code></p>
            <button className="btn btn-s btn-sm" onClick={exportCurrent}>Export evidence bundle</button>
            {canEdit && <div className="form-grid" style={{ marginTop: 16 }}><div className="fg"><label>Exact redaction terms (comma-separated)</label><input value={redactionTerms} onChange={(event) => setRedactionTerms(event.target.value)} /></div><div className="fg" style={{ justifyContent: 'end' }}><button className="btn btn-o" type="button" onClick={redactCurrent}>Create redacted version</button></div></div>}
            {canReview && <form onSubmit={reviewCurrent} style={{ marginTop: 16 }}><h4>Human review</h4><div className="form-grid"><div className="fg"><label>Decision</label><select value={reviewForm.decision} onChange={(event) => setReviewForm({ ...reviewForm, decision: event.target.value })}><option value="approved">Approve</option><option value="changes_requested">Request changes</option></select></div><div className="fg"><label>Effective date</label><input type="date" required value={reviewForm.effectiveDate} onChange={(event) => setReviewForm({ ...reviewForm, effectiveDate: event.target.value })} /></div><div className="fg form-full"><label>Legal review notes</label><textarea required value={reviewForm.notes} onChange={(event) => setReviewForm({ ...reviewForm, notes: event.target.value })} /></div></div><button className="btn btn-g" type="submit">Record review</button></form>}
          </div>}
        </div>
      </div>
    </div>
  );
}
