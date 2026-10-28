import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { recetasRouter } from "./routes/recetas";
import { listaCompraRouter } from "./routes/listaCompra";
import { sugerenciasRouter } from "./routes/sugerencias";
import { despensaRouter } from "./routes/despensa";
import { asistenteRouter } from "./routes/asistente";
import { cronRouter } from "./routes/cron";
import { logRequests, manejarErrores } from "./lib/middlewares";
import { logger } from "./lib/logger";

const app = express();

app.use(cors());
app.use(express.json());
app.use(logRequests);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/recetas", recetasRouter);
app.use("/lista-compras", listaCompraRouter);
app.use("/sugerencias", sugerenciasRouter);
app.use("/despensa", despensaRouter);
app.use("/asistente", asistenteRouter);
app.use("/cron", cronRouter);

// Tiene que ir después de todas las rutas: es el que atrapa cualquier
// error no manejado (incluido el de una promesa rechazada, gracias a
// createRouter) en vez de dejar el request colgado o tirar el detalle
// interno al cliente.
app.use(manejarErrores);

process.on("unhandledRejection", (err) => logger.error("unhandledRejection", err));
process.on("uncaughtException", (err) => logger.error("uncaughtException", err));

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  logger.info(`CocinaInteligente API escuchando en http://localhost:${port}`);
});
