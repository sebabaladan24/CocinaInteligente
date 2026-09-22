import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { ItemListaCompra, Receta } from "../api/tipos";

export default function ListaComprasScreen() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<ItemListaCompra[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      api<{ recetas: Receta[] }>("/recetas")
        .then((d) => setRecetas(d.recetas))
        .finally(() => setCargando(false));
    }, [])
  );

  function toggle(id: string) {
    setItems(null);
    setSeleccionadas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  async function generar() {
    setGenerando(true);
    try {
      const datos = await api<{ items: ItemListaCompra[] }>("/lista-compras", {
        method: "POST",
        body: { items: Array.from(seleccionadas).map((recetaId) => ({ recetaId })) },
      });
      setItems(datos.items);
    } finally {
      setGenerando(false);
    }
  }

  if (cargando) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.subtitulo}>Elegí las recetas que vas a cocinar</Text>
      <FlatList
        data={recetas}
        keyExtractor={(r) => r.id}
        style={{ maxHeight: 260 }}
        ListEmptyComponent={<Text style={styles.vacio}>No hay recetas cargadas todavía.</Text>}
        renderItem={({ item }) => {
          const activa = seleccionadas.has(item.id);
          return (
            <TouchableOpacity
              style={[styles.recetaFila, activa && styles.recetaFilaActiva]}
              onPress={() => toggle(item.id)}
            >
              <Text style={activa ? styles.recetaNombreActiva : styles.recetaNombre}>
                {item.nombre}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={[styles.boton, seleccionadas.size === 0 && styles.botonDeshabilitado]}
        onPress={generar}
        disabled={seleccionadas.size === 0 || generando}
      >
        {generando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Generar lista de compras</Text>
        )}
      </TouchableOpacity>

      {items && (
        <View style={styles.resultado}>
          <Text style={styles.seccion}>Lista de compras</Text>
          <FlatList
            data={items}
            keyExtractor={(i, idx) => `${i.nombre}-${idx}`}
            renderItem={({ item }) => (
              <Text style={styles.item}>
                • {item.cantidad} {item.unidad} de {item.nombre}
              </Text>
            )}
            ListEmptyComponent={<Text style={styles.vacio}>Sin ingredientes.</Text>}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  subtitulo: { fontWeight: "600", marginBottom: 8 },
  vacio: { color: "#888", marginTop: 12 },
  recetaFila: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  recetaFilaActiva: { backgroundColor: "#ea580c", borderColor: "#ea580c" },
  recetaNombre: { color: "#333" },
  recetaNombreActiva: { color: "#fff", fontWeight: "600" },
  boton: {
    backgroundColor: "#ea580c",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  botonDeshabilitado: { opacity: 0.4 },
  botonTexto: { color: "#fff", fontWeight: "600" },
  resultado: { marginTop: 20, flex: 1 },
  seccion: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  item: { color: "#333", marginBottom: 6 },
});
