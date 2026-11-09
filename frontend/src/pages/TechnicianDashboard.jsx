import { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowRight, BriefcaseBusiness, CheckCheck, CheckCircle2, Download, Inbox, RefreshCw, Search, Wrench, X } from 'lucide-react';
import { api } from '../api';
import { CATEGORIES, filterRequestsOnPage, unpackPage } from '../constants';
import { EmptyState, Notice, PageLoading, RequestCard, Spinner } from '../components/UI';

const EMPTY = { results: [], count: 0, next: null, previous: null };
const PANELS = [
  { key: 'available', label: 'Available', icon: Inbox, subtitle: 'New requests waiting for a technician.' },
  { key: 'mine', label: 'My tasks', icon: BriefcaseBusiness, subtitle: 'Requests you have taken responsibility for.' },
  { key: 'completed', label: 'Completed', icon: Archive, subtitle: 'Previously resolved maintenance requests.' },
];

export default function TechnicianDashboard() {
  const [tab, setTab] = useState('available');
  const [lists, setLists] = useState({ available: EMPTY, mine: EMPTY, completed: EMPTY });
  const [pages, setPages] = useState({ available: 1, mine: 1, completed: 1 });
  const [dates, setDates] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const validDates = !dates.from || !dates.to || dates.from <= dates.to;

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const archiveFilters = new URLSearchParams();
    if (dates.from) archiveFilters.set('date_from', dates.from);
    if (dates.to) archiveFilters.set('date_to', dates.to);
    archiveFilters.set('page', String(pages.completed));
    setLoading(true); setError('');
    Promise.all([
      api(`/api/requests/available/?page=${pages.available}`, { signal: controller.signal }),
      api(`/api/requests/assigned/?page=${pages.mine}`, { signal: controller.signal }),
      validDates ? api(`/api/archive/?${archiveFilters.toString()}`, { signal: controller.signal }) : Promise.resolve(EMPTY),
    ]).then(([available, mine, completed]) => {
      if (alive) setLists({ available: unpackPage(available), mine: unpackPage(mine), completed: unpackPage(completed) });
    }).catch((err) => {
      if (alive && err.name !== 'AbortError') setError(err.message);
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; controller.abort(); };
  }, [revision, pages, dates, validDates]);

  const reload = () => setRevision((x) => x + 1);
  const updatePage = (key, value) => setPages((current) => ({ ...current, [key]: value }));
  const doAction = async (request, action) => {
    setBusyId(request.id); setError(''); setSuccess('');
    try {
      await api(`/api/requests/${request.id}/${action}/`, { method: 'POST' });
      setConfirmId(null);
      setSuccess(action === 'take' ? `Request #${request.id} is now assigned to you.` : `Request #${request.id} marked completed and moved to the archive.`);
      setTab(action === 'take' ? 'mine' : 'completed');
      setPages({ available: 1, mine: 1, completed: 1 });
      reload();
    } catch (err) {
      setError(err.status === 409 ? `${err.message} The list will be refreshed.` : err.message);
      if (err.status === 409 || err.status === 404) reload();
    } finally { setBusyId(null); }
  };
  const exportCsv = async () => {
    setExporting(true); setError('');
    const params = new URLSearchParams();
    if (dates.from) params.set('date_from', dates.from);
    if (dates.to) params.set('date_to', dates.to);
    try {
      const blob = await api(`/api/archive/export/${params.size ? `?${params.toString()}` : ''}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const element = document.createElement('a');
      element.href = url; element.download = 'campus-service-archive.csv';
      document.body.appendChild(element); element.click(); element.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.message); }
    finally { setExporting(false); }
  };
  const selected = PANELS.find((p) => p.key === tab);
  const list = lists[tab];
  const page = pages[tab];
  const pageTotal = Math.max(1, Math.ceil(list.count / 25));
  const visibleRequests = useMemo(() => filterRequestsOnPage(list.results, query, categoryFilter), [list.results, query, categoryFilter]);
  const hasSearch = Boolean(query.trim()) || categoryFilter !== 'all';
  const clearSearch = () => { setQuery(''); setCategoryFilter('all'); };

  return <div className="content-wrap page-enter">
    <div className="page-header"><div><div className="eyebrow">TECHNICIAN WORKSPACE</div><h1>Maintenance dashboard</h1><p>Review maintenance reports, accept a task, and mark it completed.</p></div><button type="button" className="btn btn-outline" disabled={loading} onClick={reload} title="Fetch the latest available, assigned and archived requests"><RefreshCw size={17} /> Check for updates</button></div>
    <div className="summary-grid tech-summary">
      <button type="button" className="summary-card clickable" onClick={() => setTab('available')}><div className="summary-icon icon-amber"><Inbox size={22} /></div><div><span>Awaiting pickup</span><strong>{loading ? '—' : lists.available.count}</strong></div><ArrowRight size={18} className="summary-arrow" /></button>
      <button type="button" className="summary-card clickable" onClick={() => setTab('mine')}><div className="summary-icon icon-teal"><Wrench size={22} /></div><div><span>My active tasks</span><strong>{loading ? '—' : lists.mine.count}</strong></div><ArrowRight size={18} className="summary-arrow" /></button>
      <button type="button" className="summary-card clickable" onClick={() => setTab('completed')}><div className="summary-icon icon-green"><CheckCheck size={22} /></div><div><span>Completed tasks</span><strong>{loading ? '—' : lists.completed.count}</strong></div><ArrowRight size={18} className="summary-arrow" /></button>
    </div>
    <div className="tech-section">
      <div className="section-head"><div><h2>Service requests</h2><p>Choose an area to see the details.</p></div></div>
      <div className="tabs-bar" role="tablist" aria-label="Technician request lists">
        {PANELS.map(({ key, label, icon: Icon }) => <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={tab === key} aria-controls={`panel-${key}`} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setConfirmId(null); setError(''); setSuccess(''); }}><Icon size={17} />{label}<span className="tab-count">{loading ? '…' : lists[key].count}</span></button>)}
      </div>
      <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tab-panel">
        <div className="panel-toolbar"><div><h3>{selected.label} requests</h3><p>{selected.subtitle}</p></div>
          {tab === 'completed' && <button type="button" className="btn btn-outline btn-small" disabled={exporting || !validDates} onClick={exportCsv}>{exporting ? <Spinner label="Exporting…" /> : <><Download size={16} /> Download CSV</>}</button>}
        </div>
        {tab === 'completed' && <div className="date-filters"><div className="form-field"><label htmlFor="date-from">From</label><input id="date-from" type="date" value={dates.from} onChange={(e) => { setDates((v) => ({ ...v, from: e.target.value })); updatePage('completed', 1); }} /></div><div className="form-field"><label htmlFor="date-to">To</label><input id="date-to" type="date" value={dates.to} onChange={(e) => { setDates((v) => ({ ...v, to: e.target.value })); updatePage('completed', 1); }} /></div>{(dates.from || dates.to) && <button type="button" className="text-button" onClick={() => { setDates({ from: '', to: '' }); updatePage('completed', 1); }}>Clear dates</button>}</div>}
        <div className="request-searchbar" role="search" aria-label="Search requests on the current page">
          <label className="search-input" htmlFor="search-requests"><Search size={18} aria-hidden="true" />
            <input id="search-requests" type="search" placeholder="Search room, request #, person or description" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="search-category-label" htmlFor="category-filter">Category</label>
          <select id="category-filter" className="search-category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          {hasSearch && <button type="button" className="btn btn-outline btn-small" onClick={clearSearch}><X size={16} /> Clear</button>}
        </div>
        {list.count > 25 && <p className="search-scope-hint">Search filters page {page} of {pageTotal} only. Use the page controls to browse more results.</p>}
        {tab === 'completed' && !validDates && <Notice>The end date must not be earlier than the start date.</Notice>}
        {error && <Notice onDismiss={() => setError('')}>{error}</Notice>}
        {success && <Notice kind="success" onDismiss={() => setSuccess('')}>{success}</Notice>}
        {loading ? <PageLoading /> : error ? null : validDates && !list.results.length ? <EmptyState icon={tab === 'completed' ? Archive : tab === 'mine' ? BriefcaseBusiness : Inbox} title={tab === 'available' ? 'No requests waiting' : tab === 'mine' ? 'No active tasks' : 'No completed requests'} description={tab === 'available' ? 'New reports will appear here when someone submits a request.' : tab === 'mine' ? 'Choose an available request and select “Take request” to start working.' : 'Finished work will be saved here. Try changing the date range if needed.'} action={tab === 'mine' ? <button type="button" className="btn btn-outline" onClick={() => setTab('available')}>Browse available requests <ArrowRight size={16} /></button> : null} /> : validDates && !visibleRequests.length ? <EmptyState icon={Search} title="No matching requests on this page" description="Try another room, category or word, or clear the search." action={<button type="button" className="btn btn-outline" onClick={clearSearch}>Clear search</button>} /> : validDates && <div className="request-list">
          {visibleRequests.map((request) => <RequestCard key={`${tab}-${request.id}`} request={request} context="technician" busy={busyId === request.id} action={
            tab === 'available' ? <button type="button" className="btn btn-primary btn-small" disabled={busyId !== null} onClick={() => doAction(request, 'take')}>{busyId === request.id ? <Spinner label="Taking…" /> : <>Take request <ArrowRight size={16} /></>}</button> :
            tab === 'mine' ? confirmId === request.id ? <div className="confirm-actions"><span>Mark this request completed?</span><button type="button" className="btn btn-outline btn-small" disabled={busyId !== null} onClick={() => setConfirmId(null)}>Cancel</button><button type="button" className="btn btn-primary btn-small" disabled={busyId !== null} onClick={() => doAction(request, 'finish')}>{busyId === request.id ? <Spinner label="Saving…" /> : <><CheckCircle2 size={15} /> Yes, complete</>}</button></div> : <button type="button" className="btn btn-primary btn-small" disabled={busyId !== null} onClick={() => setConfirmId(request.id)}><CheckCircle2 size={16} /> Mark completed</button> : null
          } />)}
        </div>}
        {!loading && validDates && list.count > 25 && <nav className="pagination" aria-label="Request pages"><button type="button" className="btn btn-outline btn-small" disabled={!list.previous} onClick={() => updatePage(tab, Math.max(1, page - 1))}>Previous</button><span>Page {page} of {pageTotal}</span><button type="button" className="btn btn-outline btn-small" disabled={!list.next} onClick={() => updatePage(tab, page + 1)}>Next</button></nav>}
      </section>
    </div>
  </div>;
}
