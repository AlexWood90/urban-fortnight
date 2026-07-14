import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Login from './Login';

export default function JoinTrip() {
  const { code } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading || !user) return;
    api.post('/trips/join', { code })
      .then(({ trip }) => navigate('/', { replace: true, state: { openTripId: trip.id } }))
      .catch(err => setError(err.message || "Couldn't join that trip."));
  }, [loading, user, code, navigate]);

  if (loading) return null;

  if (!user) {
    localStorage.setItem('waypoint_pending_join', code);
    return <Login note={`Sign in to join the trip shared with code ${code}.`} />;
  }

  if (error) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-title">Couldn't join trip</div>
          <div className="error-box">{error}</div>
          <a className="btn btn-primary" href="/" style={{ width: '100%', textDecoration: 'none' }}>Back to Waypoint</a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="loading" style={{ padding: '10px 0' }}>
          <div className="globe"></div>
          <div className="loading-text">Joining trip…</div>
        </div>
      </div>
    </div>
  );
}
