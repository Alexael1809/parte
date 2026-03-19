import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Campos requeridos", "Ingrese email y contraseña");
      return;
    }
    try {
      setIsLoading(true);
      await login(email.trim().toLowerCase(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error de acceso", e.message || "Credenciales inválidas");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.shieldContainer}>
            <Ionicons name="shield" size={52} color={Colors.gold} />
          </View>
          <Text style={styles.appTitle}>ASISTENCIA</Text>
          <Text style={styles.appSubtitle}>Sistema de Control de Pelotones</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Correo electrónico</Text>
            <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
              <Ionicons name="mail-outline" size={18} color={emailFocused ? Colors.gold : Colors.grayText} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="usuario@ejemplo.com"
                placeholderTextColor={Colors.grayText}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={passwordFocused ? Colors.gold : Colors.grayText} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputPassword]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.grayText}
                secureTextEntry={!showPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.grayText} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.loginBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.navy} />
            ) : (
              <Text style={styles.loginBtnText}>Iniciar Sesión</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>Sistema de Gestión de Asistencia Policial</Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  shieldContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.gold + "40",
  },
  appTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.white,
    letterSpacing: 4,
    marginBottom: 6,
  },
  appSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.grayText,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.grayText,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navyLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: Colors.gold,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.white,
    height: "100%",
  },
  inputPassword: {
    letterSpacing: 2,
  },
  eyeBtn: {
    padding: 4,
  },
  loginBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  loginBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.navy,
    letterSpacing: 0.5,
  },
  footer: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.grayText + "80",
    textAlign: "center",
    marginTop: 40,
  },
});
