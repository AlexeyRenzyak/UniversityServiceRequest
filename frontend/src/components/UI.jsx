import { AlertCircle, Armchair, CheckCircle2, Clock3, ClipboardList, FileText, Inbox, LampDesk, Laptop, LoaderCircle, Printer, Projector, UserRoundCheck, Wifi, Wrench } from 'lucide-react';
import { CATEGORIES, STATUS, formatDate, getCategoryName } from '../constants';

export function Brand({ dark = false }) {
  return (
    <div className={`brand ${dark ? 'brand-dark' : ''}`} aria-label="KBTU Campus Services">
      <span className="brand-name"><strong>KBTU</strong><span>Campus Services</span></span>
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return <span className="spinner-text"><LoaderCircle className="spin" size={18} aria-hidden="true" /> {label}</span>;
}

export function LoadingPage() {
  return <div className="full-loading" role="status"><Brand /><Spinner label="Preparing your workspace…" /></div>;
}

export function Notice({ kind = 'error', children, onDismiss }) {
  if (!children) return null;
  return <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
    {kind === 'success' ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
    <div>{children}</div>
    {onDismiss && <button className="notice-dismiss" type="button" aria-label="Dismiss message" onClick={onDismiss}>×</button>}
  </div>;
}

export function StatusPill({ status }) {
  const current = STATUS[status] || STATUS.created;
  return <span className={`status status-${current.variant}`}><span className="status-dot" />{current.label}</span>;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return <div className="empty-state">
    <div className="empty-icon"><Icon size={26} strokeWidth={1.65} /></div>
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>;
}

const CATEGORY_ICON = {
  computer: Laptop,
  projector: Projector,
  printer: Printer,
  network: Wifi,
  electrical: LampDesk,
  furniture: Armchair,
  other: Wrench,
};

function RequestProgress({ request }) {
  const isWaiting = request.status === 'created';
  const isFinished = request.status === 'finished';
  const Icon = isWaiting ? Clock3 : isFinished ? CheckCircle2 : UserRoundCheck;
  const heading = isWaiting ? 'Waiting for a technician' : isFinished ? 'Marked as completed' : 'Accepted by a technician';
  const detail = isWaiting
    ? 'No technician has accepted this request yet.'
    : isFinished
      ? `Completed ${formatDate(request.finished_at)}${request.technician_name ? ` by ${request.technician_name}` : ''}`
      : `Accepted ${formatDate(request.taken_at)}${request.technician_name ? ` by ${request.technician_name}` : ''}`;
  return <div className={`request-progress request-progress-${request.status}`}>
    <span className="request-progress-icon"><Icon size={19} strokeWidth={2} aria-hidden="true" /></span>
    <div><strong>{heading}</strong><p>{detail}</p></div>
  </div>;
}

export function RequestCard({ request, action, context = 'user' }) {
  const category = getCategoryName(request.category);
  const CategoryIcon = CATEGORY_ICON[request.category] || Wrench;
  const isRequester = context === 'user';
  return <article className={`request-card ${isRequester ? 'request-card-user' : 'request-card-technician'}`}>
    <div className="request-topline">
      <div className="request-icon"><CategoryIcon size={20} strokeWidth={1.8} aria-hidden="true" /></div>
      <div className="request-heading"><h3>{category}</h3><p>Room {request.room_number} <span aria-hidden="true">·</span> Request #{request.id}</p></div>
      <StatusPill status={request.status} />
    </div>
    {isRequester && <RequestProgress request={request} />}
    <div className="request-description-wrap">
      {isRequester && <span className="request-description-label"><FileText size={14} aria-hidden="true" /> Reported issue</span>}
      <p className="request-description">{request.description}</p>
    </div>
    <div className="request-bottom">
      <div className="request-meta">
        <span><Clock3 size={15} aria-hidden="true" /> Submitted {formatDate(request.created_at)}</span>
        {!isRequester && <span><ClipboardList size={15} aria-hidden="true" /> Requested by {request.requester_name || 'a campus user'}</span>}
        {!isRequester && request.status === 'finished' && request.finished_at && <span><CheckCircle2 size={15} aria-hidden="true" /> Finished {formatDate(request.finished_at)}</span>}
      </div>
      {action && <div className="request-action">{action}</div>}
    </div>
  </article>;
}

export function PageLoading() {
  return <div className="panel-loading" role="status"><Spinner label="Loading requests…" /></div>;
}

export function FieldError({ message }) {
  return message ? <div className="field-error" role="alert">{message}</div> : null;
}

export function CategoryOptions() {
  return CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>);
}
