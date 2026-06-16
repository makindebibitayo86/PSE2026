import { useState } from 'react'
import InstructionsTab from '../components/InstructionsTab'
import RegisterTab from '../components/RegisterTab'
import RecoverTab from '../components/RecoverTab'
import { SlipModal, PendingModal } from '../components/SlipModals'

const TABS = [
  {
    id: 'instructions',
    title: 'Instructions',
    sub: 'Read before registering',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
      </svg>
    ),
  },
  {
    id: 'register',
    title: 'Register',
    sub: 'Fill & submit form',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: 'recover',
    title: 'Print / Recover Slip',
    sub: 'Retrieve & reprint',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
  },
]

export default function Register() {
  const [activeTab,   setActiveTab]   = useState('instructions')
  const [pendingData, setPendingData] = useState(null)
  const [slipData,    setSlipData]    = useState(null)

  function activateTab(tabId) {
    setActiveTab(tabId)
    document.querySelector('.tab-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="register-page">

      {/* ── Animated Mesh Background ── */}
      <div className="bg-mesh" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      {/* ── Grain Texture ── */}
      <div className="page-grain" aria-hidden="true" />

      {/* ── Page Header ── */}
      <header className="page-header">
        <div className="page-header__badge">
          <span className="badge-dot" aria-hidden="true"></span>
          Candidate Registration · 2026
        </div>
        <h1 className="page-title">Oyo State <em>Public Service</em><br />Examination Portal</h1>
        <p className="page-subtitle">Complete your registration, then print your exam slip — all in one place.</p>
      </header>

      {/* ── Tab Container ── */}
      <div className="tab-container">

        {/* Tab Navigation */}
        <div className="tab-nav" role="tablist" aria-label="Registration sections">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn${activeTab === tab.id ? ' is-active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tab-${tab.id}`}
              id={`btn-${tab.id}`}
              onClick={() => activateTab(tab.id)}
            >
              <span className="tab-btn__icon" aria-hidden="true">{tab.icon}</span>
              <span className="tab-btn__label">
                <span className="tab-btn__title">{tab.title}</span>
                <span className="tab-btn__sub">{tab.sub}</span>
              </span>
            </button>
          ))}
        </div>

        {/* TAB 1: INSTRUCTIONS */}
        <div className={`tab-panel${activeTab === 'instructions' ? ' is-active' : ''}`} id="tab-instructions" role="tabpanel" aria-labelledby="btn-instructions">
          <InstructionsTab onGoto={activateTab} />
        </div>

        {/* TAB 2: REGISTER */}
        <div className={`tab-panel${activeTab === 'register' ? ' is-active' : ''}`} id="tab-register" role="tabpanel" aria-labelledby="btn-register">
          <RegisterTab onPendingReady={data => setPendingData(data)} />
        </div>

        {/* TAB 3: RECOVER */}
        <div className={`tab-panel${activeTab === 'recover' ? ' is-active' : ''}`} id="tab-recover" role="tabpanel" aria-labelledby="btn-recover">
          <RecoverTab onSlipReady={data => setSlipData(data)} />
        </div>

      </div>

      {/* Modals */}
      <PendingModal data={pendingData} onClose={() => setPendingData(null)} />
      <SlipModal    data={slipData}    onClose={() => setSlipData(null)} />

    </main>
  )
}
