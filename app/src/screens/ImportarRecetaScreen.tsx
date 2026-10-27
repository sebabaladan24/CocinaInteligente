import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/client";
import { ResultadoBusquedaWeb } from "../api/tipos";
import type { RecetarioStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RecetarioStackParamList, "ImportarReceta">;

type Modo = "url" | "json" | "buscar";

export default function ImportarRecetaScreen({ navigation }: Props) {
  const [modo, setModo] = useState<Modo>("url");
  const [url, setUrl] = useState("");
  const [json, setJson] = useState("");
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusquedaWeb[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setError(null);
    setResultados(null);
  }

  async function importarUrl(urlAImportar: string) {
    setError(null);
    setCargando(true);
    try {
      await api("/recetas/importar-url", { method: "POST", body: { url: urlAImportar.trim() } });
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

  async function buscar() {
    if (!query.trim()) return;
    setError(null);
    setResultados(null);
    setCargando(true);
    try {
      const datos = await api<{ resultados: ResultadoBusquedaWeb[] }>("/recetas/buscar-web", {
        method: "POST",
        body: { query: query.trim() },
      });
      setResultados(datos.resultados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo buscar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, modo === "url" && styles.tabActivo]}
          onPress={() => cambiarModo("url")}
        >
          <Text style={modo === "url" ? styles.tabTextoActivo : styles.tabTexto}>URL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, modo === "buscar" && styles.tabActivo]}
          onPress={() => cambiarModo("buscar")}
        >
          <Text style={modo === "buscar" ? styles.tabTextoActivo : styles.tabTexto}>
            Buscar en la web
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, modo === "json" && styles.tabActivo]}
          onPress={() => cambiarModo("json")}
        >
          <Text style={modo === "json" ? styles.tabTextoActivo : styles.tabTexto}>JSON</Text>
        </TouchableOpacity>
      </View>

      {modo === "url" && (
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
          <TouchableOpacity
            style={styles.boton}
            onPress={() => importarUrl(url)}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Importar</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {modo === "buscar" && (
        <>
          <Text style={styles.ayuda}>
            Describí qué querés cocinar (ej. "tarta de jamón y queso") y elegí uno de los
            resultados para importarlo.
          </Text>
          <View style={styles.filaBusqueda}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Qué querés cocinar..."
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={buscar}
            />
            <TouchableOpacity style={styles.botonBuscar} onPress={buscar} disabled={cargando}>
              <Text style={styles.botonTexto}>Buscar</Text>
            </TouchableOpacity>
          </View>

          {cargando && <ActivityIndicator style={{ marginTop: 16 }} />}
          {error && <Text style={styles.error}>{error}</Text>}

          {resultados && (
            <FlatList
              data={resultados}
              keyExtractor={(r) => r.url}
              style={{ marginTop: 12 }}
              ListEmptyComponent={
                <Text style={styles.vacio}>No encontramos nada para esa búsqueda.</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultadoCard}
                  onPress={() => importarUrl(item.url)}
                  disabled={cargando}
                >
                  <Text style={styles.resultadoTitulo}>{item.titulo}</Text>
                  {!!item.descripcion && (
                    <Text style={styles.resultadoDescripcion} numberOfLines={2}>
                      {item.descripcion}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

      {modo === "json" && (
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
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Importar</Text>
            )}
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
  tabTexto: { color: "#555", fontSize: 12 },
  tabTextoActivo: { color: "#fff", fontWeight: "600", fontSize: 12 },
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
  filaBusqueda: { flexDirection: "row", gap: 8 },
  botonBuscar: {
    backgroundColor: "#ea580c",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  vacio: { color: "#888", textAlign: "center", marginTop: 20 },
  resultadoCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  resultadoTitulo: { fontWeight: "600" },
  resultadoDescripcion: { fontSize: 12, color: "#888", marginTop: 4 },
});
