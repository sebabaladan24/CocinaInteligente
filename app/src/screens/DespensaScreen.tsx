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
import { api } from "../api/client";
import { DespensaItem } from "../api/tipos";

export default function DespensaScreen() {
  const [items, setItems] = useState<DespensaItem[]>([]);
  const [cargando, setCargando] = useState(true);

  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("unidad");
  const [objetivo, setObjetivo] = useState("");
  const [actual, setActual] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const datos = await api<{ items: DespensaItem[] }>("/despensa");
    setItems(datos.items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      cargar().finally(() => setCargando(false));
    }, [cargar])
  );

  async function guardarItem() {
    if (!nombre.trim() || (!objetivo && !actual)) return;
    setGuardando(true);
    try {
      await api("/despensa", {
        method: "PUT",
        body: {
          nombre: nombre.trim(),
          unidad: unidad.trim() || "unidad",
          cantidadObjetivo: objetivo ? Number(objetivo) : undefined,
          cantidadActual: actual ? Number(actual) : undefined,
        },
      });
      setNombre("");
      setUnidad("unidad");
      setObjetivo("");
      setActual("");
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function ajustar(item: DespensaItem, delta: 1 | -1) {
    await api("/despensa/ajustar", {
      method: "POST",
      body: {
        ingredienteId: item.ingredienteId,
        cantidad: 1,
        unidad: item.actual.unidad,
        operacion: delta === 1 ? "sumar" : "restar",
      },
    });
    await cargar();
  }

  function eliminar(item: DespensaItem) {
    Alert.alert("Quitar de la despensa", `¿Dejar de trackear "${item.nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: async () => {
          await api(`/despensa/${item.id}`, { method: "DELETE" });
          await cargar();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.ayuda}>
        Cargá lo básico que siempre debería tener tu heladera/alacena (objetivo) y cuánto tenés
        ahora (actual). Al cocinar una receta, el stock actual se descuenta solo.
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Ingrediente"
          value={nombre}
          onChangeText={setNombre}
        />
        <View style={styles.filaForm}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Unidad (kg, g, unidad...)"
            value={unidad}
            onChangeText={setUnidad}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Objetivo"
            keyboardType="numeric"
            value={objetivo}
            onChangeText={setObjetivo}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Actual"
            keyboardType="numeric"
            value={actual}
            onChangeText={setActual}
          />
        </View>
        <TouchableOpacity style={styles.boton} onPress={guardarItem} disabled={guardando}>
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botonTexto}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          style={{ marginTop: 16 }}
          data={items}
          keyExtractor={(i) => i.id}
          ListEmptyComponent={
            <Text style={styles.vacio}>Todavía no cargaste ningún ítem de despensa.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity style={{ flex: 1 }} onLongPress={() => eliminar(item)}>
                <Text style={styles.cardNombre}>{item.nombre}</Text>
                <Text style={styles.cardMeta}>
                  Tenés {item.actual.cantidad} {item.actual.unidad} · Objetivo{" "}
                  {item.objetivo.cantidad} {item.objetivo.unidad}
                </Text>
              </TouchableOpacity>
              <View style={styles.ajusteBotones}>
                <TouchableOpacity style={styles.ajusteBoton} onPress={() => ajustar(item, -1)}>
                  <Text style={styles.ajusteBotonTexto}>−1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ajusteBoton} onPress={() => ajustar(item, 1)}>
                  <Text style={styles.ajusteBotonTexto}>+1</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  ayuda: { color: "#666", fontSize: 12, marginBottom: 12, lineHeight: 17 },
  form: { gap: 8 },
  filaForm: { flexDirection: "row", gap: 8 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 },
  boton: {
    backgroundColor: "#ea580c",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 4,
  },
  botonTexto: { color: "#fff", fontWeight: "600" },
  vacio: { color: "#888", textAlign: "center", marginTop: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  cardNombre: { fontWeight: "600" },
  cardMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  ajusteBotones: { flexDirection: "row", gap: 6 },
  ajusteBoton: {
    backgroundColor: "#fdecd8",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  ajusteBotonTexto: { color: "#ea580c", fontWeight: "700" },
});
