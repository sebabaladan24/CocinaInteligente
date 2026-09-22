import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import {
  crearToken,
  hashPassword,
  verifyPassword,
  requireAuth,
  requireAdmin,
  RequestConSesion,
} from "../lib/auth";
import type { RolUsuario } from "../lib/tipos";

export const authRouter = Router();

const registroSchema = z.object({
  hogarNombre: z.string().min(1),
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

// Crea un Hogar nuevo junto con su primer usuario (admin).
authRouter.post("/registro", async (req, res) => {
  const parsed = registroSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { hogarNombre, nombre, email, password } = parsed.data;

  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
  }

  const hogar = await db.hogar.create({ data: { nombre: hogarNombre } });
  const usuario = await db.usuario.create({
    data: {
      hogarId: hogar.id,
      nombre,
      email,
      passwordHash: await hashPassword(password),
      rol: "ADMIN",
    },
  });

  const token = await crearToken({
    sub: usuario.id,
    hogarId: hogar.id,
    rol: usuario.rol as RolUsuario,
    nombre: usuario.nombre,
    email: usuario.email,
  });

  res.status(201).json({ token, hogar, usuario: sinPassword(usuario) });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const usuario = await db.usuario.findUnique({ where: { email } });
  if (!usuario || !(await verifyPassword(password, usuario.passwordHash))) {
    return res.status(401).json({ error: "Email o contraseña incorrectos" });
  }

  const token = await crearToken({
    sub: usuario.id,
    hogarId: usuario.hogarId,
    rol: usuario.rol as RolUsuario,
    nombre: usuario.nombre,
    email: usuario.email,
  });

  res.json({ token, usuario: sinPassword(usuario) });
});

authRouter.get("/me", requireAuth, async (req: RequestConSesion, res) => {
  const usuario = await db.usuario.findUnique({
    where: { id: req.sesion!.sub },
    include: { hogar: true },
  });
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json({ usuario: sinPassword(usuario), hogar: usuario.hogar });
});

const invitarSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

// Alta directa de un miembro del hogar por parte del admin (sin flujo de
// invitación por email todavía — se agrega si hace falta más adelante).
authRouter.post(
  "/hogar/miembros",
  requireAuth,
  requireAdmin,
  async (req: RequestConSesion, res) => {
    const parsed = invitarSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { nombre, email, password } = parsed.data;

    const existente = await db.usuario.findUnique({ where: { email } });
    if (existente) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
    }

    const usuario = await db.usuario.create({
      data: {
        hogarId: req.sesion!.hogarId,
        nombre,
        email,
        passwordHash: await hashPassword(password),
        rol: "MIEMBRO",
      },
    });

    res.status(201).json({ usuario: sinPassword(usuario) });
  }
);

authRouter.get(
  "/hogar/miembros",
  requireAuth,
  async (req: RequestConSesion, res) => {
    const miembros = await db.usuario.findMany({
      where: { hogarId: req.sesion!.hogarId },
      orderBy: { createdAt: "asc" },
    });
    res.json({ miembros: miembros.map(sinPassword) });
  }
);

function sinPassword<T extends { passwordHash: string }>(usuario: T) {
  const { passwordHash, ...resto } = usuario;
  return resto;
}
