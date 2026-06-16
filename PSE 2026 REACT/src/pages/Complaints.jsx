import { useState, useEffect, useRef } from 'react'
import '../styles/complaints.css'

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzdHvNBpukntNkbEGoIm2UqviyiliHND9F-kD_M6yiQ_Yh9xPXsgMOO_AQ485z_kjSo/exec'

const SUBJECTS = [
  'General Paper',
  'Financial Regulation',
  'Memoranda',
  'Use of English',
  'Computer Appreciation & Literacy',
  'Public Service Rules',
  'Local Government Service Rules',
  'Public Service Commission Regulations',
  'Local Government Legislation',
  'Common Law',
]

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

export default function Complaints() {
  const [name,          setName]          = useState('')
  const [examNo,        setExamNo]        = useState('')
  const [phone,         setPhone]         = useState('')
  const [email,         setEmail]         = useState('')
  const [complaintType, setComplaintType] = useState('')
  const [checkedPapers, setCheckedPapers] = useState([])
  const [details,       setDetails]       = useState('')
  const [status,        setStatus]        = useState({ msg: '', type: '' })
  const [loading,       setLoading]       = useState(false)
  const textareaRef = useRef(null)

  // Set data-page on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-page', 'complaints')
    return () => document.documentElement.removeAttribute('data-page')
  }, [])

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [details])

  function togglePaper(paper) {
    setCheckedPapers(prev =>
      prev.includes(paper) ? prev.filter(p => p !== paper) : [...prev, paper]
    )
  }

  function setStatusMsg(msg, type) {
    setStatus({ msg, type })
  }

  function validate() {
    if (!name.trim()) { setStatusMsg('⚠ Full Name is required.', 'error'); return false }
    if (!examNo.trim()) { setStatusMsg('⚠ Exam Number is required.', 'error'); return false }
    if (!phone.trim()) { setStatusMsg('⚠ Phone Number is required.', 'error'); return false }
    if (!complaintType) { setStatusMsg('⚠ Please select a complaint type.', 'error'); return false }
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus({ msg: '', type: '' })

    if (!validate()) return

    let complaintsValue = ''
    if (complaintType === 'missing') {
      if (checkedPapers.length === 0) {
        setStatusMsg('⚠ Please select at least one missing subject.', 'error')
        return
      }
      complaintsValue = checkedPapers.join(', ')
    } else {
      complaintsValue = complaintType
    }

    const data = new URLSearchParams()
    data.append('name',       name.trim())
    data.append('examNo',     examNo.trim())
    data.append('phone',      phone.trim())
    data.append('email',      email.trim())
    data.append('complaints', complaintsValue)
    data.append('details',    details.trim())

    setLoading(true)
    setStatusMsg('Submitting your complaint…', 'loading')

    try {
      const response = await fetch(WEB_APP_URL, { method: 'POST', body: data })
      const result = await response.json()

      if (result.status === 'success') {
        setStatusMsg(`✓ Complaint submitted successfully. Reference ID: ${result.id}`, 'success')
        setName(''); setExamNo(''); setPhone(''); setEmail('')
        setComplaintType(''); setCheckedPapers(''); setDetails('')
        setCheckedPapers([])
      } else {
        setStatusMsg('✗ Submission failed. Please try again or contact support.', 'error')
      }
    } catch (err) {
      console.error('Submission error:', err)
      setStatusMsg('✗ Network error. Please check your connection and try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showSubjectBox = complaintType === 'missing'

  return (
    <div className="complaints-page">

      <div className="bg-mesh" aria-hidden="true">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
      </div>
      <div className="page-grain" aria-hidden="true"></div>

      <main className="main" id="main-content">

        <div className="page-header">
          <p className="page-eyebrow">
            <span className="pulse-dot" aria-hidden="true"></span>
            Grievance Portal
          </p>
          <h1 className="page-title">Submit a Complaint</h1>
          <p className="page-subtitle">Your concerns will be reviewed and addressed within 5–7 working days.</p>
        </div>

        <div className="form-card">
          <form id="complaintForm" onSubmit={handleSubmit} noValidate aria-label="Complaint submission form">

            {/* ── Personal Information ── */}
            <div className="form-section">
              <h2 className="form-section-title">Personal Information</h2>
              <div className="field-row">
                <div className="field-group">
                  <label className="field-label" htmlFor="name">Full Name <span className="required" aria-label="required">*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </span>
                    <input className="field-input" type="text" id="name" placeholder="e.g. Amaka Okonkwo" required autoComplete="name" aria-required="true" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="examNo">Exam Number <span className="required" aria-label="required">*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </span>
                    <input className="field-input" type="text" id="examNo" placeholder="e.g. PSE/2024/00123" required aria-required="true" value={examNo} onChange={e => setExamNo(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="field-row">
                <div className="field-group">
                  <label className="field-label" htmlFor="phone">Phone Number <span className="required" aria-label="required">*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91A16 16 0 0 0 15.09 16.09l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </span>
                    <input className="field-input" type="tel" id="phone" placeholder="+234 800 000 0000" required autoComplete="tel" aria-required="true" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="email">Email Address</label>
                  <div className="input-wrapper">
                    <span className="input-icon" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </span>
                    <input className="field-input" type="email" id="email" placeholder="optional" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-divider" role="separator" aria-hidden="true"></div>

            {/* ── Complaint Details ── */}
            <div className="form-section">
              <h2 className="form-section-title">Complaint Details</h2>

              <div className="field-group">
                <label className="field-label" htmlFor="complaintType">Complaint Type <span className="required" aria-label="required">*</span></label>
                <div className="select-wrapper">
                  <span className="input-icon" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </span>
                  <select className="field-input field-select" id="complaintType" required aria-required="true" value={complaintType} onChange={e => { setComplaintType(e.target.value); setCheckedPapers([]) }}>
                    <option value="">Select a complaint type…</option>
                    <option value="missing">Missing Papers</option>
                    <option value="access">Cannot Access Result</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="select-arrow" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              </div>

              {/* Subject Box — only shown when "missing" selected */}
              <div id="subjectBox" className="subject-box" aria-hidden={!showSubjectBox} aria-label="Select missing subjects" style={{ display: showSubjectBox ? '' : 'none' }}>
                <label className="field-label">Select Missing Papers <span className="required" aria-label="required">*</span></label>
                <p className="field-hint">Choose all subjects that are missing from your result.</p>
                <div className="checkbox-grid" role="group" aria-label="Missing subjects">
                  {SUBJECTS.map(subject => (
                    <label className="checkbox-card" key={subject}>
                      <input type="checkbox" value={subject} checked={checkedPapers.includes(subject)} onChange={() => togglePaper(subject)} />
                      <div className="checkbox-card-inner">
                        <div className="checkbox-indicator" aria-hidden="true"><CheckIcon /></div>
                        <span className="checkbox-label">{subject}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="details">Complaint Description</label>
                <textarea
                  className="field-input field-textarea"
                  id="details"
                  placeholder="Describe your complaint in detail. Include relevant dates, reference numbers, or any other information that may help resolve your issue."
                  aria-describedby="details-hint"
                  ref={textareaRef}
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                ></textarea>
                <p className="field-hint" id="details-hint">Be as specific as possible to expedite resolution.</p>
              </div>
            </div>

            {/* ── Form Footer ── */}
            <div className="form-footer">
              <button className={`submit-btn${loading ? ' is-loading' : ''}`} type="submit" disabled={loading} aria-describedby="status">
                <span className="submit-btn-text">{loading ? 'Submitting' : 'Submit Complaint'}</span>
                <span className="submit-btn-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </span>
              </button>
              {status.msg && (
                <p id="status" className={`status-message is-visible is-${status.type}`} role="alert" aria-live="polite" aria-atomic="true">
                  {status.msg}
                </p>
              )}
              {!status.msg && (
                <p id="status" className="status-message" role="alert" aria-live="polite" aria-atomic="true"></p>
              )}
            </div>

          </form>
        </div>

      </main>
    </div>
  )
}
