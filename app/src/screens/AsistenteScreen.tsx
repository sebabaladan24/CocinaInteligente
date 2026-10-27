import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { api, ApiError } from "../api/client";
import { MensajeChat } from "../api/tipos";

type MensajeUI = MensajeChat & { id: string };

let contador = 0;
function id() {
  contador += 1;
  return `m-${contador}`;
}

export default function AsistenteScreen() {
  const [mensajes, setMensajes] = useState<MensajeUI[]>([
    {
      id: id(),
      rol: "assistant",
      contenido:
        "¡Hola! Contame qué ganas tenés de comer, o qué ingredientes tenés, y te ayudo a elegir una receta.",
    },
  ]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function enviar() {
    const mensaje = texto.trim();
    if (!mensaje || enviando) return;

    const historial = mensajes.map(({ rol, contenido }) => ({ rol, contenido }));
    const nuevo: MensajeUI = { id: id(), rol: "user", contenido: mensaje };
    setMensajes((prev) => [...prev, nuevo]);
    setTexto("");
    setEnviando(true);

    try {
      const datos = await api<{ respuesta: string }>("/asistente/chat", {
        method: "POST",
        body: { mensaje, historial },
      });
      setMensajes((prev) => [
        ...prev,
        { id: id(), rol: "assistant", contenido: datos.respuesta },
      ]);
    } catch (err) {
      const textoError =
        err instanceof ApiError
          ? err.message
          : "No se pudo contactar al asistente. Probá de nuevo.";
      setMensajes((prev) => [...prev, { id: id(), rol: "assistant", contenido: textoError }]);
    } finally {
      setEnviando(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={mensajes}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View
            style={[
              styles.burbuja,
              item.rol === "user" ? styles.burbujaUsuario : styles.burbujaAsistente,
            ]}
          >
            <Text style={item.rol === "user" ? styles.textoUsuario : styles.textoAsistente}>
              {item.contenido}
            </Text>
          </View>
        )}
      />

      <View style={styles.inputFila}>
        <TextInput
          style={styles.input}
          placeholder="Escribí tu mensaje..."
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={enviar}
          editable={!enviando}
        />
        <TouchableOpacity style={styles.enviarBoton} onPress={enviar} disabled={enviando}>
          {enviando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.enviarBotonTexto}>Enviar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  burbuja: { borderRadius: 12, padding: 12, marginBottom: 10, maxWidth: "85%" },
  burbujaUsuario: { backgroundColor: "#ea580c", alignSelf: "flex-end" },
  burbujaAsistente: { backgroundColor: "#f2f2f2", alignSelf: "flex-start" },
  textoUsuario: { color: "#fff" },
  textoAsistente: { color: "#222" },
  inputFila: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  enviarBoton: {
    backgroundColor: "#ea580c",
    borderRadius: 20,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  enviarBotonTexto: { color: "#fff", fontWeight: "600" },
});
