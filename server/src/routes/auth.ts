import { createRouter } from "../lib/router";
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
import { emailConfigurado, enviarEmail } from "../lib/email";
import { crearTokenRecuperacion, validarYConsumirToken } from "../lib/tokens";
import crypto from "node:crypto";

export const authRouter = createRouter();

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

const recuperarSolicitarSchema = z.object({ email: z.string().email() });

// Nunca revela si el email existe o no en el cuerpo de la respuesta: tanto
// si hay cuenta como si no, se responde el mismo mensaje genérico. Solo la
// falta de RESEND_API_KEY (un problema de configuración, no del usuario
// puntual) se informa distinto.
authRouter.post("/recuperar/solicitar", async (req, res) => {
  const parsed = recuperarSolicitarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!emailConfigurado()) {
    return res.status(503).json({
      error: "La recuperación de contraseña por email no está configurada en el servidor.",
    });
  }

  const usuario = await db.usuario.findUnique({ where: { email: parsed.data.email } });
  if (usuario) {
    const codigo = await crearTokenRecuperacion(usuario.id, "RECUPERACION");
    await enviarEmail(
      usuario.email,
      "Recuperar contraseña — CocinaInteligente",
      `<p>Hola ${usuario.nombre},</p><p>Tu código para definir una nueva contraseña es:</p><h2>${codigo}</h2><p>Vale por 1 hora y se puede usar una sola vez. Si no pediste esto, ignorá este email.</p>`
    );
  }

  res.json({
    mensaje: "Si el email existe, te enviamos un código para definir una contraseña nueva.",
  });
});

const recuperarConfirmarSchema = z.object({
  email: z.string().email(),
  codigo: z.string().length(6),
  nuevaPassword: z.string().min(6),
});

authRouter.post("/recuperar/confirmar", async (req, res) => {
  const parsed = recuperarConfirmarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, codigo, nuevaPassword } = parsed.data;

  const usuario = await db.usuario.findUnique({ where: { email } });
  const valido =
    usuario && (await validarYConsumirToken(usuario.id, codigo, "RECUPERACION"));
  if (!usuario || !valido) {
    return res.status(400).json({ error: "Código inválido o expirado" });
  }

  await db.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash: await hashPassword(nuevaPassword) },
  });

  res.json({ mensaje: "Contraseña actualizada, ya podés iniciar sesión." });
});

authRouter.get("/me", requireAuth, async (req: RequestConSesion, res) => {
  const usuario = await db.usuario.findUnique({
    where: { id: req.sesion!.sub },
    include: { hogar: true },
  });
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json({ usuario: sinPassword(usuario), hogar: usuario.hogar });
});

const editarCuentaSchema = z
  .object({
    nombre: z.string().min(1).optional(),
    email: z.string().email().optional(),
  })
  .refine((d) => d.nombre !== undefined || d.email !== undefined, {
    message: "Hay que indicar nombre y/o email",
  });

authRouter.put("/me", requireAuth, async (req: RequestConSesion, res) => {
  const parsed = editarCuentaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.email) {
    const existente = await db.usuario.findUnique({ where: { email: parsed.data.email } });
    if (existente && existente.id !== req.sesion!.sub) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
    }
  }

  const usuario = await db.usuario.update({
    where: { id: req.sesion!.sub },
    data: parsed.data,
  });
  res.json({ usuario: sinPassword(usuario) });
});

const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1),
  passwordNueva: z.string().min(6),
});

authRouter.put("/me/password", requireAuth, async (req: RequestConSesion, res) => {
  const parsed = cambiarPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const usuario = await db.usuario.findUniqueOrThrow({ where: { id: req.sesion!.sub } });
  if (!(await verifyPassword(parsed.data.passwordActual, usuario.passwordHash))) {
    return res.status(401).json({ error: "La contraseña actual no es correcta" });
  }

  await db.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash: await hashPassword(parsed.data.passwordNueva) },
  });
  res.json({ mensaje: "Contraseña actualizada" });
});

const invitarSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
});

// Alta de un miembro del hogar por parte del admin: no le pone la
// contraseña a mano, se genera una inutilizable y se manda una invitación
// (por email si está configurado; si no, el código se devuelve en la
// respuesta para que el admin se lo pase manualmente). El invitado la
// confirma en /invitacion/confirmar, donde recién elige su contraseña.
authRouter.post(
  "/hogar/miembros",
  requireAuth,
  requireAdmin,
  async (req: RequestConSesion, res) => {
    const parsed = invitarSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { nombre, email } = parsed.data;

    const existente = await db.usuario.findUnique({ where: { email } });
    if (existente) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
    }

    const usuario = await db.usuario.create({
      data: {
        hogarId: req.sesion!.hogarId,
        nombre,
        email,
        passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
        rol: "MIEMBRO",
      },
    });

    const codigo = await crearTokenRecuperacion(usuario.id, "INVITACION");

    if (emailConfigurado()) {
      await enviarEmail(
        email,
        "Te invitaron a un hogar en CocinaInteligente",
        `<p>Hola ${nombre},</p><p>Te invitaron a sumarte a un hogar en CocinaInteligente. Tu código de invitación es:</p><h2>${codigo}</h2><p>Abrí la app, elegí "Tengo un código de invitación" e ingresalo junto con tu email y la contraseña que quieras usar.</p>`
      );
      return res.status(201).json({ usuario: sinPassword(usuario) });
    }

    res.status(201).json({
      usuario: sinPassword(usuario),
      codigoInvitacion: codigo,
      aviso: "El email no está configurado en el servidor: pasale este código a mano.",
    });
  }
);

const confirmarInvitacionSchema = z.object({
  email: z.string().email(),
  codigo: z.string().length(6),
  password: z.string().min(6),
});

// El nuevo miembro completa su alta con el código recibido y elige su
// propia contraseña; de paso queda logueado.
authRouter.post("/invitacion/confirmar", async (req, res) => {
  const parsed = confirmarInvitacionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, codigo, password } = parsed.data;

  const usuario = await db.usuario.findUnique({ where: { email } });
  const valido = usuario && (await validarYConsumirToken(usuario.id, codigo, "INVITACION"));
  if (!usuario || !valido) {
    return res.status(400).json({ error: "Código inválido o expirado" });
  }

  await db.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash: await hashPassword(password) },
  });

  const token = await crearToken({
    sub: usuario.id,
    hogarId: usuario.hogarId,
    rol: usuario.rol as RolUsuario,
    nombre: usuario.nombre,
    email: usuario.email,
  });
  res.json({ token, usuario: sinPassword(usuario) });
});

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
