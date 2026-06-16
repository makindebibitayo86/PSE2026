/* ============================================================
   COMPLAINTS.JS — Public Service Examination
   Form logic, validation, and Google Sheets submission
   ─────────────────────────────────────────────────────────────
   CHANGES:
   • Required fields: name, examNo, phone, complaintType
   • Optional fields: email, details (complaint description)
   • validateForm() checks required fields before submission
   • All other logic preserved character-for-character
   ============================================================ */

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzdHvNBpukntNkbEGoIm2UqviyiliHND9F-kD_M6yiQ_Yh9xPXsgMOO_AQ485z_kjSo/exec";

/* ── DOM References ─────────────────────────────────────────── */
const form          = document.getElementById("complaintForm");
const complaintType = document.getElementById("complaintType");
const subjectBox    = document.getElementById("subjectBox");
const statusEl      = document.getElementById("status");
const submitBtn     = form.querySelector(".submit-btn");

/* ── Complaint Type: Toggle Subject Box ─────────────────────── */
complaintType.addEventListener("change", function () {
  const isMissing = this.value === "missing";

  if (isMissing) {
    subjectBox.setAttribute("aria-hidden", "false");
    subjectBox.style.display = "";  /* rely on CSS */
  } else {
    subjectBox.setAttribute("aria-hidden", "true");
    /* uncheck all when hidden */
    subjectBox.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
  }
});

/* ── Status Helper ──────────────────────────────────────────── */
function setStatus(message, type) {
  /* type: 'loading' | 'success' | 'error' | '' */
  statusEl.textContent   = message;
  statusEl.className     = "status-message";

  if (type) {
    statusEl.classList.add("is-visible", `is-${type}`);
  }
}

function clearStatus() {
  statusEl.className  = "status-message";
  statusEl.textContent = "";
}

/* ── Validate Required Fields ───────────────────────────────── */
/* Required: name, examNo, phone, complaintType                 */
/* Optional: email, details                                     */
function validateForm() {
  const name   = document.getElementById("name").value.trim();
  const examNo = document.getElementById("examNo").value.trim();
  const phone  = document.getElementById("phone").value.trim();

  if (!name) {
    setStatus("⚠ Full Name is required.", "error");
    document.getElementById("name").focus();
    return false;
  }
  if (!examNo) {
    setStatus("⚠ Exam Number is required.", "error");
    document.getElementById("examNo").focus();
    return false;
  }
  if (!phone) {
    setStatus("⚠ Phone Number is required.", "error");
    document.getElementById("phone").focus();
    return false;
  }
  if (!complaintType.value) {
    setStatus("⚠ Please select a complaint type.", "error");
    complaintType.focus();
    return false;
  }
  return true;
}

/* ── Form Submit ────────────────────────────────────────────── */
form.addEventListener("submit", async function (e) {
  e.preventDefault();
  clearStatus();

  /* ── Run required-field validation first ── */
  if (!validateForm()) return;

  /* ── Gather complaint value ── */
  let complaintsValue = "";

  if (complaintType.value === "missing") {
    const selected = Array.from(
      subjectBox.querySelectorAll('input[type="checkbox"]:checked')
    ).map(cb => cb.value);

    if (selected.length === 0) {
      setStatus("⚠ Please select at least one missing subject.", "error");
      return;
    }

    complaintsValue = selected.join(", ");

  } else {
    complaintsValue = complaintType.value;
  }

  /* ── Build payload ── */
  const data = new URLSearchParams();
  data.append("name",       document.getElementById("name").value.trim());
  data.append("examNo",     document.getElementById("examNo").value.trim());
  data.append("phone",      document.getElementById("phone").value.trim());
  data.append("email",      document.getElementById("email").value.trim());
  data.append("complaints", complaintsValue);
  data.append("details",    document.getElementById("details").value.trim());

  /* ── UI: loading state ── */
  submitBtn.disabled = true;
  submitBtn.classList.add("is-loading");
  submitBtn.querySelector(".submit-btn-text").textContent = "Submitting";
  setStatus("Submitting your complaint…", "loading");

  /* ── Submit to Google Sheets ── */
  try {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: data
    });

    const result = await response.json();

    if (result.status === "success") {
      setStatus(`✓ Complaint submitted successfully. Reference ID: ${result.id}`, "success");
      form.reset();
      subjectBox.setAttribute("aria-hidden", "true");
    } else {
      setStatus("✗ Submission failed. Please try again or contact support.", "error");
    }

  } catch (err) {
    console.error("Submission error:", err);
    setStatus("✗ Network error. Please check your connection and try again.", "error");

  } finally {
    /* ── UI: restore button ── */
    submitBtn.disabled = false;
    submitBtn.classList.remove("is-loading");
    submitBtn.querySelector(".submit-btn-text").textContent = "Submit Complaint";
  }
});

/* ── Visual polish: auto-grow textarea ─────────────────────── */
const textarea = document.getElementById("details");
if (textarea) {
  textarea.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });
}
