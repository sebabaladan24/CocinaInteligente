import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { requireAuth, RequestConSesion } from "../lib/auth";
import { obtenerOCrearIngrediente } from "../lib/ingredientes";
import { aCantidadBase, formatearCantidad } from "../lib/unidades";

export const despensaRouter = Router();
despensaRouter.use(requireAuth);

function formatearItem(item: {
  id: string;
  cantidadObjetivo: number;
  cantidadActual: number;
  ingrediente: { id: string; nombre: string; unidadBase: string };
}) {
  return {
    id: item.id,
    ingredienteId: item.ingrediente.id,
    nombre: item.ingrediente.nombre,
    objetivo: formatearCantidad(item.cantidadObjetivo, item.ingrediente.unidadBase),
    actual: formatearCantidad(item.cantidadActual, item.ingrediente.unidadBase),
  };
}

despensaRouter.get("/", async (req: RequestConSesion, res) => {
  const items = await db.despensaItem.findMany({
    where: { hogarId: req.sesion!.hogarId },
    include: { ingrediente: true },
    orderBy: { ingrediente: { nombre: "asc" } },
  });
  res.json({ items: items.map(formatearItem) });
});

// Faltantes respecto del baseline: cuánto hay que comprar de cada
// ingrediente trackeado para llegar a la cantidadObjetivo.
despensaRouter.get("/lista-compras", async (req: RequestConSesion, res) => {
  const items = await db.despensaItem.findMany({
    where: { hogarId: req.sesion!.hogarId },
    include: { ingrediente: true },
  });

  const faltantes = items
    .filter((i) => i.cantidadObjetivo > i.cantidadActual)
    .map((i) => ({
      nombre: i.ingrediente.nombre,
      ...formatearCantidad(i.cantidadObjetivo - i.cantidadActual, i.ingrediente.unidadBase),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  res.json({ items: faltantes });
});

const upsertSchema = z
  .object({
    nombre: z.string().min(1),
    unidad: z.string().min(1),
    cantidadObjetivo: z.number().nonnegative().optional(),
    cantidadActual: z.number().nonnegative().optional(),
  })
  .refine((d) => d.cantidadObjetivo !== undefined || d.cantidadActual !== undefined, {
    message: "Hay que indicar cantidadObjetivo y/o cantidadActual",
  });

// Da de alta o actualiza un ítem de despensa (baseline y/o stock actual).
// Ambos valores se guardan en la unidad base del ingrediente, convertidos
// desde la unidad que mandó el cliente.
despensaRouter.put("/", async (req: RequestConSesion, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { nombre, unidad, cantidadObjetivo, cantidadActual } = parsed.data;
  const hogarId = req.sesion!.hogarId;

  const ingrediente = await obtenerOCrearIngrediente(nombre, unidad, hogarId);

  const data: { cantidadObjetivo?: number; cantidadActual?: number } = {};
  if (cantidadObjetivo !== undefined) {
    data.cantidadObjetivo = aCantidadBase(cantidadObjetivo, unidad).cantidadBase;
  }
  if (cantidadActual !== undefined) {
    data.cantidadActual = aCantidadBase(cantidadActual, unidad).cantidadBase;
  }

  const item = await db.despensaItem.upsert({
    where: { hogarId_ingredienteId: { hogarId, ingredienteId: ingrediente.id } },
    update: data,
    create: { hogarId, ingredienteId: ingrediente.id, ...data },
    include: { ingrediente: true },
  });

  res.json({ item: formatearItem(item) });
});

const ajustarSchema = z.object({
  ingredienteId: z.string().min(1),
  cantidad: z.number().positive(),
  unidad: z.string().min(1),
  operacion: z.enum(["sumar", "restar"]),
});

// Ajuste rápido del stock actual (ej. "compré 2kg más" o "se rompieron 3
// huevos"), sin tocar el baseline/objetivo.
despensaRouter.post("/ajustar", async (req: RequestConSesion, res) => {
  const parsed = ajustarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { ingredienteId, cantidad, unidad, operacion } = parsed.data;
  const hogarId = req.sesion!.hogarId;

  const existente = await db.despensaItem.findUnique({
    where: { hogarId_ingredienteId: { hogarId, ingredienteId } },
    include: { ingrediente: true },
  });
  if (!existente) {
    return res.status(404).json({ error: "Ese ingrediente no está en la despensa" });
  }

  const { cantidadBase } = aCantidadBase(cantidad, unidad);
  const delta = operacion === "sumar" ? cantidadBase : -cantidadBase;
  const nuevaCantidad = Math.max(0, existente.cantidadActual + delta);

  const item = await db.despensaItem.update({
    where: { id: existente.id },
    data: { cantidadActual: nuevaCantidad },
    include: { ingrediente: true },
  });

  res.json({ item: formatearItem(item) });
});

despensaRouter.delete("/:id", async (req: RequestConSesion, res) => {
  const existente = await db.despensaItem.findUnique({ where: { id: req.params.id } });
  if (!existente || existente.hogarId !== req.sesion!.hogarId) {
    return res.status(404).json({ error: "Ítem de despensa no encontrado" });
  }
  await db.despensaItem.delete({ where: { id: existente.id } });
  res.status(204).send();
});
