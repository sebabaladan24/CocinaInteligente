import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { recetasRouter } from "./routes/recetas";
import { listaCompraRouter } from "./routes/listaCompra";
import { sugerenciasRouter } from "./routes/sugerencias";
import { despensaRouter } from "./routes/despensa";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/recetas", recetasRouter);
app.use("/lista-compras", listaCompraRouter);
app.use("/sugerencias", sugerenciasRouter);
app.use("/despensa", despensaRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`CocinaInteligente API escuchando en http://localhost:${port}`);
});
