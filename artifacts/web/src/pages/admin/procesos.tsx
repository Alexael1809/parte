import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { api, Proceso } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import {
  Plus, Archive, RotateCcw, Loader2, X, Layers, Pencil, Check, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; proceso: Proceso };

export default function ProcesosPage() {
  const { isSuperusuario } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  useEffect(() => { if (!isSuperusuario()) navigate("/"); }, []);

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [nombre, setNombre] = useState("");
  const [archiveConfirm, setArchiveConfirm] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data: allProcesos, isLoading } = useQuery<Proceso[]>({
    queryKey: ["procesos-all"],
    queryFn: () => api.get<Proceso[]>("/procesos?includeArchived=true"),
  });

  const active   = allProcesos?.filter((p) => p.activo)  ?? [];
  const archived = allProcesos?.filter((p) => !p.activo) ?? [];

  function openCreate() {
    setNombre("");
    setModal({ type: "create" });
  }

  function openEdit(proceso: Proceso) {
    setNombre(proceso.nombre);
    setModal({ type: "edit", proceso });
  }

  function closeModal() {
    setModal({ type: "none" });
    setNombre("");
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["procesos-all"] });
    qc.invalidateQueries({ queryKey: ["procesos"] });
  };

  const createMutation = useMutation({
    mutationFn: () => api.post("/procesos", { nombre: nombre.trim() }),
    onSuccess: () => { invalidate(); closeModal(); },
  });

  const editMutation = useMutation({
    mutationFn: (id: number) => api.put(`/procesos/${id}`, { nombre: nombre.trim() }),
    onSuccess: () => { invalidate(); closeModal(); },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => api.put(`/procesos/${id}`, { activo: false }),
    onSuccess: () => { invalidate(); setArchiveConfirm(null); },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => api.put(`/procesos/${id}`, { activo: true }),
    onSuccess: () => { invalidate(); },
  });

  const saving = createMutation.isPending || editMutation.isPending;
  const errorMsg =
    (createMutation.error as Error | null)?.message ||
    (editMutation.error as Error | null)?.message;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layers size={22} className="text-amber-400" />
              Procesos
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Máximo 3 procesos activos simultáneos</p>
          </div>
          <Button
            onClick={openCreate}
            disabled={active.length >= 3}
            className="bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold disabled:opacity-40"
          >
            <Plus size={14} className="mr-1.5" />
            Nuevo
          </Button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-amber-400" />
          </div>
        )}

        {/* Activos */}
        {!isLoading && (
          <>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
              Activos ({active.length}/3)
            </p>
            <div className="space-y-2 mb-6">
              {active.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-6">No hay procesos activos</p>
              )}
              {active.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#1B2B3D] border border-white/10 rounded-xl px-4 py-3.5 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Layers size={15} className="text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{p.nombre}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Creado: {new Date(p.createdAt).toLocaleDateString("es-VE")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Editar */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setArchiveConfirm(null); openEdit(p); }}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10"
                    >
                      <Pencil size={14} />
                    </Button>

                    {/* Archivar con confirmación inline */}
                    {archiveConfirm === p.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setArchiveConfirm(null)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                        >
                          <X size={13} />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => archiveMutation.mutate(p.id)}
                          disabled={archiveMutation.isPending}
                          className="h-8 px-3 bg-orange-600 hover:bg-orange-500 text-white text-xs"
                        >
                          {archiveMutation.isPending
                            ? <Loader2 size={12} className="animate-spin" />
                            : "Archivar"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setArchiveConfirm(p.id)}
                        className="h-8 px-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 text-xs gap-1"
                      >
                        <Archive size={13} />
                        <span className="hidden sm:inline">Archivar</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Archivados */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm mb-3 transition-colors"
            >
              {showArchived ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Archivados ({archived.length})
            </button>

            {showArchived && (
              <div className="space-y-2">
                {archived.length === 0 && (
                  <p className="text-gray-600 text-sm text-center py-4">Sin archivados</p>
                )}
                {archived.map((p) => (
                  <div
                    key={p.id}
                    className="bg-[#1B2B3D]/50 border border-white/5 rounded-xl px-4 py-3.5 flex items-center gap-3 opacity-70"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Layers size={15} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 font-medium truncate">{p.nombre}</p>
                      <p className="text-gray-600 text-xs mt-0.5">
                        Archivado: {p.fechaArchivado
                          ? new Date(p.fechaArchivado).toLocaleDateString("es-VE")
                          : "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Editar archivado */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(p)}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-amber-400 hover:bg-amber-500/10"
                      >
                        <Pencil size={14} />
                      </Button>
                      {/* Restaurar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => restoreMutation.mutate(p.id)}
                        disabled={active.length >= 3 || restoreMutation.isPending}
                        className="h-8 px-2 text-gray-500 hover:text-green-400 hover:bg-green-500/10 text-xs gap-1 disabled:opacity-40"
                      >
                        {restoreMutation.isPending
                          ? <Loader2 size={12} className="animate-spin" />
                          : <><RotateCcw size={13} /><span className="hidden sm:inline">Restaurar</span></>}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal crear / editar */}
      {(modal.type === "create" || modal.type === "edit") && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1B2B3D] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold">
                {modal.type === "create" ? "Nuevo Proceso" : "Editar Proceso"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-300 text-sm mb-1 block">Nombre del proceso</Label>
                <Input
                  autoFocus
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nombre.trim()) {
                      modal.type === "create"
                        ? createMutation.mutate()
                        : editMutation.mutate(modal.proceso.id);
                    }
                  }}
                  className="bg-[#243447] border-white/10 text-white placeholder:text-gray-500"
                  placeholder="Ej: Proceso 2025-I"
                />
              </div>

              {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  className="flex-1 border-white/10 text-gray-300 hover:bg-white/5"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() =>
                    modal.type === "create"
                      ? createMutation.mutate()
                      : editMutation.mutate(modal.proceso.id)
                  }
                  disabled={saving || !nombre.trim()}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <><Check size={14} className="mr-1.5" />{modal.type === "create" ? "Crear" : "Guardar"}</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
