BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nombre_confirmado boolean NOT NULL DEFAULT true;

UPDATE public.profiles AS profile
SET nombre_confirmado = false
FROM auth.users AS auth_user
WHERE auth_user.id = profile.id
  AND (
    auth_user.raw_app_meta_data->>'provider' = 'google'
    OR COALESCE(auth_user.raw_app_meta_data->'providers' ? 'google', false)
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_google boolean := COALESCE(
    NEW.raw_app_meta_data->>'provider' = 'google',
    false
  );
BEGIN
  INSERT INTO public.profiles (id, nombre, rol, nombre_confirmado)
  VALUES (
    NEW.id,
    CASE
      WHEN is_google THEN 'Pendiente de completar'
      ELSE COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        'Usuario'
      )
    END,
    'mecanico',
    NOT is_google
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (
  id,
  nombre,
  rol,
  activo,
  avatar_url,
  nombre_confirmado,
  creado_en,
  actualizado_en
) ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (nombre, avatar_url)
  ON TABLE public.profiles
  TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_own_profile_name(new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión autenticada.'
      USING ERRCODE = '42501';
  END IF;

  IF new_name IS NULL OR char_length(btrim(new_name)) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'El nombre debe tener entre 2 y 80 caracteres.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET nombre = btrim(new_name), nombre_confirmado = true
  WHERE id = actor_id
    AND nombre_confirmado = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay un perfil pendiente de confirmar.'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_own_profile_name(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_own_profile_name(text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_staff_role(
  target_profile_id uuid,
  new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  role_type text;
  updated_count integer;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles AS actor
    WHERE actor.id = actor_id
      AND actor.rol = 'admin'
      AND actor.activo = true
  ) THEN
    RAISE EXCEPTION 'Se requiere un perfil de administrador activo.'
      USING ERRCODE = '42501';
  END IF;

  IF target_profile_id = actor_id THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol.'
      USING ERRCODE = '42501';
  END IF;

  IF new_role NOT IN ('mecanico', 'recepcionista') THEN
    RAISE EXCEPTION 'El rol seleccionado no se puede asignar desde esta función.'
      USING ERRCODE = '22023';
  END IF;

  SELECT format('%I.%I', namespace.nspname, role_enum.typname)
  INTO role_type
  FROM pg_attribute AS profile_column
  JOIN pg_type AS role_enum ON role_enum.oid = profile_column.atttypid
  JOIN pg_namespace AS namespace ON namespace.oid = role_enum.typnamespace
  WHERE profile_column.attrelid = 'public.profiles'::regclass
    AND profile_column.attname = 'rol'
    AND NOT profile_column.attisdropped;

  IF role_type IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar el tipo del rol del perfil.'
      USING ERRCODE = '42804';
  END IF;

  EXECUTE format(
    'UPDATE public.profiles SET rol = $1::%s WHERE id = $2 AND rol::text <> ''admin''',
    role_type
  )
  USING new_role, target_profile_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count = 0 THEN
    RAISE EXCEPTION 'No se encontró una cuenta modificable.'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_staff_role(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_staff_role(uuid, text)
  TO authenticated;

COMMIT;
