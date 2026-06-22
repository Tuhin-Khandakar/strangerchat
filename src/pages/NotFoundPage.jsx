import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
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
      <main className="not-found-body">
        <div className="not-found-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h1 className="display-xl mb-2">404</h1>
        <p className="body-lg muted-text not-found-desc">This page wandered off. The internet is vast — maybe start a chat instead?</p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link to="/chat" className="btn btn-primary btn-lg">Start Chatting</Link>
          <Link to="/" className="btn btn-outline btn-lg">Back to Home</Link>
        </div>
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link to="/" className="site-logo"><span className="logo-mark">SC</span>StrangerChat</Link>
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
  )
}