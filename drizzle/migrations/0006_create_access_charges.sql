CREATE TABLE public.access_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  charged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_charges TO authenticated;
GRANT ALL ON public.access_charges TO service_role;
ALTER TABLE public.access_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "access_charges admin select" ON public.access_charges FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "access_charges admin insert" ON public.access_charges FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "access_charges admin delete" ON public.access_charges FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX access_charges_user_id_idx ON public.access_charges (user_id, charged_at DESC);