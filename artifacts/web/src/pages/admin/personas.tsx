import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { api, Persona, Peloton } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { Plus, Pencil, Trash2, Loader2, X, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PersonaForm { nombres: string; apellidos: string; ci: string; sexo: string; pelotonId: string; }

export default function PersonasPage() {
  const { isSuperusuario } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterPeloton, setFilterPeloton] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing?: Persona }>({ open: false });
  const [form, setForm] = useState<PersonaForm>({ nombres: "", apellidos: "", ci: "", sexo: "M", pelotonId: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => { if (!isSuperusuario()) navigate("/"); }, []);

  const { data: personas, isLoading } = useQuery({ queryKey: ["personas-all"], queryFn: () => api.get<Persona[]>("/personas") });
  const { data: pelotones } = useQuery({ queryKey: ["pelotones"], queryFn: () => api.get<Peloton[]>("/pelotones") });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { nombres: form.nombres, apellidos: form.apellidos, ci: form.ci, sexo: form.sexo, pelotonId: parseInt(form.pelotonId) };
      if (modal.editing) return api.put(`/personas/${modal.editing.id}`, payload);
      return api.post("/personas", payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["personas-all"] }); setModal({ open: false }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/personas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["personas-all"] }); setDeleteConfirm(null); },
  });

  function openNew() { setForm({ nombres: "", apellidos: "", ci: "", sexo: "M", pelotonId: "" }); setModal({ open: true }); }
  function openEdit(p: Persona) { setForm({ nombres: p.nombres, apellidos: p.apellidos, ci: p.ci, sexo: p.sexo, pelotonId: String(p.pelotonId) }); setModal({ open: true, editing: p }); }

  // Find the selected pelotón object to show its PNF/Proceso info in real time
  const selectedPeloton = pelotones?.find((p) => String(p.id) === form.pelotonId);

  const filtered = personas?.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q) || p.ci.includes(q);
    const matchPeloton = !filterPeloton || String(p.pelotonId) === filterPeloton;
    return matchSearch && matchPeloton;
  }) ?? [];

  // Enrich pelotones for the filter dropdown label
  function pelotonLabel(p: Peloton) {
    const parts = [p.nombre];
    if (p.pnfNombre) parts.push(p.pnfNombre);
    if (p.procesoNombre) parts.push(p.procesoNombre);
    return parts.join(" — ");
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Personas</h1>
            <p className="text-gray-400 text-sm mt-1">Administrar personal ({personas?.length ?? 0} registros)</p>
          </div>
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold">
            <Plus size={14} className="mr-1" /> Nueva
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o CI..." className="pl-9 bg-[#1B2B3D] border-white/10 text-white placeholder:text-gray-500" />
          </div>
          <select
            value={filterPeloton}
            onChange={(e) => setFilterPeloton(e.target.value)}
            className="bg-[#1B2B3D] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none max-w-xs"
          >
            <option value="">Todos los pelotones</option>
            {pelotones?.map((p) => (
              <option key={p.id} value={p.id}>{pelotonLabel(p)}</option>
            ))}
          </select>
        </div>

        {isLoading && <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-amber-400" /></div>}

        {/* Lista */}
        <div className="space-y-2">
          {filtered.map((p) => {
            const peloton = pelotones?.find((pl) => pl.id === p.pelotonId);
            return (
              <div key={p.id} className="bg-[#1B2B3D] border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${p.sexo === "M" ? "bg-blue-500/20" : "bg-purple-500/20"}`}>
                    <User size={14} className={p.sexo === "M" ? "text-blue-400" : "text-purple-400"} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate">{p.apellidos}, {p.nombres}</p>
                    <p className="text-gray-500 text-xs truncate">
                      CI: {p.ci}
                      {peloton ? (
                        <>
                          {" · "}<span className="text-gray-400">{peloton.nombre}</span>
                          {peloton.pnfNombre && <> · <span className="text-amber-400/70">{peloton.pnfNombre}</span></>}
                          {peloton.procesoNombre && <> · <span className="text-gray-500">{peloton.procesoNombre}</span></>}
                        </>
                      ) : (
                        <> · {p.pelotonNombre}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="text-gray-400 hover:text-white h-8 w-8 p-0"><Pencil size={13} /></Button>
                  {deleteConfirm === p.id ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)} className="h-8 px-2 text-gray-400"><X size={12} /></Button>
                      <Button size="sm" onClick={() => deleteMutation.mutate(p.id)} className="h-8 px-2 bg-red-600 hover:bg-red-500 text-white">{deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : "Eliminar"}</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(p.id)} className="text-gray-400 hover:text-red-400 h-8 w-8 p-0"><Trash2 size={13} /></Button>
                  )}
                </div>
              </div>
            );
          })}
          {!isLoading && filtered.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No se encontraron personas</p>
          )}
        </div>

        {/* Modal crear / editar */}
        {modal.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1B2B3D] border border-white/10 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">{modal.editing ? "Editar Persona" : "Nueva Persona"}</h2>
                <button onClick={() => setModal({ open: false })} className="text-gray-400 hover:text-white"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                {([ ["apellidos", "Apellidos"], ["nombres", "Nombres"], ["ci", "Cédula de Identidad"] ] as [keyof PersonaForm, string][]).map(([field, label]) => (
                  <div key={field}>
                    <Label className="text-gray-300 text-sm">{label}</Label>
                    <Input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="mt-1 bg-[#243447] border-white/10 text-white" />
                  </div>
                ))}
                <div>
                  <Label className="text-gray-300 text-sm">Sexo</Label>
                  <select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })} className="mt-1 w-full bg-[#243447] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>

                {/* Pelotón selector + info contextual */}
                <div>
                  <Label className="text-gray-300 text-sm">Pelotón</Label>
                  <select
                    value={form.pelotonId}
                    onChange={(e) => setForm({ ...form, pelotonId: e.target.value })}
                    className="mt-1 w-full bg-[#243447] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Seleccionar pelotón...</option>
                    {pelotones?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — {p.pnfNombre} · {p.procesoNombre}
                      </option>
                    ))}
                  </select>

                  {/* Info box del pelotón seleccionado */}
                  {selectedPeloton && (
                    <div className="mt-2 bg-[#243447] border border-amber-500/20 rounded-lg px-3 py-2 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-400 text-xs">PNF:</span>
                        <span className="text-amber-300 text-xs font-medium">{selectedPeloton.pnfNombre}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-400 text-xs">Proceso:</span>
                        <span className="text-white text-xs font-medium">{selectedPeloton.procesoNombre}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-400 text-xs">Pelotón:</span>
                        <span className="text-white text-xs font-medium">{selectedPeloton.nombre}</span>
                        <span className="text-gray-500 text-xs">({selectedPeloton.totalPersonas} persona{selectedPeloton.totalPersonas !== 1 ? "s" : ""})</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setModal({ open: false })} className="flex-1 border-white/10 text-gray-300">Cancelar</Button>
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.nombres || !form.apellidos || !form.ci || !form.pelotonId} className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold">
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
