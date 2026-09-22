CREATE TABLE IF NOT EXISTS public.generated_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_id UUID REFERENCES public.briefings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  files JSONB NOT NULL,
  preview_html TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_sites TO authenticated;
GRANT ALL ON public.generated_sites TO service_role;

ALTER TABLE public.generated_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own generated sites select" ON public.generated_sites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own generated sites insert" ON public.generated_sites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own generated sites update" ON public.generated_sites
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own generated sites delete" ON public.generated_sites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS generated_sites_user_created_idx ON public.generated_sites (user_id, created_at DESC);