import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

const presets = [
  { label: '💰 Pricing Strategy', q: 'What are the best pricing strategies for rental listings to maximize bookings and revenue?' },
  { label: '📸 Listing Tips', q: 'What are the top 10 tips for creating an attractive rental listing that gets more bookings?' },
  { label: '📊 Market Trends', q: 'What are the current trends in the peer-to-peer rental marketplace industry?' },
  { label: '⚖️ Legal Basics', q: 'What legal considerations should I be aware of when renting out my personal items?' },
  { label: '🛡️ Safety Tips', q: 'How can I protect myself and my items when renting to strangers on a marketplace?' },
  { label: '🚀 Growth Hacks', q: 'What are effective ways to grow as a seller on a rental marketplace platform?' },
];

export default function AIAssistant() {
  const { apiFetch } = useAuth();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [marketCat, setMarketCat] = useState('Electronics');
  const [marketCity, setMarketCity] = useState('');
  const [marketResult, setMarketResult] = useState('');
  const [marketLoading, setMarketLoading] = useState(false);

  const ask = async (question) => {
    const text = question || q;
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/ai/ask', { method: 'POST', body: JSON.stringify({ question: text }) });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || data.error?.message || 'No response. Check OPENROUTER_API_KEY.';
      setResults([{ question: text, answer: content, time: new Date().toLocaleTimeString() }, ...results]);
      setQ('');
    } catch { toast.error('AI request failed'); }
    finally { setLoading(false); }
  };

  const getMarketInsights = async () => {
    setMarketLoading(true); setMarketResult('');
    try {
      const res = await apiFetch('/api/ai/market-insights', { method: 'POST', body: JSON.stringify({ category: marketCat, city: marketCity }) });
      const data = await res.json();
      setMarketResult(data.choices?.[0]?.message?.content || 'No response. Check OPENROUTER_API_KEY.');
    } catch { setMarketResult('AI request failed.'); }
    finally { setMarketLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-head"><h1>🤖 AI Rental Assistant</h1></div>

      <p style={{color:'var(--text-2)',marginBottom:'1.5rem'}}>Get expert advice on pricing, listings, market trends, and rental best practices. Powered by AI via OpenRouter.</p>

      {/* Quick Presets */}
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'1.5rem'}}>
        {presets.map((p, i) => (
          <button key={i} className="btn btn-s btn-sm" onClick={() => ask(p.q)} disabled={loading}>{p.label}</button>
        ))}
      </div>

      {/* Ask Form */}
      <form className="ai-form" onSubmit={e => { e.preventDefault(); ask(); }} style={{marginBottom:'2rem'}}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ask anything about renting, pricing, marketplace strategies..." />
        <button type="submit" className="btn btn-purple" disabled={loading}>{loading ? 'Thinking...' : 'Ask AI'}</button>
      </form>

      {loading && <div className="ai-load"><div className="spinner"></div>AI is thinking...</div>}

      {/* Market Insights Section */}
      <div className="ai-section" style={{marginBottom:'2rem'}}>
        <h2>📊 Market Insights</h2>
        <p style={{color:'var(--text-2)',marginBottom:'1rem',fontSize:'.88rem'}}>Get AI-generated market analysis for a specific category and location.</p>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'1rem'}}>
          <select value={marketCat} onChange={e => setMarketCat(e.target.value)} style={{padding:'8px 12px',background:'var(--bg-0)',border:'1px solid var(--border)',borderRadius:'var(--radius-s)',color:'var(--text-0)',fontFamily:'inherit'}}>
            {['Properties','Vehicles','Electronics','Tools & Equipment','Sports & Outdoor','Event & Party'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input value={marketCity} onChange={e => setMarketCity(e.target.value)} placeholder="City (optional)" style={{padding:'8px 12px',background:'var(--bg-0)',border:'1px solid var(--border)',borderRadius:'var(--radius-s)',color:'var(--text-0)',fontFamily:'inherit',flex:1,minWidth:'150px'}} />
          <button className="btn btn-t btn-sm" onClick={getMarketInsights} disabled={marketLoading}>{marketLoading ? 'Analyzing...' : 'Get Insights'}</button>
        </div>
        {marketLoading && <div className="ai-load"><div className="spinner"></div>Analyzing market...</div>}
        {marketResult && <div className="ai-box"><ReactMarkdown>{marketResult}</ReactMarkdown></div>}
      </div>

      {/* Results History */}
      {results.length > 0 && (
        <div>
          <h2 style={{fontSize:'1.1rem',marginBottom:'1rem'}}>Conversation History</h2>
          {results.map((r, i) => (
            <div key={i} style={{marginBottom:'1.5rem'}}>
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-s)',padding:'.75rem 1rem',marginBottom:'.5rem'}}>
                <span style={{color:'var(--text-3)',fontSize:'.75rem'}}>{r.time}</span>
                <p style={{color:'var(--text-0)',fontWeight:600,marginTop:'.25rem'}}>{r.question}</p>
              </div>
              <div className="ai-box"><ReactMarkdown>{r.answer}</ReactMarkdown></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
