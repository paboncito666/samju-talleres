# SAMJU Talleres

Aplicación web para uso interno del administrador, recepción y mecánicos del
taller. Los clientes no acceden a la plataforma. La aplicación canónica está
en la raíz del repositorio y utiliza Next.js 14 App Router, React, TypeScript,
Tailwind CSS y Supabase.

## Inicio local

Requisitos: Node.js 20 o superior, npm y un proyecto Supabase.

```powershell
npm ci
Copy-Item .env.example .env.local
```

Completa en `.env.local` `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. La `SUPABASE_SERVICE_ROLE_KEY` se requiere
únicamente para el seed local; nunca la expongas al navegador ni la subas a Git.
Las credenciales OAuth de Google se configuran en el proveedor Google de
Supabase. Después:

```powershell
npm run dev
```

Visita `http://localhost:3000`.

## Comandos

| Comando | Función |
| --- | --- |
| `npm run dev` | Desarrollo local |
| `npm run lint` | ESLint |
| `npm run type-check` | Comprobación de TypeScript |
| `npm run build` | Build de producción |
| `npm run seed:demo` | Carga datos ficticios (solo desarrollo) |

## Configuración de Supabase

Aplica en orden las migraciones de `supabase/migrations/` en el SQL Editor o
mediante la herramienta de migraciones elegida por el equipo. No se aplican al
desplegar la aplicación. Lee
[docs/supabase-dashboard.md](./docs/supabase-dashboard.md) antes de actualizar
un proyecto con datos o esquema existentes.

Activa correo/contraseña y Google OAuth en Supabase Auth, configura los
orígenes/redirects locales y de producción, y habilita Realtime para las tablas
indicadas en la documentación. El bucket de fotos es privado y aplica sus
propias políticas de Storage.

## Seed de demostración

Con las migraciones aplicadas, configura en `.env.local` URL, clave pública y
`SUPABASE_SERVICE_ROLE_KEY`. Desde PowerShell, confirma explícitamente que los
datos se insertarán en un proyecto de pruebas:

```powershell
$env:SEED_DEMO_CONFIRM = "YES"
npm run seed:demo
Remove-Item Env:SEED_DEMO_CONFIRM
```

El seed es upsert con identificadores estables y crea usuarios, perfiles,
vehículos, órdenes, trabajos, fotos de muestra, historial y notas. Genera
contraseñas aleatorias que solo muestra en la ejecución. **No lo ejecutes en
producción.**

## Acceso y despliegue

El middleware verifica sesión, perfil activo y rol; las API Routes validan
entradas con Zod. RLS y triggers de PostgreSQL son la protección definitiva
para operaciones directas en Supabase.

En Vercel configura el directorio raíz del proyecto como `.` para desplegar esta
aplicación Next.js 14. La conexión del repositorio, variables de entorno y
despliegue automático de `main` deben configurarse en el panel de Vercel.
GitHub Actions ejecuta lint y type-check en Pull Requests a `main` y `develop`.
