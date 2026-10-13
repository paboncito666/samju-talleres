# Políticas RLS y vistas del dashboard

Este documento describe las políticas y vistas del proyecto Supabase
`samju-talleres`. La definición desplegada se contrastó con `pg_policies` y
`pg_views` el 6 de octubre de 2026. Las políticas de `profiles` reflejan la
migración `20261006100000_secure_profile_policies.sql`; las restantes vienen
del SQL de configuración inicial.

## Row Level Security

RLS está habilitado en las ocho tablas públicas. Supabase evalúa RLS en cada
consulta; las comprobaciones de la interfaz no sustituyen estas políticas.
`auth.uid()` identifica al usuario autenticado y su rol funcional se lee de
`profiles.rol`.

| Tabla | Política y operación | Regla |
| --- | --- | --- |
| `profiles` | `Leer perfiles autenticado` — `SELECT` | Cualquier usuario autenticado puede consultar los perfiles. No hay lectura para `anon`. |
| `profiles` | `Editar perfil propio` — `UPDATE` | Solo puede modificar su propia fila (`id = auth.uid()`). Los permisos SQL limitan las columnas modificables a `nombre` y `avatar_url`; no puede cambiar `rol`, `activo` ni `id`. |
| `vehiculos` | `Insertar vehiculo admin recep` — `INSERT` | Solo los perfiles con rol `admin` o `recepcionista` pueden insertar vehículos. |
| `ordenes_trabajo` | `Leer ordenes autenticado` — `SELECT` | Todo usuario autenticado puede leer las órdenes. |
| `ordenes_trabajo` | `Actualizar orden asignada` — `UPDATE` | El mecánico o recepcionista asignado, o un administrador, puede actualizar la orden. |
| `ordenes_trabajo` | `Admin control total ordenes` — `ALL` | Los administradores pueden ejecutar todas las operaciones sobre órdenes. |
| `trabajos_realizados` | `Staff acceso trabajos_realizados` — `ALL` | Acceso de lectura y escritura para usuarios autenticados. |
| `fotos_vehiculo` | `Staff acceso fotos_vehiculo` — `ALL` | Acceso de lectura y escritura para usuarios autenticados. |
| `historial_estados` | `Staff lectura historial_estados` — `SELECT` | Los usuarios autenticados pueden consultar el historial; esta política no concede escritura. |
| `notas_internas` | `Staff acceso notas_internas` — `ALL` | Acceso de lectura y escritura para usuarios autenticados. |
| `repuestos_orden` | `Staff acceso repuestos_orden` — `ALL` | Acceso de lectura y escritura para usuarios autenticados. |

Las políticas originales de las tablas relacionadas están declaradas para el
rol PostgreSQL `public`, pero condicionan `USING` y `WITH CHECK` a
`auth.role() = 'authenticated'`. En la política de órdenes, la condición de
`UPDATE` limita tanto qué filas pueden modificarse como el estado de la fila
resultante.

### Diferencia con la guía inicial

La guía incluía una política para leer vehículos desde la aplicación. Al
consultar `pg_policies` en el proyecto desplegado no se encontró esa política:
solo aparece la de inserción. Por tanto, **un usuario autenticado no tiene
actualmente acceso RLS de lectura a `vehiculos`**. Las pantallas que consultan
la tabla pueden fallar aunque la guía inicial dijera lo contrario. Si el equipo
quiere habilitar esa lectura, debe añadirse una política explícita, por ejemplo:

```sql
CREATE POLICY "Leer vehiculos autenticado"
  ON public.vehiculos
  FOR SELECT
  TO authenticated
  USING (true);
```

No se añadió automáticamente porque el acceso a la lista completa de vehículos
es una decisión de autorización y conviene confirmarla con el responsable del
proyecto.

## Vistas SQL

Las dos vistas siguientes existen en `public` en Supabase y están destinadas a
los resúmenes del dashboard. Actualmente la interfaz del repositorio todavía no
consulta estas vistas.

### `v_ordenes_activas`

Una fila por orden cuyo estado no sea `ENTREGADO` ni `CANCELADO`. Combina la
orden con su vehículo y el perfil del mecánico asignado (si existe).

| Columna | Origen / significado |
| --- | --- |
| `id` | `ordenes_trabajo.id` |
| `placa`, `marca`, `modelo` | Identificación del vehículo |
| `mecanico` | `profiles.nombre`; puede ser `NULL` si no hay mecánico asignado |
| `estado` | Estado actual de la orden |
| `descripcion_trabajo` | Servicio solicitado |
| `fecha_ingreso`, `fecha_estimada_entrega` | Fechas de la orden |
| `dias_en_taller` | Días transcurridos entre `fecha_ingreso` y `now()` |

La vista omite vehículos sin una orden activa; usa `LEFT JOIN` para que la
ausencia de mecánico no oculte una orden.

```sql
CREATE OR REPLACE VIEW public.v_ordenes_activas AS
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
  EXTRACT(DAY FROM NOW() - o.fecha_ingreso) AS dias_en_taller
FROM public.ordenes_trabajo AS o
JOIN public.vehiculos AS v ON v.id = o.vehiculo_id
LEFT JOIN public.profiles AS p ON p.id = o.mecanico_id
WHERE o.estado NOT IN ('ENTREGADO', 'CANCELADO');
```

### `v_carga_mecanicos`

Una fila por mecánico activo. Resume sus órdenes relacionadas:

| Columna | Significado |
| --- | --- |
| `mecanico` | Nombre del perfil |
| `en_reparacion` | Órdenes en estado `REPARACION` |
| `total_activos` | Órdenes que no están `ENTREGADO` ni `CANCELADO` |
| `promedio_dias` | Promedio de días entre ingreso y entrega para órdenes `ENTREGADO` |

El `LEFT JOIN` conserva mecánicos activos sin órdenes; los conteos pueden ser
cero y el promedio `NULL` cuando no hay órdenes entregadas.

```sql
CREATE OR REPLACE VIEW public.v_carga_mecanicos AS
SELECT
  p.nombre AS mecanico,
  COUNT(*) FILTER (WHERE o.estado = 'REPARACION') AS en_reparacion,
  COUNT(*) FILTER (
    WHERE o.estado NOT IN ('ENTREGADO', 'CANCELADO')
  ) AS total_activos,
  ROUND(
    AVG(EXTRACT(DAY FROM o.fecha_entrega_real - o.fecha_ingreso))
      FILTER (WHERE o.estado = 'ENTREGADO'),
    1
  ) AS promedio_dias
FROM public.profiles AS p
LEFT JOIN public.ordenes_trabajo AS o ON o.mecanico_id = p.id
WHERE p.rol = 'mecanico' AND p.activo = TRUE
GROUP BY p.id, p.nombre;
```

## Consideraciones de seguridad de las vistas

Se verificó que ambas vistas tienen `security_invoker=true`, de modo que usan los
permisos y las políticas RLS del usuario que consulta. También tienen `SELECT`
concedido a `anon` y `authenticated`. Las políticas de las tablas relacionadas
condicionan el acceso a `auth.role() = 'authenticated'`, pero es preferible no
publicar estas vistas al rol anónimo. Para limitar el privilegio a personal
autenticado:

```sql
REVOKE ALL ON public.v_ordenes_activas, public.v_carga_mecanicos FROM anon;
GRANT SELECT ON public.v_ordenes_activas, public.v_carga_mecanicos
  TO authenticated;
```

Esta restricción aún no se aplicó. Además, al faltar la política de lectura de
`vehiculos`, un usuario autenticado no puede leer filas base de esa tabla; por
lo tanto, `v_ordenes_activas` no podrá devolver órdenes con la configuración
RLS actual. Resolverlo requiere aprobar y crear la política de lectura
documentada arriba, o revisar el diseño de autorización de la vista.

## Consultas de verificación

Para comparar las políticas desplegadas:

```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Para comprobar las definiciones de vistas:

```sql
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('v_ordenes_activas', 'v_carga_mecanicos')
ORDER BY viewname;
```
