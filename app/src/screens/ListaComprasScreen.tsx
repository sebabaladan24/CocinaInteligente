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

type Modo = "recetas" | "despensa";

export default function ListaComprasScreen() {
  const [modo, setModo] = useState<Modo>("recetas");
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

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setItems(null);
  }

  function toggle(id: string) {
    setItems(null);
    setSeleccionadas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  async function generarPorRecetas() {
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

  async function generarPorDespensa() {
    setGenerando(true);
    try {
      const datos = await api<{ items: ItemListaCompra[] }>("/despensa/lista-compras");
      setItems(datos.items);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, modo === "recetas" && styles.tabActivo]}
          onPress={() => cambiarModo("recetas")}
        >
          <Text style={modo === "recetas" ? styles.tabTextoActivo : styles.tabTexto}>
            Por recetas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, modo === "despensa" && styles.tabActivo]}
          onPress={() => cambiarModo("despensa")}
        >
          <Text style={modo === "despensa" ? styles.tabTextoActivo : styles.tabTexto}>
            Por despensa
          </Text>
        </TouchableOpacity>
      </View>

      {modo === "recetas" ? (
        <>
          <Text style={styles.subtitulo}>Elegí las recetas que vas a cocinar</Text>
          {cargando ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={recetas}
              keyExtractor={(r) => r.id}
              style={{ maxHeight: 220 }}
              ListEmptyComponent={
                <Text style={styles.vacio}>No hay recetas cargadas todavía.</Text>
              }
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
          )}
          <TouchableOpacity
            style={[styles.boton, seleccionadas.size === 0 && styles.botonDeshabilitado]}
            onPress={generarPorRecetas}
            disabled={seleccionadas.size === 0 || generando}
          >
            {generando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Generar lista de compras</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitulo}>
            Faltantes respecto de lo que definiste como básico en tu despensa
          </Text>
          <TouchableOpacity style={styles.boton} onPress={generarPorDespensa} disabled={generando}>
            {generando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Ver qué falta comprar</Text>
            )}
          </TouchableOpacity>
        </>
      )}

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
            ListEmptyComponent={
              <Text style={styles.vacio}>
                {modo === "despensa" ? "No falta nada por ahora." : "Sin ingredientes."}
              </Text>
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  tabs: { flexDirection: "row", marginBottom: 16, backgroundColor: "#f2f2f2", borderRadius: 8 },
  tab: { flex: 1, padding: 10, alignItems: "center", borderRadius: 8 },
  tabActivo: { backgroundColor: "#ea580c" },
  tabTexto: { color: "#555" },
  tabTextoActivo: { color: "#fff", fontWeight: "600" },
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
    marginTop: 8,
  },
  botonDeshabilitado: { opacity: 0.4 },
  botonTexto: { color: "#fff", fontWeight: "600" },
  resultado: { marginTop: 20, flex: 1 },
  seccion: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  item: { color: "#333", marginBottom: 6 },
});
