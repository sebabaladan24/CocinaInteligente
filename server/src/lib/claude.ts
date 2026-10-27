import Anthropic from "@anthropic-ai/sdk";

const MODEL_POR_DEFECTO = "claude-opus-5-5";

export function obtenerModeloClaude() {
  return process.env.CLAUDE_MODEL || MODEL_POR_DEFECTO;
}

let cliente: Anthropic | null = null;

// Instancia perezosa: si no hay ANTHROPIC_API_KEY configurada, tirar un
// error claro en vez de que el SDK falle con uno genérico o intente
// resolver credenciales de otro lado (perfiles de `ant auth login`, que no
// aplican a un server desplegado).
export function obtenerClienteClaude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY no está configurada");
  }
  if (!cliente) {
    cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cliente;
}
