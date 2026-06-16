import { useState, useRef, useCallback } from 'react'
import {
  OYO_LGAS, OYO_MDAS, GRADE_LEVELS, EXAM_PAPERS
} from '../data/registerData'
import {
  getCentresForLGA
} from '../data/registerData'
import {
  isValidNigerianPhone, isValidTranRef,
  phoneExists, tranRefExists,
  generateExamNumber, uploadPassportPhoto, insertCandidate,
  formatIssueDate
} from '../utils/registerUtils'
import { LGA_ZONE } from '../data/registerData'

export default function RegisterTab({ onPendingReady }) {
  const [fullName,      setFullName]      = useState('')
  const [phone,         setPhone]         = useState('')
  const [lga,           setLga]           = useState('')
  const [disability,    setDisability]    = useState('')
  const [staffCategory, setStaffCategory] = useState('')
  const [ministry,      setMinistry]      = useState('')
  const [department,    setDepartment]    = useState('')
  const [gradeLevel,    setGradeLevel]    = useState('')
  const [tranRef,       setTranRef]       = useState('')
  const [amountPaid,    setAmountPaid]    = useState('')
  const [examCentre,    setExamCentre]    = useState('')
  const [selectedPapers, setSelectedPapers] = useState([])
  const [declared,      setDeclared]      = useState(false)
  const [photoDataURL,  setPhotoDataURL]  = useState(null)
  const [photoFile,     setPhotoFile]     = useState(null)
  const [photoError,    setPhotoError]    = useState('')
  const [dragOver,      setDragOver]      = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [statusMsg,     setStatusMsg]     = useState({ text: '', type: '' })

  const photoInputRef = useRef(null)

  const allowedCount = amountPaid ? parseInt(amountPaid) / 1000 : 0
  const papers       = staffCategory ? (EXAM_PAPERS[staffCategory] || []) : []
  const centres      = lga ? getCentresForLGA(lga) : []
  const departments  = ministry ? (OYO_MDAS[ministry] || []) : []

  function handleStaffCategory(val) {
    setStaffCategory(val)
    setSelectedPapers([])
    setAmountPaid('')
  }

  function handleMinistry(val) {
    setMinistry(val)
    setDepartment('')
  }

  function handleLGA(val) {
    setLga(val)
    setExamCentre('')
  }

  function handleAmountChange(val) {
    setAmountPaid(val)
    setSelectedPapers([])
  }

  function togglePaper(paper) {
    if (allowedCount === 0) return
    setSelectedPapers(prev => {
      if (prev.includes(paper)) return prev.filter(p => p !== paper)
      if (prev.length >= allowedCount) return prev
      return [...prev, paper]
    })
  }

  function processPhotoFile(file) {
    setPhotoError('')
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setPhotoError('Only JPG and PNG files are accepted.'); return
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('File size must not exceed 2MB.'); return
    }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoDataURL(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) processPhotoFile(file)
  }

  function showStatus(text, type = '') { setStatusMsg({ text, type }) }

  async function handleSubmit(e) {
    e.preventDefault()

    const errors = []
    if (!fullName || fullName.length < 3)               errors.push('Please enter your full name (minimum 3 characters).')
    if (!isValidNigerianPhone(phone))                    errors.push('Please enter a valid 11-digit Nigerian phone number.')
    if (!lga)                                            errors.push('Please select your Local Government of Residence.')
    if (!disability)                                     errors.push('Please indicate your disability status.')
    if (!staffCategory)                                  errors.push('Please select your Staff Category (Mainstream or Local Government).')
    if (!ministry)                                       errors.push('Please select your Ministry or Institution.')
    if (!department)                                     errors.push('Please select your Department or Agency.')
    if (!gradeLevel)                                     errors.push('Please select your current Grade Level.')
    if (!tranRef || !isValidTranRef(tranRef))            errors.push('Please enter a valid Bank Transaction Reference (8–24 alphanumeric characters).')
    if (!amountPaid)                                     errors.push('Please select the amount paid.')
    if (!examCentre)                                     errors.push('Please select an exam centre.')
    if (selectedPapers.length === 0)                     errors.push('Please select at least one examination paper.')
    if (selectedPapers.length !== allowedCount)          errors.push(`You must select exactly ${allowedCount} paper(s) based on your payment.`)
    if (!declared)                                       errors.push('You must read and accept the declaration before submitting.')

    if (errors.length) { showStatus(errors[0], 'error'); return }

    setLoading(true)
    showStatus('Verifying registration details…')

    try {
      if (await phoneExists(phone)) {
        setLoading(false)
        showStatus('A registration already exists for this phone number. Use the Recover Your Slip panel if you have already registered.', 'error')
        return
      }
      if (await tranRefExists(tranRef)) {
        setLoading(false)
        showStatus('This transaction reference has already been used. Each payment can only be used once.', 'error')
        return
      }

      showStatus('Generating examination number…')
      const examNo = await generateExamNumber(lga, staffCategory)

      let photoURL = null
      if (photoFile) {
        showStatus('Uploading passport photograph…')
        try { photoURL = await uploadPassportPhoto(photoFile, examNo) }
        catch (photoErr) {
          console.warn('[RegisterTab] photo upload failed:', photoErr)
          showStatus('Photo upload failed — saving registration without photo…')
          await new Promise(r => setTimeout(r, 1200))
        }
      }

      showStatus('Saving registration…')
      const zoneCode = LGA_ZONE[lga] || lga.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 4)

      await insertCandidate({
        full_name:        fullName,
        phone_number:     phone.replace(/\D/g, ''),
        lga,
        disability,
        staff_category:   staffCategory,
        zone_code:        zoneCode,
        ministry,
        department,
        grade_level:      gradeLevel,
        tran_ref:         tranRef.toUpperCase(),
        amount_paid:      parseInt(amountPaid),
        exam_centre:      examCentre,
        papers:           selectedPapers,
        exam_number:      examNo,
        passport_url:     photoURL,
        payment_status:   'pending',
        rejection_reason: '',
        registered_at:    new Date().toISOString(),
        reviewed_at:      '',
      })

      setLoading(false)
      showStatus('Registration successful!', 'success')

      onPendingReady({ fullName, tranRef: tranRef.toUpperCase() })
      resetForm()

    } catch (err) {
      setLoading(false)
      const msg = err?.message || String(err) || 'Unknown error — please try again.'
      showStatus('Registration failed: ' + msg, 'error')
      console.error('[RegisterTab] submission error:', err)
    }
  }

  function resetForm() {
    setFullName(''); setPhone(''); setLga(''); setDisability('')
    setStaffCategory(''); setMinistry(''); setDepartment(''); setGradeLevel('')
    setTranRef(''); setAmountPaid(''); setExamCentre(''); setSelectedPapers([])
    setDeclared(false); setPhotoDataURL(null); setPhotoFile(null); setPhotoError('')
  }

  const submitDisabled = !declared || loading

  return (
    <div className="panel-card">
      <div className="panel-head">
        <div className="panel-head__icon" aria-hidden="true">
          <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div>
          <div className="panel-head__title">Candidate Registration Form</div>
          <div className="panel-head__sub">All fields marked <span className="req-star" aria-label="required">*</span> are required. Complete accurately.</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate autoComplete="off">

        {/* ── SECTION 1: Personal Information ── */}
        <fieldset className="form-section" id="step1">
          <legend className="form-section__title">
            <span className="section-num">1</span> Personal Information
          </legend>
          <div className="fields-grid">

            <div className="field field--full">
              <label htmlFor="fullName" className="field__label">Full Name <span className="req-star" aria-hidden="true">*</span></label>
              <div className="field__wrapper">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input type="text" id="fullName" name="fullName"
                  placeholder="e.g. Adeyemi Oluwaseun Adeola"
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  required aria-required="true" aria-describedby="fullName-hint" />
              </div>
              <span id="fullName-hint" className="field__hint">Enter your name exactly as in your official records</span>
            </div>

            <div className="field">
              <label htmlFor="phone" className="field__label">Phone Number <span className="req-star" aria-hidden="true">*</span></label>
              <div className="field__wrapper">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.56 3.41 2 2 0 0 1 3.54 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </span>
                <input type="tel" id="phone" name="phone"
                  placeholder="e.g. 08012345678"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  required aria-required="true" aria-describedby="phone-hint" maxLength="11" />
              </div>
              <span id="phone-hint" className="field__hint">11-digit Nigerian phone number</span>
            </div>

            <div className="field">
              <label htmlFor="lga" className="field__label">Local Government of Residence <span className="req-star" aria-hidden="true">*</span></label>
              <div className="field__wrapper field__wrapper--select">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                <select id="lga" name="lga" value={lga} onChange={e => handleLGA(e.target.value)}
                  required aria-required="true" aria-describedby="lga-hint">
                  <option value="" disabled>— Select your LGA —</option>
                  {OYO_LGAS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <span className="select-arrow" aria-hidden="true">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
              <span id="lga-hint" className="field__hint">Select your LGA within Oyo State</span>
            </div>

            <div className="field">
              <label htmlFor="disability" className="field__label">Disability Status <span className="req-star" aria-hidden="true">*</span></label>
              <div className="field__wrapper field__wrapper--select">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                  </svg>
                </span>
                <select id="disability" name="disability" value={disability} onChange={e => setDisability(e.target.value)}
                  required aria-required="true" aria-describedby="disability-hint">
                  <option value="" disabled>— Select an option —</option>
                  <option value="None">None</option>
                  <option value="Visual Impairment">Visual Impairment</option>
                  <option value="Hearing Impairment">Hearing Impairment</option>
                  <option value="Physical / Mobility Disability">Physical / Mobility Disability</option>
                  <option value="Other Disability">Other Disability</option>
                </select>
                <span className="select-arrow" aria-hidden="true">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
              <span id="disability-hint" className="field__hint">For exam centre accommodation planning</span>
            </div>

          </div>
        </fieldset>

        {/* ── SECTION 2: Staff Category, Ministry, Department & Grade Level ── */}
        <fieldset className="form-section" id="step2">
          <legend className="form-section__title">
            <span className="section-num">2</span> Staff Category, Ministry, Department &amp; Grade Level
          </legend>
          <div className="fields-grid">

            <div className="field field--full">
              <label htmlFor="staffCategory" className="field__label">Staff Category <span className="req-star" aria-hidden="true">*</span></label>
              <div className="field__wrapper field__wrapper--select">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </span>
                <select id="staffCategory" name="staffCategory" value={staffCategory}
                  onChange={e => handleStaffCategory(e.target.value)}
                  required aria-required="true" aria-describedby="staffCat-hint">
                  <option value="" disabled>— Select staff category —</option>
                  <option value="Mainstream">Mainstream Staff</option>
                  <option value="Local Government">Local Government Staff</option>
                </select>
                <span className="select-arrow" aria-hidden="true">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
              <span id="staffCat-hint" className="field__hint">Mainstream (State Civil Service) or Local Government Staff</span>
            </div>

            <div className="field field--full">
              <label htmlFor="ministry" className="field__label">Ministry <span className="req-star" aria-hidden="true">*</span></label>
              <div className="field__wrapper field__wrapper--select">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </span>
                <select id="ministry" name="ministry" value={ministry}
                  onChange={e => handleMinistry(e.target.value)}
                  required aria-required="true" aria-describedby="ministry-hint">
                  <option value="" disabled>— Select your Ministry —</option>
                  {Object.keys(OYO_MDAS).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="select-arrow" aria-hidden="true">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
              <span id="ministry-hint" className="field__hint">Select the Ministry you are deployed under</span>
            </div>

            <div className="field field--full">
              <label htmlFor="department" className="field__label">Department / Agency <span className="req-star" aria-hidden="true">*</span></label>
              <div className="field__wrapper field__wrapper--select">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  </svg>
                </span>
                <select id="department" name="department" value={department}
                  onChange={e => setDepartment(e.target.value)}
                  required aria-required="true" aria-describedby="dept-hint"
                  disabled={!ministry}>
                  <option value="" disabled>{ministry ? '— Select department / agency —' : '— Select Ministry first —'}</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span className="select-arrow" aria-hidden="true">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
              <span id="dept-hint" className="field__hint">Select your Department or Agency within the Ministry</span>
            </div>

            <div className="field">
              <label htmlFor="gradeLevel" className="field__label">Current Grade Level <span className="req-star" aria-hidden="true">*</span></label>
              <div className="field__wrapper field__wrapper--select">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </span>
                <select id="gradeLevel" name="gradeLevel" value={gradeLevel}
                  onChange={e => setGradeLevel(e.target.value)}
                  required aria-required="true" aria-describedby="gl-hint">
                  <option value="" disabled>— Select Grade Level —</option>
                  {GRADE_LEVELS.map(gl => <option key={gl} value={gl}>{gl}</option>)}
                </select>
                <span className="select-arrow" aria-hidden="true">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
              <span id="gl-hint" className="field__hint">Your current confirmed grade level</span>
            </div>

          </div>
        </fieldset>

        {/* ── SECTION 3: Payment & Exam Papers ── */}
        <fieldset className="form-section" id="step3">
          <legend className="form-section__title">
            <span className="section-num">3</span> Payment &amp; Exam Papers
          </legend>
          <div className="fields-grid">

            <div className="field field--full">
              <label htmlFor="tranRef" className="field__label">Bank Transaction Reference <span className="req-star" aria-hidden="true">*</span></label>
              <div className="field__wrapper">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </span>
                <input type="text" id="tranRef" name="tranRef"
                  placeholder="e.g. ZTF25050112345678"
                  value={tranRef} onChange={e => setTranRef(e.target.value.toUpperCase())}
                  required aria-required="true" aria-describedby="tranRef-hint"
                  maxLength="20" autoComplete="off" />
              </div>
              <span id="tranRef-hint" className="field__hint">Transaction Reference (Tran Ref) printed on your Bank teller receipt or transfer alert</span>
            </div>

            <div className="field">
              <label htmlFor="amountPaid" className="field__label">Amount Paid <span className="req-star" aria-hidden="true">*</span></label>
              <div className="field__wrapper field__wrapper--select">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </span>
                <select id="amountPaid" name="amountPaid" value={amountPaid}
                  onChange={e => handleAmountChange(e.target.value)}
                  required aria-required="true" aria-describedby="amount-hint">
                  <option value="" disabled>— Select amount paid —</option>
                  {[1,2,3,4,5,6,7].map(n => (
                    <option key={n} value={n * 1000}>₦{(n * 1000).toLocaleString()} — {n} Paper{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
                <span className="select-arrow" aria-hidden="true">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
              <span id="amount-hint" className="field__hint">₦1,000 per exam paper</span>
            </div>

            <div className="field">
              <label htmlFor="examCentre" className="field__label">Preferred Exam Centre <span className="req-star" aria-hidden="true">*</span></label>
              <div className="field__wrapper field__wrapper--select">
                <span className="field__icon" aria-hidden="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                  </svg>
                </span>
                <select id="examCentre" name="examCentre" value={examCentre}
                  onChange={e => setExamCentre(e.target.value)}
                  required aria-required="true" aria-describedby="centre-hint">
                  <option value="" disabled>— Select exam centre —</option>
                  {centres.length === 0 && lga
                    ? <option disabled>— No centres found for this LGA —</option>
                    : centres.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="select-arrow" aria-hidden="true">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
              <span id="centre-hint" className="field__hint">Centres are mapped to your LGA</span>
            </div>

          </div>

          {/* Paper Selection */}
          <div className="paper-selection-wrapper" aria-live="polite">
            <div className="paper-selection-header">
              <div className="paper-selection-title">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Select Examination Papers
              </div>
              <div className={`paper-selection-counter${selectedPapers.length > 0 && selectedPapers.length >= allowedCount ? ' is-full' : ''}`} aria-live="polite">
                <span>{selectedPapers.length}</span> / <span>{allowedCount}</span> selected
              </div>
            </div>

            {!staffCategory ? (
              <div className="paper-selection-hint" role="status">Select your Staff Category above to see available papers.</div>
            ) : !amountPaid ? (
              <div className="paper-selection-hint" role="status">Select your amount paid above to see available papers.</div>
            ) : (
              <div className="paper-selection-hint" role="status">
                You may select up to {allowedCount} paper{allowedCount > 1 ? 's' : ''}. Choose carefully.
              </div>
            )}

            {papers.length > 0 && (
              <div className="paper-grid" role="group" aria-label="Exam paper selection">
                {papers.map(paper => {
                  const isChecked  = selectedPapers.includes(paper)
                  const isDisabled = allowedCount === 0 || (!isChecked && selectedPapers.length >= allowedCount)
                  return (
                    <label
                      key={paper}
                      className={`paper-card${isChecked ? ' is-checked' : ''}${isDisabled ? ' is-disabled' : ''}`}
                      role="checkbox"
                      aria-checked={isChecked}
                      aria-label={paper}
                      tabIndex={isDisabled && !isChecked ? -1 : 0}
                      onClick={e => { e.preventDefault(); togglePaper(paper) }}
                      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); togglePaper(paper) } }}
                    >
                      <input type="checkbox" name="papers" value={paper} checked={isChecked} onChange={() => {}} tabIndex={-1} style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} />
                      <span className="paper-checkbox">
                        <span className="paper-checkbox__check" aria-hidden="true">
                          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </span>
                      </span>
                      <span className="paper-label">{paper}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </fieldset>

        {/* ── SECTION 4: Passport Photograph ── */}
        <fieldset className="form-section" id="step4">
          <legend className="form-section__title">
            <span className="section-num">4</span> Passport Photograph <span className="optional-label">(Optional)</span>
          </legend>

          <div
            className={`photo-upload-area${photoDataURL ? ' has-photo' : ''}${dragOver ? ' drag-over' : ''}`}
            tabIndex="0"
            role="button"
            aria-label="Upload passport photograph"
            aria-describedby="photo-hint"
            onClick={() => photoInputRef.current?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); photoInputRef.current?.click() } }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {!photoDataURL && (
              <div className="photo-upload-placeholder">
                <div className="photo-upload-icon" aria-hidden="true">
                  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <p className="photo-upload-text">Click or drag &amp; drop your passport photo here</p>
                <p className="photo-upload-sub">JPG or PNG · Max 2MB · Passport style, white background</p>
              </div>
            )}
            {photoDataURL && (
              <img id="photoPreview" className="photo-preview" src={photoDataURL} alt="Passport photograph preview" />
            )}
            <input
              type="file" id="passportPhoto" name="passportPhoto"
              accept="image/jpeg,image/png"
              className="file-input-hidden"
              tabIndex={-1}
              ref={photoInputRef}
              onClick={e => e.stopPropagation()}
              onChange={e => { if (e.target.files[0]) processPhotoFile(e.target.files[0]) }}
            />
          </div>
          <span id="photo-hint" className="field__hint" style={{ marginTop: '8px', display: 'block' }}>
            Optional. JPG or PNG only. Max 2MB.
          </span>
          {photoError && <div className="field-error" role="alert">{photoError}</div>}
        </fieldset>

        {/* ── SECTION 5: Statutory Declaration ── */}
        <fieldset className="form-section declaration-section" id="step5">
          <legend className="form-section__title">
            <span className="section-num">5</span> Statutory Declaration
          </legend>

          <div className="declaration-box" role="region" aria-label="Declaration text">
            <p className="declaration-intro">
              I, <strong className="decl-name-live">{fullName.trim() || '[ your full name will appear here ]'}</strong>, hereby solemnly declare that:
            </p>
            <ol className="declaration-list">
              <li>All information provided in this registration form is true, complete and accurate to the best of my knowledge and belief.</li>
              <li>I am a serving officer in the Oyo State Civil Service and I am duly eligible to sit for this examination.</li>
              <li>The Bank Transaction Reference entered is valid and represents a payment made by me or on my behalf solely for the purpose of this examination.</li>
              <li>I understand that any false, misleading or fraudulent information provided herein shall render my registration void, result in immediate disqualification, and constitute a civil service offence liable to disciplinary proceedings under the Public Service Rules of Oyo State.</li>
              <li>I consent to the processing of my personal data by the Office of the Head of Service, Oyo State, for the purpose of administering this examination and communicating results to the relevant Ministry, Department or Agency.</li>
            </ol>
          </div>

          <label className="declaration-checkbox-label">
            <input type="checkbox" id="declarationCheck" name="declarationCheck"
              checked={declared}
              onChange={e => setDeclared(e.target.checked)}
              aria-required="true" aria-describedby="decl-hint" />
            <span className="decl-checkbox-box" aria-hidden="true">
              <svg className="decl-check-icon" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
            <span className="decl-checkbox-text">
              I have read and fully understood the above declaration. I accept complete legal responsibility for the accuracy of all information submitted in this form.
              <span className="req-star" aria-hidden="true">*</span>
            </span>
          </label>
          <span id="decl-hint" className="field__hint" style={{ marginTop: '8px', display: 'block' }}>
            You must accept this declaration before you can submit your registration.
          </span>
        </fieldset>

        {/* ── Submit ── */}
        <div className="form-submit-area">
          <button type="submit" className={`submit-btn${submitDisabled ? ' is-locked' : ''}`}
            aria-label="Submit registration" disabled={submitDisabled}>
            <span className="submit-btn__text">{loading ? 'Submitting…' : 'Submit Registration'}</span>
            <span className="submit-btn__icon" aria-hidden="true">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"/>
              </svg>
            </span>
          </button>
          {!declared && (
            <p className="submit-note submit-note--decl">Accept the declaration above to enable submission.</p>
          )}
          {statusMsg.text && (
            <p className={`submit-note${statusMsg.type ? ` is-${statusMsg.type}` : ''}`} aria-live="polite">
              {statusMsg.text}
            </p>
          )}
        </div>

        {loading && <div id="regLoader" role="status" aria-label="Submitting registration"></div>}
      </form>
    </div>
  )
}
