import AsyncStorage from "@react-native-async-storage/async-storage";

// En desarrollo con Expo Go, "localhost" apunta al dispositivo, no a tu PC.
// Reemplazá esto por la IP de tu máquina en la red local (ej. 192.168.0.10)
// o por la URL pública del backend una vez desplegado.
export const API_URL = "http://localhost:3001";

const TOKEN_KEY = "cocinainteligente_token";

export async function guardarToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function obtenerToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function borrarToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = await obtenerToken();

  const respuesta = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (respuesta.status === 204) return undefined as T;

  const datos = await respuesta.json().catch(() => undefined);

  if (!respuesta.ok) {
    const mensaje =
      typeof datos?.error === "string" ? datos.error : "Ocurrió un error inesperado";
    throw new ApiError(mensaje, respuesta.status);
  }

  return datos as T;
}
