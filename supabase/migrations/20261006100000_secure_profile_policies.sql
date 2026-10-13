BEGIN;

DROP POLICY IF EXISTS "Ver perfil propio o admin" ON public.profiles;
DROP POLICY IF EXISTS "Editar perfil propio" ON public.profiles;

CREATE POLICY "Leer perfiles autenticado"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (
  id,
  nombre,
  rol,
  activo,
  avatar_url,
  creado_en,
  actualizado_en
) ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

GRANT UPDATE (nombre, avatar_url)
  ON TABLE public.profiles
  TO authenticated;

CREATE POLICY "Editar perfil propio"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

COMMIT;
