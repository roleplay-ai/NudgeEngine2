# Nudgeable.ai — Updated Implementation Plan v3
**Next.js 15 + Supabase | April 2026**

---

## What Changed from v2 → v3

| # | Change | Reason |
|---|--------|--------|
| 1 | **No self-signup.** Participants cannot register themselves. Only HR (admin) and Superadmin create all user accounts. | Business requirement |
| 2 | **Plain-password storage** (`plain_password` column on `users`). Passwords are XOR-obfuscated before storage and retrieved for SendGrid credential emails. Phase 2 upgrade path: AES-256-GCM + KMS. | Credential delivery via email |
| 3 | **Superadmin creates Orgs + HR users** via `/admin/organisations/new`. Credentials shown once, never emailed automatically (Phase 2 adds SendGrid). | Auth flow redesign |
| 4 | **HR creates participants/trainers** via `/hr/participants` modal. Credentials shown once in-app. | Auth flow redesign |
| 5 | **`@supabase/ssr` only** (removed all auth-helpers-nextjs references). | Avoid deprecated packages |
| 6 | **Notifications changed** from Resend/Postmark to **SendGrid** (template-based). | Requirement |
| 7 | **Magic link / SSO removed from Phase 1.** Only email+password in Phase 1. Magic links deferred to Phase 3 (participant invitations). | Simplify Phase 1 |
| 8 | **Route group layout guards** moved into each layout (`redirect()` in server component) rather than only middleware. Defence in depth. | Security |
| 9 | **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** replaces old `NEXT_PUBLIC_SUPABASE_ANON_KEY` env var name. | Updated Supabase SDK |
| 10 | **Phase 1 now includes all 21 DB tables** (not just 3). Schema is created upfront; features are built progressively. | Avoids painful migrations mid-development |

---

## 1. Tech Stack (Final)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend API | Next.js Route Handlers (`/app/api/*`) |
| Database | Supabase PostgreSQL with RLS |
| Auth | Supabase Auth (`@supabase/ssr`) — email+password only |
| File Storage | Supabase Storage |
| Realtime | Supabase Realtime (Phase 3+) |
| Email | SendGrid (template-based) — Phase 2 |
| AI | OpenAI / Anthropic via Supabase Edge Functions — Phase 7 |
| Hosting | Vercel (frontend) + Supabase Cloud |

---

## 2. User Roles & Routing

| Role | Default Route | Can Create |
|------|--------------|-----------|
| `superadmin` | `/admin/dashboard` | organisations, HR admins |
| `hr` | `/hr/dashboard` | participants, trainers |
| `trainer` | `/trainer/overview` | nothing (assigned by HR) |
| `participant` | `/participant/pre-training` | nothing (created by HR) |

**Key rule:** No user can self-register. The entire auth chain flows top-down:
```
Superadmin → creates Organisation + HR Admin
HR Admin   → creates Participants + Trainers
Trainer    → assigned to Cohorts by HR
```

---

## 3. Auth Architecture

### 3.1 User Creation Flow

```
Superadmin → POST /api/auth/create-organisation
  └─ creates: companies row
  └─ creates: auth.users (Supabase Admin API, email_confirm=true)
  └─ creates: users profile row
  └─ creates: user_companies (role='hr')
  └─ returns: temp_password (shown once, for SendGrid in Phase 2)

HR → POST /api/auth/create-user
  └─ creates: auth.users
  └─ creates: users profile
  └─ creates: user_companies (role='participant' or 'trainer')
  └─ returns: temp_password (shown once in modal)
```

### 3.2 Password Storage

```
1. Generate random 12-char password (upper + lower + digits + symbols)
2. XOR-obfuscate with PASSWORD_OBFUSCATION_KEY env var
3. Base64-encode → store as plain_password column
4. When sending credentials: deobfuscate → include in SendGrid template
```

**⚠️ Security note for production:**
Replace XOR obfuscation with AES-256-GCM encryption backed by a KMS key
(AWS KMS, GCP Cloud KMS, or Supabase Vault). Never store truly plain text passwords.

### 3.3 Session & Middleware

```
Every request → middleware.ts
  ├─ Refresh Supabase session (cookie-based)
  ├─ No session → redirect to /login
  ├─ /login with session → redirect to role home
  ├─ Wrong role section → redirect to correct home
  └─ / root → redirect to role home
```

---

## 4. Database Architecture

**21 tables, all with RLS enabled.**

Full schema is created in Phase 1 migration (`001_phase1_schema.sql`).
Features are built progressively but the schema is complete from day 1,
eliminating risky mid-project migrations.

### 4.1 RLS Policy Model

```
Superadmin:    FULL ACCESS across all companies (via service_role or broad policies)
HR:            Full read/write within their company_id
Trainer:       Read all data for cohorts where trainer_user_id = auth.uid()
Participant:   Read/write only their own rows; read batch aggregates
```

Helper functions used in policies:
- `public.get_user_company_id()` → returns caller's company_id
- `public.get_user_role()` → returns caller's role

### 4.2 Key Design Decisions

- **`user_companies` junction** → one user can belong to multiple companies (cross-org trainers)
- **`plain_password` on `users`** → obfuscated, for SendGrid delivery (never returned in client queries)
- **Trigger on `auth.users`** → auto-creates `public.users` row on new auth signup
- **`company_id` denormalized on `cohorts`** → faster RLS without joins
- **`email_confirm: true`** in Admin API → skip confirmation email, we deliver creds manually

---

## 5. Project Structure (Phase 1)

```
nudgeable/
├── app/
│   ├── layout.tsx                     Root layout (font, metadata)
│   ├── page.tsx                       Redirect to /login
│   ├── globals.css                    Design tokens + Tailwind base
│   │
│   ├── (auth)/
│   │   └── login/page.tsx             Login page (no self-signup link)
│   │
│   ├── auth/callback/route.ts         Magic link & OAuth callback
│   │
│   ├── (admin)/admin/
│   │   ├── layout.tsx                 Superadmin layout + guard
│   │   ├── dashboard/page.tsx         Org overview + stats
│   │   ├── organisations/
│   │   │   ├── page.tsx               All organisations
│   │   │   ├── new/page.tsx           Create org + HR admin
│   │   │   └── [id]/page.tsx          Org detail + users
│   │   └── users/page.tsx             All platform users
│   │
│   ├── (hr)/hr/
│   │   ├── layout.tsx                 HR layout + guard
│   │   ├── dashboard/page.tsx         Overview + quick actions
│   │   ├── participants/page.tsx      Manage participants + create modal
│   │   ├── programmes/                (Phase 2)
│   │   └── cohorts/                   (Phase 2)
│   │
│   ├── (trainer)/trainer/
│   │   ├── layout.tsx                 Trainer layout + guard
│   │   ├── overview/page.tsx          Assigned cohorts
│   │   ├── participants/page.tsx      (Phase 3)
│   │   └── messages/page.tsx          (Phase 3)
│   │
│   ├── (participant)/participant/
│   │   ├── layout.tsx                 Participant layout + guard
│   │   ├── pre-training/page.tsx      Readiness checklist
│   │   ├── training-day/page.tsx      (Phase 4)
│   │   ├── progress/page.tsx          (Phase 5)
│   │   └── community/page.tsx         (Phase 6)
│   │
│   └── api/
│       └── auth/
│           ├── create-user/route.ts   HR creates participant/trainer
│           └── create-organisation/  Superadmin creates org + HR
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                Role-aware sidebar (client)
│   │   └── Topbar.tsx                 Page header bar
│   ├── ui/                            (Phase 2: Modal, Toast, etc.)
│   └── forms/                         (Phase 2: form components)
│
├── lib/
│   └── supabase/
│       ├── client.ts                  Browser Supabase client
│       ├── server.ts                  Server Supabase client + getSessionUser()
│       └── admin.ts                   Service-role client + password utils
│
├── types/index.ts                     All TypeScript types
├── middleware.ts                      Auth + role-based route protection
├── tailwind.config.ts                 Design tokens
├── next.config.ts
├── tsconfig.json
├── package.json
├── .env.local.example
│
└── supabase/
    ├── migrations/001_phase1_schema.sql   Full DB schema + RLS
    └── seed.sql                           Dev seed data
```

---

## 6. Design System

Extracted from `nudgeable_mockup_v10.html` and converted to Tailwind tokens:

| Token | Value |
|-------|-------|
| Brand Yellow | `#FFCE00` |
| Brand Dark | `#221D23` |
| Brand Purple | `#623CEA` |
| Brand Green | `#23CE68` |
| Brand Orange | `#F68A29` |
| Brand Red | `#ED4551` |
| Brand Blue | `#3699FC` |
| Surface BG | `#FFFDF5` |
| Input BG | `#FFF6CF` |
| Card Border | `rgba(34,29,35,0.08)` |
| Text Muted | `#8A8090` |
| Font | Inter (400–900) |

CSS components in `globals.css`:
`.btn-primary`, `.btn-dark`, `.btn-outline`, `.btn-emerald`, `.btn-danger`,
`.card`, `.form-input`, `.form-select`, `.form-textarea`, `.form-label`,
`.tag`, `.avatar`, `.stat-card`, `.data-table`, `.progress-wrap`,
`.pill-pre`, `.pill-training`, `.pill-post`, `.tab-btn`, `.section-label`

---

## 7. Implementation Phases (Updated)

### ✅ Phase 1: Foundation & Authentication (2 weeks)
**Status: Scaffolded — ready to connect to Supabase**

- [x] Next.js 15 project with Tailwind + TypeScript
- [x] Supabase client utilities (browser, server, admin)
- [x] `middleware.ts` — auth check + role-based redirects
- [x] Full DB schema (21 tables) + RLS policies + trigger
- [x] Login page (no self-signup, credential-based)
- [x] Auth callback route
- [x] Superadmin layout + dashboard + org management
- [x] HR layout + dashboard + participant management
- [x] Trainer layout + cohort overview
- [x] Participant layout + pre-training checklist
- [x] `POST /api/auth/create-organisation` (Superadmin)
- [x] `POST /api/auth/create-user` (HR creates users)
- [x] Password obfuscation utility (for SendGrid in Phase 2)
- [x] Design system tokens (Tailwind + global CSS)
- [ ] **YOU DO:** Create Supabase project + run migration
- [ ] **YOU DO:** Create `.env.local` from `.env.local.example`
- [ ] **YOU DO:** Create seed users in Supabase Auth dashboard
- [ ] **YOU DO:** Test 4 role logins

---

### Phase 2: HR Programme & Cohort Management (2–3 weeks)
**Depends on:** Phase 1 complete

- [ ] Programme creation form + listing
- [ ] Cohort creation wizard (dates, trainer, skills)
- [ ] Cohort detail page (pre/live/post tabs)
- [ ] Cohort status lifecycle management
- [ ] Participant bulk-invite to cohort (from HR user list)
- [ ] Resource upload (Supabase Storage, pre-reads)
- [ ] Action template library
- [ ] **SendGrid integration** — send credentials via email template
- [ ] `notification_queue` seeding for welcome emails

**New API routes needed:**
- `POST /api/programmes` — create programme
- `POST /api/cohorts` — create cohort
- `POST /api/cohorts/[id]/enroll` — bulk-enroll participants
- `POST /api/email/send-credentials` — SendGrid wrapper

---

### Phase 3: Participant Pre-Training Experience (2–3 weeks)
**Depends on:** Phase 2 complete

- [ ] Task 1: Skill self-rating (5-star) + reflection + batch average reveal
- [ ] Task 2: Expectations submission + group alignment display
- [ ] Task 3: Participant intro (role, team, goals) → batch feed
- [ ] Task 4: Pre-reads with completion tracking
- [ ] Readiness score calculation (DB view or server query)
- [ ] Trainer card + batch messaging (Supabase Realtime)
- [ ] Direct message (participant → trainer)
- [ ] Countdown timer to training date
- [ ] Magic link invitations (participants click link → auto-login)

---

### Phase 4: Training Day — Live Session (2 weeks)
**Depends on:** Phase 3 complete

- [ ] Participant training day screen + agenda
- [ ] Attendance: pre-confirmation + live check-in QR
- [ ] Commitment Plans: main commitment + why + blockers
- [ ] User Actions: individual actions under commitment
- [ ] Trainer live dashboard (Supabase Realtime attendance feed)
- [ ] Session notes capture
- [ ] Trainer: start/end session controls

---

### Phase 5: Post-Training & Progress Tracking (3 weeks)
**Depends on:** Phase 4 complete

- [ ] My Progress page: skill journey (before/now/target)
- [ ] Skill re-assessment + delta vs pre-training
- [ ] Action cards by skill area + completion toggles
- [ ] Weekly confidence check-in (1–10 scale)
- [ ] Nudge engine: What/How/Why/Time format
- [ ] Buddy system: pair participants
- [ ] Nudge delivery tracking (sent, opened, completed)
- [ ] Notification queue processor (cron or Supabase Edge Function)

---

### Phase 6: Community, Analytics & Reporting (2–3 weeks)
**Depends on:** Phase 5 complete

- [ ] Community feed (posts, comments, likes)
- [ ] Participant social profile
- [ ] HR L&D Impact dashboard
  - Retention, ratings, commitments, completion, confidence delta
  - By training programme and by strategy pillar
- [ ] Cohort analytics table (attended, committed, completed, inactive)
- [ ] Exportable reports (CSV)
- [ ] Trainer post-training dashboard + community moderation
- [ ] Automated nudge email scheduling (SendGrid + cron)

---

### Phase 7: AI-Powered Features (3–4 weeks)
**Depends on:** Phases 5 & 6 complete

- [ ] AI skill insight after self-assessment
- [ ] AI expectation alignment analysis
- [ ] AI-generated nudge content from committed actions
- [ ] AI growth narrative from progress data
- [ ] AI L&D impact summaries for HR
- [ ] AI chatbot (training content Q&A)
- [ ] Smart action recommendations
- [ ] Supabase Edge Functions for AI API calls (rate limiting, caching)
- [ ] Cursor + Claude claude-sonnet-4-6 integration for AI features

---

## 8. Phase 1 Setup Checklist (Your Next Steps)

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.local.example .env.local
# → Add NEXT_PUBLIC_SUPABASE_URL
# → Add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# → Add SUPABASE_SERVICE_ROLE_KEY
# → Set PASSWORD_OBFUSCATION_KEY to a random 32-char string

# 3. Run the database migration
# Go to: Supabase Dashboard → SQL Editor
# Paste contents of: supabase/migrations/001_phase1_schema.sql
# Click "Run"

# 4. Create seed users (Supabase Dashboard → Auth → Users)
# Create 4 users: admin@nudgeable.ai, hr@acme.com, trainer@acme.com, participant@acme.com
# Then run seed.sql with the real UUIDs

# 5. Start dev server
npm run dev
# → Visit http://localhost:3000
```

---

## 9. Security Notes

| Risk | Mitigation |
|------|-----------|
| Plain password in DB | XOR obfuscated with server-side key. **Upgrade to AES-256-GCM + KMS before production.** |
| Service role key | Only used in server-side API routes. Never in client bundle. |
| RLS bypass | Service role bypasses RLS — only used in admin routes behind authentication check. |
| Credential exposure | `plain_password` column: never returned in client-facing queries, only fetched by admin API routes. Add a DB-level check or column masking in Phase 2. |
| Password reset | Not in Phase 1. Add Supabase password reset flow in Phase 2. |

---

## 10. Dependency Map (unchanged)

| Phase | Depends On | Duration | Personas |
|-------|-----------|----------|----------|
| 1. Foundation ✅ | None | 2 weeks | Superadmin |
| 2. HR & Cohorts | Phase 1 | 2–3 weeks | HR, Superadmin |
| 3. Pre-Training | Phase 2 | 2–3 weeks | Participant, Trainer, HR |
| 4. Training Day | Phase 3 | 2 weeks | Participant, Trainer |
| 5. Post-Training | Phase 4 | 3 weeks | Participant, Trainer, HR |
| 6. Community | Phase 5 | 2–3 weeks | All |
| 7. AI Features | 5 & 6 | 3–4 weeks | All |

**Total: 16–20 weeks | MVP (1–3): 6–8 weeks**

---

*Nudgeable.ai Implementation Plan v3 — April 2026*
