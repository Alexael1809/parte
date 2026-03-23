import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? `${window.location.origin}/api`
  : "http://localhost:8080/api";

async function getHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem("auth_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Error ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: any) => request<T>("POST", path, body),
  put: <T>(path: string, body: any) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

export type Estado = "ausente" | "presente" | "comision" | "reposo" | "pasantia" | "permiso";

export interface Persona {
  id: number;
  nombres: string;
  apellidos: string;
  ci: string;
  sexo: "M" | "F";
  pelotonId: number;
  pelotonNombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface Peloton {
  id: number;
  nombre: string;
  procesoId: number;
  procesoNombre: string;
  pnfId: number;
  pnfNombre: string;
  totalPersonas: number;
  createdAt: string;
}

export interface Proceso {
  id: number;
  nombre: string;
  activo: boolean;
  fechaArchivado: string | null;
  createdAt: string;
}

export interface Pnf {
  id: number;
  nombre: string;
  createdAt: string;
}

export interface Asistencia {
  id: number;
  personaId: number;
  personaNombres: string;
  personaApellidos: string;
  personaCi: string;
  personaSexo: string;
  pelotonId: number;
  fecha: string;
  estado: Estado;
  motivo: string | null;
  usuarioId: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanBusqueda {
  id: number;
  personaId: number;
  telefono1: string | null;
  telefono2: string | null;
  telefono3: string | null;
  direccion: string | null;
  lugarOrigen: string | null;
}

export interface PelotonStats {
  pelotonId: number;
  pelotonNombre: string;
  pnfNombre: string;
  procesoNombre: string;
  total: number;
  presentes: number;
  presentesH: number;
  presentesM: number;
  ausentes: number;
  ausentesH: number;
  ausentesM: number;
  comisiones: number;
  comisionesH: number;
  comisionesM: number;
  reposos: number;
  reposesH: number;
  reposesM: number;
  pasantias: number;
  pasantiasH: number;
  pasantiasM: number;
  permisos: number;
  permisosH: number;
  permisosM: number;
}

export interface PersonaEstadoItem {
  personaId: number;
  nombres: string;
  apellidos: string;
  ci: string;
  sexo: string;
  pelotonNombre: string;
  pnfNombre: string;
  procesoNombre: string;
  estado: string;
  motivo: string | null;
}

export interface HistorialItem {
  id: number;
  personaId: number;
  nombres: string;
  apellidos: string;
  ci: string;
  sexo: string;
  pelotonId: number;
  pelotonNombre: string;
  pnfNombre: string;
  fecha: string;
  estado: Estado;
  motivo: string | null;
}

export type InasistentePerson = PersonaEstadoItem;
