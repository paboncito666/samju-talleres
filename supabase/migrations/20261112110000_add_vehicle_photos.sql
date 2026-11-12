BEGIN;

ALTER TABLE public.vehiculos
  ADD COLUMN IF NOT EXISTS foto_url text;

DROP POLICY IF EXISTS "Personal elimina fotos de orden" ON storage.objects;
CREATE POLICY "Personal elimina fotos de orden"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fotos-vehiculos'
    AND COALESCE((storage.foldername(name))[1], '') <> 'vehiculos'
    AND (
      public.active_profile_role() = 'admin'
      OR owner_id = (SELECT auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Personal lee fotos de vehiculo" ON storage.objects;
CREATE POLICY "Personal lee fotos de vehiculo"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fotos-vehiculos'
    AND (storage.foldername(name))[1] = 'vehiculos'
    AND public.active_profile_role() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.vehiculos AS v
      WHERE v.id::text = (storage.foldername(name))[2]
    )
  );

DROP POLICY IF EXISTS "Personal sube fotos de vehiculo" ON storage.objects;
CREATE POLICY "Personal sube fotos de vehiculo"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-vehiculos'
    AND (storage.foldername(name))[1] = 'vehiculos'
    AND public.active_profile_role() IN ('admin', 'recepcionista')
    AND EXISTS (
      SELECT 1
      FROM public.vehiculos AS v
      WHERE v.id::text = (storage.foldername(name))[2]
    )
  );

DROP POLICY IF EXISTS "Personal elimina fotos de vehiculo" ON storage.objects;
CREATE POLICY "Personal elimina fotos de vehiculo"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fotos-vehiculos'
    AND (storage.foldername(name))[1] = 'vehiculos'
    AND public.active_profile_role() IN ('admin', 'recepcionista')
    AND EXISTS (
      SELECT 1
      FROM public.vehiculos AS v
      WHERE v.id::text = (storage.foldername(name))[2]
    )
  );

COMMIT;
