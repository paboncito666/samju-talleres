# Esquema, seguridad y dashboard de Supabase

La definición de base de datos mantenida por el repositorio está en
`supabase/migrations/`. Debe aplicarse en un proyecto Supabase de desarrollo y
validarse contra el esquema desplegado antes de producción. Estas migraciones
no se ejecutan automáticamente al desplegar Next.js en Vercel.

## Orden de aplicación

Ejecuta los archivos en orden cronológico desde el SQL Editor de Supabase o con
la herramienta de migraciones elegida por el equipo:

1. `20261006090000_initial_schema.sql`: tablas, estados, índices, funciones,
   triggers, RLS, políticas, vistas y bucket privado para fotos.
2. `20261006100000_secure_profile_policies.sql`: limita las columnas de perfil
   que una persona puede modificar.
3. `20261006102000_fix_auth_profile_trigger.sql`: endurece la función que
   crea un perfil al registrar un usuario.
4. `20261013110000_add_order_diagnostico.sql`: agrega de forma incremental el
   diagnóstico opcional que usa el detalle y las transiciones de órdenes.
5. `20261015120000_fix_order_history_and_photo_rls.sql`: define funciones de
   autorización compatibles con el enum de roles desplegado, reemplaza las
   políticas antiguas de órdenes, retira el trigger legado que insertaba en el
   historial sin permisos, corrige el registro de estados y el acceso a fotos,
   y añade las tablas operativas a `supabase_realtime` si existe la publicación.
6. `20261016100000_google_profile_names_and_staff_roles.sql`: solicita confirmar
   el nombre de perfiles de Google y habilita la asignación de roles para cuentas
   de mecánico y recepción mediante una función restringida a administradores.
7. `20261016110000_add_profile_avatars.sql`: crea el bucket público de avatares
   con límite de tamaño/tipo y políticas que restringen carga y cambios a la
   carpeta del usuario autenticado.
8. `20261022140000_add_historical_search_index.sql`: agrega un índice para las
   consultas del historial filtradas por tipo de servicio y fecha.
9. `20261022150000_enable_vehicle_updates.sql`: concede y limita las
   actualizaciones de datos del vehículo a administradores y recepcionistas.

La primera migración es idempotente para las tablas y objetos que declara y
añade `diagnostico` si falta. Si el proyecto ya tiene un esquema distinto,
compara primero las definiciones; no ejecutes cambios de esquema a ciegas en
producción.

Si el proyecto ya tiene las tablas y políticas pero el detalle informa que
falta `ordenes_trabajo.diagnostico`, aplica únicamente la cuarta migración
desde el SQL Editor de Supabase. No es necesario volver a ejecutar la migración
inicial para resolver esa columna faltante.

## Tablas y reglas de acceso

RLS queda habilitado en las ocho tablas públicas. La función
`active_profile_role()` devuelve como texto el rol del perfil activo para no
depender de un nombre concreto del tipo enum de roles (`rol_personal` o
`rol_usuario`). `can_access_order()` centraliza el acceso por rol y asignación.

| Tabla | Lectura | Escritura |
| --- | --- | --- |
| `profiles` | Personal autenticado | Cada persona modifica su propio nombre/avatar; `nombre_confirmado` solo cambia mediante `confirm_own_profile_name()`. Los roles solo se cambian mediante `assign_staff_role()` para administradores activos, otras cuentas y los roles `mecanico`/`recepcionista`. |
| `vehiculos` | Personal con perfil activo | `admin` y `recepcionista`; pueden crear y actualizar datos básicos; placa única. |
| `ordenes_trabajo` | `admin`/`recepcionista` leen todas; `mecanico` solo sus órdenes asignadas | Recepción/admin crean; personal autorizado actualiza; trigger valida transición y exige diagnóstico para calidad/cierre. |
| `trabajos_realizados` | Personal activo | Personal autenticado puede registrar/actualizar trabajos; solo `admin` puede eliminarlos. |
| `fotos_vehiculo` | Personal activo | Solo se pueden registrar fotos asociadas a la sesión; eliminación de metadatos reservada a `admin`. |
| `historial_estados` | Personal activo | Solo lo escribe el trigger de cambio de estado. |
| `notas_internas` | Personal activo | Personal crea notas con su propio `autor_id`; el autor o `admin` puede eliminarlas. |
| `repuestos_orden` | Personal activo | Personal autenticado puede gestionar conceptos. |

Las API Routes repiten autenticación y validación Zod; RLS y triggers siguen
siendo la protección final para solicitudes directas a Supabase. Los cambios de
estado válidos son:

`RECIBIDO → DIAGNOSTICO → PENDIENTE → REPARACION → CALIDAD → LISTO → ENTREGADO`

`CANCELADO` solo se permite desde `PENDIENTE` o `CALIDAD`. La base de datos
rechaza otras transiciones, cancelaciones sin motivo y pasos a control de
calidad o cierre sin diagnóstico.

## Fotos privadas y Realtime

La migración crea el bucket privado `fotos-vehiculos`, limita las imágenes a
JPG/PNG/WebP de hasta 5 MB y autoriza el acceso según la orden y el perfil. La
aplicación conserva la ruta del objeto, no una URL pública; las vistas generan
URL firmadas temporales para mostrarla.

Para que las actualizaciones en vivo funcionen, habilita en Supabase Realtime
la publicación de `ordenes_trabajo`, `historial_estados` y `fotos_vehiculo`.
La migración correctiva intenta añadirlas a `supabase_realtime` cuando esa
publicación existe. Verifica el estado en el panel del proyecto después de
aplicar el SQL.

## Vistas SQL

Las vistas son `security_invoker`, siguen los permisos/RLS del usuario y no
están disponibles para `anon`.

### `v_ordenes_activas`

Una fila por orden no entregada ni cancelada, con placa, marca, modelo,
mecánico, estado, fechas y días en el taller.

### `v_carga_mecanicos`

Una fila por mecánico activo con órdenes en reparación, órdenes activas y
promedio de días entre ingreso y entrega. El dashboard actual calcula sus
gráficas a partir de órdenes visibles para la sesión para respetar el alcance
de lectura de cada rol.

## Perfiles de Google y roles

Al autenticar una cuenta Google sin un nombre confirmado, el usuario entra al
dashboard y ve una tarjeta para actualizarlo. Las cuentas Google existentes
quedan pendientes de confirmación al aplicar la sexta migración. El nombre
también se puede actualizar desde los ajustes de cuenta.

La sección **Personal** solo está disponible para administradores. La función
`confirm_own_profile_name(new_name)` permite a cada cuenta confirmar su propio
nombre pendiente. `assign_staff_role(target_profile_id, new_role)` vuelve a
comprobar el rol activo del administrador en PostgreSQL, impide modificar el
propio perfil o perfiles administradores y solo acepta `mecanico` y
`recepcionista`. La función adapta el rol al tipo enum usado por la columna en
el esquema desplegado. No se concede permiso directo para actualizar las
columnas de confirmación ni de rol.

Las invitaciones marcan la cuenta con `force_password_setup`. Al aceptar el
enlace, la persona debe elegir y confirmar una contraseña antes de acceder a
otras páginas protegidas. El callback también valida que el rol tenga permiso
para la ruta de retorno; si no lo tiene, la sesión abre el dashboard.

## Cuenta y preferencias

El menú de usuario ofrece acceso a los ajustes de cuenta y guarda tema claro/
oscuro y tamaño de texto en el almacenamiento local del navegador. La sección
`/ajustes/cuenta` permite cambiar nombre, foto, contraseña y correo. Las fotos se
almacenan en el bucket público `avatars`, bajo una ruta cuyo primer segmento es
el UUID del usuario; solo ese usuario puede cargar o sobrescribir su imagen.
Los cambios de correo dependen de la confirmación configurada en Supabase Auth.

## Verificación en Supabase

```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

```sql
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('v_ordenes_activas', 'v_carga_mecanicos')
ORDER BY viewname;
```
