BEGIN;

CREATE INDEX IF NOT EXISTS idx_ordenes_tipo_fecha
  ON public.ordenes_trabajo (tipo_servicio, fecha_ingreso DESC);

NOTIFY pgrst, 'reload schema';

COMMIT;
