import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTypewriter } from '../hooks/useTypewriter'
import { useScrollReveal } from '../hooks/useScrollReveal'
import useFaqAccordion from '../hooks/useFaqAccordion'
import { useLiveCount } from '../hooks/useLiveCount'

function playDemo() {
  var overlay = document.getElementById('demo-play-overlay')
  if (!overlay || overlay.classList.contains('played')) return
  overlay.classList.add('played')
  overlay.style.opacity = '0'
  overlay.style.pointerEvents = 'none'
  var demoArea = document.querySelector('.demo-msg-area')
  if (!demoArea) return
  var msgs = demoArea.querySelectorAll('.message-row, .conn-msg')
  var timing = [0, 600, 900, 1100, 1300, 1600, 1900, 2200]
  msgs.forEach(function (el, i) {
    el.style.opacity = '0'
    el.style.transform = 'translateY(8px)'
  })
  msgs.forEach(function (el, i) {
    var delay = i < timing.length ? timing[i] : 2400 + (i - timing.length) * 300
    setTimeout(function () {
      el.style.opacity = ''
      el.style.transform = ''
    }, delay)
  })
}

export default function LandingPage() {
  const typewriterText = useTypewriter(['Instantly.', 'Freely.', 'Globally.'], { typeSpeed: 80, deleteSpeed: 40, pauseTime: 2000 })
  const liveCount = useLiveCount()
  const handleFaqClick = useFaqAccordion()

  useScrollReveal()

  useEffect(() => {
    fetch('/api/reviews')
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          const grid = document.getElementById('reviews-grid')
          const empty = document.getElementById('reviews-empty')
          if (empty) empty.style.display = 'none'
          if (grid) {
            data.forEach(r => {
              const card = document.createElement('div')
              card.className = 'review-card fade-in stagger-1'
              const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)
              card.innerHTML = `
                <div class="stars">${stars.split('').map(s => `<span class="star ${s === '★' ? 'filled' : 'empty'}">${s}</span>`).join('')}</div>
                <p class="body-sm muted-text">"${r.text}"</p>
              `
              grid.appendChild(card)
            })
          }
        }
      })
      .catch(() => {})
  }, [])

  useEffect(function () {
    var canvas = document.getElementById('hero-network-canvas')
    if (!canvas || !canvas.getContext) return
    var ctx = canvas.getContext('2d')
    var particles = [], W, H
    var COUNT = 70, CONNECT_DIST = 120
    function resize() {
      W = canvas.width = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)
    for (var i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: 1.5 + Math.random() * 2
      })
    }
    var animId
    function anim() {
      ctx.clearRect(0, 0, W, H)
      var theme = document.documentElement.getAttribute('data-theme')
      var dotColor = theme === 'dark' ? 'oklch(64% 0.14 170 / 0.45)' : 'oklch(56% 0.12 170 / 0.4)'
      var lineColor = theme === 'dark' ? 'oklch(64% 0.14 170 / 0.12)' : 'oklch(56% 0.12 170 / 0.1)'
      for (var i = 0; i < COUNT; i++) {
        var p = particles[i]
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.fill()
        for (var j = i + 1; j < COUNT; j++) {
          var q = particles[j]
          var dx = p.x - q.x, dy = p.y - q.y
          var dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECT_DIST) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = lineColor
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(anim)
    }
    animId = requestAnimationFrame(anim)
    return function () {
      window.removeEventListener('resize', resize)
      if (animId) cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <>
      <section className="hero-section">
        <canvas id="hero-network-canvas" aria-hidden="true"></canvas>
        <div className="hero-mesh">
          <svg viewBox="0 0 400 400" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="mesh" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1.5" fill="currentColor" opacity="0.3">
                  <animate attributeName="r" values="1.5;2.5;1.5" dur="4s" repeatCount="indefinite"/>
                </circle>
                <line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.08"/>
                <line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.08"/>
              </pattern>
            </defs>
            <rect width="400" height="400" fill="url(#mesh)"/>
          </svg>
        </div>
        <p className="badge badge-accent"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:-1}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> No sign-up required</p>
        <h1 className="display-xl">
          Talk to strangers.<br />
          <span id="typewriter-target">{typewriterText}</span>
        </h1>
        <p className="body-lg">
          The most refined anonymous chat experience. No accounts, no tracking.
          Just real conversations with people around the world.
        </p>
        <div className="hero-actions">
          <Link to="/chat" className="btn btn-primary btn-lg">Start Chatting</Link>
          <button className="btn btn-outline btn-lg" onClick={() => document.getElementById('features').scrollIntoView({behavior:'smooth'})}>How It Works</button>
        </div>
      </section>

      <div className="hero-strip">
        <div className="hero-strip-inner">
          <span className="hero-strip-item">
            <span className="hero-strip-dot online"></span>
            No account needed
          </span>
          <span className="hero-strip-divider"></span>
          <span className="hero-strip-item">
            <span className="hero-strip-dot online"></span>
            AI-moderated
          </span>
          <span className="hero-strip-divider"></span>
          <span className="hero-strip-item">
            <span className="hero-strip-dot accent pulse"></span>
            <span id="live-count">{liveCount !== null ? liveCount : '...'}</span> chatting now
          </span>
          <span className="hero-strip-divider"></span>
          <span className="hero-strip-item">
            <span className="hero-strip-dot online"></span>
            No chat logs stored
          </span>
        </div>
      </div>

      <section className="section" id="features">
        <div className="container">
          <div className="section-header">
            <h2 className="heading-xl">Engineered for Connection</h2>
            <p className="body-lg muted-text">Every detail crafted to make meeting new people feel effortless and safe.</p>
          </div>
          <div className="grid-3">
            <div className="feature-card fade-in stagger-1">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></div>
              <h3>2-Second Matching</h3>
              <p>Connect with a stranger anywhere in the world in under 2 seconds. No waiting, no hassle.</p>
            </div>
            <div className="feature-card fade-in stagger-2">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div>
              <h3>AI-Powered Safety</h3>
              <p>Real-time moderation keeps conversations clean. Our AI works 24/7 to detect and block bad behavior.</p>
            </div>
            <div className="feature-card fade-in stagger-3">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
              <h3>100% Anonymous</h3>
              <p>No accounts, no emails, no logs. Your identity stays yours. Conversations vanish when you disconnect.</p>
            </div>
            <div className="feature-card fade-in stagger-1">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg></div>
              <h3>Global Community</h3>
              <p>Meet people from every corner of the world. Break borders and discover new perspectives.</p>
            </div>
            <div className="feature-card fade-in stagger-2">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg></div>
              <h3>Works Everywhere</h3>
              <p>Fully responsive on any device. Desktop, tablet, phone — start chatting from anywhere.</p>
            </div>
            <div className="feature-card fade-in stagger-3">
              <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10"></path><path d="M12 2a10 10 0 0 0-10 10 10 10 0 0 0 10 10"></path><path d="M2 12h20"></path><path d="M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10"></path><path d="M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10"></path></svg></div>
              <h3>Real-Time Translation</h3>
              <p>Premium feature that breaks language barriers. Chat with anyone, in any language, effortlessly.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2 className="heading-xl">See It in Action</h2>
            <p className="body-lg muted-text">A clean, focused interface designed for meaningful conversation.</p>
          </div>
          <div className="demo-frame fade-in" id="demo-frame" style={{position:'relative'}}>
            <div className="demo-play-overlay" id="demo-play-overlay" style={{position:'absolute',inset:0,zIndex:10,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.03)',transition:'opacity 0.4s',cursor:'pointer',borderRadius:'inherit'}}>
              <button className="demo-play-btn" id="demo-play-btn" aria-label="Play demo" onClick={playDemo} style={{width:60,height:60,borderRadius:'50%',background:'var(--accent)',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,0.15)',transition:'transform 0.15s'}}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            </div>
            <div className="demo-header">
              <span className="demo-dot demo-dot-red"></span>
              <span className="demo-dot demo-dot-yellow"></span>
              <span className="demo-dot demo-dot-green"></span>
              <span className="demo-tab">strangerchat.com — connected</span>
            </div>
            <div className="demo-body">
              <div className="demo-sidebar">
                <div className="demo-contact">
                  <div className="demo-avatar demo-avatar-stranger">S</div>
                  <div>
                    <div className="demo-contact-name">Stranger#7F3A</div>
                    <div className="demo-status-online"><span className="hero-strip-dot online"></span> Online</div>
                  </div>
                </div>
                <div className="demo-contact offline">
                  <div className="demo-avatar demo-avatar-muted">N</div>
                  <div>
                    <div className="demo-contact-name muted-text">Neo#B24C</div>
                    <div className="demo-status-offline">Offline</div>
                  </div>
                </div>
              </div>
              <div className="demo-chat-area">
                <div className="demo-msg-area">
                  <div className="conn-msg"><span>Encrypted connection established</span></div>
                  <div className="message-row">
                    <div className="message-bubble stranger">
                      <div className="message-sender-name">Stranger</div>
                      <p>anyone from tokyo here?</p>
                      <span className="message-time">10:42 PM</span>
                    </div>
                  </div>
                  <div className="message-row me fade-in stagger-2">
                    <div className="message-bubble me">
                      <div className="message-sender-name">You</div>
                      <p>not tokyo, but osaka! just visiting.</p>
                      <span className="message-time">10:43 PM</span>
                    </div>
                  </div>
                  <div className="conn-msg"><span>Matched — 2.1s</span></div>
                  <div className="message-row fade-in stagger-3">
                    <div className="message-bubble stranger">
                      <div className="message-sender-name">Stranger</div>
                      <p>oh nice! i was there last week. try the takoyaki in dotonbori.</p>
                      <span className="message-time">10:44 PM</span>
                    </div>
                  </div>
                </div>
                <div className="demo-input-area">
                  <div className="demo-input-row">
                    <div className="chat-input-wrap">
                      <input type="text" placeholder="Type a message..." readOnly className="demo-input" />
                    </div>
                    <div className="btn btn-primary btn-sm demo-send-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="safety">
        <div className="container">
          <div className="section-header">
            <h2 className="heading-xl">Your Safety Is Our Foundation</h2>
            <p className="body-lg muted-text">We've built the most secure anonymous chat platform on the web.</p>
          </div>
          <div className="safety-grid">
            <div className="safety-item fade-in stagger-1">
              <div className="safety-icon safety-icon-accent"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
              <div>
                <h4 className="heading-md">End-to-End Encryption</h4>
                <p className="body-sm muted-text">All messages are encrypted. We literally cannot read your conversations.</p>
              </div>
            </div>
            <div className="safety-item fade-in stagger-2">
              <div className="safety-icon safety-icon-warning"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v5H9z"></path><path d="M9 16h6v5H9z"></path><path d="M3 9h5v6H3z"></path><path d="M16 9h5v6h-5z"></path></svg></div>
              <div>
                <h4 className="heading-md">AI Moderation</h4>
                <p className="body-sm muted-text">Real-time scanning detects and blocks bad behavior before you see it.</p>
              </div>
            </div>
            <div className="safety-item fade-in stagger-3">
              <div className="safety-icon safety-icon-muted"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></div>
              <div>
                <h4 className="heading-md">No Chat Logs Stored</h4>
                <p className="body-sm muted-text">Once you disconnect, your conversation is gone forever. We don't keep records.</p>
              </div>
            </div>
            <div className="safety-item fade-in stagger-4">
              <div className="safety-icon safety-icon-danger"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg></div>
              <div>
                <h4 className="heading-md">One-Click Reporting</h4>
                <p className="body-sm muted-text">Abusive users are banned instantly with a single report. Community safety first.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <p className="badge badge-accent">Simple Pricing</p>
            <h2 className="heading-xl">Free Forever. Premium for More.</h2>
            <p className="body-lg muted-text">Start with 50 free matches. Upgrade when you need unlimited access.</p>
          </div>
          <div className="pricing-grid fade-in">
            <div className="pricing-card">
              <div className="pricing-name">Free</div>
              <div className="pricing-amount">Free</div>
              <ul className="pricing-features">
                <li>50 free matches (Per Day)</li>
                <li>Unlimited text per chat</li>
                <li>Global matching</li>
                <li>AI safety moderation</li>
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
              </ul>
              <Link to="/chat" className="btn btn-primary w-full">Go Premium</Link>
            </div>
          </div>
          <p className="body-sm muted-text mt-6">All plans include AI moderation. Free users get 50 matches.</p>
        </div>
      </section>

      <section className="section">
        <div className="container-sm text-center">
          <div className="section-header">
            <h2 className="heading-xl">What People Say</h2>
            <p className="body-lg muted-text">Real reviews from real chats.</p>
          </div>
          <div className="grid-2" id="reviews-grid">
            <p id="reviews-empty" className="body-sm muted-text reviews-empty">No reviews yet. Be the first to share your experience after a chat!</p>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container-sm">
          <div className="section-header">
            <h2 className="heading-xl">Frequently Asked Questions</h2>
          </div>
          <div className="faq-list">
            <div className="faq-item">
              <button className="faq-trigger" onClick={handleFaqClick}>
                Is my data really anonymous?
                <span className="faq-icon"></span>
              </button>
              <div className="faq-answer">
                <div className="faq-answer-inner">Absolutely. We do not store IP addresses, chat logs, or personal identifiers. Every session is encrypted end-to-end and wiped from our servers the moment you disconnect.</div>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-trigger" onClick={handleFaqClick}>
                How does the AI moderation work?
                <span className="faq-icon"></span>
              </button>
              <div className="faq-answer">
                <div className="faq-answer-inner">Our proprietary AI scans for toxic behavior, harassment, and prohibited content in real-time. It happens instantly and transparently — keeping you safe without getting in your way.</div>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-trigger" onClick={handleFaqClick}>
                Can I report bad users?
                <span className="faq-icon"></span>
              </button>
              <div className="faq-answer">
                <div className="faq-answer-inner">Yes. One-click reporting instantly flags malicious actors for review. Our moderation team acts quickly to keep the community safe.</div>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-trigger" onClick={handleFaqClick}>
                What are the benefits of Premium?
                <span className="faq-icon"></span>
              </button>
              <div className="faq-answer">
                <div className="faq-answer-inner">Premium users get unlimited matches, no chat time limit, real-time translation, interest-based filters, and an entirely ad-free experience for just 150 BDT/month.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container-sm">
          <h2 className="heading-xl">Ready to meet someone new?</h2>
          <p>Join millions of users worldwide. No sign-up required.</p>
          <Link to="/chat" className="btn btn-lg btn-contrast">Start Chatting</Link>
        </div>
      </section>
    </>
  )
}
