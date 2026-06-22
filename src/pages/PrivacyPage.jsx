import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function PrivacyPage() {
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
    <div>
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
      <main className="legal-page">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: January 2026</p>
        <p>StrangerChat was built from the ground up with privacy as its founding principle. This policy describes how we handle your information — or more importantly, how we don't.</p>
        <h2>Information We Collect</h2>
        <p>We collect almost nothing. When you use StrangerChat, we do not require an account, email address, or any personal details. We do not store IP addresses, browser fingerprints, or any identifying metadata. The only data processed is the content of your messages during an active chat session, which is encrypted in transit and immediately discarded when the connection ends. Aggregate, non-identifiable analytics (such as pageview counts) may be collected to improve the service.</p>
        <h2>How We Use It</h2>
        <p>The minimal data we process is used solely to facilitate real-time chat connections. Message content is temporarily held in memory only while both parties are connected and is permanently deleted within milliseconds of disconnection. Analytics data is anonymized and used exclusively for service improvement. We never sell, share, or monetize your data — because we don't have any to sell.</p>
        <h2>Data Retention</h2>
        <p>StrangerChat operates a strict zero-log policy. Chat logs are never written to disk. IP addresses are not logged. Session data is not recorded. When your chat ends, every trace of the conversation is permanently and irreversibly deleted from our systems. There is no backup, no cache, and no archive.</p>
        <h2>Third-Party Services</h2>
        <p>We do not use third-party analytics, tracking pixels, or advertising networks. Our platform is self-contained and does not share data with any external service. The only exception is our payment processor for Premium subscriptions, which handles transaction data independently under their own privacy policy.</p>
        <h2>Your Rights</h2>
        <p>Since we collect no personal data, there is little to access, correct, or delete. However, if you have questions about our privacy practices, you are always welcome to contact us at <a href="mailto:privacy@strangerchat.com" className="legal-link">privacy@strangerchat.com</a>. We believe privacy is a right, not a feature — and we design accordingly.</p>
        <h2>Changes to This Policy</h2>
        <p>If we make changes to this privacy policy, we will update the "Last updated" date at the top of this page. Significant changes may be announced via our blog or through the platform itself. We encourage you to review this page periodically.</p>
        <h2>Contact</h2>
        <p>Questions, concerns, or feedback? Reach us at <a href="mailto:privacy@strangerchat.com" className="legal-link">privacy@strangerchat.com</a>. We take privacy seriously and respond to all inquiries promptly.</p>
      </main>
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
    </div>
  )
}