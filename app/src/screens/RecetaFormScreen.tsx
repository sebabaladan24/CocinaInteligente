import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/client";
import { IngredienteInput, Receta } from "../api/tipos";
import type { RecetarioStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RecetarioStackParamList, "RecetaForm">;

type FilaIngrediente = IngredienteInput & { key: string };

let contador = 0;
function nuevaFila(): FilaIngrediente {
  contador += 1;
  return { key: `fila-${contador}`, nombre: "", cantidad: 1, unidad: "unidad" };
}

export default function RecetaFormScreen({ route, navigation }: Props) {
  const recetaId = route.params?.recetaId;
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [pasos, setPasos] = useState("");
  const [tiempoMin, setTiempoMin] = useState("");
  const [porciones, setPorciones] = useState("2");
  const [ingredientes, setIngredientes] = useState<FilaIngrediente[]>([nuevaFila()]);
  const [cargando, setCargando] = useState(!!recetaId);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recetaId) return;
    api<{ receta: Receta }>(`/recetas/${recetaId}`).then((d) => {
      const r = d.receta;
      setNombre(r.nombre);
      setDescripcion(r.descripcion ?? "");
      setPasos(r.pasos);
      setTiempoMin(r.tiempoMin ? String(r.tiempoMin) : "");
      setPorciones(String(r.porciones));
      setIngredientes(
        r.ingredientes.length
          ? r.ingredientes.map((ri) => ({
              key: ri.id,
              nombre: ri.ingrediente.nombre,
              cantidad: ri.cantidad,
              unidad: ri.unidad,
            }))
          : [nuevaFila()]
      );
      setCargando(false);
    });
  }, [recetaId]);

  function actualizarFila(key: string, cambios: Partial<FilaIngrediente>) {
    setIngredientes((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  }

  function quitarFila(key: string) {
    setIngredientes((prev) => prev.filter((f) => f.key !== key));
  }

  async function guardar() {
    setError(null);
    const ingredientesValidos = ingredientes
      .filter((f) => f.nombre.trim())
      .map(({ nombre: n, cantidad, unidad }) => ({ nombre: n, cantidad, unidad }));

    if (!nombre.trim()) {
      setError("El nombre de la receta es obligatorio");
      return;
    }

    setGuardando(true);
    try {
      const body = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        pasos,
        tiempoMin: tiempoMin ? Number(tiempoMin) : undefined,
        porciones: Number(porciones) || 1,
        ingredientes: ingredientesValidos,
      };
      if (recetaId) {
        await api(`/recetas/${recetaId}`, { method: "PUT", body });
      } else {
        await api("/recetas", { method: "POST", body });
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la receta");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Nombre</Text>
      <TextInput style={styles.input} value={nombre} onChangeText={setNombre} />

      <Text style={styles.label}>Descripción (opcional)</Text>
      <TextInput style={styles.input} value={descripcion} onChangeText={setDescripcion} />

      <View style={styles.fila2}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Porciones</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={porciones}
            onChangeText={setPorciones}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Tiempo (min)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={tiempoMin}
            onChangeText={setTiempoMin}
          />
        </View>
      </View>

      <Text style={styles.seccion}>Ingredientes</Text>
      {ingredientes.map((fila) => (
        <View key={fila.key} style={styles.filaIngrediente}>
          <TextInput
            style={[styles.input, styles.inputNombre]}
            placeholder="Ingrediente"
            value={fila.nombre}
            onChangeText={(v) => actualizarFila(fila.key, { nombre: v })}
          />
          <TextInput
            style={[styles.input, styles.inputCantidad]}
            placeholder="Cant."
            keyboardType="numeric"
            value={String(fila.cantidad)}
            onChangeText={(v) => actualizarFila(fila.key, { cantidad: Number(v) || 0 })}
          />
          <TextInput
            style={[styles.input, styles.inputUnidad]}
            placeholder="Unidad"
            value={fila.unidad}
            onChangeText={(v) => actualizarFila(fila.key, { unidad: v })}
          />
          <TouchableOpacity onPress={() => quitarFila(fila.key)} style={styles.quitar}>
            <Text style={{ color: "#c0392b" }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={() => setIngredientes((prev) => [...prev, nuevaFila()])}>
        <Text style={styles.agregar}>+ Agregar ingrediente</Text>
      </TouchableOpacity>

      <Text style={styles.seccion}>Preparación</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        multiline
        value={pasos}
        onChangeText={setPasos}
        placeholder="Paso a paso..."
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.botonGuardar} onPress={guardar} disabled={guardando}>
        {guardando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonGuardarTexto}>Guardar receta</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { fontSize: 13, color: "#666", marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
  },
  fila2: { flexDirection: "row", gap: 12 },
  seccion: { fontSize: 16, fontWeight: "600", marginTop: 24, marginBottom: 8 },
  filaIngrediente: { flexDirection: "row", gap: 6, marginBottom: 8, alignItems: "center" },
  inputNombre: { flex: 3 },
  inputCantidad: { flex: 1 },
  inputUnidad: { flex: 1.2 },
  quitar: { padding: 6 },
  agregar: { color: "#ea580c", marginTop: 4 },
  textarea: { minHeight: 120, textAlignVertical: "top" },
  error: { color: "#c0392b", marginTop: 12 },
  botonGuardar: {
    backgroundColor: "#ea580c",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  botonGuardarTexto: { color: "#fff", fontWeight: "600" },
});
