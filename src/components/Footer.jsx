import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="site-logo">
              <span className="logo-mark">SC</span>
              StrangerChat
            </Link>
            <p>Redefining global connection through elegant technology and uncompromising privacy.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/safety">Safety</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/about">About</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
          <div className="footer-col">
            <h4>Connect</h4>
            <a href="https://twitter.com/strangerchat" target="_blank" rel="noopener">Twitter</a>
            <a href="https://discord.gg/strangerchat" target="_blank" rel="noopener">Discord</a>
            <a href="https://github.com/strangerchat" target="_blank" rel="noopener">GitHub</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2026 StrangerChat. All rights reserved.</span>
          <span>Built for meaningful connection</span>
        </div>
      </div>
    </footer>
  )
}
