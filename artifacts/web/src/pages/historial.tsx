import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { api, ESTADO_CONFIG } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, Search, Loader2, Calendar, Users, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HistorialItem {
  id: number;
  personaId: number;
  nombres: string;
  apellidos: string;
  ci: string;
  sexo: string;
  pelotonId: number;
  pelotonNombre: string;
  pnfNombre: string;
  fecha: string;
  estado: string;
  motivo: string | null;
}

export default function HistorialPage() {
  const { isSuperusuario } = useAuth();
  const [, navigate] = useLocation();
  const today = new Date().toISOString().split("T")[0];
  const [fecha, setFecha] = useState(today);
  const [search, setSearch] = useState("");

  useEffect(() => { if (!isSuperusuario()) navigate("/"); }, []);

  const { data: historial, isLoading } = useQuery({
    queryKey: ["historial", fecha],
    queryFn: () => api.get<HistorialItem[]>(`/asistencias/historial?fecha=${fecha}`),
  });

  const filtered = historial?.filter((item) => {
    const q = search.toLowerCase();
    return !q || `${item.nombres} ${item.apellidos}`.toLowerCase().includes(q) || item.ci.includes(q);
  }) ?? [];

  const grouped = filtered.reduce((acc, item) => {
    const key = item.pelotonId;
    if (!acc[key]) acc[key] = { nombre: item.pelotonNombre, pnf: item.pnfNombre, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {} as Record<number, { nombre: string; pnf: string; items: HistorialItem[] }>);

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen size={22} className="text-amber-400" />
              Historial
            </h1>
            <p className="text-gray-400 text-sm mt-1">Registros de asistencia por fecha</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-[#1B2B3D] border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar persona..."
            className="pl-9 bg-[#1B2B3D] border-white/10 text-white placeholder:text-gray-500"
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-amber-400" />
          </div>
        )}

        {!isLoading && Object.keys(grouped).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay registros para esta fecha</p>
          </div>
        )}

        <div className="space-y-4">
          {Object.entries(grouped).map(([id, group]) => (
            <div key={id} className="bg-[#1B2B3D] border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div>
                  <h3 className="text-white font-semibold">{group.nombre}</h3>
                  <p className="text-gray-400 text-xs">{group.pnf}</p>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Users size={12} />
                  <span className="text-sm">{group.items.length}</span>
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {group.items.map((item) => {
                  const cfg = ESTADO_CONFIG[item.estado];
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/admin/historial/${item.personaId}`)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors group"
                    >
                      <div className="text-left min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {item.apellidos}, {item.nombres}
                        </p>
                        <p className="text-gray-500 text-xs">CI: {item.ci} · {item.sexo === "M" ? "Masc." : "Fem."}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded"
                          style={{ color: cfg?.color, backgroundColor: cfg?.bg }}
                        >
                          {cfg?.label ?? item.estado}
                        </span>
                        {item.motivo && (
                          <span className="text-gray-500 text-xs hidden sm:inline truncate max-w-[120px]">
                            {item.motivo}
                          </span>
                        )}
                        <ArrowRight size={12} className="text-gray-600 group-hover:text-gray-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
