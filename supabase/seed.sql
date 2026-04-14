-- ============================================================
-- NUDGEABLE.AI — DEV SEED DATA
-- Run AFTER 001_phase1_schema.sql
-- ⚠️  Development only — never run in production
-- ============================================================

-- NOTE: Auth users must be created via Supabase Auth Admin API,
-- not directly via SQL. Create them in the Supabase Dashboard →
-- Authentication → Users, then run this SQL to set up the profile data.

-- ── 1. Create the Superadmin company (platform-level) ─────────────────────
INSERT INTO public.companies (id, name, slug, subscription_plan, primary_color)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Nudgeable Platform',
  'nudgeable-platform',
  'enterprise',
  '#221D23'
)
ON CONFLICT (id) DO NOTHING;


-- ── 2. Demo Company: ACME Corp ────────────────────────────────────────────
INSERT INTO public.companies (id, name, slug, domain, subscription_plan, primary_color)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'ACME Corporation',
  'acme-corp',
  'acme.com',
  'growth',
  '#623CEA'
)
ON CONFLICT (id) DO NOTHING;


-- ── 3. Strategy Pillars for ACME ─────────────────────────────────────────
INSERT INTO public.strategy_pillars (company_id, name, color, sort_order)
VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Leadership',   '#623CEA', 1),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Culture',      '#F68A29', 2),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Technical',    '#3699FC', 3),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Collaboration','#23CE68', 4)
ON CONFLICT DO NOTHING;


-- ============================================================
-- MANUAL STEPS REQUIRED (Supabase Dashboard):
-- ============================================================
-- 1. Go to Authentication → Users → Add User
--
-- Create these users (email_confirm = true):
--
-- a) Superadmin
--    Email:    admin@nudgeable.ai
--    Password: NudgeAdmin@2026
--    Note the UUID shown after creation
--
-- b) HR Admin (ACME)
--    Email:    hr@acme.com
--    Password: AcmeHR@2026
--    Note the UUID shown after creation
--
-- c) Trainer
--    Email:    trainer@acme.com
--    Password: AcmeTrainer@2026
--
-- d) Participant
--    Email:    participant@acme.com
--    Password: AcmePart@2026
--
-- 2. After creating auth users, run the SQL below replacing
--    the UUIDs with the actual ones from Supabase Dashboard.
-- ============================================================


-- ── EXAMPLE: After creating auth users, run this SQL ─────────────────────
-- Replace <SUPERADMIN_UUID>, <HR_UUID>, <TRAINER_UUID>, <PARTICIPANT_UUID>
-- with the actual UUIDs from Supabase Auth

/*

-- Superadmin profile
INSERT INTO public.users (id, email, name)
VALUES ('<SUPERADMIN_UUID>', 'admin@nudgeable.ai', 'Platform Admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_companies (user_id, company_id, role)
VALUES ('<SUPERADMIN_UUID>', 'aaaaaaaa-0000-0000-0000-000000000001', 'superadmin')
ON CONFLICT DO NOTHING;

-- HR Admin profile
INSERT INTO public.users (id, email, name)
VALUES ('<HR_UUID>', 'hr@acme.com', 'Priya Sharma')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_companies (user_id, company_id, role, job_title, department)
VALUES ('<HR_UUID>', 'bbbbbbbb-0000-0000-0000-000000000001', 'hr', 'L&D Manager', 'Human Resources')
ON CONFLICT DO NOTHING;

-- Trainer profile
INSERT INTO public.users (id, email, name)
VALUES ('<TRAINER_UUID>', 'trainer@acme.com', 'Rahul Verma')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_companies (user_id, company_id, role, job_title)
VALUES ('<TRAINER_UUID>', 'bbbbbbbb-0000-0000-0000-000000000001', 'trainer', 'Senior Facilitator')
ON CONFLICT DO NOTHING;

-- Participant profile
INSERT INTO public.users (id, email, name)
VALUES ('<PARTICIPANT_UUID>', 'participant@acme.com', 'Arjun Mehta')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_companies (user_id, company_id, role, job_title, department)
VALUES ('<PARTICIPANT_UUID>', 'bbbbbbbb-0000-0000-0000-000000000001', 'participant', 'Team Lead', 'Engineering')
ON CONFLICT DO NOTHING;

*/
