# ProLog v3.0 — Architectural Specification & Engineering Prompt

## 1. Project Context

ProLog is a clinical case logbook for fertility and gynaecology specialists. The current version (v1/v2) exists as a single monolithic HTML file with client-side localStorage for all data. This document specifies the re-architecture into a properly engineered, secure, containerised web application.

**The existing `prolog.html` is the authoritative source for:**
- All business logic
- Procedure hierarchies (the `PROC` dictionary)
- Data models and field definitions
- UI/UX design and user workflows

**The goal is not to change what the application does — it is to rebuild the engineering foundation around the existing logic.**

---

## 2. Deployment Target

| Item | Value |
|---|---|
| Server | bltbox (self-hosted Linux) |
| URL | https://prolog.bltbox.com |
| Reference | Same infrastructure pattern as https://jellyfin.bltbox.com |
| Packaging | Docker Compose |

The application must be deployable by cloning the repository, filling in a `.env` file, and running `docker-compose up -d`.

---

## 3. Tech Stack

### Frontend
- Vanilla JavaScript (ES modules — no framework, no build step required)
- HTML5 + CSS3
- Modular file structure (see Section 6 — not a single monolithic file)
- Communicates with backend exclusively via REST API (JSON over HTTPS)
- **No sensitive data stored client-side** — no API keys, no credentials, no patient data in localStorage or sessionStorage
- Session managed via httpOnly cookie (JWT) only

### Backend
- Runtime: Node.js LTS
- Framework: Express.js
- Authentication: JWT stored in httpOnly, Secure, SameSite=Strict cookies (never in localStorage)
- Password hashing: bcrypt (cost factor 12 minimum)
- All secrets in environment variables (never hardcoded)
- Claude API calls proxied through the backend (frontend never calls Anthropic directly)

### Database
- PostgreSQL (latest stable)
- All patient and case data stored server-side only
- Schema managed via versioned SQL migration scripts

### Infrastructure
- Nginx as reverse proxy: SSL termination, static file serving, API proxying
- Docker Compose for service orchestration
- `.env` file for environment-specific config (never committed to git)
- Automated daily PostgreSQL backups via cron + backup script

---

## 4. Security Requirements

These are non-negotiable. Every point must be implemented.

1. **Passwords**: bcrypt only (cost factor ≥ 12). No plain text, no MD5, no custom hash functions.
2. **Session tokens**: JWT in httpOnly, Secure, SameSite=Strict cookies. Never in localStorage.
3. **API keys**: Claude API key in server `.env` only. Never sent to or stored in the browser.
4. **Authentication middleware**: Every API endpoint (except `/api/auth/login` and `/api/auth/register`) must require a valid JWT.
5. **Input validation**: All user input validated and sanitised server-side on every endpoint.
6. **CORS**: Configured to allow only the application's own domain (`prolog.bltbox.com`).
7. **Rate limiting**: Apply to all auth endpoints to prevent brute force (e.g., 10 requests/minute).
8. **SQL safety**: Parameterised queries only. No string concatenation in SQL. No SQL injection risk.
9. **HTTP headers**: Use Helmet.js for security headers (CSP, HSTS, X-Frame-Options, etc.).
10. **No sensitive data in URLs**: No patient IDs, case IDs, or tokens in query parameters.

---

## 5. Docker Compose Architecture

```
docker-compose.yml
.env.example          ← template with all required variable names (no values)
.env                  ← actual values — NEVER committed to git (add to .gitignore)

nginx/
  nginx.conf
  ssl/                ← SSL certificates (Let's Encrypt or manual)

frontend/             ← static files served directly by Nginx

backend/
  Dockerfile
  [Node.js app files]

database/
  init.sql            ← schema + seed data
  migrations/         ← versioned migration scripts
  backup.sh           ← daily backup script
```

### docker-compose.yml Services

| Service | Image | Role |
|---|---|---|
| `db` | postgres:latest | PostgreSQL with named volume for persistence |
| `backend` | Built from `backend/Dockerfile` | Node.js API server |
| `nginx` | nginx:alpine | Reverse proxy, static files, SSL |

### Required `.env` Variables

```
# Database
DB_USER=
DB_PASSWORD=
DB_NAME=prolog
DB_HOST=db
DB_PORT=5432

# Auth
JWT_SECRET=           # Minimum 64 characters, randomly generated
JWT_EXPIRY=7d

# External APIs
CLAUDE_API_KEY=       # Anthropic API key — server-side only

# App
NODE_ENV=production
PORT=3001
```

### Nginx Routing Rules
- `GET /api/*` → proxy to backend:3001
- Everything else → serve from `/frontend` static files
- HTTP → redirect to HTTPS
- SSL termination at Nginx

---

## 6. Frontend File Structure

```
frontend/
  index.html              # App shell (single entry point, loads JS modules)
  css/
    main.css              # Layout, typography, design tokens, variables
    components.css        # Modals, buttons, forms, cards, sidebar
    charts.css            # Chart and visualisation styles
  js/
    app.js                # App initialisation, client-side router
    auth.js               # Login, registration, logout, session check
    api.js                # All fetch() calls to backend — single source of truth
    cases.js              # Case list view, case form, case detail/edit
    dashboard.js          # Dashboard stats, widgets, pregnancy reminders
    analytics.js          # Analytics page — charts and trend reports
    procedures.js         # PROC hierarchy dictionary, cascading dropdown logic
    ai.js                 # AI analysis panel (calls /api/ai/analyze)
    export.js             # CSV, Excel, PDF export (calls /api/export/*)
    ui.js                 # Shared UI helpers: modals, toasts, loading states
  lib/
    xlsx.min.js           # XLSX library — bundled locally, not loaded from CDN
```

**Important:** `procedures.js` contains the full `PROC` dictionary (copied exactly from `prolog.html`). This is the single source of truth for valid procedure combinations on the frontend. The backend also validates against this same dictionary.

---

## 7. Backend File Structure

```
backend/
  server.js               # Entry point — Express app setup, middleware, route mounting
  package.json
  Dockerfile

  config/
    db.js                 # PostgreSQL connection pool (pg library)
    env.js                # Validates all required env vars on startup, fails fast

  middleware/
    auth.js               # JWT verification — attaches req.user or returns 401
    validate.js           # Input validation helpers (use express-validator)
    rateLimit.js          # Rate limiter config (use express-rate-limit)

  routes/
    auth.js               # Auth endpoints (see Section 8)
    cases.js              # Case CRUD endpoints
    users.js              # User profile endpoints
    ai.js                 # Claude API proxy endpoint
    export.js             # Data export endpoints

  models/
    case.js               # All SQL queries for cases table
    user.js               # All SQL queries for users table

  procedures.js           # PROC dictionary — shared source of truth for validation
```

---

## 8. REST API Design

All endpoints return JSON. All non-auth endpoints require a valid JWT cookie.

### Authentication — `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Authenticate, set JWT cookie |
| POST | `/api/auth/logout` | Clear JWT cookie |
| POST | `/api/auth/change-password` | Change own password |
| GET | `/api/auth/me` | Return current user profile |

### Cases — `/api/cases`
| Method | Path | Description |
|---|---|---|
| GET | `/api/cases` | List cases for current user (supports filter, sort, pagination) |
| GET | `/api/cases/:id` | Get single case |
| POST | `/api/cases` | Create case |
| PUT | `/api/cases/:id` | Update case |
| DELETE | `/api/cases/:id` | Delete case |

Users may only access their own cases. Enforce this in every query with `WHERE user_id = $userId`.

### AI — `/api/ai`
| Method | Path | Description |
|---|---|---|
| POST | `/api/ai/analyze` | Accept case data body, proxy to Claude API, return analysis |

The Claude API key is read from `process.env.CLAUDE_API_KEY` server-side. It is never exposed in any response.

### Export — `/api/export`
| Method | Path | Description |
|---|---|---|
| GET | `/api/export/csv` | Download current user's cases as CSV |
| GET | `/api/export/excel` | Download current user's cases as XLSX |

---

## 9. Database Schema

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,           -- bcrypt hash
  role          TEXT NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical cases
CREATE TABLE cases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id            TEXT,
  case_date             DATE NOT NULL,
  hospital              TEXT,
  clinical_role         TEXT,
  category              TEXT NOT NULL,   -- 'obstetrics' | 'gynaecology' | 'art'
  type                  TEXT,
  procedure             TEXT,
  detail                TEXT,
  outcome               TEXT,
  pregnant              BOOLEAN DEFAULT FALSE,
  complications         TEXT,
  prev_cs               INTEGER,         -- previous caesarean sections (obstetrics)
  sterilisation         BOOLEAN DEFAULT FALSE,
  pregnancy_check_date  DATE,            -- populated for ART cases where pregnant = true
  oocyte_data           JSONB,           -- ART oocyte collection specific fields
  et_data               JSONB,           -- ART embryo transfer specific fields
  extra_data            JSONB,           -- gynaecology specific fields (gestation, catheter, etc.)
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cases_user_id ON cases(user_id);
CREATE INDEX idx_cases_date ON cases(case_date);
CREATE INDEX idx_cases_category ON cases(category);
CREATE INDEX idx_cases_pregnancy_check ON cases(pregnancy_check_date) WHERE pregnancy_check_date IS NOT NULL;
```

---

## 10. Business Logic to Preserve

### 10.1 Procedure Hierarchy

The full `PROC` dictionary from `prolog.html` must be preserved exactly and identically in:
- `frontend/js/procedures.js` — drives cascading dropdowns
- `backend/procedures.js` — used for server-side validation of submitted cases

Valid combinations: Category → Type → Procedure → Detail (Detail may be null for terminal procedures).

**Categories and their types:**

**Obstetrics:** Antenatal, Intrapartum, Postnatal

**Gynaecology:** Hysteroscopy, Laparoscopy, Laparotomy, Cervical Surgery, Urogynaecology, Vaginal Surgery, Perineal Surgery, Contraception, Pregnancy Management, Cystoscopy, Wound Debridement, Termination of Pregnancy, Other Gynaecology

**ART:** Oocyte Collection, Embryo Transfer, Male Reproductive Surgery

### 10.2 Dynamic Form Fields

Certain procedure selections trigger additional input fields. These must be preserved:

| Condition | Additional Fields |
|---|---|
| Category = Obstetrics, Type = Intrapartum | Complications (multi-select), Previous C-sections (number), Sterilisation (checkbox) |
| Category = ART, Type = Oocyte Collection | Trigger type, Collection hours, Follicle count, Egg count |
| Category = ART, Type = Embryo Transfer | Number of embryos transferred, Fresh/Frozen, Outcome |
| Category = Gynaecology, Procedure = Termination | Gestation weeks |
| Category = Gynaecology, Procedure = Cystoscopy | Catheterisation (checkbox) |

### 10.3 Pregnancy Check Reminders

When an ART case has `pregnant = true`:
- Set `pregnancy_check_date` = `case_date + 14 days`
- Dashboard must query for cases where `pregnancy_check_date <= today` and `pregnant = true` and remind the user to follow up

### 10.4 Dashboard Metrics

The dashboard must display:
- Total cases (all time)
- Cases this month
- Cases by category (donut chart)
- Recent cases list
- Outstanding pregnancy check reminders (ART cases)

### 10.5 Analytics

The analytics page must display:
- Weekly case trend (bar chart, last 12 weeks)
- Monthly case trend (bar chart, last 12 months)
- Procedure distribution by category
- Outcome statistics

---

## 11. Data Migration

The v3 system must support a one-time migration from the existing localStorage-based app.

### Step 1: Export from old app
Add an "Export all data as JSON" button to `prolog.html` that downloads the full localStorage contents as a structured JSON file.

### Step 2: Migration script
Provide `database/migrate-from-v1.js` — a Node.js script that:
1. Reads the exported JSON file
2. Creates the user account (prompts for a new bcrypt password)
3. Transforms and inserts all cases into PostgreSQL
4. Reports any records that could not be migrated

---

## 12. What to Generate

Please generate the complete, working codebase as described above. Specifically:

1. **All frontend files** — `index.html`, CSS files, all JS modules
2. **All backend files** — `server.js`, all routes, models, middleware, config
3. **Database** — `init.sql`, initial migration scripts
4. **Docker Compose** — `docker-compose.yml`, `.env.example`
5. **Nginx config** — `nginx/nginx.conf` (configured for prolog.bltbox.com)
6. **Backend Dockerfile**
7. **Migration script** — `database/migrate-from-v1.js`
8. **Backup script** — `database/backup.sh`
9. **README.md** — step-by-step deployment instructions for bltbox

### Definition of Done

The generated project must:
- [ ] Pass `docker-compose up -d` without errors
- [ ] Serve the frontend at `https://prolog.bltbox.com`
- [ ] Allow user registration and login with bcrypt passwords
- [ ] Allow a logged-in user to create, view, edit, and delete cases
- [ ] Enforce that users can only see their own cases
- [ ] Show dashboard and analytics computed from database data
- [ ] Proxy Claude AI analysis through the backend (API key never in browser)
- [ ] Export cases as CSV and Excel
- [ ] Surface ART pregnancy check reminders on the dashboard
- [ ] Store zero sensitive data in the browser

---

## 13. Reference Files

- `prolog.html` — full existing application (business logic, PROC dictionary, UI/UX)
- `prolog-v2.0-deployment.tar.gz` — existing v2 backend skeleton (reference only, do not copy directly as it has security issues)
