import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function BlogPage() {
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

      <section className="blog-hero">
        <h1 className="display-lg">StrangerChat Blog</h1>
        <p className="body-lg muted-text">Thoughts on anonymous connection, online safety, and building a kinder internet.</p>
      </section>

      <div className="container">
        <div className="filter-chips">
          <button className="filter-chip active">All</button>
          <button className="filter-chip">Product</button>
          <button className="filter-chip">Safety</button>
          <button className="filter-chip">Community</button>
          <button className="filter-chip">Updates</button>
        </div>

        <div className="grid-3">
          <article className="blog-card fade-in stagger-1">
            <div className="blog-card-img">Image: Anonymous chat illustration</div>
            <div className="blog-card-body">
              <span className="badge badge-accent">Product</span>
              <h3>Why Anonymous Chat Is More Relevant Than Ever</h3>
              <p>In an age of curated identities, anonymous conversations offer something rare — authentic human connection without the mask.</p>
              <div className="blog-meta"><span>Mar 15, 2026</span><span>4 min read</span></div>
            </div>
          </article>

          <article className="blog-card fade-in stagger-2">
            <div className="blog-card-img">Image: Safety shield concept</div>
            <div className="blog-card-body">
              <span className="badge badge-online">Safety</span>
              <h3>How AI Moderation Keeps Your Conversations Safe</h3>
              <p>Behind the scenes of our real-time moderation system — what it catches, how it learns, and why your privacy stays intact.</p>
              <div className="blog-meta"><span>Mar 10, 2026</span><span>6 min read</span></div>
            </div>
          </article>

          <article className="blog-card fade-in stagger-3">
            <div className="blog-card-img">Image: Global network map</div>
            <div className="blog-card-body">
              <span className="badge badge-warning">Community</span>
              <h3>Stories From Around the World: Our Community in 2026</h3>
              <p>From Tokyo to Buenos Aires, meet the people who make StrangerChat a global home for honest conversation.</p>
              <div className="blog-meta"><span>Feb 28, 2026</span><span>8 min read</span></div>
            </div>
          </article>

          <article className="blog-card fade-in stagger-1">
            <div className="blog-card-img">Image: Chat interface preview</div>
            <div className="blog-card-body">
              <span className="badge badge-accent">Updates</span>
              <h3>Introducing Real-Time Translation for Premium Users</h3>
              <p>Break language barriers with our new translation engine. Chat with anyone, anywhere, in any language.</p>
              <div className="blog-meta"><span>Feb 20, 2026</span><span>3 min read</span></div>
            </div>
          </article>

          <article className="blog-card fade-in stagger-2">
            <div className="blog-card-img">Image: Privacy lock graphic</div>
            <div className="blog-card-body">
              <span className="badge badge-online">Safety</span>
              <h3>Why We Don't Store Your Chat Logs — And Never Will</h3>
              <p>Our commitment to privacy goes beyond marketing. Here's the technical reality of zero-log anonymous chat.</p>
              <div className="blog-meta"><span>Feb 12, 2026</span><span>5 min read</span></div>
            </div>
          </article>

          <article className="blog-card fade-in stagger-3">
            <div className="blog-card-img">Image: Growth chart</div>
            <div className="blog-card-body">
              <span className="badge badge-accent">Updates</span>
              <h3>StrangerChat by the Numbers: 2025 Year in Review</h3>
              <p>Millions of conversations, zero data breaches, and a growing community dedicated to meaningful connection.</p>
              <div className="blog-meta"><span>Jan 5, 2026</span><span>4 min read</span></div>
            </div>
          </article>
        </div>

        <div className="pagination">
          <button className="page-btn active">1</button>
          <button className="page-btn">2</button>
          <button className="page-btn">3</button>
          <button className="page-btn">4</button>
          <button className="page-btn next">Next →</button>
        </div>
      </div>

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