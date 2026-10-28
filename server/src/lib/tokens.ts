import { db } from "./db";
import type { TipoToken } from "./tipos";

const EXPIRACION_MS = 60 * 60 * 1000; // 1 hora

function generarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Invalida cualquier código previo del mismo tipo sin usar para ese
// usuario, así solo el último código enviado es válido.
export async function crearTokenRecuperacion(usuarioId: string, tipo: TipoToken) {
  await db.tokenRecuperacion.updateMany({
    where: { usuarioId, tipo, usado: false },
    data: { usado: true },
  });

  const codigo = generarCodigo();
  await db.tokenRecuperacion.create({
    data: { usuarioId, tipo, codigo, expiraEn: new Date(Date.now() + EXPIRACION_MS) },
  });
  return codigo;
}

export async function validarYConsumirToken(
  usuarioId: string,
  codigo: string,
  tipo: TipoToken
): Promise<boolean> {
  const token = await db.tokenRecuperacion.findFirst({
    where: { usuarioId, codigo, tipo, usado: false, expiraEn: { gt: new Date() } },
  });
  if (!token) return false;

  await db.tokenRecuperacion.update({ where: { id: token.id }, data: { usado: true } });
  return true;
}
