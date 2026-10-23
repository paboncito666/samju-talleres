BEGIN;

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
      (OLD.estado = 'DIAGNOSTICO' AND NEW.estado IN ('PENDIENTE', 'REPARACION', 'CANCELADO')) OR
      (OLD.estado = 'PENDIENTE' AND NEW.estado IN ('REPARACION', 'CANCELADO')) OR
      (OLD.estado = 'REPARACION' AND NEW.estado = 'CALIDAD') OR
      (OLD.estado = 'CALIDAD' AND NEW.estado IN ('REPARACION', 'LISTO', 'CANCELADO')) OR
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

COMMIT;
