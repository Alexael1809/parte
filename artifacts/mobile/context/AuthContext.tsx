import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? `${window.location.origin}/api`
  : "http://localhost:8080/api";

export type UserRole = "superusuario" | "estandar";

export interface AuthUser {
  id: number;
  email: string;
  nombre: string;
  rol: UserRole;
  pelotonId: number | null;
  pelotonNombre: string | null;
  activo: boolean;
  isInvisible?: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isSuperusuario: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await AsyncStorage.getItem("auth_token");
      const storedUser = await AsyncStorage.getItem("auth_user");
      if (storedToken && storedUser) {
        // Cargar datos del caché primero para respuesta inmediata
        const cachedUser = JSON.parse(storedUser) as AuthUser;
        setToken(storedToken);
        setUser(cachedUser);

        // Refrescar datos del servidor para obtener campos actualizados (ej: isInvisible)
        try {
          const meRes = await fetch(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (meRes.ok) {
            const freshUser: AuthUser = await meRes.json();
            await AsyncStorage.setItem("auth_user", JSON.stringify(freshUser));
            setUser(freshUser);
          } else {
            // Token inválido o expirado, limpiar sesión
            await AsyncStorage.removeItem("auth_token");
            await AsyncStorage.removeItem("auth_user");
            setToken(null);
            setUser(null);
          }
        } catch {
          // Sin conexión: usar datos en caché
        }
      }
    } catch (e) {
      console.error("Failed to load auth", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Credenciales inválidas");
    }

    const data = await response.json();
    await AsyncStorage.setItem("auth_token", data.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(data.usuario));
    setToken(data.token);
    setUser(data.usuario);
  }

  async function logout() {
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  }

  function isSuperusuario() {
    return user?.rol === "superusuario";
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isSuperusuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
