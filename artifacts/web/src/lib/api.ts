const BASE_URL = typeof window !== "undefined"
  ? `${window.location.origin}/api`
  : "http://localhost:8080/api";

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

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
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
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

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: "superusuario" | "estandar";
  pelotonId: number | null;
  pelotonNombre: string | null;
  activo: boolean;
  createdAt: string;
}

export const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  presente: { label: "Presente", color: "#22C55E", bg: "#0F2E1A" },
  ausente: { label: "Ausente", color: "#E53E3E", bg: "#3D1A1A" },
  comision: { label: "Comisión", color: "#3B82F6", bg: "#0F1E38" },
  reposo: { label: "Reposo", color: "#F97316", bg: "#2D1C0A" },
  pasantia: { label: "Pasantía", color: "#A855F7", bg: "#261A38" },
  permiso: { label: "Permiso", color: "#14B8A6", bg: "#0D2622" },
};
