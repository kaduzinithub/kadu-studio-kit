ALTER TABLE public.access_plans ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.access_plans ADD COLUMN IF NOT EXISTS last_charged_at TIMESTAMPTZ;