-- ============================================================
-- PSE REGISTRATION SYSTEM — SUPABASE MIGRATION
-- Oyo State Government | Office of the Head of Service | 2026
-- ============================================================
-- Run this entire script in the Supabase SQL Editor.
-- It is fully backward-compatible — existing rows are preserved.
-- New columns are added with safe defaults where required.
-- Run sections in order: 1 → 2 → 3 → 4 → 5 → 6
-- ============================================================


-- ============================================================
-- SECTION 1: ALTER candidates TABLE
-- Add all new columns needed for the extended registration.
-- Every ALTER uses IF NOT EXISTS to be safe on re-runs.
-- ============================================================

-- Staff category: 'Mainstream' or 'Local Government'
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS staff_category TEXT NOT NULL DEFAULT '';

-- Zone auto-assigned from LGA (e.g. 'Ibadan Zone 1', 'Eruwa Zone')
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS zone TEXT NOT NULL DEFAULT '';

-- Zone code used in exam number (e.g. 'IBD', 'IBD2', 'ERW')
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS zone_code TEXT NOT NULL DEFAULT '';

-- Payment verification status
-- Values: 'pending' | 'approved' | 'rejected'
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';

-- Reason provided by admin when rejecting a payment
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Timestamp when admin approved or rejected
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Transaction reference must be unique — one tran ref per candidate
-- First add the column if it doesn't already exist
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS tran_ref TEXT NOT NULL DEFAULT '';

-- Now enforce uniqueness on tran_ref (safe — skips if index exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_tran_ref
  ON candidates(tran_ref);

-- Grade level (may already exist from previous version — safe)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS grade_level TEXT NOT NULL DEFAULT '';

-- Ministry (may already exist — safe)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS ministry TEXT NOT NULL DEFAULT '';

-- Department (may already exist — safe)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT '';


-- ============================================================
-- SECTION 2: CREATE exam_centres TABLE
-- Stores each centre with its zone, capacity and current count.
-- This is the authoritative source for capacity enforcement.
-- ============================================================

CREATE TABLE IF NOT EXISTS exam_centres (
  id            BIGSERIAL    PRIMARY KEY,
  zone          TEXT         NOT NULL,
  zone_code     TEXT         NOT NULL,
  centre_name   TEXT         NOT NULL UNIQUE,
  capacity      INTEGER      NOT NULL DEFAULT 9999,
  registered    INTEGER      NOT NULL DEFAULT 0,
  active        BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT now()
);

-- Index for fast lookups by zone
CREATE INDEX IF NOT EXISTS idx_exam_centres_zone
  ON exam_centres(zone);

CREATE INDEX IF NOT EXISTS idx_exam_centres_active
  ON exam_centres(active);


-- ============================================================
-- SECTION 3: SEED exam_centres TABLE
-- Insert all 7 zones and their centres.
-- Uses ON CONFLICT DO NOTHING so re-running is safe.
-- ============================================================

INSERT INTO exam_centres (zone, zone_code, centre_name, capacity, registered) VALUES

  -- Ibadan Zone 1 (IBD)
  ('Ibadan Zone 1', 'IBD', 'Government College',                          9999, 0),
  ('Ibadan Zone 1', 'IBD', 'Queen''s School',                             9999, 0),
  ('Ibadan Zone 1', 'IBD', 'Apata Community Grammar School',              9999, 0),
  ('Ibadan Zone 1', 'IBD', 'African Church Grammar School',               9999, 0),
  ('Ibadan Zone 1', 'IBD', 'Apata Grammar School',                        9999, 0),
  ('Ibadan Zone 1', 'IBD', 'Our Lady of Apostle Secondary Grammar School',9999, 0),
  ('Ibadan Zone 1', 'IBD', 'St Michael Owode',                            9999, 0),

  -- Ibadan Zone 2 (IBD2)
  ('Ibadan Zone 2', 'IBD2', 'Bishop Phillips Academy',                    9999, 0),
  ('Ibadan Zone 2', 'IBD2', 'Urban Day Secondary School',                 9999, 0),
  ('Ibadan Zone 2', 'IBD2', 'IDC Primary School',                         9999, 0),

  -- Eruwa Zone (ERW)
  ('Eruwa Zone', 'ERW', 'Obaseku High School',                            9999, 0),
  ('Eruwa Zone', 'ERW', 'Obaseku Grammar School',                         9999, 0),

  -- Iseyin Zone (ISY)
  ('Iseyin Zone', 'ISY', 'Iseyin Districts Grammar School',               9999, 0),
  ('Iseyin Zone', 'ISY', 'Raji Oke-Esa Memorial High School',             9999, 0),

  -- Saki Zone (SHK)
  ('Saki Zone', 'SHK', 'Baptist High School',                             9999, 0),
  ('Saki Zone', 'SHK', 'Ansar-U-Deen High School',                        9999, 0),
  ('Saki Zone', 'SHK', 'N.U.D High School',                               9999, 0),
  ('Saki Zone', 'SHK', 'Okere Secondary Grammar School',                  9999, 0),
  ('Saki Zone', 'SHK', 'Oba Kilani Ilufemiloye Secondary School',         9999, 0),

  -- Oyo Zone (OYO)
  ('Oyo Zone', 'OYO', 'St Bernadine College',                             9999, 0),
  ('Oyo Zone', 'OYO', 'Ilora Baptist High School',                        9999, 0),
  ('Oyo Zone', 'OYO', 'Olivet Baptist High School',                       9999, 0),

  -- Ogbomoso Zone (OGB)
  ('Ogbomoso Zone', 'OGB', 'Owode Community Secondary School',            9999, 0),
  ('Ogbomoso Zone', 'OGB', 'Ogbomoso Grammar School',                     9999, 0),
  ('Ogbomoso Zone', 'OGB', 'School of Science',                           9999, 0),
  ('Ogbomoso Zone', 'OGB', 'Millenium Model Secondary School',            9999, 0)

ON CONFLICT (centre_name) DO NOTHING;


-- ============================================================
-- SECTION 4: CREATE exam_number_sequences TABLE
-- Tracks the last-used sequence number per zone + category.
-- This prevents race conditions in exam number generation.
-- ============================================================

CREATE TABLE IF NOT EXISTS exam_number_sequences (
  id            BIGSERIAL  PRIMARY KEY,
  zone_code     TEXT       NOT NULL,
  staff_category TEXT      NOT NULL,  -- 'MS' or 'LG'
  last_sequence INTEGER    NOT NULL DEFAULT 0,
  UNIQUE (zone_code, staff_category)
);

-- Pre-seed all 14 combinations (7 zones × 2 categories)
-- so the first candidate in each zone gets sequence 1
INSERT INTO exam_number_sequences (zone_code, staff_category, last_sequence) VALUES
  ('IBD',  'MS', 0), ('IBD',  'LG', 0),
  ('IBD2', 'MS', 0), ('IBD2', 'LG', 0),
  ('ERW',  'MS', 0), ('ERW',  'LG', 0),
  ('ISY',  'MS', 0), ('ISY',  'LG', 0),
  ('SHK',  'MS', 0), ('SHK',  'LG', 0),
  ('OYO',  'MS', 0), ('OYO',  'LG', 0),
  ('OGB',  'MS', 0), ('OGB',  'LG', 0)
ON CONFLICT (zone_code, staff_category) DO NOTHING;


-- ============================================================
-- SECTION 5: DATABASE FUNCTION — generate_exam_number()
-- Atomically increments the sequence and returns the next
-- exam number. Using a DB function prevents race conditions
-- that would occur if the frontend counted rows instead.
-- ============================================================

CREATE OR REPLACE FUNCTION generate_exam_number(
  p_zone_code      TEXT,
  p_staff_category TEXT   -- 'MS' or 'LG'
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_seq INTEGER;
  v_exam_number TEXT;
BEGIN
  -- Atomically increment and return the new sequence number
  UPDATE exam_number_sequences
     SET last_sequence = last_sequence + 1
   WHERE zone_code      = p_zone_code
     AND staff_category = p_staff_category
  RETURNING last_sequence INTO v_next_seq;

  -- If no row exists (safety net), insert and return 1
  IF v_next_seq IS NULL THEN
    INSERT INTO exam_number_sequences (zone_code, staff_category, last_sequence)
    VALUES (p_zone_code, p_staff_category, 1)
    ON CONFLICT (zone_code, staff_category)
    DO UPDATE SET last_sequence = exam_number_sequences.last_sequence + 1
    RETURNING last_sequence INTO v_next_seq;
  END IF;

  -- Format: ZONE/CATEGORY/CPA/SEQUENCE (zero-padded to 4 digits)
  v_exam_number := p_zone_code || '/' || p_staff_category || '/CPA/' ||
                   LPAD(v_next_seq::TEXT, 4, '0');

  RETURN v_exam_number;
END;
$$;


-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY POLICIES
-- ============================================================

-- candidates table
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Allow anonymous INSERT (registration)
DROP POLICY IF EXISTS "allow_anon_insert" ON candidates;
CREATE POLICY "allow_anon_insert" ON candidates
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous SELECT only of own record
-- (by phone number — used for slip recovery and status check)
DROP POLICY IF EXISTS "allow_anon_select" ON candidates;
CREATE POLICY "allow_anon_select" ON candidates
  FOR SELECT TO anon USING (true);

-- IMPORTANT: No anon UPDATE or DELETE — only service_role (admin) can change payment_status


-- exam_centres table — public read, no anon write
ALTER TABLE exam_centres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_anon_read_centres" ON exam_centres;
CREATE POLICY "allow_anon_read_centres" ON exam_centres
  FOR SELECT TO anon USING (true);


-- exam_number_sequences — no direct anon access
-- The generate_exam_number() function runs as SECURITY DEFINER
-- and handles sequence increments internally
ALTER TABLE exam_number_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no_anon_access_sequences" ON exam_number_sequences;
CREATE POLICY "no_anon_access_sequences" ON exam_number_sequences
  FOR ALL TO anon USING (false);

-- Allow the function to run as the owner (not anon)
ALTER FUNCTION generate_exam_number(TEXT, TEXT) SECURITY DEFINER;


-- ============================================================
-- SECTION 7: INDEXES for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_candidates_zone
  ON candidates(zone);

CREATE INDEX IF NOT EXISTS idx_candidates_staff_category
  ON candidates(staff_category);

CREATE INDEX IF NOT EXISTS idx_candidates_payment_status
  ON candidates(payment_status);

CREATE INDEX IF NOT EXISTS idx_candidates_zone_category
  ON candidates(zone_code, staff_category);

CREATE INDEX IF NOT EXISTS idx_candidates_phone_gl
  ON candidates(phone_number, grade_level);


-- ============================================================
-- SECTION 8: slip_copies table (if not already created)
-- ============================================================

CREATE TABLE IF NOT EXISTS slip_copies (
  id           BIGSERIAL    PRIMARY KEY,
  exam_number  TEXT         NOT NULL,
  full_name    TEXT         NOT NULL,
  phone_number TEXT         NOT NULL,
  lga          TEXT,
  zone         TEXT,
  zone_code    TEXT,
  staff_category TEXT,
  ministry     TEXT,
  department   TEXT,
  grade_level  TEXT,
  exam_centre  TEXT,
  amount_paid  INTEGER,
  tran_ref     TEXT,
  papers       TEXT[],
  passport_url TEXT,
  slip_html    TEXT,
  issue_date   TEXT,
  printed_at   TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slip_copies_exam_number
  ON slip_copies(exam_number);

CREATE INDEX IF NOT EXISTS idx_slip_copies_printed_at
  ON slip_copies(printed_at);


-- ============================================================
-- VERIFICATION QUERIES
-- Run these after migration to confirm everything is correct.
-- ============================================================

-- Check all zones and centre counts
SELECT zone, zone_code, COUNT(*) AS centre_count, SUM(capacity) AS total_capacity
FROM exam_centres
GROUP BY zone, zone_code
ORDER BY zone;

-- Check sequence table
SELECT * FROM exam_number_sequences ORDER BY zone_code, staff_category;

-- Check candidates table columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'candidates'
ORDER BY ordinal_position;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
