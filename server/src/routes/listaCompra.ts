import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { requireAuth, RequestConSesion } from "../lib/auth";
import { aCantidadBase, formatearCantidad } from "../lib/unidades";

export const listaCompraRouter = Router();
listaCompraRouter.use(requireAuth);

const itemSchema = z.object({
  recetaId: z.string(),
  // Si se omite, se usa la cantidad de porciones original de la receta
  // (factor de escala 1).
  porcionesDeseadas: z.number().int().positive().optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1),
});

// Genera la lista de compras sumando, en unidad base, los ingredientes de
// todas las recetas seleccionadas (reescalados si se pide una cantidad de
// porciones distinta a la original), y devuelve cada ítem en la unidad más
// legible para mostrar (ej. kg en vez de 2500 g).
listaCompraRouter.post("/", async (req: RequestConSesion, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const hogarId = req.sesion!.hogarId;
  const recetaIds = parsed.data.items.map((i) => i.recetaId);

  const recetas = await db.receta.findMany({
    where: { id: { in: recetaIds }, hogarId },
    include: { ingredientes: { include: { ingrediente: true } } },
  });

  if (recetas.length !== recetaIds.length) {
    return res.status(404).json({ error: "Alguna receta no existe o no es de este hogar" });
  }

  type Acumulado = { nombre: string; base: string; cantidadBase: number };
  const acumulado = new Map<string, Acumulado>();

  for (const item of parsed.data.items) {
    const receta = recetas.find((r) => r.id === item.recetaId)!;
    const factor = item.porcionesDeseadas
      ? item.porcionesDeseadas / receta.porciones
      : 1;

    for (const ri of receta.ingredientes) {
      const { base, cantidadBase } = aCantidadBase(ri.cantidad * factor, ri.unidad);
      const clave = `${ri.ingredienteId}:${base}`;
      const previo = acumulado.get(clave);
      if (previo) {
        previo.cantidadBase += cantidadBase;
      } else {
        acumulado.set(clave, {
          nombre: ri.ingrediente.nombre,
          base,
          cantidadBase,
        });
      }
    }
  }

  const items = Array.from(acumulado.values())
    .map(({ nombre, base, cantidadBase }) => ({
      nombre,
      ...formatearCantidad(cantidadBase, base),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  res.json({ items });
});
