/**
 * Seed script – populates Supabase with realistic demo data for all three views.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PASSWORD = 'Test1234!';

async function createUser(email: string, name: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) {
    if (error.message?.includes('already been registered')) {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existing = users.find((u: { email?: string }) => u.email === email);
      if (existing) {
        console.log(`  ↳ User ${email} already exists, reusing`);
        return existing.id;
      }
    }
    throw new Error(`Failed to create user ${email}: ${error.message}`);
  }
  console.log(`  ✓ Created user ${email}`);
  return data.user.id;
}

async function seed() {
  console.log('\n🌱 Seeding Nudgeable demo data...\n');

  // ── 1. Company ────────────────────────────────────────────────────────
  console.log('1. Creating company...');

  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', 'acme-corp')
    .maybeSingle();

  let companyId: string;
  if (existingCompany) {
    companyId = existingCompany.id;
    console.log('  ↳ Company already exists, reusing');
  } else {
    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name: 'Acme Corporation',
        slug: 'acme-corp',
        domain: 'acme.com',
        subscription_plan: 'growth',
        primary_color: '#623CEA',
        settings: {},
      })
      .select()
      .single();
    if (error) throw error;
    companyId = company.id;
    console.log('  ✓ Company created');
  }

  // ── 2. Users ──────────────────────────────────────────────────────────
  console.log('\n2. Creating users...');

  const hrUserId = await createUser('hr@acme.com', 'Sarah Mitchell');
  const trainerUserId = await createUser('trainer@acme.com', 'James O\'Brien');
  const participantIds: string[] = [];

  const participants = [
    { email: 'arjun@acme.com',   name: 'Arjun Patel',       job: 'Team Lead',         dept: 'Engineering' },
    { email: 'maria@acme.com',   name: 'Maria Santos',       job: 'Product Manager',   dept: 'Product' },
    { email: 'chen@acme.com',    name: 'Chen Wei',           job: 'Senior Developer',  dept: 'Engineering' },
    { email: 'priya@acme.com',   name: 'Priya Sharma',       job: 'UX Designer',       dept: 'Design' },
    { email: 'tom@acme.com',     name: 'Tom Brennan',        job: 'Account Manager',   dept: 'Sales' },
    { email: 'fatima@acme.com',  name: 'Fatima Al-Rashid',   job: 'Data Analyst',      dept: 'Analytics' },
    { email: 'james@acme.com',   name: 'James Okafor',       job: 'Marketing Lead',    dept: 'Marketing' },
    { email: 'sophie@acme.com',  name: 'Sophie Laurent',     job: 'HR Business Partner', dept: 'People Ops' },
  ];

  for (const p of participants) {
    const id = await createUser(p.email, p.name);
    participantIds.push(id);
  }

  // ── 3. user_companies + users table ────────────────────────────────────
  console.log('\n3. Linking users to company...');

  for (const userId of [hrUserId, trainerUserId, ...participantIds]) {
    await supabase.from('users').upsert({ id: userId, email: '', name: '' }, { onConflict: 'id' }).select();
  }

  // Update users table with proper data + plain passwords
  await supabase.from('users').update({ email: 'hr@acme.com', name: 'Sarah Mitchell', plain_password: PASSWORD }).eq('id', hrUserId);
  await supabase.from('users').update({ email: 'trainer@acme.com', name: "James O'Brien", plain_password: PASSWORD }).eq('id', trainerUserId);
  for (let i = 0; i < participants.length; i++) {
    await supabase.from('users').update({ email: participants[i].email, name: participants[i].name, plain_password: PASSWORD }).eq('id', participantIds[i]);
  }

  // user_companies
  await supabase.from('user_companies').upsert(
    { user_id: hrUserId, company_id: companyId, role: 'hr', job_title: 'L&D Manager', department: 'People Operations', status: 'active' },
    { onConflict: 'user_id,company_id' }
  );
  await supabase.from('user_companies').upsert(
    { user_id: trainerUserId, company_id: companyId, role: 'trainer', job_title: 'Leadership Coach', department: 'External', status: 'active' },
    { onConflict: 'user_id,company_id' }
  );
  for (let i = 0; i < participants.length; i++) {
    await supabase.from('user_companies').upsert(
      { user_id: participantIds[i], company_id: companyId, role: 'participant', job_title: participants[i].job, department: participants[i].dept, status: 'active' },
      { onConflict: 'user_id,company_id' }
    );
  }
  console.log('  ✓ All users linked');

  // ── 4. Strategy pillar ─────────────────────────────────────────────────
  console.log('\n4. Creating strategy pillar...');
  const { data: pillar } = await supabase
    .from('strategy_pillars')
    .upsert({ company_id: companyId, name: 'People & Culture', color: '#623CEA', sort_order: 1 }, { onConflict: 'company_id,name' })
    .select()
    .single();
  console.log('  ✓ Strategy pillar ready');

  // ── 5. Programme + skills ──────────────────────────────────────────────
  console.log('\n5. Creating programme & skills...');

  const { data: existingProg } = await supabase
    .from('programmes')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', 'Giving Effective Feedback')
    .maybeSingle();

  let programmeId: string;
  if (existingProg) {
    programmeId = existingProg.id;
    console.log('  ↳ Programme already exists');
  } else {
    const { data: prog, error } = await supabase
      .from('programmes')
      .insert({
        company_id: companyId,
        name: 'Giving Effective Feedback',
        description: 'Build the confidence and techniques to give meaningful, constructive feedback that drives growth. Through practical exercises and peer learning, participants will develop their own feedback style.',
        created_by: hrUserId,
        strategy_pillar_id: pillar?.id ?? null,
        status: 'active',
        settings: {},
      })
      .select()
      .single();
    if (error) throw error;
    programmeId = prog.id;
    console.log('  ✓ Programme created');
  }

  const skillDefs = [
    { name: 'Constructive Criticism', description: 'Ability to frame negative feedback in a way that motivates improvement rather than defensiveness.', sort_order: 1 },
    { name: 'Active Listening', description: 'Truly hearing and understanding the other person before responding, including reading non-verbal cues.', sort_order: 2 },
    { name: 'Empathy in Communication', description: 'Connecting with the other person\'s perspective and emotions while delivering feedback.', sort_order: 3 },
    { name: 'Situational Awareness', description: 'Reading the context and timing — knowing when and where feedback will land best.', sort_order: 4 },
    { name: 'Growth Mindset Framing', description: 'Positioning feedback as an opportunity for growth rather than a judgement of performance.', sort_order: 5 },
  ];

  const { data: existingSkills } = await supabase
    .from('skills')
    .select('id, name')
    .eq('programme_id', programmeId);

  let skillIds: string[];
  if (existingSkills && existingSkills.length >= 5) {
    skillIds = existingSkills.map(s => s.id);
    console.log('  ↳ Skills already exist');
  } else {
    if (existingSkills && existingSkills.length > 0) {
      await supabase.from('skills').delete().eq('programme_id', programmeId);
    }
    const { data: skills, error } = await supabase
      .from('skills')
      .insert(skillDefs.map(s => ({ ...s, programme_id: programmeId })))
      .select();
    if (error) throw error;
    skillIds = skills.map(s => s.id);
    console.log('  ✓ 5 skills created');
  }

  // ── 6. Cohort ──────────────────────────────────────────────────────────
  console.log('\n6. Creating cohort...');

  const trainingDate = new Date();
  trainingDate.setDate(trainingDate.getDate() + 12);
  const dateStr = trainingDate.toISOString().split('T')[0];

  const { data: existingCohort } = await supabase
    .from('cohorts')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', 'London Feedback Masterclass — Cohort A')
    .maybeSingle();

  let cohortId: string;
  if (existingCohort) {
    cohortId = existingCohort.id;
    console.log('  ↳ Cohort already exists');
  } else {
    const { data: cohort, error } = await supabase
      .from('cohorts')
      .insert({
        programme_id: programmeId,
        company_id: companyId,
        name: 'London Feedback Masterclass — Cohort A',
        trainer_user_id: trainerUserId,
        training_date: dateStr,
        training_time: '09:30',
        location: 'WeWork Moorgate, London',
        status: 'scheduled',
        max_participants: 12,
        created_by: hrUserId,
      })
      .select()
      .single();
    if (error) throw error;
    cohortId = cohort.id;
    console.log('  ✓ Cohort created');
  }

  // Cohort phases
  const phases = ['Pre-Training', 'Training Day', 'Post-Training'];
  for (let i = 0; i < phases.length; i++) {
    await supabase.from('cohort_phases').upsert(
      { cohort_id: cohortId, name: phases[i], sequence_order: i + 1 },
      { onConflict: 'cohort_id,sequence_order' }
    );
  }
  console.log('  ✓ Cohort phases set');

  // ── 7. Enrol participants ──────────────────────────────────────────────
  console.log('\n7. Enrolling participants...');
  for (const pid of participantIds) {
    await supabase.from('user_cohorts').upsert(
      { user_id: pid, cohort_id: cohortId, cohort_role: 'participant', status: 'confirmed', enrolled_date: new Date().toISOString() },
      { onConflict: 'user_id,cohort_id' }
    );
  }
  console.log(`  ✓ ${participantIds.length} participants enrolled`);

  // ── 8. Resources (pre-reads) ───────────────────────────────────────────
  console.log('\n8. Creating resources...');
  const resourceDefs = [
    { title: 'The Feedback Fallacy — HBR Article', type: 'article', file_url: 'https://hbr.org/2019/03/the-feedback-fallacy', duration_minutes: 12, sort_order: 1 },
    { title: 'Radical Candor — Key Frameworks (PDF)', type: 'pdf', file_url: 'https://example.com/radical-candor-summary.pdf', duration_minutes: 8, sort_order: 2 },
    { title: 'SBI Feedback Model — 5 min Explainer', type: 'video', file_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration_minutes: 5, sort_order: 3 },
    { title: 'Pre-session Reflection Worksheet', type: 'pdf', file_url: 'https://example.com/reflection-worksheet.pdf', duration_minutes: 10, sort_order: 4 },
  ];

  const { data: existingRes } = await supabase
    .from('resources')
    .select('id')
    .eq('cohort_id', cohortId);

  let resourceIds: string[];
  if (existingRes && existingRes.length >= 4) {
    resourceIds = existingRes.map(r => r.id);
    console.log('  ↳ Resources already exist');
  } else {
    const { data: resources, error } = await supabase
      .from('resources')
      .insert(resourceDefs.map(r => ({ ...r, cohort_id: cohortId })))
      .select();
    if (error) throw error;
    resourceIds = resources.map(r => r.id);
    console.log('  ✓ 4 resources created');
  }

  // ── 9. Task completions (varied progress) ──────────────────────────────
  console.log('\n9. Seeding task completions...');

  // Participant completion patterns:
  // arjun  — all 4 done   (100%)
  // maria  — 3 done       (80%)
  // chen   — 2 done       (60%)
  // priya  — 2 done       (60%)
  // tom    — 1 done       (40%)
  // fatima — 1 done       (40%)
  // james  — 0 done       (20% base)
  // sophie — 0 done       (20% base)

  const taskPatterns: string[][] = [
    ['compare', 'shape', 'meet', 'prereads'],  // arjun
    ['compare', 'shape', 'meet'],               // maria
    ['compare', 'shape'],                        // chen
    ['compare', 'shape'],                        // priya
    ['compare'],                                 // tom
    ['compare'],                                 // fatima
    [],                                          // james
    [],                                          // sophie
  ];

  for (let i = 0; i < participantIds.length; i++) {
    for (const taskType of taskPatterns[i]) {
      await supabase.from('task_completions').upsert(
        { user_id: participantIds[i], cohort_id: cohortId, task_type: taskType, completed_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString() },
        { onConflict: 'user_id,cohort_id,task_type' }
      );
    }
  }
  console.log('  ✓ Task completions seeded');

  // ── 10. Self-assessments ───────────────────────────────────────────────
  console.log('\n10. Seeding skill assessments...');

  const ratingPatterns = [
    [3, 4, 2, 3, 4],  // arjun
    [4, 3, 3, 2, 4],  // maria
    [2, 3, 4, 3, 2],  // chen
    [3, 2, 3, 4, 3],  // priya
    [2, 3, 2, 3, 3],  // tom
    [4, 2, 3, 2, 4],  // fatima
  ];

  const reflections = [
    'I find it hard to be direct without sounding harsh.',
    'I think I listen well but sometimes jump to solutions too quickly.',
    'I can empathise but struggle with delivery under pressure.',
    'I often misjudge timing — I give feedback in the moment when it should wait.',
    'I always try to focus on growth, but sometimes it comes across as dismissive of the issue.',
  ];

  for (let i = 0; i < Math.min(participantIds.length, ratingPatterns.length); i++) {
    for (let j = 0; j < skillIds.length; j++) {
      await supabase.from('self_assessments').upsert(
        {
          user_id: participantIds[i],
          cohort_id: cohortId,
          skill_id: skillIds[j],
          rating_score: ratingPatterns[i][j],
          reflection_notes: i < reflections.length ? reflections[j] : null,
          phase: 'pre',
        },
        { onConflict: 'user_id,cohort_id,skill_id,phase' }
      );
    }
  }
  console.log('  ✓ Assessments seeded for 6 participants');

  // ── 11. Onboarding data (expectations + intros) ────────────────────────
  console.log('\n11. Seeding onboarding data...');

  const onboardingData = [
    { idx: 0, expectations: 'I want to learn how to give feedback to senior leaders without feeling awkward. I also want practical frameworks I can use in my 1:1s immediately.', session_goals: 'Leave with 2-3 techniques for giving feedback upward', intro_role: 'Team Lead', intro_team: 'Engineering', intro_message: "Hey everyone! I'm Arjun, Team Lead in Engineering. I'm here because I want to get better at giving feedback to my team — especially the tough conversations. Looking forward to learning with you all!" },
    { idx: 1, expectations: 'Looking to improve how I facilitate feedback conversations in cross-functional teams. Sometimes feedback gets lost between product and engineering.', session_goals: 'Better tools for facilitating feedback in team retrospectives', intro_role: 'Product Manager', intro_team: 'Product', intro_message: "Hi! I'm Maria from the Product team. Excited to sharpen my feedback skills — I work across many teams and want to make our interactions more productive." },
    { idx: 2, expectations: 'I tend to be too blunt. I need to learn how to be direct but kind.', session_goals: 'Learn the balance between honesty and empathy', intro_role: 'Senior Developer', intro_team: 'Engineering', intro_message: "Hello! Chen here. I've been told I need to work on my delivery. Here to learn!" },
    { idx: 3, expectations: 'As a designer, I receive a lot of subjective feedback. I want to learn how to give it better too.', session_goals: 'Frameworks for giving feedback on creative work', intro_role: 'UX Designer', intro_team: 'Design', intro_message: "Hi all! I'm Priya from Design. I want to learn how to give and receive design critique more effectively." },
    { idx: 4, expectations: 'Sales is very competitive. I want to give feedback that motivates rather than creates rivalry.', session_goals: 'Motivational feedback techniques for sales teams', intro_role: 'Account Manager', intro_team: 'Sales' },
  ];

  for (const ob of onboardingData) {
    await supabase.from('cohort_onboarding').upsert(
      {
        user_id: participantIds[ob.idx],
        cohort_id: cohortId,
        expectations: ob.expectations,
        session_goals: ob.session_goals,
        intro_role: ob.intro_role,
        intro_team: ob.intro_team,
        intro_message: ob.intro_message ?? null,
      },
      { onConflict: 'user_id,cohort_id' }
    );
  }
  console.log('  ✓ Onboarding data seeded');

  // ── 12. Resource tracking ──────────────────────────────────────────────
  console.log('\n12. Seeding resource tracking...');

  // arjun read all, maria read 3, chen read 1
  if (resourceIds.length >= 4) {
    for (const rid of resourceIds) {
      await supabase.from('resource_tracking').upsert(
        { user_id: participantIds[0], resource_id: rid, status: 'read', read_at: new Date().toISOString() },
        { onConflict: 'user_id,resource_id' }
      );
    }
    for (let r = 0; r < 3; r++) {
      await supabase.from('resource_tracking').upsert(
        { user_id: participantIds[1], resource_id: resourceIds[r], status: 'read', read_at: new Date().toISOString() },
        { onConflict: 'user_id,resource_id' }
      );
    }
    await supabase.from('resource_tracking').upsert(
      { user_id: participantIds[2], resource_id: resourceIds[0], status: 'read', read_at: new Date().toISOString() },
      { onConflict: 'user_id,resource_id' }
    );
  }
  console.log('  ✓ Resource tracking seeded');

  // ── 13. Messages ───────────────────────────────────────────────────────
  console.log('\n13. Seeding messages...');

  await supabase.from('messages').insert([
    {
      cohort_id: cohortId,
      sender_id: trainerUserId,
      recipient_id: null,
      content: "Welcome to the Feedback Masterclass! I'm James, your facilitator. Please complete your pre-training tasks before our session. Looking forward to a great day together! 🎯",
      is_batch: true,
    },
    {
      cohort_id: cohortId,
      sender_id: trainerUserId,
      recipient_id: null,
      content: 'Quick reminder — please try to finish the pre-reads before the session. The HBR article on the Feedback Fallacy is particularly important for our discussion on Day 1.',
      is_batch: true,
    },
    {
      cohort_id: cohortId,
      sender_id: participantIds[0],
      recipient_id: trainerUserId,
      content: 'Hi James, quick question — should we prepare any specific examples from our own experience for the session?',
      is_batch: false,
    },
    {
      cohort_id: cohortId,
      sender_id: trainerUserId,
      recipient_id: participantIds[0],
      content: 'Great question Arjun! Yes, think of 2-3 recent situations where you had to give feedback. We\'ll use these in our role-play exercises.',
      is_batch: false,
    },
  ]);
  console.log('  ✓ Messages seeded');

  // ── 14. Action templates ───────────────────────────────────────────────
  console.log('\n14. Creating action templates...');

  await supabase.from('action_templates').upsert([
    { company_id: companyId, title: 'Give specific feedback to a direct report this week', category: 'Practice', builds_capability: 'Constructive Criticism' },
    { company_id: companyId, title: 'Schedule a feedback check-in with your manager', category: 'Practice', builds_capability: 'Active Listening' },
    { company_id: companyId, title: 'Use the SBI model in your next 1:1', category: 'Framework', builds_capability: 'Situational Awareness' },
    { company_id: companyId, title: 'Write a feedback reflection journal entry', category: 'Reflection', builds_capability: 'Empathy in Communication' },
    { company_id: companyId, title: 'Practice reframing criticism as a growth opportunity', category: 'Mindset', builds_capability: 'Growth Mindset Framing' },
    { company_id: companyId, title: 'Ask for feedback from a peer using the "one thing" technique', category: 'Practice', builds_capability: 'Active Listening' },
  ], { onConflict: 'company_id,title' });
  console.log('  ✓ Action templates created');

  // ── 15. Phase 4: attendance, commitments, actions ─────────────────────
  console.log('\n15. Seeding attendance & commitments (Phase 4)...');

  for (let i = 0; i < participantIds.length; i++) {
    await supabase.from('attendance').upsert(
      {
        user_id: participantIds[i],
        cohort_id: cohortId,
        pre_confirmed: i < 6,
        live_checkin: i < 4,
        checkin_time: i < 4 ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,cohort_id' }
    );
  }
  console.log('  ✓ Attendance rows seeded');

  const { data: existingPlan } = await supabase
    .from('commitment_plans')
    .select('id')
    .eq('user_id', participantIds[0])
    .eq('cohort_id', cohortId)
    .maybeSingle();

  let planId = existingPlan?.id;
  if (!planId) {
    const { data: plan, error: pErr } = await supabase
      .from('commitment_plans')
      .insert({
        user_id: participantIds[0],
        cohort_id: cohortId,
        main_commitment:
          'I commit to holding structured feedback conversations with each direct report at least twice before month end, using the SBI framework.',
        why_text: 'My team has asked for clearer expectations and I want to role-model openness.',
        blockers: 'Calendar density in Q4 — I will block focus time.',
      })
      .select()
      .single();
    if (!pErr && plan) planId = plan.id;
  }

  if (planId) {
    const { data: tmpl } = await supabase
      .from('action_templates')
      .select('id, builds_capability')
      .eq('company_id', companyId)
      .limit(2);

    const { count } = await supabase
      .from('user_actions')
      .select('*', { count: 'exact', head: true })
      .eq('commitment_plan_id', planId);

    if ((count ?? 0) === 0 && tmpl && tmpl.length > 0) {
      await supabase.from('user_actions').insert(
        tmpl.map(t => ({
          user_id: participantIds[0],
          commitment_plan_id: planId,
          template_id: t.id,
          builds_capability: t.builds_capability,
          status: 'pending',
        }))
      );
    }
  }
  console.log('  ✓ Commitment demo data ready');

  // ── Done ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Seed complete! Here are your login credentials:\n');
  console.log('  HR View:');
  console.log('    Email:    hr@acme.com');
  console.log('    Password: Test1234!\n');
  console.log('  Trainer View:');
  console.log('    Email:    trainer@acme.com');
  console.log('    Password: Test1234!\n');
  console.log('  Participant View (fully completed):');
  console.log('    Email:    arjun@acme.com');
  console.log('    Password: Test1234!\n');
  console.log('  Participant View (partially completed):');
  console.log('    Email:    maria@acme.com');
  console.log('    Password: Test1234!\n');
  console.log('  Participant View (not started):');
  console.log('    Email:    james@acme.com');
  console.log('    Password: Test1234!\n');
  console.log('═'.repeat(60) + '\n');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
