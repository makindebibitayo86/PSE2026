# PSE Registration System — Deployment Guide
## Oyo State Government | Office of the Head of Service | 2026

---

## 📁 Project Structure

```
pse-registration/
├── index.html              ← Result Checker (original, unchanged)
├── register.html           ← Candidate Registration (NEW)
├── complaints.html         ← Complaints page (add as needed)
├── styles/
│   ├── checker.css         ← Original design system (DO NOT MODIFY)
│   └── register.css        ← Registration extension styles
├── scripts/
│   ├── theme.js            ← Dark/light mode toggle (original)
│   ├── checker.js          ← Result checker logic (original)
│   └── register.js         ← Registration logic (NEW)
└── assets/
    └── images/
        ├── logo.png         ← Oyo State logo (you must supply)
        ├── download.png     ← Alternative logo for cert card (you must supply)
        └── signature.png    ← Head of Service signature (you must supply)
```

---

## 🗄️ Step 1 — Supabase Database Setup

Your project is already on Supabase: `yqnubeevzoxhjllxtjkj`

### 1.1 Create the `candidates` table

Open the **SQL Editor** in your Supabase dashboard and run:

```sql
-- Main candidates table
CREATE TABLE candidates (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_number    TEXT        UNIQUE NOT NULL,
  full_name      TEXT        NOT NULL,
  phone_number   TEXT        UNIQUE NOT NULL,
  lga            TEXT        NOT NULL,
  amount_paid    INTEGER     NOT NULL CHECK (amount_paid BETWEEN 1000 AND 7000),
  exam_centre    TEXT        NOT NULL,
  papers         TEXT[]      NOT NULL,
  passport_url   TEXT,
  registered_at  TIMESTAMPTZ DEFAULT now()
);

-- Centres table (for future dynamic mapping)
CREATE TABLE centres (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  lga      TEXT    NOT NULL,
  name     TEXT    NOT NULL,
  capacity INTEGER,
  active   BOOLEAN DEFAULT true
);

-- Indexes for fast lookups
CREATE UNIQUE INDEX idx_candidates_phone  ON candidates(phone_number);
CREATE UNIQUE INDEX idx_candidates_examno ON candidates(exam_number);
CREATE INDEX        idx_candidates_lga    ON candidates(lga);

-- Exam selections view (optional — useful for reporting)
CREATE VIEW exam_selections AS
  SELECT id, exam_number, full_name, unnest(papers) AS paper
  FROM candidates;
```

### 1.2 Set Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to register (INSERT)
CREATE POLICY "allow_anon_insert" ON candidates
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous users to look up results (SELECT)
CREATE POLICY "allow_anon_select" ON candidates
  FOR SELECT TO anon USING (true);
```

---

## 🪣 Step 2 — Supabase Storage (Passport Photos)

1. Go to **Storage** in your Supabase dashboard
2. Click **New Bucket**
3. Name it: `passports`
4. Set to **Public** (so passport photos render in slips)
5. Under **Policies**, add:

```sql
-- Allow anonymous uploads
CREATE POLICY "allow_anon_upload" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'passports');

-- Allow public reads
CREATE POLICY "allow_public_read" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'passports');
```

---

## 🧩 Step 3 — Add Assets

Place these image files in `assets/images/`:

| File | Description |
|------|-------------|
| `logo.png` | Official Oyo State Government logo (52×52px+) |
| `download.png` | Alternative crest for cert cards |
| `signature.png` | Head of Service signature image |

These are the **same assets** used by the original result checker.

---

## 🔗 Step 4 — Update Navigation Links

The `register.html` navbar includes a "Register" link. Add it to `index.html` and `complaints.html` as well, inside the `<ul class="nav-links">`:

```html
<li><a href="register.html" class="nav-link">Register</a></li>
```

---

## 🌐 Step 5 — Deploy

### Option A: Netlify (Recommended — Free)
1. Drag the entire `pse-registration/` folder to [netlify.com/drop](https://netlify.com/drop)
2. Done. You get a public URL instantly.
3. For a custom domain: Settings → Domain Management

### Option B: GitHub Pages
1. Push the folder to a GitHub repository
2. Settings → Pages → Deploy from branch: `main` / `root`

### Option C: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` inside the project folder
3. Follow prompts

### Option D: Traditional Web Hosting (cPanel)
1. Zip the folder contents
2. Upload via File Manager to `public_html/`
3. Unzip

---

## ⚙️ Configuration Reference

All config is at the top of `scripts/register.js`:

```js
const SUPABASE_URL     = 'https://yqnubeevzoxhjllxtjkj.supabase.co';
const SUPABASE_ANON    = 'your-anon-key';   // already set
const STORAGE_BUCKET   = 'passports';        // bucket name
const CANDIDATES_TABLE = 'candidates';       // table name
```

---

## 🔒 Security Notes

- The **anon key** is public — this is by design for Supabase frontends.
- RLS policies on the `candidates` table enforce what anonymous users can do.
- Phone number uniqueness is enforced at **both** the frontend and database level.
- Exam number uniqueness is enforced via a `UNIQUE` constraint + DB index.
- For admin access (viewing all records, editing), use Supabase Studio with your **service_role** key — never expose that key in frontend code.

---

## 🔧 Extending Centres Dynamically

The `EXAM_CENTRES` object in `register.js` currently maps LGAs to centres as a static JS object.

To load centres from the `centres` table instead:

```js
async function loadCentresForLGA(lga) {
  const url = `${SUPABASE_REST}/centres?lga=eq.${encodeURIComponent(lga)}&active=eq.true&select=name`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` }
  });
  const data = await res.json();
  return data.map(c => c.name);
}
```

Then call this in `onLGAChange()` instead of reading `EXAM_CENTRES`.

---

## 📋 Feature Checklist

| Feature | Status |
|---------|--------|
| Full Name field | ✅ |
| Nigerian phone validation | ✅ |
| All 33 Oyo State LGAs | ✅ |
| Amount paid (₦1k–₦7k) | ✅ |
| Dynamic paper selection (amount-gated) | ✅ |
| Real-time paper counter | ✅ |
| Exam centre per LGA | ✅ |
| Passport photo upload + preview | ✅ |
| Drag & drop photo | ✅ |
| Duplicate phone detection | ✅ |
| Exam number generation (OY-EXAM-YYYY-XXXX) | ✅ |
| Supabase storage upload | ✅ |
| Supabase DB insert | ✅ |
| Printable exam slip | ✅ |
| Passport photo on slip | ✅ |
| Dark / light mode | ✅ |
| Mobile responsive | ✅ |
| Identical navbar & footer | ✅ |
| Design system consistency | ✅ |

---

*Built to match the Oyo State PSE design system. All styles extend `checker.css` without modification.*
