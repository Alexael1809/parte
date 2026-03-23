import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function RootLayoutNav() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.navy } }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="asistencia/[pelotonId]"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.navy },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: Colors.white },
          title: "Tomar Asistencia",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="plan-busqueda/[personaId]"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.navy },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: Colors.white },
          title: "Plan de Búsqueda",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="inasistentes/[pelotonId]"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.navy },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: Colors.white },
          title: "Ausentes",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="admin/usuarios"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.navy },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: Colors.white },
          title: "Usuarios",
        }}
      />
      <Stack.Screen
        name="admin/pelotones"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.navy },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: Colors.white },
          title: "Pelotones",
        }}
      />
      <Stack.Screen
        name="admin/personas"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.navy },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: Colors.white },
          title: "Personas",
        }}
      />
      <Stack.Screen
        name="admin/procesos"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.navy },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: Colors.white },
          title: "Procesos",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
