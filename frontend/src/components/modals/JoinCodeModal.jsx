import { useState } from 'react';
import { IconClose } from '../../lib/icons';

export default function JoinCodeModal({ onJoin, onClose }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onJoin(code.trim());
    } catch (err) {
      setError(err.message || "Couldn't join that trip.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h2>Join a shared trip</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ background: 'var(--line)', color: 'var(--ink)' }}>
            <IconClose />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>6-character code</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} style={{ textTransform: 'uppercase', letterSpacing: 3, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace" }} />
          </div>
          {error && <div className="error-box">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy || code.trim().length < 6} style={{ width: '100%' }}>
            {busy ? 'Joining…' : 'Join trip'}
          </button>
        </form>
      </div>
    </div>
  );
}
