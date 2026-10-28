# Desplegar el backend (Railway)

Esto es un paso a paso para desplegar `server/` en Railway. La parte de
crear la cuenta y conectar el repo la tenés que hacer vos desde el
navegador (requiere tu login de GitHub y tu método de pago para el plan);
acá te dejamos ya resuelto todo lo que se puede dejar resuelto desde el
código.

## 1. Crear el servicio

1. Entrá a [railway.app](https://railway.app) y creá un proyecto nuevo.
2. **Deploy from GitHub repo** → elegí `sebabaladan24/CocinaInteligente`.
3. En la configuración del servicio, **Root Directory** → `server`.
   (El repo es un monorepo con `/app` y `/server`; Railway solo tiene que
   mirar `/server`.)
4. Railway detecta Node automáticamente (Nixpacks): ve que hay un script
   `build` en `package.json` y lo corre antes de `start`. No hace falta
   ningún archivo de configuración extra.

## 2. Agregar un volumen persistente

Sin esto, la base SQLite se borra en cada deploy.

1. En el servicio → **Volumes** → **New Volume**.
2. Mount path: `/data`.
3. Esto hace que todo lo que escribas en `/data` sobreviva entre deploys.

## 3. Variables de entorno

En el servicio → **Variables**, cargar:

| Variable | Valor | Obligatoria |
|---|---|---|
| `DATABASE_URL` | `file:/data/dev.db` | sí — apunta al volumen, no al path relativo de dev |
| `JWT_SECRET` | un secreto largo y random (ver abajo) | sí |
| `PORT` | Railway la setea sola, no hace falta tocarla | — |
| `ANTHROPIC_API_KEY` | tu key de console.anthropic.com | opcional (sin ella, el asistente responde 503) |
| `CLAUDE_MODEL` | `claude-opus-5-5` | opcional, ese es el default |
| `BRAVE_API_KEY` | tu key de api-dashboard.search.brave.com | opcional (sin ella, buscar-web responde 503) |
| `RESEND_API_KEY` | tu key de resend.com | opcional (sin ella, recuperar contraseña responde 503 y la invitación de miembros muestra el código en vez de mandarlo) |
| `MAIL_FROM` | `CocinaInteligente <onboarding@resend.dev>` | opcional, ese es el default |
| `CRON_SECRET` | un secreto random (ver abajo) | opcional pero recomendado, para que `/cron/backup` funcione |
| `BACKUP_EMAIL` | tu email, si querés backups por mail además de locales | opcional |

Para generar `JWT_SECRET` y `CRON_SECRET` (dos valores random
independientes, no hace falta que signifiquen nada), corré esto en tu
máquina y pegá cada resultado en Railway — nunca los dejes escritos en un
archivo que se commitee:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Primer deploy

Al hacer deploy, Railway corre:

```
npm install        # instala deps + prisma generate (postinstall)
npm run build       # tsc
npm start            # prisma db push (crea el schema en el volumen) + node dist/index.js
```

Confirmá que levantó pegando `https://<tu-app>.up.railway.app/health` en
el navegador — debería responder `{"ok":true}`.

Railway te da un dominio `*.up.railway.app` con HTTPS incluido de
entrada; no hace falta comprar un dominio propio para arrancar.

## 5. Conectar la app mobile

En `app/.env` (no se commitea, ver `app/.env.example`):

```
EXPO_PUBLIC_API_URL="https://<tu-app>.up.railway.app"
```

## 6. Backup automático diario (opcional)

Ya existe `.github/workflows/backup.yml` en el repo: un workflow de
GitHub Actions que llama a `POST /cron/backup` todos los días a las 06:00
UTC. Para activarlo, en el repo de GitHub → **Settings → Secrets and
variables → Actions** → agregar:

- `BACKEND_URL` = `https://<tu-app>.up.railway.app`
- `CRON_SECRET` = el mismo valor que pusiste en Railway

Sin estos dos secrets cargados, el workflow corre pero falla (no hace
nada destructivo, solo no logra autenticarse).

## Lo que queda fuera de este documento

- Publicar la app en App Store / Google Play (necesita cuentas de
  desarrollador propias — ver el punto 2 de la lista de pendientes).
- Rate limiting, monitoreo con alertas (Sentry u otro) — quedan para más
  adelante si hace falta.
