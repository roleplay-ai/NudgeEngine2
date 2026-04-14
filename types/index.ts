// ─── Core Enums ────────────────────────────────────────────────────────────────

export type UserRole = 'superadmin' | 'hr' | 'trainer' | 'participant';
export type UserStatus = 'active' | 'suspended';
export type CohortStatus = 'draft' | 'scheduled' | 'live' | 'completed';
export type ProgrammeStatus = 'active' | 'archived';
export type ActionStatus = 'pending' | 'in_progress' | 'delayed' | 'completed' | 'skipped';
export type UserCohortRole = 'participant' | 'buddy';
export type UserCohortStatus = 'nominated' | 'confirmed' | 'declined' | 'completed';
export type NotificationChannel = 'email' | 'in_app' | 'both';
export type NotificationStatus = 'pending' | 'sent' | 'failed';
export type PostType = 'user_post' | 'comment' | 'auto_milestone';
export type ResourceType = 'pdf' | 'video' | 'link' | 'article';
export type AssessmentPhase = 'pre' | 'post';
export type ResourceStatus = 'unread' | 'read';
export type TaskType = 'compare' | 'shape' | 'meet' | 'prereads';
export type SubscriptionPlan = 'free' | 'starter' | 'growth' | 'enterprise';

// ─── Database Row Types ────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  subscription_plan: SubscriptionPlan;
  logo_url: string | null;
  primary_color: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  timezone: string;
  is_active: boolean;
  // Plain password stored for credential email delivery (AES-encrypted at rest)
  // Never expose this in client-side queries
  plain_password?: string;
  created_at: string;
  updated_at: string;
}

export interface UserCompany {
  user_id: string;
  company_id: string;
  role: UserRole;
  job_title: string | null;
  department: string | null;
  status: UserStatus;
  created_at: string;
  // Joined relations
  user?: User;
  company?: Company;
}

export interface Programme {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_by: string;
  strategy_pillar_id: string | null;
  status: ProgrammeStatus;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface Cohort {
  id: string;
  programme_id: string;
  company_id: string;
  name: string;
  trainer_user_id: string;
  training_date: string;
  training_time: string | null;
  location: string | null;
  status: CohortStatus;
  max_participants: number;
  created_by: string;
  created_at: string;
}

export interface Skill {
  id: string;
  programme_id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface StrategyPillar {
  id: string;
  company_id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface ActionTemplate {
  id: string;
  company_id: string;
  title: string;
  category: string | null;
  skill_id: string | null;
  builds_capability: string | null;
  created_at: string;
}

export interface Resource {
  id: string;
  cohort_id: string;
  title: string;
  type: ResourceType;
  file_url: string;
  duration_minutes: number | null;
  sort_order: number;
}

export interface UserCohort {
  id: string;
  user_id: string;
  cohort_id: string;
  cohort_role: UserCohortRole;
  status: UserCohortStatus;
  buddy_user_id: string | null;
  enrolled_date: string;
}

export interface CohortPhase {
  id: string;
  cohort_id: string;
  name: string;
  sequence_order: number;
}

export interface SelfAssessment {
  id: string;
  user_id: string;
  cohort_id: string;
  skill_id: string | null;
  rating_score: number;
  reflection_notes: string | null;
  phase: AssessmentPhase;
  created_at: string;
}

export interface CohortOnboarding {
  user_id: string;
  cohort_id: string;
  expectations: string | null;
  intro_message: string | null;
  intro_role: string | null;
  intro_team: string | null;
  session_goals: string | null;
  created_at: string;
}

export interface TaskCompletion {
  id: string;
  user_id: string;
  cohort_id: string;
  task_type: TaskType;
  completed_at: string;
}

export interface ResourceTracking {
  id: string;
  user_id: string;
  resource_id: string;
  status: ResourceStatus;
  read_at: string | null;
}

export interface Attendance {
  id: string;
  user_id: string;
  cohort_id: string;
  pre_confirmed: boolean;
  live_checkin: boolean;
  checkin_time: string | null;
}

export interface CommitmentPlan {
  id: string;
  user_id: string;
  cohort_id: string;
  phase_id: string | null;
  main_commitment: string;
  why_text: string | null;
  blockers: string | null;
  created_at: string;
}

export interface UserAction {
  id: string;
  user_id: string;
  commitment_plan_id: string;
  template_id: string | null;
  skill_id: string | null;
  custom_title: string | null;
  builds_capability: string | null;
  status: ActionStatus;
  nudge_scheduled_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ConfidenceCheckin {
  id: string;
  user_id: string;
  cohort_id: string;
  confidence_score: number;
  reflection: string | null;
  week_number: number;
  created_at: string;
}

export interface Nudge {
  id: string;
  cohort_id: string;
  skill_id: string | null;
  what: string;
  how: string | null;
  why: string | null;
  time_minutes: number;
  scheduled_date: string | null;
  created_by: string;
  created_at: string;
}

export interface Post {
  id: string;
  parent_post_id: string | null;
  user_id: string;
  cohort_id: string;
  phase_id: string | null;
  content: string;
  type: PostType;
  image_url: string | null;
  is_pinned: boolean;
  created_at: string;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  cohort_id: string;
  sender_id: string;
  recipient_id: string | null;
  content: string;
  is_batch: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationQueue {
  id: string;
  user_id: string;
  user_action_id: string | null;
  nudge_id: string | null;
  channel: NotificationChannel;
  email_subject: string | null;
  email_body: string | null;
  scheduled_for: string;
  status: NotificationStatus;
  sent_at: string | null;
  opened_at: string | null;
  completed_at: string | null;
}

// ─── Extended / Joined Types ───────────────────────────────────────────────────

export interface UserWithRole extends User {
  role: UserRole;
  company_id: string;
  job_title: string | null;
  department: string | null;
  status: UserStatus;
}

export interface CohortWithDetails extends Cohort {
  programme: Programme;
  trainer: User;
  participant_count: number;
}

export interface ProgrammeWithCohorts extends Programme {
  cohorts: Cohort[];
  skills: Skill[];
}

// ─── API Payload Types ─────────────────────────────────────────────────────────

export interface CreateUserPayload {
  email: string;
  name: string;
  role: UserRole;
  company_id: string;
  job_title?: string;
  department?: string;
  phone?: string;
  // Password will be auto-generated if not provided
  password?: string;
}

export interface CreateOrganisationPayload {
  name: string;
  slug: string;
  domain?: string;
  subscription_plan?: SubscriptionPlan;
  primary_color?: string;
  hr_email: string;
  hr_name: string;
}

// ─── Auth Session ──────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company_id: string;
  company_name: string;
  avatar_url: string | null;
}

// ─── Supabase DB helper (generated type shorthand) ────────────────────────────
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
