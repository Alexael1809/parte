import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

const BASE_URL = typeof window !== "undefined"
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
  logout: () => void;
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
      const storedToken = localStorage.getItem("auth_token");
      const storedUser = localStorage.getItem("auth_user");
      if (storedToken && storedUser) {
        const cachedUser = JSON.parse(storedUser) as AuthUser;
        setToken(storedToken);
        setUser(cachedUser);

        try {
          const meRes = await fetch(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (meRes.ok) {
            const freshUser: AuthUser = await meRes.json();
            localStorage.setItem("auth_user", JSON.stringify(freshUser));
            setUser(freshUser);
          } else {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
            setToken(null);
            setUser(null);
          }
        } catch {
          // offline: use cache
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
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_user", JSON.stringify(data.usuario));
    setToken(data.token);
    setUser(data.usuario);
  }

  function logout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
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
