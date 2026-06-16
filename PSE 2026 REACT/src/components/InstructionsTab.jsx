export default function InstructionsTab({ onGoto }) {
  return (
    <div className="panel-card">
      <div className="panel-head">
        <div className="panel-head__icon" aria-hidden="true">
          <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
          </svg>
        </div>
        <div>
          <div className="panel-head__title">Registration Guide</div>
          <div className="panel-head__sub">Read carefully before proceeding to the Register tab.</div>
        </div>
      </div>

      <div className="instructions-layout">

        {/* Left: Registration Steps */}
        <div className="instructions-block">
          <div className="instructions-block__title">Registration Steps</div>
          <div className="step-list">
            {[
              { n: '1', title: 'Personal Information', desc: 'Enter your name, phone and LGA exactly as they appear in your official civil service records.' },
              { n: '2', title: 'Ministry & Department', desc: 'Select your Ministry first, then your Department or Agency. Contact your HR unit if unsure.' },
              { n: '3', title: 'Grade Level', desc: 'Select your current confirmed grade level as per your appointment or last promotion letter.' },
              { n: '4', title: 'Payment & Papers', desc: 'Enter your Bank Transaction Reference number, select amount paid and choose your papers.' },
              { n: '5', title: 'Declaration', desc: 'Read and accept the statutory declaration. False information is a civil service offence.' },
              { n: '6', title: 'Exam Slip', desc: 'Print immediately after registration. No slip means no entry on examination day.' },
            ].map(({ n, title, desc }) => (
              <div className="step-item" key={n}>
                <span className="step-num" aria-hidden="true">{n}</span>
                <div className="step-content">
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="alert alert--warning" role="alert">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Duplicate registrations using the same phone number will be rejected automatically.</span>
          </div>

          <div className="alert alert--info" role="note" style={{ marginTop: '12px' }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <span>Payment must be made to the designated Oyo State Government Bank account. The Transaction Reference (Tran Ref) is printed on your bank teller receipt or included in your transfer notification.</span>
          </div>

          <button className="tab-cta" onClick={() => onGoto("register")} aria-label="Go to registration form">
            Proceed to Register
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>

        {/* Right: Pricing + Recovery steps */}
        <div className="instructions-block">
          <div className="instructions-block__title">Payment → Papers Guide</div>
          <div className="pricing-card" aria-label="Payment and papers guide">
            <div className="pricing-card__title">Amount Paid → Papers Allowed</div>
            <div className="pricing-rows">
              {[1,2,3,4,5,6,7].map(n => (
                <div className="pricing-row" key={n}>
                  <span className="price-amount">₦{(n * 1000).toLocaleString()}</span>
                  <span className="price-papers">{n} Paper{n > 1 ? 's' : ''}</span>
                  <span className="price-pill">{n}×</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <div className="instructions-block__title">Lost Your Slip? (Recovery Steps)</div>
            <div className="step-list">
              {[
                { n: 'A', title: 'Go to Print / Recover Tab', desc: 'Click the "Print / Recover Slip" tab above to access the recovery section.' },
                { n: 'B', title: 'Enter Phone Number', desc: 'Use the exact phone number submitted during registration.' },
                { n: 'C', title: 'Enter Your Surname', desc: 'Enter your bank transaction reference used during registration.' },
                { n: 'D', title: 'Retrieve & Print', desc: 'Click "Retrieve Slip" to load your slip. Print immediately and present on exam day.' },
              ].map(({ n, title, desc }) => (
                <div className="step-item" key={n}>
                  <span className="step-num step-num--amber" aria-hidden="true">{n}</span>
                  <div className="step-content">
                    <strong>{title}</strong>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
