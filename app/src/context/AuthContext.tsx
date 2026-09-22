import React, { createContext, useContext, useEffect, useState } from "react";
import { api, borrarToken, guardarToken, obtenerToken } from "../api/client";
import { Hogar, Usuario } from "../api/tipos";

type AuthState = {
  cargando: boolean;
  usuario: Usuario | null;
  hogar: Hogar | null;
  login: (email: string, password: string) => Promise<void>;
  registrar: (datos: {
    hogarNombre: string;
    nombre: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [hogar, setHogar] = useState<Hogar | null>(null);

  useEffect(() => {
    (async () => {
      const token = await obtenerToken();
      if (!token) {
        setCargando(false);
        return;
      }
      try {
        const datos = await api<{ usuario: Usuario; hogar: Hogar }>("/auth/me");
        setUsuario(datos.usuario);
        setHogar(datos.hogar);
      } catch {
        await borrarToken();
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const datos = await api<{ token: string; usuario: Usuario }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    await guardarToken(datos.token);
    setUsuario(datos.usuario);
    const meDatos = await api<{ hogar: Hogar }>("/auth/me");
    setHogar(meDatos.hogar);
  }

  async function registrar(datosForm: {
    hogarNombre: string;
    nombre: string;
    email: string;
    password: string;
  }) {
    const datos = await api<{ token: string; usuario: Usuario; hogar: Hogar }>(
      "/auth/registro",
      { method: "POST", body: datosForm }
    );
    await guardarToken(datos.token);
    setUsuario(datos.usuario);
    setHogar(datos.hogar);
  }

  async function logout() {
    await borrarToken();
    setUsuario(null);
    setHogar(null);
  }

  return (
    <AuthContext.Provider value={{ cargando, usuario, hogar, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
