type Nivel = "info" | "warn" | "error";

// JSON.stringify no serializa los campos de un Error (son no-enumerables),
// así que sin este replacer cualquier Error anidado en "extra" — como
// ocurre siempre en el error handler global — queda como "{}", perdiendo
// justo el mensaje y el stack que hacen falta para debuguear.
function reemplazarErrores(_clave: string, valor: unknown) {
  if (valor instanceof Error) {
    return { nombre: valor.name, mensaje: valor.message, stack: valor.stack };
  }
  return valor;
}

// Una línea de JSON por log: fácil de buscar/filtrar en los logs de
// cualquier hosting (Railway, etc.) sin depender de un servicio aparte.
function log(nivel: Nivel, mensaje: string, extra?: unknown) {
  const linea: Record<string, unknown> = {
    nivel,
    mensaje,
    fecha: new Date().toISOString(),
  };
  if (extra !== undefined) linea.extra = extra;

  const texto = JSON.stringify(linea, reemplazarErrores);
  if (nivel === "error") console.error(texto);
  else if (nivel === "warn") console.warn(texto);
  else console.log(texto);
}

export const logger = {
  info: (mensaje: string, extra?: unknown) => log("info", mensaje, extra),
  warn: (mensaje: string, extra?: unknown) => log("warn", mensaje, extra),
  error: (mensaje: string, extra?: unknown) => log("error", mensaje, extra),
};
