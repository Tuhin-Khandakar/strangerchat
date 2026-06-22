import { Link } from 'react-router-dom'

export default function MaintenancePage() {
  return (
    <div className="maintenance-body">
      <div>
        <div className="maintenance-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        </div>
        <h1 className="display-lg">Under Maintenance</h1>
        <p>We're making StrangerChat even better. We'll be back shortly.</p>
        <Link to="/" className="btn btn-outline">Refresh</Link>
      </div>
    </div>
  )
}
