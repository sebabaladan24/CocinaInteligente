import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/client";
import { Receta } from "../api/tipos";
import type { RecetarioStackParamList } from "../navigation";
import { useAuth } from "../context/AuthContext";

type Props = NativeStackScreenProps<RecetarioStackParamList, "RecetarioLista">;

export default function RecetarioScreen({ navigation }: Props) {
  const { logout, hogar } = useAuth();
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    const datos = await api<{ recetas: Receta[] }>("/recetas");
    setRecetas(datos.recetas);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      cargar().finally(() => setCargando(false));
    }, [cargar])
  );

  async function onRefresh() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.hogarNombre}>{hogar?.nombre}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.salir}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.acciones}>
        <TouchableOpacity
          style={styles.botonAccion}
          onPress={() => navigation.navigate("RecetaForm", {})}
        >
          <Text style={styles.botonAccionTexto}>+ Nueva receta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.botonAccion, styles.botonAccionSecundario]}
          onPress={() => navigation.navigate("ImportarReceta")}
        >
          <Text style={[styles.botonAccionTexto, styles.botonAccionTextoSecundario]}>
            Importar
          </Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={recetas}
          keyExtractor={(r) => r.id}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={styles.vacio}>
              Todavía no hay recetas. Cargá una manual o importá una por URL.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("RecetaDetalle", { recetaId: item.id })}
            >
              <Text style={styles.cardTitulo}>{item.nombre}</Text>
              <Text style={styles.cardMeta}>
                {item.porciones} porciones{item.tiempoMin ? ` · ${item.tiempoMin} min` : ""}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  hogarNombre: { fontSize: 16, fontWeight: "600" },
  salir: { color: "#ea580c" },
  acciones: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  botonAccion: {
    backgroundColor: "#ea580c",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  botonAccionSecundario: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ea580c",
  },
  botonAccionTexto: { color: "#fff", fontWeight: "600" },
  botonAccionTextoSecundario: { color: "#ea580c" },
  vacio: { textAlign: "center", color: "#888", marginTop: 40 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardTitulo: { fontSize: 16, fontWeight: "600" },
  cardMeta: { fontSize: 12, color: "#888", marginTop: 4 },
});
