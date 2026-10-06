CREATE TABLE public.access_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'lifetime',
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.access_plans TO authenticated;
GRANT ALL ON public.access_plans TO service_role;
ALTER TABLE public.access_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "access_plans select own" ON public.access_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);