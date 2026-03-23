import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { api, Proceso } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { Plus, Archive, RotateCcw, Loader2, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProcesosPage() {
  const { isSuperusuario } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState(false);
  const [nombre, setNombre] = useState("");
  const [archiveConfirm, setArchiveConfirm] = useState<number | null>(null);

  useEffect(() => { if (!isSuperusuario()) navigate("/"); }, []);

  const { data: procesos, isLoading } = useQuery({ queryKey: ["procesos"], queryFn: () => api.get<Proceso[]>("/procesos") });

  const createMutation = useMutation({
    mutationFn: () => api.post("/procesos", { nombre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procesos"] }); setModal(false); setNombre(""); },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => api.put(`/procesos/${id}/archivar`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procesos"] }); setArchiveConfirm(null); },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => api.put(`/procesos/${id}/restaurar`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procesos"] }),  qc.invalidateQueries({ queryKey: ["procesos"] }); },
  });

  const active = procesos?.filter((p) => p.activo) ?? [];
  const archived = procesos?.filter((p) => !p.activo) ?? [];

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Procesos</h1>
            <p className="text-gray-400 text-sm mt-1">Máximo 3 procesos activos simultáneos</p>
          </div>
          <Button onClick={() => setModal(true)} disabled={active.length >= 3} className="bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold">
            <Plus size={14} className="mr-1" /> Nuevo
          </Button>
        </div>

        {isLoading && <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-amber-400" /></div>}

        <h2 className="text-white font-medium text-sm mb-3">Activos ({active.length}/3)</h2>
        <div className="space-y-2 mb-6">
          {active.map((p) => (
            <div key={p.id} className="bg-[#1B2B3D] border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Layers size={14} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{p.nombre}</p>
                  <p className="text-gray-500 text-xs">Creado: {new Date(p.createdAt).toLocaleDateString("es-VE")}</p>
                </div>
              </div>
              {archiveConfirm === p.id ? (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setArchiveConfirm(null)} className="h-8 px-2 text-gray-400"><X size={12} /></Button>
                  <Button size="sm" onClick={() => archiveMutation.mutate(p.id)} className="h-8 px-2 bg-orange-600 hover:bg-orange-500 text-white">{archiveMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : "Archivar"}</Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setArchiveConfirm(p.id)} className="text-gray-400 hover:text-orange-400 h-8">
                  <Archive size={14} className="mr-1" /> Archivar
                </Button>
              )}
            </div>
          ))}
          {active.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No hay procesos activos</p>}
        </div>

        <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-1 text-gray-500 hover:text-gray-300 text-sm mb-3">
          {showArchived ? "▼" : "▶"} Archivados ({archived.length})
        </button>

        {showArchived && (
          <div className="space-y-2">
            {archived.map((p) => (
              <div key={p.id} className="bg-[#1B2B3D]/60 border border-white/5 rounded-xl p-4 flex items-center justify-between opacity-70">
                <div>
                  <p className="text-gray-300 font-medium">{p.nombre}</p>
                  <p className="text-gray-500 text-xs">Archivado: {p.fechaArchivado ? new Date(p.fechaArchivado).toLocaleDateString("es-VE") : "-"}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => restoreMutation.mutate(p.id)} disabled={active.length >= 3 || restoreMutation.isPending} className="text-gray-400 hover:text-green-400 h-8">
                  <RotateCcw size={14} className="mr-1" /> Restaurar
                </Button>
              </div>
            ))}
          </div>
        )}

        {modal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1B2B3D] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Nuevo Proceso</h2>
                <button onClick={() => setModal(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm">Nombre del proceso</Label>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 bg-[#243447] border-white/10 text-white" placeholder="Ej: Proceso 2025-I" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setModal(false)} className="flex-1 border-white/10 text-gray-300">Cancelar</Button>
                  <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !nombre} className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold">
                    {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : "Crear"}
                  </Button>
                </div>
                {createMutation.isError && <p className="text-red-400 text-sm">{(createMutation.error as Error).message}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
