import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/client";
import { Receta } from "../api/tipos";
import type { RecetarioStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RecetarioStackParamList, "RecetaDetalle">;

export default function RecetaDetalleScreen({ route, navigation }: Props) {
  const { recetaId } = route.params;
  const [receta, setReceta] = useState<Receta | null>(null);

  useEffect(() => {
    api<{ receta: Receta }>(`/recetas/${recetaId}`).then((d) => setReceta(d.receta));
  }, [recetaId]);

  async function eliminar() {
    Alert.alert("Eliminar receta", "¿Seguro que querés borrarla?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await api(`/recetas/${recetaId}`, { method: "DELETE" });
          navigation.goBack();
        },
      },
    ]);
  }

  if (!receta) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>{receta.nombre}</Text>
      <Text style={styles.meta}>
        {receta.porciones} porciones{receta.tiempoMin ? ` · ${receta.tiempoMin} min` : ""}
      </Text>
      {receta.descripcion && <Text style={styles.descripcion}>{receta.descripcion}</Text>}

      <Text style={styles.seccion}>Ingredientes</Text>
      {receta.ingredientes.map((ri) => (
        <Text key={ri.id} style={styles.ingrediente}>
          • {ri.cantidad} {ri.unidad} de {ri.ingrediente.nombre}
        </Text>
      ))}

      <Text style={styles.seccion}>Preparación</Text>
      <Text style={styles.pasos}>{receta.pasos || "Sin pasos cargados."}</Text>

      <View style={styles.acciones}>
        <TouchableOpacity
          style={styles.boton}
          onPress={() => navigation.navigate("RecetaForm", { recetaId })}
        >
          <Text style={styles.botonTexto}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.boton, styles.botonBorrar]} onPress={eliminar}>
          <Text style={styles.botonTexto}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  titulo: { fontSize: 24, fontWeight: "700" },
  meta: { color: "#888", marginTop: 4 },
  descripcion: { marginTop: 12, color: "#444" },
  seccion: { fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 8 },
  ingrediente: { color: "#333", marginBottom: 4 },
  pasos: { color: "#333", lineHeight: 20 },
  acciones: { flexDirection: "row", gap: 10, marginTop: 28 },
  boton: {
    flex: 1,
    backgroundColor: "#ea580c",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  botonBorrar: { backgroundColor: "#c0392b" },
  botonTexto: { color: "#fff", fontWeight: "600" },
});
