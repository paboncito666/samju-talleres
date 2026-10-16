BEGIN;

ALTER TABLE public.ordenes_trabajo
  ADD COLUMN IF NOT EXISTS diagnostico text;

NOTIFY pgrst, 'reload schema';

COMMIT;
