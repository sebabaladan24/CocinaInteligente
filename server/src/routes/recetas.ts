import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { requireAuth, RequestConSesion } from "../lib/auth";
import { obtenerOCrearIngrediente } from "../lib/ingredientes";
import { importarRecetaDesdeUrl } from "../lib/importarUrl";
import { aCantidadBase } from "../lib/unidades";
import type { OrigenReceta } from "../lib/tipos";

export const recetasRouter = Router();
recetasRouter.use(requireAuth);

const ingredienteInputSchema = z.object({
  nombre: z.string().min(1),
  cantidad: z.number().positive(),
  unidad: z.string().min(1),
});

const recetaInputSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  pasos: z.string().default(""),
  tiempoMin: z.number().int().positive().optional(),
  porciones: z.number().int().positive().default(1),
  fotoUrl: z.string().optional(),
  ingredientes: z.array(ingredienteInputSchema).default([]),
});

async function crearRecetaConIngredientes(
  hogarId: string,
  datos: z.infer<typeof recetaInputSchema>,
  origen: OrigenReceta,
  urlOrigen?: string
) {
  const receta = await db.receta.create({
    data: {
      hogarId,
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      pasos: datos.pasos,
      tiempoMin: datos.tiempoMin,
      porciones: datos.porciones,
      fotoUrl: datos.fotoUrl,
      origen,
      urlOrigen,
    },
  });

  for (const ing of datos.ingredientes) {
    const ingrediente = await obtenerOCrearIngrediente(ing.nombre, ing.unidad, hogarId);
    await db.recetaIngrediente.create({
      data: {
        recetaId: receta.id,
        ingredienteId: ingrediente.id,
        cantidad: ing.cantidad,
        unidad: ing.unidad,
      },
    });
  }

  return db.receta.findUniqueOrThrow({
    where: { id: receta.id },
    include: { ingredientes: { include: { ingrediente: true } } },
  });
}

async function requireRecetaDelHogar(recetaId: string, hogarId: string) {
  const receta = await db.receta.findUnique({ where: { id: recetaId } });
  if (!receta || receta.hogarId !== hogarId) return null;
  return receta;
}

recetasRouter.get("/", async (req: RequestConSesion, res) => {
  const recetas = await db.receta.findMany({
    where: { hogarId: req.sesion!.hogarId },
    include: { ingredientes: { include: { ingrediente: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ recetas });
});

recetasRouter.get("/:id", async (req: RequestConSesion, res) => {
  const receta = await requireRecetaDelHogar(req.params.id, req.sesion!.hogarId);
  if (!receta) return res.status(404).json({ error: "Receta no encontrada" });

  const completa = await db.receta.findUnique({
    where: { id: receta.id },
    include: { ingredientes: { include: { ingrediente: true } } },
  });
  res.json({ receta: completa });
});

recetasRouter.post("/", async (req: RequestConSesion, res) => {
  const parsed = recetaInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const receta = await crearRecetaConIngredientes(
    req.sesion!.hogarId,
    parsed.data,
    "MANUAL"
  );
  res.status(201).json({ receta });
});

recetasRouter.put("/:id", async (req: RequestConSesion, res) => {
  const existente = await requireRecetaDelHogar(req.params.id, req.sesion!.hogarId);
  if (!existente) return res.status(404).json({ error: "Receta no encontrada" });

  const parsed = recetaInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const datos = parsed.data;

  await db.receta.update({
    where: { id: existente.id },
    data: {
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      pasos: datos.pasos,
      tiempoMin: datos.tiempoMin,
      porciones: datos.porciones,
      fotoUrl: datos.fotoUrl,
    },
  });

  // Reemplazo completo de la lista de ingredientes (más simple y suficiente
  // para el volumen de una app de uso familiar).
  await db.recetaIngrediente.deleteMany({ where: { recetaId: existente.id } });
  for (const ing of datos.ingredientes) {
    const ingrediente = await obtenerOCrearIngrediente(
      ing.nombre,
      ing.unidad,
      req.sesion!.hogarId
    );
    await db.recetaIngrediente.create({
      data: {
        recetaId: existente.id,
        ingredienteId: ingrediente.id,
        cantidad: ing.cantidad,
        unidad: ing.unidad,
      },
    });
  }

  const receta = await db.receta.findUnique({
    where: { id: existente.id },
    include: { ingredientes: { include: { ingrediente: true } } },
  });
  res.json({ receta });
});

recetasRouter.delete("/:id", async (req: RequestConSesion, res) => {
  const existente = await requireRecetaDelHogar(req.params.id, req.sesion!.hogarId);
  if (!existente) return res.status(404).json({ error: "Receta no encontrada" });

  await db.receta.delete({ where: { id: existente.id } });
  res.status(204).send();
});

const cocinarSchema = z.object({
  porcionesDeseadas: z.number().int().positive().optional(),
});

// Marca una receta como cocinada: descuenta de la despensa (si el hogar
// trackea ese ingrediente puntual) la cantidad usada. Es opcional por
// diseño — un ingrediente que el hogar no cargó en su despensa simplemente
// se ignora, no se crea de la nada.
recetasRouter.post("/:id/cocinar", async (req: RequestConSesion, res) => {
  const receta = await requireRecetaDelHogar(req.params.id, req.sesion!.hogarId);
  if (!receta) return res.status(404).json({ error: "Receta no encontrada" });

  const parsed = cocinarSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const hogarId = req.sesion!.hogarId;
  const factor = parsed.data.porcionesDeseadas
    ? parsed.data.porcionesDeseadas / receta.porciones
    : 1;

  const completa = await db.receta.findUniqueOrThrow({
    where: { id: receta.id },
    include: { ingredientes: { include: { ingrediente: true } } },
  });

  const resultado = [];
  for (const ri of completa.ingredientes) {
    const despensaItem = await db.despensaItem.findUnique({
      where: { hogarId_ingredienteId: { hogarId, ingredienteId: ri.ingredienteId } },
    });

    if (!despensaItem) {
      resultado.push({ nombre: ri.ingrediente.nombre, descontado: false });
      continue;
    }

    const { cantidadBase } = aCantidadBase(ri.cantidad * factor, ri.unidad);
    const nuevaCantidad = Math.max(0, despensaItem.cantidadActual - cantidadBase);
    await db.despensaItem.update({
      where: { id: despensaItem.id },
      data: { cantidadActual: nuevaCantidad },
    });
    resultado.push({ nombre: ri.ingrediente.nombre, descontado: true });
  }

  res.json({ ingredientes: resultado });
});

const importarSchema = z.object({
  recetas: z.array(recetaInputSchema).min(1),
});

// Import por lote: pensado para pegar un JSON armado externamente
// (por ejemplo, generado con ayuda de un LLM) con varias recetas juntas.
recetasRouter.post("/importar", async (req: RequestConSesion, res) => {
  const parsed = importarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const creadas = [];
  for (const datos of parsed.data.recetas) {
    creadas.push(
      await crearRecetaConIngredientes(req.sesion!.hogarId, datos, "IMPORTADA_JSON")
    );
  }
  res.status(201).json({ recetas: creadas });
});

const importarUrlSchema = z.object({ url: z.string().url() });

recetasRouter.post("/importar-url", async (req: RequestConSesion, res) => {
  const parsed = importarUrlSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const datos = await importarRecetaDesdeUrl(parsed.data.url);
    const receta = await crearRecetaConIngredientes(
      req.sesion!.hogarId,
      { ...datos, ingredientes: datos.ingredientes },
      "IMPORTADA_URL",
      parsed.data.url
    );
    res.status(201).json({ receta });
  } catch (err) {
    res.status(422).json({
      error: err instanceof Error ? err.message : "No se pudo importar la receta",
    });
  }
});
