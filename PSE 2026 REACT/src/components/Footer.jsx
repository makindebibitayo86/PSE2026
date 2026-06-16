import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">

      <div className="footer-body">

        {/* ── Brand ── */}
        <div className="footer-brand">
          <a href="/" className="footer-logo" aria-label="Home">
            <img src="/assets/images/logo.png" alt="Oyo State Government" width="72" height="72" className="footer-logo__img" />
            <span className="footer-logo__text">
              <span className="footer-logo__name">Oyo State</span>
              <span className="footer-logo__sub">Public Service Examination</span>
            </span>
          </a>
          <p className="footer-brand__desc">
            Official portal for the 2026 Oyo State Civil Service compulsory promotion
            examination — candidate registration, result retrieval, and support.
          </p>

          <div className="footer-socials">
            <a
              href="https://wa.me/"
              className="footer-social__link"
              aria-label="WhatsApp"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="footer-social__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
            </a>
            <a
              href="https://facebook.com/"
              className="footer-social__link"
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="footer-social__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54v-2.891h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.891h-2.33v6.987C18.343 21.128 22 16.991 22 12z"/>
              </svg>
            </a>
            <a
              href="https://x.com/"
              className="footer-social__link"
              aria-label="X (Twitter)"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="footer-social__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a
              href="https://youtube.com/"
              className="footer-social__link"
              aria-label="YouTube"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="footer-social__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.498 6.186a2.974 2.974 0 0 0-2.093-2.105C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.405.581A2.974 2.974 0 0 0 .502 6.186 31.34 31.34 0 0 0 0 12a31.34 31.34 0 0 0 .502 5.814 2.974 2.974 0 0 0 2.093 2.105C4.495 20.5 12 20.5 12 20.5s7.505 0 9.405-.581a2.974 2.974 0 0 0 2.093-2.105A31.34 31.34 0 0 0 24 12a31.34 31.34 0 0 0-.502-5.814zM9.75 15.568V8.432L15.818 12 9.75 15.568z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* ── Quick Links ── */}
        <div className="footer-col">
          <h3 className="footer-col__title">Quick Links</h3>
          <ul className="footer-nav" role="list">
            <li><a href="/register"   className="footer-nav__link">Register</a></li>
            <li><a href="/"           className="footer-nav__link">Check Results</a></li>
            <li><a href="/complaints" className="footer-nav__link">Complaints</a></li>
          </ul>
        </div>

        {/* ── Office Info ── */}
        <div className="footer-col">
          <h3 className="footer-col__title">Office Information</h3>
          <ul className="footer-info" role="list">
            <li className="footer-info__item">
              <span className="footer-info__label">Conducted by</span>
              <span className="footer-info__value">Office of the Head of Service, Oyo State</span>
            </li>
            <li className="footer-info__item">
              <span className="footer-info__label">Address</span>
              <span className="footer-info__value">Oyo State Secretariat, Agodi, Ibadan</span>
            </li>
            <li className="footer-info__item">
              <span className="footer-info__label">Examination Cycle</span>
              <span className="footer-info__value">2026 Promotion Examination</span>
            </li>
          </ul>
        </div>

      </div>

      {/* ── Bottom Bar ── */}
      <div className="footer-bar">
        <span className="footer-bar__copy">
          &copy; 2026 Oyo State Government &nbsp;&middot;&nbsp; Office of the Head of Service
        </span>
        <ul className="footer-bar__legal" role="list">
          <li><a href="/terms" className="footer-bar__legal-link">Terms of Service</a></li>
          <li><a href="/privacy" className="footer-bar__legal-link">Privacy Policy</a></li>
          <li><a href="/cookies" className="footer-bar__legal-link">Cookie Policy</a></li>
        </ul>
        <span className="footer-bar__rights">All rights reserved</span>
      </div>

    </footer>
  )
}
