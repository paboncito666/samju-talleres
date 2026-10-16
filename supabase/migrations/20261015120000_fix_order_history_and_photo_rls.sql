BEGIN;

CREATE OR REPLACE FUNCTION public.active_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.rol::text
  FROM public.profiles AS p
  WHERE p.id = (SELECT auth.uid())
    AND p.activo = true
$$;

ALTER FUNCTION public.active_profile_role() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.active_profile_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.active_profile_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ordenes_trabajo AS o
    WHERE o.id = p_order_id
      AND (
        public.active_profile_role() IN ('admin', 'recepcionista')
        OR (
          public.active_profile_role() = 'mecanico'
          AND o.mecanico_id = (SELECT auth.uid())
        )
      )
  )
$$;

ALTER FUNCTION public.can_access_order(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_access_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_order(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_order_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NOT (
      (OLD.estado = 'RECIBIDO' AND NEW.estado = 'DIAGNOSTICO') OR
      (OLD.estado = 'DIAGNOSTICO' AND NEW.estado = 'PENDIENTE') OR
      (OLD.estado = 'PENDIENTE' AND NEW.estado IN ('REPARACION', 'CANCELADO')) OR
      (OLD.estado = 'REPARACION' AND NEW.estado = 'CALIDAD') OR
      (OLD.estado = 'CALIDAD' AND NEW.estado IN ('LISTO', 'CANCELADO')) OR
      (OLD.estado = 'LISTO' AND NEW.estado = 'ENTREGADO')
    ) THEN
      RAISE EXCEPTION 'Transición de estado no permitida.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.estado IN ('CALIDAD', 'LISTO', 'ENTREGADO')
      AND NULLIF(trim(NEW.diagnostico), '') IS NULL THEN
      RAISE EXCEPTION 'El diagnóstico es obligatorio antes de cerrar la orden.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.estado = 'CANCELADO'
      AND NULLIF(trim(NEW.motivo_cancelacion), '') IS NULL THEN
      RAISE EXCEPTION 'El motivo de cancelación es obligatorio.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF public.active_profile_role() = 'mecanico'
    AND (NEW.mecanico_id IS DISTINCT FROM OLD.mecanico_id
      OR NEW.recepcionista_id IS DISTINCT FROM OLD.recepcionista_id
      OR NEW.vehiculo_id IS DISTINCT FROM OLD.vehiculo_id) THEN
    RAISE EXCEPTION 'El mecánico no puede cambiar las asignaciones de la orden.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ordenes_validate_update
  ON public.ordenes_trabajo;
CREATE TRIGGER ordenes_validate_update
  BEFORE UPDATE ON public.ordenes_trabajo
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_update();

CREATE OR REPLACE FUNCTION public.record_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO public.historial_estados (
      orden_id,
      estado_anterior,
      estado_nuevo,
      cambiado_por,
      motivo
    )
    VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.estado END,
      NEW.estado,
      auth.uid(),
      COALESCE(
        NULLIF(current_setting('app.order_change_reason', true), ''),
        NULLIF(NEW.motivo_cancelacion, ''),
        'Actualización del estado'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.record_order_status_change() OWNER TO postgres;

DROP TRIGGER IF EXISTS ordenes_record_status_change
  ON public.ordenes_trabajo;
DROP TRIGGER IF EXISTS trg_log_estado
  ON public.ordenes_trabajo;
CREATE TRIGGER ordenes_record_status_change
  AFTER INSERT OR UPDATE OF estado ON public.ordenes_trabajo
  FOR EACH ROW EXECUTE FUNCTION public.record_order_status_change();

GRANT SELECT, INSERT, UPDATE ON public.ordenes_trabajo TO authenticated;

DROP POLICY IF EXISTS "Crear ordenes recepcion"
  ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "Actualizar orden asignada"
  ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "Admin control total ordenes"
  ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "Leer ordenes autenticado"
  ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "Leer ordenes personal"
  ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "Actualizar ordenes personal"
  ON public.ordenes_trabajo;
CREATE POLICY "Crear ordenes recepcion"
  ON public.ordenes_trabajo
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.active_profile_role() IN ('admin', 'recepcionista')
  );
CREATE POLICY "Leer ordenes personal"
  ON public.ordenes_trabajo
  FOR SELECT
  TO authenticated
  USING (
    public.active_profile_role() IN ('admin', 'recepcionista')
    OR (
      public.active_profile_role() = 'mecanico'
      AND mecanico_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Actualizar ordenes personal"
  ON public.ordenes_trabajo
  FOR UPDATE
  TO authenticated
  USING (
    public.active_profile_role() IN ('admin', 'recepcionista')
    OR (
      public.active_profile_role() = 'mecanico'
      AND mecanico_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.active_profile_role() IN ('admin', 'recepcionista')
    OR (
      public.active_profile_role() = 'mecanico'
      AND mecanico_id = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, DELETE ON public.fotos_vehiculo TO authenticated;
DROP POLICY IF EXISTS "Personal lee fotos" ON public.fotos_vehiculo;
DROP POLICY IF EXISTS "Staff acceso fotos_vehiculo" ON public.fotos_vehiculo;
CREATE POLICY "Personal lee fotos"
  ON public.fotos_vehiculo
  FOR SELECT
  TO authenticated
  USING (public.can_access_order(orden_id));
DROP POLICY IF EXISTS "Personal registra fotos" ON public.fotos_vehiculo;
CREATE POLICY "Personal registra fotos"
  ON public.fotos_vehiculo
  FOR INSERT
  TO authenticated
  WITH CHECK (
    subida_por = (SELECT auth.uid())
    AND public.can_access_order(orden_id)
  );
DROP POLICY IF EXISTS "Admin elimina fotos" ON public.fotos_vehiculo;
CREATE POLICY "Admin elimina fotos"
  ON public.fotos_vehiculo
  FOR DELETE
  TO authenticated
  USING (
    public.active_profile_role() = 'admin'
    AND public.can_access_order(orden_id)
  );

GRANT SELECT ON public.historial_estados TO authenticated;
DROP POLICY IF EXISTS "Personal lee historial"
  ON public.historial_estados;
DROP POLICY IF EXISTS "Staff lectura historial_estados"
  ON public.historial_estados;
CREATE POLICY "Personal lee historial"
  ON public.historial_estados
  FOR SELECT
  TO authenticated
  USING (public.can_access_order(orden_id));

GRANT SELECT, INSERT, DELETE ON storage.objects TO authenticated;

DROP POLICY IF EXISTS "Personal lee fotos de orden" ON storage.objects;
CREATE POLICY "Personal lee fotos de orden"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fotos-vehiculos'
    AND EXISTS (
      SELECT 1
      FROM public.ordenes_trabajo AS o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND public.can_access_order(o.id)
    )
  );

DROP POLICY IF EXISTS "Personal sube fotos de orden" ON storage.objects;
CREATE POLICY "Personal sube fotos de orden"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-vehiculos'
    AND EXISTS (
      SELECT 1
      FROM public.ordenes_trabajo AS o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND public.can_access_order(o.id)
    )
  );

DROP POLICY IF EXISTS "Personal elimina fotos de orden" ON storage.objects;
CREATE POLICY "Personal elimina fotos de orden"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fotos-vehiculos'
    AND EXISTS (
      SELECT 1
      FROM public.ordenes_trabajo AS o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND public.can_access_order(o.id)
        AND (
          public.active_profile_role() = 'admin'
          OR owner_id = (SELECT auth.uid())::text
        )
    )
  );

DO $$
DECLARE
  table_name text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    FOREACH table_name IN ARRAY ARRAY[
      'ordenes_trabajo', 'historial_estados', 'fotos_vehiculo'
    ] LOOP
      BEGIN
        EXECUTE format(
          'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
          table_name
        );
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END LOOP;
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
