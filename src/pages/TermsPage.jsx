import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function TermsPage() {
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
        <h1>Terms of Service</h1>
        <p className="last-updated">Last updated: January 2026</p>
        <p>Welcome to StrangerChat. By using our platform, you agree to the following terms. Please read them carefully. If you do not agree, please do not use the service.</p>
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using StrangerChat, you agree to be bound by these Terms of Service. We reserve the right to update these terms at any time. Continued use after changes constitutes acceptance of the new terms.</p>
        <h2>2. Eligibility</h2>
        <p>You must be at least 18 years old to use StrangerChat. By using the service, you represent and warrant that you meet this age requirement. If you are between 13 and 18, you may only use the service with parental consent.</p>
        <h2>3. User Conduct</h2>
        <p>You agree to use StrangerChat responsibly and respectfully. Prohibited behaviour includes but is not limited to:</p>
        <ul>
          <li>Harassment, hate speech, or discriminatory language</li>
          <li>Sharing explicit, violent, or illegal content</li>
          <li>Impersonating others or misrepresenting identity</li>
          <li>Spamming, soliciting, or advertising</li>
          <li>Attempting to bypass moderation or safety systems</li>
          <li>Collecting data about other users without consent</li>
        </ul>
        <p>Violation of these rules may result in immediate and permanent ban without warning.</p>
        <h2>4. Anonymity and Privacy</h2>
        <p>StrangerChat is designed for anonymous use. You are responsible for what you choose to share. Do not disclose personal information — including your name, address, phone number, financial details, or any identifying data — to other users. We are not liable for information you voluntarily share.</p>
        <h2>5. Moderation and Reporting</h2>
        <p>We employ automated AI moderation and manual review to enforce community standards. You may report violations using the in-chat reporting feature. Reported users may be investigated and banned at our discretion. We are not obligated to disclose moderation decisions.</p>
        <h2>6. Premium Subscriptions</h2>
        <p>Premium subscriptions are billed monthly and automatically renew unless cancelled. You may cancel at any time; Premium benefits continue until the end of the current billing period. Refunds are available within 7 days of initial purchase. Pricing is subject to change with 30 days notice.</p>
        <h2>7. Limitation of Liability</h2>
        <p>StrangerChat is provided "as is" without warranties of any kind. We are not liable for damages arising from the use or inability to use the service, including but not limited to emotional distress, data loss, or third-party actions. Our total liability shall not exceed the amount paid by you in the preceding 12 months.</p>
        <h2>8. Termination</h2>
        <p>We reserve the right to suspend or terminate access to StrangerChat at any time, with or without reason, and with or without notice. Upon termination, your right to use the service immediately ceases.</p>
        <h2>9. Governing Law</h2>
        <p>These terms are governed by the laws of Bangladesh. Any disputes shall be resolved in the courts of Dhaka, Bangladesh.</p>
        <h2>10. Contact</h2>
        <p>For questions about these terms, reach us at <a href="mailto:legal@strangerchat.com" className="legal-link">legal@strangerchat.com</a>.</p>
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