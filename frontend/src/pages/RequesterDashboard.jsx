import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCheck, ClipboardList, Clock3, Plus, RefreshCw } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { EmptyState, Notice, PageLoading, RequestCard } from '../components/UI';

const FILTERS = [{ key: 'all', label: 'All requests' }, { key: 'created', label: 'Waiting' }, { key: 'taken', label: 'In progress' }, { key: 'finished', label: 'Completed' }];

export default function RequesterDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [createdId, setCreatedId] = useState(location.state?.createdId || null);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    api('/api/requests/my/').then((data) => { if (alive) setRequests(data); })
      .catch((err) => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reload]);

  const stats = useMemo(() => ({
    total: requests.length,
    waiting: requests.filter((item) => item.status === 'created').length,
    progress: requests.filter((item) => item.status === 'taken').length,
    completed: requests.filter((item) => item.status === 'finished').length,
  }), [requests]);
  const visible = filter === 'all' ? requests : requests.filter((item) => item.status === filter);

  return <div className="content-wrap page-enter">
    <div className="page-header">
      <div><div className="eyebrow">REQUESTER DASHBOARD</div><h1>Good to see you, {user?.first_name}.</h1><p>Need something fixed? Report it here and follow the progress.</p></div>
      <Link to="/requests/new" className="btn btn-primary"><Plus size={19} /> Report a problem</Link>
    </div>
    {createdId && <Notice kind="success" onDismiss={() => { setCreatedId(null); navigate("/", { replace: true, state: null }); }}>Request #{createdId} submitted successfully. You can track its status below.</Notice>}
    <div className="summary-grid" aria-label="Request summary">
      <div className="summary-card"><div className="summary-icon icon-blue"><ClipboardList size={22} /></div><div><span>Total requests</span><strong>{loading ? '—' : stats.total}</strong></div></div>
      <div className="summary-card"><div className="summary-icon icon-amber"><Clock3 size={22} /></div><div><span>Waiting</span><strong>{loading ? '—' : stats.waiting}</strong></div></div>
      <div className="summary-card"><div className="summary-icon icon-teal"><RefreshCw size={22} /></div><div><span>In progress</span><strong>{loading ? '—' : stats.progress}</strong></div></div>
      <div className="summary-card"><div className="summary-icon icon-green"><CheckCheck size={22} /></div><div><span>Completed</span><strong>{loading ? '—' : stats.completed}</strong></div></div>
    </div>
    <div className="section-head"><div><h2>My requests</h2><p>Track which requests have been accepted and completed.</p></div><button type="button" onClick={() => setReload((n) => n + 1)} className="btn btn-outline btn-small" disabled={loading} title="Fetch the latest statuses from the server" aria-label="Check for updates from the server"><RefreshCw size={16} /> Check for updates</button></div>
    <div className="segmented-tabs" role="group" aria-label="Filter requests by status">
      {FILTERS.map(({ key, label }) => <button key={key} type="button" className={filter === key ? 'active' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
    </div>
    {error && <Notice>{error} <button className="notice-link" type="button" onClick={() => setReload((n) => n + 1)}>Try again</button></Notice>}
    {loading ? <PageLoading /> : error ? null : !visible.length ? <EmptyState
      icon={ClipboardList}
      title={filter === 'all' ? 'No requests yet' : 'Nothing here yet'}
      description={filter === 'all' ? 'When something on campus needs attention, submit a request and you will see it here.' : 'You do not have any requests with this status.'}
      action={filter === 'all' ? <Link to="/requests/new" className="btn btn-primary"><Plus size={18} /> Report a problem</Link> : <button type="button" onClick={() => setFilter('all')} className="btn btn-outline">View all requests <ArrowRight size={16} /></button>}
    /> : <div className="request-list">{visible.map((request) => <RequestCard key={`${request.id}-${request.status}`} request={request} />)}</div>}
  </div>;
}
