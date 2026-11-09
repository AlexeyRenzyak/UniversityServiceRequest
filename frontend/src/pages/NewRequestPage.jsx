import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Info, MapPin, MessageSquareText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { CategoryOptions, FieldError, Notice, Spinner } from '../components/UI';

export default function NewRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [values, setValues] = useState({ room_number: '', category: '', description: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const update = (name, value) => { setValues((old) => ({ ...old, [name]: value })); setErrors((old) => ({ ...old, [name]: '' })); setError(''); };
  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const fieldErrors = {};
    if (!values.room_number.trim()) fieldErrors.room_number = 'Please enter the room number.';
    if (!values.category) fieldErrors.category = 'Please choose an issue type.';
    if (!values.description.trim()) fieldErrors.description = 'Please describe what is wrong.';
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    setSubmitting(true); setError(''); setErrors({});
    try {
      const created = await api('/api/requests/', { method: 'POST', body: {
        room_number: values.room_number.trim(), category: values.category, description: values.description.trim(),
      } });
      navigate('/', { replace: true, state: { createdId: created.id } });
    } catch (err) { setError(err.message); setErrors(err.fields || {}); }
    finally { setSubmitting(false); }
  };
  return <div className="content-wrap content-narrow page-enter">
    <Link to="/" className="back-link"><ArrowLeft size={17} /> Back to my requests</Link>
    <div className="page-header form-page-header"><div><div className="eyebrow">NEW MAINTENANCE REQUEST</div><h1>Report a problem</h1><p>Tell our maintenance team what needs fixing. It only takes a minute.</p></div></div>
    <div className="form-layout">
      <div className="form-surface">
        <div className="form-surface-head"><span className="step-circle">1</span><div><h2>Issue details</h2><p>Please fill in the information below.</p></div></div>
        {error && <Notice>{error}</Notice>}
        <form onSubmit={submit} noValidate className="request-form">
          <div className="form-field"><label htmlFor="room"><MapPin size={17} aria-hidden="true" /> Room number <span className="required">*</span></label><input id="room" autoFocus required maxLength={30} value={values.room_number} onChange={(e) => update('room_number', e.target.value)} placeholder="e.g. B-201 or 405" aria-invalid={!!errors.room_number} aria-describedby="room-help" /><small className="field-hint" id="room-help">Enter the classroom, office, or area where the problem is located.</small><FieldError message={errors.room_number} /></div>
          <div className="form-field"><label htmlFor="category">What kind of problem is it? <span className="required">*</span></label><select id="category" required value={values.category} onChange={(e) => update('category', e.target.value)} aria-invalid={!!errors.category}><option value="" disabled>Select the type of problem</option><CategoryOptions /></select><FieldError message={errors.category} /></div>
          <div className="form-field"><label htmlFor="description"><MessageSquareText size={17} aria-hidden="true" /> Describe the problem <span className="required">*</span></label><textarea id="description" required rows={5} value={values.description} onChange={(e) => update('description', e.target.value)} placeholder="What is not working? When did it start? Include any details that may help." aria-invalid={!!errors.description} /><small className="field-hint">A short, clear description helps the technician understand the issue.</small><FieldError message={errors.description} /></div>
          <div className="requester-readonly"><CheckCircle2 size={18} /><span>Submitted as <strong>{user?.first_name} {user?.last_name}</strong></span></div>
          <div className="form-actions"><Link to="/" className="btn btn-outline">Cancel</Link><button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? <Spinner label="Sending request…" /> : <>Submit request <ArrowRight size={18} /></>}</button></div>
        </form>
      </div>
      <aside className="form-side-note"><Info size={19} /><div><h3>What happens next?</h3><p>Your request will appear in your dashboard with the status <strong>Waiting</strong>. When a technician takes it, the status changes to <strong>In progress</strong>, then <strong>Completed</strong>.</p></div></aside>
    </div>
  </div>;
}
