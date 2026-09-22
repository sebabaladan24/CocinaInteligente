export type TipoUnidad = "MASA" | "VOLUMEN" | "UNIDAD";

type UnidadInfo = { tipo: TipoUnidad; base: string; factor: number };

// Factor = cuántas unidades base equivalen a 1 de esta unidad.
// Base de MASA: gramos. Base de VOLUMEN: mililitros. Base de UNIDAD: "unidad".
const TABLA_UNIDADES: Record<string, UnidadInfo> = {
  g: { tipo: "MASA", base: "g", factor: 1 },
  gr: { tipo: "MASA", base: "g", factor: 1 },
  gramo: { tipo: "MASA", base: "g", factor: 1 },
  gramos: { tipo: "MASA", base: "g", factor: 1 },
  kg: { tipo: "MASA", base: "g", factor: 1000 },
  kilo: { tipo: "MASA", base: "g", factor: 1000 },
  kilos: { tipo: "MASA", base: "g", factor: 1000 },
  kilogramo: { tipo: "MASA", base: "g", factor: 1000 },
  kilogramos: { tipo: "MASA", base: "g", factor: 1000 },
  mg: { tipo: "MASA", base: "g", factor: 0.001 },

  ml: { tipo: "VOLUMEN", base: "ml", factor: 1 },
  mililitro: { tipo: "VOLUMEN", base: "ml", factor: 1 },
  mililitros: { tipo: "VOLUMEN", base: "ml", factor: 1 },
  l: { tipo: "VOLUMEN", base: "ml", factor: 1000 },
  lt: { tipo: "VOLUMEN", base: "ml", factor: 1000 },
  litro: { tipo: "VOLUMEN", base: "ml", factor: 1000 },
  litros: { tipo: "VOLUMEN", base: "ml", factor: 1000 },
  taza: { tipo: "VOLUMEN", base: "ml", factor: 240 },
  tazas: { tipo: "VOLUMEN", base: "ml", factor: 240 },
  cda: { tipo: "VOLUMEN", base: "ml", factor: 15 },
  cdas: { tipo: "VOLUMEN", base: "ml", factor: 15 },
  cucharada: { tipo: "VOLUMEN", base: "ml", factor: 15 },
  cucharadas: { tipo: "VOLUMEN", base: "ml", factor: 15 },
  cdta: { tipo: "VOLUMEN", base: "ml", factor: 5 },
  cdtas: { tipo: "VOLUMEN", base: "ml", factor: 5 },
  cucharadita: { tipo: "VOLUMEN", base: "ml", factor: 5 },
  cucharaditas: { tipo: "VOLUMEN", base: "ml", factor: 5 },

  unidad: { tipo: "UNIDAD", base: "unidad", factor: 1 },
  unidades: { tipo: "UNIDAD", base: "unidad", factor: 1 },
  u: { tipo: "UNIDAD", base: "unidad", factor: 1 },
  diente: { tipo: "UNIDAD", base: "unidad", factor: 1 },
  dientes: { tipo: "UNIDAD", base: "unidad", factor: 1 },
  pizca: { tipo: "UNIDAD", base: "unidad", factor: 1 },
  pizcas: { tipo: "UNIDAD", base: "unidad", factor: 1 },
};

function normalizar(unidad: string) {
  return unidad
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Unidades que no están en la tabla se tratan como su propia "unidad base":
// no se pueden sumar/convertir contra otras, pero sí entre sí (mismo texto).
export function resolverUnidad(unidad: string): UnidadInfo {
  const clave = normalizar(unidad);
  return TABLA_UNIDADES[clave] ?? { tipo: "UNIDAD", base: clave, factor: 1 };
}

export function aCantidadBase(cantidad: number, unidad: string) {
  const info = resolverUnidad(unidad);
  return { tipo: info.tipo, base: info.base, cantidadBase: cantidad * info.factor };
}

function redondear(n: number) {
  return Math.round(n * 100) / 100;
}

// Convierte una cantidad ya expresada en unidad base a la unidad "linda"
// para mostrar en la lista de compras (kg en vez de 1500g, por ejemplo).
export function formatearCantidad(cantidadBase: number, base: string) {
  if (base === "g" && cantidadBase >= 1000) {
    return { cantidad: redondear(cantidadBase / 1000), unidad: "kg" };
  }
  if (base === "ml" && cantidadBase >= 1000) {
    return { cantidad: redondear(cantidadBase / 1000), unidad: "l" };
  }
  return { cantidad: redondear(cantidadBase), unidad: base };
}
