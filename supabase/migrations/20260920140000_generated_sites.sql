CREATE TABLE public.generated_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_id UUID REFERENCES public.briefings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  files JSONB NOT NULL,
  preview_html TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX generated_sites_user_created_at_idx ON public.generated_sites (user_id, created_at DESC);
CREATE INDEX generated_sites_briefing_id_idx ON public.generated_sites (briefing_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_sites TO authenticated;
GRANT ALL ON public.generated_sites TO service_role;
ALTER TABLE public.generated_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generated_sites own" ON public.generated_sites FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
