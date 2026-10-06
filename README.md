# SAMJU Talleres

Aplicación web de uso interno para el personal del taller. Los clientes no
acceden a esta plataforma.

## Requisitos

- Node.js 20 o superior
- npm
- Proyecto Supabase para las funcionalidades que requieran acceso a datos

## Configuración local

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Configura `.env.local` con la URL y la clave pública del proyecto Supabase.
   Añade `SUPABASE_SERVICE_ROLE_KEY` solo si ejecutarás el seed; se usa
   únicamente en scripts del servidor. Nunca expongas esa clave al cliente ni
   la subas al repositorio.
3. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

Abre [http://localhost:3000](http://localhost:3000).

## Comandos

- `npm run dev`: servidor local
- `npm run lint`: ESLint
- `npm run typecheck`: comprobación TypeScript
- `npm run build`: build de producción

## Datos de demostración

Con el esquema de Supabase ya creado, configura la URL, la clave pública y
`SUPABASE_SERVICE_ROLE_KEY` en `.env.local`. La clave de servicio solo se utiliza
localmente por el seed; no la uses como variable `NEXT_PUBLIC_*`.

El seed requiere Node.js 20.6 o superior. Desde PowerShell, habilita la
confirmación explícita y ejecuta:

```powershell
$env:SEED_DEMO_CONFIRM = "YES"
npm run seed:demo
Remove-Item Env:SEED_DEMO_CONFIRM
```

El script crea tres usuarios ficticios en Supabase Auth y carga perfiles,
vehículos, órdenes en distintos estados, trabajos realizados, fotos de ejemplo,
historial de estados y notas internas. Usa IDs estables y operaciones upsert,
por lo que se puede volver a ejecutar sin borrar datos. En cada ejecución
genera contraseñas aleatorias nuevas para las cuentas demo y muestra cada una
una sola vez durante la ejecución. No lo ejecutes en producción. Los usuarios y
contraseñas son exclusivamente para desarrollo y pruebas.

## Migraciones de seguridad

Las migraciones de `supabase/migrations/` deben ejecutarse en el SQL Editor del
proyecto Supabase en orden. `20261006100000_secure_profile_policies.sql`
reemplaza las políticas de perfiles para evitar la recursión y la elevación de
rol. `20261006102000_fix_auth_profile_trigger.sql` fija el `search_path` y
califica la tabla del trigger de Auth para que la creación de usuarios también
funcione desde el servicio de autenticación.

## Arquitectura acordada

- `app/`: vistas, layouts y API Routes de Next.js (controladores HTTP)
- `lib/`: acceso compartido a servicios e integraciones
- Supabase/PostgreSQL: modelo de datos; las políticas RLS deben proteger cada
  tabla y operación en el proyecto Supabase
- Los DTO/formularios se validan con Zod tanto en el cliente como en el servidor

La Fase 0 no crea ni modifica tablas, políticas RLS ni credenciales. Genera y
mantén sincronizados los tipos de base de datos cuando el esquema acordado esté
disponible. Nunca expongas una clave `service_role` al cliente.

## Validación continua

GitHub Actions ejecuta lint y type-check en Pull Requests hacia `main`. Antes de
abrir un PR, ejecuta localmente ambos comandos.

## Seguimiento de dependencias

En la auditoría ejecutada durante la Fase 0, `npm audit` reportó 10 alertas en
dependencias (1 crítica y 9 altas), incluidas alertas de Next.js 14. La solución
automática que propone npm requiere actualizar a Next.js 16, lo cual cambia la
versión acordada para este proyecto. Se conserva Next.js 14 según el alcance
actual; vuelve a evaluar y resolver estas alertas antes de desplegar a
producción.
