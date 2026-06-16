/* ============================================================
   REGISTER.JS — PSE Candidate Registration
   Oyo State Government | Office of the Head of Service | 2026
   ============================================================
   Dependencies: Supabase REST API | QRCode.js (CDN)
   Features:
     • Full form validation (frontend)
     • Dynamic paper selection (amount-gated)
     • LGA + Exam Centre population
     • MDA — two-level Ministry → Department/Agency dropdown
     • Grade Level selection (GL 01 – GL 17) — stored in DB only
     • Bank Transaction Reference validation
     • Declaration checkbox (legal accountability)
     • Passport photo upload with preview (optional)
     • Sequential exam number generation per centre
     • Duplicate phone detection
     • Supabase storage upload (passport photos)
     • Slip copy saved to Supabase on print (slip_copies table)
     • Exam slip generation + QR code + print
     • Slip recovery — match by phone + grade level + any name part
   ============================================================ */

'use strict';

// ── Supabase Configuration ────────────────────────────────────
const SUPABASE_URL     = 'https://yqnubeevzoxhjllxtjkj.supabase.co';
const SUPABASE_REST    = `${SUPABASE_URL}/rest/v1`;
const SUPABASE_ANON    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbnViZWV2em94aGpsbHh0amtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjE3MzQsImV4cCI6MjA5MjU5NzczNH0.fRW9-0mhTBqOPZ0rMxS1J0x2175BXc7Li6ofjr-dJSs';
const STORAGE_BUCKET   = 'passports';
const CANDIDATES_TABLE = 'candidates';
const SLIP_COPIES_TABLE = 'slip_copies';

// ── Assets ────────────────────────────────────────────────────
const LOGO_IMAGE = 'assets/images/download.png';

// ── Exam Papers ───────────────────────────────────────────────
const EXAM_PAPERS = [
  'General Paper',
  'Financial Regulations/Memoranda',
  'Use of English',
  'Computer Appreciation & Literacy',
  'Public / Local Government Service Rules',
  'Public Service Commission Regulations',
  'Local Government Legislation / Common Law',
];

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

// ── Exam Centres (mapped to LGAs) ────────────────────────────
const EXAM_CENTRES = {
  'Afijio':            ['Afijio LGA Headquarters', 'Igbo-Ora Grammar School'],
  'Akinyele':          ['Akinyele LGA Secretariat', 'University of Ibadan CBT Centre'],
  'Atiba':             ['Oyo Town Grammar School', 'Atiba LGA Hall'],
  'Atisbo':            ['Atisbo LGA Headquarters', 'Tede Secondary School'],
  'Egbeda':            ['Bishop Phillips Academy', 'Urban Day High School'],
  'Ibadan North':      ['Government Secretariat Annex, Agodi', 'Ibadan North CBT Hall'],
  'Ibadan North-East': ['Iwo Road CBT Centre', 'Ibadan NE LGA Hall'],
  'Ibadan North-West': ['Old Dugbe Market Hall', 'Ibadan NW LGA Secretariat'],
  'Ibadan South-East': ['Mapo Hall Complex', 'Ibadan SE CBT Centre'],
  'Ibadan South-West': ['Oyo State Secretariat, Agodi', 'Mokola CBT Centre'],
  'Ibarapa Central':   ['Igbo-Ora CBT Centre', 'Ibarapa Central LGA Hall'],
  'Ibarapa East':      ['Eruwa Grammar School', 'Ibarapa East LGA Headquarters'],
  'Ibarapa North':     ['Ayete High School', 'Ibarapa North LGA Hall'],
  'Ido':               ['Ido LGA Hall', 'Moniya CBT Centre'],
  'Irepo':             ['Kisi Grammar School', 'Irepo LGA Headquarters'],
  'Iseyin':            ['Iseyin CBT Centre', 'Government College Iseyin'],
  'Itesiwaju':         ['Otu CBT Hall', 'Itesiwaju LGA Secretariat'],
  'Iwajowa':           ['Iwere-Ile LGA Hall', 'Iwajowa CBT Centre'],
  'Kajola':            ['Okeho Grammar School', 'Kajola LGA Hall'],
  'Lagelu':            ['Iyana-Offa CBT Centre', 'Lagelu LGA Secretariat'],
  'Ogbomosho North':   ['Ogbomosho North CBT Centre', 'Adesina High School'],
  'Ogbomosho South':   ['Ogbomosho South LGA Hall', 'Baptist High School Ogbomosho'],
  'Ogo Oluwa':         ['Ajawa Grammar School', 'Ogo Oluwa LGA Secretariat'],
  'Olorunsogo':        ['Olorunsogo LGA Hall', 'Igbeti High School'],
  'Oluyole':           ['Oluyole LGA Secretariat', 'Liberty Stadium Complex'],
  'Ona Ara':           ['Akanran CBT Centre', 'Ona Ara LGA Hall'],
  'Orelope':           ['Iganna High School', 'Orelope LGA Headquarters'],
  'Ori Ire':           ['Ikoyi Grammar School', 'Ori Ire LGA Hall'],
  'Oyo East':          ['Oyo East LGA Secretariat', 'Owode-Oyo CBT Centre'],
  'Oyo West':          ['Oyo West LGA Hall', 'Ibadan Road CBT Centre, Oyo'],
  'Saki East':         ['Saki East LGA Headquarters', 'Agboye Grammar School'],
  'Saki West':         ['Saki CBT Centre', 'Baptist Grammar School Saki'],
  'Surulere':          ['Iresaadu CBT Hall', 'Surulere LGA Secretariat'],
};

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

// ── LGA abbreviations ─────────────────────────────────────────
const LGA_CODES = {
  'Afijio': 'AFJ', 'Akinyele': 'AKN', 'Atiba': 'ATB', 'Atisbo': 'ATS',
  'Egbeda': 'EGB', 'Ibadan North': 'IBN', 'Ibadan North-East': 'IBE',
  'Ibadan North-West': 'IBW', 'Ibadan South-East': 'ISE', 'Ibadan South-West': 'ISW',
  'Ibarapa Central': 'IBC', 'Ibarapa East': 'IBR', 'Ibarapa North': 'IRN',
  'Ido': 'IDO', 'Irepo': 'IRP', 'Iseyin': 'ISY', 'Itesiwaju': 'ITS',
  'Iwajowa': 'IWJ', 'Kajola': 'KJL', 'Lagelu': 'LGL',
  'Ogbomosho North': 'OGN', 'Ogbomosho South': 'OGS', 'Ogo Oluwa': 'OGO',
  'Olorunsogo': 'OLR', 'Oluyole': 'OLY', 'Ona Ara': 'ONA',
  'Orelope': 'ORL', 'Ori Ire': 'ORI', 'Oyo East': 'OYE',
  'Oyo West': 'OYW', 'Saki East': 'SKE', 'Saki West': 'SKW', 'Surulere': 'SRL',
};

// ── Centre abbreviations ──────────────────────────────────────
const CENTRE_CODES = {
  'Afijio LGA Headquarters': 'ALGX', 'Igbo-Ora Grammar School': 'IOGS',
  'Akinyele LGA Secretariat': 'AKLS', 'University of Ibadan CBT Centre': 'UICC',
  'Oyo Town Grammar School': 'OTGS', 'Atiba LGA Hall': 'ATLH',
  'Atisbo LGA Headquarters': 'ASLX', 'Tede Secondary School': 'TDSS',
  'Egbeda LGA Secretariat': 'EGLS', 'Community High School Olodo': 'CHSO',
  'Government Secretariat Annex, Agodi': 'GSAA', 'Ibadan North CBT Hall': 'INCH',
  'Iwo Road CBT Centre': 'IRCC', 'Ibadan NE LGA Hall': 'INEH',
  'Old Dugbe Market Hall': 'ODMH', 'Ibadan NW LGA Secretariat': 'INWS',
  'Mapo Hall Complex': 'MPHC', 'Ibadan SE CBT Centre': 'ISEC',
  'Oyo State Secretariat, Agodi': 'OSSA', 'Mokola CBT Centre': 'MKCC',
  'Igbo-Ora CBT Centre': 'IOCC', 'Ibarapa Central LGA Hall': 'ICLH',
  'Eruwa Grammar School': 'ERGS', 'Ibarapa East LGA Headquarters': 'IELX',
  'Ayete High School': 'AYHS', 'Ibarapa North LGA Hall': 'INLH',
  'Ido LGA Hall': 'IDLH', 'Moniya CBT Centre': 'MNCC',
  'Kisi Grammar School': 'KIGS', 'Irepo LGA Headquarters': 'IRLX',
  'Iseyin CBT Centre': 'ISCC', 'Government College Iseyin': 'GCIS',
  'Otu CBT Hall': 'OTCH', 'Itesiwaju LGA Secretariat': 'ITLS',
  'Iwere-Ile LGA Hall': 'IWLH', 'Iwajowa CBT Centre': 'IWCC',
  'Okeho Grammar School': 'OKGS', 'Kajola LGA Hall': 'KJLH',
  'Iyana-Offa CBT Centre': 'IOFC', 'Lagelu LGA Secretariat': 'LGLS',
  'Ogbomosho North CBT Centre': 'ONCC', 'Adesina High School': 'ADHS',
  'Ogbomosho South LGA Hall': 'OSLH', 'Baptist High School Ogbomosho': 'BHSO',
  'Ajawa Grammar School': 'AJGS', 'Ogo Oluwa LGA Secretariat': 'OOLS',
  'Olorunsogo LGA Hall': 'OLLH', 'Igbeti High School': 'IGHS',
  'Oluyole LGA Secretariat': 'OYLS', 'Liberty Stadium Complex': 'LSTC',
  'Akanran CBT Centre': 'AKCC', 'Ona Ara LGA Hall': 'OALH',
  'Iganna High School': 'IGNH', 'Orelope LGA Headquarters': 'ORLX',
  'Ikoyi Grammar School': 'IKGS', 'Ori Ire LGA Hall': 'OILH',
  'Oyo East LGA Secretariat': 'OELS', 'Owode-Oyo CBT Centre': 'OWCC',
  'Oyo West LGA Hall': 'OWLH', 'Ibadan Road CBT Centre, Oyo': 'IRCO',
  'Saki East LGA Headquarters': 'SELX', 'Agboye Grammar School': 'ABGS',
  'Saki CBT Centre': 'SKCC', 'Baptist Grammar School Saki': 'BGSS',
  'Iresaadu CBT Hall': 'IRSH', 'Surulere LGA Secretariat': 'SRLS',
};

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
  amountPaid.addEventListener('change', onAmountChange);
  photoInput.addEventListener('change', onPhotoSelected);
  photoArea.addEventListener('click', () => photoInput.click());
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
      window.print();
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
  const targets = ['gradeLevel', 'recoverGradeLevel'];
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
  const centres = EXAM_CENTRES[lga] || [];
  centres.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    centreSelect.appendChild(opt);
  });
  if (centres.length === 1) centreSelect.value = centres[0];
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

  paperHint.textContent = allowedPaperCount > 0
    ? `You may select up to ${allowedPaperCount} paper${allowedPaperCount > 1 ? 's' : ''}. Choose carefully.`
    : 'Select your amount paid above to see available papers.';
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

// ── Render paper grid ─────────────────────────────────────────
function renderPaperGrid() {
  paperGrid.innerHTML = '';
  EXAM_PAPERS.forEach((paper, idx) => {
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
async function generateExamNumber(lga, centre) {
  const lgaCode    = LGA_CODES[lga]       || lga.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 3);
  const centreCode = CENTRE_CODES[centre] || centre.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 4);

  const col = encodeURIComponent('exam_centre');
  const val = encodeURIComponent(centre);
  const url = `${SUPABASE_REST}/${CANDIDATES_TABLE}?select=id&${col}=eq.${val}`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` },
  });

  let sequence = 1;
  if (res.ok) { const rows = await res.json(); sequence = rows.length + 1; }
  return `${lgaCode}/${centreCode}/${String(sequence).padStart(4, '0')}`;
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

// ── Duplicate phone check ─────────────────────────────────────
async function phoneExists(phone) {
  const cleaned = phone.replace(/\D/g, '');
  const url = `${SUPABASE_REST}/${CANDIDATES_TABLE}?select=id&phone_number=eq.${cleaned}&limit=1`;
  const res = await fetch(url, { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } });
  if (!res.ok) throw new Error(`DB check failed: ${res.status}`);
  return (await res.json()).length > 0;
}

// ── Upload passport photo ─────────────────────────────────────
async function uploadPassportPhoto(file, examNo) {
  const ext      = file.type === 'image/png' ? 'png' : 'jpg';
  const safeName = examNo.replace(/\//g, '-');
  const url      = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${safeName}.${ext}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': file.type, 'x-upsert': 'true' },
    body: file,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Photo upload failed (${res.status}): ${errText}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${safeName}.${ext}`;
}

// ── Insert candidate record ───────────────────────────────────
async function insertCandidate(payload) {
  const res = await fetch(`${SUPABASE_REST}/${CANDIDATES_TABLE}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`Insert failed: ${res.status} — ${err}`); }
}

// ── Save slip copy to Supabase on print ───────────────────────
async function saveSlipCopy(data) {
  const issueDate = formatIssueDate();
  const payload = {
    exam_number:   data.examNo,
    full_name:     data.fullName,
    phone_number:  data.phone,
    lga:           data.lga,
    ministry:      data.ministry,
    department:    data.department,
    exam_centre:   data.centre,
    amount_paid:   data.amount,
    tran_ref:      data.tranRef,
    papers:        data.papers,
    passport_url:  data.photoURL || null,
    printed_at:    new Date().toISOString(),
    issue_date:    issueDate,
    slip_html:     document.getElementById('examSlip')?.innerHTML || null,
  };

  const res = await fetch(`${SUPABASE_REST}/${SLIP_COPIES_TABLE}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Slip copy insert failed: ${res.status} — ${err}`);
  }
}

// ── Form submit ───────────────────────────────────────────────
async function onFormSubmit(e) {
  e.preventDefault();

  const fullName   = document.getElementById('fullName').value.trim();
  const phone      = document.getElementById('phone').value.trim();
  const lga        = lgaSelect.value;
  const ministry   = ministrySelect.value;
  const department = departmentSelect.value;
  const gradeLevel = document.getElementById('gradeLevel').value;
  const tranRef    = document.getElementById('tranRef').value.trim().toUpperCase();
  const amount     = parseInt(amountPaid.value, 10);
  const centre     = centreSelect.value;
  const papers     = getSelectedPapers();
  const declared   = declarationBox?.checked;

  const errors = [];
  if (!fullName || fullName.length < 3)       errors.push('Please enter your full name (minimum 3 characters).');
  if (!isValidNigerianPhone(phone))            errors.push('Please enter a valid 11-digit Nigerian phone number.');
  if (!lga)                                    errors.push('Please select your Local Government of Residence.');
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
      showFormMsg('A registration already exists for this phone number.', 'error');
      return;
    }

    showFormMsg('Generating examination number…', '');
    const examNo = await generateExamNumber(lga, centre);

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

    await insertCandidate({
      full_name:     fullName,
      phone_number:  phone.replace(/\D/g, ''),
      lga,
      ministry,
      department,
      grade_level:   gradeLevel,
      tran_ref:      tranRef,
      amount_paid:   amount,
      exam_centre:   centre,
      papers,
      exam_number:   examNo,
      passport_url:  photoURL,
      registered_at: new Date().toISOString(),
    });

    setLoading(false);
    showFormMsg('Registration successful!', 'success');

    currentSlipData = { fullName, phone, lga, ministry, department, gradeLevel, tranRef, amount, centre, papers, examNo, photoURL, isRecovered: false };

    setTimeout(() => {
      openSlipModal(currentSlipData);
    }, 600);

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
  paperHint.textContent = 'Select your amount paid above to see available papers.';
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
  if (declarationBox) declarationBox.checked = false;
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
async function fetchCandidateForRecovery(phone, gradeLevel) {
  const cleanedPhone = phone.replace(/\D/g, '');
  const encodedPhone = encodeURIComponent(cleanedPhone);
  const encodedGL    = encodeURIComponent(gradeLevel);

  // Fetch all columns so we can rebuild the slip
  const url = `${SUPABASE_REST}/${CANDIDATES_TABLE}` +
    `?phone_number=eq.${encodedPhone}` +
    `&grade_level=eq.${encodedGL}` +
    `&select=*` +
    `&limit=1`;

  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Recovery lookup failed: ${res.status}`);
  }

  const rows = await res.json();
  return rows.length > 0 ? rows[0] : null;
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

  const phone      = document.getElementById('recoverPhone').value.trim();
  const name       = document.getElementById('recoverName').value.trim();
  const gradeLevel = document.getElementById('recoverGradeLevel').value;

  hideRecoverError();

  // Frontend validation
  if (!isValidNigerianPhone(phone)) {
    showRecoverError('Please enter a valid 11-digit Nigerian phone number.');
    return;
  }
  if (!name || name.length < 2) {
    showRecoverError('Please enter your name (at least 2 characters).');
    return;
  }
  if (!gradeLevel) {
    showRecoverError('Please select your grade level.');
    return;
  }

  setRecoverLoading(true);

  try {
    const record = await fetchCandidateForRecovery(phone, gradeLevel);

    if (!record) {
      setRecoverLoading(false);
      showRecoverError('No registration found matching your phone number and grade level. Please check the details and try again.');
      return;
    }

    // Strict name match: must equal surname OR first_name OR other_name
    if (!nameMatchesCandidate(name, record)) {
      setRecoverLoading(false);
      showRecoverError('The name you entered does not match our records. Please try your surname, first name, or other name exactly as registered.');
      return;
    }

    setRecoverLoading(false);

    // Build slip data from recovered record — NO passport photo
    const recoveredData = {
      fullName:    record.full_name,
      phone:       record.phone_number,
      lga:         record.lga,
      ministry:    record.ministry,
      department:  record.department,
      gradeLevel:  record.grade_level,
      tranRef:     record.tran_ref,
      amount:      record.amount_paid,
      centre:      record.exam_centre,
      papers:      Array.isArray(record.papers) ? record.papers : [],
      examNo:      record.exam_number,
      photoURL:    record.passport_url || null,
      isRecovered: true,
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
function buildSlipHTML({ fullName, phone, lga, ministry, department, tranRef, amount, centre, papers, examNo, photoURL }, qrDataURL) {
  const issueDate = formatIssueDate();

  // For recovered slips, photoURL is always null — no fallback to photoDataURL
  const photoSrc = photoURL || photoDataURL || '';
  const photoHTML = photoSrc
    ? `<img src="${photoSrc}" alt="Passport photograph of ${fullName}">`
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

/* ============================================================
   DATABASE — run these in Supabase SQL editor:

   -- Add new columns to candidates table
   ALTER TABLE candidates
     ADD COLUMN IF NOT EXISTS ministry    TEXT NOT NULL DEFAULT '',
     ADD COLUMN IF NOT EXISTS department  TEXT NOT NULL DEFAULT '',
     ADD COLUMN IF NOT EXISTS grade_level TEXT NOT NULL DEFAULT '',
     ADD COLUMN IF NOT EXISTS tran_ref    TEXT NOT NULL DEFAULT '';

   CREATE INDEX IF NOT EXISTS idx_candidates_ministry ON candidates(ministry);
   CREATE INDEX IF NOT EXISTS idx_candidates_gl       ON candidates(grade_level);
   CREATE INDEX IF NOT EXISTS idx_candidates_phone_gl ON candidates(phone_number, grade_level);

   -- Create slip_copies table for server-side slip records
   CREATE TABLE IF NOT EXISTS slip_copies (
     id           BIGSERIAL PRIMARY KEY,
     exam_number  TEXT NOT NULL,
     full_name    TEXT NOT NULL,
     phone_number TEXT NOT NULL,
     lga          TEXT,
     ministry     TEXT,
     department   TEXT,
     exam_centre  TEXT,
     amount_paid  INTEGER,
     tran_ref     TEXT,
     papers       TEXT[],
     passport_url TEXT,
     slip_html    TEXT,
     issue_date   TEXT,
     printed_at   TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE INDEX IF NOT EXISTS idx_slip_copies_exam_number ON slip_copies(exam_number);
   CREATE INDEX IF NOT EXISTS idx_slip_copies_printed_at  ON slip_copies(printed_at);
   ============================================================ */
