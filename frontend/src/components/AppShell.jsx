import { LogOut, UserRound, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { initials } from '../constants';
import { Brand, Spinner } from './UI';

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const technician = user?.role === 'technician';
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="app-header"><div className="header-inner">
      <NavLink to="/" aria-label="Campus Services homepage" className="brand-link"><Brand /></NavLink>
      <nav className="desktop-navigation" aria-label="Main navigation">
        <NavLink end to="/">Dashboard</NavLink>
        {!technician && <NavLink to="/requests/new">New request</NavLink>}
      </nav>
      <div className="header-right">
        <div className="account-pill"><span className="avatar">{initials(user)}</span><span className="account-text"><strong>{user?.first_name || 'User'}</strong><small>{technician ? 'Technician' : user?.user_type === 'teacher' ? 'Teacher' : 'Student'}</small></span></div>
        <button type="button" className="icon-button logout-button" onClick={handleLogout} title="Sign out" aria-label="Sign out" disabled={isLoggingOut}>
          {isLoggingOut ? <Spinner label="" /> : <LogOut size={19} />}
        </button>
        <button type="button" className="icon-button mobile-menu-toggle" aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X /> : <Menu />}</button>
      </div>
    </div>
    {mobileMenuOpen && <nav className="mobile-navigation" aria-label="Mobile navigation" onClick={() => setMobileMenuOpen(false)}>
      <NavLink to="/" end>Dashboard</NavLink>
      {!technician && <NavLink to="/requests/new">New request</NavLink>}
      <button type="button" onClick={handleLogout}><UserRound size={17} /> Sign out</button>
    </nav>}
    </header>
    <main id="main-content" className="main-content">{children}</main>
    <footer className="app-footer"><span>University Service Request</span><span>KBTU · Student project</span></footer>
  </div>;
}
