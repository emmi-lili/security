# SEVIGPRO — Integración con Supabase

Esta guía cubre el flujo completo: crear el proyecto, aplicar las migraciones,
configurar las credenciales y entender los puntos sensibles de seguridad.

---

## 1. Crear el proyecto Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**.
2. Anota:
   - **Project URL** (https://`<ref>`.supabase.co)
   - **`anon` public key** (Settings → API)
3. Espera ~2 min a que termine el bootstrap inicial.

---

## 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus valores reales:

```ini
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

> Sin estas variables la app sigue funcionando **en modo demo localStorage**
> (ver `src/app/lib/supabase.ts`). No es un bug, es por diseño.

Reinicia el dev server (`Ctrl+C`, luego `npm run dev`) para que Vite lea las
nuevas variables.

---

## 3. Aplicar las migraciones

### Opción A — Supabase CLI (recomendado)

Instala la CLI una vez:

```bash
brew install supabase/tap/supabase
```

Luego desde la raíz del proyecto:

```bash
supabase login
supabase link --project-ref <your-ref>
npm run db:push
```

`db:push` aplica todo lo que esté en `supabase/migrations/` en orden.

### Opción B — SQL Editor (sin CLI)

1. Abre el dashboard de Supabase → **SQL Editor** → **New query**.
2. Pega el contenido de `supabase/migrations/0001_initial_schema.sql` y ejecuta.
3. Repite con `0002_seed_admin.sql` y `0003_passwords_and_seeds.sql`.

> Las migraciones son **idempotentes** (`create table if not exists`, `on
> conflict do nothing`, etc.). Se pueden re-ejecutar sin problema.

---

## 4. Verificar la conexión

Con la app corriendo (`npm run dev`):

1. Abre http://localhost:5173/
2. DevTools → **Console**. Si Supabase está configurado **no** debes ver
   `[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set`.
3. Login con `admin` / `admin123` (credenciales del seed).
4. Crea un lugar de prueba desde el panel. Refresca la pestaña. Si el lugar
   sigue ahí significa que la escritura llegó a Supabase ✅.

---

## 5. Storage (fotos de visitantes)

El bucket `visitor-photos` se crea automáticamente en `0001_initial_schema.sql`
con:

- Lectura pública (`select` para `anon`).
- Escritura abierta (`insert` / `update` para `anon`).

El frontend (`src/app/utils/photoUpload.ts`) sube las fotos como blobs y guarda
la URL pública en `visitors.photo_url`. Las fotos viejas en base64 que vivan
solo en localStorage **no se migran automáticamente** — se suben recién cuando
se registra un nuevo visitor.

---

## 6. Realtime

Las tablas `public.visitors` y `public.patrol_rounds` están agregadas a la
publication `supabase_realtime`. El cliente (`src/app/contexts/AppContext.tsx`)
se suscribe vía `supabase.channel(...)` y actualiza el estado local en tiempo
real.

Para verificar: abre dos pestañas con la app, registra una visita en una, la
otra debería verla aparecer sin recargar.

---

## 7. Auth — cómo funciona

**No usamos Supabase Auth.** Las contraseñas se guardan hasheadas con bcrypt
en la columna `users.password_hash`. El login pasa por la RPC `verify_user`,
que corre como `SECURITY DEFINER` para que el hash nunca salga de la DB.

Cuando creas/editas un usuario desde la UI:

1. La UI manda `addUser(user)` con el campo `password` en plaintext.
2. `AppContext` llama `api.users.upsertPassword(userId, password)` que invoca
   la RPC `set_user_password` (también `SECURITY DEFINER`).
3. La DB hashea con `crypt(password, gen_salt('bf'))` y actualiza la fila.

Si dejas el campo de contraseña vacío al editar, la contraseña existente no se
toca.

---

## 8. Seeds incluidos

Después de aplicar `0003_passwords_and_seeds.sql` tendrás:

| Usuario       | Contraseña | Rol         |
|---------------|------------|-------------|
| `admin`       | `admin123` | admin       |
| `supervisor1` | `super123` | supervisor  |
| `guard001`    | `guard123` | guard       |
| `guard002`    | `guard123` | guard       |

> **Cámbialas antes de exponer la app**. Son solo para desarrollo.

---

## 9. Hardening pendiente (producción) ⚠️

La configuración actual tiene **trade-offs deliberados** porque el frontend
ship la `anon` key y RLS es permisiva. Antes de exponer esto a usuarios reales:

1. **RLS por rol**: reescribir `*_anon_all` con políticas que dependan de
   `auth.uid()` o de un custom claim. Esto implica migrar a Supabase Auth.
2. **Supabase Auth**: reemplazar `verify_user` por `supabase.auth.signInWithPassword()`
   y guardar el `role` en `app_metadata`.
3. **Service role key**: nunca exponerla. Toda mutación sensible debe ir por
   Edge Functions con el service role del lado del servidor.
4. **Rate limiting** sobre la RPC `verify_user` para frenar fuerza bruta.
5. **Auditoría**: tabla `audit_log` con triggers en las tablas críticas.
6. **Backups**: configurar PITR (Settings → Database → Backups).

Hasta entonces, asume que **cualquiera con DevTools y la URL puede leer/escribir
todas las tablas**.

---

## 10. Cola offline

`src/app/utils/offlineQueue.ts` persiste las escrituras fallidas en
`localStorage` y las reintenta cuando vuelve `window.online`. Está cableada
desde `AppContext`:

- Cualquier `catch` de Supabase → `enqueue(op)`.
- `initOnlineListener()` se llama al montar el provider.
- Si el navegador ya está online al cargar, se intenta drenar lo pendiente.

Para depurar: en DevTools → Application → Local Storage → busca la key
`security_app_pending_writes`.

---

## 11. Resetear todo localmente

```bash
# Resetea la base remota (¡borra todo!)
supabase db reset

# Borra localStorage del navegador: en DevTools → Application → Clear storage
```
