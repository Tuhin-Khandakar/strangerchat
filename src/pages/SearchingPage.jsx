import { Link } from 'react-router-dom'

export default function SearchingPage() {
  return (
    <div className="searching-page">
      <div className="searching-body">
        <div className="searching-radar-box">
          <div className="searching-ring-expand"></div>
          <div className="searching-ring-expand"></div>
          <div className="searching-ring-expand"></div>
          <div className="searching-icon-box">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
        </div>
        <h1>Finding your match...</h1>
        <p>Scanning global network</p>
        <div className="searching-stats">
          <div className="searching-stat">
            <div className="searching-stat-num">3,421</div>
            <div className="searching-stat-label">Online Now</div>
          </div>
          <div className="searching-stat">
            <div className="searching-stat-num">18M+</div>
            <div className="searching-stat-label">Matches Made</div>
          </div>
          <div className="searching-stat">
            <div className="searching-stat-num">&lt;2s</div>
            <div className="searching-stat-label">Avg. Match Time</div>
          </div>
        </div>
        <div className="searching-tips">
          <h3>Tips for great conversations</h3>
          <div className="searching-tip">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Stay safe — never share personal info
          </div>
          <div className="searching-tip">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Be open-minded — everyone has a story
          </div>
          <div className="searching-tip">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Report bad behaviour immediately
          </div>
        </div>
        <Link to="/" className="btn btn-ghost">Cancel</Link>
      </div>
      <footer className="state-page-footer">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <span>&copy; 2026 StrangerChat</span>
      </footer>
    </div>
  )
}
