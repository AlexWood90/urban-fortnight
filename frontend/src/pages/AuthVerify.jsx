import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthVerify() {
  const { verify } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get('token');
    if (!token) { setError('Missing sign-in token.'); return; }
    verify(token)
      .then(() => {
        const pendingJoin = localStorage.getItem('waypoint_pending_join');
        if (pendingJoin) {
          localStorage.removeItem('waypoint_pending_join');
          navigate(`/join/${pendingJoin}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch(err => setError(err.message || 'This sign-in link is invalid or has expired.'));
  }, [params, verify, navigate]);

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {error ? (
          <>
            <div className="auth-title">Couldn't sign you in</div>
            <div className="error-box">{error}</div>
            <a className="btn btn-primary" href="/" style={{ width: '100%', textDecoration: 'none' }}>Back to sign in</a>
          </>
        ) : (
          <div className="loading" style={{ padding: '10px 0' }}>
            <div className="globe"></div>
            <div className="loading-text">Signing you in…</div>
          </div>
        )}
      </div>
    </div>
  );
}
