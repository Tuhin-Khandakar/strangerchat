export default function Modal({ id, isOpen, onClose, children, className = '' }) {
  return (
    <div
      className={`modal-overlay ${isOpen ? 'active' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className={`modal ${className}`}>
        {children}
      </div>
    </div>
  )
}
