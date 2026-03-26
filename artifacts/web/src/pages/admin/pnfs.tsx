import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { Plus, Pencil, Trash2, Loader2, X, GraduationCap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Pnf { id: number; nombre: string; createdAt: string; }

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; pnf: Pnf }
  | { type: "delete"; pnf: Pnf };

export default function PnfsPage() {
  const { isSuperusuario } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  useEffect(() => { if (!isSuperusuario()) navigate("/"); }, []);

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [nombre, setNombre] = useState("");

  const { data: pnfs, isLoading } = useQuery<Pnf[]>({
    queryKey: ["pnfs"],
    queryFn: () => api.get<Pnf[]>("/pnfs"),
  });

  function openCreate() {
    setNombre("");
    setModal({ type: "create" });
  }

  function openEdit(pnf: Pnf) {
    setNombre(pnf.nombre);
    setModal({ type: "edit", pnf });
  }

  function closeModal() {
    setModal({ type: "none" });
    setNombre("");
  }

  const createMutation = useMutation({
    mutationFn: () => api.post("/pnfs", { nombre: nombre.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pnfs"] }); closeModal(); },
  });

  const editMutation = useMutation({
    mutationFn: (id: number) => api.put(`/pnfs/${id}`, { nombre: nombre.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pnfs"] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/pnfs/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pnfs"] }); closeModal(); },
  });

  const saving = createMutation.isPending || editMutation.isPending;
  const errorMsg =
    (createMutation.error as Error | null)?.message ||
    (editMutation.error as Error | null)?.message ||
    (deleteMutation.error as Error | null)?.message;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <GraduationCap size={22} className="text-amber-400" />
              PNFs
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Programas Nacionales de Formación
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold"
          >
            <Plus size={14} className="mr-1.5" />
            Nuevo PNF
          </Button>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-amber-400" />
          </div>
        ) : !pnfs || pnfs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <GraduationCap size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay PNFs registrados</p>
            <Button onClick={openCreate} variant="ghost" className="mt-3 text-amber-400 hover:text-amber-300">
              Crear el primero
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {pnfs.map((pnf) => (
              <div
                key={pnf.id}
                className="bg-[#1B2B3D] border border-white/10 rounded-xl px-4 py-3.5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap size={16} className="text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium leading-tight truncate">{pnf.nombre}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Creado: {new Date(pnf.createdAt).toLocaleDateString("es-VE")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(pnf)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModal({ type: "delete", pnf })}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear / editar */}
      {(modal.type === "create" || modal.type === "edit") && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1B2B3D] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold">
                {modal.type === "create" ? "Nuevo PNF" : "Editar PNF"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-300 text-sm mb-1 block">Nombre del PNF</Label>
                <Input
                  autoFocus
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nombre.trim()) {
                      modal.type === "create"
                        ? createMutation.mutate()
                        : editMutation.mutate(modal.pnf.id);
                    }
                  }}
                  className="bg-[#243447] border-white/10 text-white placeholder:text-gray-500"
                  placeholder="Ej: CRIMINALÍSTICA"
                />
              </div>

              {errorMsg && (
                <p className="text-red-400 text-sm">{errorMsg}</p>
              )}

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
                      : editMutation.mutate(modal.pnf.id)
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

      {/* Modal confirmar eliminación */}
      {modal.type === "delete" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1B2B3D] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Eliminar PNF</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <p className="text-gray-300 text-sm mb-1">
              ¿Estás seguro de que deseas eliminar:
            </p>
            <p className="text-white font-semibold mb-4">"{modal.pnf.nombre}"</p>
            <p className="text-amber-300/80 text-xs mb-5">
              Si hay pelotones asignados a este PNF, no podrás eliminarlo hasta reasignarlos.
            </p>

            {errorMsg && (
              <p className="text-red-400 text-sm mb-3">{errorMsg}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={closeModal}
                className="flex-1 border-white/10 text-gray-300 hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => deleteMutation.mutate(modal.pnf.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold"
              >
                {deleteMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <><Trash2 size={14} className="mr-1.5" />Eliminar</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
