import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  const location = useLocation()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const currentY = window.scrollY
        const diff = currentY - lastScrollY.current
        if (diff > 6 && currentY > 80) {
          setHidden(true)
        } else if (diff < -4) {
          setHidden(false)
        }
        lastScrollY.current = currentY
        ticking.current = false
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleTheme = () => setTheme(t => { const next = t === 'light' ? 'dark' : 'light'; localStorage.setItem('theme', next); return next })

  return (
    <nav className={`navbar${hidden ? ' navbar--hidden' : ''}`} role="navigation" aria-label="Main navigation">

      {/* Logo — left */}
      <a href="/" className="nav-logo" aria-label="Oyo State Public Service Examination">
        <img src="/assets/images/logo.png" alt="Oyo State Government Logo" width="52" height="52" />
        <span className="logo-text">
          <span className="logo-text--primary">Oyo State</span>
          <span className="logo-text--secondary">Public Service Examination</span>
        </span>
      </a>

      {/* Links — absolutely centered */}
      <ul className="nav-links nav-links-center" role="list">
        <li><a href="/register" className={`nav-link${location.pathname === "/register" ? " nav-link--active" : ""}`} aria-current={location.pathname === "/register" ? "page" : undefined}>Register</a></li>
        <li><a href="/" className={`nav-link${location.pathname === "/" ? " nav-link--active" : ""}`} aria-current={location.pathname === "/" ? "page" : undefined}>Check Results</a></li>
        <li><a href="/complaints" className={`nav-link${location.pathname === "/complaints" ? " nav-link--active" : ""}`} aria-current={location.pathname === "/complaints" ? "page" : undefined}>Complaints</a></li>
      </ul>

      {/* Toggle — right */}
      <div className="nav-right">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          title="Toggle theme"
        >
          {theme === 'light' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

    </nav>
  )
}
