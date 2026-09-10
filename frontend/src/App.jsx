import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:5000/api/applications';

const STATUS_OPTIONS = ['applied', 'interview', 'offer', 'rejected'];

function App() {
  const [apps, setApps] = useState([]);
  const [form, setForm] = useState({ company: '', role: '', job_description: '' });
  const [expanded, setExpanded] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  const fetchApps = async () => {
    const res = await axios.get(API);
    setApps(res.data);
  };

  useEffect(() => { fetchApps(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await axios.post(API, form);
    setForm({ company: '', role: '', job_description: '' });
    await fetchApps();
    setSubmitting(false);
  };

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateStatus = async (id, status) => {
    await axios.patch(`${API}/${id}`, { status });
    fetchApps();
  };

  const counts = {
    total: apps.length,
    interview: apps.filter(a => a.status === 'interview').length,
    offer: apps.filter(a => a.status === 'offer').length,
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="page">
      <header className="header">
        <h1>Job hunt log</h1>
        <p className="subtitle">Tracking every application, one entry at a time.</p>
      </header>

      <form className="entry-form" onSubmit={handleSubmit}>
        <div className="field-row">
          <label className="field">
            <span>Company</span>
            <input
              value={form.company}
              onChange={e => setForm({ ...form, company: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Role</span>
            <input
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              required
            />
          </label>
        </div>
        <label className="field">
          <span>Job description</span>
          <textarea
            rows={3}
            value={form.job_description}
            onChange={e => setForm({ ...form, job_description: e.target.value })}
            placeholder="Paste the posting here for an AI fit read..."
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add entry →'}
        </button>
      </form>

      <div className="stats">
        {counts.total} entries · {counts.interview} interview{counts.interview !== 1 ? 's' : ''} · {counts.offer} offer{counts.offer !== 1 ? 's' : ''}
      </div>

      <div className="log">
        {apps.length === 0 && (
          <p className="empty">No entries yet. Add your first application above.</p>
        )}
        {apps.map(app => (
          <div className="entry" key={app.id}>
            <div className="entry-row" onClick={() => toggleExpand(app.id)}>
              <span className="entry-date">{formatDate(app.applied_date)}</span>
              <span className="entry-title">
                {app.company} <span className="dash">—</span> {app.role}
              </span>
              <span className={`dot dot-${app.status}`}></span>
              <select
                className="status-select"
                value={app.status}
                onClick={e => e.stopPropagation()}
                onChange={e => updateStatus(app.id, e.target.value)}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="chevron">{expanded.has(app.id) ? '⌃' : '⌄'}</span>
            </div>
            {expanded.has(app.id) && app.ai_analysis && (
              <div className="entry-analysis">{app.ai_analysis}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;