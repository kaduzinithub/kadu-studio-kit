ALTER TABLE public.generated_sites
  ADD COLUMN IF NOT EXISTS share_slug TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

UPDATE public.generated_sites
SET share_slug = encode(gen_random_bytes(8), 'hex')
WHERE share_slug IS NULL;

ALTER TABLE public.generated_sites
  ALTER COLUMN share_slug SET DEFAULT encode(gen_random_bytes(8), 'hex');

ALTER TABLE public.generated_sites
  ALTER COLUMN share_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS generated_sites_share_slug_key
  ON public.generated_sites (share_slug);