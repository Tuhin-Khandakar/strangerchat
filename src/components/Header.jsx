import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Header() {
  useEffect(function () {
    var theme = document.documentElement.getAttribute('data-theme')
    document.querySelectorAll('.theme-toggle svg use').forEach(function (u) {
      u.setAttribute('href', theme === 'dark' ? '#icon-sun' : '#icon-moon')
    })
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

  useEffect(function () {
    function closeNav(e) {
      if (!e.target.closest('.site-header')) {
        document.querySelectorAll('.nav-links.open').forEach(function (el) { el.classList.remove('open') })
      }
    }
    document.addEventListener('click', closeNav)
    return function () { document.removeEventListener('click', closeNav) }
  }, [])

  return (
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <use href="#icon-moon" />
            </svg>
          </button>
          <Link to="/chat" className="nav-cta">Start Chatting</Link>
        </nav>
        <button className="nav-toggle" aria-label="Toggle navigation" onClick={toggleNav}>
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
  )
}
