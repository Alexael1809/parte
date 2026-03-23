import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { api, ESTADO_CONFIG } from "@/lib/api";
import { ArrowLeft, Loader2, User, BarChart2 } from "lucide-react";

interface PersonaHistorial {
  personaId: number;
  nombres: string;
  apellidos: string;
  ci: string;
  sexo: string;
  pelotonNombre: string;
  pnfNombre: string;
  asistencias: {
    id: number;
    fecha: string;
    estado: string;
    motivo: string | null;
  }[];
}

export default function HistorialDetallePage() {
  const params = useParams<{ personaId: string }>();
  const personaId = parseInt(params.personaId ?? "0");
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["historial-persona", personaId],
    queryFn: () => api.get<PersonaHistorial>(`/asistencias/persona/${personaId}`),
    enabled: !!personaId,
  });

  const estadoCounts = data?.asistencias.reduce((acc, a) => {
    acc[a.estado] = (acc[a.estado] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <button
          onClick={() => navigate("/admin/historial")}
          className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4"
        >
          <ArrowLeft size={14} /> Volver al historial
        </button>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-amber-400" />
          </div>
        )}

        {data && (
          <>
            {/* Persona info */}
            <div className="bg-[#1B2B3D] border border-white/10 rounded-xl p-5 mb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <User size={20} className="text-amber-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {data.apellidos}, {data.nombres}
                  </h1>
                  <p className="text-gray-400 text-sm">
                    CI: {data.ci} · {data.sexo === "M" ? "Masculino" : "Femenino"}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">{data.pelotonNombre} · {data.pnfNombre}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-[#1B2B3D] border border-white/10 rounded-xl p-4 mb-5">
              <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <BarChart2 size={14} className="text-amber-400" />
                Resumen ({data.asistencias.length} registros)
              </h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(estadoCounts).map(([estado, count]) => {
                  const cfg = ESTADO_CONFIG[estado];
                  return (
                    <div
                      key={estado}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: cfg?.bg }}
                    >
                      <span style={{ color: cfg?.color }} className="text-sm font-bold">{count}</span>
                      <span style={{ color: cfg?.color }} className="text-xs">{cfg?.label ?? estado}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline */}
            <h2 className="text-white font-semibold text-sm mb-3">Historial completo</h2>
            <div className="space-y-2">
              {data.asistencias
                .slice()
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .map((a) => {
                  const cfg = ESTADO_CONFIG[a.estado];
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between bg-[#1B2B3D] border border-white/10 rounded-lg px-4 py-2.5"
                    >
                      <span className="text-gray-300 text-sm">{a.fecha}</span>
                      <div className="flex items-center gap-2">
                        {a.motivo && (
                          <span className="text-gray-500 text-xs hidden sm:inline">{a.motivo}</span>
                        )}
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded"
                          style={{ color: cfg?.color, backgroundColor: cfg?.bg }}
                        >
                          {cfg?.label ?? a.estado}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
