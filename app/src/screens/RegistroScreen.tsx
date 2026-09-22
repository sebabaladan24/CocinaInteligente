import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import type { AuthStackParamList } from "../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Registro">;

export default function RegistroScreen({ navigation }: Props) {
  const { registrar } = useAuth();
  const [hogarNombre, setHogarNombre] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit() {
    setError(null);
    setCargando(true);
    try {
      await registrar({ hogarNombre: hogarNombre.trim(), nombre: nombre.trim(), email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Creá tu hogar</Text>
      <Text style={styles.subtitulo}>
        Vas a quedar como administrador; después podés invitar al resto de la familia.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre del hogar (ej. Familia Pérez)"
        value={hogarNombre}
        onChangeText={setHogarNombre}
      />
      <TextInput style={styles.input} placeholder="Tu nombre" value={nombre} onChangeText={setNombre} />
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
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.boton} onPress={onSubmit} disabled={cargando}>
        {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Crear hogar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Ya tengo cuenta, iniciar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  titulo: { fontSize: 26, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  subtitulo: { fontSize: 13, color: "#666", textAlign: "center", marginBottom: 28 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  boton: {
    backgroundColor: "#ea580c",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  botonTexto: { color: "#fff", fontWeight: "600" },
  error: { color: "#c0392b", marginBottom: 8 },
  link: { color: "#ea580c", textAlign: "center", marginTop: 20 },
});
