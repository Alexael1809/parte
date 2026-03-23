import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { api, Peloton, Proceso, Pnf } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { Plus, Pencil, Trash2, Loader2, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PelotonForm { nombre: string; procesoId: string; pnfId: string; }

export default function PelotonesPage() {
  const { isSuperusuario } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [modal, setModal] = useState<{ open: boolean; editing?: Peloton }>({ open: false });
  const [form, setForm] = useState<PelotonForm>({ nombre: "", procesoId: "", pnfId: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => { if (!isSuperusuario()) navigate("/"); }, []);

  const { data: pelotones, isLoading } = useQuery({
    queryKey: ["pelotones"],
    queryFn: () => api.get<Peloton[]>("/pelotones"),
  });
  const { data: procesos } = useQuery({
    queryKey: ["procesos"],
    queryFn: () => api.get<Proceso[]>("/procesos"),
  });
  const { data: pnfs } = useQuery({
    queryKey: ["pnfs"],
    queryFn: () => api.get<Pnf[]>("/pnfs"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { nombre: form.nombre, procesoId: parseInt(form.procesoId), pnfId: parseInt(form.pnfId) };
      if (modal.editing) return api.put(`/pelotones/${modal.editing.id}`, payload);
      return api.post("/pelotones", payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pelotones"] }); setModal({ open: false }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/pelotones/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pelotones"] }); setDeleteConfirm(null); },
  });

  function openNew() {
    setForm({ nombre: "", procesoId: "", pnfId: "" });
    setModal({ open: true });
  }

  function openEdit(p: Peloton) {
    setForm({ nombre: p.nombre, procesoId: String(p.procesoId), pnfId: String(p.pnfId) });
    setModal({ open: true, editing: p });
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Pelotones</h1>
            <p className="text-gray-400 text-sm mt-1">Administrar pelotones</p>
          </div>
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold">
            <Plus size={14} className="mr-1" /> Nuevo
          </Button>
        </div>

        {isLoading && <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-amber-400" /></div>}

        <div className="space-y-2">
          {pelotones?.map((p) => (
            <div key={p.id} className="bg-[#1B2B3D] border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Users size={16} className="text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{p.nombre}</p>
                  <p className="text-gray-500 text-xs">{p.procesoNombre} · {p.pnfNombre} · {p.totalPersonas} personas</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="text-gray-400 hover:text-white h-8 w-8 p-0">
                  <Pencil size={14} />
                </Button>
                {deleteConfirm === p.id ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)} className="h-8 px-2 text-gray-400">
                      <X size={12} />
                    </Button>
                    <Button size="sm" onClick={() => deleteMutation.mutate(p.id)} className="h-8 px-2 bg-red-600 hover:bg-red-500 text-white">
                      {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : "Eliminar"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(p.id)} className="text-gray-400 hover:text-red-400 h-8 w-8 p-0">
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {modal.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1B2B3D] border border-white/10 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">{modal.editing ? "Editar Pelotón" : "Nuevo Pelotón"}</h2>
                <button onClick={() => setModal({ open: false })} className="text-gray-400 hover:text-white"><X size={16} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm">Nombre</Label>
                  <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="mt-1 bg-[#243447] border-white/10 text-white" placeholder="Ej: Pelotón Alpha" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Proceso</Label>
                  <select value={form.procesoId} onChange={(e) => setForm({ ...form, procesoId: e.target.value })} className="mt-1 w-full bg-[#243447] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">Seleccionar...</option>
                    {procesos?.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">PNF</Label>
                  <select value={form.pnfId} onChange={(e) => setForm({ ...form, pnfId: e.target.value })} className="mt-1 w-full bg-[#243447] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">Seleccionar...</option>
                    {pnfs?.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setModal({ open: false })} className="flex-1 border-white/10 text-gray-300 hover:text-white">Cancelar</Button>
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.nombre || !form.procesoId || !form.pnfId} className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold">
                    {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : "Guardar"}
                  </Button>
                </div>
                {saveMutation.isError && <p className="text-red-400 text-sm">{(saveMutation.error as Error).message}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
