/* ============================================================
   REGISTER.JS — PSE Candidate Registration
   Oyo State Government | Office of the Head of Service | 2026
   ============================================================
   Database: Google Sheets via Apps Script Web App
   Features:
     • Full form validation (frontend)
     • Dynamic paper selection (category-gated)
     • LGA + Exam Centre population (zone-based)
     • MDA — two-level Ministry → Department/Agency dropdown
     • Grade Level selection (GL 01 – GL 17)
     • Bank Transaction Reference validation
     • Declaration checkbox (legal accountability)
     • Passport photo upload → Google Drive
     • Sequential exam number generation per zone+category
     • Duplicate phone + tran ref detection
     • Exam slip generation + QR code + print
     • Slip recovery — match by phone + tran ref
   ============================================================ */

'use strict';

// ── Google Apps Script Web App URL ───────────────────────────
// After deploying your Apps Script, paste the Web App URL here
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqI-TcTuNHG_ZbPGheuIGg6qCnW8EQiGiT_XABoKWveDfgryhpPdECnCuHZNNq90ZS/exec';

// ── Assets ────────────────────────────────────────────────────
const LOGO_IMAGE = 'assets/images/download.png';

// ── Exam Papers ───────────────────────────────────────────────
const EXAM_PAPERS = {
  'Mainstream': [
    'General Paper',
    'Use of English',
    'Financial Regulations',
    'Computer Appreciation & Literacy',
    'Public Service Rules',
    'Public Service Commission Regulations',
    'Common Law',
  ],
  'Local Government': [
    'General Paper',
    'Use of English',
    'Financial Memoranda',
    'Computer Appreciation & Literacy',
    'Local Government Service Rules',
    'Public Service Commission Regulations',
    'Common Law',
  ],
};

// ── Oyo State LGAs ───────────────────────────────────────────
const OYO_LGAS = [
  'Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda',
  'Ibadan North', 'Ibadan North-East', 'Ibadan North-West',
  'Ibadan South-East', 'Ibadan South-West', 'Ibarapa Central',
  'Ibarapa East', 'Ibarapa North', 'Ido', 'Irepo', 'Iseyin',
  'Itesiwaju', 'Iwajowa', 'Kajola', 'Lagelu', 'Ogbomosho North',
  'Ogbomosho South', 'Ogo Oluwa', 'Olorunsogo', 'Oluyole',
  'Ona Ara', 'Orelope', 'Ori Ire', 'Oyo East', 'Oyo West',
  'Saki East', 'Saki West', 'Surulere',
];

// ── Zone → LGA mapping (from README) ────────────────────────
// Each LGA is assigned to a zone; all LGAs in a zone share the same centres.
const LGA_ZONE = {
  // Ibadan Zone 1 · Code: IBD
  'Ibadan North':      'IBD',
  'Ibadan North-East': 'IBD',
  'Ibadan North-West': 'IBD',
  'Ibadan South-East': 'IBD',
  'Ibadan South-West': 'IBD',
  'Oluyole':           'IBD',
  'Akinyele':          'IBD',
  'Ido':               'IBD',
  // Ibadan Zone 2 · Code: IBD2
  'Egbeda':            'IBD2',
  'Lagelu':            'IBD2',
  'Ona Ara':           'IBD2',
  // Eruwa Zone · Code: ERW
  'Ibarapa Central':   'ERW',
  'Ibarapa East':      'ERW',
  'Ibarapa North':     'ERW',
  // Iseyin Zone · Code: ISY
  'Iseyin':            'ISY',
  'Itesiwaju':         'ISY',
  'Iwajowa':           'ISY',
  'Kajola':            'ISY',
  'Atisbo':            'ISY',
  // Saki Zone · Code: SHK
  'Saki East':         'SHK',
  'Saki West':         'SHK',
  'Orelope':           'SHK',
  'Olorunsogo':        'SHK',
  'Irepo':             'SHK',
  // Oyo Zone · Code: OYO
  'Oyo East':          'OYO',
  'Oyo West':          'OYO',
  'Atiba':             'OYO',
  'Afijio':            'OYO',
  'Ogo Oluwa':         'OYO',
  // Ogbomoso Zone · Code: OGB
  'Ogbomosho North':   'OGB',
  'Ogbomosho South':   'OGB',
  'Surulere':          'OGB',
  'Ori Ire':           'OGB',
};

// ── Zone → Exam Centres (official centres from README) ───────
const ZONE_CENTRES = {
  'IBD': [
    'Government College',
    "Queen's School",
    'Apata Community Grammar School',
    'African Church Grammar School',
    'Apata Grammar School',
    'Our Lady of Apostle Secondary Grammar School',
    'St Michael Owode',
  ],
  'IBD2': [
    'Bishop Phillips Academy',
    'Urban Day Secondary School',
    'IDC Primary School',
  ],
  'ERW': [
    'Obaseku High School',
    'Obaseku Grammar School',
  ],
  'ISY': [
    'Iseyin Districts Grammar School',
    'Raji Oke-Esa Memorial High School',
  ],
  'SHK': [
    'Baptist High School',
    'Ansar-U-Deen High School',
    'N.U.D High School',
    'Okere Secondary Grammar School',
    'Oba Kilani Ilufemiloye Secondary School',
  ],
  'OYO': [
    'St Bernadine College',
    'Ilora Baptist High School',
    'Olivet Baptist High School',
  ],
  'OGB': [
    'Owode Community Secondary School',
    'Ogbomoso Grammar School',
    'School of Science',
    'Millenium Model Secondary School',
  ],
};

// ── Helper: get centres for a given LGA ──────────────────────
function getCentresForLGA(lga) {
  const zone = LGA_ZONE[lga];
  return zone ? (ZONE_CENTRES[zone] || []) : [];
}

// ── Oyo State MDAs ────────────────────────────────────────────
const OYO_MDAS = {
  'Office of the Governor': [
    "Governor's Office",
    "Deputy Governor's Office",
    "Chief of Staff's Office",
    'Office of Special Adviser on Strategy',
    'Office of Special Adviser on Media & Publicity',
    'Oyo State Security Trust Fund',
  ],
  'Office of the Secretary to the State Government': [
    'Cabinet Affairs',
    'Establishment & Training',
    'Political & Economic Affairs',
    'Inter-Governmental Relations',
    'Ceremonials & Protocol',
  ],
  'Office of the Head of Service': [
    'Human Resource Management',
    'Career Management Services',
    'Service Policy & Strategy',
    'Public Service Reform',
    'Productivity Measurement',
  ],
  'Ministry of Finance': [
    'Budget & Economic Planning',
    'Treasury & Accounts',
    'Revenue & Taxation',
    'Debt Management',
    'Financial Intelligence Unit',
    'Oyo State Internal Revenue Service (OYIRS)',
    'Oyo State Investment & PPP Agency (OYSIPA)',
  ],
  'Ministry of Education, Science & Technology': [
    'Basic Education',
    'Post-Primary Education',
    'Tertiary Education',
    'Science & Technology',
    'Oyo State Teaching Service Commission (TESCOM)',
    'Oyo State Universal Basic Education Board (OYSUBEB)',
    'Agency for Adult & Non-Formal Education (AANFE)',
    'Oyo State Examinations Board',
    'Oyo State Scholarship Board',
  ],
  'Ministry of Health': [
    'Primary Health Care',
    'Secondary Health Care',
    'Hospital Services',
    'Public Health & Disease Control',
    'Pharmacy & Narcotics',
    'Oyo State Hospitals Management Board (HMB)',
    'Oyo State Agency for the Control of AIDS (OYSACA)',
    'Oyo State Primary Health Care Board',
    'Oyo State Blood Transfusion Service',
  ],
  'Ministry of Agriculture & Natural Resources': [
    'Crop Production',
    'Animal Production & Veterinary Services',
    'Fisheries',
    'Forestry & Natural Resources',
    'Agricultural Extension Services',
    'Oyo State Agricultural Development Programme (OYADEP)',
    'Oyo State Agricultural Land Use & Land Bank Agency',
  ],
  'Ministry of Works & Transport': [
    'Highways & Roads',
    'Bridges & Drainages',
    'Buildings & Housing',
    'Transport Services',
    'Oyo State Road Maintenance Agency (OYROMA)',
    'Oyo State Public Works Corporation (OSPWC)',
    'Oyo State Traffic Management Authority (OYTMA)',
  ],
  'Ministry of Justice': [
    'Civil Litigation',
    'Criminal Prosecution',
    'Public Prosecution',
    'Legislative Drafting',
    'Law Reform Commission',
    "Citizens' Mediation Centre",
    'Oyo State Legal Aid Council',
  ],
  'Ministry of Land, Housing & Urban Development': [
    'Land Administration',
    'Survey & Mapping',
    'Urban & Regional Planning',
    'Housing Development',
    'Oyo State Land Use & Allocation Committee',
    'Oyo State Urban Development Board (OUDB)',
    'Oyo State Property Development Corporation (OSPDC)',
  ],
  'Ministry of Environment': [
    'Environmental Planning & Policy',
    'Pollution Control',
    'Environmental Sanitation',
    'Climate Change & Meteorology',
    'Oyo State Waste Management Authority (OWMA)',
    'Oyo State Environmental Protection Agency (OYSEPA)',
  ],
  'Ministry of Youth & Sports': [
    'Youth Development',
    'Sports Development',
    'NYSC Liaison Office',
    'Oyo State Sports Council',
    'Oyo State Youth Investment Fund',
  ],
  'Ministry of Women Affairs & Social Inclusion': [
    'Women Development',
    'Social Welfare Services',
    'Child Development',
    'People with Disabilities',
    'Oyo State Agency for the Welfare of Indigent Persons',
  ],
  'Ministry of Information, Culture & Tourism': [
    'Information Services',
    'Culture & Arts',
    'Tourism & Hospitality',
    'Broadcasting Services',
    'Oyo State Broadcasting Corporation (BCOS)',
    'Heritage Arts & Culture Bureau',
    'Oyo State Tourism Board',
  ],
  'Ministry of Commerce, Industry & Cooperatives': [
    'Commerce & Trade',
    'Industry & Investment',
    'Cooperatives Services',
    'Consumer Protection',
    'Oyo State Investment Promotion Agency',
    'Oyo State Bureau of Statistics',
  ],
  'Ministry of Energy & Mineral Resources': [
    'Power & Electricity',
    'Petroleum Resources',
    'Mineral Resources',
    'Rural Electrification',
    'Oyo State Rural Electrification Board (OSREB)',
  ],
  'Ministry of Local Government & Community Development': [
    'Local Government Administration',
    'Community Development Services',
    'Traditional Council Affairs',
    'Oyo State Local Government Service Commission',
    'Joint Account Allocation Committee (JAAC)',
  ],
  'Ministry of Public Service & Special Duties': [
    'Public Service Administration',
    'Special Duties & Projects',
    'Service Delivery Monitoring',
    'Oyo State Civil Service Commission',
  ],
  'Ministry of Budget & Economic Planning': [
    'Budget Preparation & Monitoring',
    'Economic Planning',
    'Development Planning',
    'Statistics & Data Management',
    'Oyo State Planning Commission',
  ],
  'Oyo State House of Assembly': [
    "Clerk's Office",
    'Research & Information',
    'Committee Affairs',
    'Administrative Services',
    'Legislative Aides Office',
  ],
  'Oyo State Judiciary': [
    'High Court',
    'Magistrate Courts',
    'Customary Court of Appeal',
    'Sharia Court of Appeal',
    'Judiciary Administrative Services',
    'National Industrial Court (Ibadan Division)',
  ],
  'Oyo State Independent Electoral Commission (OYSIEC)': [
    'Electoral Operations',
    'Voter Registration',
    'Civic Education',
    'Administrative Services',
  ],
  "Oyo State Auditor-General's Office": [
    'State Audit',
    'Local Government Audit',
    'Pre-Payment Audit',
    'Special Audit & Investigation',
  ],
  "Oyo State Accountant-General's Office": [
    'Treasury Operations',
    'Salary & Payroll',
    'Government Revenue',
    'Financial Reporting',
    'Pensions & Gratuities Administration',
  ],
  'Civil Service Commission': [
    'Appointments & Promotions',
    'Discipline',
    'Records & Personnel',
    'Administrative Services',
  ],
  'Local Government Service Commission': [
    'Appointments & Promotions (LG)',
    'Discipline (LG)',
    'Records & Personnel (LG)',
    'Administrative Services (LG)',
  ],
  'Teaching Service Commission (TESCOM)': [
    'Appointments & Promotions (LG)',
    'Discipline (MS)',
    'Records & Personnel',
    'Administrative Services (MS)',
  ],
  'Other Agency / Parastatal': [
    'Specify in remarks — contact the examination office',
  ],
};

// ── Grade Levels ──────────────────────────────────────────────
const GRADE_LEVELS = [
  'GL 01', 'GL 02', 'GL 03', 'GL 04', 'GL 05', 'GL 06', 'GL 07',
  'GL 08', 'GL 09', 'GL 10', 'GL 12', 'GL 13', 'GL 14',
  'GL 15', 'GL 16', 'GL 17',
];


// ── State ─────────────────────────────────────────────────────
let selectedPaperCount = 0;
let allowedPaperCount  = 0;
let photoDataURL       = null;
let photoFile          = null;
let currentSlipData    = null;

// ── DOM refs ──────────────────────────────────────────────────
const regForm          = document.getElementById('regForm');
const amountPaid       = document.getElementById('amountPaid');
const lgaSelect        = document.getElementById('lga');
const centreSelect     = document.getElementById('examCentre');
const ministrySelect   = document.getElementById('ministry');
const departmentSelect = document.getElementById('department');
const paperGrid        = document.getElementById('paperGrid');
const paperHint        = document.getElementById('paperHint');
const paperCounter     = document.getElementById('paperCounter');
const selectedCount    = document.getElementById('selectedCount');
const allowedCount     = document.getElementById('allowedCount');
const photoArea        = document.getElementById('photoUploadArea');
const photoInput       = document.getElementById('passportPhoto');
const photoPreview     = document.getElementById('photoPreview');
const photoPlaceholder = document.getElementById('photoPlaceholder');
const submitBtn        = document.getElementById('submitBtn');
const regLoader        = document.getElementById('regLoader');
const formStatusMsg    = document.getElementById('formStatusMsg');
const slipModal        = document.getElementById('slipModal');
const declarationBox   = document.getElementById('declarationCheck');

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateLGAs();
  populateMinistries();
  populateGradeLevels();
  renderPaperGrid();
  wireDeclaration();

  lgaSelect.addEventListener('change', onLGAChange);
  ministrySelect.addEventListener('change', onMinistryChange);
  document.getElementById('staffCategory').addEventListener('change', onStaffCategoryChange);
  amountPaid.addEventListener('change', onAmountChange);
  photoInput.addEventListener('change', onPhotoSelected);
  photoArea.addEventListener('click', (e) => { if (e.target !== photoInput) photoInput.click(); });
  photoArea.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); photoInput.click(); }
  });
  setupDragDrop();

  regForm.addEventListener('submit', onFormSubmit);

  const printBtn = document.getElementById('slipPrintBtn');
  if (printBtn) {
    printBtn.addEventListener('click', async () => {
      if (currentSlipData && !currentSlipData.isRecovered) {
        try {
          await saveSlipCopy(currentSlipData);
        } catch (err) {
          console.warn('Slip copy save failed (non-blocking):', err);
        }
      }
      printClean('examSlip');
    });
  }

  document.getElementById('slipCloseBtn')?.addEventListener('click', closeSlipModal);
  slipModal.querySelector('.slip-modal__backdrop')?.addEventListener('click', closeSlipModal);

  // ── Recover form ──
  const recoverForm = document.getElementById('recoverForm');
  if (recoverForm) {
    recoverForm.addEventListener('submit', onRecoverSubmit);
  }
});

// ── Populate LGAs ────────────────────────────────────────────
function populateLGAs() {
  OYO_LGAS.forEach(lga => {
    const opt = document.createElement('option');
    opt.value = lga; opt.textContent = lga;
    lgaSelect.appendChild(opt);
  });
}

// ── Populate Ministries ───────────────────────────────────────
function populateMinistries() {
  Object.keys(OYO_MDAS).sort().forEach(ministry => {
    const opt = document.createElement('option');
    opt.value = ministry; opt.textContent = ministry;
    ministrySelect.appendChild(opt);
  });
}

// ── Ministry change → populate Departments ───────────────────
function onMinistryChange() {
  const ministry = ministrySelect.value;
  departmentSelect.innerHTML = '<option value="" disabled selected>— Select department / agency —</option>';
  departmentSelect.disabled = !ministry;

  (OYO_MDAS[ministry] || []).forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept; opt.textContent = dept;
    departmentSelect.appendChild(opt);
  });
}

// ── Populate Grade Levels ─────────────────────────────────────
function populateGradeLevels() {
  const targets = ['gradeLevel'];
  targets.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    GRADE_LEVELS.forEach(gl => {
      const opt = document.createElement('option');
      opt.value = gl;
      opt.textContent = gl;
      select.appendChild(opt);
    });
  });
}

// ── LGA change → populate Centres ────────────────────────────
function onLGAChange() {
  const lga = lgaSelect.value;
  centreSelect.innerHTML = '<option value="" disabled selected>— Select exam centre —</option>';
  const centres = getCentresForLGA(lga);
  if (centres.length === 0) {
    const opt = document.createElement('option');
    opt.disabled = true;
    opt.textContent = '— No centres found for this LGA —';
    centreSelect.appendChild(opt);
    return;
  }
  centres.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    centreSelect.appendChild(opt);
  });
  if (centres.length === 1) centreSelect.value = centres[0];
}

// ── Staff category change → re-render paper grid ─────────────
function onStaffCategoryChange() {
  // Clear amount, selections and re-render with correct paper list
  selectedPaperCount = 0;
  allowedPaperCount  = 0;
  selectedCount.textContent = '0';
  allowedCount.textContent  = '0';
  paperCounter.classList.remove('is-full');
  amountPaid.value = '';
  paperHint.textContent = 'Select your amount paid above to see available papers.';
  renderPaperGrid();
}

// ── Amount change → update paper availability ─────────────────
function onAmountChange() {
  const amount = parseInt(amountPaid.value, 10);
  allowedPaperCount = isNaN(amount) ? 0 : amount / 1000;
  allowedCount.textContent = allowedPaperCount;

  selectedPaperCount = 0;
  selectedCount.textContent = 0;
  document.querySelectorAll('.paper-card.is-checked').forEach(c => {
    c.classList.remove('is-checked');
    c.querySelector('input[type="checkbox"]').checked = false;
  });
  updatePaperCards();
  updatePaperCounter();

  const hasCat = !!document.getElementById('staffCategory')?.value;
  paperHint.textContent = allowedPaperCount > 0
    ? `You may select up to ${allowedPaperCount} paper${allowedPaperCount > 1 ? 's' : ''}. Choose carefully.`
    : hasCat ? 'Select your amount paid above to see available papers.'
             : 'Select your Staff Category above to see available papers.';
}

// ── Declaration → gate submit + live name display ─────────────
function wireDeclaration() {
  if (!declarationBox) return;
  submitBtn.disabled = true;
  submitBtn.classList.add('is-locked');

  declarationBox.addEventListener('change', () => {
    submitBtn.disabled = !declarationBox.checked;
    submitBtn.classList.toggle('is-locked', !declarationBox.checked);
    const declNote = document.getElementById('submitDeclNote');
    if (declNote) declNote.style.display = declarationBox.checked ? 'none' : '';
  });

  const nameInput = document.getElementById('fullName');
  const declName  = document.getElementById('declNameDisplay');
  if (nameInput && declName) {
    nameInput.addEventListener('input', () => {
      declName.textContent = nameInput.value.trim() || '[ your full name will appear here ]';
    });
  }
}

// ── Clean print (new blank window — prints exactly what user sees) ─
function printClean(slipElementId) {
  const el = document.getElementById(slipElementId);
  if (!el) return;

  // Collect all stylesheet hrefs from this page
  const styles = Array.from(document.styleSheets).map(ss => {
    try { return ss.href ? `<link rel="stylesheet" href="${ss.href}">` : ''; }
    catch(e) { return ''; }
  }).join('\n');

  // Clone the slip element with all computed styles intact
  const slipHTML = el.outerHTML;

  const win = window.open('', '_blank', 'width=900,height=750');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Print</title>
  ${styles}
  <style>
    @page { size: A4; margin: 8mm; }
    html, body {
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
      overflow: hidden !important;
    }
    .slip-modal__backdrop, .slip-modal__actions, .no-print { display: none !important; }
    .exam-slip {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      page-break-after: avoid !important;
      page-break-inside: avoid !important;
      break-after: avoid !important;
      box-shadow: none !important;
      margin: 0 !important;
    }
    * { page-break-after: avoid !important; break-after: avoid !important; }
  </style>
</head>
<body>${slipHTML}</body>
</html>`);
  win.document.close();
  // Wait for stylesheets to load before printing
  win.addEventListener('load', () => { win.focus(); win.print(); win.close(); });
}

// ── Render paper grid ─────────────────────────────────────────
function renderPaperGrid() {
  const category = document.getElementById('staffCategory')?.value || '';
  const papers = EXAM_PAPERS[category] || [];

  paperGrid.innerHTML = '';

  if (!category) {
    paperHint.textContent = 'Select your Staff Category above to see available papers.';
    return;
  }

  papers.forEach((paper, idx) => {
    const card = document.createElement('label');
    card.className = 'paper-card is-disabled';
    card.setAttribute('role', 'checkbox');
    card.setAttribute('aria-checked', 'false');
    card.setAttribute('aria-label', paper);
    card.dataset.idx = idx;
    card.innerHTML = `
      <input type="checkbox" name="papers" value="${paper}" tabindex="-1">
      <span class="paper-checkbox">
        <span class="paper-checkbox__check" aria-hidden="true">
          <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
      </span>
      <span class="paper-label">${paper}</span>`;
    card.addEventListener('click', e => { e.preventDefault(); onPaperToggle(card); });
    card.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onPaperToggle(card); }
    });
    paperGrid.appendChild(card);
  });
}

function onPaperToggle(card) {
  if (allowedPaperCount === 0) return;
  const checkbox = card.querySelector('input[type="checkbox"]');
  const isChecked = card.classList.contains('is-checked');
  if (isChecked) {
    card.classList.remove('is-checked');
    card.setAttribute('aria-checked', 'false');
    checkbox.checked = false;
    selectedPaperCount--;
  } else {
    if (selectedPaperCount >= allowedPaperCount) return;
    card.classList.add('is-checked');
    card.setAttribute('aria-checked', 'true');
    checkbox.checked = true;
    selectedPaperCount++;
  }
  selectedCount.textContent = selectedPaperCount;
  updatePaperCards();
  updatePaperCounter();
}

function updatePaperCards() {
  const atLimit = selectedPaperCount >= allowedPaperCount;
  document.querySelectorAll('.paper-card').forEach(card => {
    const checked = card.classList.contains('is-checked');
    if (allowedPaperCount === 0) {
      card.classList.add('is-disabled'); card.removeAttribute('tabindex');
    } else {
      card.setAttribute('tabindex', '0');
      card.classList.toggle('is-disabled', !checked && atLimit);
    }
  });
}

function updatePaperCounter() {
  paperCounter.classList.toggle('is-full', allowedPaperCount > 0 && selectedPaperCount >= allowedPaperCount);
}

// ── Photo handling ────────────────────────────────────────────
function onPhotoSelected(e) {
  const file = e.target.files[0];
  if (file) processPhotoFile(file);
}

function processPhotoFile(file) {
  const photoError = document.getElementById('photoError');
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    photoError.textContent = 'Only JPG and PNG files are accepted.';
    photoError.style.display = 'block'; return;
  }
  if (file.size > 2 * 1024 * 1024) {
    photoError.textContent = 'File size must not exceed 2MB.';
    photoError.style.display = 'block'; return;
  }
  photoError.style.display = 'none';
  photoFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    photoDataURL = ev.target.result;
    photoPreview.src = photoDataURL;
    photoPreview.style.display = 'block';
    photoPlaceholder.style.display = 'none';
    photoArea.classList.add('has-photo');
  };
  reader.readAsDataURL(file);
}

function setupDragDrop() {
  photoArea.addEventListener('dragover', e => { e.preventDefault(); photoArea.classList.add('drag-over'); });
  photoArea.addEventListener('dragleave', () => photoArea.classList.remove('drag-over'));
  photoArea.addEventListener('drop', e => {
    e.preventDefault(); photoArea.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) processPhotoFile(file);
  });
}

// ── Validation ────────────────────────────────────────────────
function isValidNigerianPhone(phone) {
  const c = phone.replace(/\D/g, '');
  return /^(070|071|080|081|090|091)\d{8}$/.test(c) && c.length === 11;
}

function isValidTranRef(ref) {
  const clean = ref.replace(/\s/g, '').toUpperCase();
  return /^[A-Z0-9]{8,20}$/.test(clean);
}

function getSelectedPapers() {
  return Array.from(document.querySelectorAll('.paper-card.is-checked'))
    .map(c => c.querySelector('input[type="checkbox"]').value);
}

// ── Sequential exam number ────────────────────────────────────
// ── Apps Script API helper ───────────────────────────────────
async function callAPI(payload, { retries = 3, baseDelay = 1000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`API call failed: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.warn(`API attempt ${attempt} failed, retrying in ${delay}ms…`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

async function generateExamNumber(lga, staffCategory) {
  const zoneCode = LGA_ZONE[lga] || lga.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 4);
  const catCode  = staffCategory === 'Local Government' ? 'LG' : 'MS';
  const result   = await callAPI({ action: 'GET_SEQUENCE', zone_code: zoneCode, staff_category: staffCategory });
  const sequence = String(result.sequence).padStart(4, '0');
  return `${zoneCode}/${catCode}/CPA/${sequence}`;
}

// ── QR text ───────────────────────────────────────────────────
function buildQRText({ fullName, phone, lga, ministry, department, centre, papers, examNo, issueDate }) {
  return [
    '[ OYO STATE GOVT - PSE 2026 ]',
    'EXAM NUMBER - ' + examNo,
    'FULL NAME   - ' + fullName.toUpperCase(),
    'PHONE       - ' + phone,
    'MINISTRY    - ' + ministry,
    'DEPT/AGENCY - ' + department,
    'LGA         - ' + lga,
    'CENTRE      - ' + centre,
    'DATE ISSUED - ' + issueDate,
    'PAPERS      - ' + papers.join(', '),
  ].join('\n');
}

// ── QR code generator ─────────────────────────────────────────
function generateQRDataURL(text) {
  return new Promise(function (resolve, reject) {
    const staging = document.createElement('div');
    staging.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:220px;height:220px;';
    document.body.appendChild(staging);

    try {
      new QRCode(staging, {
        text, width: 220, height: 220,
        colorDark: '#1a1a1a', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L,
      });
    } catch (e) { document.body.removeChild(staging); reject(e); return; }

    setTimeout(() => {
      const c   = staging.querySelector('canvas');
      const img = staging.querySelector('img');
      document.body.removeChild(staging);
      if (c) { resolve(c.toDataURL('image/png')); }
      else if (img && img.src && img.src.length > 100) { resolve(img.src); }
      else { reject(new Error('QRCode.js produced no output')); }
    }, 300);
  });
}

// ── Duplicate checks ─────────────────────────────────────────
async function phoneExists(phone) {
  const cleaned = phone.replace(/\D/g, '');
  const result  = await callAPI({ action: 'CHECK_PHONE', phone: cleaned });
  return result.exists;
}

async function tranRefExists(tranRef) {
  const result = await callAPI({ action: 'CHECK_TRAN', tran_ref: tranRef });
  return result.exists;
}

// ── Convert photo to base64 data URL and store directly ───────
async function uploadPassportPhoto(file, examNo) {
  // Store as base64 data URL directly in the sheet — loads reliably as img src
  return await fileToDataURL(file);
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result); // full data URL e.g. data:image/jpeg;base64,...
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ── Insert candidate record → Google Sheets ──────────────────
async function insertCandidate(payload) {
  await callAPI({ action: 'INSERT', data: payload });
}

// ── Save slip copy (no-op — Sheets is the permanent record) ──
async function saveSlipCopy(data) {
  // Google Sheets already holds the full record; no separate slip copy needed
  return;
}

// ── Form submit ───────────────────────────────────────────────
async function onFormSubmit(e) {
  e.preventDefault();

  const fullName      = document.getElementById('fullName').value.trim();
  const phone         = document.getElementById('phone').value.trim();
  const lga           = lgaSelect.value;
  const disability    = document.getElementById('disability').value;
  const staffCategory = document.getElementById('staffCategory').value;
  const ministry      = ministrySelect.value;
  const department    = departmentSelect.value;
  const gradeLevel    = document.getElementById('gradeLevel').value;
  const tranRef       = document.getElementById('tranRef').value.trim().toUpperCase();
  const amount        = parseInt(amountPaid.value, 10);
  const centre        = centreSelect.value;
  const papers        = getSelectedPapers();
  const declared      = declarationBox?.checked;

  const errors = [];
  if (!fullName || fullName.length < 3)       errors.push('Please enter your full name (minimum 3 characters).');
  if (!isValidNigerianPhone(phone))            errors.push('Please enter a valid 11-digit Nigerian phone number.');
  if (!lga)                                    errors.push('Please select your Local Government of Residence.');
  if (!disability)                             errors.push('Please indicate your disability status.');
  if (!staffCategory)                          errors.push('Please select your Staff Category (Mainstream or Local Government).');
  if (!ministry)                               errors.push('Please select your Ministry or Institution.');
  if (!department)                             errors.push('Please select your Department or Agency.');
  if (!gradeLevel)                             errors.push('Please select your current Grade Level.');
  if (!tranRef || !isValidTranRef(tranRef))    errors.push('Please enter a valid Bank Transaction Reference (8–24 alphanumeric characters).');
  if (!amount)                                 errors.push('Please select the amount paid.');
  if (!centre)                                 errors.push('Please select an exam centre.');
  if (papers.length === 0)                     errors.push('Please select at least one examination paper.');
  if (papers.length !== allowedPaperCount)     errors.push(`You must select exactly ${allowedPaperCount} paper(s) based on your payment.`);
  if (!declared)                               errors.push('You must read and accept the declaration before submitting.');

  if (errors.length) { showFormMsg(errors[0], 'error'); return; }

  setLoading(true);
  showFormMsg('Verifying registration details…', '');

  try {
    if (await phoneExists(phone)) {
      setLoading(false);
      showFormMsg('A registration already exists for this phone number. Use the Recover Your Slip panel if you have already registered.', 'error');
      return;
    }

    if (await tranRefExists(tranRef)) {
      setLoading(false);
      showFormMsg('This transaction reference has already been used. Each payment can only be used once.', 'error');
      return;
    }

    showFormMsg('Generating examination number…', '');
    const examNo = await generateExamNumber(lga, staffCategory);

    let photoURL = null;
    if (photoFile) {
      showFormMsg('Uploading passport photograph…', '');
      try {
        photoURL = await uploadPassportPhoto(photoFile, examNo);
      } catch (photoErr) {
        console.warn('Photo upload failed (non-blocking):', photoErr);
        showFormMsg('Photo upload failed — saving registration without photo…', '');
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    showFormMsg('Saving registration…', '');

    const zoneCode = LGA_ZONE[lga] || lga.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 4);

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
      tran_ref:         tranRef,
      amount_paid:      amount,
      exam_centre:      centre,
      papers,
      exam_number:      examNo,
      passport_url:     photoURL,
      payment_status:   'pending',
      rejection_reason: '',
      registered_at:    new Date().toISOString(),
      reviewed_at:      '',
    });

    setLoading(false);
    showFormMsg('Registration successful!', 'success');

    currentSlipData = { fullName, phone, lga, disability, staffCategory, ministry, department, gradeLevel, tranRef, amount, centre, papers, examNo, photoURL, isRecovered: false };

    openPendingModal(currentSlipData);

  } catch (err) {
    setLoading(false);
    console.error('Registration error:', err);
    showFormMsg('Registration failed: ' + err.message, 'error');
  }
}

function showFormMsg(msg, type) {
  formStatusMsg.textContent = msg;
  formStatusMsg.className = 'submit-note' + (type ? ` is-${type}` : '');
}

function setLoading(on) {
  submitBtn.disabled = on || (declarationBox && !declarationBox.checked);
  regLoader.style.display = on ? 'block' : 'none';
  submitBtn.querySelector('.submit-btn__text').textContent = on ? 'Submitting…' : 'Submit Registration';
}

// ── Slip modal ────────────────────────────────────────────────
// ── Pending modal ────────────────────────────────────────────
function openPendingModal(data) {
  const modal = document.getElementById('pendingModal');
  document.getElementById('pendingSlip').innerHTML = buildPendingHTML(data);
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  modal.querySelector('.slip-modal__content').scrollTop = 0;

  document.getElementById('pendingCloseBtn').onclick = () => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    regForm.reset();
    resetFormState();
  };
  modal.querySelector('.slip-modal__backdrop').onclick = () => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    regForm.reset();
    resetFormState();
  };
}

function buildPendingHTML({ fullName, tranRef }) {
  const dateStr = formatIssueDate();
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
          <div class="slip-field">
            <span class="slip-field-label">Tran Ref</span>
            <span class="slip-field-value">${tranRef}</span>
          </div>
          <div class="slip-field">
            <span class="slip-field-label">Date Submitted</span>
            <span class="slip-field-value">${dateStr}</span>
          </div>
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
    </div>`;
}

async function openSlipModal(data) {
  const issueDate = formatIssueDate();
  let qrDataURL = null;
  try { qrDataURL = await generateQRDataURL(buildQRText({ ...data, issueDate })); }
  catch (err) { console.error('QR error:', err); }

  slipModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('examSlip').innerHTML = buildSlipHTML(data, qrDataURL);
  slipModal.querySelector('.slip-modal__content').scrollTop = 0;
}

function closeSlipModal() {
  slipModal.style.display = 'none';
  document.body.style.overflow = '';
  currentSlipData = null;

  // Only reset if it was a registration slip (not a recovery)
  if (!slipModal.dataset.isRecovered) {
    regForm.reset();
    resetFormState();
  }
  delete slipModal.dataset.isRecovered;
}

function resetFormState() {
  selectedPaperCount = 0; allowedPaperCount = 0;
  photoDataURL = null; photoFile = null;
  photoPreview.style.display = 'none';
  photoPlaceholder.style.display = '';
  photoArea.classList.remove('has-photo');
  selectedCount.textContent = '0';
  allowedCount.textContent  = '0';
  paperHint.textContent = 'Select your Staff Category above to see available papers.';
  paperCounter.classList.remove('is-full');
  centreSelect.innerHTML     = '<option value="" disabled selected>— Select exam centre —</option>';
  departmentSelect.innerHTML = '<option value="" disabled selected>— Select department / agency —</option>';
  departmentSelect.disabled  = true;
  document.querySelectorAll('.paper-card').forEach(c => {
    c.classList.remove('is-checked'); c.classList.add('is-disabled');
    c.querySelector('input[type="checkbox"]').checked = false;
  });
  submitBtn.disabled = true;
  submitBtn.classList.add('is-locked');
  if (declarationBox) { declarationBox.checked = false; declarationBox.dispatchEvent(new Event('change')); }
  const declName = document.getElementById('declNameDisplay');
  if (declName) declName.textContent = '[ your full name will appear here ]';
  showFormMsg('', '');
}

function formatIssueDate() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
}

// ── Slip Recovery ─────────────────────────────────────────────

/**
 * Fetches a candidate by phone + grade_level (exact match, server-side).
 * Then verifies name client-side against surname / first_name / other_name.
 *
 * NOTE: The candidates table stores full_name as a single field.
 * The name match splits full_name into parts and checks each part
 * case-insensitively against the supplied name.
 *
 * If your DB stores separate surname / first_name / other_name columns,
 * replace the name-matching section below with direct column comparisons.
 */
async function fetchCandidateForRecovery(phone, surname) {
  const cleaned = phone.replace(/\D/g, '');
  const result  = await callAPI({ action: 'GET_CANDIDATE', phone: cleaned, surname: surname.trim().toUpperCase() });
  return result.found ? result.record : null;
}

/**
 * Checks whether the supplied name matches any part of the candidate's full name.
 * Splits full_name by whitespace and compares case-insensitively.
 *
 * If your schema has separate surname / first_name / other_name columns,
 * pass them in and compare directly instead.
 */
function nameMatchesCandidate(suppliedName, record) {
  const query = suppliedName.trim().toLowerCase();
  if (!query) return false;

  // Support separate columns if they exist in the record
  const candidates = [];

  if (record.surname)    candidates.push(record.surname.trim().toLowerCase());
  if (record.first_name) candidates.push(record.first_name.trim().toLowerCase());
  if (record.other_name) candidates.push(record.other_name.trim().toLowerCase());

  // Fallback: split full_name into parts
  if (candidates.length === 0 && record.full_name) {
    const parts = record.full_name.trim().split(/\s+/);
    parts.forEach(p => candidates.push(p.toLowerCase()));
  }

  return candidates.some(part => part === query);
}

function showRecoverError(msg) {
  const errBox  = document.getElementById('recoverError');
  const errText = document.getElementById('recoverErrorText');
  if (errBox && errText) {
    errText.textContent = msg;
    errBox.style.display = 'flex';
  }
}

function hideRecoverError() {
  const errBox = document.getElementById('recoverError');
  if (errBox) errBox.style.display = 'none';
}

function setRecoverLoading(on) {
  const btn    = document.getElementById('recoverBtn');
  const loader = document.getElementById('recoverLoader');
  if (btn) {
    btn.disabled = on;
    btn.querySelector('.recover-btn__text').textContent = on ? 'Searching…' : 'Retrieve Slip';
  }
  if (loader) loader.style.display = on ? 'block' : 'none';
}

async function onRecoverSubmit(e) {
  e.preventDefault();

  const phone   = document.getElementById('recoverPhone').value.trim();
  const surname = document.getElementById('recoverSurname').value.trim().toUpperCase();

  hideRecoverError();

  if (!surname || surname.length < 2) {
    showRecoverError('Please enter your surname.');
    return;
  }
  if (!isValidNigerianPhone(phone)) {
    showRecoverError('Please enter a valid 11-digit Nigerian phone number.');
    return;
  }

  setRecoverLoading(true);

  try {
    const record = await fetchCandidateForRecovery(phone, surname);

    if (!record) {
      setRecoverLoading(false);
      showRecoverError('No registration found matching that surname or phone number. Please check your details and try again.');
      return;
    }

    setRecoverLoading(false);

    const status = record.payment_status || 'pending';

    if (status === 'pending') {
      showRecoverError(
        `Your payment is still being verified. Please check back in 24–48 hours. Your registration number is: ${record.exam_number}`
      );
      return;
    }

    if (status === 'rejected') {
      const reason = record.rejection_reason || 'No reason provided.';
      showRecoverError(
        `Your payment could not be verified. Reason: ${reason}. Please contact the Office of the Head of Service.`
      );
      return;
    }

    if (status !== 'approved') {
      showRecoverError('Your registration is not yet approved. Please check back later or contact the Office of the Head of Service.');
      return;
    }

    // payment_status === 'approved' — show full slip
    const recoveredData = {
      fullName:      record.full_name,
      phone:         record.phone_number,
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
    };

    currentSlipData = recoveredData;
    slipModal.dataset.isRecovered = 'true';
    await openSlipModal(recoveredData);
    document.getElementById('recoverForm').reset();

  } catch (err) {
    setRecoverLoading(false);
    console.error('Slip recovery error:', err);
    showRecoverError('Retrieval failed. Please check your connection and try again.');
  }
}

// ── Build slip HTML ───────────────────────────────────────────
function buildSlipHTML({ fullName, phone, lga, disability, staffCategory, ministry, department, tranRef, amount, centre, papers, examNo, photoURL }, qrDataURL) {
  const issueDate = formatIssueDate();

  const photoSrc = photoURL || photoDataURL || '';
  const photoHTML = photoSrc
    ? `<img src="${photoSrc}" alt="Passport photograph of ${fullName}"
         crossorigin="anonymous"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
         style="width:100%;height:100%;object-fit:cover;">
       <div class="slip-photo-placeholder" style="display:none;">PASSPORT<br>PHOTO</div>`
    : `<div class="slip-photo-placeholder">PASSPORT<br>PHOTO</div>`;

  const papersRows = papers.map((p, i) => `
    <tr><td style="width:36px;color:#888;font-size:11px;">${i + 1}</td><td>${p}</td></tr>`).join('');

  const qrBlock = qrDataURL
    ? `<img src="${qrDataURL}" alt="Verification QR Code" class="slip-qr-image">`
    : `<div class="slip-qr-placeholder" style="width:110px;height:110px;border:1.5px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:9px;color:#aaa;text-align:center;">QR<br>CODE</div>`;

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
          <div class="slip-field">
            <span class="slip-field-label">Min.</span>
            <span class="slip-field-value">${ministry}</span>
          </div>
          <div class="slip-field">
            <span class="slip-field-label">Phone Number</span>
            <span class="slip-field-value">${phone}</span>
          </div>
          <div class="slip-field">
            <span class="slip-field-label">Dept / Agency</span>
            <span class="slip-field-value">${department}</span>
          </div>
          <div class="slip-field">
            <span class="slip-field-label">Tran Ref</span>
            <span class="slip-field-value">${tranRef}</span>
          </div>
          <div class="slip-field">
            <span class="slip-field-label">LGA</span>
            <span class="slip-field-value">${lga}</span>
          </div>
          <div class="slip-field">
            <span class="slip-field-label">Amount Paid</span>
            <span class="slip-field-value">&#8358;${Number(amount).toLocaleString()}</span>
          </div>
          <div class="slip-field">
            <span class="slip-field-label">Staff Category</span>
            <span class="slip-field-value">${staffCategory || '—'}</span>
          </div>
          <div class="slip-field">
            <span class="slip-field-label">Disability</span>
            <span class="slip-field-value">${disability || 'None'}</span>
          </div>
          <div class="slip-field">
            <span class="slip-field-label">Exam Centre</span>
            <span class="slip-field-value">${centre}</span>
          </div>
          <div class="slip-field">
            <span class="slip-field-label">Date Issued</span>
            <span class="slip-field-value">${issueDate}</span>
          </div>
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
    </div>`;
}

