import { useEffect, useState, useRef } from 'react'
import { buildQRText, generateQRDataURL, formatIssueDate, printClean } from '../utils/registerUtils'
import { LOGO_IMAGE } from '../data/registerData'

/* ── Scales the exam slip to fit its container on mobile without reflowing ── */
function useSlipScale(ready) {
  const wrapperRef = useRef(null)
  const slipRef    = useRef(null)

  useEffect(() => {
    if (!ready || !wrapperRef.current || !slipRef.current) return

    function applyScale() {
      const wrapper     = wrapperRef.current
      const slip        = slipRef.current
      if (!wrapper || !slip) return

      const SLIP_WIDTH  = 720          // fixed desktop width
      const available   = wrapper.getBoundingClientRect().width
      const scale       = Math.min(1, available / SLIP_WIDTH)

      slip.style.transform = `scale(${scale})`
      // Collapse the wrapper height to the scaled slip height so there's no gap
      wrapper.style.height  = `${slip.scrollHeight * scale}px`
    }

    applyScale()
    const ro = new ResizeObserver(applyScale)
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [ready])

  return { wrapperRef, slipRef }
}

function buildSlipHTML({ fullName, phone, lga, disability, staffCategory, ministry, department, tranRef, amount, centre, papers, examNo, photoURL }, qrDataURL) {
  const issueDate = formatIssueDate()
  const photoSrc = photoURL || ''
  const photoHTML = photoSrc
    ? `<img src="${photoSrc}" alt="Passport photograph of ${fullName}" crossorigin="anonymous" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" style="width:100%;height:100%;object-fit:cover;"><div class="slip-photo-placeholder" style="display:none;">PASSPORT<br>PHOTO</div>`
    : `<div class="slip-photo-placeholder">PASSPORT<br>PHOTO</div>`
  const papersRows = papers.map((p, i) => `<tr><td style="width:36px;color:#888;font-size:11px;">${i + 1}</td><td>${p}</td></tr>`).join('')
  const qrBlock = qrDataURL
    ? `<img src="${qrDataURL}" alt="Verification QR Code" class="slip-qr-image">`
    : `<div class="slip-qr-placeholder" style="width:110px;height:110px;border:1.5px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:9px;color:#aaa;text-align:center;">QR<br>CODE</div>`

  return `
    <div class="slip-watermark">OFFICIAL</div>
    <div class="slip-header">
      <img src="${LOGO_IMAGE}" alt="Oyo State Logo" class="slip-logo">
      <div class="slip-state-name">Oyo State Government</div>
      <div class="slip-title">2026 Compulsory Public Service Examination</div>
      <div class="slip-subtitle">Official Candidate Examination Slip</div>
      <div class="slip-divider"></div>
    </div>
    <div class="slip-candidate-block">
      <div class="slip-photo-box">${photoHTML}</div>
      <div class="slip-candidate-info">
        <div class="slip-exam-no">Examination No: ${examNo}</div>
        <div class="slip-name">${fullName.toUpperCase()}</div>
        <div class="slip-fields-grid">
          <div class="slip-field"><span class="slip-field-label">Min.</span><span class="slip-field-value">${ministry}</span></div>
          <div class="slip-field"><span class="slip-field-label">Phone Number</span><span class="slip-field-value">${phone}</span></div>
          <div class="slip-field"><span class="slip-field-label">Dept / Agency</span><span class="slip-field-value">${department}</span></div>
          <div class="slip-field"><span class="slip-field-label">Tran Ref</span><span class="slip-field-value">${tranRef}</span></div>
          <div class="slip-field"><span class="slip-field-label">LGA</span><span class="slip-field-value">${lga}</span></div>
          <div class="slip-field"><span class="slip-field-label">Amount Paid</span><span class="slip-field-value">&#8358;${Number(amount).toLocaleString()}</span></div>
          <div class="slip-field"><span class="slip-field-label">Staff Category</span><span class="slip-field-value">${staffCategory || '—'}</span></div>
          <div class="slip-field"><span class="slip-field-label">Disability</span><span class="slip-field-value">${disability || 'None'}</span></div>
          <div class="slip-field"><span class="slip-field-label">Exam Centre</span><span class="slip-field-value">${centre}</span></div>
          <div class="slip-field"><span class="slip-field-label">Date Issued</span><span class="slip-field-value">${issueDate}</span></div>
        </div>
      </div>
    </div>
    <div class="slip-thin-divider"></div>
    <div class="slip-papers-title">Registered Examination Papers</div>
    <table class="slip-papers-table">
      <thead><tr><th style="width:36px;">S/N</th><th>Subject / Paper</th></tr></thead>
      <tbody>${papersRows}</tbody>
    </table>
    <div class="slip-thin-divider"></div>
    <div class="slip-footer">
      <div class="slip-qr-block">
        ${qrBlock}
        <div class="slip-qr-label">Scan to verify candidate</div>
      </div>
      <div class="slip-issue-info">
        <div class="slip-issue-seal">OFFICIAL DOCUMENT</div>
        <div class="date">Issued: ${issueDate}</div>
        <div class="note">Present this slip on the day of examination.<br>Issued by the Office of the Head of Service.</div>
      </div>
    </div>`
}

function buildPendingHTML({ fullName, tranRef }) {
  const dateStr = formatIssueDate()
  return `
    <div class="slip-watermark" style="color:#b45309;opacity:0.13;">PENDING</div>
    <div class="slip-header">
      <img src="${LOGO_IMAGE}" alt="Oyo State Logo" class="slip-logo">
      <div class="slip-state-name">Oyo State Government</div>
      <div class="slip-title">2026 Compulsory Public Service Examination</div>
      <div class="slip-subtitle">Registration Acknowledgement</div>
      <div class="slip-divider"></div>
    </div>
    <div style="text-align:center;margin:18px 0 22px;">
      <div style="display:inline-block;background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:10px 28px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:#92400e;text-transform:uppercase;">Status</div>
        <div style="font-size:15px;font-weight:700;color:#b45309;margin-top:2px;">⏳ Pending Payment Verification</div>
      </div>
    </div>
    <div class="slip-candidate-block" style="border:none;">
      <div class="slip-candidate-info" style="width:100%;">
        <div class="slip-name">${fullName.toUpperCase()}</div>
        <div class="slip-fields-grid" style="margin-top:14px;">
          <div class="slip-field"><span class="slip-field-label">Tran Ref</span><span class="slip-field-value">${tranRef}</span></div>
          <div class="slip-field"><span class="slip-field-label">Date Submitted</span><span class="slip-field-value">${dateStr}</span></div>
        </div>
      </div>
    </div>
    <div class="slip-thin-divider"></div>
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:14px 16px;margin-top:16px;font-size:12px;line-height:1.7;color:#78350f;">
      <strong>Important — Please read carefully:</strong>
      <ol style="margin:8px 0 0 16px;padding:0;">
        <li>Your registration has been received and is awaiting payment verification by the Finance team.</li>
        <li>Return to this portal in <strong>24–48 hours</strong> and use the <strong>Recover Your Slip</strong> panel to retrieve your official examination slip.</li>
        <li>Your official slip — which you must present at the examination venue — will only be available after your payment is confirmed.</li>
        <li><strong>This acknowledgement is not an examination slip</strong> and will not be accepted as entry to the examination hall.</li>
      </ol>
    </div>
    <div class="slip-footer" style="margin-top:20px;">
      <div class="slip-qr-block">
        <div class="slip-qr-placeholder">
          <svg width="48" height="48" fill="none" stroke="#ccc" stroke-width="1.5" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <path d="M14 14h.01M14 17h3M17 14v3M20 17v.01M20 14h.01"/>
          </svg>
        </div>
        <div class="slip-qr-label">QR available on approval</div>
      </div>
      <div class="slip-issue-info">
        <div class="slip-issue-seal">NOT VALID FOR EXAM ENTRY</div>
        <div class="date">Issued: ${dateStr}</div>
        <div class="note">This acknowledgement confirms receipt of your registration only.<br>Issued by the Office of the Head of Service, Oyo State.</div>
      </div>
    </div>`
}

export function SlipModal({ data, onClose }) {
  const [ready, setReady] = useState(false)
  const { wrapperRef, slipRef } = useSlipScale(ready)

  useEffect(() => {
    if (!data) { setReady(false); return }
    setReady(false)
    document.body.style.overflow = 'hidden'
    const issueDate = formatIssueDate()
    generateQRDataURL(buildQRText({ ...data, issueDate }))
      .then(qrDataURL => {
        const el = document.getElementById('examSlip')
        if (el) { el.innerHTML = buildSlipHTML(data, qrDataURL); setReady(true) }
      })
      .catch(() => {
        const el = document.getElementById('examSlip')
        if (el) { el.innerHTML = buildSlipHTML(data, null); setReady(true) }
      })
    return () => { document.body.style.overflow = '' }
  }, [data])

  if (!data) return null

  const handlePrint = () => printClean('examSlip')

  return (
    <div className="slip-modal" role="dialog" aria-modal="true" aria-label="Exam Slip" style={{ display: 'flex' }}>
      <div className="slip-modal__backdrop" onClick={onClose}></div>
      <div className="slip-modal__content">
        <div className="slip-modal__actions no-print">
          <button className="slip-print-btn" onClick={handlePrint} aria-label="Print exam slip">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8" rx="1"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            </svg>
            Print Exam Slip
          </button>
          <button className="slip-close-btn" onClick={onClose} aria-label="Close slip">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            New Registration
          </button>
        </div>
        {!ready && (
          <div className="slip-generating" role="status" aria-label="Generating slip">
            <div className="slip-generating__spinner"></div>
            <span>Generating your slip…</span>
          </div>
        )}
        {/* slip-scale-wrapper collapses to the scaled height; exam-slip stays at 720px */}
        <div ref={wrapperRef} className="slip-scale-wrapper">
          <div id="examSlip" ref={slipRef} className="exam-slip" style={!ready ? { display: 'none' } : {}}></div>
        </div>
      </div>
    </div>
  )
}

export function PendingModal({ data, onClose }) {
  const [ready, setReady] = useState(false)
  const { wrapperRef, slipRef } = useSlipScale(ready)

  useEffect(() => {
    if (!data) { setReady(false); return }
    document.body.style.overflow = 'hidden'
    const el = document.getElementById('pendingSlip')
    if (el) { el.innerHTML = buildPendingHTML(data); setReady(true) }
    return () => { document.body.style.overflow = '' }
  }, [data])

  if (!data) return null

  const handlePrint = () => printClean('pendingSlip')

  return (
    <div className="slip-modal" role="dialog" aria-modal="true" aria-label="Registration Pending" style={{ display: 'flex' }}>
      <div className="slip-modal__backdrop" onClick={onClose}></div>
      <div className="slip-modal__content">
        <div className="slip-modal__actions no-print">
          <button className="slip-print-btn" onClick={handlePrint} aria-label="Print acknowledgement">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8" rx="1"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            </svg>
            Print Acknowledgement
          </button>
          <button className="slip-close-btn" onClick={onClose} aria-label="Close">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            New Registration
          </button>
        </div>
        <div ref={wrapperRef} className="slip-scale-wrapper">
          <div id="pendingSlip" ref={slipRef} className="exam-slip"></div>
        </div>
      </div>
    </div>
  )
}