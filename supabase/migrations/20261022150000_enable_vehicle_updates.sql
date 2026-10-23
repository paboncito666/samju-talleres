BEGIN;

GRANT UPDATE ON TABLE public.vehiculos TO authenticated;

DROP POLICY IF EXISTS "Actualizar vehiculo admin recep"
  ON public.vehiculos;
CREATE POLICY "Actualizar vehiculo admin recep"
  ON public.vehiculos
  FOR UPDATE
  TO authenticated
  USING (public.active_profile_role() IN ('admin', 'recepcionista'))
  WITH CHECK (public.active_profile_role() IN ('admin', 'recepcionista'));

COMMIT;
