CREATE TABLE public.plan_prices (
  plan TEXT PRIMARY KEY,
  price NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.plan_prices TO authenticated;
GRANT ALL ON public.plan_prices TO service_role;
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_prices admin select" ON public.plan_prices FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "plan_prices admin insert" ON public.plan_prices FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "plan_prices admin update" ON public.plan_prices FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.plan_prices (plan, price) VALUES ('1m', 0), ('3m', 0), ('1y', 0), ('lifetime', 0) ON CONFLICT DO NOTHING;
ALTER TABLE public.access_plans ADD COLUMN IF NOT EXISTS price_paid NUMERIC;