import { db } from "./db";

// Arma el contexto que el asistente necesita para sugerir recetas: el
// recetario del hogar (nombre + ingredientes, sin pasos para no inflar el
// prompt) y el estado actual de su despensa, si la usan.
export async function construirContextoHogar(hogarId: string, hogarNombre: string) {
  const [recetas, despensa] = await Promise.all([
    db.receta.findMany({
      where: { hogarId },
      include: { ingredientes: { include: { ingrediente: true } } },
      orderBy: { nombre: "asc" },
    }),
    db.despensaItem.findMany({
      where: { hogarId },
      include: { ingrediente: true },
    }),
  ]);

  const lineasRecetas = recetas.length
    ? recetas
        .map((r) => {
          const ingredientes = r.ingredientes.map((ri) => ri.ingrediente.nombre).join(", ");
          const meta = [`${r.porciones} porciones`, r.tiempoMin ? `${r.tiempoMin} min` : null]
            .filter(Boolean)
            .join(", ");
          return `- ${r.nombre} (${ingredientes}) — ${meta}`;
        })
        .join("\n")
    : "(El hogar todavía no cargó ninguna receta.)";

  const lineasDespensa = despensa.length
    ? despensa
        .map((d) => `- ${d.ingrediente.nombre}: tienen ${d.cantidadActual} ${d.ingrediente.unidadBase}`)
        .join("\n")
    : "(El hogar no trackea despensa todavía.)";

  return `Sos el asistente de cocina de la familia "${hogarNombre}" en la app CocinaInteligente. Tu trabajo es ayudarlos a decidir qué cocinar: sugerí recetas de SU RECETARIO cuando encajen con lo que piden o con lo que tienen en la despensa, o hacé preguntas cortas para acotar la elección (qué tienen ganas de comer, cuánto tiempo tienen, con qué ingredientes). Si ninguna receta del recetario encaja bien, podés proponer una idea nueva, pero aclarando explícitamente que no está guardada en su recetario.

Recetario disponible:
${lineasRecetas}

Despensa actual (lo que tienen ahora en casa):
${lineasDespensa}

Respondé siempre en español, de forma breve y conversacional (no uses markdown pesado, esto se muestra en un chat de celular).`;
}
