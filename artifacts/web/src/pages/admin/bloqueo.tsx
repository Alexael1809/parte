import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { Lock, Unlock, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BloqueoPage() {
  const { isSuperusuario } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  useEffect(() => { if (!isSuperusuario()) navigate("/"); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["bloqueo"],
    queryFn: () => api.get<{ bloqueado: boolean }>("/configuracion/bloqueo"),
  });

  const toggleMutation = useMutation({
    mutationFn: (bloqueado: boolean) => api.put("/configuracion/bloqueo", { bloqueado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bloqueo"] }),
  });

  const bloqueado = data?.bloqueado ?? false;

  return (
    <Layout>
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <Shield size={22} className="text-amber-400" /> Control de Asistencia
        </h1>
        <p className="text-gray-400 text-sm mb-8">Controla si los colectores pueden registrar asistencia</p>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-amber-400" /></div>
        ) : (
          <div className="bg-[#1B2B3D] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${bloqueado ? "bg-red-500/20" : "bg-green-500/20"}`}>
                {bloqueado ? <Lock size={28} className="text-red-400" /> : <Unlock size={28} className="text-green-400" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {bloqueado ? "Asistencia Bloqueada" : "Asistencia Habilitada"}
                </h2>
                <p className="text-gray-400 text-sm mt-0.5">
                  {bloqueado
                    ? "Los colectores no pueden registrar asistencia"
                    : "Los colectores pueden registrar asistencia normalmente"}
                </p>
              </div>
            </div>

            <Button
              onClick={() => toggleMutation.mutate(!bloqueado)}
              disabled={toggleMutation.isPending}
              className={`w-full font-semibold ${
                bloqueado
                  ? "bg-green-600 hover:bg-green-500 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }`}
            >
              {toggleMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : bloqueado ? (
                <><Unlock size={16} className="mr-2" /> Habilitar Asistencia</>
              ) : (
                <><Lock size={16} className="mr-2" /> Bloquear Asistencia</>
              )}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
