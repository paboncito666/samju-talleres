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

2. Copia `.env.example` a `.env.local` y completa las credenciales del proyecto
   Supabase.
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
