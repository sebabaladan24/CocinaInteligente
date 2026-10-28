import { NextFunction, Request, RequestHandler, Response, Router } from "express";

function envolver(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const resultado = handler(req, res, next) as unknown;
      if (resultado && typeof (resultado as Promise<unknown>).catch === "function") {
        (resultado as Promise<unknown>).catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}

const METODOS = ["get", "post", "put", "delete", "patch"] as const;

// Envuelve cada handler de cada ruta para que una promesa rechazada no
// atrapada (Express 4 no la reenvía solo al error handler) llegue igual
// al middleware de errores global, en vez de dejar el request colgado
// hasta el timeout.
export function createRouter(): Router {
  const router = Router();
  for (const metodo of METODOS) {
    const original = (router[metodo] as (...args: unknown[]) => Router).bind(router);
    (router as unknown as Record<string, unknown>)[metodo] = (
      path: string,
      ...handlers: RequestHandler[]
    ) => original(path, ...handlers.map(envolver));
  }
  return router;
}
