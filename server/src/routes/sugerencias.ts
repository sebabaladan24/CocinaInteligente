import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { requireAuth, RequestConSesion } from "../lib/auth";

export const sugerenciasRouter = Router();
sugerenciasRouter.use(requireAuth);

const bodySchema = z.object({
  ingredientes: z.array(z.string().min(1)).min(1),
});

// Dado un conjunto de ingredientes disponibles, separa las recetas del
// hogar en:
//  - categoriaA: se pueden hacer solo con esos ingredientes.
//  - categoriaB: falta exactamente 1 ingrediente para completarlas
//    (se informa cuál).
sugerenciasRouter.post("/", async (req: RequestConSesion, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const hogarId = req.sesion!.hogarId;
  const nombresNormalizados = parsed.data.ingredientes.map((n) =>
    n.trim().toLowerCase()
  );

  const ingredientesDisponibles = await db.ingrediente.findMany({
    where: {
      nombre: { in: nombresNormalizados },
      OR: [{ hogarId: null }, { hogarId }],
    },
  });
  const idsDisponibles = new Set(ingredientesDisponibles.map((i) => i.id));

  const recetas = await db.receta.findMany({
    where: { hogarId },
    include: { ingredientes: { include: { ingrediente: true } } },
  });

  const categoriaA = [];
  const categoriaB = [];

  for (const receta of recetas) {
    if (receta.ingredientes.length === 0) continue;

    const faltantes = receta.ingredientes.filter(
      (ri) => !idsDisponibles.has(ri.ingredienteId)
    );

    if (faltantes.length === 0) {
      categoriaA.push(receta);
    } else if (faltantes.length === 1) {
      categoriaB.push({ receta, faltante: faltantes[0].ingrediente.nombre });
    }
  }

  res.json({ categoriaA, categoriaB });
});
