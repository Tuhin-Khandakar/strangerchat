import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function AdminPage() {
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

  return (
    <div className="admin-body">
      <header className="admin-header">
        <h1>Admin Console</h1>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <button className="theme-toggle btn btn-ghost btn-icon" aria-label="Toggle theme" onClick={toggleTheme}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><use href="#icon-moon" /></svg>
          </button>
          <Link to="/" className="btn btn-ghost btn-sm">← Back to Site</Link>
        </div>
      </header>
      <div className="admin-wrapper">
        <div className="mb-8">
          <h2 className="heading-lg">Dashboard</h2>
          <p className="body-sm muted-text">Real-time analytics for StrangerChat</p>
        </div>
        <div className="admin-grid">
          <div className="stat-card">
            <div className="stat-label">Total Pageviews</div>
            <div className="stat-value">12,847,392</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Unique Visitors</div>
            <div className="stat-value">4,215,680</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Online Now</div>
            <div className="stat-value admin-stat-online">3,421</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Matches</div>
            <div className="stat-value">18,562,104</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Premium Users</div>
            <div className="stat-value admin-stat-accent">128,431</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Subscribers</div>
            <div className="stat-value">142,887</div>
          </div>
        </div>
        <section className="section" style={{padding: '32px 0'}}>
          <h3 className="heading-md mb-4">Recent Visitors</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Visitor ID</th>
                  <th>Country</th>
                  <th>Page</th>
                  <th>Duration</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="mono">v-9a3f2c</span></td>
                  <td>US · United States</td>
                    <td>/chat</td>
                    <td>4m 12s</td>
                  <td>2 min ago</td>
                </tr>
                <tr>
                  <td><span className="mono">v-7b1e8d</span></td>
                  <td>JP · Japan</td>
                  <td>/</td>
                  <td>1m 38s</td>
                  <td>5 min ago</td>
                </tr>
                <tr>
                  <td><span className="mono">v-4f5a2b</span></td>
                  <td>DE · Germany</td>
                    <td>/features</td>
                    <td>3m 04s</td>
                  <td>8 min ago</td>
                </tr>
                <tr>
                  <td><span className="mono">v-c8d9e1</span></td>
                  <td>BR · Brazil</td>
                    <td>/pricing</td>
                    <td>2m 55s</td>
                  <td>12 min ago</td>
                </tr>
                <tr>
                  <td><span className="mono">v-3a7f6c</span></td>
                  <td>IN · India</td>
                    <td>/chat</td>
                    <td>6m 21s</td>
                  <td>15 min ago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className="section section-alt admin-top-pages">
          <div className="admin-top-pages-inner">
            <h3 className="heading-md mb-4">Top Pages</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Views</th>
                    <th>Unique</th>
                    <th>Avg. Time</th>
                    <th>Bounce Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>/chat</td>
                    <td>3,421,890</td>
                    <td>1,204,566</td>
                    <td>8m 12s</td>
                    <td>32.4%</td>
                  </tr>
                  <tr>
                    <td>/</td>
                    <td>2,845,102</td>
                    <td>1,892,430</td>
                    <td>1m 48s</td>
                    <td>41.7%</td>
                  </tr>
                  <tr>
                    <td>/features</td>
                    <td>1,023,456</td>
                    <td>678,214</td>
                    <td>2m 34s</td>
                    <td>28.9%</td>
                  </tr>
                  <tr>
                    <td>/pricing</td>
                    <td>892,341</td>
                    <td>512,780</td>
                    <td>3m 01s</td>
                    <td>25.3%</td>
                  </tr>
                  <tr>
                    <td>/about</td>
                    <td>456,789</td>
                    <td>312,445</td>
                    <td>2m 15s</td>
                    <td>36.8%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
