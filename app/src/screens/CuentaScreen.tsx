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
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Usuario } from "../api/tipos";

export default function CuentaScreen() {
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const [okDatos, setOkDatos] = useState(false);

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [okPassword, setOkPassword] = useState(false);

  async function guardarDatos() {
    setErrorDatos(null);
    setOkDatos(false);
    setGuardandoDatos(true);
    try {
      const datos = await api<{ usuario: Usuario }>("/auth/me", {
        method: "PUT",
        body: { nombre: nombre.trim(), email: email.trim() },
      });
      actualizarUsuarioLocal(datos.usuario);
      setOkDatos(true);
    } catch (err) {
      setErrorDatos(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setGuardandoDatos(false);
    }
  }

  async function cambiarPassword() {
    setErrorPassword(null);
    setOkPassword(false);
    setCambiandoPassword(true);
    try {
      await api("/auth/me/password", {
        method: "PUT",
        body: { passwordActual, passwordNueva },
      });
      setPasswordActual("");
      setPasswordNueva("");
      setOkPassword(true);
    } catch (err) {
      setErrorPassword(err instanceof ApiError ? err.message : "No se pudo cambiar");
    } finally {
      setCambiandoPassword(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.seccion}>Mis datos</Text>
      <Text style={styles.label}>Nombre</Text>
      <TextInput style={styles.input} value={nombre} onChangeText={setNombre} />
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {errorDatos && <Text style={styles.error}>{errorDatos}</Text>}
      {okDatos && <Text style={styles.ok}>Guardado.</Text>}
      <TouchableOpacity style={styles.boton} onPress={guardarDatos} disabled={guardandoDatos}>
        {guardandoDatos ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Guardar datos</Text>
        )}
      </TouchableOpacity>

      <Text style={[styles.seccion, { marginTop: 32 }]}>Cambiar contraseña</Text>
      <Text style={styles.label}>Contraseña actual</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={passwordActual}
        onChangeText={setPasswordActual}
      />
      <Text style={styles.label}>Contraseña nueva</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={passwordNueva}
        onChangeText={setPasswordNueva}
      />
      {errorPassword && <Text style={styles.error}>{errorPassword}</Text>}
      {okPassword && <Text style={styles.ok}>Contraseña actualizada.</Text>}
      <TouchableOpacity
        style={styles.boton}
        onPress={cambiarPassword}
        disabled={cambiandoPassword}
      >
        {cambiandoPassword ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Cambiar contraseña</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  seccion: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  label: { fontSize: 13, color: "#666", marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 },
  error: { color: "#c0392b", marginTop: 10 },
  ok: { color: "#15803d", marginTop: 10 },
  boton: {
    backgroundColor: "#ea580c",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  botonTexto: { color: "#fff", fontWeight: "600" },
});
