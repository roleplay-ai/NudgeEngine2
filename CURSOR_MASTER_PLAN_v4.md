# Nudgeable.ai — Master Implementation Plan for Cursor
**Version 4.0 | Next.js 15 + Supabase | April 2026**
**Use this document as context for every Cursor session. Reference the relevant phase section before building.**

---

## GLOBAL CONTEXT (Read Before Every Phase)

### Tech Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 App Router, TypeScript | Route groups for role isolation |
| Styling | Tailwind CSS + custom globals.css | Design tokens in tailwind.config.ts |
| Backend | Next.js Route Handlers in `/app/api/` | Server Actions for forms |
| Database | Supabase PostgreSQL + RLS | All 21 tables created in Phase 1 migration |
| Auth | `@supabase/ssr` cookie-based | NEVER use @supabase/auth-helpers-nextjs |
| Admin API | Supabase service role in `lib/supabase/admin.ts` | Server-only, never client |
| Storage | Supabase Storage | Buckets: `avatars`, `resources`, `logos` |
| Realtime | Supabase Realtime | Phase 3+ only |
| Email | SendGrid template API | Phase 2+ |
| AI | Anthropic claude-sonnet-4-6 via API | Phase 7 |
| Hosting | Vercel + Supabase Cloud | |

### Auth Rules (Non-Negotiable)
- **NO self-signup.** Only Superadmin and HR create users.
- Superadmin → creates Organisations + HR Admins
- HR → creates Participants + Trainers
- Middleware (`middleware.ts`) handles all route protection and role redirects
- Each role layout also has a server-side guard (`redirect()`)
- `lib/supabase/admin.ts` uses `SUPABASE_SERVICE_ROLE_KEY` — server-only

### Role → Route Map
| Role | Home Route | Allowed Prefix |
|------|-----------|---------------|
| superadmin | `/admin/dashboard` | `/admin/*` |
| hr | `/hr/dashboard` | `/hr/*` |
| trainer | `/trainer/overview` | `/trainer/*` |
| participant | `/participant/pre-training` | `/participant/*` |

### Design System Tokens
```
Brand Yellow:  #FFCE00   (primary CTA, active nav, highlights)
Brand Dark:    #221D23   (sidebar bg, headings, btn-dark)
Brand Purple:  #623CEA   (links, checkboxes, participant avatar)
Brand Green:   #23CE68   (success, completed states)
Brand Orange:  #F68A29   (section labels, HR accent)
Brand Red:     #ED4551   (errors, alerts, danger)
Brand Blue:    #3699FC   (trainer accent, info)
Surface BG:    #FFFDF5   (page background)
Card BG:       #FFFFFF   (cards)
Input BG:      #FFF6CF   (form inputs, textareas)
Border:        rgba(34,29,35,0.08)
Text Primary:  #221D23
Text Muted:    #8A8090
Font:          Inter (400–900)
Card Radius:   18px
Pill Radius:   999px
Input Radius:  10px
```

### CSS Component Classes (from globals.css)
```
.btn-primary    .btn-dark     .btn-outline   .btn-emerald   .btn-danger
.card           .stat-card    .data-table    .form-input
.form-select    .form-textarea .form-label   .tag           .avatar
.progress-wrap  .progress-fill .tab-btn      .section-label .section-title
.pill-pre       .pill-training .pill-post    .skeleton
```

### Existing Files (Phase 1 — Already Built)
```
middleware.ts
app/layout.tsx, app/globals.css, app/page.tsx
app/(auth)/login/page.tsx
app/auth/callback/route.ts
app/(admin)/admin/layout.tsx
app/(admin)/admin/dashboard/page.tsx
app/(admin)/admin/organisations/page.tsx
app/(admin)/admin/organisations/new/page.tsx
app/(hr)/hr/layout.tsx
app/(hr)/hr/dashboard/page.tsx
app/(hr)/hr/participants/page.tsx
app/(trainer)/trainer/layout.tsx
app/(trainer)/trainer/overview/page.tsx
app/(participant)/participant/layout.tsx
app/(participant)/participant/pre-training/page.tsx
app/api/auth/create-user/route.ts
app/api/auth/create-organisation/route.ts
lib/supabase/client.ts
lib/supabase/server.ts
lib/supabase/admin.ts
components/layout/Sidebar.tsx
components/layout/Topbar.tsx
types/index.ts
supabase/migrations/001_phase1_schema.sql  ← Full DB schema already exists
```

---

## DATABASE SCHEMA REFERENCE (All 21 Tables)

All tables exist after running `001_phase1_schema.sql`. Use these in every phase.

```sql
-- PHASE 1: Core Access
companies          (id, name, slug, domain, subscription_plan, logo_url, primary_color, settings, created_at)
users              (id, email, name, avatar_url, phone, timezone, is_active, plain_password, created_at, updated_at)
user_companies     (user_id, company_id, role, job_title, department, status, created_at)  ← PK composite

-- PHASE 2: Training Structure
strategy_pillars   (id, company_id, name, color, sort_order, created_at)
programmes         (id, company_id, name, description, created_by, strategy_pillar_id, status, settings, created_at)
skills             (id, programme_id, name, description, sort_order)
action_templates   (id, company_id, title, category, skill_id, builds_capability, created_at)
cohorts            (id, programme_id, company_id, name, trainer_user_id, training_date, training_time, location, status, max_participants, created_by, created_at)
cohort_phases      (id, cohort_id, name, sequence_order)  ← default: Pre-Training, Training Day, Post-Training
user_cohorts       (id, user_id, cohort_id, cohort_role, status, buddy_user_id, enrolled_date)
resources          (id, cohort_id, title, type, file_url, duration_minutes, sort_order)

-- PHASE 3: Participant Pre-Training
task_completions   (id, user_id, cohort_id, task_type, completed_at)
self_assessments   (id, user_id, cohort_id, skill_id, rating_score, reflection_notes, phase, created_at)
cohort_onboarding  (user_id, cohort_id, expectations, intro_message, intro_role, intro_team, session_goals, created_at)
resource_tracking  (id, user_id, resource_id, status, read_at)

-- PHASE 4: Training Day
attendance         (id, user_id, cohort_id, pre_confirmed, live_checkin, checkin_time)
commitment_plans   (id, user_id, cohort_id, phase_id, main_commitment, why_text, blockers, created_at)
user_actions       (id, user_id, commitment_plan_id, template_id, skill_id, custom_title, builds_capability, status, nudge_scheduled_date, completed_at, created_at)

-- PHASE 5: Post-Training
confidence_checkins (id, user_id, cohort_id, confidence_score, reflection, week_number, created_at)
nudges             (id, cohort_id, skill_id, what, how, why, time_minutes, scheduled_date, created_by, created_at)
notification_queue (id, user_id, user_action_id, nudge_id, channel, email_subject, email_body, scheduled_for, status, sent_at, opened_at, completed_at)

-- PHASE 6: Community
messages           (id, cohort_id, sender_id, recipient_id, content, is_batch, read_at, created_at)
posts              (id, parent_post_id, user_id, cohort_id, phase_id, content, type, image_url, is_pinned, created_at)
likes              (id, post_id, user_id, created_at)
```

### Key Enums
```
role:             superadmin | hr | trainer | participant
cohort.status:    draft | scheduled | live | completed
user_action.status: pending | in_progress | delayed | completed | skipped
user_cohort.status: nominated | confirmed | declined | completed
resource.type:    pdf | video | link | article
assessment.phase: pre | post
task_type:        compare | shape | meet | prereads
notification channel: email | in_app | both
post.type:        user_post | comment | auto_milestone
```

### RLS Helper Functions
```sql
public.get_user_company_id()  -- returns caller's company_id
public.get_user_role()         -- returns caller's role
```

---

---

# PHASE 2: HR — Programme & Cohort Management

**Depends on:** Phase 1 complete and tested
**Duration:** 2–3 weeks
**Personas:** Superadmin, HR

---

## Phase 2 Goals
HR can build and manage the full training lifecycle setup:
- Create training programmes with skills and strategy pillars
- Create cohorts (instances of programmes) with dates, trainer, location
- Enroll participants into cohorts
- Upload pre-read resources
- Manage action template library
- SendGrid integration for credential delivery emails

---

## Phase 2 — New Files to Create

```
app/(hr)/hr/
  programmes/
    page.tsx                  ← List all programmes
    new/page.tsx              ← Create programme wizard
    [id]/page.tsx             ← Programme detail + cohort list
    [id]/edit/page.tsx        ← Edit programme
  cohorts/
    page.tsx                  ← List all cohorts (filterable by status)
    new/page.tsx              ← Create cohort (multi-step form)
    [id]/page.tsx             ← Cohort detail with tabs (Pre/Live/Post)
    [id]/participants/page.tsx ← Manage enrolled participants
    [id]/resources/page.tsx   ← Upload and manage pre-reads
  trainers/
    page.tsx                  ← List trainers (reuse participants page)
    new/page.tsx              ← Create trainer (reuse create-user modal)
  action-templates/
    page.tsx                  ← Company action template library

app/(admin)/admin/
  organisations/[id]/page.tsx ← Org detail: users, programmes, cohorts

app/api/
  programmes/
    route.ts                  ← GET list, POST create
    [id]/route.ts             ← GET detail, PATCH update, DELETE
  cohorts/
    route.ts                  ← GET list, POST create
    [id]/route.ts             ← GET detail, PATCH update (status)
    [id]/enroll/route.ts      ← POST bulk-enroll participants
    [id]/resources/route.ts   ← GET list, POST upload resource
  action-templates/
    route.ts                  ← GET list, POST create
    [id]/route.ts             ← PATCH, DELETE
  email/
    send-credentials/route.ts ← POST: SendGrid credential email
    send-welcome/route.ts     ← POST: SendGrid welcome email to participant

components/
  ui/
    Modal.tsx                 ← Reusable modal wrapper
    Toast.tsx                 ← Toast notification system
    FileUpload.tsx            ← Drag-and-drop file uploader (Supabase Storage)
    ConfirmDialog.tsx         ← Delete/confirm dialog
    StatusBadge.tsx           ← Cohort status pill component
  forms/
    ProgrammeForm.tsx         ← Programme create/edit form
    CohortForm.tsx            ← Multi-step cohort creation wizard
    SkillsEditor.tsx          ← Add/remove/reorder skills for a programme

lib/
  sendgrid.ts                 ← SendGrid API wrapper
  storage.ts                  ← Supabase Storage upload helpers
```

---

## Phase 2 — API Routes (Detailed)

### `POST /api/programmes`
**Auth:** HR or Superadmin
**Body:**
```typescript
{
  name: string                 // required
  description?: string
  strategy_pillar_id?: string  // uuid, must belong to same company
  settings?: object
  skills: Array<{              // create skills inline
    name: string
    description?: string
    sort_order: number
  }>
}
```
**Returns:** `{ programme: Programme, skills: Skill[] }`
**Logic:**
1. Verify caller is hr/superadmin in company
2. Insert into `programmes` with `created_by = auth.uid()`
3. Bulk-insert `skills` linked to new programme_id
4. Return full programme with skills

### `GET /api/programmes`
**Auth:** HR or Superadmin
**Query:** `?status=active|archived&include_cohorts=true`
**Returns:** `{ programmes: ProgrammeWithCohorts[] }`

### `GET /api/programmes/[id]`
**Returns:** `{ programme, skills, cohorts, strategy_pillar }`

### `PATCH /api/programmes/[id]`
**Body:** Partial programme fields + optional skills array (replaces all)

### `POST /api/cohorts`
**Auth:** HR or Superadmin
**Body:**
```typescript
{
  programme_id: string         // required
  name: string                 // required, e.g. "Batch 4 — Mumbai"
  trainer_user_id: string      // required, must be trainer in company
  training_date: string        // required, ISO date "2026-06-15"
  training_time?: string       // "09:00"
  location?: string            // "Mumbai Office" or "Virtual"
  max_participants?: number    // default 30
  // Auto-creates 3 cohort_phases: Pre-Training(1), Training Day(2), Post-Training(3)
}
```
**Returns:** `{ cohort, phases: CohortPhase[] }`
**Logic:**
1. Verify trainer belongs to same company
2. Insert cohort with `status='draft'`, `company_id` from programme
3. Auto-insert 3 `cohort_phases` rows

### `PATCH /api/cohorts/[id]`
**Body:** Any cohort fields. Special: `{ status: 'scheduled' | 'live' | 'completed' }`
**Logic:** Status transitions validated: draft→scheduled→live→completed only forward

### `POST /api/cohorts/[id]/enroll`
**Auth:** HR or Superadmin
**Body:**
```typescript
{
  user_ids: string[]           // array of participant user_ids
  cohort_role?: 'participant'  // default participant
}
```
**Returns:** `{ enrolled: number, already_enrolled: number, errors: [] }`
**Logic:**
1. Bulk upsert into `user_cohorts` (conflict on user_id+cohort_id = skip)
2. Queue welcome emails in `notification_queue`

### `POST /api/cohorts/[id]/resources`
**Auth:** HR or Trainer
**Body:** FormData with `file`, `title`, `type`, `duration_minutes`
**Logic:**
1. Upload file to Supabase Storage bucket `resources/{cohort_id}/{filename}`
2. Insert `resources` row with `file_url`
**Returns:** `{ resource: Resource }`

### `DELETE /api/cohorts/[id]/resources/[resourceId]`
**Logic:** Delete from Storage + delete DB row

### `POST /api/email/send-credentials`
**Auth:** HR or Superadmin (server-only)
**Body:**
```typescript
{
  user_id: string
  to_email: string
  to_name: string
  temp_password: string        // plain text, passed from create-user response
  role: UserRole
  company_name: string
}
```
**Logic:**
1. Call SendGrid API with template `SENDGRID_CREDENTIAL_TEMPLATE_ID`
2. Template variables: `{{name}}`, `{{email}}`, `{{password}}`, `{{role}}`, `{{company}}`, `{{login_url}}`
3. Log result to `notification_queue`

---

## Phase 2 — UI Pages (Detailed)

### `/hr/programmes` — Programme List
**Layout:** Topbar + content area
**Components:**
- Header: "Programmes" title, "+ New Programme" button
- Filter tabs: All | Active | Archived
- Stat cards (3): Total Programmes, Active Cohorts, Total Participants
- Table: Name | Skills Count | Cohorts | Strategy Pillar | Status | Actions
- Empty state: illustration + "Create your first programme" CTA

### `/hr/programmes/new` — Create Programme
**Layout:** Single-page form (no wizard needed)
**Sections:**
1. **Programme Details:** Name (required), Description (textarea), Strategy Pillar (select from company pillars)
2. **Skill Areas:** Dynamic list — "Add Skill" button. Each skill has Name + Description fields. Drag to reorder (sort_order). Min 1 skill required.
3. **Settings:** (optional jsonb, leave for later phases)
**Footer:** Cancel | Save Programme
**On success:** Redirect to `/hr/programmes/[id]`

### `/hr/programmes/[id]` — Programme Detail
**Tabs:** Overview | Cohorts | Skills | Action Templates
**Overview tab:**
- Programme header card: name, description, pillar badge, created date, skill count
- "Create New Cohort" CTA button
- Cohorts list (table): Name | Date | Trainer | Participants | Status | View link

**Cohorts tab:** Same table, filterable by status

**Skills tab:**
- List of skills with name, description
- Inline edit/delete per skill
- "Add Skill" button

### `/hr/cohorts/new` — Create Cohort (Multi-Step)
**Step 1 — Details:**
- Programme (select from company's programmes, required)
- Cohort Name (auto-suggest: "[Programme] Batch [N] — [City]")
- Training Date (date picker)
- Training Time (time picker, optional)
- Location (text, optional — prefill "Virtual")
- Max Participants (number, default 30)

**Step 2 — Assign Trainer:**
- List of company trainers as selectable cards (avatar, name, job title)
- Shows trainer's existing cohort count

**Step 3 — Review:**
- Summary of all selections
- "Create Cohort" button
- On success: redirect to `/hr/cohorts/[id]`

### `/hr/cohorts/[id]` — Cohort Detail
**Header card:** Cohort name | Programme | Trainer | Date | Location | Status badge | Action buttons
**Status action buttons:**
- Draft → "Mark as Scheduled" button
- Scheduled → "Go Live" button
- Live → "Complete Session" button

**Tabs:** Pre-Training | Training Day | Post-Training | Resources | Settings

**Pre-Training tab:**
- Participants table: Name | Email | Readiness Score | Tasks Done | Status
- "Add Participants" button → modal to enroll from company user list
- Bulk actions: Select all → Send reminder email

**Training Day tab:** (Phase 4 content, placeholder in Phase 2)

**Post-Training tab:** (Phase 5 content, placeholder in Phase 2)

**Resources tab:**
- Upload zone: drag-and-drop + file browser
- Resource list: Title | Type icon | Duration | Upload date | Delete button
- Supported: PDF, MP4, external URL, article link

### `/hr/cohorts/[id]/participants` — Participant Management
**Table:** Name | Email | Department | Readiness | Tasks | Enrolled Date | Status | Remove
**Top actions:** Enroll More | Export CSV | Send Bulk Email
**Filter:** All | Confirmed | Nominated | Declined
**Each row:** Expandable to show task completion details

### `/hr/action-templates` — Action Library
**Header:** "Action Library" + "New Template" button
**Filter:** By skill area (pills)
**Table:** Title | Category | Skill | Builds Capability | Used In (cohort count) | Edit | Delete
**Create/Edit modal:**
- Title (required)
- Category (text, e.g. "Communication")
- Skill (select from company's skills across all programmes)
- Builds Capability (text, e.g. "Active Listening")

---

## Phase 2 — Reusable Components

### `Modal.tsx`
```typescript
// Props
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  size?: 'sm' | 'md' | 'lg'   // default 'md' = max-w-[480px]
  children: React.ReactNode
  footer?: React.ReactNode
}
// Style: fixed inset-0, backdrop blur(4px) rgba(34,29,35,0.5)
// Card: bg-white rounded-[20px], box-shadow: 0 24px 64px rgba(0,0,0,0.2)
```

### `Toast.tsx`
```typescript
// Global toast context provider
// Types: 'success' | 'error' | 'info'
// Position: top-right, slide in from right
// Auto-dismiss: 3000ms
// Usage: const { toast } = useToast(); toast.success('User created!')
```

### `FileUpload.tsx`
```typescript
// Props
interface FileUploadProps {
  bucket: string               // Supabase storage bucket name
  path: string                 // Storage path prefix
  accept: string               // e.g. ".pdf,.mp4"
  maxSizeMB: number
  onUpload: (url: string, file: File) => void
}
// UI: dashed border zone, drag-hover state (#FFF6CF bg), progress bar
```

### `StatusBadge.tsx`
```typescript
// Renders colored pill for cohort/action/user status
// Uses existing .tag CSS classes
```

---

## Phase 2 — SendGrid Setup

### Templates to Create in SendGrid Dashboard
1. **Credential Email** (`SENDGRID_CREDENTIAL_TEMPLATE_ID`)
   - Subject: "Your Nudgeable login credentials — {{company_name}}"
   - Variables: `name`, `email`, `password`, `role`, `company_name`, `login_url`

2. **Welcome / Cohort Invitation** (`SENDGRID_WELCOME_TEMPLATE_ID`)
   - Subject: "You've been invited to {{cohort_name}}"
   - Variables: `name`, `cohort_name`, `training_date`, `trainer_name`, `login_url`

### `lib/sendgrid.ts`
```typescript
// Wrapper around @sendgrid/mail
// Functions:
// sendCredentialEmail(to, templateData) → Promise<void>
// sendWelcomeEmail(to, templateData) → Promise<void>
// sendNudgeEmail(to, templateData) → Promise<void>  (Phase 5)
```

### New env vars
```
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@nudgeable.ai
SENDGRID_CREDENTIAL_TEMPLATE_ID=d-xxxxx
SENDGRID_WELCOME_TEMPLATE_ID=d-xxxxx
```

---

## Phase 2 — Storage Setup

### Buckets to create in Supabase Dashboard
```
resources  (public: false)  ← pre-read PDFs, videos
avatars    (public: true)   ← profile photos
logos      (public: true)   ← company logos
```

### Storage RLS
```sql
-- resources: only company members can read
CREATE POLICY "resources_company_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resources'
    AND auth.uid() IN (
      SELECT uc.user_id FROM user_companies uc
      WHERE uc.company_id = (
        SELECT company_id FROM cohorts WHERE id::text = (storage.foldername(name))[1]
      )
    )
  );
```

---

---

# PHASE 3: Participant Pre-Training Experience

**Depends on:** Phase 2 complete (cohorts exist, participants enrolled)
**Duration:** 2–3 weeks
**Personas:** Participant (primary), Trainer (messaging), HR (monitoring)

---

## Phase 3 Goals
Participants complete 4 pre-training tasks to build readiness. Trainer can send messages and monitor completion. HR sees sign-up rates.

---

## Phase 3 — New Files to Create

```
app/(participant)/participant/
  pre-training/
    page.tsx                  ← Readiness hub (already scaffolded, now functional)
    task-1-skills/page.tsx    ← Self-assessment rating
    task-2-expectations/page.tsx ← Expectations form
    task-3-intro/page.tsx     ← Batch introduction
    task-4-prereads/page.tsx  ← Pre-read document list

app/(trainer)/trainer/
  cohorts/[cohortId]/
    page.tsx                  ← Trainer cohort detail with tabs
    pre-training/page.tsx     ← Pre-training monitor dashboard
    messages/page.tsx         ← Batch + DM messaging

app/(hr)/hr/
  cohorts/[id]/pre-training/page.tsx  ← HR monitor: readiness rates

app/api/
  participant/
    cohort/route.ts           ← GET: active cohort + readiness data
    tasks/route.ts            ← POST: mark task complete
  assessments/
    route.ts                  ← GET list, POST create/update
    batch-average/route.ts    ← GET: cohort average ratings (anonymized)
  onboarding/
    route.ts                  ← GET + POST: expectations/intro
  resource-tracking/
    route.ts                  ← POST: mark resource as read
  messages/
    route.ts                  ← GET inbox, POST send message
    batch/route.ts            ← POST: trainer sends batch message
  trainer/
    cohort-readiness/route.ts ← GET: all participants' task completion

components/
  participant/
    ReadinessHero.tsx         ← Circular progress + countdown
    TaskCard.tsx              ← Individual task row (locked/active/done)
    SkillRatingGrid.tsx       ← 5-button skill rating UI
    BatchAverageReveal.tsx    ← Peer comparison bar chart
    ExpectationsInput.tsx     ← Textarea with word-count and group alignment
    IntroCard.tsx             ← Participant intro display card
    PrereadItem.tsx           ← Resource card with completion toggle
  trainer/
    ParticipantReadinessTable.tsx ← Table showing each participant's task progress
    MessageComposer.tsx       ← Batch/DM message input
```

---

## Phase 3 — API Routes (Detailed)

### `GET /api/participant/cohort`
**Auth:** Participant
**Returns:**
```typescript
{
  cohort: CohortWithDetails
  user_cohort: UserCohort
  completed_tasks: TaskType[]   // ['compare', 'shape']
  readiness_score: number       // 20 + (completed_tasks.length * 20)
  days_to_training: number
  trainer: { name, avatar_url }
  phases: CohortPhase[]
}
```

### `POST /api/participant/tasks`
**Auth:** Participant
**Body:** `{ task_type: TaskType, cohort_id: string }`
**Logic:**
1. Upsert `task_completions` (unique on user_id + cohort_id + task_type)
2. Return updated readiness_score
**Returns:** `{ task_type, readiness_score: number }`

### `GET /api/assessments?cohort_id=X&phase=pre`
**Auth:** Participant (own), Trainer (cohort), HR (company)
**Returns:** `{ assessments: SelfAssessment[] }`

### `POST /api/assessments`
**Auth:** Participant
**Body:**
```typescript
{
  cohort_id: string
  skill_id: string | null       // null = overall rating
  rating_score: number          // 1–5
  reflection_notes?: string
  phase: 'pre' | 'post'
}
```
**Logic:** Upsert (unique on user_id + cohort_id + skill_id + phase)

### `GET /api/assessments/batch-average?cohort_id=X&skill_id=Y&phase=pre`
**Auth:** Any cohort member
**Returns:** `{ average: number, count: number, distribution: { 1:n, 2:n, 3:n, 4:n, 5:n } }`
**Note:** Never returns individual user data — aggregated only. Minimum 3 responses to show.

### `GET /api/onboarding?cohort_id=X`
**Auth:** Participant (own row)
**Returns:** `{ onboarding: CohortOnboarding | null }`

### `POST /api/onboarding`
**Auth:** Participant
**Body:** `{ cohort_id, expectations?, intro_message?, intro_role?, intro_team?, session_goals? }`
**Logic:** Upsert on (user_id, cohort_id). Auto-mark `task_completions` for 'shape' and 'meet'.

### `GET /api/onboarding/batch?cohort_id=X`
**Auth:** Trainer or HR
**Returns:** `{ intros: Array<{ user: User, onboarding: CohortOnboarding }> }`
**Note:** Only intro fields returned (not private expectations)

### `POST /api/resource-tracking`
**Auth:** Participant
**Body:** `{ resource_id: string, status: 'read' }`
**Logic:**
1. Upsert `resource_tracking`
2. Check if ALL resources for cohort are read → if yes, auto-mark 'prereads' task complete
**Returns:** `{ all_done: boolean, readiness_score: number }`

### `GET /api/messages?cohort_id=X`
**Auth:** Trainer or Participant in cohort
**Returns:**
```typescript
{
  batch_messages: Message[]     // is_batch=true
  direct_messages: Message[]    // recipient_id = auth.uid()
}
```

### `POST /api/messages`
**Auth:** Trainer (can send batch or DM), Participant (DM to trainer only)
**Body:**
```typescript
{
  cohort_id: string
  content: string
  recipient_id?: string         // null = batch message
  is_batch: boolean
}
```

### `GET /api/trainer/cohort-readiness?cohort_id=X`
**Auth:** Trainer (owns cohort), HR
**Returns:**
```typescript
{
  participants: Array<{
    user: User
    completed_tasks: TaskType[]
    readiness_score: number
    last_active?: string
  }>
  summary: {
    total: number
    avg_readiness: number
    fully_ready: number         // readiness_score = 100
    not_started: number         // readiness_score = 20
  }
}
```

---

## Phase 3 — UI Pages (Detailed)

### `/participant/pre-training` — Readiness Hub (Upgrade from scaffold)
**Hero section:**
- Dark card (bg: `#221D23`) with animated gradient
- Left: Cohort name, Programme name, Trainer name
- Right: Large readiness % number + "Ready" label
- Below: Progress bar (yellow fill)
- Footer row: Training date countdown | Location

**Task checklist (4 tasks):**
Each task row has:
- Step number badge (01–04), colored per task
- Task icon (emoji or SVG)
- Title + subtitle
- State: `locked` (opacity 0.45) | `active` (full opacity, animated) | `done` (green check badge)
- CTA: "Start →" button (active only)
- Tasks unlock sequentially: Task 2 unlocks after Task 1 done, etc.

**Right sidebar (sticky):**
- Trainer card: avatar, name, "Send Message" button
- Readiness breakdown: list of 4 tasks with +20% labels and green dots when done

### `/participant/pre-training/task-1-skills` — Skill Self-Assessment
**Step indicator:** 4-step stepper at top

**For each skill (from programme.skills):**
- Skill name header (orange label)
- 5 rating buttons (1–5), numbered squares
  - Default: white bg, dark border
  - Hover: `#FFF6CF` bg, yellow border, -2px translate
  - Selected: `#FFCE00` bg, scale(1.08), yellow shadow
- Reflection textarea (optional): "What makes you give this rating? What do you need?"
- Character counter (max 300)

**After rating all skills:**
- "See Batch Average" button appears
- Reveals anonymized bar chart (BatchAverageReveal component)
- Shows your rating vs group average

**Submit button:** "Save & Continue →"
**On submit:**
1. POST `/api/assessments` for each skill
2. POST `/api/participant/tasks` `{ task_type: 'compare' }`
3. Redirect back to `/participant/pre-training`

### `/participant/pre-training/task-2-expectations` — Shape the Session
**Form sections:**
1. **Your Expectations** — textarea: "What do you want to get from this training?"
2. **Session Goals** — textarea: "What specific outcomes would make this a success for you?"
3. **Your Role & Team** — two side-by-side inputs (intro_role, intro_team)

**After submit:**
- Show group alignment section: "X% of your batch also want [common theme]"
- This is computed from all submitted expectations (text similarity — Phase 7 uses AI; Phase 3 uses keyword frequency)

**On submit:**
1. POST `/api/onboarding` (shape fields)
2. POST `/api/participant/tasks` `{ task_type: 'shape' }`
3. Show success state, then redirect to hub

### `/participant/pre-training/task-3-intro` — Meet Your Batch
**My Introduction form:**
- "Say hello to your batch!"
- Role (prefilled from user_companies.job_title)
- Team / Department (prefilled)
- Introduction message (textarea, max 280 chars) — "I'm Arjun, a Team Lead in Engineering. I'm here to improve how I give feedback to my team."

**Batch introductions feed:**
- Grid of submitted intro cards (avatar, name, role, team, message)
- Shows only if ≥2 others have submitted
- Your card highlighted with yellow border

**On submit:**
1. POST `/api/onboarding` (intro fields)
2. POST `/api/participant/tasks` `{ task_type: 'meet' }`

### `/participant/pre-training/task-4-prereads` — Pre-Reads
**Resource list:**
Each resource card shows:
- Type icon (📄 PDF, 🎬 Video, 🔗 Link, 📰 Article)
- Title + estimated duration (e.g., "12 min read")
- "Mark as Read" / "Open" button
- Completion state: grey border → green border + checkmark
- Progress: "X of Y completed"

**On mark as read:**
1. POST `/api/resource-tracking`
2. If all done → auto-complete task, show confetti animation, redirect to hub

---

## Phase 3 — Trainer Views

### `/trainer/cohorts/[cohortId]` — Trainer Cohort Detail
**Header:** Cohort name | Programme | Date | Status pill | Participants count

**Tabs:**
- Pre-Training: readiness dashboard
- Live Session: (Phase 4)
- Post-Training: (Phase 5)
- Messages: (Phase 3)
- Community: (Phase 6)

### `/trainer/cohorts/[cohortId]/pre-training` — Readiness Monitor
**Summary cards (4):** Total Enrolled | Avg Readiness % | Fully Ready | Not Started
**Alert section:** "3 participants haven't started yet" → list with "Send Nudge" per row
**Table:** Name | Task 1 | Task 2 | Task 3 | Task 4 | Readiness | Last Active
**Table visual:** Each task cell shows ✅ or empty circle. Readiness = colored progress bar.
**Bulk action:** Select → "Send Reminder Email"

### `/trainer/cohorts/[cohortId]/messages` — Messaging
**Left panel:** Message type tabs: Batch | Direct Messages list
**Right panel:** Message thread / composer
**Composer:**
- Textarea with auto-resize
- Recipient: "All Participants" (batch) or specific participant (DM)
- "Send" button
**Batch message history:** scrollable list, timestamp, read count
**DM threads:** one per participant, unread badge

---

---

# PHASE 4: Training Day — Live Session

**Depends on:** Phase 3 complete
**Duration:** 2 weeks
**Personas:** Participant (primary), Trainer (controls + monitoring)

---

## Phase 4 Goals
Real-time training day experience: attendance tracking, commitment capture, trainer live dashboard.

---

## Phase 4 — New Files to Create

```
app/(participant)/participant/
  training-day/
    page.tsx                  ← Training day home (agenda + check-in)
    commitment/page.tsx       ← Commitment plan form
    actions/page.tsx          ← Action selection and customization

app/(trainer)/trainer/
  cohorts/[cohortId]/
    live/page.tsx             ← Live session dashboard (Realtime)

app/api/
  attendance/
    route.ts                  ← GET/POST attendance record
    checkin/route.ts          ← POST: live check-in
  commitments/
    route.ts                  ← GET own plan, POST create
    [id]/route.ts             ← GET detail, PATCH update
  actions/
    route.ts                  ← GET own actions, POST create
    [id]/route.ts             ← PATCH update (status, custom_title)
    bulk/route.ts             ← POST: create multiple actions at once
  trainer/
    live-attendance/route.ts  ← GET: real-time attendance feed for trainer

components/
  participant/
    AttendanceConfirm.tsx     ← RSVP and day-of check-in card
    CommitmentForm.tsx        ← Main commitment + why + blockers
    ActionSelector.tsx        ← Template picker + custom action input
    ActionCard.tsx            ← Individual action display card
  trainer/
    LiveAttendanceBoard.tsx   ← Real-time participant grid (Realtime)
    CommitmentsSummary.tsx    ← How many committed, what skills
```

---

## Phase 4 — API Routes (Detailed)

### `GET /api/attendance?cohort_id=X`
**Auth:** Participant (own row), Trainer, HR
**Returns:** `{ attendance: Attendance | null }`

### `POST /api/attendance`
**Auth:** Participant
**Body:** `{ cohort_id: string, pre_confirmed: boolean }`
**Logic:** Upsert attendance row (pre-RSVP)

### `POST /api/attendance/checkin`
**Auth:** Participant
**Body:** `{ cohort_id: string }`
**Logic:** Set `live_checkin=true`, `checkin_time=now()`
**Returns:** `{ attendance, message: 'Checked in!' }`

### `GET /api/commitments?cohort_id=X`
**Auth:** Participant (own), Trainer (all in cohort), HR
**Returns:** `{ commitment_plan: CommitmentPlan | null, actions: UserAction[] }`

### `POST /api/commitments`
**Auth:** Participant
**Body:**
```typescript
{
  cohort_id: string
  main_commitment: string       // required, max 500 chars
  why_text?: string
  blockers?: string
}
```
**Returns:** `{ commitment_plan: CommitmentPlan }`

### `PATCH /api/commitments/[id]`
**Body:** Partial CommitmentPlan fields

### `POST /api/actions`
**Auth:** Participant
**Body:**
```typescript
{
  commitment_plan_id: string   // required
  template_id?: string         // from action_templates (optional)
  skill_id?: string
  custom_title?: string        // required if no template_id
  builds_capability?: string
  nudge_scheduled_date?: string // ISO date, when to send first nudge
}
```
**Returns:** `{ action: UserAction }`

### `POST /api/actions/bulk`
**Body:** `{ actions: Array<POST /api/actions body> }`
**Returns:** `{ actions: UserAction[] }`

### `PATCH /api/actions/[id]`
**Body:**
```typescript
{
  status?: ActionStatus
  custom_title?: string
  nudge_scheduled_date?: string
  completed_at?: string         // when marking complete
}
```

### `GET /api/trainer/live-attendance?cohort_id=X`
**Auth:** Trainer
**Returns:**
```typescript
{
  participants: Array<{
    user: User
    attendance: Attendance
    has_commitment: boolean
    action_count: number
  }>
  stats: {
    total_enrolled: number
    pre_confirmed: number
    checked_in: number
    committed: number
  }
}
```
**Note:** Subscribe to Supabase Realtime on `attendance` table for live updates

---

## Phase 4 — UI Pages (Detailed)

### `/participant/training-day` — Training Day Home
**State 1: Before training date (pre-confirmation)**
- Banner: "Training in X days"
- RSVP card: "Will you attend?" → Confirm Attendance button
- Once confirmed: green checkmark card "You're confirmed ✓"

**State 2: Training day (date matches today)**
- Hero: animated pulsing "TODAY IS TRAINING DAY" banner (dark bg, yellow text)
- Check-in card: "Check in now to confirm your attendance" → large "Check In" button
- After check-in: confetti → show agenda card

**Agenda card:**
- Session timeline (trainer adds phases)
- Current phase highlighted
- "Go to Commitment →" CTA

**State 3: After training (commitment submitted)**
- Summary: Your commitment, X actions set
- Link to progress tracking

### `/participant/training-day/commitment` — Commitment Plan
**Step 1 — Your Commitment:**
- Large textarea: "What is your main commitment coming out of today?"
- Character count (max 500)
- Placeholder: "I commit to having weekly 1:1s with each of my team members…"

**Step 2 — Your Why:**
- Textarea: "Why does this matter to you?"
- Optional but encouraged

**Step 3 — Potential Blockers:**
- Textarea: "What might get in the way?"
- Optional

**Progress:** 3-step indicator at top

### `/participant/training-day/actions` — Select Actions
**Header:** "Now choose your actions — specific steps to make your commitment real"

**Action template list (from cohort's action_templates):**
- Grouped by skill area (accordion or tabbed)
- Each template shown as selectable card:
  - Checkbox (purple when selected)
  - Title
  - "Builds: [capability]" tag
  - "Edit" button to customize title
- Max recommended: 3–5 actions (soft limit with warning)

**Custom action input:**
- "+ Add custom action" button
- Text input + skill area selector

**Selected actions panel (right sidebar or bottom):**
- Running list of selected actions
- Per action: nudge date picker (optional)
- "Confirm Actions →" button

**On confirm:** POST `/api/actions/bulk` → redirect to `/participant/pre-training` (or progress page if post-training)

### `/trainer/cohorts/[cohortId]/live` — Live Dashboard
**Realtime attendance grid:**
- Card grid of all participants (avatar, name)
- Green glow: checked in | Yellow: pre-confirmed | Grey: not yet
- Count stats at top: "X/Y checked in"

**Commitment progress:**
- Progress bar filling as participants submit commitments
- "X of Y have submitted their commitment plan"

**Actions to take:**
- "Send check-in reminder" button (batch message)
- "Close check-in" toggle
- Notes textarea for session notes

**Supabase Realtime subscription:**
```typescript
// Subscribe to attendance table changes for this cohort
supabase
  .channel('attendance:cohort:' + cohortId)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'attendance',
    filter: `cohort_id=eq.${cohortId}`
  }, (payload) => { /* update attendance grid */ })
  .subscribe()
```

---

---

# PHASE 5: Post-Training & Progress Tracking

**Depends on:** Phase 4 complete
**Duration:** 3 weeks
**Personas:** Participant (primary), Trainer (nudges), HR (monitoring)

---

## Phase 5 Goals
Sustain training momentum: action completion, skill re-assessment, confidence tracking, nudge engine, buddy system, automated email reminders.

---

## Phase 5 — New Files to Create

```
app/(participant)/participant/
  progress/
    page.tsx                  ← My Progress hub
    skill-journey/page.tsx    ← Before/after skill comparison
    actions/page.tsx          ← Action list with completion
    confidence/page.tsx       ← Weekly confidence check-in

app/(trainer)/trainer/
  cohorts/[cohortId]/
    post-training/page.tsx    ← Post-training overview
    nudges/page.tsx           ← Create and manage nudges

app/(hr)/hr/
  cohorts/[id]/post-training/page.tsx ← HR post-training analytics

app/api/
  progress/
    summary/route.ts          ← GET: full progress summary for participant
  actions/
    complete/route.ts         ← POST: mark action complete
    [id]/route.ts             ← PATCH: update status
  assessments/
    post/route.ts             ← POST: post-training skill re-assessment
  confidence/
    route.ts                  ← GET list, POST create weekly check-in
  nudges/
    route.ts                  ← GET list, POST create nudge
    [id]/route.ts             ← PATCH, DELETE
  buddy/
    route.ts                  ← GET buddy, POST assign/request buddy
  notification-queue/
    route.ts                  ← GET pending, POST queue notification
  cron/
    process-notifications/route.ts ← GET: process due notifications (called by Vercel cron)

components/
  participant/
    ProgressHero.tsx          ← Overall score + growth narrative
    SkillJourneyCard.tsx      ← Before/now/target bars for one skill
    ActionProgressCard.tsx    ← Action with status toggle + skill tag
    ConfidenceCheckin.tsx     ← 1–10 slider + reflection input
    BuddyCard.tsx             ← Buddy avatar, contact, shared progress
  trainer/
    NudgeBuilder.tsx          ← What/How/Why/Time form
    NudgeCard.tsx             ← Display scheduled nudge
```

---

## Phase 5 — API Routes (Detailed)

### `GET /api/progress/summary?cohort_id=X`
**Auth:** Participant
**Returns:**
```typescript
{
  participant: User
  commitment_plan: CommitmentPlan
  actions: Array<UserAction & { skill: Skill | null }>
  action_stats: {
    total: number
    completed: number
    in_progress: number
    pending: number
    completion_rate: number   // percentage
  }
  skill_journey: Array<{
    skill: Skill
    pre_rating: number | null
    post_rating: number | null
    growth: number | null     // post - pre
  }>
  latest_confidence: ConfidenceCheckin | null
  buddy: { user: User, cohort_data: UserCohort } | null
  days_since_training: number
  growth_score: number         // computed composite
}
```

### `POST /api/actions/complete`
**Auth:** Participant
**Body:** `{ action_id: string }`
**Logic:**
1. SET `status='completed'`, `completed_at=now()`
2. Cancel any pending nudge in `notification_queue` for this action
3. Check if all actions complete → return `{ all_done: boolean }`
**Returns:** `{ action: UserAction, all_done: boolean }`

### `PATCH /api/actions/[id]`
**Body:** `{ status: ActionStatus }`
**Valid transitions:** pending → in_progress → completed | delayed | skipped

### `POST /api/assessments` (post phase)
**Body:** Same as Phase 3 but `phase: 'post'`
**Logic:** Upsert. After saving, return growth delta (post - pre rating).

### `GET /api/confidence?cohort_id=X`
**Auth:** Participant
**Returns:** `{ checkins: ConfidenceCheckin[], latest: ConfidenceCheckin | null }`

### `POST /api/confidence`
**Auth:** Participant
**Body:**
```typescript
{
  cohort_id: string
  confidence_score: number    // 1–10
  reflection?: string
  week_number: number         // weeks since training_date
}
```
**Logic:** One check-in per week_number (upsert)

### `GET /api/nudges?cohort_id=X`
**Auth:** Trainer (own cohort), Participant (see own), HR
**Returns:** `{ nudges: Nudge[] }`

### `POST /api/nudges`
**Auth:** Trainer
**Body:**
```typescript
{
  cohort_id: string
  skill_id?: string
  what: string                // The micro-action (required)
  how?: string                // Step-by-step instructions
  why?: string                // Motivation / rationale
  time_minutes?: number       // default 5
  scheduled_date?: string     // ISO date to send
}
```
**Logic:**
1. Insert `nudges` row
2. If `scheduled_date` set: queue email in `notification_queue` for all cohort participants

### `GET/POST /api/buddy`
**GET:** Returns current user's buddy for a cohort
**POST body:** `{ cohort_id: string, buddy_user_id: string }`
**Logic:** Mutual assignment — update both users' `user_cohorts.buddy_user_id`

### `POST /api/notification-queue`
**Auth:** Server-only (called internally)
**Body:**
```typescript
{
  user_id: string
  channel: NotificationChannel
  email_subject?: string
  email_body?: string
  scheduled_for: string       // ISO datetime
  user_action_id?: string
  nudge_id?: string
}
```

### `GET /api/cron/process-notifications`
**Auth:** Internal (protected by `CRON_SECRET` header)
**Logic:**
1. SELECT notifications WHERE `status='pending' AND scheduled_for <= now()`
2. For each: send via SendGrid (email) or mark in-app
3. UPDATE `status='sent'`, `sent_at=now()`
4. Limit: 50 per run to avoid timeout

**Vercel cron config in `vercel.json`:**
```json
{
  "crons": [
    { "path": "/api/cron/process-notifications", "schedule": "0 * * * *" }
  ]
}
```

---

## Phase 5 — UI Pages (Detailed)

### `/participant/progress` — My Progress Hub
**Hero card (dark bg):**
- "Your Growth Journey" title
- Completion ring: actions done / total (SVG circle)
- Growth score (composite number, big font)
- Days since training
- Quick stats row: X Actions Done | Confidence: N/10 | X Skills Improved

**Sections:**
1. **Active Nudge** (if any pending): Dark nudge card
   - "TODAY'S NUDGE" yellow label
   - What, How, Why, Time text
   - "Done! ✓" and "Skip" buttons

2. **My Actions** (quick list): 3 most recent actions with status
   - "See all →" link

3. **Skill Growth** (mini chart): 2–3 skill bars
   - "See full journey →" link

4. **Confidence trend** (small sparkline)
   - "Check in this week →" link if not done

5. **Buddy card** (if assigned): Avatar, name, last active
   - "View buddy progress" link

### `/participant/progress/actions` — My Actions
**Filter tabs:** All | In Progress | Completed | Pending | Delayed
**Group by:** Skill area (accordion headers)

**Each action card:**
- Status indicator dot (color-coded)
- Action title (from template or custom)
- "Builds: [capability]" tag (grey pill)
- Skill tag (colored pill)
- Status toggle button: cycle through statuses
- For pending/in-progress: nudge date badge (if set)
- For completed: completion date
- Expand: shows commitment context (why was this added)

**Bulk action:** Mark all in-progress → complete

### `/participant/progress/skill-journey` — Skill Journey
**For each skill (from programme):**
- Skill name header
- 3 bars side by side:
  - Before (pre-training rating, grey)
  - Now (post-training rating, yellow — fills in as user rates)
  - Target (max 5, dashed outline)
- Growth delta badge (e.g. "+1.5 ↑" in green)
- Reflection notes (pre and post)
- "Rate yourself now →" button if post-assessment not done

**Bottom CTA:** "Submit post-training ratings" → to `/assessments` page

### `/participant/progress/confidence` — Weekly Check-in
**Header:** "Week [N] — How confident are you right now?"

**Slider component (1–10):**
- Large numbered scale
- Color gradient: red (1) → yellow (5) → green (10)
- Selected number shown large in center

**Reflection textarea:** "What changed this week? What did you apply?"

**History chart:** Line graph of weekly confidence scores
- X: Week 1, 2, 3...
- Y: 1–10
- Tooltip on hover

**Submit:** POST `/api/confidence`

### `/trainer/cohorts/[cohortId]/nudges` — Nudge Builder
**Existing nudges list** (table): What | Skill | Scheduled | Status | Edit | Delete

**Create nudge form:**
Follows What/How/Why/Time framework:
- **What:** "The micro-action" — short, specific (required)
  - Example: "Have a 5-min feedback conversation with one team member"
- **How:** "Step-by-step" — numbered textarea
  - Example: "1. Pick one team member. 2. Find a quiet moment. 3. Share one observation..."
- **Why:** "Motivation" — why this matters
- **Time:** Minutes spinner (5, 10, 15, 20, 30)
- **Skill:** Optional skill tag selector
- **Schedule:** Date picker (optional)

**Preview panel:** Shows how nudge email will look

---

---

# PHASE 6: Community, Analytics & Reporting

**Depends on:** Phase 5 complete
**Duration:** 2–3 weeks
**Personas:** All

---

## Phase 6 Goals
Community engagement, full L&D impact analytics for HR, automated nudge delivery, and data exports.

---

## Phase 6 — New Files to Create

```
app/(participant)/participant/
  community/page.tsx            ← Community feed + post creation

app/(trainer)/trainer/
  community/page.tsx            ← Trainer community view + moderation
  cohorts/[cohortId]/
    community/page.tsx          ← Cohort-specific community

app/(hr)/hr/
  impact/
    page.tsx                    ← L&D Impact dashboard (main)
    [cohortId]/page.tsx         ← Cohort-specific analytics
  reports/page.tsx              ← Export centre

app/(admin)/admin/
  analytics/page.tsx            ← Platform-wide analytics

app/api/
  posts/
    route.ts                    ← GET feed, POST create post
    [id]/route.ts               ← GET, PATCH (pin), DELETE
    [id]/like/route.ts          ← POST toggle like
    [id]/comments/route.ts      ← GET comments, POST comment
  analytics/
    cohort/[id]/route.ts        ← GET full cohort analytics
    company/route.ts            ← GET company-wide impact
    pillar/[id]/route.ts        ← GET by strategy pillar
  reports/
    export/route.ts             ← POST: generate CSV export

components/
  community/
    PostComposer.tsx            ← Create post textarea + submit
    PostCard.tsx                ← Feed post with like, comment, pin
    CommentThread.tsx           ← Nested comments under a post
  analytics/
    ImpactScoreCard.tsx         ← Large metric card
    SkillGrowthChart.tsx        ← Bar chart: pre vs post ratings
    ConfidenceTrendChart.tsx    ← Line chart: confidence over time
    ActionCompletionChart.tsx   ← Donut: completed/pending/skipped
    CohortComparisonTable.tsx   ← Multi-cohort comparison
    PillarBreakdownChart.tsx    ← Strategy pillar impact bars
```

---

## Phase 6 — API Routes (Detailed)

### `GET /api/posts?cohort_id=X&page=1&limit=20`
**Auth:** Cohort member, Trainer, HR
**Returns:**
```typescript
{
  posts: Array<Post & {
    user: User
    like_count: number
    liked_by_me: boolean
    comment_count: number
    comments?: Post[]           // only if fetching single post
  }>
  total: number
  has_more: boolean
}
```

### `POST /api/posts`
**Body:** `{ cohort_id, content, type?, image_url? }`
**Auth:** Any cohort member

### `POST /api/posts/[id]/like`
**Logic:** Toggle — if already liked DELETE, else INSERT. Returns `{ liked: boolean, count: number }`

### `POST /api/posts/[id]/comments`
**Body:** `{ content: string }`
**Logic:** Insert with `parent_post_id = id`, `type = 'comment'`

### `PATCH /api/posts/[id]`
**Auth:** Trainer only
**Body:** `{ is_pinned: boolean }` — pin/unpin post

### `GET /api/analytics/cohort/[id]`
**Auth:** HR, Trainer (own cohort), Superadmin
**Returns:**
```typescript
{
  cohort: CohortWithDetails
  attendance: {
    enrolled: number
    pre_confirmed: number
    attended: number
    attendance_rate: number
  }
  pre_training: {
    avg_readiness: number
    task_completion_rates: { compare: %, shape: %, meet: %, prereads: % }
  }
  commitments: {
    total_committed: number
    commitment_rate: number
    total_actions: number
    avg_actions_per_person: number
  }
  action_completion: {
    completed: number
    in_progress: number
    pending: number
    skipped: number
    completion_rate: number
  }
  skill_growth: Array<{
    skill: Skill
    avg_pre: number
    avg_post: number
    growth_delta: number
    response_count: number
  }>
  confidence: {
    week1_avg: number
    latest_avg: number
    delta: number
    checkin_rate: number
  }
  community: {
    post_count: number
    comment_count: number
    like_count: number
    active_members: number
  }
  inactive_participants: Array<User>   // no activity in 14 days
}
```

### `GET /api/analytics/company`
**Auth:** HR, Superadmin
**Returns:** Aggregated across all cohorts for company_id. Same structure as cohort analytics but averaged/summed.

### `POST /api/reports/export`
**Auth:** HR, Superadmin
**Body:** `{ cohort_id?: string, type: 'participants' | 'actions' | 'assessments' | 'full' }`
**Returns:** CSV file download (Content-Type: text/csv)

---

## Phase 6 — UI Pages (Detailed)

### `/participant/community` — Community Feed
**Header:** Cohort name + phase pill
**Compose box:** "Share a win, insight, or update…" textarea with submit
**Prompt suggestions:** "🎉 I just completed…" | "💡 I learned…" | "🤝 Shoutout to…"

**Feed (reverse chronological):**
Each post card:
- Avatar + name + time ago
- Content text
- Image (if attached)
- Auto-milestone posts: styled differently (purple bg)
- Footer: ❤️ Like (count) | 💬 Comment (count) | Pinned badge if pinned
- Pinned posts appear at top with yellow left border

**Comments:** Expandable inline thread

### `/hr/impact` — L&D Impact Dashboard
**Header stat cards (6):**
- Total Training Programmes
- Active Cohorts
- Total Participants Trained
- Avg Action Completion Rate (%)
- Avg Confidence Delta (+N pts)
- L&D Impact Score (composite)

**Section 1 — By Training Programme:**
- Table: Programme Name | Cohorts | Participants | Completion % | Avg Confidence | Rating | Strategy Pillar

**Section 2 — By Strategy Pillar:**
- Horizontal bar chart: each pillar with composite score
- Clicking pillar filters the cohort table below

**Section 3 — Cohort Details Table:**
Columns: Cohort | Date | Trainer | Enrolled | Attended | Committed | Actions Done | Completion% | Confidence Δ | Inactive

**Section 4 — Skill Growth:**
Bar chart: grouped by skill, pre vs post ratings side by side

**Section 5 — Confidence Trend:**
Line chart across all cohorts, week-over-week

**Filter controls:** Date range | Programme | Strategy Pillar | Trainer

### `/hr/reports` — Export Centre
**Available exports (as button cards):**
- Participant List (CSV)
- Action Completion Report (CSV)
- Skill Assessment Data (CSV)
- Confidence Check-in Data (CSV)
- Full Cohort Report (CSV)

Each card: Report name | Description | Last generated | Download button
Filter by: Cohort (select), Date range

---

---

# PHASE 7: AI-Powered Features

**Depends on:** Phases 5 and 6 complete
**Duration:** 3–4 weeks
**Personas:** All
**Model:** `claude-sonnet-4-6` (Anthropic) via direct API

---

## Phase 7 Goals
Intelligent personalization throughout the platform. AI enhances existing workflows — it does not replace them.

---

## Phase 7 — New Files to Create

```
app/api/ai/
  skill-insight/route.ts        ← POST: AI insight after self-assessment
  expectation-alignment/route.ts ← POST: AI analysis of batch expectations
  nudge-generate/route.ts       ← POST: AI-generated nudge from commitment
  growth-narrative/route.ts     ← POST: AI growth summary for participant
  impact-summary/route.ts       ← POST: AI L&D impact narrative for HR
  action-recommend/route.ts     ← POST: smart action recommendations
  chat/route.ts                 ← POST: streaming chatbot for participants

supabase/
  functions/
    ai-wrapper/index.ts         ← Supabase Edge Function (rate limiting + caching)

components/
  ai/
    AIInsightCard.tsx           ← Streaming AI response card
    AILoadingDots.tsx           ← Animated thinking indicator
    AIChatWidget.tsx            ← Floating chat button + drawer
    StreamingText.tsx           ← Character-by-character text reveal

lib/
  ai.ts                         ← Anthropic API wrapper with streaming
```

---

## Phase 7 — API Routes (Detailed)

### `POST /api/ai/skill-insight`
**Trigger:** After participant submits self-assessment (Task 1)
**Body:**
```typescript
{
  cohort_id: string
  ratings: Array<{ skill_name: string, score: number, reflection: string }>
  batch_averages: Array<{ skill_name: string, average: number }>
}
```
**AI Prompt:**
```
You are an L&D coach. A participant just self-rated their skills before a training session.
Ratings: [data]
Batch average: [data]
Give a warm, insightful 2-3 sentence reflection on their self-awareness and what to focus on.
Be specific. Don't be generic. Reference their actual scores.
```
**Returns:** Streamed text response
**Cache:** Store in `ai_interactions` table (type='skill_insight')

### `POST /api/ai/expectation-alignment`
**Trigger:** After participant submits expectations (Task 2) — shows group themes
**Body:** `{ all_expectations: string[], participant_expectation: string }`
**AI Prompt:** Analyze themes across all expectations. Return JSON: `{ themes: string[], your_alignment_pct: number, shared_themes: string[] }`
**Returns:** JSON (non-streamed)

### `POST /api/ai/nudge-generate`
**Trigger:** Trainer clicks "Generate AI Nudge" in nudge builder
**Body:**
```typescript
{
  commitment: string
  skill_name: string
  actions: string[]
  week_number: number
}
```
**AI Prompt:**
```
Generate a micro-action nudge in this exact JSON format:
{ "what": "...", "how": "...", "why": "...", "time_minutes": 5 }
Based on this commitment: [commitment]
Skill focus: [skill]
Week [N] since training — make it achievable this week.
Be specific and actionable. Max 2 sentences per field.
```
**Returns:** `{ nudge: { what, how, why, time_minutes } }`

### `POST /api/ai/growth-narrative`
**Trigger:** Participant views progress page — "Your Growth Story" section
**Body:** `{ participant_name, skill_growth[], action_completion_rate, confidence_delta, days_since_training }`
**AI Prompt:** Write a 2-paragraph personal growth narrative in second person ("You've…")
**Returns:** Streamed text
**Cache:** Re-generate weekly (store generated_at in ai_interactions)

### `POST /api/ai/chat` (streaming)
**Auth:** Participant
**Body:** `{ messages: Array<{role, content}>, cohort_id: string }`
**Context injected into system prompt:**
- Participant's programme name and skills
- Their commitment and actions
- Training date and trainer name
- Recent nudges
**Model:** `claude-sonnet-4-6`, `stream: true`
**Returns:** Server-Sent Events stream

### `POST /api/ai/action-recommend`
**Trigger:** Action selection page — "Suggested for you" section
**Body:** `{ commitment, skill_ratings, available_templates[] }`
**AI Prompt:** Rank the action templates by relevance to this commitment + skills profile. Return top 3 IDs with reasoning.
**Returns:** `{ recommended: Array<{ template_id, reason }> }`

---

## Phase 7 — UI Integration Points

| Where | AI Feature | Component |
|-------|-----------|-----------|
| Task 1 (Skill Assessment) | Insight after submit | `AIInsightCard` slides in after save |
| Task 2 (Expectations) | Group alignment analysis | Percentage match + shared themes section |
| Action Selection | Recommended actions | "✨ Recommended for you" section at top |
| My Progress page | Growth narrative | "Your Growth Story" card with streaming text |
| Nudge Builder (Trainer) | AI nudge generation | "✨ Generate with AI" button in form |
| HR Impact page | Impact summary | "AI Summary" card at top of dashboard |
| All participant pages | Chat widget | Floating "💬" button → drawer with chat |

### `lib/ai.ts` — Anthropic Client
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Standard completion
export async function generateInsight(prompt: string, system: string): Promise<string>

// Streaming completion (returns ReadableStream for SSE)
export async function streamCompletion(
  messages: MessageParam[],
  system: string
): Promise<ReadableStream>

// JSON output (structured)
export async function generateJSON<T>(prompt: string, schema: string): Promise<T>
```

### New env vars
```
ANTHROPIC_API_KEY=sk-ant-xxxxx
AI_RATE_LIMIT_PER_USER_PER_HOUR=20
```

---

---

# APPENDIX A: Component Library Reference

## Reusable UI components to build in Phase 2 and reuse throughout

### `Modal.tsx`
```tsx
<Modal open={open} onClose={onClose} title="Title" size="md">
  content
  <footer>buttons</footer>
</Modal>
```

### `Toast.tsx` (context-based)
```tsx
const { toast } = useToast()
toast.success('Saved!')
toast.error('Something went wrong')
toast.info('Check your email')
```

### `ConfirmDialog.tsx`
```tsx
<ConfirmDialog
  open={open}
  title="Delete Cohort?"
  description="This cannot be undone."
  confirmLabel="Delete"
  confirmVariant="danger"
  onConfirm={handleDelete}
  onCancel={() => setOpen(false)}
/>
```

### `FileUpload.tsx`
```tsx
<FileUpload
  bucket="resources"
  path={`cohorts/${cohortId}`}
  accept=".pdf,.mp4"
  maxSizeMB={50}
  onUpload={(url, file) => handleUpload(url, file)}
/>
```

### `DataTable.tsx` (generic)
```tsx
<DataTable
  columns={[{ key: 'name', label: 'Name', render: (row) => <b>{row.name}</b> }]}
  data={rows}
  onRowClick={(row) => router.push(`/hr/cohorts/${row.id}`)}
  emptyState={<EmptyState />}
  loading={loading}
/>
```

### `StatCard.tsx`
```tsx
<StatCard
  value={87}
  suffix="%"
  label="Completion Rate"
  color="#23CE68"
  trend={+12}          // shows "+12%" badge
  delay={0}            // animation delay in ms
/>
```

---

# APPENDIX B: Key Business Logic

## Readiness Score Calculation
```
readiness_score = 20 (base) + (completed_task_count × 20)
Min: 20% | Max: 100%
Tasks: compare, shape, meet, prereads (4 tasks × 20% = 80%)
```

## L&D Impact Score (Composite)
```
impact_score = (
  (action_completion_rate × 0.35) +
  (confidence_delta_normalized × 0.25) +
  (attendance_rate × 0.20) +
  (skill_growth_avg × 0.20)
) × 100
```

## Cohort Status Transitions
```
draft → scheduled  (HR manually marks ready)
scheduled → live   (HR/Trainer starts session on training day)
live → completed   (Trainer/HR closes session)
```

## Notification Queue Processing
```
Every hour (Vercel cron):
  SELECT * FROM notification_queue
  WHERE status = 'pending' AND scheduled_for <= now()
  LIMIT 50

For each:
  if channel IN ('email', 'both'): send via SendGrid
  if channel IN ('in_app', 'both'): set readable flag
  UPDATE status='sent', sent_at=now()
```

## Nudge Scheduling Logic
```
Default nudge schedule for a 3-action plan:
  Action 1 nudge: training_date + 3 days
  Action 2 nudge: training_date + 10 days
  Action 3 nudge: training_date + 21 days
Trainer can override any date.
```

---

# APPENDIX C: Cursor Usage Instructions

## How to Use This Document with Cursor

1. **Start each phase session** by pasting this entire document into Cursor context, then say: *"I am building Phase [N]. My existing files are in the Project tab. Please reference the Phase [N] section and existing files, then start with [specific feature]."*

2. **Reference Global Context** — Always remind Cursor: no self-signup, service-role is server-only, use `@supabase/ssr` not auth-helpers.

3. **Model:** Use `claude-sonnet-4-6` in Cursor for all code generation.

4. **Database:** All tables exist. Never create new migrations unless explicitly adding a new column. Use the schema reference section.

5. **Per-feature workflow:**
   - First create the API route
   - Then create the page/component consuming it
   - Test the API in browser before building UI

6. **Type safety:** All types are in `types/index.ts`. Import from `@/types`. Never use `any` unless absolutely necessary.

7. **CSS:** Use the existing CSS classes from `globals.css` before writing custom styles. Reference the design tokens section for colors.

---

*Nudgeable.ai Master Implementation Plan v4.0 | April 2026*
*Use this document as the single source of truth for all Cursor sessions.*
