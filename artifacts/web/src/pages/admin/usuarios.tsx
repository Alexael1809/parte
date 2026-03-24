import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { api, Usuario, Peloton } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2, X, UserCheck, Eye, EyeOff, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserForm {
  nombre: string; email: string; password: string; rol: string; pelotonId: string;
}

function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex === -1) return "*****";
  const domain = email.slice(atIndex + 1);
  const domainLabel = domain.split(".")[0];
  return `*****@${domainLabel}*****`;
}

export default function UsuariosPage() {
  const { isSuperusuario } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing?: Usuario }>({ open: false });
  const [form, setForm] = useState<UserForm>({ nombre: "", email: "", password: "", rol: "estandar", pelotonId: "" });
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => { if (!isSuperusuario()) navigate("/"); }, []);

  const { data: usuarios, isLoading } = useQuery({ queryKey: ["usuarios"], queryFn: () => api.get<Usuario[]>("/usuarios") });
  const { data: pelotones } = useQuery({ queryKey: ["pelotones"], queryFn: () => api.get<Peloton[]>("/pelotones") });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        nombre: form.nombre, email: form.email, rol: form.rol,
        pelotonId: form.pelotonId ? parseInt(form.pelotonId) : null,
      };
      if (form.password) payload.password = form.password;
      if (modal.editing) return api.put(`/usuarios/${modal.editing.id}`, payload);
      return api.post("/usuarios", { ...payload, password: form.password });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["usuarios"] }); setModal({ open: false }); },
  });

  const toggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.put(`/usuarios/${id}`, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  function openNew() { setForm({ nombre: "", email: "", password: "", rol: "estandar", pelotonId: "" }); setModal({ open: true }); }
  function openEdit(u: Usuario) {
    setForm({ nombre: u.nombre, email: u.email, password: "", rol: u.rol, pelotonId: u.pelotonId ? String(u.pelotonId) : "" });
    setModal({ open: true, editing: u });
  }

  const rolLabel: Record<string, string> = { superusuario: "Administrador", estandar: "Colector" };

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Usuarios</h1>
            <p className="text-gray-400 text-sm mt-1">Administrar acceso al sistema</p>
          </div>
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold">
            <Plus size={14} className="mr-1" /> Nuevo
          </Button>
        </div>

        {isLoading && <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-amber-400" /></div>}

        <div className="space-y-2">
          {usuarios?.map((u) => {
            const isAdmin = u.rol === "superusuario";
            return (
              <div key={u.id} className={`bg-[#1B2B3D] border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3 ${!u.activo ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isAdmin ? "bg-amber-500/20" : "bg-blue-500/20"}`}>
                    <UserCheck size={15} className={isAdmin ? "text-amber-400" : "text-blue-400"} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate">
                      {isAdmin ? "Administrador" : u.nombre}
                    </p>
                    <p className={`text-xs truncate ${isAdmin ? "text-amber-400/60 font-mono tracking-wide" : "text-gray-500"}`}>
                      {isAdmin ? maskEmail(u.email) : u.email}
                    </p>
                    <div className="flex gap-2 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${isAdmin ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"}`}>
                        {rolLabel[u.rol] ?? u.rol}
                      </span>
                      {u.pelotonNombre && <span className="text-xs text-gray-500">{u.pelotonNombre}</span>}
                      {!u.activo && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">Inactivo</span>}
                    </div>
                  </div>
                </div>
                {!isAdmin ? (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)} className="text-gray-400 hover:text-white h-8 w-8 p-0">
                      <Pencil size={13} />
                    </Button>
                    <button
                      onClick={() => toggleActivoMutation.mutate({ id: u.id, activo: !u.activo })}
                      className={`h-8 w-8 flex items-center justify-center rounded ${u.activo ? "text-green-400 hover:text-green-300" : "text-gray-500 hover:text-gray-300"} transition-colors`}
                    >
                      {u.activo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <ShieldOff size={15} className="text-amber-400/30" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {modal.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1B2B3D] border border-white/10 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">{modal.editing ? "Editar Usuario" : "Nuevo Usuario"}</h2>
                <button onClick={() => setModal({ open: false })} className="text-gray-400 hover:text-white"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-300 text-sm">Nombre</Label>
                  <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="mt-1 bg-[#243447] border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 bg-[#243447] border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Contraseña {modal.editing && "(dejar en blanco para no cambiar)"}</Label>
                  <div className="relative mt-1">
                    <Input type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-[#243447] border-white/10 text-white pr-10" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Rol</Label>
                  <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className="mt-1 w-full bg-[#243447] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="estandar">Colector</option>
                    <option value="superusuario">Administrador</option>
                  </select>
                </div>
                {form.rol === "estandar" && (
                  <div>
                    <Label className="text-gray-300 text-sm">Pelotón asignado</Label>
                    <select value={form.pelotonId} onChange={(e) => setForm({ ...form, pelotonId: e.target.value })} className="mt-1 w-full bg-[#243447] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                      <option value="">Sin pelotón</option>
                      {pelotones?.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setModal({ open: false })} className="flex-1 border-white/10 text-gray-300">Cancelar</Button>
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.nombre || !form.email || (!modal.editing && !form.password)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold">
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
