import { db } from "./lib/db";
import { resolverUnidad } from "./lib/unidades";

// Catálogo global mínimo de ingredientes comunes, para que el matching de
// "sugerencias por ingrediente" funcione bien desde el primer uso sin
// depender de que cada hogar cree cada ingrediente desde cero.
const INGREDIENTES_BASE: { nombre: string; unidad: string }[] = [
  { nombre: "harina", unidad: "g" },
  { nombre: "azúcar", unidad: "g" },
  { nombre: "sal", unidad: "g" },
  { nombre: "aceite", unidad: "ml" },
  { nombre: "huevo", unidad: "unidad" },
  { nombre: "leche", unidad: "ml" },
  { nombre: "manteca", unidad: "g" },
  { nombre: "arroz", unidad: "g" },
  { nombre: "fideos", unidad: "g" },
  { nombre: "papa", unidad: "unidad" },
  { nombre: "cebolla", unidad: "unidad" },
  { nombre: "tomate", unidad: "unidad" },
  { nombre: "ajo", unidad: "diente" },
  { nombre: "pollo", unidad: "g" },
  { nombre: "carne picada", unidad: "g" },
  { nombre: "queso", unidad: "g" },
];

async function main() {
  // Prisma no permite pasar `null` en una clave compuesta @@unique como
  // filtro de upsert (aunque el campo sea nullable), así que se busca a
  // mano en vez de usar upsert.
  for (const { nombre, unidad } of INGREDIENTES_BASE) {
    const existente = await db.ingrediente.findFirst({ where: { nombre, hogarId: null } });
    if (existente) continue;

    const info = resolverUnidad(unidad);
    await db.ingrediente.create({
      data: { nombre, unidadBase: info.base, tipoUnidad: info.tipo, hogarId: null },
    });
  }
  console.log(`Sembrados ${INGREDIENTES_BASE.length} ingredientes globales.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
