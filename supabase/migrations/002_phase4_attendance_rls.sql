-- Phase 4: Allow trainers and HR to read attendance, commitment plans, and user actions
-- for cohorts they manage (mirrors task_completions / self_assessments patterns).

CREATE POLICY "att_trainer_cohort_read" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    cohort_id IN (
      SELECT id FROM public.cohorts WHERE trainer_user_id = auth.uid()
    )
  );

CREATE POLICY "att_hr_company_read" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('hr', 'superadmin')
    AND cohort_id IN (
      SELECT id FROM public.cohorts WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "cp2_trainer_cohort_read" ON public.commitment_plans
  FOR SELECT TO authenticated
  USING (
    cohort_id IN (
      SELECT id FROM public.cohorts WHERE trainer_user_id = auth.uid()
    )
  );

CREATE POLICY "cp2_hr_company_read" ON public.commitment_plans
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('hr', 'superadmin')
    AND cohort_id IN (
      SELECT id FROM public.cohorts WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "ua_trainer_cohort_read" ON public.user_actions
  FOR SELECT TO authenticated
  USING (
    commitment_plan_id IN (
      SELECT id FROM public.commitment_plans
      WHERE cohort_id IN (
        SELECT id FROM public.cohorts WHERE trainer_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "ua_hr_company_read" ON public.user_actions
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('hr', 'superadmin')
    AND commitment_plan_id IN (
      SELECT id FROM public.commitment_plans
      WHERE cohort_id IN (
        SELECT id FROM public.cohorts WHERE company_id = get_user_company_id()
      )
    )
  );
