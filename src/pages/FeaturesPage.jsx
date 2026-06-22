import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function FeaturesPage() {
  useEffect(function () {
    var theme = document.documentElement.getAttribute('data-theme')
    document.querySelectorAll('.theme-toggle svg use').forEach(function (u) {
      u.setAttribute('href', theme === 'dark' ? '#icon-sun' : '#icon-moon')
    })
  }, [])

  useEffect(function () {
    function closeNav(e) {
      if (!e.target.closest('.site-header')) {
        document.querySelectorAll('.nav-links.open').forEach(function (el) { el.classList.remove('open') })
      }
    }
    document.addEventListener('click', closeNav)
    return function () { document.removeEventListener('click', closeNav) }
  }, [])

  function toggleTheme() {
    var html = document.documentElement
    var cur = html.getAttribute('data-theme')
    var next = cur === 'dark' ? 'light' : 'dark'
    html.setAttribute('data-theme', next)
    localStorage.setItem('strangerchat-theme', next)
    document.querySelectorAll('.theme-toggle svg use').forEach(function (u) {
      u.setAttribute('href', next === 'dark' ? '#icon-sun' : '#icon-moon')
    })
  }
  function toggleNav(e) {
    e.currentTarget.closest('.site-header').querySelector('.nav-links').classList.toggle('open')
  }
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="site-logo">
            <span className="logo-mark">SC</span>
            StrangerChat
          </Link>
          <nav className="nav-links">
            <Link to="/features">Features</Link>
            <a href="/#safety">Safety</a>
            <Link to="/pricing">Pricing</Link>
            <Link to="/about">About</Link>
            <button className="theme-toggle" aria-label="Toggle theme" onClick={toggleTheme}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><use href="#icon-moon" /></svg>
            </button>
            <Link to="/chat" className="nav-cta">Start Chatting</Link>
          </nav>
          <button className="nav-toggle" aria-label="Toggle navigation" onClick={toggleNav}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>

      <section className="section page-hero">
        <div className="container">
          <div className="section-header">
            <h1 className="display-lg">All Features</h1>
            <p className="body-lg muted-text">StrangerChat combines cutting-edge technology with thoughtful design to deliver the finest anonymous chat experience available.</p>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="grid-3">
            <div className="feature-card fade-in stagger-1">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
              <h3>Anonymous Chat</h3>
              <p>Connect without revealing who you are. No accounts, no emails, no personal data required. Every session is a clean slate.</p>
            </div>
            <div className="feature-card fade-in stagger-2">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
              <h3>Instant Matching</h3>
              <p>Find a conversation partner in under two seconds. Our smart matching algorithm pairs you with someone compatible instantly.</p>
            </div>
            <div className="feature-card fade-in stagger-3">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v5H9z"/><path d="M9 16h6v5H9z"/><path d="M3 9h5v6H3z"/><path d="M16 9h5v6h-5z"/></svg></div>
              <h3>AI Moderation</h3>
              <p>Our proprietary AI scans every message in real-time, detecting and blocking toxic behaviour before it reaches you. Safety first, always.</p>
            </div>
            <div className="feature-card fade-in stagger-1">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <h3>End-to-End Encryption</h3>
              <p>Every message is encrypted from sender to receiver. Not even StrangerChat can read your conversations. Absolute privacy by design.</p>
            </div>
            <div className="feature-card fade-in stagger-2">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10"/><path d="M12 2a10 10 0 0 0-10 10 10 10 0 0 0 10 10"/><path d="M2 12h20"/><path d="M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10"/><path d="M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10"/></svg></div>
              <h3>Real-Time Translation</h3>
              <p>Break language barriers with on-the-fly translation. Chat with anyone, anywhere, in any language. Available on Premium.</p>
            </div>
            <div className="feature-card fade-in stagger-3">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
              <h3>Global Community</h3>
              <p>Meet people from every country and culture. StrangerChat connects you with a diverse, worldwide community of curious minds.</p>
            </div>
            <div className="feature-card fade-in stagger-1">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div>
              <h3>Cross-Platform</h3>
              <p>Works flawlessly on desktop, tablet, and phone. No app download needed — just open your browser and start chatting from any device.</p>
            </div>
            <div className="feature-card fade-in stagger-2">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
              <h3>Premium Perks</h3>
              <p>Unlimited matches, ad-free experience, real-time translation, and interest-based filters. Unlock the full StrangerChat experience.</p>
            </div>
            <div className="feature-card fade-in stagger-3">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div>
              <h3>No Data Retention</h3>
              <p>Conversations disappear when you disconnect. We do not store chat logs, IP addresses, or any identifying information. Ever.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="heading-xl">How It Works</h2>
            <p className="body-lg muted-text">Three simple steps to your first conversation.</p>
          </div>
          <div className="grid-3">
            <div className="feature-card fade-in stagger-1">
              <div className="feature-icon step-number">1</div>
              <h3>Visit the Site</h3>
              <p>Open StrangerChat in your browser. No sign-up, no registration, no personal details. Just a blank slate and a button.</p>
            </div>
            <div className="feature-card fade-in stagger-2">
              <div className="feature-icon step-number">2</div>
              <h3>Click Start</h3>
              <p>Press the Start Chatting button. Our matching engine finds you a random stranger anywhere in the world in under 2 seconds.</p>
            </div>
            <div className="feature-card fade-in stagger-3">
              <div className="feature-icon step-number">3</div>
              <h3>Start Talking</h3>
              <p>You are now connected. Chat freely, share ideas, and explore new perspectives. When you are done, just disconnect and vanish.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container-sm">
          <h2 className="heading-xl">Ready to experience it?</h2>
          <p>No sign-up required. Start your first conversation in under two seconds.</p>
          <Link to="/chat" className="btn btn-lg btn-contrast">Start Chatting</Link>
        </div>
      </section>

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
    </>
  );
}