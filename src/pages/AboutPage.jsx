import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function AboutPage() {
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
            <h1 className="display-lg">About StrangerChat</h1>
            <p className="body-lg muted-text">We believe the internet should connect people, not profile them. StrangerChat was born from a simple idea: anonymous conversation, done right.</p>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container-sm">
          <div className="fade-in container-sm">
            <h2 className="heading-xl mb-4">The Story Behind StrangerChat</h2>
            <p className="body-md mb-4">StrangerChat started in 2024 as a side project by a small team of engineers frustrated with the state of online chat platforms. Existing services were cluttered with ads, demanded personal information, and failed to protect user privacy.</p>
            <p className="body-md mb-4">We set out to build something different — a platform where anonymity is the default, not an afterthought. Where conversations are encrypted end-to-end and vanish when you disconnect. Where safety is powered by AI but guided by human empathy.</p>
            <p className="body-md mb-4">What started as a weekend experiment quickly grew into a global community. Today, StrangerChat connects thousands of people daily across more than 100 countries. We remain independent, privacy-focused, and committed to our founding mission.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-sm text-center">
          <div className="section-header">
            <h2 className="heading-xl">Redefining Global Connection</h2>
            <p className="body-lg muted-text section-subtitle">StrangerChat exists to make the world feel smaller. We tear down barriers — borders, language, identity — and create space for genuine human connection. No profiles, no personas. Just people talking to people.</p>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <p className="badge badge-accent">What We Stand For</p>
            <h2 className="heading-xl">Our Core Values</h2>
          </div>
          <div className="grid-2 fade-in">
            <div className="feature-card">
              <div className="feature-icon feature-icon-accent"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <h3>Privacy First</h3>
              <p>Your identity belongs to you. We design every system with the principle of data minimalism — collect nothing, store nothing, trust no one with your information.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon-online"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
              <h3>Meaningful Connection</h3>
              <p>We measure success in conversations had, not minutes spent. Our platform is built to foster real, thoughtful exchanges between people who would never otherwise meet.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon-warning"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
              <h3>Safety by Design</h3>
              <p>Safety is not bolted on — it is baked into every layer of the platform. From AI moderation to encryption to human oversight, we protect our community relentlessly.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon-accent"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
              <h3>Continuous Innovation</h3>
              <p>The internet evolves. Threats evolve. We invest constantly in better encryption, smarter moderation, and cleaner design to stay ahead of what our community needs.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="heading-xl">StrangerChat in Numbers</h2>
            <p className="body-lg muted-text">Real impact from a platform built on trust.</p>
          </div>
          <div className="grid-4 fade-in" style={{ textAlign: 'center' }}>
            <div className="card"><p className="stat-display">—</p><p className="label stat-label-muted">Active users</p></div>
            <div className="card"><p className="stat-display">—</p><p className="label stat-label-muted">Countries reached</p></div>
            <div className="card"><p className="stat-display">—</p><p className="label stat-label-muted">Conversations daily</p></div>
            <div className="card"><p className="stat-display">—</p><p className="label stat-label-muted">Team members</p></div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container-sm">
          <h2 className="heading-xl">Join our global community</h2>
          <p>No sign-up required. Meet someone new in under two seconds.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/chat" className="btn btn-lg btn-contrast">Start Chatting</Link>
            <Link to="/blog" className="btn btn-lg btn-border-light">Read Our Blog</Link>
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