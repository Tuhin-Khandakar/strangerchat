import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function PricingPage() {
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
            <p className="badge badge-accent">Simple Pricing</p>
            <h1 className="display-lg">Free Forever. Premium for More.</h1>
            <p className="body-lg muted-text">Start chatting instantly with zero commitment. Upgrade to Premium for unlimited access to the full StrangerChat experience.</p>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="pricing-grid fade-in">
            <div className="pricing-card">
              <div className="pricing-name">Free</div>
              <div className="pricing-amount">Free</div>
              <ul className="pricing-features">
                <li>50 free matches (Per Day)</li>
                <li>Unlimited text per chat</li>
                <li>Global matching</li>
                <li>AI safety moderation</li>
                <li>Standard encryption</li>
                <li>60-minute chat limit</li>
              </ul>
              <Link to="/chat" className="btn btn-outline w-full">Get Started Free</Link>
            </div>
            <div className="pricing-card featured">
              <div className="pricing-badge">Most Popular</div>
              <div className="pricing-name pricing-name-accent">Premium</div>
              <div className="pricing-amount">150<span className="price-currency"> BDT/mo</span></div>
              <ul className="pricing-features">
                <li>Unlimited matches</li>
                <li>No chat time limit</li>
                <li>Real-time translation</li>
                <li>Ad-free experience</li>
                <li>End-to-end encryption</li>
                <li>Priority support</li>
              </ul>
              <Link to="/chat" className="btn btn-primary w-full">Go Premium</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="heading-xl">Compare Plans Side by Side</h2>
            <p className="body-lg muted-text">See exactly what you get with each tier at a glance.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="pricing-table fade-in">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Free</th>
                  <th>Premium</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Matches per day</td>
                  <td><span className="check">✓</span> 50 / day</td>
                  <td><span className="check">✓</span> Unlimited</td>
                </tr>
                <tr>
                  <td>Chat time limit</td>
                  <td>60 minutes</td>
                  <td><span className="check">✓</span> No limit</td>
                </tr>
                <tr>
                  <td>Real-time translation</td>
                  <td>—</td>
                  <td><span className="check">✓</span></td>
                </tr>
                <tr>
                  <td>Ad-free experience</td>
                  <td>—</td>
                  <td><span className="check">✓</span></td>
                </tr>
                <tr>
                  <td>AI moderation</td>
                  <td><span className="check">✓</span></td>
                  <td><span className="check">✓</span></td>
                </tr>
                <tr>
                  <td>Priority support</td>
                  <td>—</td>
                  <td><span className="check">✓</span></td>
                </tr>
                <tr>
                  <td>End-to-end encryption</td>
                  <td>Standard</td>
                  <td><span className="check">✓</span> Full E2E</td>
                </tr>
                <tr>
                  <td>Interest-based matching</td>
                  <td>—</td>
                  <td><span className="check">✓</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container-sm">
          <div className="section-header">
            <h2 className="heading-xl">Billing &amp; Plan FAQ</h2>
          </div>
          <div className="faq-list">
            <div className="faq-item">
              <button className="faq-trigger">
                Can I stay on Free forever?
                <span className="faq-icon"></span>
              </button>
              <div className="faq-answer">
                <div className="faq-answer-inner">Absolutely. The Free tier never expires. You get 50 free matches per day with no time limit on when to use them. Upgrade only when you want more.</div>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-trigger">
                What payment methods do you accept?
                <span className="faq-icon"></span>
              </button>
              <div className="faq-answer">
                <div className="faq-answer-inner">We accept all major credit and debit cards, along with mobile banking options including bKash, Nagad, and Rocket for local users. All payments are processed securely.</div>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-trigger">
                Can I cancel my Premium subscription?
                <span className="faq-icon"></span>
              </button>
              <div className="faq-answer">
                <div className="faq-answer-inner">Yes, you can cancel anytime from your account settings. Your Premium benefits remain active until the end of the current billing period. No cancellation fees.</div>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-trigger">
                Is there a free trial of Premium?
                <span className="faq-icon"></span>
              </button>
              <div className="faq-answer">
                <div className="faq-answer-inner">We occasionally offer trial promotions. Check back or follow us on social media for announcements. In the meantime, the Free tier gives you a solid experience to start with.</div>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-trigger">
                Do you offer refunds?
                <span className="faq-icon"></span>
              </button>
              <div className="faq-answer">
                <div className="faq-answer-inner">We have a 7-day refund policy for new Premium subscriptions. If you are not satisfied, contact our support team and we will process a full refund — no questions asked.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container-sm">
          <h2 className="heading-xl">Start with Free. Upgrade when you need.</h2>
          <p>No credit card required. Start chatting in under two seconds.</p>
          <Link to="/chat" className="btn btn-lg btn-contrast">Start Chatting Free</Link>
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