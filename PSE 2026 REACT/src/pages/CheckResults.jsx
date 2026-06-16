import { useState, useEffect, useRef } from 'react'
import '../styles/checker.css'

// ── Configuration ──────────────────────────────────────────────
const LOGO_IMAGE      = '/assets/images/logo.png'
const SIGNATURE_IMAGE = '/assets/images/signature.png'
const GAS_URL         = 'https://script.google.com/macros/s/AKfycbwXjS_ex34rmbZM2gg5qT_17E4PyYVllQTy3CQf8-b8vcPwRYuBC1KYXSFBazn3spApuw/exec'

const SUBJECT_COLUMNS = {
  'General Paper'                              : 'General Paper',
  'Financial Regulations/Memoranda'            : 'Financial Regulation/Memoranda',
  'Use of English'                             : 'Use of English',
  'Computer Appreciation & Literacy'           : 'Computer Appreciation',
  'Public / Local Government Service Rules'    : 'Public/Local Government Service Rules',
  'Public Service Commission Regulations'      : 'Public Service Commission Regulations',
  'Local Government Legislation / Common Law'  : 'Local Government/Common Law',
}

const EXCLUDE = new Set([
  'S/N', 'Full Name', 'Full Names', 'Phone', 'Phone Number',
  'Examination Number', 'Exam No', 'Surname', 'First Name',
  'Other Name', 'Total Score', 'Grade'
])

const PASS_MARK = 40

// ── Helpers ────────────────────────────────────────────────────
const normName  = s => s.replace(/\s+/g, ' ').trim().toLowerCase()
const normPhone = s => s.replace(/\D/g, '').replace(/^0/, '')

function computeRemarks(headers, row) {
  let passCount = 0, failCount = 0, failedSubjects = []
  headers.forEach((h, i) => {
    const header = String(h).trim()
    if (EXCLUDE.has(header)) return
    const value = row[i]
    if (value === '' || value === null || value === undefined) return
    const score = Number(value)
    if (Number.isNaN(score)) return
    if (score >= PASS_MARK) { passCount++ }
    else { failCount++; failedSubjects.push(header) }
  })
  return { passCount, failCount, resit: failedSubjects.join(', ') }
}

function buildHeadersAndRow(record) {
  const headers = ['Full Name', 'Phone', 'Examination Number']
  const row = [
    record['Full Names']         ?? record['Full Name']  ?? '',
    record['Phone Number']       ?? record['Phone']       ?? '',
    record['Examination Number'] ?? record['Exam No']     ?? '',
  ]
  for (const [colKey, displayLabel] of Object.entries(SUBJECT_COLUMNS)) {
    headers.push(displayLabel)
    row.push(record[colKey] ?? '')
  }
  return { headers, row }
}

async function fetchFromGoogleSheets(inputName, inputPhone) {
  const cleanPhone    = normPhone(inputPhone)
  const normInputName = normName(inputName)

  const res = await fetch(GAS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify({ action: 'GET_RESULT', phone: cleanPhone }),
  })

  if (!res.ok) throw new Error(`Server error ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  if (!data.found) return null

  const record = data.record
  const dbName = normName(String(record['Full Names'] ?? record['Full Name'] ?? ''))
  if (!dbName.includes(normInputName)) return null

  return record
}

function buildResultHTML(headers, row, remarks) {
  const nameIdx = headers.indexOf('Full Name')
  const examIdx = headers.findIndex(h => h === 'Examination Number' || h === 'Exam No')
  const fullName = nameIdx >= 0 ? String(row[nameIdx]).trim().toUpperCase() : '—'
  const examNo   = examIdx >= 0 ? String(row[examIdx]).trim() : ''
  const sat      = remarks.passCount + remarks.failCount
  const issueDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  }).toUpperCase()

  let tbodyHTML = ''
  let sn = 1
  headers.forEach((h, i) => {
    const header = String(h).trim()
    if (EXCLUDE.has(header)) return
    const val = row[i]
    if (val === '' || val === null || val === undefined) return
    const score = Number(val)
    if (Number.isNaN(score)) return
    const pass = score >= PASS_MARK
    tbodyHTML += `
      <tr>
        <td class="sn-col">${sn++}</td>
        <td>${header}</td>
        <td class="score-col" style="font-weight:700;">${score}</td>
        <td class="remark-col ${pass ? 'remark-pass' : 'remark-fail'}" style="font-weight:700;">${pass ? 'PASS' : 'FAIL'}</td>
      </tr>`
  })

  const resitNoticeHTML = remarks.resit
    ? `<div class="resit-notice"><strong>Resit Required:</strong><br><span>${remarks.resit}</span></div>`
    : ''

  return `
    <div class="cert-card">
      <div class="cert-header">
        <div class="logo-wrap"><img src="/assets/images/download.png" alt="Oyo State Government Logo"></div>
        <div class="state-name">Oyo State Government</div>
        <div class="cert-title">2026 Compulsory Examination</div>
        <div class="cert-subtitle">Official Result Slip</div>
        <div class="divider"></div>
      </div>
      <div class="candidate-name">
        <div class="label">This certifies the result of</div>
        <div class="name">${fullName}</div>
        ${examNo ? `<div class="exam-no">Exam No: ${examNo}</div>` : ''}
      </div>
      <div class="thin-divider"></div>
      <div class="stats-row">
        <div class="stat-box stat-sat"><div class="stat-num">${sat}</div><div class="stat-label">Subjects<br>Sat</div></div>
        <div class="stat-box stat-pass"><div class="stat-num">${remarks.passCount}</div><div class="stat-label">Subjects<br>Passed</div></div>
        <div class="stat-box stat-fail"><div class="stat-num">${remarks.failCount}</div><div class="stat-label">Subjects<br>Failed</div></div>
        <div class="stat-box stat-resit"><div class="stat-num">${remarks.failCount}</div><div class="stat-label">Subjects<br>to Resit</div></div>
      </div>
      <table class="result-table">
        <thead><tr><th style="width:36px;">S/N</th><th style="text-align:left;">Subject</th><th style="width:60px;">Score</th><th style="width:68px;">Remark</th></tr></thead>
        <tbody>${tbodyHTML}</tbody>
      </table>
      ${resitNoticeHTML}
      <div class="thin-divider"></div>
      <div class="result-footer">
        <div class="sig-block">
          <img src="${SIGNATURE_IMAGE}" alt="Head of Service Signature" />
          <div class="sig-line"></div>
          <div class="sig-title">Mrs. Olubunmi Oni, mni</div>
          <div class="sig-label">Head of Service</div>
        </div>
        <div class="issue-info">
          <div class="date">Issued: ${issueDate}</div>
          <div class="note">This is an official document</div>
        </div>
      </div>
    </div>`
}

// ── Component ──────────────────────────────────────────────────
export default function CheckResults() {
  const [name,      setName]      = useState('')
  const [phone,     setPhone]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [resultHTML, setResultHTML] = useState(null)
  const [error,     setError]     = useState(null)
  const [showPrint, setShowPrint] = useState(false)
  const resultRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-page', 'checker')
    return () => { document.documentElement.removeAttribute('data-page') }
  }, [])

  useEffect(() => {
    if (resultHTML && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [resultHTML])

  useEffect(() => {
    if (!resultHTML) return
    const container = resultRef.current
    if (!container) return
    const card = container.querySelector('.cert-card')
    if (!card) return

    function applyScale() {
      // Reset to measure natural size
      card.style.transform = ''
      card.style.width = ''
      const containerWidth = container.clientWidth
      const cardWidth = card.scrollWidth
      if (cardWidth > containerWidth) {
        const scale = containerWidth / cardWidth
        card.style.transformOrigin = 'top left'
        card.style.transform = `scale(${scale})`
        card.style.width = `${containerWidth / scale}px`
        // Reserve correct vertical space so layout doesn't collapse/overlap
        card.parentElement.style.height = `${card.offsetHeight * scale}px`
      } else {
        card.style.transform = ''
        card.style.width = ''
        card.parentElement.style.height = ''
      }
    }

    applyScale()
    window.addEventListener('resize', applyScale)
    return () => window.removeEventListener('resize', applyScale)
  }, [resultHTML])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setResultHTML(null)
    setShowPrint(false)

    const trimName  = name.trim()
    const trimPhone = phone.trim()

    if (!trimName || !trimPhone) {
      setError({ type: 'warning', msg: 'Please enter both your surname and phone number.' })
      return
    }

    setLoading(true)
    try {
      const record = await fetchFromGoogleSheets(trimName, trimPhone)
      setLoading(false)

      if (!record) {
        setResultHTML(`
          <div class="not-found-msg">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
              <path d="M11 8v4m0 4h.01" stroke-linecap="round"/>
            </svg>
            <p>No results found for the details provided.</p>
            <p>Please check the spelling of your name and your phone number, then try again.</p>
          </div>`)
        return
      }

      const { headers, row } = buildHeadersAndRow(record)
      const remarks = computeRemarks(headers, row)
      setResultHTML(buildResultHTML(headers, row, remarks))
      setName('')
      setPhone('')
      setShowPrint(true)

    } catch (err) {
      setLoading(false)
      setError({ type: 'error', msg: 'Unable to connect to the database. Please check your connection and try again.' })
    }
  }

  function handlePrint() { window.print() }

  const errorColors = {
    warning: { bg: '#fffbea', color: '#7a6500', border: '#e8dfa0' },
    error:   { bg: '#fdf3f2', color: '#c0392b', border: '#f0c8c4' },
  }

  return (
    <div className="checker-page">
    <main>
      {/* Animated Background */}
      <div className="bg-mesh" aria-hidden="true">
        <div className="mesh-orb mesh-orb--1"></div>
        <div className="mesh-orb mesh-orb--2"></div>
        <div className="mesh-orb mesh-orb--3"></div>
        <div className="mesh-orb mesh-orb--4"></div>
      </div>

      {/* Grain Texture */}
      <div className="page-grain" aria-hidden="true" />

      {/* Page Header */}
      <header className="page-header">
        <div className="page-header__badge">
          <span className="badge-dot" aria-hidden="true"></span>
          EXAMINATION PORTAL
        </div>
        <h1 className="page-title">Public Service Examination Result Checker</h1>
        <p className="page-subtitle">Retrieve your 2026 Public Service Examination result below.</p>
      </header>

      {/* Checker Layout */}
      <section className="checker-container" aria-label="Result checker">

        {/* LEFT: Search Form */}
        <div className="checker-left" role="search" aria-label="Search for your results">
          <div className="panel-header">
            <div className="panel-icon" aria-hidden="true">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div>
              <h2>Find Your Results</h2>
              <p className="panel-desc">Enter the details exactly as registered.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate autoComplete="off">

            <div className="field">
              <label htmlFor="searchName" className="field__label">Surname</label>
              <div className="field__wrapper">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  type="text" id="searchName" name="searchName" autoComplete="name"
                  placeholder="e.g. Adeyemi"
                  value={name}
                  onChange={e => {
                  const el = e.target
                  const pos = el.selectionStart
                  const upper = el.value.toUpperCase()
                  setName(upper)
                  requestAnimationFrame(() => el.setSelectionRange(pos, pos))
                }}
                  required aria-required="true"
                  aria-describedby="searchName-hint"
                />
              </div>
              <span id="searchName-hint" className="field__hint">Enter your surname as registered</span>
            </div>

            <div className="field">
              <label htmlFor="searchPhone" className="field__label">Phone Number</label>
              <div className="field__wrapper">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.56 3.41 2 2 0 0 1 3.54 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </span>
                <input
                  type="tel" id="searchPhone" name="searchPhone" autoComplete="tel"
                  placeholder="e.g. 08012345678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required aria-required="true"
                  aria-describedby="searchPhone-hint"
                  maxLength="11"
                />
              </div>
              <span id="searchPhone-hint" className="field__hint">Enter the phone number used during registration</span>
            </div>

            <button type="submit" className="submit-btn" disabled={loading} aria-label="Search for your examination result">
              <span className="submit-btn__text">{loading ? 'Searching…' : 'Search Results'}</span>
              <span className="submit-btn__icon" aria-hidden="true">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <span className="submit-btn__shimmer" aria-hidden="true"></span>
            </button>

          </form>

          <div className="info-note" role="note">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
            </svg>
            Results are only accessible with the exact details submitted during registration.
          </div>
        </div>

        {/* RIGHT: Result Display */}
        <div className="checker-right" ref={resultRef} aria-live="polite" aria-label="Examination result display">

          <div id="loader" role="status" aria-label="Loading results" style={{ display: loading ? "block" : "none" }}></div>

          {error && (
            <p style={{
              padding: '14px 16px', borderRadius: '10px',
              background: errorColors[error.type].bg,
              color: errorColors[error.type].color,
              border: `1px solid ${errorColors[error.type].border}`,
              fontSize: '14px', fontWeight: 500, margin: 0
            }}>
              {error.msg}
            </p>
          )}

          {!loading && !error && !resultHTML && (
            <div className="result-display">
              <div className="empty-state">
                <div className="empty-state__icon" aria-hidden="true">
                  <svg width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <h3 className="empty-state__title">Your Result Awaits</h3>
                <p className="empty-state__body">Enter your surname and phone number in the form to retrieve your official examination result.</p>
                <div className="empty-state__steps" aria-label="How to check your results">
                  <div className="step"><span className="step__num" aria-hidden="true">1</span><span>Enter your surname</span></div>
                  <div className="step"><span className="step__num" aria-hidden="true">2</span><span>Enter your phone number</span></div>
                  <div className="step"><span className="step__num" aria-hidden="true">3</span><span>Click Search Results</span></div>
                </div>
              </div>
            </div>
          )}

          {resultHTML && (
            <div className="result-display result-scroll" dangerouslySetInnerHTML={{ __html: resultHTML }} />
          )}

          {showPrint && (
            <button id="printBtn" onClick={handlePrint} aria-label="Print your examination result" style={{ display: "inline-flex" }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9V2h12v7"/>
                <rect x="6" y="14" width="12" height="8" rx="1"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              </svg>
              Print Result
            </button>
          )}

        </div>
      </section>
    </main>
    </div>
  )
}