import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { api, Persona, Asistencia, Estado, ESTADO_CONFIG } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Save, ArrowLeft, Loader2, AlertCircle, CheckCircle, Lock, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const ESTADOS: Estado[] = ["presente", "ausente", "comision", "reposo", "pasantia", "permiso"];
const REQUIRE_MOTIVO: Estado[] = ["comision", "reposo", "pasantia", "permiso"];

export default function AsistenciaPage() {
  const params = useParams<{ pelotonId: string }>();
  const pelotonId = parseInt(params.pelotonId ?? "0");
  const { user, isSuperusuario } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const searchFecha = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("fecha") ?? today
    : today;

  const [rows, setRows] = useState<Record<number, { estado: Estado; motivo: string }>>({});
  const [guardado, setGuardado] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [fecha] = useState(searchFecha);

  const isReadOnly = isSuperusuario() || user?.isInvisible === true;

  const { data: bloqueoData } = useQuery({
    queryKey: ["bloqueo"],
    queryFn: () => api.get<{ bloqueado: boolean }>("/configuracion/bloqueo"),
  });

  const { data: personas, isLoading: loadingPersonas } = useQuery({
    queryKey: ["personas", pelotonId],
    queryFn: () => api.get<Persona[]>(`/personas?pelotonId=${pelotonId}`),
    enabled: !!pelotonId,
  });

  const { data: asistenciasHoy, isLoading: loadingAsistencias } = useQuery({
    queryKey: ["asistencias-hoy", pelotonId, fecha],
    queryFn: () => api.get<Asistencia[]>(`/asistencias?pelotonId=${pelotonId}&fecha=${fecha}`),
    enabled: !!pelotonId,
  });

  const { data: pelotones } = useQuery({
    queryKey: ["pelotones"],
    queryFn: () => api.get<{ id: number; nombre: string }[]>("/pelotones"),
  });
  const pelotonInfo = pelotones?.find((p) => p.id === pelotonId);

  useEffect(() => {
    if (!personas || !asistenciasHoy || dataLoaded) return;
    const loaded: Record<number, { estado: Estado; motivo: string }> = {};
    personas.forEach((p) => {
      loaded[p.id] = { estado: "presente", motivo: "" };
    });
    asistenciasHoy.forEach((a) => {
      loaded[a.personaId] = { estado: a.estado, motivo: a.motivo ?? "" };
    });
    setRows(loaded);
    setDataLoaded(true);
  }, [personas, asistenciasHoy, dataLoaded]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!personas || isReadOnly) return;
      const registros = personas.map((p) => ({
        personaId: p.id,
        estado: rows[p.id]?.estado ?? "presente",
        motivo: rows[p.id]?.motivo || null,
      }));
      return api.post(`/asistencias`, { pelotonId, fecha, registros });
    },
    onSuccess: () => {
      setGuardado(true);
      queryClient.invalidateQueries({ queryKey: ["asistencias-hoy", pelotonId, fecha] });
      setTimeout(() => setGuardado(false), 3000);
    },
  });

  const isColector = user?.rol === "estandar" && !user.isInvisible;
  const bloqueado = (bloqueoData?.bloqueado ?? false) && isColector;

  if (bloqueado) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4">
            <ArrowLeft size={14} /> Volver
          </button>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <Lock size={20} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="text-white font-medium">Asistencia bloqueada</p>
              <p className="text-red-300 text-sm">El administrador ha bloqueado la toma de asistencia.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  function setEstado(personaId: number, estado: Estado) {
    if (isReadOnly) return;
    setRows((prev) => ({ ...prev, [personaId]: { ...prev[personaId], estado, motivo: "" } }));
  }

  function setMotivo(personaId: number, motivo: string) {
    if (isReadOnly) return;
    setRows((prev) => ({ ...prev, [personaId]: { ...prev[personaId], motivo } }));
  }

  const masculinos = personas?.filter((p) => p.sexo === "M") ?? [];
  const femeninos = personas?.filter((p) => p.sexo === "F") ?? [];
  const isLoading = loadingPersonas || loadingAsistencias;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm flex-shrink-0">
            <ArrowLeft size={14} /> Volver
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{pelotonInfo?.nombre ?? "Pelotón"}</h1>
            <p className="text-gray-400 text-sm">{fecha}{fecha !== today ? " (histórico)" : ""}</p>
          </div>
          {!isReadOnly && (
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !personas?.length || isLoading}
              className="bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold flex-shrink-0"
            >
              {saveMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin mr-1" /> Guardando</>
              ) : guardado ? (
                <><CheckCircle size={14} className="mr-1" /> Guardado</>
              ) : (
                <><Save size={14} className="mr-1" /> Guardar</>
              )}
            </Button>
          )}
        </div>

        {isReadOnly && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Eye size={14} className="text-blue-400 flex-shrink-0" />
            <p className="text-blue-300 text-sm">Modo visualización. Solo el colector asignado puede modificar la asistencia.</p>
          </div>
        )}

        {saveMutation.isError && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle size={14} className="text-red-400" />
            <p className="text-red-300 text-sm">{(saveMutation.error as Error)?.message}</p>
          </div>
        )}

        {!isReadOnly && asistenciasHoy && asistenciasHoy.length > 0 && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle size={14} className="text-green-400" />
            <p className="text-green-300 text-sm">Asistencia ya registrada hoy. Puedes modificarla.</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-amber-400" />
          </div>
        )}

        {!isLoading && [{ label: "Masculinos", list: masculinos }, { label: "Femeninas", list: femeninos }].map(({ label, list }) => (
          list.length > 0 && (
            <div key={label} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-gray-400" />
                <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wide">
                  {label} ({list.length})
                </h2>
              </div>
              <div className="space-y-2">
                {list.map((persona) => {
                  const row = rows[persona.id] ?? { estado: "presente" as Estado, motivo: "" };
                  const cfg = ESTADO_CONFIG[row.estado];
                  return (
                    <div key={persona.id} className={`bg-[#1B2B3D] border border-white/10 rounded-xl p-3 ${isReadOnly ? "opacity-90" : ""}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm">{persona.apellidos}, {persona.nombres}</p>
                          <p className="text-gray-500 text-xs">CI: {persona.ci}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ESTADOS.map((estado) => (
                            <button
                              key={estado}
                              onClick={() => setEstado(persona.id, estado)}
                              disabled={isReadOnly}
                              className="px-2 py-0.5 rounded text-xs font-medium transition-all border disabled:cursor-default"
                              style={{
                                backgroundColor: row.estado === estado ? ESTADO_CONFIG[estado]?.bg : "transparent",
                                color: row.estado === estado ? ESTADO_CONFIG[estado]?.color : "#6B7280",
                                borderColor: row.estado === estado ? (ESTADO_CONFIG[estado]?.color + "40") : "transparent",
                              }}
                            >
                              {ESTADO_CONFIG[estado]?.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {REQUIRE_MOTIVO.includes(row.estado) && row.motivo && (
                        <p className="mt-1.5 text-xs text-gray-400 pl-0.5">{row.motivo}</p>
                      )}
                      {!isReadOnly && REQUIRE_MOTIVO.includes(row.estado) && (
                        <input
                          type="text"
                          placeholder="Motivo..."
                          value={row.motivo}
                          onChange={(e) => setMotivo(persona.id, e.target.value)}
                          className="mt-2 w-full bg-[#243447] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500/50"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}

        {personas && personas.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay personas en este pelotón</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
