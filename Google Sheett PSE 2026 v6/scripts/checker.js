/* ============================================================
   CHECKER.JS — PSE Result Checker
   Oyo State Government | Office of the Head of Service
   ============================================================
   Data source: Google Sheets via Apps Script Web App (POST)
   ============================================================ */

// ── Configuration ─────────────────────────────────────────────
const LOGO_IMAGE      = 'assets/images/logo.png';
const SIGNATURE_IMAGE = 'assets/images/signature.png';

// ── Google Apps Script Web App URL ────────────────────────────
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwXjS_ex34rmbZM2gg5qT_17E4PyYVllQTy3CQf8-b8vcPwRYuBC1KYXSFBazn3spApuw/exec';

// ── Column display mapping ─────────────────────────────────────
// Keys = exact column headers in your Google Sheet
// Values = labels shown on the result slip
const SUBJECT_COLUMNS = {
  'General Paper'                              : 'General Paper',
  'Financial Regulations/Memoranda'            : 'Financial Regulation/Memoranda',
  'Use of English'                             : 'Use of English',
  'Computer Appreciation & Literacy'           : 'Computer Appreciation',
  'Public / Local Government Service Rules'    : 'Public/Local Government Service Rules',
  'Public Service Commission Regulations'      : 'Public Service Commission Regulations',
  'Local Government Legislation / Common Law'  : 'Local Government/Common Law',
};

// ── Columns excluded from subject-score rendering ─────────────
const EXCLUDE = new Set([
  'S/N', 'Full Name', 'Full Names', 'Phone', 'Phone Number',
  'Examination Number', 'Exam No', 'Surname', 'First Name',
  'Other Name', 'Total Score', 'Grade'
]);

const PASS_MARK = 40;

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchForm')?.addEventListener('submit', e => {
    e.preventDefault();
    searchResults();
  });

  // Force name input to display as uppercase as the user types
  const nameInput = document.getElementById('searchName');
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const pos = nameInput.selectionStart;
      nameInput.value = nameInput.value.toUpperCase();
      nameInput.setSelectionRange(pos, pos);
    });
  }

  document.getElementById('printBtn')?.addEventListener('click', () => window.print());
});

// ── Normalisation helpers ──────────────────────────────────────
const normName  = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
// Strip non-digits, then remove a leading zero (Nigerian format: 0812... → 812...)
const normPhone = s => s.replace(/\D/g, '').replace(/^0/, '');

// ── computeRemarks ────────────────────────────────────────────
function computeRemarks(headers, row) {
  let passCount      = 0;
  let failCount      = 0;
  let failedSubjects = [];

  headers.forEach((h, i) => {
    const header = String(h).trim();
    if (EXCLUDE.has(header)) return;
    const value = row[i];
    if (value === '' || value === null || value === undefined) return;
    const score = Number(value);
    if (Number.isNaN(score)) return;
    if (score >= PASS_MARK) {
      passCount++;
    } else {
      failCount++;
      failedSubjects.push(header);
    }
  });

  return { passCount, failCount, resit: failedSubjects.join(', ') };
}

// ── buildHeadersAndRow ────────────────────────────────────────
function buildHeadersAndRow(record) {
  const headers = ['Full Name', 'Phone', 'Examination Number'];
  const row     = [
    record['Full Names']     ?? record['Full Name']   ?? '',
    record['Phone Number']   ?? record['Phone']        ?? '',
    record['Examination Number'] ?? record['Exam No']  ?? '',
  ];

  for (const [colKey, displayLabel] of Object.entries(SUBJECT_COLUMNS)) {
    headers.push(displayLabel);
    row.push(record[colKey] ?? '');
  }

  return { headers, row };
}

// ── fetchFromGoogleSheets ─────────────────────────────────────
// Calls doPost({ action: 'GET_RESULT', phone }) on the Apps Script.
// Apps Script returns: { found: true, record: {...} }
//                   or { found: false }
//                   or { found: false, error: '...' }
async function fetchFromGoogleSheets(inputName, inputPhone) {
  const cleanPhone    = normPhone(inputPhone);
  const normInputName = normName(inputName);

  const res = await fetch(GAS_URL, {
    method:  'POST',
    // Apps Script requires text/plain for doPost — not application/json
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify({ action: 'GET_RESULT', phone: cleanPhone }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Server error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  if (data.error) throw new Error(data.error);
  if (!data.found) return null;

  const record = data.record;

  // Client-side name verification (security layer)
  const dbName = normName(String(record['Full Names'] ?? record['Full Name'] ?? ''));
  if (!dbName.includes(normInputName)) return null;

  return record;
}

// ── Search ─────────────────────────────────────────────────────
async function searchResults() {
  const nameInput  = document.getElementById('searchName');
  const phoneInput = document.getElementById('searchPhone');
  const display    = document.getElementById('resultDisplay');
  const printBtn   = document.getElementById('printBtn');
  const loader     = document.getElementById('loader');

  const name  = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!name || !phone) {
    showStatus(display, 'warning', 'Please enter both your full name and phone number.');
    return;
  }

  loader.style.display   = 'block';
  display.innerHTML      = '';
  printBtn.style.display = 'none';

  try {
    const record = await fetchFromGoogleSheets(name, phone);
    loader.style.display = 'none';

    if (!record) {
      display.innerHTML = `
        <div class="not-found-msg">
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
            <path d="M11 8v4m0 4h.01" stroke-linecap="round"/>
          </svg>
          <p>No results found for the details provided.</p>
          <p>Please check the spelling of your name and your phone number, then try again.</p>
        </div>`;
      return;
    }

    const { headers, row } = buildHeadersAndRow(record);
    const remarks = computeRemarks(headers, row);

    onResult(
      { success: true, headers, row, remarks },
      nameInput,
      phoneInput
    );

  } catch (err) {
    loader.style.display = 'none';
    console.error('Result fetch failed:', err);
    showStatus(
      display,
      'error',
      'Unable to connect to the database. Please check your connection and try again.'
    );
  }
}

// ── onResult ──────────────────────────────────────────────────
function onResult(data, nameInput, phoneInput) {
  const display  = document.getElementById('resultDisplay');
  const printBtn = document.getElementById('printBtn');

  if (!data.success) {
    showStatus(display, 'error', data.message || 'Record not found.');
    return;
  }

  if (nameInput)  nameInput.value  = '';
  if (phoneInput) phoneInput.value = '';

  const { headers, row, remarks } = data;

  const nameIdx = headers.indexOf('Full Name');
  const examIdx = headers.findIndex(h =>
    h === 'Examination Number' || h === 'Exam No'
  );

  const fullName = nameIdx >= 0 ? String(row[nameIdx]).trim().toUpperCase() : '—';
  const examNo   = examIdx >= 0 ? String(row[examIdx]).trim() : '';

  const sat = remarks.passCount + remarks.failCount;

  let tbodyHTML = '';
  let sn = 1;
  headers.forEach((h, i) => {
    const header = String(h).trim();
    if (EXCLUDE.has(header)) return;
    const val = row[i];
    if (val === '' || val === null || val === undefined) return;
    const score = Number(val);
    if (Number.isNaN(score)) return;
    const pass = score >= PASS_MARK;
    tbodyHTML += `
      <tr>
        <td class="sn-col">${sn++}</td>
        <td>${header}</td>
        <td class="score-col">${score}</td>
        <td class="remark-col ${pass ? 'remark-pass' : 'remark-fail'}">${pass ? 'PASS' : 'FAIL'}</td>
      </tr>`;
  });

  const resitNoticeHTML = remarks.resit
    ? `<div class="resit-notice">
         <strong>Resit Required:</strong><br>
         <span>${remarks.resit}</span>
       </div>`
    : '';

  const issueDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  }).toUpperCase();

  display.innerHTML = `
    <div class="cert-card">

      <div class="cert-header">
        <div class="logo-wrap">
          <img src="assets/images/download.png" alt="Oyo State Government Logo">
        </div>
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
        <div class="stat-box stat-sat">
          <div class="stat-num">${sat}</div>
          <div class="stat-label">Subjects<br>Sat</div>
        </div>
        <div class="stat-box stat-pass">
          <div class="stat-num">${remarks.passCount}</div>
          <div class="stat-label">Subjects<br>Passed</div>
        </div>
        <div class="stat-box stat-fail">
          <div class="stat-num">${remarks.failCount}</div>
          <div class="stat-label">Subjects<br>Failed</div>
        </div>
        <div class="stat-box stat-resit">
          <div class="stat-num">${remarks.failCount}</div>
          <div class="stat-label">Subjects<br>to Resit</div>
        </div>
      </div>

      <table class="result-table">
        <thead>
          <tr>
            <th style="width:36px;">S/N</th>
            <th style="text-align:left;">Subject</th>
            <th style="width:60px;">Score</th>
            <th style="width:68px;">Remark</th>
          </tr>
        </thead>
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

    </div>`;

  printBtn.style.display = 'inline-flex';
}

// ── Status helper ─────────────────────────────────────────────
function showStatus(el, type, msg) {
  const colors = {
    warning: { bg: '#fffbea',  color: '#7a6500', border: '#e8dfa0' },
    error:   { bg: '#fdf3f2',  color: '#c0392b', border: '#f0c8c4' },
  };
  const c = colors[type] || colors.error;
  el.innerHTML = `
    <p style="padding:14px 16px;border-radius:10px;background:${c.bg};
       color:${c.color};border:1px solid ${c.border};font-size:14px;font-weight:500;margin:0;">
      ${msg}
    </p>`;
}
