import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function SafetyPage() {
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
          <Link to="/" className="site-logo"><span className="logo-mark">SC</span>StrangerChat</Link>
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
          <button className="nav-toggle" aria-label="Toggle navigation" onClick={toggleNav}><span></span><span></span><span></span></button>
        </div>
      </header>

      <section className="section page-hero">
        <div className="container">
          <div className="section-header">
            <p className="badge badge-accent">Enterprise-Grade Privacy</p>
            <h1 className="display-lg">Trust &amp; Safety</h1>
            <p className="body-lg muted-text">Your safety is the foundation of everything we build. StrangerChat combines advanced technology with human oversight to create the safest anonymous chat platform available.</p>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2 className="heading-xl">How We Keep You Safe</h2>
            <p className="body-lg muted-text">Every layer of our platform is designed with privacy and protection in mind.</p>
          </div>
          <div className="safety-grid">
            <div className="safety-item fade-in stagger-1">
              <div className="safety-icon safety-icon-accent"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <div><h4 className="heading-md">End-to-End Encryption</h4><p className="body-sm muted-text">Messages are encrypted on your device and decrypted only on your conversation partner's device. No intermediaries, no backdoors, no exceptions. Your conversations belong only to you.</p></div>
            </div>
            <div className="safety-item fade-in stagger-2">
              <div className="safety-icon safety-icon-warning"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v5H9z"/><path d="M9 16h6v5H9z"/><path d="M3 9h5v6H3z"/><path d="M16 9h5v6h-5z"/></svg></div>
              <div><h4 className="heading-md">AI Moderation Engine</h4><p className="body-sm muted-text">Our machine learning models scan for harassment, hate speech, and prohibited content in real-time. The system flags violations within milliseconds, keeping harmful behaviour out of your chat.</p></div>
            </div>
            <div className="safety-item fade-in stagger-3">
              <div className="safety-icon safety-icon-muted"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div>
              <div><h4 className="heading-md">Strict No-Logs Policy</h4><p className="body-sm muted-text">We do not store IP addresses, chat logs, session data, or personal identifiers. When you disconnect, every trace of your conversation is permanently deleted from our servers.</p></div>
            </div>
            <div className="safety-item fade-in stagger-4">
              <div className="safety-icon safety-icon-danger"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></div>
              <div><h4 className="heading-md">One-Click Reporting</h4><p className="body-sm muted-text">See something wrong? Report any user with a single click. Our moderation team reviews reports within minutes and takes immediate action, including permanent bans for violations.</p></div>
            </div>
            <div className="safety-item fade-in stagger-1">
              <div className="safety-icon safety-icon-accent"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
              <div><h4 className="heading-md">Community Guidelines</h4><p className="body-sm muted-text">Every user agrees to our clear community standards. Hate speech, harassment, explicit content, and spam are strictly prohibited. Our guidelines create a respectful space for everyone.</p></div>
            </div>
            <div className="safety-item fade-in stagger-2">
              <div className="safety-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
              <div><h4 className="heading-md">Moderation Team</h4><p className="body-sm muted-text">Behind the AI is a dedicated team of human moderators who review edge cases, handle escalated reports, and continuously improve our safety systems. Technology plus humanity.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <p className="badge badge-muted">By the Numbers</p>
            <h2 className="heading-xl">Our Safety Impact</h2>
            <p className="body-lg muted-text">Transparency is a core value. Here is what our safety systems have achieved.</p>
          </div>
          <div className="grid-4 fade-in">
            <div className="card text-center"><p className="stat-display">—</p><p className="label stat-label-muted">Reports handled</p></div>
            <div className="card text-center"><p className="stat-display">—</p><p className="label stat-label-muted">Bans issued</p></div>
            <div className="card text-center"><p className="stat-display">—</p><p className="label stat-label-muted">Messages moderated daily</p></div>
            <div className="card text-center"><p className="stat-display">—</p><p className="label stat-label-muted">Uptime</p></div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container-sm">
          <div className="section-header">
            <h2 className="heading-xl">Our Commitment to You</h2>
            <p className="body-lg muted-text">Safety is not a feature — it is the foundation. We invest heavily in moderation, encryption, and privacy infrastructure to ensure StrangerChat remains a place for genuine, secure connection.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/terms" className="btn btn-outline">Terms of Service</Link>
            <Link to="/privacy" className="btn btn-outline">Privacy Policy</Link>
            <Link to="/chat" className="btn btn-primary">Start Chatting</Link>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand"><Link to="/" className="site-logo"><span className="logo-mark">SC</span>StrangerChat</Link><p>Redefining global connection through elegant technology and uncompromising privacy.</p></div>
            <div className="footer-col"><h4>Product</h4><Link to="/features">Features</Link><Link to="/pricing">Pricing</Link><Link to="/safety">Safety</Link></div>
            <div className="footer-col"><h4>Company</h4><Link to="/about">About</Link><Link to="/blog">Blog</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div>
            <div className="footer-col"><h4>Connect</h4><a href="https://twitter.com/strangerchat" target="_blank" rel="noopener">Twitter</a><a href="https://discord.gg/strangerchat" target="_blank" rel="noopener">Discord</a><a href="https://github.com/strangerchat" target="_blank" rel="noopener">GitHub</a></div>
          </div>
          <div className="footer-bottom"><span>&copy; 2026 StrangerChat. All rights reserved.</span><span>Built for meaningful connection</span></div>
        </div>
      </footer>
    </>
  );
}