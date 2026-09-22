import { Request, Response, NextFunction } from "express";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-no-usar-en-produccion"
);

export type SesionPayload = {
  sub: string; // usuarioId
  hogarId: string;
  rol: "ADMIN" | "MIEMBRO";
  nombre: string;
  email: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function crearToken(payload: SesionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verificarToken(token: string): Promise<SesionPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as unknown as SesionPayload;
}

export interface RequestConSesion extends Request {
  sesion?: SesionPayload;
}

export async function requireAuth(
  req: RequestConSesion,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    req.sesion = await verificarToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function requireAdmin(
  req: RequestConSesion,
  res: Response,
  next: NextFunction
) {
  if (req.sesion?.rol !== "ADMIN") {
    return res.status(403).json({ error: "Requiere rol admin del hogar" });
  }
  next();
}
