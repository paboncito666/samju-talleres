BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE public.rol_personal AS ENUM ('admin', 'mecanico', 'recepcionista');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.estado_orden AS ENUM (
    'RECIBIDO', 'DIAGNOSTICO', 'PENDIENTE', 'REPARACION',
    'CALIDAD', 'LISTO', 'ENTREGADO', 'CANCELADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  rol public.rol_personal NOT NULL DEFAULT 'mecanico',
  activo boolean NOT NULL DEFAULT true,
  avatar_url text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa text NOT NULL UNIQUE,
  marca text NOT NULL,
  modelo text NOT NULL,
  anio integer CHECK (anio IS NULL OR anio BETWEEN 1900 AND 2200),
  color text,
  kilometraje integer NOT NULL DEFAULT 0 CHECK (kilometraje >= 0),
  propietario_nombre text,
  propietario_telefono text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ordenes_trabajo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id uuid NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  mecanico_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recepcionista_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  estado public.estado_orden NOT NULL DEFAULT 'RECIBIDO',
  descripcion_trabajo text NOT NULL,
  tipo_servicio text NOT NULL,
  diagnostico text,
  fecha_ingreso timestamptz NOT NULL DEFAULT now(),
  fecha_estimada_entrega date,
  fecha_entrega_real timestamptz,
  observaciones text,
  motivo_cancelacion text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ordenes_trabajo
  ADD COLUMN IF NOT EXISTS diagnostico text;

CREATE TABLE IF NOT EXISTS public.trabajos_realizados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  tipo text NOT NULL,
  completado boolean NOT NULL DEFAULT false,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fotos_vehiculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE,
  url text NOT NULL,
  etapa text NOT NULL CHECK (etapa IN ('entrada', 'proceso', 'salida')),
  subida_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.historial_estados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE,
  estado_anterior public.estado_orden,
  estado_nuevo public.estado_orden NOT NULL,
  cambiado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  motivo text,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notas_internas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  contenido text NOT NULL CHECK (length(trim(contenido)) BETWEEN 1 AND 2000),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.repuestos_orden (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE,
  nombre_repuesto text NOT NULL,
  cantidad numeric(10, 2) NOT NULL CHECK (cantidad > 0),
  costo_unitario numeric(12, 2) NOT NULL CHECK (costo_unitario >= 0),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, rol)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, 'Usuario'),
    'mecanico'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX IF NOT EXISTS idx_ordenes_estado_fecha
  ON public.ordenes_trabajo (estado, fecha_ingreso DESC);
CREATE INDEX IF NOT EXISTS idx_ordenes_vehiculo_fecha
  ON public.ordenes_trabajo (vehiculo_id, fecha_ingreso DESC);
CREATE INDEX IF NOT EXISTS idx_ordenes_mecanico_estado
  ON public.ordenes_trabajo (mecanico_id, estado);
CREATE INDEX IF NOT EXISTS idx_historial_orden_fecha
  ON public.historial_estados (orden_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_notas_orden_fecha
  ON public.notas_internas (orden_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_fotos_orden_etapa
  ON public.fotos_vehiculo (orden_id, etapa, creado_en);

CREATE OR REPLACE FUNCTION public.set_actualizado_en()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_actualizado_en ON public.profiles;
CREATE TRIGGER profiles_set_actualizado_en
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
DROP TRIGGER IF EXISTS vehiculos_set_actualizado_en ON public.vehiculos;
CREATE TRIGGER vehiculos_set_actualizado_en
  BEFORE UPDATE ON public.vehiculos
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
DROP TRIGGER IF EXISTS ordenes_set_actualizado_en ON public.ordenes_trabajo;
CREATE TRIGGER ordenes_set_actualizado_en
  BEFORE UPDATE ON public.ordenes_trabajo
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();

CREATE OR REPLACE FUNCTION public.record_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO public.historial_estados (
      orden_id, estado_anterior, estado_nuevo, cambiado_por, motivo
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

  IF public.current_profile_role() = 'mecanico'
    AND (NEW.mecanico_id IS DISTINCT FROM OLD.mecanico_id
      OR NEW.recepcionista_id IS DISTINCT FROM OLD.recepcionista_id
      OR NEW.vehiculo_id IS DISTINCT FROM OLD.vehiculo_id) THEN
    RAISE EXCEPTION 'El mecánico no puede cambiar las asignaciones de la orden.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ordenes_validate_update ON public.ordenes_trabajo;
CREATE TRIGGER ordenes_validate_update
  BEFORE UPDATE ON public.ordenes_trabajo
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_update();

DROP TRIGGER IF EXISTS ordenes_record_status_change ON public.ordenes_trabajo;
CREATE TRIGGER ordenes_record_status_change
  AFTER INSERT OR UPDATE OF estado ON public.ordenes_trabajo
  FOR EACH ROW EXECUTE FUNCTION public.record_order_status_change();

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS public.rol_personal
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.rol::public.rol_personal FROM public.profiles AS p
  WHERE p.id = (SELECT auth.uid()) AND p.activo = true
$$;

REVOKE ALL ON FUNCTION public.current_profile_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ordenes_trabajo AS o
    WHERE o.id = p_order_id
      AND (
        public.current_profile_role() IN ('admin', 'recepcionista')
        OR (
          public.current_profile_role() = 'mecanico'
          AND o.mecanico_id = (SELECT auth.uid())
        )
      )
  )
$$;
REVOKE ALL ON FUNCTION public.can_access_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_order(uuid) TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trabajos_realizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_vehiculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_internas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repuestos_orden ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver perfil propio o admin" ON public.profiles;
DROP POLICY IF EXISTS "Leer perfiles autenticado" ON public.profiles;
CREATE POLICY "Ver perfil propio o admin" ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Editar perfil propio" ON public.profiles;
CREATE POLICY "Editar perfil propio" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));
REVOKE UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (nombre, avatar_url) ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Leer vehiculos autenticado" ON public.vehiculos;
DROP POLICY IF EXISTS "Insertar vehiculo admin recep" ON public.vehiculos;
DROP POLICY IF EXISTS "Actualizar vehiculo admin recep" ON public.vehiculos;
GRANT SELECT, INSERT, UPDATE ON public.vehiculos TO authenticated;
CREATE POLICY "Leer vehiculos autenticado" ON public.vehiculos
  FOR SELECT TO authenticated USING (public.current_profile_role() IS NOT NULL);
DROP POLICY IF EXISTS "Crear vehiculos recepcion" ON public.vehiculos;
CREATE POLICY "Crear vehiculos recepcion" ON public.vehiculos
  FOR INSERT TO authenticated
  WITH CHECK (public.current_profile_role() IN ('admin', 'recepcionista'));
DROP POLICY IF EXISTS "Actualizar vehiculos recepcion" ON public.vehiculos;
CREATE POLICY "Actualizar vehiculos recepcion" ON public.vehiculos
  FOR UPDATE TO authenticated
  USING (public.current_profile_role() IN ('admin', 'recepcionista'))
  WITH CHECK (public.current_profile_role() IN ('admin', 'recepcionista'));

DROP POLICY IF EXISTS "Leer ordenes personal" ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "Leer ordenes autenticado" ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "Actualizar orden asignada" ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "Admin control total ordenes" ON public.ordenes_trabajo;
GRANT SELECT, INSERT, UPDATE ON public.ordenes_trabajo TO authenticated;
CREATE POLICY "Leer ordenes personal" ON public.ordenes_trabajo
  FOR SELECT TO authenticated
  USING (
    public.current_profile_role() IN ('admin', 'recepcionista')
    OR (public.current_profile_role() = 'mecanico' AND mecanico_id = (SELECT auth.uid()))
  );
DROP POLICY IF EXISTS "Crear ordenes recepcion" ON public.ordenes_trabajo;
CREATE POLICY "Crear ordenes recepcion" ON public.ordenes_trabajo
  FOR INSERT TO authenticated
  WITH CHECK (public.current_profile_role() IN ('admin', 'recepcionista'));
DROP POLICY IF EXISTS "Actualizar ordenes personal" ON public.ordenes_trabajo;
CREATE POLICY "Actualizar ordenes personal" ON public.ordenes_trabajo
  FOR UPDATE TO authenticated
  USING (
    public.current_profile_role() IN ('admin', 'recepcionista')
    OR (public.current_profile_role() = 'mecanico' AND mecanico_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    public.current_profile_role() IN ('admin', 'recepcionista')
    OR (public.current_profile_role() = 'mecanico' AND mecanico_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Personal lee trabajos" ON public.trabajos_realizados;
DROP POLICY IF EXISTS "Staff acceso trabajos_realizados" ON public.trabajos_realizados;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trabajos_realizados TO authenticated;
CREATE POLICY "Personal lee trabajos" ON public.trabajos_realizados
  FOR SELECT TO authenticated USING (public.can_access_order(orden_id));
DROP POLICY IF EXISTS "Personal gestiona trabajos" ON public.trabajos_realizados;
CREATE POLICY "Personal gestiona trabajos" ON public.trabajos_realizados
  FOR INSERT TO authenticated WITH CHECK (public.can_access_order(orden_id));
DROP POLICY IF EXISTS "Personal actualiza trabajos" ON public.trabajos_realizados;
CREATE POLICY "Personal actualiza trabajos" ON public.trabajos_realizados
  FOR UPDATE TO authenticated USING (public.can_access_order(orden_id))
  WITH CHECK (public.can_access_order(orden_id));
DROP POLICY IF EXISTS "Personal elimina trabajos" ON public.trabajos_realizados;
CREATE POLICY "Personal elimina trabajos" ON public.trabajos_realizados
  FOR DELETE TO authenticated
  USING (public.current_profile_role() = 'admin' AND public.can_access_order(orden_id));

DROP POLICY IF EXISTS "Personal lee fotos" ON public.fotos_vehiculo;
DROP POLICY IF EXISTS "Staff acceso fotos_vehiculo" ON public.fotos_vehiculo;
GRANT SELECT, INSERT, DELETE ON public.fotos_vehiculo TO authenticated;
CREATE POLICY "Personal lee fotos" ON public.fotos_vehiculo
  FOR SELECT TO authenticated USING (public.can_access_order(orden_id));
DROP POLICY IF EXISTS "Personal registra fotos" ON public.fotos_vehiculo;
CREATE POLICY "Personal registra fotos" ON public.fotos_vehiculo
  FOR INSERT TO authenticated
  WITH CHECK (
    subida_por = (SELECT auth.uid())
    AND public.can_access_order(orden_id)
  );
DROP POLICY IF EXISTS "Admin elimina fotos" ON public.fotos_vehiculo;
CREATE POLICY "Admin elimina fotos" ON public.fotos_vehiculo
  FOR DELETE TO authenticated
  USING (public.current_profile_role() = 'admin' AND public.can_access_order(orden_id));

DROP POLICY IF EXISTS "Personal lee historial" ON public.historial_estados;
DROP POLICY IF EXISTS "Staff lectura historial_estados" ON public.historial_estados;
GRANT SELECT ON public.historial_estados TO authenticated;
CREATE POLICY "Personal lee historial" ON public.historial_estados
  FOR SELECT TO authenticated USING (public.can_access_order(orden_id));

DROP POLICY IF EXISTS "Personal lee notas" ON public.notas_internas;
DROP POLICY IF EXISTS "Staff acceso notas_internas" ON public.notas_internas;
GRANT SELECT, INSERT, DELETE ON public.notas_internas TO authenticated;
CREATE POLICY "Personal lee notas" ON public.notas_internas
  FOR SELECT TO authenticated USING (public.can_access_order(orden_id));
DROP POLICY IF EXISTS "Personal crea notas propias" ON public.notas_internas;
CREATE POLICY "Personal crea notas propias" ON public.notas_internas
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND public.can_access_order(orden_id)
  );
DROP POLICY IF EXISTS "Autor o admin elimina notas" ON public.notas_internas;
CREATE POLICY "Autor o admin elimina notas" ON public.notas_internas
  FOR DELETE TO authenticated
  USING (
    public.can_access_order(orden_id)
    AND (autor_id = (SELECT auth.uid()) OR public.current_profile_role() = 'admin')
  );

DROP POLICY IF EXISTS "Personal lee repuestos" ON public.repuestos_orden;
DROP POLICY IF EXISTS "Staff acceso repuestos_orden" ON public.repuestos_orden;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repuestos_orden TO authenticated;
CREATE POLICY "Personal lee repuestos" ON public.repuestos_orden
  FOR SELECT TO authenticated USING (public.can_access_order(orden_id));
DROP POLICY IF EXISTS "Personal gestiona repuestos" ON public.repuestos_orden;
CREATE POLICY "Personal gestiona repuestos" ON public.repuestos_orden
  FOR ALL TO authenticated
  USING (public.can_access_order(orden_id))
  WITH CHECK (public.can_access_order(orden_id));

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
WHERE o.estado NOT IN ('ENTREGADO', 'CANCELADO');

CREATE OR REPLACE VIEW public.v_carga_mecanicos
WITH (security_invoker = true)
AS
SELECT
  p.nombre AS mecanico,
  count(o.id) FILTER (WHERE o.estado = 'REPARACION')::integer AS en_reparacion,
  count(o.id) FILTER (WHERE o.estado NOT IN ('ENTREGADO', 'CANCELADO'))::integer AS total_activos,
  round(
    avg(extract(day FROM o.fecha_entrega_real - o.fecha_ingreso))
      FILTER (WHERE o.estado = 'ENTREGADO'),
    1
  ) AS promedio_dias
FROM public.profiles AS p
LEFT JOIN public.ordenes_trabajo AS o ON o.mecanico_id = p.id
WHERE p.rol = 'mecanico' AND p.activo = true
GROUP BY p.id, p.nombre;

REVOKE ALL ON public.v_ordenes_activas, public.v_carga_mecanicos FROM anon;
GRANT SELECT ON public.v_ordenes_activas, public.v_carga_mecanicos TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('fotos-vehiculos', 'fotos-vehiculos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = false, file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Personal lee fotos de orden" ON storage.objects;
CREATE POLICY "Personal lee fotos de orden" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'fotos-vehiculos'
    AND EXISTS (
      SELECT 1 FROM public.ordenes_trabajo AS o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND public.can_access_order(o.id)
    )
  );
DROP POLICY IF EXISTS "Personal sube fotos de orden" ON storage.objects;
CREATE POLICY "Personal sube fotos de orden" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-vehiculos'
    AND EXISTS (
      SELECT 1 FROM public.ordenes_trabajo AS o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND public.can_access_order(o.id)
    )
  );
DROP POLICY IF EXISTS "Personal elimina fotos de orden" ON storage.objects;
CREATE POLICY "Personal elimina fotos de orden" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'fotos-vehiculos'
    AND (
      public.current_profile_role() = 'admin'
      OR owner_id = (SELECT auth.uid())::text
    )
  );

DO $$
DECLARE
  table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
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
END $$;

COMMIT;
