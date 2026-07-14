import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrandMark } from '../lib/icons';

export default function Login({ note }) {
  const { requestLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await requestLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <BrandMark />
          <span className="auth-brand-name" style={{ color: 'var(--ink)' }}>Waypoint</span>
        </div>
        <div className="auth-title">Sign in</div>
        <div className="auth-sub">{note || "Enter your email and we'll send you a sign-in link — no password needed."}</div>

        {sent ? (
          <div className="auth-sent">
            Check the console/log for your sign-in link (dev mode sends it there instead of a real email). It expires in 15 minutes.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {error && <div className="error-box">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
