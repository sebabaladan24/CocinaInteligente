// SQLite no soporta enums nativos en Prisma (ver comentario en schema.prisma),
// así que estos campos se guardan como String y se tipan acá a mano.
export type RolUsuario = "ADMIN" | "MIEMBRO";
export type OrigenReceta = "MANUAL" | "IMPORTADA_JSON" | "IMPORTADA_URL";
