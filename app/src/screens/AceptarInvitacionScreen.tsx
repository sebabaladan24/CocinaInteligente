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
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { AuthStackParamList } from "../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "AceptarInvitacion">;

export default function AceptarInvitacionScreen({ navigation }: Props) {
  const { confirmarInvitacion } = useAuth();
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function confirmar() {
    setError(null);
    setCargando(true);
    try {
      await confirmarInvitacion({ email: email.trim(), codigo: codigo.trim(), password });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo confirmar la invitación");
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Tengo un código de invitación</Text>
      <Text style={styles.ayuda}>
        Te invitaron a un hogar en CocinaInteligente. Ingresá el código que te pasaron y elegí tu
        contraseña.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
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
        placeholder="Elegí tu contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.boton} onPress={confirmar} disabled={cargando}>
        {cargando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Confirmar y entrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Volver a iniciar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  titulo: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  ayuda: { color: "#666", fontSize: 13, marginBottom: 20, textAlign: "center", lineHeight: 18 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 12 },
  boton: { backgroundColor: "#ea580c", borderRadius: 8, padding: 14, alignItems: "center" },
  botonTexto: { color: "#fff", fontWeight: "600" },
  error: { color: "#c0392b", marginBottom: 8 },
  link: { color: "#ea580c", textAlign: "center", marginTop: 20 },
});
