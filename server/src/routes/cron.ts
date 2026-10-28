import { createRouter } from "../lib/router";
import { hacerBackup } from "../lib/backup";
import { logger } from "../lib/logger";

export const cronRouter = createRouter();

// Pensado para que un cron externo (cron-job.org, un workflow programado
// de GitHub Actions, o el cron del propio hosting) golpee este endpoint
// una vez por día. Protegido por CRON_SECRET en vez de requireAuth porque
// quien lo llama no es un usuario de la app.
cronRouter.post("/backup", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ error: "CRON_SECRET no está configurado en el servidor" });
  }
  if (req.query.secret !== secret && req.headers["x-cron-secret"] !== secret) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const destino = await hacerBackup();
    res.json({ ok: true, destino });
  } catch (err) {
    logger.error("Falló el backup", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Error desconocido" });
  }
});
