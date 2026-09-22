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
import { api } from "../api/client";
import type { RecetarioStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RecetarioStackParamList, "ImportarReceta">;

type Modo = "url" | "json";

export default function ImportarRecetaScreen({ navigation }: Props) {
  const [modo, setModo] = useState<Modo>("url");
  const [url, setUrl] = useState("");
  const [json, setJson] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function importarPorUrl() {
    setError(null);
    setCargando(true);
    try {
      await api("/recetas/importar-url", { method: "POST", body: { url: url.trim() } });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar");
    } finally {
      setCargando(false);
    }
  }

  async function importarPorJson() {
    setError(null);
    let cuerpo: unknown;
    try {
      const parseado = JSON.parse(json);
      cuerpo = Array.isArray(parseado) ? { recetas: parseado } : { recetas: [parseado] };
    } catch {
      setError("El texto pegado no es un JSON válido");
      return;
    }
    setCargando(true);
    try {
      await api("/recetas/importar", { method: "POST", body: cuerpo });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, modo === "url" && styles.tabActivo]}
          onPress={() => setModo("url")}
        >
          <Text style={modo === "url" ? styles.tabTextoActivo : styles.tabTexto}>
            Desde una URL
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, modo === "json" && styles.tabActivo]}
          onPress={() => setModo("json")}
        >
          <Text style={modo === "json" ? styles.tabTextoActivo : styles.tabTexto}>
            Pegar JSON
          </Text>
        </TouchableOpacity>
      </View>

      {modo === "url" ? (
        <>
          <Text style={styles.ayuda}>
            Pegá el link de una receta de cualquier sitio de cocina. Vamos a intentar leer sus
            datos estructurados automáticamente.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            autoCapitalize="none"
            keyboardType="url"
            value={url}
            onChangeText={setUrl}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.boton} onPress={importarPorUrl} disabled={cargando}>
            {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Importar</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.ayuda}>
            Pegá un JSON con una receta o una lista de recetas (por ejemplo, uno que hayas armado
            con ayuda de un asistente de IA), con el formato:{"\n"}
            {'{ "nombre", "pasos", "porciones", "ingredientes": [{ "nombre", "cantidad", "unidad" }] }'}
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            multiline
            placeholder="Pegá el JSON acá..."
            value={json}
            onChangeText={setJson}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.boton} onPress={importarPorJson} disabled={cargando}>
            {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Importar</Text>}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  tabs: { flexDirection: "row", marginBottom: 16, backgroundColor: "#f2f2f2", borderRadius: 8 },
  tab: { flex: 1, padding: 10, alignItems: "center", borderRadius: 8 },
  tabActivo: { backgroundColor: "#ea580c" },
  tabTexto: { color: "#555" },
  tabTextoActivo: { color: "#fff", fontWeight: "600" },
  ayuda: { color: "#666", fontSize: 13, marginBottom: 12, lineHeight: 18 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 },
  textarea: { minHeight: 180, textAlignVertical: "top" },
  error: { color: "#c0392b", marginTop: 10 },
  boton: {
    backgroundColor: "#ea580c",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  botonTexto: { color: "#fff", fontWeight: "600" },
});
