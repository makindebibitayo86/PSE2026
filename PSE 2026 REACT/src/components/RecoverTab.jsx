import { useState } from 'react'
import { isValidNigerianPhone, fetchCandidateForRecovery } from '../utils/registerUtils'

export default function RecoverTab({ onSlipReady }) {
  const [surname, setSurname] = useState('')
  const [phone, setPhone]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimSurname = surname.trim().toUpperCase()
    const trimPhone   = phone.trim()

    if (!trimSurname || trimSurname.length < 2) { setError('Please enter your surname.'); return }
    if (!isValidNigerianPhone(trimPhone))        { setError('Please enter a valid 11-digit Nigerian phone number.'); return }

    setLoading(true)
    try {
      const record = await fetchCandidateForRecovery(trimPhone, trimSurname)
      if (!record) {
        setError('No registration found matching that surname or phone number. Please check your details and try again.')
        setLoading(false); return
      }

      const status = record.payment_status || 'pending'
      if (status === 'pending') {
        setError(`Your payment is still being verified. Please check back in 24–48 hours. Your registration number is: ${record.exam_number}`)
        setLoading(false); return
      }
      if (status === 'rejected') {
        const reason = record.rejection_reason || 'No reason provided.'
        setError(`Your payment could not be verified. Reason: ${reason}. Please contact the Office of the Head of Service.`)
        setLoading(false); return
      }
      if (status !== 'approved') {
        setError('Your registration is not yet approved. Please check back later or contact the Office of the Head of Service.')
        setLoading(false); return
      }

      const recoveredData = {
        fullName:      record.full_name,
        phone:         String(record.phone_number).padStart(11, '0'),
        lga:           record.lga,
        disability:    record.disability || 'None',
        staffCategory: record.staff_category || '',
        ministry:      record.ministry,
        department:    record.department,
        gradeLevel:    record.grade_level,
        tranRef:       record.tran_ref,
        amount:        record.amount_paid,
        centre:        record.exam_centre,
        papers:        Array.isArray(record.papers) ? record.papers : [],
        examNo:        record.exam_number,
        photoURL:      record.passport_url || null,
        isRecovered:   true,
      }

      setLoading(false)
      setSurname('')
      setPhone('')
      onSlipReady(recoveredData)

    } catch (err) {
      setLoading(false)
      setError('Retrieval failed. Please check your connection and try again.')
    }
  }

  return (
    <div className="panel-card">
      <div className="panel-head">
        <div className="panel-head__icon panel-head__icon--amber" aria-hidden="true">
          <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <div className="panel-head__title">Print / Recover Your Slip</div>
          <div className="panel-head__sub">Already registered? Retrieve and reprint your exam slip before examination day.</div>
        </div>
      </div>

      <div className="recover-layout">

        {/* Left: Info */}
        <div className="recover-info">
          <div className="recover-info__title">Lost your exam slip?</div>
          <p className="recover-info__body">
            No worries. Enter the phone number and surname you used during registration to retrieve your slip instantly. You can then print it directly from this page.
          </p>
          <div className="recover-steps">
            {[
              { n: '1', title: 'Enter Phone Number', desc: 'Use the exact number submitted during registration.' },
              { n: '2', title: 'Enter Your Surname', desc: 'Your surname (first of your names) as submitted during registration.' },
              { n: '3', title: 'Retrieve & Print', desc: 'Your slip loads instantly. Print and keep it safe.' },
            ].map(({ n, title, desc }) => (
              <div className="recover-step" key={n}>
                <span className="recover-step__num">{n}</span>
                <div className="recover-step__content">
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="recover-note" role="note">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
            </svg>
            <span>The recovered slip will not include your passport photograph for security reasons. Carry a recent passport photo to the exam venue.</span>
          </div>
        </div>

        {/* Right: Form */}
        <div className="recover-form-card">
          <div className="recover-form-card__title">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Retrieve Your Slip
          </div>

          <form onSubmit={handleSubmit} noValidate autoComplete="off">
            <div className="recover-fields">

              <div className="field">
                <label htmlFor="recoverSurname" className="field__label">
                  Surname <span className="req-star" aria-hidden="true">*</span>
                </label>
                <div className="field__wrapper">
                  <span className="field__icon" aria-hidden="true">
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input
                    type="text" id="recoverSurname" name="recoverSurname"
                    placeholder="e.g. ADEYEMI"
                    value={surname}
                    onChange={e => setSurname(e.target.value.toUpperCase())}
                    required aria-required="true"
                    aria-describedby="recoverSurname-hint"
                  />
                </div>
                <span id="recoverSurname-hint" className="field__hint">Your surname (first of your names) as submitted during registration</span>
              </div>

              <div className="field">
                <label htmlFor="recoverPhone" className="field__label">
                  Phone Number <span className="req-star" aria-hidden="true">*</span>
                </label>
                <div className="field__wrapper">
                  <span className="field__icon" aria-hidden="true">
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.56 3.41 2 2 0 0 1 3.54 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </span>
                  <input
                    type="tel" id="recoverPhone" name="recoverPhone"
                    placeholder="e.g. 08012345678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required aria-required="true"
                    aria-describedby="recoverPhone-hint"
                    maxLength="11"
                  />
                </div>
                <span id="recoverPhone-hint" className="field__hint">The phone number used during registration</span>
              </div>
            </div>

            {error && (
              <div className="recover-error" role="alert">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="recover-btn" disabled={loading}>
              <span className="recover-btn__text">{loading ? 'Searching…' : 'Retrieve Slip'}</span>
              <span className="recover-btn__icon" aria-hidden="true">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
            </button>

            {loading && <div className="recover-loader" role="status" aria-label="Searching for your slip"></div>}
          </form>
        </div>

      </div>
    </div>
  )
}
