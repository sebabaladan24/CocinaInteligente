import { db } from "./db";
import { resolverUnidad } from "./unidades";

// Busca un ingrediente por nombre, priorizando el catálogo global
// (hogarId null) y cayendo a uno propio del hogar; si no existe ninguno,
// lo crea como ingrediente propio de ese hogar.
export async function obtenerOCrearIngrediente(
  nombreCrudo: string,
  unidad: string,
  hogarId: string
) {
  const nombre = nombreCrudo.trim().toLowerCase();

  const global = await db.ingrediente.findFirst({ where: { nombre, hogarId: null } });
  if (global) return global;

  const propio = await db.ingrediente.findFirst({ where: { nombre, hogarId } });
  if (propio) return propio;

  const info = resolverUnidad(unidad);
  return db.ingrediente.create({
    data: { nombre, unidadBase: info.base, tipoUnidad: info.tipo, hogarId },
  });
}
