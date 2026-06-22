import { Link } from 'react-router-dom'

export default function MatchLimitPage() {
  return (
    <div className="match-limit-page">
      <div className="match-limit-body">
        <div className="match-limit-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h1>Daily Limit Reached</h1>
        <p>You've used all 50 free matches for today. Upgrade to Premium for unlimited chats.</p>
        <div className="match-limit-info">
          <strong>50 / 50 matches used</strong>
          Your daily match limit resets in 12 hours. Upgrade now to keep chatting without limits.
        </div>
        <div className="match-limit-compare">
          <div className="match-limit-card">
            <h3>Free</h3>
            <div className="price">50<div className="currency">/day</div></div>
            <ul>
              <li>Matches</li>
              <li>Basic features</li>
            </ul>
            <Link to="/chat" className="btn btn-outline w-full">Current Plan</Link>
          </div>
          <div className="match-limit-card featured">
            <h3>Premium</h3>
            <div className="price">150<div className="currency">BDT/mo</div></div>
            <ul>
              <li>Unlimited</li>
              <li>All features</li>
            </ul>
            <Link to="/chat" className="btn btn-primary w-full">Go Premium</Link>
          </div>
        </div>
        <div className="match-limit-actions">
          <Link to="/" className="btn btn-ghost btn-sm">Maybe Later</Link>
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
