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
import { api } from "../api/client";
import { Receta } from "../api/tipos";

type ResultadoB = { receta: Receta; faltante: string };

export default function SugerenciasScreen() {
  const [chips, setChips] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [categoriaA, setCategoriaA] = useState<Receta[] | null>(null);
  const [categoriaB, setCategoriaB] = useState<ResultadoB[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function agregarChip() {
    const valor = texto.trim().toLowerCase();
    if (valor && !chips.includes(valor)) setChips((prev) => [...prev, valor]);
    setTexto("");
  }

  function quitarChip(valor: string) {
    setChips((prev) => prev.filter((c) => c !== valor));
  }

  async function buscar() {
    if (chips.length === 0) return;
    setError(null);
    setCargando(true);
    try {
      const datos = await api<{ categoriaA: Receta[]; categoriaB: ResultadoB[] }>(
        "/sugerencias",
        { method: "POST", body: { ingredientes: chips } }
      );
      setCategoriaA(datos.categoriaA);
      setCategoriaB(datos.categoriaB);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo buscar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitulo}>¿Qué ingredientes tenés?</Text>

      <View style={styles.inputFila}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="ej. tomate"
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={agregarChip}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.agregarBoton} onPress={agregarChip}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>Agregar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chips}>
        {chips.map((c) => (
          <TouchableOpacity key={c} style={styles.chip} onPress={() => quitarChip(c)}>
            <Text style={styles.chipTexto}>{c} ✕</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.boton, chips.length === 0 && styles.botonDeshabilitado]}
        onPress={buscar}
        disabled={chips.length === 0 || cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Ver qué puedo cocinar</Text>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      {categoriaA && (
        <ScrollView style={{ marginTop: 20 }}>
          <Text style={styles.seccion}>Podés hacer ya ({categoriaA.length})</Text>
          {categoriaA.length === 0 && (
            <Text style={styles.vacio}>Ninguna receta usa solo esos ingredientes.</Text>
          )}
          {categoriaA.map((r) => (
            <Text key={r.id} style={styles.item}>
              • {r.nombre}
            </Text>
          ))}

          <Text style={styles.seccion}>Te falta 1 ingrediente ({categoriaB?.length ?? 0})</Text>
          {(categoriaB ?? []).length === 0 && (
            <Text style={styles.vacio}>Ninguna receta está a 1 ingrediente de distancia.</Text>
          )}
          {(categoriaB ?? []).map(({ receta, faltante }) => (
            <Text key={receta.id} style={styles.item}>
              • {receta.nombre} — te falta: {faltante}
            </Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  subtitulo: { fontWeight: "600", marginBottom: 8 },
  inputFila: { flexDirection: "row", gap: 8 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 },
  agregarBoton: {
    backgroundColor: "#ea580c",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { backgroundColor: "#fdecd8", borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipTexto: { color: "#ea580c" },
  boton: {
    backgroundColor: "#ea580c",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 18,
  },
  botonDeshabilitado: { opacity: 0.4 },
  botonTexto: { color: "#fff", fontWeight: "600" },
  error: { color: "#c0392b", marginTop: 10 },
  seccion: { fontSize: 16, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  vacio: { color: "#888" },
  item: { color: "#333", marginBottom: 6 },
});
