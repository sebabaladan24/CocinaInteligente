# CocinaInteligente

App de recetario familiar: recetario compartido por hogar, listas de compras
generadas por recetas (con suma real de cantidades) y sugerencias de recetas
según los ingredientes que tenés disponibles.

Monorepo con dos paquetes:

- `server/` — API backend (Node + TypeScript + Express + Prisma/SQLite).
- `app/` — app mobile (Expo / React Native), para iOS y Android.

## Alcance de esta primera entrega (Fase 1)

1. **Cuentas y hogares**: registro crea un Hogar + su primer usuario (admin);
   el admin puede dar de alta a otros miembros del hogar (`/auth/hogar/miembros`).
2. **Recetario compartido por hogar**: alta manual, import por lote en JSON
   (por ejemplo generado con ayuda de un asistente de IA) e import automático
   desde una URL de receta (lee datos estructurados `schema.org/Recipe`, el
   formato estándar que usan casi todos los sitios de cocina).
3. **Lista de compras por recetas seleccionadas**, con conversión y suma real
   de cantidades (`300 g` + `0.5 kg` → `800 g`, con reescalado a `kg`/`l`
   cuando corresponde).
4. **Sugerencias por ingredientes disponibles**: dado un conjunto de
   ingredientes que tenés, separa las recetas del hogar en "las podés hacer
   ya" (todos sus ingredientes están en lo que tenés) y "te falta 1" (a qué
   receta le falta exactamente un ingrediente, y cuál es).

Quedan para fases siguientes (ver la conversación de diseño original):
despensa persistente con descuento automático al cocinar, lista de compras
por faltantes de despensa, y un asistente conversacional sobre este mismo
motor de sugerencias.

## Cómo correrlo en desarrollo

### Backend

```bash
cd server
npm install
cp .env.example .env      # y editar JWT_SECRET
npm run db:push           # crea la base SQLite según prisma/schema.prisma
npm run db:seed           # siembra un catálogo básico de ingredientes
npm run dev                # http://localhost:3001
```

### App mobile

```bash
cd app
npm install
npm run start              # abre Expo Dev Tools / Expo Go
```

Antes de correrla, editá `app/src/api/client.ts` y reemplazá `API_URL` por la
IP de tu máquina en la red local (con Expo Go, `localhost` apunta al celular,
no a tu PC) — por ejemplo `http://192.168.0.10:3001`.

## Modelo de datos

`Hogar` → agrupa `Usuario`s (rol `ADMIN`/`MIEMBRO`), `Receta`s e
`Ingrediente`s propios. `Ingrediente` puede ser global (`hogarId` null,
catálogo común) o propio de un hogar. Cada `Receta` tiene una lista de
`RecetaIngrediente` (cantidad + unidad tal cual la usa esa receta); la
conversión de unidades para sumar en la lista de compras vive en
`server/src/lib/unidades.ts`.

El diseño ya contempla multiusuario y una futura comercialización: todo
cuelga de `Hogar` como unidad de "cuenta", no de un usuario individual.
