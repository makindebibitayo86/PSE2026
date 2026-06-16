# PSE Registration System — Technical Reference
## Oyo State Government | Office of the Head of Service | 2026

---

## What This System Does

This is the official candidate registration portal for the 2026 Oyo State Compulsory Public Service Examination (PSE). It handles:

- Candidate registration with full validation
- Automatic zone and exam centre assignment based on LGA
- Unique exam number generation per zone and staff category
- Payment submission (tran ref + proof)
- Pending verification screen (no slip until admin approves)
- Slip recovery after admin approval
- Centre capacity enforcement (max 9,999 per centre)

---

## Zone → LGA → Exam Centre Mapping

### Ibadan Zone 1 · Code: IBD
**LGAs:** Ibadan North, Ibadan North-East, Ibadan North-West, Ibadan South-East, Ibadan South-West, Oluyole, Akinyele, Ido

**Exam Centres:** Government College, Queen's School, Apata Community Grammar School, African Church Grammar School, Apata Grammar School, Our Lady of Apostle Secondary Grammar School, St Michael Owode

---

### Ibadan Zone 2 · Code: IBD2
**LGAs:** Egbeda, Lagelu, Ona Ara

**Exam Centres:** Bishop Phillips Academy, Urban Day Secondary School, IDC Primary School

---

### Eruwa Zone · Code: ERW
**LGAs:** Ibarapa Central, Ibarapa East, Ibarapa North

**Exam Centres:** Obaseku High School, Obaseku Grammar School

---

### Iseyin Zone · Code: ISY
**LGAs:** Iseyin, Itesiwaju, Iwajowa, Kajola, Atisbo

**Exam Centres:** Iseyin Districts Grammar School, Raji Oke-Esa Memorial High School

---

### Saki Zone · Code: SHK
**LGAs:** Saki East, Saki West, Oorelope, Olorunsogo, Irepo

**Exam Centres:** Baptist High School, Ansar-U-Deen High School, N.U.D High School, Okere Secondary Grammar School, Oba Kilani Ilufemiloye Secondary School

---

### Oyo Zone · Code: OYO
**LGAs:** Oyo East, Oyo West, Atiba, Afijio, Ogo Oluwa

**Exam Centres:** St Bernadine College, Ilora Baptist High School, Olivet Baptist High School

---

### Ogbomoso Zone · Code: OGB
**LGAs:** Ogbomosho North, Ogbomosho South, Surulere, Ori Ire

**Exam Centres:** Owode Community Secondary School, Ogbomoso Grammar School, School of Science, Millenium Model Secondary School

---

## Staff Categories and Papers

### Mainstream Staff (MS)
General Paper, Use of English, Financial Regulations, Computer Appreciation & Literacy, Public Service Rules, Public Service Commission Regulations, Common Law

### Local Government Staff (LG)
General Paper, Use of English, Financial Memoranda, Computer Appreciation & Literacy, Local Government Service Rules, Public Service Commission Regulations, Common Law

Papers are shown dynamically based on category selected. A candidate cannot see or select the other category's papers.

---

## Exam Number Format

ZONE_CODE / CATEGORY / CPA / SEQUENCE

- CPA = Compulsory Public Administration (fixed for all candidates)
- SEQUENCE = 4-digit zero-padded, counted per zone per category
- Generated atomically in the database — no race conditions possible

Examples:
- IBD/MS/CPA/0001  — Ibadan Zone 1, Mainstream, 1st candidate
- IBD/LG/CPA/0001  — Ibadan Zone 1, Local Govt, 1st candidate
- IBD2/MS/CPA/0001 — Ibadan Zone 2, Mainstream, 1st candidate
- ERW/LG/CPA/0047  — Eruwa Zone, Local Govt, 47th candidate
- ISY/MS/CPA/0012  — Iseyin Zone, Mainstream, 12th candidate
- SHK/LG/CPA/0003  — Saki Zone, Local Govt, 3rd candidate
- OYO/MS/CPA/0099  — Oyo Zone, Mainstream, 99th candidate
- OGB/LG/CPA/0200  — Ogbomoso Zone, Local Govt, 200th candidate

---

## Registration Flow

1. Candidate fills form
2. Frontend validates all fields
3. System checks phone number uniqueness — BLOCK if duplicate
4. System checks tran ref uniqueness — BLOCK if duplicate
5. LGA is silently mapped to zone + zone_code
6. DB function generates exam number atomically
7. Passport photo uploaded to Supabase Storage (optional)
8. Candidate record inserted with payment_status = 'pending'
9. PENDING SCREEN shown — NOT a slip
   Shows: name, exam number, zone, centre, tran ref, instructions
   Tells candidate to return in 24-48 hours via Recover Slip panel
10. Finance team reviews tran refs and updates payment_status
11. Approved — candidate uses Recover Slip panel — slip shown
    Rejected — candidate sees rejection reason in Recover panel

---

## Payment Verification Rules

- No slip is shown at registration time under any circumstance
- payment_status controls access: pending / approved / rejected
- Recover Slip panel checks payment_status server-side before showing any slip
- A rejected candidate sees their rejection reason and cannot print a slip
- Only finance/admin team can update payment_status via Supabase Studio using the service_role key

---

## Uniqueness Constraints

| Field        | Enforced At                      |
|--------------|----------------------------------|
| phone_number | DB UNIQUE index + frontend check |
| tran_ref     | DB UNIQUE index + frontend check |
| exam_number  | DB UNIQUE index + atomic function|

---

## Centre Capacity

- Default: 9,999 per centre
- Stored in exam_centres.capacity
- Current count in exam_centres.registered
- Full centres are disabled in the dropdown
- Candidate cannot submit for a full centre

To change a centre's capacity:
  UPDATE exam_centres SET capacity = 500 WHERE centre_name = 'Government College';

To check capacity status:
  SELECT centre_name, zone, capacity, registered,
         (capacity - registered) AS remaining,
         CASE WHEN registered >= capacity THEN 'FULL' ELSE 'OPEN' END AS status
  FROM exam_centres ORDER BY zone, centre_name;

---

## Exporting Data for Finance Department

Export pending payments from Supabase Studio:
  Table Editor -> candidates -> Filter payment_status = pending -> Export CSV

Or via SQL:
  SELECT exam_number, full_name, phone_number, zone, staff_category,
         exam_centre, tran_ref, amount_paid, registered_at
  FROM candidates
  WHERE payment_status = 'pending'
  ORDER BY registered_at ASC;

To approve a candidate:
  UPDATE candidates
  SET payment_status = 'approved', reviewed_at = now()
  WHERE tran_ref = 'ZTF25050112345678';

To reject a candidate with reason:
  UPDATE candidates
  SET payment_status = 'rejected',
      rejection_reason = 'Transaction reference not found in bank records',
      reviewed_at = now()
  WHERE tran_ref = 'ZTF25050112345678';

---

## Database Tables

### candidates
Every registered candidate. Key columns:
  exam_number (UNIQUE), full_name, phone_number (UNIQUE), lga, zone, zone_code,
  staff_category, ministry, department, grade_level, tran_ref (UNIQUE),
  amount_paid, exam_centre, papers[], passport_url,
  payment_status, rejection_reason, reviewed_at, registered_at

### exam_centres
All centres with capacity tracking:
  zone, zone_code, centre_name (UNIQUE), capacity, registered, active

### exam_number_sequences
Atomic counters — one row per zone+category combination:
  zone_code, staff_category, last_sequence

### slip_copies
Archived record of every printed slip for audit.

---

## File Structure

  pse-registration/
  +-- index.html           Result Checker
  +-- register.html        Candidate Registration
  +-- complaints.html      Complaints page
  +-- MIGRATION.sql        Run in Supabase SQL Editor first
  +-- README.md            This file
  +-- DEPLOYMENT.md        Hosting and setup guide
  +-- styles/
  |   +-- checker.css      Core design system (do not modify)
  |   +-- register.css     Registration styles
  +-- scripts/
  |   +-- theme.js         Dark/light mode toggle
  |   +-- checker.js       Result checker logic
  |   +-- register.js      Registration logic
  +-- assets/
      +-- images/
          +-- logo.png, download.png, signature.png

---

## Supabase Configuration

  Project ID:     yqnubeevzoxhjllxtjkj
  Project URL:    https://yqnubeevzoxhjllxtjkj.supabase.co
  Storage Bucket: passports (public)

Security: The anon key in register.js is safe to be public.
To update payment_status, use Supabase Studio with service_role key only.
Never expose the service_role key in any frontend file.

---

## Security Summary

| Threat                         | Mitigation                                      |
|--------------------------------|-------------------------------------------------|
| Slip bypass before payment     | payment_status checked server-side on recovery  |
| Duplicate phone registration   | UNIQUE constraint + frontend pre-check          |
| Duplicate tran ref             | UNIQUE constraint + frontend pre-check          |
| Race condition on exam numbers | Atomic DB function with row-level locking       |
| Centre overfilling             | Capacity check on load + DB registered counter  |
| Status manipulation via browser| payment_status only writable by service_role    |

---

Oyo State Government Secretariat, Ibadan · 2026
Built for the Office of the Head of Service
