BEGIN;

CREATE OR REPLACE FUNCTION public.validate_order_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  profile_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  profile_role := COALESCE(public.active_profile_role(), '');

  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NOT (
      (OLD.estado = 'RECIBIDO' AND NEW.estado = 'DIAGNOSTICO') OR
      (OLD.estado = 'DIAGNOSTICO'
        AND NEW.estado IN ('PENDIENTE', 'REPARACION')) OR
      (OLD.estado = 'PENDIENTE'
        AND NEW.estado IN ('REPARACION', 'CANCELADO')) OR
      (OLD.estado = 'REPARACION' AND NEW.estado = 'CALIDAD') OR
      (OLD.estado = 'CALIDAD'
        AND NEW.estado IN ('REPARACION', 'LISTO', 'CANCELADO')) OR
      (OLD.estado = 'LISTO' AND NEW.estado = 'ENTREGADO')
    ) THEN
      RAISE EXCEPTION 'Transición de estado no permitida.'
        USING ERRCODE = '23514';
    END IF;

    IF profile_role <> 'admin'
      AND NOT (
        (
          profile_role = 'mecanico'
          AND OLD.mecanico_id = auth.uid()
          AND (
            (OLD.estado = 'RECIBIDO' AND NEW.estado = 'DIAGNOSTICO') OR
            (OLD.estado = 'DIAGNOSTICO' AND NEW.estado = 'PENDIENTE') OR
            (OLD.estado = 'REPARACION' AND NEW.estado = 'CALIDAD')
          )
        )
        OR (
          profile_role = 'recepcionista'
          AND OLD.estado = 'LISTO'
          AND NEW.estado = 'ENTREGADO'
        )
      ) THEN
      RAISE EXCEPTION 'Tu rol no tiene permiso para realizar este cambio de estado.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.estado IN ('PENDIENTE', 'CALIDAD', 'LISTO', 'ENTREGADO')
      AND NULLIF(trim(NEW.diagnostico), '') IS NULL THEN
      RAISE EXCEPTION 'El diagnóstico es obligatorio antes de solicitar aprobación o cerrar la orden.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.estado = 'CANCELADO'
      AND NULLIF(trim(NEW.motivo_cancelacion), '') IS NULL THEN
      RAISE EXCEPTION 'El motivo de cancelación es obligatorio.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.estado = 'ENTREGADO'
      AND NOT EXISTS (
        SELECT 1
        FROM public.fotos_vehiculo AS photo
        WHERE photo.orden_id = NEW.id
          AND photo.etapa = 'salida'
      ) THEN
      RAISE EXCEPTION 'Se requiere al menos una fotografía de salida antes de entregar la orden.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF profile_role = 'mecanico'
    AND (
      OLD.mecanico_id IS DISTINCT FROM auth.uid()
      OR NEW.mecanico_id IS DISTINCT FROM OLD.mecanico_id
      OR NEW.recepcionista_id IS DISTINCT FROM OLD.recepcionista_id
      OR NEW.vehiculo_id IS DISTINCT FROM OLD.vehiculo_id
    ) THEN
    RAISE EXCEPTION 'El mecánico solo puede actualizar órdenes asignadas y no puede cambiar sus datos administrativos.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
