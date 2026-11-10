BEGIN;

ALTER TABLE public.ordenes_trabajo
  ADD COLUMN IF NOT EXISTS archivada_en timestamptz,
  ADD COLUMN IF NOT EXISTS archivada_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ordenes_activas_no_archivadas
  ON public.ordenes_trabajo (estado, fecha_ingreso DESC)
  WHERE archivada_en IS NULL;

DROP POLICY IF EXISTS "Actualizar ordenes personal" ON public.ordenes_trabajo;
CREATE POLICY "Actualizar ordenes personal"
  ON public.ordenes_trabajo
  FOR UPDATE
  TO authenticated
  USING (
    archivada_en IS NULL
    AND (
      public.active_profile_role() IN ('admin', 'recepcionista')
      OR (
        public.active_profile_role() = 'mecanico'
        AND mecanico_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    archivada_en IS NULL
    AND (
      public.active_profile_role() IN ('admin', 'recepcionista')
      OR (
        public.active_profile_role() = 'mecanico'
        AND mecanico_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Personal gestiona trabajos" ON public.trabajos_realizados;
CREATE POLICY "Personal gestiona trabajos" ON public.trabajos_realizados
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_order(orden_id)
    AND EXISTS (
      SELECT 1 FROM public.ordenes_trabajo AS o
      WHERE o.id = orden_id AND o.archivada_en IS NULL
    )
  );

DROP POLICY IF EXISTS "Personal actualiza trabajos" ON public.trabajos_realizados;
CREATE POLICY "Personal actualiza trabajos" ON public.trabajos_realizados
  FOR UPDATE TO authenticated
  USING (
    public.can_access_order(orden_id)
    AND EXISTS (
      SELECT 1 FROM public.ordenes_trabajo AS o
      WHERE o.id = orden_id AND o.archivada_en IS NULL
    )
  )
  WITH CHECK (
    public.can_access_order(orden_id)
    AND EXISTS (
      SELECT 1 FROM public.ordenes_trabajo AS o
      WHERE o.id = orden_id AND o.archivada_en IS NULL
    )
  );

DROP POLICY IF EXISTS "Personal elimina trabajos" ON public.trabajos_realizados;
CREATE POLICY "Personal elimina trabajos" ON public.trabajos_realizados
  FOR DELETE TO authenticated
  USING (
    public.active_profile_role() = 'admin'
    AND public.can_access_order(orden_id)
    AND EXISTS (
      SELECT 1 FROM public.ordenes_trabajo AS o
      WHERE o.id = orden_id AND o.archivada_en IS NULL
    )
  );

DROP POLICY IF EXISTS "Personal registra fotos" ON public.fotos_vehiculo;
CREATE POLICY "Personal registra fotos"
  ON public.fotos_vehiculo
  FOR INSERT
  TO authenticated
  WITH CHECK (
    subida_por = (SELECT auth.uid())
    AND public.can_access_order(orden_id)
    AND EXISTS (
      SELECT 1 FROM public.ordenes_trabajo AS o
      WHERE o.id = orden_id AND o.archivada_en IS NULL
    )
  );

DROP POLICY IF EXISTS "Personal crea notas propias" ON public.notas_internas;
CREATE POLICY "Personal crea notas propias"
  ON public.notas_internas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND public.can_access_order(orden_id)
    AND EXISTS (
      SELECT 1 FROM public.ordenes_trabajo AS o
      WHERE o.id = orden_id AND o.archivada_en IS NULL
    )
  );

DROP POLICY IF EXISTS "Personal gestiona repuestos" ON public.repuestos_orden;
CREATE POLICY "Personal gestiona repuestos"
  ON public.repuestos_orden
  FOR ALL
  TO authenticated
  USING (
    public.can_access_order(orden_id)
    AND EXISTS (
      SELECT 1 FROM public.ordenes_trabajo AS o
      WHERE o.id = orden_id AND o.archivada_en IS NULL
    )
  )
  WITH CHECK (
    public.can_access_order(orden_id)
    AND EXISTS (
      SELECT 1 FROM public.ordenes_trabajo AS o
      WHERE o.id = orden_id AND o.archivada_en IS NULL
    )
  );

DROP POLICY IF EXISTS "Personal sube fotos de orden" ON storage.objects;
CREATE POLICY "Personal sube fotos de orden" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-vehiculos'
    AND EXISTS (
      SELECT 1 FROM public.ordenes_trabajo AS o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.archivada_en IS NULL
        AND public.can_access_order(o.id)
    )
  );

CREATE OR REPLACE VIEW public.v_ordenes_activas
WITH (security_invoker = true)
AS
SELECT
  o.id,
  v.placa,
  v.marca,
  v.modelo,
  p.nombre AS mecanico,
  o.estado,
  o.descripcion_trabajo,
  o.fecha_ingreso,
  o.fecha_estimada_entrega,
  EXTRACT(DAY FROM now() - o.fecha_ingreso) AS dias_en_taller
FROM public.ordenes_trabajo AS o
JOIN public.vehiculos AS v ON v.id = o.vehiculo_id
LEFT JOIN public.profiles AS p ON p.id = o.mecanico_id
WHERE o.estado NOT IN ('ENTREGADO', 'CANCELADO')
  AND o.archivada_en IS NULL;

CREATE OR REPLACE VIEW public.v_carga_mecanicos
WITH (security_invoker = true)
AS
SELECT
  p.nombre AS mecanico,
  count(o.id) FILTER (
    WHERE o.estado = 'REPARACION' AND o.archivada_en IS NULL
  ) AS en_reparacion,
  count(o.id) FILTER (
    WHERE o.estado NOT IN ('ENTREGADO', 'CANCELADO')
      AND o.archivada_en IS NULL
  ) AS total_activos,
  round(
    avg(extract(day FROM o.fecha_entrega_real - o.fecha_ingreso))
      FILTER (WHERE o.estado = 'ENTREGADO'),
    1
  ) AS promedio_dias
FROM public.profiles AS p
LEFT JOIN public.ordenes_trabajo AS o ON o.mecanico_id = p.id
WHERE p.rol = 'mecanico' AND p.activo = true
GROUP BY p.id, p.nombre;

NOTIFY pgrst, 'reload schema';

COMMIT;
