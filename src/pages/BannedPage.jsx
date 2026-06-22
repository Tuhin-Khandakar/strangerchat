import { Link } from 'react-router-dom'

export default function BannedPage() {
  return (
    <div className="banned-page">
      <div className="banned-body">
        <div className="banned-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h1>Access Blocked</h1>
        <p>Your account has been banned from StrangerChat due to violation of our community guidelines.</p>
        <div className="banned-info">
          <strong>Reason</strong>
          You have been permanently banned from using StrangerChat. This decision was made after careful review by our moderation team.
        </div>
        <div className="banned-actions">
          <Link to="/" className="btn btn-outline">Return Home</Link>
        </div>
      </div>
      <footer className="state-page-footer">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <span>&copy; 2026 StrangerChat</span>
      </footer>
    </div>
  )
}
