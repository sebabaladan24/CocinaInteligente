export type ResultadoBusqueda = {
  titulo: string;
  url: string;
  descripcion: string;
};

// Brave Search API: REST simple con API key por header, sin SDK. Tiene un
// tier gratuito (2000 consultas/mes), suficiente para uso personal/familiar.
export async function buscarRecetasEnWeb(query: string): Promise<ResultadoBusqueda[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new Error("BRAVE_API_KEY no está configurada");
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", `receta ${query}`);
  url.searchParams.set("count", "10");

  const respuesta = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!respuesta.ok) {
    throw new Error(`Brave Search respondió con error (HTTP ${respuesta.status})`);
  }

  const datos = (await respuesta.json()) as {
    web?: { results?: { title?: string; url?: string; description?: string }[] };
  };
  const resultados = datos.web?.results ?? [];

  return resultados.map((r) => ({
    titulo: String(r.title ?? ""),
    url: String(r.url ?? ""),
    descripcion: String(r.description ?? "").replace(/<\/?strong>/g, ""),
  }));
}
