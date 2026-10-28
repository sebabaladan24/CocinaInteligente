import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, ApiError } from "../api/client";
import { Usuario } from "../api/tipos";

type RespuestaInvitar = {
  usuario: Usuario;
  codigoInvitacion?: string;
  aviso?: string;
};

export default function MiembrosScreen() {
  const [miembros, setMiembros] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [invitando, setInvitando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const datos = await api<{ miembros: Usuario[] }>("/auth/hogar/miembros");
    setMiembros(datos.miembros);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      cargar().finally(() => setCargando(false));
    }, [cargar])
  );

  async function invitar() {
    if (!nombre.trim() || !email.trim()) return;
    setError(null);
    setInvitando(true);
    try {
      const datos = await api<RespuestaInvitar>("/auth/hogar/miembros", {
        method: "POST",
        body: { nombre: nombre.trim(), email: email.trim() },
      });
      setNombre("");
      setEmail("");
      await cargar();
      if (datos.codigoInvitacion) {
        Alert.alert(
          "Pasale este código",
          `${datos.aviso ?? ""}\n\nCódigo para ${datos.usuario.email}: ${datos.codigoInvitacion}\n\nLo tiene que ingresar en "Tengo un código de invitación" junto con su email y la contraseña que elija.`
        );
      } else {
        Alert.alert("Invitación enviada", `Le mandamos un email a ${datos.usuario.email}.`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo invitar");
    } finally {
      setInvitando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.seccion}>Invitar a alguien</Text>
      <TextInput style={styles.input} placeholder="Nombre" value={nombre} onChangeText={setNombre} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.boton} onPress={invitar} disabled={invitando}>
        {invitando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Invitar</Text>
        )}
      </TouchableOpacity>

      <Text style={[styles.seccion, { marginTop: 28 }]}>Miembros del hogar</Text>
      {cargando ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : (
        <FlatList
          data={miembros}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardNombre}>
                {item.nombre} {item.rol === "ADMIN" ? "(admin)" : ""}
              </Text>
              <Text style={styles.cardEmail}>{item.email}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  seccion: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 10 },
  error: { color: "#c0392b", marginBottom: 8 },
  boton: { backgroundColor: "#ea580c", borderRadius: 8, padding: 14, alignItems: "center" },
  botonTexto: { color: "#fff", fontWeight: "600" },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  cardNombre: { fontWeight: "600" },
  cardEmail: { fontSize: 12, color: "#888", marginTop: 2 },
});
