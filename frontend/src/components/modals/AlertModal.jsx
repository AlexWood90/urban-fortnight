import { IconClose } from '../../lib/icons';

export default function AlertModal({ title, message, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ background: 'var(--line)', color: 'var(--ink)' }}>
            <IconClose />
          </button>
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 18px' }}>{message}</p>
        <div className="modal-btn-row">
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}
