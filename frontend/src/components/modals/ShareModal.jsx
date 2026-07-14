import { useEffect, useState } from 'react';
import { IconClose } from '../../lib/icons';

export default function ShareModal({ trip, onShare, onClose }) {
  const [code, setCode] = useState(trip.shareCode || null);
  const [busy, setBusy] = useState(!trip.shareCode);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (code) return;
    onShare().then(c => { setCode(c); setBusy(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinUrl = code ? `${window.location.origin}/join/${code}` : '';

  function copy() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h2>Share this trip</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ background: 'var(--line)', color: 'var(--ink)' }}>
            <IconClose />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 4px' }}>
          Anyone with this code can view and edit the itinerary in real time.
        </p>
        {busy ? (
          <div className="empty-state">Generating code…</div>
        ) : (
          <>
            <div className="share-code">{code}</div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={copy}>
              {copied ? 'Link copied!' : 'Copy join link'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
