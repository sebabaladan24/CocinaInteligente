import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import RegistroScreen from "../screens/RegistroScreen";
import RecetarioScreen from "../screens/RecetarioScreen";
import RecetaDetalleScreen from "../screens/RecetaDetalleScreen";
import RecetaFormScreen from "../screens/RecetaFormScreen";
import ImportarRecetaScreen from "../screens/ImportarRecetaScreen";
import ListaComprasScreen from "../screens/ListaComprasScreen";
import SugerenciasScreen from "../screens/SugerenciasScreen";

export type AuthStackParamList = {
  Login: undefined;
  Registro: undefined;
};

export type RecetarioStackParamList = {
  RecetarioLista: undefined;
  RecetaDetalle: { recetaId: string };
  RecetaForm: { recetaId?: string };
  ImportarReceta: undefined;
};

export type MainTabParamList = {
  RecetarioTab: undefined;
  ListaComprasTab: undefined;
  SugerenciasTab: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RecetarioStack = createNativeStackNavigator<RecetarioStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function RecetarioNavigator() {
  return (
    <RecetarioStack.Navigator>
      <RecetarioStack.Screen
        name="RecetarioLista"
        component={RecetarioScreen}
        options={{ title: "Recetario" }}
      />
      <RecetarioStack.Screen
        name="RecetaDetalle"
        component={RecetaDetalleScreen}
        options={{ title: "Receta" }}
      />
      <RecetarioStack.Screen
        name="RecetaForm"
        component={RecetaFormScreen}
        options={{ title: "Nueva receta" }}
      />
      <RecetarioStack.Screen
        name="ImportarReceta"
        component={ImportarRecetaScreen}
        options={{ title: "Importar receta" }}
      />
    </RecetarioStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="RecetarioTab"
        component={RecetarioNavigator}
        options={{ title: "Recetario" }}
      />
      <Tab.Screen
        name="ListaComprasTab"
        component={ListaComprasScreen}
        options={{ title: "Lista de compras", headerShown: true }}
      />
      <Tab.Screen
        name="SugerenciasTab"
        component={SugerenciasScreen}
        options={{ title: "Qué cocino", headerShown: true }}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Registro" component={RegistroScreen} />
    </AuthStack.Navigator>
  );
}

export default function RootNavigator() {
  const { cargando, usuario } = useAuth();

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>{usuario ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>
  );
}
