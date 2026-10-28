import { NextFunction, Request, Response } from "express";
import { logger } from "./logger";

export function logRequests(req: Request, res: Response, next: NextFunction) {
  const inicio = Date.now();
  res.on("finish", () => {
    logger.info("request", {
      metodo: req.method,
      ruta: req.path,
      status: res.statusCode,
      ms: Date.now() - inicio,
    });
  });
  next();
}

// Último middleware de la cadena: cualquier error que llegó hasta acá
// (vía next(err) o una promesa rechazada que atrapó createRouter) se
// loguea completo y al cliente se le devuelve un 500 genérico, sin
// filtrar detalles internos.
export function manejarErrores(err: unknown, req: Request, res: Response, next: NextFunction) {
  logger.error("Error no manejado", { metodo: req.method, ruta: req.path, err });
  if (res.headersSent) return;
  res.status(500).json({ error: "Error interno del servidor" });
}
