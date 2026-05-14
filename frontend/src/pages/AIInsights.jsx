import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const tabs = [
  { value: 'booking', label: '📈 Booking Success', endpoint: '/api/ai/predict-booking-success' },
  { value: 'reliability', label: '🛡️ Host Reliability', endpoint: '/api/ai/host-reliability' },
  { value: 'respond', label: '💬 Auto-Respond', endpoint: '/api/ai/auto-respond' },
];

function safeJSONParse(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return undefined;
  return JSON.parse(trimmed);
}

export default function AIInsights() {
  const { apiFetch } = useAuth();
  const [tab, setTab] = useState('booking');

  // booking-success state
  const [listing, setListing] = useState('');
  const [recentInquiries, setRecentInquiries] = useState('');
  const [market, setMarket] = useState('');
  const [period, setPeriod] = useState('');

  // reliability state
  const [host, setHost] = useState('');
  const [recentBookings, setRecentBookings] = useState('');
  const [reviews, setReviews] = useState('');
  const [disputes, setDisputes] = useState('');

  // auto-respond state
  const [respondListing, setRespondListing] = useState('');
  const [inquiry, setInquiry] = useState('');
  const [hostStyle, setHostStyle] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const activeTab = tabs.find((t) => t.value === tab);

  const reset = () => {
    setError('');
    setResult(null);
  };

  const switchTab = (v) => {
    setTab(v);
    reset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    reset();

    let payload = {};
    try {
      if (tab === 'booking') {
        if (!listing.trim()) {
          setError('Listing details are required (JSON or description).');
          return;
        }
        const parsedListing = listing.trim().startsWith('{')
          ? safeJSONParse(listing)
          : { description: listing.trim() };
        payload = { listing: parsedListing };
        const ri = safeJSONParse(recentInquiries);
        if (ri !== undefined) payload.recentInquiries = ri;
        const m = safeJSONParse(market);
        if (m !== undefined) payload.market = m;
        if (period.trim()) payload.period = period.trim();
      } else if (tab === 'reliability') {
        if (!host.trim()) {
          setError('Host details are required.');
          return;
        }
        const parsedHost = host.trim().startsWith('{')
          ? safeJSONParse(host)
          : { description: host.trim() };
        payload = { host: parsedHost };
        const rb = safeJSONParse(recentBookings);
        if (rb !== undefined) payload.recentBookings = rb;
        const rv = safeJSONParse(reviews);
        if (rv !== undefined) payload.reviews = rv;
        const dp = safeJSONParse(disputes);
        if (dp !== undefined) payload.disputes = dp;
      } else if (tab === 'respond') {
        if (!inquiry.trim()) {
          setError('Inquiry text is required.');
          return;
        }
        payload = { inquiry: inquiry.trim() };
        if (respondListing.trim()) {
          payload.listing = respondListing.trim().startsWith('{')
            ? safeJSONParse(respondListing)
            : { description: respondListing.trim() };
        }
        if (hostStyle.trim()) payload.hostStyle = hostStyle.trim();
      }
    } catch (parseErr) {
      setError('Could not parse JSON input: ' + (parseErr.message || 'invalid JSON'));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(activeTab.endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || 'Request failed.');
      } else {
        setResult(data);
      }
    } catch (err) {
      toast.error('AI request failed');
      setError(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>🧠 AI Insights</h1>
      </div>

      <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>
        Predict booking success, score host reliability, and draft inquiry replies. Powered by AI via OpenRouter.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`btn btn-sm ${t.value === tab ? 'btn-p' : 'btn-s'}`}
            onClick={() => switchTab(t.value)}
            disabled={loading}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {/* Form */}
        <form
          className="ai-form"
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'var(--bg-2)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-s)',
            border: '1px solid var(--border)',
          }}
        >
          {tab === 'booking' && (
            <>
              <Field
                label="Listing"
                value={listing}
                onChange={setListing}
                placeholder='Plain description, or JSON like {"id":1,"title":"Beach house","price":120}'
                rows={4}
                disabled={loading}
                required
              />
              <Field
                label="Recent inquiries (JSON, optional)"
                value={recentInquiries}
                onChange={setRecentInquiries}
                placeholder='[{"date":"2026-04-10","status":"booked"}]'
                rows={3}
                disabled={loading}
              />
              <Field label="Market (JSON, optional)" value={market} onChange={setMarket} placeholder='{"city":"Istanbul","season":"summer"}' rows={2} disabled={loading} />
              <Field label="Period (optional)" value={period} onChange={setPeriod} placeholder="next-30-days" disabled={loading} />
            </>
          )}

          {tab === 'reliability' && (
            <>
              <Field
                label="Host"
                value={host}
                onChange={setHost}
                placeholder='Description, or JSON like {"id":42,"name":"Ada","since":"2022"}'
                rows={3}
                disabled={loading}
                required
              />
              <Field label="Recent bookings (JSON, optional)" value={recentBookings} onChange={setRecentBookings} placeholder='[{"date":"2026-03-01","completed":true}]' rows={3} disabled={loading} />
              <Field label="Reviews (JSON, optional)" value={reviews} onChange={setReviews} placeholder='[{"rating":5,"text":"Great host"}]' rows={3} disabled={loading} />
              <Field label="Disputes (JSON, optional)" value={disputes} onChange={setDisputes} placeholder='[{"type":"refund","resolved":true}]' rows={2} disabled={loading} />
            </>
          )}

          {tab === 'respond' && (
            <>
              <Field
                label="Inquiry message"
                value={inquiry}
                onChange={setInquiry}
                placeholder="Hi, is the camera available next weekend?"
                rows={4}
                disabled={loading}
                required
              />
              <Field
                label="Listing (optional)"
                value={respondListing}
                onChange={setRespondListing}
                placeholder='Description or JSON {"title":"Sony A7","price":35}'
                rows={2}
                disabled={loading}
              />
              <Field label="Host tone / style (optional)" value={hostStyle} onChange={setHostStyle} placeholder="friendly, concise" disabled={loading} />
            </>
          )}

          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,.1)',
                border: '1px solid var(--red)',
                color: 'var(--red)',
                padding: '.6rem .8rem',
                borderRadius: 'var(--radius-s)',
                fontSize: '.86rem',
              }}
            >
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-purple" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? 'Working...' : `Run ${activeTab?.label || ''}`}
          </button>
        </form>

        {/* Result */}
        <div
          style={{
            background: 'var(--bg-2)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-s)',
            border: '1px solid var(--border)',
            minHeight: '200px',
          }}
        >
          <h2 style={{ fontSize: '1rem', marginBottom: '.75rem', color: 'var(--text-0)' }}>Result</h2>
          {loading && (
            <div className="ai-load">
              <div className="spinner"></div>
              AI is thinking...
            </div>
          )}
          {!loading && !result && !error && (
            <p style={{ color: 'var(--text-3)', fontSize: '.88rem' }}>Submit the form to see AI-generated insights.</p>
          )}
          {!loading && result && (
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '.78rem',
                background: 'var(--bg-1)',
                padding: '.85rem',
                borderRadius: 'var(--radius-s)',
                border: '1px solid var(--border)',
                color: 'var(--text-1)',
                maxHeight: '600px',
                overflowY: 'auto',
              }}
            >
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, placeholder, rows, required }) {
  const isMultiline = !!rows && rows > 1;
  return (
    <div>
      <label style={{ display: 'block', fontSize: '.82rem', color: 'var(--text-2)', marginBottom: '.35rem', fontWeight: 500 }}>
        {label}
        {required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      {isMultiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--bg-0)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-s)',
            color: 'var(--text-0)',
            fontFamily: 'inherit',
            fontSize: '.85rem',
            resize: 'vertical',
          }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--bg-0)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-s)',
            color: 'var(--text-0)',
            fontFamily: 'inherit',
            fontSize: '.85rem',
          }}
        />
      )}
    </div>
  );
}
