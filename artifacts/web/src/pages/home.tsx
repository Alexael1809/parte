import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { api, Peloton } from "@/lib/api";
import { Users, ChevronRight, Loader2, AlertCircle, Lock } from "lucide-react";

export default function HomePage() {
  const { user, isSuperusuario } = useAuth();
  const [, navigate] = useLocation();

  const { data: pelotones, isLoading, error } = useQuery({
    queryKey: ["pelotones"],
    queryFn: () => api.get<Peloton[]>("/pelotones"),
  });

  const { data: bloqueoData } = useQuery({
    queryKey: ["bloqueo"],
    queryFn: () => api.get<{ bloqueado: boolean }>("/configuracion/bloqueo"),
  });

  const bloqueado = bloqueoData?.bloqueado ?? false;
  const isColector = user?.rol === "estandar" && !user.isInvisible;
  const bloqueadoParaUser = bloqueado && isColector;

  const displayPelotones = isSuperusuario()
    ? pelotones
    : pelotones?.filter((p) => p.id === user?.pelotonId);

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Pelotones</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isSuperusuario() ? "Todos los pelotones activos" : "Tu pelotón asignado"}
          </p>
        </div>

        {bloqueadoParaUser && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <Lock size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">
              La toma de asistencia está bloqueada. Contacte al administrador.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-amber-400" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle size={14} className="text-red-400" />
            <p className="text-red-300 text-sm">Error al cargar pelotones</p>
          </div>
        )}

        {displayPelotones && displayPelotones.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay pelotones disponibles</p>
          </div>
        )}

        <div className="grid gap-3">
          {displayPelotones?.map((peloton) => (
            <button
              key={peloton.id}
              onClick={() => !bloqueadoParaUser && navigate(`/asistencia/${peloton.id}`)}
              disabled={bloqueadoParaUser}
              className="w-full text-left bg-[#1B2B3D] hover:bg-[#243447] border border-white/10 rounded-xl p-4 transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Users size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">{peloton.nombre}</div>
                    <div className="text-gray-400 text-sm">{peloton.procesoNombre}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-amber-400 font-bold">{peloton.totalPersonas}</div>
                    <div className="text-gray-500 text-xs">personas</div>
                  </div>
                  <ChevronRight size={16} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">{peloton.pnfNombre}</div>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
