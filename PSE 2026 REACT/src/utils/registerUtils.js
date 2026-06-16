import { APPS_SCRIPT_URL, LGA_ZONE } from './registerData'

export function isValidNigerianPhone(phone) {
  const c = phone.replace(/\D/g, '')
  return /^(070|071|080|081|090|091)\d{8}$/.test(c) && c.length === 11
}

export function isValidTranRef(ref) {
  const clean = ref.replace(/\s/g, '').toUpperCase()
  return /^[A-Z0-9]{8,20}$/.test(clean)
}

export function formatIssueDate() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()
}

export async function callAPI(payload, { retries = 3, baseDelay = 1000 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`API call failed: ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      return data
    } catch (err) {
      lastError = err
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

export async function generateExamNumber(lga, staffCategory) {
  const zoneCode = LGA_ZONE[lga] || lga.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 4)
  const catCode  = staffCategory === 'Local Government' ? 'LG' : 'MS'
  const result   = await callAPI({ action: 'GET_SEQUENCE', zone_code: zoneCode, staff_category: staffCategory })
  const sequence = String(result.sequence).padStart(4, '0')
  return `${zoneCode}/${catCode}/CPA/${sequence}`
}

export function buildQRText({ fullName, phone, lga, ministry, department, centre, papers, examNo, issueDate }) {
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
  ].join('\n')
}

export function generateQRDataURL(text) {
  return new Promise((resolve, reject) => {
    const staging = document.createElement('div')
    staging.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:220px;height:220px;'
    document.body.appendChild(staging)
    try {
      new window.QRCode(staging, {
        text, width: 220, height: 220,
        colorDark: '#1a1a1a', colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.L,
      })
    } catch (e) { document.body.removeChild(staging); reject(e); return }
    setTimeout(() => {
      const c   = staging.querySelector('canvas')
      const img = staging.querySelector('img')
      document.body.removeChild(staging)
      if (c) { resolve(c.toDataURL('image/png')) }
      else if (img && img.src && img.src.length > 100) { resolve(img.src) }
      else { reject(new Error('QRCode.js produced no output')) }
    }, 300)
  })
}

export async function phoneExists(phone) {
  const cleaned = phone.replace(/\D/g, '')
  const result  = await callAPI({ action: 'CHECK_PHONE', phone: cleaned })
  return result.exists
}

export async function tranRefExists(tranRef) {
  const result = await callAPI({ action: 'CHECK_TRAN', tran_ref: tranRef })
  return result.exists
}

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export async function uploadPassportPhoto(file, examNo) {
  const dataURL  = await fileToDataURL(file)
  // Strip the "data:image/jpeg;base64," prefix — Apps Script only needs raw base64
  const comma    = dataURL.indexOf(',')
  const base64   = dataURL.slice(comma + 1)
  const mimeType = file.type || 'image/jpeg'

  const result = await callAPI({
    action:       'UPLOAD_PHOTO',
    exam_number:  examNo,
    photo_base64: base64,
    mime_type:    mimeType,
  })
  if (!result.url) throw new Error('Photo upload returned no URL')
  return result.url
}

export async function insertCandidate(payload) {
  await callAPI({ action: 'INSERT', data: payload })
}

export async function fetchCandidateForRecovery(phone, surname) {
  const cleaned = phone.replace(/\D/g, '')
  const result  = await callAPI({ action: 'GET_CANDIDATE', phone: cleaned, surname: surname.trim().toUpperCase() })
  return result.found ? result.record : null
}

export function printClean(slipElementId) {
  const el = document.getElementById(slipElementId)
  if (!el) return

  // Strip the mobile scale transform before capturing HTML, then restore it.
  // useSlipScale sets transform: scale(N) on the element — if we capture
  // outerHTML with that inline style present, the print window renders the
  // slip at the scaled-down size with white space around it.
  const savedTransform = el.style.transform
  const savedWidth     = el.style.width
  el.style.transform   = ''
  el.style.width       = ''

  // Capture external stylesheet links (CDN etc.)
  const linkTags = Array.from(document.styleSheets).map(ss => {
    try { return ss.href ? `<link rel="stylesheet" href="${ss.href}">` : '' }
    catch (e) { return '' }
  }).join('\n')

  // Capture ALL inline/injected styles (Vite bundles CSS as <style> tags)
  const inlineStyles = Array.from(document.styleSheets).map(ss => {
    try {
      if (ss.href) return '' // already captured above
      const rules = Array.from(ss.cssRules || []).map(r => r.cssText).join('\n')
      return rules ? `<style>${rules}</style>` : ''
    } catch (e) { return '' }
  }).join('\n')

  const slipHTML = el.outerHTML

  // Restore the transform so the on-screen view is unchanged
  el.style.transform = savedTransform
  el.style.width     = savedWidth

  const win = window.open('', '_blank', 'width=900,height=750')
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Print</title>
  ${linkTags}
  ${inlineStyles}
  <style>
    @page { size: A4; margin: 8mm; }
    html, body { background: white !important; margin: 0 !important; padding: 0 !important; height: auto !important; overflow: hidden !important; }
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
</html>`)
  win.document.close()
  win.addEventListener('load', () => { win.focus(); win.print(); win.close() })
}