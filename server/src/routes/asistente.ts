import { Router } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../lib/db";
import { requireAuth, RequestConSesion } from "../lib/auth";
import { obtenerClienteClaude, obtenerModeloClaude } from "../lib/claude";
import { construirContextoHogar } from "../lib/contextoHogar";

export const asistenteRouter = Router();
asistenteRouter.use(requireAuth);

const mensajeSchema = z.object({
  rol: z.enum(["user", "assistant"]),
  contenido: z.string().min(1),
});

const bodySchema = z.object({
  mensaje: z.string().min(1),
  // Historial de la conversación hasta ahora (sin incluir el mensaje nuevo);
  // la API de Claude es stateless, así que el cliente reenvía todo cada vez.
  historial: z.array(mensajeSchema).max(30).default([]),
});

asistenteRouter.post("/chat", async (req: RequestConSesion, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  let client;
  try {
    client = obtenerClienteClaude();
  } catch {
    return res.status(503).json({
      error: "El asistente conversacional no está configurado (falta ANTHROPIC_API_KEY).",
    });
  }

  const hogar = await db.hogar.findUniqueOrThrow({ where: { id: req.sesion!.hogarId } });
  const system = await construirContextoHogar(hogar.id, hogar.nombre);

  const messages: Anthropic.MessageParam[] = [
    ...parsed.data.historial.map((m) => ({ role: m.rol, content: m.contenido })),
    { role: "user" as const, content: parsed.data.mensaje },
  ];

  try {
    const respuesta = await client.messages.create({
      model: obtenerModeloClaude(),
      max_tokens: 1024,
      system,
      messages,
    });

    const texto = respuesta.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    res.json({ respuesta: texto });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(503).json({ error: "La API key de Claude configurada es inválida." });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Demasiadas consultas al asistente, probá de nuevo en un rato." });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Error del asistente: ${err.message}` });
    }
    throw err;
  }
});
