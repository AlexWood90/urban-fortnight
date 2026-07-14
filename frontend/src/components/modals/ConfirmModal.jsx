import { IconClose } from '../../lib/icons';

export default function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="Cancel" style={{ background: 'var(--line)', color: 'var(--ink)' }}>
            <IconClose />
          </button>
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 18px' }}>{message}</p>
        <div className="modal-btn-row">
          <button className="modal-delete" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--coral-deep), var(--coral))' }} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
