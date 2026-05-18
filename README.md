# SEVIGPRO — Aplicación de gestión de seguridad

Sistema multi-tenant para empresas de seguridad privada (visitas, rondas con QR,
geolocalización, panel administrativo y panel de guardias).

## Stack

- **Frontend**: React 18 + TypeScript + Vite 6
- **UI**: Tailwind CSS 4 + Radix UI + shadcn/ui components
- **Backend**: Supabase (Postgres + Storage + Realtime) — opcional
- **Modo demo**: localStorage-only sin necesidad de Supabase

## Setup rápido

```bash
npm install
npm run dev
```

Eso es todo para arrancar en **modo demo**. La app corre 100% en localStorage,
con usuarios sembrados (`admin`, `supervisor1`, `guard001`, `guard002`,
cualquier contraseña).

Abre http://localhost:5173/.

## Modo conectado (Supabase)

Cuando estés listo para persistencia real, sigue [SUPABASE.md](./SUPABASE.md).
Resumen:

```bash
cp .env.local.example .env.local
# edita .env.local con tus claves
brew install supabase/tap/supabase   # solo la primera vez
supabase login
supabase link --project-ref <your-ref>
npm run db:push
```

## Estructura

```
src/
  app/
    components/    # admin/ guard/ ui/ figma/ + Login, EmptyState, etc.
    contexts/      # AppContext (estado global, híbrido local+Supabase)
    lib/           # supabase client
    routes.tsx     # react-router config
    types/         # tipos compartidos
    utils/
      api/         # capa CRUD Supabase
      offlineQueue.ts
      photoUpload.ts
      storage.ts   # capa localStorage (cache + modo demo)
supabase/
  migrations/      # SQL versionado
  config.toml      # config CLI Supabase
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Arranca el dev server de Vite en :5173 |
| `npm run build` | Genera el build de producción |
| `npm run preview` | Sirve el build localmente |
| `npm run db:push` | Aplica migraciones a Supabase remoto |
| `npm run db:reset` | Resetea la DB remota (¡destructivo!) |
| `npm run db:diff` | Genera nueva migración a partir de cambios locales |

## Credenciales demo

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | admin |
| `supervisor1` | `super123` | supervisor |
| `guard001` | `guard123` | guard |
| `guard002` | `guard123` | guard |

En modo demo (sin Supabase) cualquier contraseña funciona. En modo Supabase
deben coincidir con la DB.

## Notas de seguridad

La configuración actual usa RLS permisiva con `anon` para simplificar el demo.
**No exponer a producción sin antes leer la sección "Hardening" de
[SUPABASE.md](./SUPABASE.md#9-hardening-pendiente-producción)**.
