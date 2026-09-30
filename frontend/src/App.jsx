import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  LayoutDashboard, Briefcase, PlusCircle, Search, Bookmark, Building2,
  FileText, MessageSquare, StickyNote, Calendar, Settings, Moon, Sun,
  Bell, Trash2, Eye, EyeOff
} from 'lucide-react';
import './App.css';

const API = 'http://localhost:5000/api/applications';

const STATUS_OPTIONS = ['applied', 'interview', 'offer', 'rejected', 'on_hold', 'withdrawn'];
const STATUS_COLORS = {
  applied: '#3B82F6',
  interview: '#16A34A',
  offer: '#8B5CF6',
  rejected: '#EF4444',
  on_hold: '#F59E0B',
  withdrawn: '#9CA3AF'
};
const STATUS_LABELS = {
  applied: 'Applied', interview: 'Interview', offer: 'Offer',
  rejected: 'Rejected', on_hold: 'On Hold', withdrawn: 'Withdrawn'
};

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, live: true },
  { key: 'applications', label: 'My Applications', icon: Briefcase, live: true },
  { key: 'add', label: 'Add Job', icon: PlusCircle, live: true },
  { key: 'jobsearch', label: 'Job Search', icon: Search, live: false },
  { key: 'saved', label: 'Saved Jobs', icon: Bookmark, live: false },
  { key: 'companies', label: 'Companies', icon: Building2, live: false },
  { key: 'resume', label: 'Resume Builder', icon: FileText, live: false },
  { key: 'interviewprep', label: 'Interview Prep', icon: MessageSquare, live: false },
  { key: 'notes', label: 'Notes & Resources', icon: StickyNote, live: false },
  { key: 'calendar', label: 'Calendar', icon: Calendar, live: false },
];

function loadChecklist() {
  try { return JSON.parse(localStorage.getItem('jt_checklist') || '{}'); } catch { return {}; }
}
function loadTheme() { return localStorage.getItem('jt_theme') || 'light'; }

function App() {
  const [theme, setTheme] = useState(loadTheme());
  const [view, setView] = useState('dashboard');
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [checklist, setChecklist] = useState(loadChecklist());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const perPage = 8;

  const [form, setForm] = useState({ company: '', role: '', job_description: '' });
  const [submitting, setSubmitting] = useState(false);
    const fetchAll = async () => {
    const [appsRes, statsRes, upcomingRes] = await Promise.all([
      axios.get(API),
      axios.get(`${API}/stats`),
      axios.get(`${API}/upcoming-interviews`)
    ]);
    setApps(appsRes.data);
    setStats(statsRes.data);
    setUpcoming(upcomingRes.data);
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { localStorage.setItem('jt_theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('jt_checklist', JSON.stringify(checklist)); }, [checklist]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await axios.post(API, form);
    setForm({ company: '', role: '', job_description: '' });
    await fetchAll();
    setSubmitting(false);
    setView('applications');
  };

  const updateStatus = async (id, status) => {
    await axios.patch(`${API}/${id}`, { status });
    fetchAll();
  };

  const setInterviewDate = async (id, date) => {
    await axios.patch(`${API}/${id}`, { interview_date: date });
    fetchAll();
  };

  const deleteApp = async (id) => {
    if (!window.confirm('Delete this application?')) return;
    await axios.delete(`${API}/${id}`);
    fetchAll();
  };

  const toggleChecklistItem = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredApps = apps.filter(a => {
    const matchesSearch = `${a.company} ${a.role}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredApps.length / perPage));
  const pagedApps = filteredApps.slice((page - 1) * perPage, page * perPage);

  const donutData = stats ? Object.entries(stats.statusBreakdown).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status, value: count, color: STATUS_COLORS[status] || '#999'
  })) : [];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  const StatCard = ({ icon: Icon, label, value, change, color }) => (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}18`, color }}><Icon size={18} /></div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {change !== undefined && (
          <div className={`stat-change ${change >= 0 ? 'up' : 'down'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% <span>vs last 30 days</span>
          </div>
        )}
      </div>
    </div>
  );
    const renderTable = (list) => (
    <div className="jt-table-wrap">
      <table className="jt-table">
        <thead>
          <tr>
            <th>Company</th><th>Role</th><th>Applied On</th><th>Status</th><th>Interview Date</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={6} className="jt-empty">No applications found.</td></tr>}
          {list.map(app => (
            <>
              <tr key={app.id}>
                <td className="jt-company-cell">
                  <div className="jt-avatar" style={{ background: STATUS_COLORS[app.status] || '#999' }}>
                    {app.company?.[0]?.toUpperCase()}
                  </div>
                  {app.company}
                </td>
                <td>{app.role}</td>
                <td>{formatDate(app.applied_date)}</td>
                <td>
                  <select
                    className="jt-status-select"
                    style={{ color: STATUS_COLORS[app.status], borderColor: STATUS_COLORS[app.status] }}
                    value={app.status}
                    onChange={e => updateStatus(app.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </td>
                <td>
                  <input
                    type="date"
                    className="jt-date-input"
                    value={app.interview_date ? app.interview_date.split('T')[0] : ''}
                    onChange={e => setInterviewDate(app.id, e.target.value)}
                  />
                </td>
                <td className="jt-actions-cell">
                  <button className="jt-icon-btn-sm" onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}>
                    {expandedId === app.id ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button className="jt-icon-btn-sm danger" onClick={() => deleteApp(app.id)}><Trash2 size={15} /></button>
                </td>
              </tr>
              {expandedId === app.id && (
                <tr key={`${app.id}-expand`}>
                  <td colSpan={6} className="jt-expand-row">
                    <strong>AI Fit Analysis:</strong>
                    <p>{app.ai_analysis || 'No analysis available for this application.'}</p>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
    return (
    <div className="jt-workspace" data-theme={theme}>
      <aside className="jt-sidebar">
        <div className="jt-brand">
          <div className="jt-brand-icon"><Briefcase size={18} /></div>
          <div>
            <div className="jt-brand-name">JobTracker</div>
            <div className="jt-brand-tag">Track · Apply · Get Hired</div>
          </div>
        </div>

        <nav className="jt-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`jt-nav-item ${view === item.key ? 'active' : ''} ${!item.live ? 'soon' : ''}`}
              onClick={() => setView(item.key)}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
              {!item.live && <span className="soon-badge">Soon</span>}
            </button>
          ))}
        </nav>

        <div className="jt-sidebar-footer">
          <button className="jt-nav-item" onClick={() => setView('settings')}>
            <Settings size={17} /><span>Settings</span>
          </button>
        </div>
      </aside>

      <div className="jt-main">
        <header className="jt-topbar">
          <div className="jt-search-box">
            <Search size={16} />
            <input placeholder="Search jobs, companies, or roles..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="jt-topbar-actions">
            <button className="jt-icon-btn"><Bell size={17} /></button>
            <button className="jt-icon-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        {view === 'dashboard' && stats && (
          <main className="jt-content">
            <h1 className="jt-page-title">Good Morning, Shabnam 👋</h1>
            <p className="jt-page-sub">Here's your job application progress and latest updates.</p>

            <div className="jt-stats-row">
              <StatCard icon={FileText} label="Total Applications" value={stats.total} change={stats.totalChange} color="#3B82F6" />
              <StatCard icon={Calendar} label="Interviews" value={stats.interviews} change={stats.interviewsChange} color="#16A34A" />
              <StatCard icon={Briefcase} label="Offers" value={stats.offers} change={stats.offersChange} color="#8B5CF6" />
              <StatCard icon={Trash2} label="Rejections" value={stats.rejections} change={stats.rejectionsChange} color="#EF4444" />
            </div>

            <div className="jt-charts-row">
              <div className="jt-panel jt-donut-panel">
                <div className="jt-panel-title">Application Status</div>
                {donutData.length === 0 ? <div className="jt-empty">No applications yet.</div> : (
                  <div className="jt-donut-wrap">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={donutData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                          {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="jt-donut-legend">
                      {donutData.map((d, i) => (
                        <div className="jt-legend-row" key={i}>
                          <span className="jt-dot" style={{ background: d.color }}></span>
                          <span>{d.name}</span>
                          <span className="jt-legend-count">{d.value} ({((d.value / stats.total) * 100).toFixed(1)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="jt-panel jt-trend-panel">
                <div className="jt-panel-title">Applications Trend (Last 30 Days)</div>
                {stats.trend.length === 0 ? <div className="jt-empty">No applications in the last 30 days.</div> : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={stats.trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--jt-border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => formatDate(d)} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip labelFormatter={d => formatDate(d)} />
                      <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="jt-panel">
              <div className="jt-panel-title">Recent Applications</div>
              {renderTable(apps.slice(0, 5))}
            </div>
          </main>
        )}

        {view === 'dashboard' && !stats && <main className="jt-content"><div className="jt-empty">Loading…</div></main>}

        {view === 'applications' && (
          <main className="jt-content">
            <h1 className="jt-page-title">My Applications</h1>
            <div className="jt-filter-row">
              {['all', ...STATUS_OPTIONS].map(s => (
                <button key={s} className={`jt-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => { setStatusFilter(s); setPage(1); }}>
                  {s === 'all' ? 'All' : STATUS_LABELS[s]} ({s === 'all' ? apps.length : apps.filter(a => a.status === s).length})
                </button>
              ))}
            </div>
            {renderTable(pagedApps)}
            <div className="jt-pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </main>
        )}

        {view === 'add' && (
          <main className="jt-content jt-add-form-wrap">
            <h1 className="jt-page-title">Add New Job Application</h1>
            <form className="jt-add-form" onSubmit={handleSubmit}>
              <label>Company
                <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} required />
              </label>
              <label>Role
                <input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} required />
              </label>
              <label>Job Description
                <textarea rows={6} value={form.job_description} onChange={e => setForm({ ...form, job_description: e.target.value })} placeholder="Paste the job description for an AI fit analysis..." />
              </label>
              <button type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add Application'}</button>
            </form>
          </main>
        )}

        {NAV_ITEMS.filter(n => !n.live).map(n => n.key).includes(view) && (
          <main className="jt-content">
            <div className="jt-coming-soon">
              <h2>{NAV_ITEMS.find(n => n.key === view)?.label}</h2>
              <p>This feature isn't built yet — coming in a future update.</p>
            </div>
          </main>
        )}

        {view === 'settings' && (
          <main className="jt-content">
            <h1 className="jt-page-title">Settings</h1>
            <p className="jt-page-sub">Theme, notifications, and account settings will live here.</p>
          </main>
        )}
      </div>
            <aside className="jt-right-panel">
        <div className="jt-panel">
          <div className="jt-panel-title-row">
            <span className="jt-panel-title">Job Search Progress</span>
            <span className="jt-progress-count">{apps.length >= 10 ? 10 : apps.length} / 10</span>
          </div>
          <div className="jt-progress-bar-outer">
            <div className="jt-progress-bar-inner" style={{ width: `${Math.min(100, (apps.length / 10) * 100)}%` }}></div>
          </div>
          <div className="jt-checklist">
            <div className="jt-checklist-item done">
              <span>✓</span> Applied to {Math.min(apps.length, 10)} Jobs <span className="jt-checklist-pct">{Math.min(100, Math.round((apps.length / 10) * 100))}%</span>
            </div>
            {['linkedin', 'resume', 'coverletter', 'interviewprep'].map(key => (
              <button key={key} className={`jt-checklist-item toggle ${checklist[key] ? 'done' : ''}`} onClick={() => toggleChecklistItem(key)}>
                <span>{checklist[key] ? '✓' : '○'}</span>
                {{
                  linkedin: 'LinkedIn Profile Completed',
                  resume: 'Resume Optimized',
                  coverletter: 'Cover Letter Created',
                  interviewprep: 'Interview Preparation'
                }[key]}
                <span className="jt-checklist-pct">{checklist[key] ? '100%' : '0%'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="jt-panel">
          <div className="jt-panel-title">Upcoming Interviews</div>
          {upcoming.length === 0 && <div className="jt-empty">No interview dates set yet.</div>}
          {upcoming.map(app => (
            <div className="jt-interview-card" key={app.id}>
              <div className="jt-interview-date">
                <div className="jt-interview-day">{new Date(app.interview_date).getDate()}</div>
                <div className="jt-interview-month">{new Date(app.interview_date).toLocaleDateString('en-US', { month: 'short' })}</div>
              </div>
              <div className="jt-interview-info">
                <div className="jt-interview-company">{app.company}</div>
                <div className="jt-interview-role">{app.role}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="jt-panel">
          <div className="jt-panel-title">Quick Actions</div>
          <div className="jt-quick-actions">
            <button onClick={() => setView('add')}><PlusCircle size={16} /> Add New Job</button>
            <button className="disabled" title="Coming soon"><Search size={16} /> Search Jobs</button>
            <button className="disabled" title="Coming soon"><FileText size={16} /> Update Resume</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default App;