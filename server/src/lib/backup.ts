import fs from "node:fs";
import path from "node:path";
import { emailConfigurado, enviarEmailConAdjunto } from "./email";
import { logger } from "./logger";

const RETENCION = 14; // cantidad de backups locales a conservar

// Prisma interpreta "file:./dev.db" relativo a la carpeta prisma/, y un
// "file:/ruta/absoluta.db" (típico de un volumen montado en producción)
// tal cual. Replicamos esa misma resolución para encontrar el archivo real.
function rutaBaseDeDatos() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) {
    throw new Error(
      `DATABASE_URL no es un archivo sqlite local (${url}); el backup solo soporta sqlite.`
    );
  }
  const relativo = url.slice("file:".length);
  if (path.isAbsolute(relativo)) return relativo;
  return path.resolve(__dirname, "../../prisma", relativo);
}

// Los backups quedan al lado del archivo vivo, sea cual sea su ubicación
// final (carpeta local en desarrollo, o un volumen persistente en
// producción) — así no dependen de adivinar la estructura del hosting.
function carpetaBackups(rutaDb: string) {
  const carpeta = path.join(path.dirname(rutaDb), "backups");
  fs.mkdirSync(carpeta, { recursive: true });
  return carpeta;
}

function podarBackupsViejos(carpeta: string) {
  const archivos = fs
    .readdirSync(carpeta)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".db"))
    .sort();
  const sobrantes = archivos.slice(0, Math.max(0, archivos.length - RETENCION));
  for (const archivo of sobrantes) {
    fs.unlinkSync(path.join(carpeta, archivo));
  }
}

// Copia local rotada (protege de corrupción/borrado accidental de datos)
// + si está configurado, un email con el backup adjunto a BACKUP_EMAIL
// (protege de la pérdida del volumen completo, reusando el email que ya
// tenemos integrado en vez de agregar un proveedor de storage aparte).
export async function hacerBackup() {
  const origen = rutaBaseDeDatos();
  if (!fs.existsSync(origen)) {
    throw new Error(`No se encontró la base de datos en ${origen}`);
  }

  const marca = new Date().toISOString().replace(/[:.]/g, "-");
  const carpeta = carpetaBackups(origen);
  const destino = path.join(carpeta, `backup-${marca}.db`);
  fs.copyFileSync(origen, destino);
  logger.info("Backup local creado", { destino });

  podarBackupsViejos(carpeta);

  const destinatario = process.env.BACKUP_EMAIL;
  if (destinatario && emailConfigurado()) {
    const contenido = fs.readFileSync(destino).toString("base64");
    await enviarEmailConAdjunto(
      destinatario,
      `Backup CocinaInteligente — ${marca}`,
      "<p>Backup automático de la base de datos, adjunto en este email.</p>",
      [{ filename: `cocinainteligente-${marca}.db`, content: contenido }]
    );
    logger.info("Backup enviado por email", { destinatario });
  }

  return destino;
}
