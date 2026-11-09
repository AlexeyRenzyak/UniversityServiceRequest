import { useState } from 'react';
import { ArrowRight, BadgeCheck, Eye, EyeOff, FilePenLine, LockKeyhole, Mail, UserRoundCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Brand, FieldError, Notice, Spinner } from '../components/UI';

const emptyRegister = { first_name: '', last_name: '', email: '', password: '', password_confirm: '', role: 'user', user_type: 'student' };

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const location = useLocation();
  const navigate = useNavigate();
  const { login, expired, dismissExpired } = useAuth();
  const [fields, setFields] = useState({ ...emptyRegister, email: location.state?.email || '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [validation, setValidation] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const update = (name, value) => { setFields((old) => ({ ...old, [name]: value })); setValidation((old) => ({ ...old, [name]: '' })); setMessage(''); };
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(''); setValidation({});
    try {
      if (isRegister) {
        await api('/api/auth/register/', { auth: false, method: 'POST', body: {
          ...fields, email: fields.email.trim().toLowerCase(),
          user_type: fields.role === 'technician' ? '' : fields.user_type,
        } });
        navigate('/login', { replace: true, state: { email: fields.email.trim(), registered: true } });
      } else {
        await login(fields.email.trim(), fields.password);
        navigate('/', { replace: true });
      }
    } catch (error) {
      setMessage(error.message);
      setValidation(error.fields || {});
    } finally { setBusy(false); }
  };

  return <div className="auth-page">
    <aside className="auth-aside">
      <div className="auth-aside-inner">
        <Brand dark />
        <div className="auth-hero-content">
          <div className="hero-eyebrow"><span className="hero-eyebrow-dot" /> CAMPUS SUPPORT</div>
          <h1>A better campus<br /><em>starts here.</em></h1>
          <div className="hero-steps">
            <div><span><FilePenLine size={20} /></span><div><strong>Report a problem</strong><small>Describe the issue and specify the room.</small></div></div>
            <div><span><UserRoundCheck size={20} /></span><div><strong>See when it is accepted</strong><small>Check when a technician takes your request.</small></div></div>
            <div><span><BadgeCheck size={20} /></span><div><strong>Know when it is finished</strong><small>See when the technician marks the task complete.</small></div></div>
          </div>
        </div>
        <div className="auth-aside-footer">University Service Request <span>·</span> KBTU Student Project</div>
      </div>
      <div className="auth-decor auth-decor-one" /><div className="auth-decor auth-decor-two" />
    </aside>
    <main className="auth-main">
      <div className="auth-mobile-brand"><Brand /></div>
      <div className="auth-panel">
        <div className="auth-overline">WELCOME TO CAMPUS SERVICES</div>
        <h2>{isRegister ? 'Create your account' : 'Sign in'}</h2>
        <p className="auth-subtitle">{isRegister ? 'Just a few details to get you started.' : 'Access your requests and maintenance updates.'}</p>
        {location.state?.registered && !isRegister && <Notice kind="success">Account created. You can now sign in.</Notice>}
        {expired && !isRegister && <Notice onDismiss={dismissExpired}>Your session ended. Please sign in again.</Notice>}
        {message && <Notice>{message}</Notice>}
        <form className="auth-form" onSubmit={submit} noValidate>
          {isRegister && <>
            <div className="two-fields">
              <div className="form-field"><label htmlFor="first-name">First name</label><input id="first-name" autoComplete="given-name" autoFocus required maxLength={150} value={fields.first_name} onChange={(e) => update('first_name', e.target.value)} placeholder="First name" aria-invalid={!!validation.first_name} /><FieldError message={validation.first_name} /></div>
              <div className="form-field"><label htmlFor="last-name">Last name</label><input id="last-name" autoComplete="family-name" required maxLength={150} value={fields.last_name} onChange={(e) => update('last_name', e.target.value)} placeholder="Last name" aria-invalid={!!validation.last_name} /><FieldError message={validation.last_name} /></div>
            </div>
            <fieldset className="role-fieldset"><legend>I am registering as</legend>
              <div className="role-options">
                <label className={fields.role === 'user' ? 'selected' : ''}><input type="radio" name="account-role" checked={fields.role === 'user'} onChange={() => update('role', 'user')} /><span>Student / Teacher</span></label>
                <label className={fields.role === 'technician' ? 'selected' : ''}><input type="radio" name="account-role" checked={fields.role === 'technician'} onChange={() => update('role', 'technician')} /><span>Technician</span></label>
              </div>
            </fieldset>
            {fields.role === 'user' && <div className="form-field"><label htmlFor="user-type">University role</label><select id="user-type" value={fields.user_type} onChange={(e) => update('user_type', e.target.value)}><option value="student">Student</option><option value="teacher">Teacher</option></select><FieldError message={validation.user_type} /></div>}
          </>}
          <div className="form-field"><label htmlFor="email">Email address</label><div className="input-with-icon"><Mail size={18} aria-hidden="true" /><input id="email" type="email" required autoComplete="email" autoFocus={!isRegister} value={fields.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" aria-invalid={!!validation.email} /></div><FieldError message={validation.email} /></div>
          <div className="form-field"><label htmlFor="password">Password</label><div className="input-with-icon input-with-action"><LockKeyhole size={18} aria-hidden="true" /><input id="password" type={showPassword ? 'text' : 'password'} required autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 8 : undefined} value={fields.password} onChange={(e) => update('password', e.target.value)} placeholder="Enter your password" aria-invalid={!!validation.password} /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><FieldError message={validation.password} />{isRegister && <small className="field-hint">At least 8 characters. Avoid common or all-numeric passwords.</small>}</div>
          {isRegister && <div className="form-field"><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" required autoComplete="new-password" value={fields.password_confirm} onChange={(e) => update('password_confirm', e.target.value)} placeholder="Repeat your password" aria-invalid={!!validation.password_confirm} /><FieldError message={validation.password_confirm} /></div>}
          <button className="btn btn-primary btn-large btn-full" disabled={busy} type="submit">{busy ? <Spinner label={isRegister ? 'Creating account…' : 'Signing in…'} /> : <>{isRegister ? 'Create account' : 'Sign in'}<ArrowRight size={19} /></>}</button>
        </form>
        <p className="auth-bottom">{isRegister ? 'Already have an account?' : 'New to Campus Services?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
      </div>
    </main>
  </div>;
}
