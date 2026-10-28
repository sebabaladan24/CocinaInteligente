import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../api/client";
import type { AuthStackParamList } from "../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "OlvidePassword">;

export default function OlvidePasswordScreen({ navigation }: Props) {
  const [paso, setPaso] = useState<"email" | "codigo">("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function solicitar() {
    setError(null);
    setCargando(true);
    try {
      const datos = await api<{ mensaje: string }>("/auth/recuperar/solicitar", {
        method: "POST",
        body: { email: email.trim() },
      });
      setMensaje(datos.mensaje);
      setPaso("codigo");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar el código");
    } finally {
      setCargando(false);
    }
  }

  async function confirmar() {
    setError(null);
    setCargando(true);
    try {
      await api("/auth/recuperar/confirmar", {
        method: "POST",
        body: { email: email.trim(), codigo: codigo.trim(), nuevaPassword },
      });
      navigation.navigate("Login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo confirmar el código");
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Recuperar contraseña</Text>

      {paso === "email" ? (
        <>
          <Text style={styles.ayuda}>Te mandamos un código de 6 dígitos a tu email.</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.boton} onPress={solicitar} disabled={cargando}>
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Enviar código</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          {!!mensaje && <Text style={styles.ayuda}>{mensaje}</Text>}
          <TextInput
            style={styles.input}
            placeholder="Código de 6 dígitos"
            keyboardType="number-pad"
            maxLength={6}
            value={codigo}
            onChangeText={setCodigo}
          />
          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            secureTextEntry
            value={nuevaPassword}
            onChangeText={setNuevaPassword}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.boton} onPress={confirmar} disabled={cargando}>
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Cambiar contraseña</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Volver a iniciar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  titulo: { fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  ayuda: { color: "#666", fontSize: 13, marginBottom: 16, textAlign: "center", lineHeight: 18 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 12 },
  boton: { backgroundColor: "#ea580c", borderRadius: 8, padding: 14, alignItems: "center" },
  botonTexto: { color: "#fff", fontWeight: "600" },
  error: { color: "#c0392b", marginBottom: 8 },
  link: { color: "#ea580c", textAlign: "center", marginTop: 20 },
});
