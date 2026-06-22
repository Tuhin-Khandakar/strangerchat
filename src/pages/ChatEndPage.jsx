import { Link } from 'react-router-dom'

export default function ChatEndPage() {
  return (
    <div className="chat-end-page">
      <div className="chat-end-body">
        <div className="chat-end-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h1>Chat Ended</h1>
        <p>Your conversation has ended. Here's a quick summary of your chat.</p>
        <div className="chat-end-stats">
          <div className="chat-end-stat">
            <div className="chat-end-stat-value">4m 32s</div>
            <div className="chat-end-stat-label">Duration</div>
          </div>
          <div className="chat-end-stat">
            <div className="chat-end-stat-value">24</div>
            <div className="chat-end-stat-label">Messages</div>
          </div>
        </div>
        <div className="chat-end-rating">
          <p>Rate your conversation</p>
          <div className="ce-star-row">
            <button className="ce-star-btn" aria-label="1 star">★</button>
            <button className="ce-star-btn" aria-label="2 stars">★</button>
            <button className="ce-star-btn" aria-label="3 stars">★</button>
            <button className="ce-star-btn" aria-label="4 stars">★</button>
            <button className="ce-star-btn" aria-label="5 stars">★</button>
          </div>
        </div>
        <div className="chat-end-actions">
          <Link to="/chat" className="btn btn-primary">Chat Again</Link>
          <Link to="/" className="btn btn-outline">Back to Home</Link>
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
