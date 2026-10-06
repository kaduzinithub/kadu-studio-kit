CREATE OR REPLACE FUNCTION public.has_active_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
    OR NOT EXISTS (
      SELECT 1 FROM public.access_plans
      WHERE user_id = _user_id AND expires_at IS NOT NULL AND expires_at < now()
    )
$$;
REVOKE EXECUTE ON FUNCTION public.has_active_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_access(uuid) TO authenticated;

DROP POLICY IF EXISTS "activities own" ON public.activities;
CREATE POLICY "activities own" ON public.activities FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
DROP POLICY IF EXISTS "briefings own" ON public.briefings;
CREATE POLICY "briefings own" ON public.briefings FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
DROP POLICY IF EXISTS "clients own" ON public.clients;
CREATE POLICY "clients own" ON public.clients FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
DROP POLICY IF EXISTS "companies own" ON public.companies;
CREATE POLICY "companies own" ON public.companies FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
DROP POLICY IF EXISTS "leads own" ON public.leads;
CREATE POLICY "leads own" ON public.leads FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
DROP POLICY IF EXISTS "messages own" ON public.messages;
CREATE POLICY "messages own" ON public.messages FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
DROP POLICY IF EXISTS "prompts own" ON public.prompts;
CREATE POLICY "prompts own" ON public.prompts FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
DROP POLICY IF EXISTS "settings own" ON public.settings;
CREATE POLICY "settings own" ON public.settings FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));

DROP POLICY IF EXISTS "Users manage own generated sites select" ON public.generated_sites;
DROP POLICY IF EXISTS "Users manage own generated sites insert" ON public.generated_sites;
DROP POLICY IF EXISTS "Users manage own generated sites update" ON public.generated_sites;
DROP POLICY IF EXISTS "Users manage own generated sites delete" ON public.generated_sites;
CREATE POLICY "generated_sites own" ON public.generated_sites FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));