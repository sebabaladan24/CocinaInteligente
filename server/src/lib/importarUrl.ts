import * as cheerio from "cheerio";

export type RecetaImportada = {
  nombre: string;
  descripcion?: string;
  pasos: string;
  tiempoMin?: number;
  porciones: number;
  fotoUrl?: string;
  ingredientes: { nombre: string; cantidad: number; unidad: string }[];
};

// La mayoría de los sitios de recetas embeben datos estructurados
// schema.org/Recipe en un <script type="application/ld+json">. Es el
// formato estándar (usado para el rich snippet de Google), así que
// alcanza con parsear ese JSON en vez de scrapear HTML a mano.
export async function importarRecetaDesdeUrl(url: string): Promise<RecetaImportada> {
  const respuesta = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (CocinaInteligente recipe importer)" },
  });
  if (!respuesta.ok) {
    throw new Error(`No se pudo descargar la página (HTTP ${respuesta.status})`);
  }
  const html = await respuesta.text();
  const $ = cheerio.load(html);

  const bloquesJsonLd = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).contents().text())
    .get();

  const recetaJson = bloquesJsonLd
    .flatMap((bloque) => {
      try {
        const parseado = JSON.parse(bloque);
        return Array.isArray(parseado) ? parseado : [parseado];
      } catch {
        return [];
      }
    })
    .flatMap((nodo) => (Array.isArray(nodo?.["@graph"]) ? nodo["@graph"] : [nodo]))
    .find((nodo) => {
      const tipo = nodo?.["@type"];
      return tipo === "Recipe" || (Array.isArray(tipo) && tipo.includes("Recipe"));
    });

  if (!recetaJson) {
    throw new Error(
      "No se encontraron datos de receta (schema.org/Recipe) en esa página"
    );
  }

  return {
    nombre: String(recetaJson.name ?? "Receta sin título"),
    descripcion: recetaJson.description ? String(recetaJson.description) : undefined,
    pasos: extraerPasos(recetaJson.recipeInstructions),
    tiempoMin: parsearDuracionIso8601(recetaJson.totalTime ?? recetaJson.cookTime),
    porciones: parsearPorciones(recetaJson.recipeYield),
    fotoUrl: extraerImagen(recetaJson.image),
    ingredientes: (recetaJson.recipeIngredient ?? recetaJson.ingredients ?? []).map(
      parsearLineaIngrediente
    ),
  };
}

function extraerPasos(instrucciones: unknown): string {
  if (!instrucciones) return "";
  if (typeof instrucciones === "string") return instrucciones;
  if (Array.isArray(instrucciones)) {
    return instrucciones
      .map((paso, i) => {
        if (typeof paso === "string") return `${i + 1}. ${paso}`;
        if (paso?.["@type"] === "HowToSection" && Array.isArray(paso.itemListElement)) {
          return paso.itemListElement
            .map((sub: any) => sub.text ?? sub.name ?? "")
            .filter(Boolean)
            .map((texto: string) => `${i + 1}. ${texto}`)
            .join("\n");
        }
        return paso?.text ?? paso?.name ?? "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function parsearDuracionIso8601(duracion: unknown): number | undefined {
  if (typeof duracion !== "string") return undefined;
  const match = duracion.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  const horas = Number(match[1] ?? 0);
  const minutos = Number(match[2] ?? 0);
  const total = horas * 60 + minutos;
  return total > 0 ? total : undefined;
}

function parsearPorciones(recipeYield: unknown): number {
  if (typeof recipeYield === "number") return recipeYield;
  if (Array.isArray(recipeYield)) recipeYield = recipeYield[0];
  const match = String(recipeYield ?? "").match(/\d+/);
  return match ? Number(match[0]) : 1;
}

function extraerImagen(image: unknown): string | undefined {
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return extraerImagen(image[0]);
  if (image && typeof image === "object" && "url" in (image as any)) {
    return String((image as any).url);
  }
  return undefined;
}

// Parsea líneas de ingrediente en texto libre, ej: "200 g de harina",
// "2 tazas de leche", "1 cebolla". Best-effort: si no matchea un
// patrón con cantidad, se guarda todo como nombre con cantidad 1 "unidad".
function parsearLineaIngrediente(linea: string): {
  nombre: string;
  cantidad: number;
  unidad: string;
} {
  const texto = linea.trim();
  const match = texto.match(
    /^([\d]+(?:[.,][\d]+)?(?:\/[\d]+)?)\s*([a-zA-ZñÑáéíóúÁÉÍÓÚ]*)\s+(?:de\s+)?(.+)$/
  );
  if (match) {
    const [, cantidadTexto, unidadTexto, nombre] = match;
    return {
      cantidad: parsearFraccion(cantidadTexto),
      unidad: unidadTexto || "unidad",
      nombre: nombre.trim(),
    };
  }
  return { nombre: texto, cantidad: 1, unidad: "unidad" };
}

function parsearFraccion(texto: string): number {
  if (texto.includes("/")) {
    const [num, den] = texto.split("/").map(Number);
    return den ? num / den : num;
  }
  return Number(texto.replace(",", "."));
}
