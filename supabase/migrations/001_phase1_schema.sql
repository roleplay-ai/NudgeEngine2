-- ============================================================
-- NUDGEABLE.AI — PHASE 1 DATABASE MIGRATION
-- Phase 1: Foundation, Auth, Access Control
-- Run in Supabase SQL Editor or via supabase db push
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. COMPANIES (Multi-tenant)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              varchar     NOT NULL,
  slug              varchar     UNIQUE NOT NULL,
  domain            varchar,
  subscription_plan varchar     NOT NULL DEFAULT 'free'
                                CHECK (subscription_plan IN ('free','starter','growth','enterprise')),
  logo_url          varchar,
  primary_color     varchar     NOT NULL DEFAULT '#623CEA',
  settings          jsonb       NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Index for slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS companies_slug_idx ON public.companies (slug);


-- ============================================================
-- 2. USERS (extends auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id             uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          varchar     UNIQUE NOT NULL,
  name           varchar     NOT NULL,
  avatar_url     varchar,
  phone          varchar,
  timezone       varchar     NOT NULL DEFAULT 'UTC',
  is_active      boolean     NOT NULL DEFAULT true,
  -- Obfuscated password stored for SendGrid credential delivery.
  -- Uses XOR obfuscation with PASSWORD_OBFUSCATION_KEY env var.
  -- ⚠️ Upgrade to AES-256-GCM (KMS-backed) before production launch.
  plain_password varchar,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_user_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_updated ON public.users;
CREATE TRIGGER on_user_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_updated_at();


-- ============================================================
-- 3. USER_COMPANIES (Junction: user ↔ company with role)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_companies (
  user_id     uuid    NOT NULL REFERENCES public.users(id)     ON DELETE CASCADE,
  company_id  uuid    NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role        varchar NOT NULL CHECK (role IN ('superadmin','hr','trainer','participant')),
  job_title   varchar,
  department  varchar,
  status      varchar NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS uc_company_idx ON public.user_companies (company_id);
CREATE INDEX IF NOT EXISTS uc_role_idx    ON public.user_companies (company_id, role);


-- ============================================================
-- 4. STRATEGY_PILLARS (L&D strategy grouping for HR analytics)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.strategy_pillars (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid    NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        varchar NOT NULL,
  color       varchar NOT NULL DEFAULT '#623CEA',
  sort_order  int     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sp_company_idx ON public.strategy_pillars (company_id);


-- ============================================================
-- 5. PROGRAMMES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.programmes (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid    NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name                varchar NOT NULL,
  description         text,
  created_by          uuid    NOT NULL REFERENCES public.users(id),
  strategy_pillar_id  uuid    REFERENCES public.strategy_pillars(id),
  status              varchar NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  settings            jsonb   NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prog_company_idx ON public.programmes (company_id);


-- ============================================================
-- 6. SKILLS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.skills (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid    NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  name         varchar NOT NULL,
  description  text,
  sort_order   int     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS skills_prog_idx ON public.skills (programme_id);


-- ============================================================
-- 7. ACTION_TEMPLATES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.action_templates (
  id                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         uuid    NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title              varchar NOT NULL,
  category           varchar,
  skill_id           uuid    REFERENCES public.skills(id),
  builds_capability  varchar,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS at_company_idx ON public.action_templates (company_id);


-- ============================================================
-- 8. COHORTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cohorts (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id      uuid    NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  company_id        uuid    NOT NULL REFERENCES public.companies(id),
  name              varchar NOT NULL,
  trainer_user_id   uuid    NOT NULL REFERENCES public.users(id),
  training_date     date    NOT NULL,
  training_time     time,
  location          varchar,
  status            varchar NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','scheduled','live','completed')),
  max_participants  int     NOT NULL DEFAULT 30,
  created_by        uuid    NOT NULL REFERENCES public.users(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cohorts_company_idx  ON public.cohorts (company_id);
CREATE INDEX IF NOT EXISTS cohorts_trainer_idx  ON public.cohorts (trainer_user_id);
CREATE INDEX IF NOT EXISTS cohorts_status_idx   ON public.cohorts (status);


-- ============================================================
-- 9. COHORT_PHASES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cohort_phases (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id      uuid    NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  name           varchar NOT NULL,
  sequence_order int     NOT NULL,
  UNIQUE (cohort_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS cp_cohort_idx ON public.cohort_phases (cohort_id);


-- ============================================================
-- 10. USER_COHORTS (participants enrolled in cohorts)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_cohorts (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid    NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  cohort_id     uuid    NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  cohort_role   varchar NOT NULL DEFAULT 'participant' CHECK (cohort_role IN ('participant','buddy')),
  status        varchar NOT NULL DEFAULT 'nominated'
                CHECK (status IN ('nominated','confirmed','declined','completed')),
  buddy_user_id uuid    REFERENCES public.users(id),
  enrolled_date timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cohort_id)
);

CREATE INDEX IF NOT EXISTS uc2_cohort_idx ON public.user_cohorts (cohort_id);
CREATE INDEX IF NOT EXISTS uc2_user_idx   ON public.user_cohorts (user_id);


-- ============================================================
-- 11. RESOURCES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.resources (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id        uuid    NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  title            varchar NOT NULL,
  type             varchar NOT NULL CHECK (type IN ('pdf','video','link','article')),
  file_url         varchar NOT NULL,
  duration_minutes int,
  sort_order       int     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS res_cohort_idx ON public.resources (cohort_id);


-- ============================================================
-- 12. TASK_COMPLETIONS (pre-training readiness)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_completions (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid    NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  cohort_id    uuid    NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  task_type    varchar NOT NULL CHECK (task_type IN ('compare','shape','meet','prereads')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cohort_id, task_type)
);

CREATE INDEX IF NOT EXISTS tc_user_cohort_idx ON public.task_completions (user_id, cohort_id);


-- ============================================================
-- 13. SELF_ASSESSMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.self_assessments (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid    NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  cohort_id        uuid    NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  skill_id         uuid    REFERENCES public.skills(id),
  rating_score     int     NOT NULL CHECK (rating_score BETWEEN 1 AND 5),
  reflection_notes text,
  phase            varchar NOT NULL CHECK (phase IN ('pre','post')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cohort_id, skill_id, phase)
);

CREATE INDEX IF NOT EXISTS sa_user_cohort_idx ON public.self_assessments (user_id, cohort_id);


-- ============================================================
-- 14. COHORT_ONBOARDING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cohort_onboarding (
  user_id       uuid NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  cohort_id     uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  expectations  text,
  intro_message text,
  intro_role    varchar,
  intro_team    varchar,
  session_goals text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cohort_id)
);


-- ============================================================
-- 15. RESOURCE_TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.resource_tracking (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid    NOT NULL REFERENCES public.users(id)      ON DELETE CASCADE,
  resource_id uuid    NOT NULL REFERENCES public.resources(id)  ON DELETE CASCADE,
  status      varchar NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read')),
  read_at     timestamptz,
  UNIQUE (user_id, resource_id)
);


-- ============================================================
-- 16. ATTENDANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.attendance (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid    NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  cohort_id     uuid    NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  pre_confirmed boolean NOT NULL DEFAULT false,
  live_checkin  boolean NOT NULL DEFAULT false,
  checkin_time  timestamptz,
  UNIQUE (user_id, cohort_id)
);


-- ============================================================
-- 17. COMMITMENT_PLANS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.commitment_plans (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid    NOT NULL REFERENCES public.users(id)         ON DELETE CASCADE,
  cohort_id         uuid    NOT NULL REFERENCES public.cohorts(id)       ON DELETE CASCADE,
  phase_id          uuid    REFERENCES public.cohort_phases(id),
  main_commitment   text    NOT NULL,
  why_text          text,
  blockers          text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp2_user_cohort_idx ON public.commitment_plans (user_id, cohort_id);


-- ============================================================
-- 18. USER_ACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_actions (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid    NOT NULL REFERENCES public.users(id)            ON DELETE CASCADE,
  commitment_plan_id    uuid    NOT NULL REFERENCES public.commitment_plans(id) ON DELETE CASCADE,
  template_id           uuid    REFERENCES public.action_templates(id),
  skill_id              uuid    REFERENCES public.skills(id),
  custom_title          varchar,
  builds_capability     varchar,
  status                varchar NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','in_progress','delayed','completed','skipped')),
  nudge_scheduled_date  date,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ua_user_idx ON public.user_actions (user_id);
CREATE INDEX IF NOT EXISTS ua_plan_idx ON public.user_actions (commitment_plan_id);


-- ============================================================
-- 19. CONFIDENCE_CHECKINS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.confidence_checkins (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid    NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  cohort_id        uuid    NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  confidence_score int     NOT NULL CHECK (confidence_score BETWEEN 1 AND 10),
  reflection       text,
  week_number      int     NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 20. NUDGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nudges (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id      uuid    NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  skill_id       uuid    REFERENCES public.skills(id),
  what           text    NOT NULL,
  how            text,
  why            text,
  time_minutes   int     NOT NULL DEFAULT 5,
  scheduled_date date,
  created_by     uuid    NOT NULL REFERENCES public.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 21. MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id    uuid    NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  sender_id    uuid    NOT NULL REFERENCES public.users(id),
  recipient_id uuid    REFERENCES public.users(id),
  content      text    NOT NULL,
  is_batch     boolean NOT NULL DEFAULT false,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS msg_cohort_idx    ON public.messages (cohort_id);
CREATE INDEX IF NOT EXISTS msg_recipient_idx ON public.messages (recipient_id);


-- ============================================================
-- 22. POSTS & LIKES (Community)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.posts (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_post_id uuid    REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id        uuid    NOT NULL REFERENCES public.users(id),
  cohort_id      uuid    NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  phase_id       uuid    REFERENCES public.cohort_phases(id),
  content        text    NOT NULL,
  type           varchar NOT NULL DEFAULT 'user_post'
                 CHECK (type IN ('user_post','comment','auto_milestone')),
  image_url      varchar,
  is_pinned      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_cohort_idx ON public.posts (cohort_id);

CREATE TABLE IF NOT EXISTS public.likes (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid    NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid    NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);


-- ============================================================
-- 23. NOTIFICATION_QUEUE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid    NOT NULL REFERENCES public.users(id),
  user_action_id uuid    REFERENCES public.user_actions(id),
  nudge_id       uuid    REFERENCES public.nudges(id),
  channel        varchar NOT NULL DEFAULT 'email' CHECK (channel IN ('email','in_app','both')),
  email_subject  varchar,
  email_body     text,
  scheduled_for  timestamptz NOT NULL,
  status         varchar NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  sent_at        timestamptz,
  opened_at      timestamptz,
  completed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS nq_status_idx ON public.notification_queue (status, scheduled_for);


-- ============================================================
-- TRIGGER: Auto-create users profile on auth.users insert
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_pillars     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_phases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cohorts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_assessments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_onboarding    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_tracking    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_actions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confidence_checkins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nudges               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue   ENABLE ROW LEVEL SECURITY;


-- ── Helper function: get caller's company_id ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM public.user_companies
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

-- ── Helper function: get caller's role ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS varchar LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.user_companies
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;


-- ─── COMPANIES ──────────────────────────────────────────────────────────────
-- Superadmin: full access
-- HR/Trainer/Participant: read their own company
CREATE POLICY "companies_superadmin_all" ON public.companies
  FOR ALL TO authenticated
  USING (get_user_role() = 'superadmin');

CREATE POLICY "companies_member_select" ON public.companies
  FOR SELECT TO authenticated
  USING (id = get_user_company_id());


-- ─── USERS ──────────────────────────────────────────────────────────────────
-- Superadmin: read all
-- HR: read users in their company
-- Trainer: read cohort members
-- Self: read/update own profile (NOT plain_password — that stays server-only)
CREATE POLICY "users_superadmin_all" ON public.users
  FOR ALL TO authenticated
  USING (get_user_role() = 'superadmin');

CREATE POLICY "users_self_read" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_self_update" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_hr_company_read" ON public.users
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'hr'
    AND id IN (
      SELECT user_id FROM public.user_companies
      WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "users_trainer_cohort_read" ON public.users
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'trainer'
    AND id IN (
      SELECT uc.user_id FROM public.user_cohorts uc
      INNER JOIN public.cohorts c ON c.id = uc.cohort_id
      WHERE c.trainer_user_id = auth.uid()
    )
  );


-- ─── USER_COMPANIES ─────────────────────────────────────────────────────────
CREATE POLICY "uc_superadmin_all" ON public.user_companies
  FOR ALL TO authenticated
  USING (get_user_role() = 'superadmin');

CREATE POLICY "uc_hr_company_all" ON public.user_companies
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'hr'
    AND company_id = get_user_company_id()
  );

CREATE POLICY "uc_self_read" ON public.user_companies
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());


-- ─── PROGRAMMES ─────────────────────────────────────────────────────────────
CREATE POLICY "programmes_company_select" ON public.programmes
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "programmes_hr_write" ON public.programmes
  FOR ALL TO authenticated
  USING (
    get_user_role() IN ('hr', 'superadmin')
    AND company_id = get_user_company_id()
  );


-- ─── COHORTS ────────────────────────────────────────────────────────────────
CREATE POLICY "cohorts_company_select" ON public.cohorts
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "cohorts_hr_write" ON public.cohorts
  FOR ALL TO authenticated
  USING (
    get_user_role() IN ('hr', 'superadmin')
    AND company_id = get_user_company_id()
  );


-- ─── USER_COHORTS ────────────────────────────────────────────────────────────
CREATE POLICY "uc2_participant_self" ON public.user_cohorts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "uc2_trainer_cohort_read" ON public.user_cohorts
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'trainer'
    AND cohort_id IN (
      SELECT id FROM public.cohorts WHERE trainer_user_id = auth.uid()
    )
  );

CREATE POLICY "uc2_hr_company_all" ON public.user_cohorts
  FOR ALL TO authenticated
  USING (
    get_user_role() IN ('hr', 'superadmin')
    AND cohort_id IN (
      SELECT id FROM public.cohorts WHERE company_id = get_user_company_id()
    )
  );


-- ─── TASK_COMPLETIONS ───────────────────────────────────────────────────────
CREATE POLICY "tc_self_all" ON public.task_completions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tc_trainer_cohort_read" ON public.task_completions
  FOR SELECT TO authenticated
  USING (
    cohort_id IN (
      SELECT id FROM public.cohorts WHERE trainer_user_id = auth.uid()
    )
  );

CREATE POLICY "tc_hr_company_read" ON public.task_completions
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('hr', 'superadmin')
    AND cohort_id IN (
      SELECT id FROM public.cohorts WHERE company_id = get_user_company_id()
    )
  );


-- ─── SELF_ASSESSMENTS ───────────────────────────────────────────────────────
CREATE POLICY "sa_self_all" ON public.self_assessments
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sa_hr_company_read" ON public.self_assessments
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('hr', 'superadmin', 'trainer')
    AND cohort_id IN (
      SELECT id FROM public.cohorts WHERE company_id = get_user_company_id()
    )
  );


-- ─── MESSAGES ───────────────────────────────────────────────────────────────
CREATE POLICY "messages_participants_read" ON public.messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR (
      is_batch = true
      AND cohort_id IN (
        SELECT cohort_id FROM public.user_cohorts WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "messages_trainer_send" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      get_user_role() IN ('trainer', 'hr', 'superadmin')
      OR (
        -- Participants can DM trainers
        get_user_role() = 'participant'
        AND is_batch = false
      )
    )
  );


-- ─── NOTIFICATION_QUEUE ─────────────────────────────────────────────────────
CREATE POLICY "nq_self_read" ON public.notification_queue
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());


-- ─── STRATEGY_PILLARS, SKILLS, ACTION_TEMPLATES (company-scoped reads) ──────
CREATE POLICY "sp_company_read" ON public.strategy_pillars
  FOR SELECT TO authenticated USING (company_id = get_user_company_id());

CREATE POLICY "sp_hr_write" ON public.strategy_pillars
  FOR ALL TO authenticated
  USING (get_user_role() IN ('hr','superadmin') AND company_id = get_user_company_id());

CREATE POLICY "skills_prog_read" ON public.skills
  FOR SELECT TO authenticated
  USING (
    programme_id IN (
      SELECT id FROM public.programmes WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "at_company_read" ON public.action_templates
  FOR SELECT TO authenticated USING (company_id = get_user_company_id());

CREATE POLICY "at_hr_write" ON public.action_templates
  FOR ALL TO authenticated
  USING (get_user_role() IN ('hr','superadmin') AND company_id = get_user_company_id());


-- ─── REMAINING TABLES: self-access + company-scoped reads ───────────────────
-- cohort_phases, resources, cohort_onboarding, resource_tracking,
-- attendance, commitment_plans, user_actions, confidence_checkins, nudges, posts, likes

CREATE POLICY "cp_company_read" ON public.cohort_phases
  FOR SELECT TO authenticated
  USING (cohort_id IN (SELECT id FROM public.cohorts WHERE company_id = get_user_company_id()));

CREATE POLICY "res_company_read" ON public.resources
  FOR SELECT TO authenticated
  USING (cohort_id IN (SELECT id FROM public.cohorts WHERE company_id = get_user_company_id()));

CREATE POLICY "co_self_all" ON public.cohort_onboarding
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "rt_self_all" ON public.resource_tracking
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "att_self_all" ON public.attendance
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "cp2_self_all" ON public.commitment_plans
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "ua_self_all" ON public.user_actions
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "cc_self_all" ON public.confidence_checkins
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "nudges_company_read" ON public.nudges
  FOR SELECT TO authenticated
  USING (cohort_id IN (SELECT id FROM public.cohorts WHERE company_id = get_user_company_id()));

CREATE POLICY "nudges_trainer_write" ON public.nudges
  FOR ALL TO authenticated
  USING (get_user_role() IN ('trainer','hr','superadmin'));

CREATE POLICY "posts_cohort_read" ON public.posts
  FOR SELECT TO authenticated
  USING (cohort_id IN (SELECT id FROM public.cohorts WHERE company_id = get_user_company_id()));

CREATE POLICY "posts_self_write" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "likes_self_all" ON public.likes
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- GRANT service role bypass (for admin API routes)
-- ============================================================
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
