import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { api, PelotonStats, ESTADO_CONFIG } from "@/lib/api";
import { BarChart2, Users, ChevronDown, ChevronUp, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-bold" style={{ color }}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function PelotonCard({ stats }: { stats: PelotonStats }) {
  const [expanded, setExpanded] = useState(false);

  const rows = [
    { key: "presente", label: "Presentes", value: stats.presentes, h: stats.presentesH, m: stats.presentesM },
    { key: "ausente", label: "Ausentes", value: stats.ausentes, h: stats.ausentesH, m: stats.ausentesM },
    { key: "comision", label: "Comisión", value: stats.comisiones, h: stats.comisionesH, m: stats.comisionesM },
    { key: "reposo", label: "Reposo", value: stats.reposos, h: stats.reposesH ?? 0, m: stats.reposesM ?? 0 },
    { key: "pasantia", label: "Pasantía", value: stats.pasantias, h: stats.pasantiasH, m: stats.pasantiasM },
    { key: "permiso", label: "Permiso", value: stats.permisos, h: stats.permisosH, m: stats.permisosM },
  ];

  return (
    <div className="bg-[#1B2B3D] border border-white/10 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-white">{stats.pelotonNombre}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{stats.procesoNombre} · {stats.pnfNombre}</p>
          </div>
          <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg">
            <Users size={12} className="text-amber-400" />
            <span className="text-amber-400 font-bold text-sm">{stats.total}</span>
          </div>
        </div>

        <div className="flex justify-between mt-3">
          {rows.slice(0, 3).map((r) => (
            <StatBadge
              key={r.key}
              label={r.label}
              value={r.value}
              color={ESTADO_CONFIG[r.key]?.color ?? "#fff"}
            />
          ))}
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 border-t border-white/10 text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? "Menos detalles" : "Ver detalles"}
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between">
              <span
                className="text-sm font-medium px-2 py-0.5 rounded"
                style={{
                  color: ESTADO_CONFIG[r.key]?.color,
                  backgroundColor: ESTADO_CONFIG[r.key]?.bg,
                }}
              >
                {r.label}
              </span>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-white font-bold">{r.value}</span>
                <span className="text-gray-500">H:{r.h} M:{r.m}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { isSuperusuario } = useAuth();
  const [, navigate] = useLocation();
  const today = new Date().toISOString().split("T")[0];
  const [fecha, setFecha] = useState(today);

  useEffect(() => {
    if (!isSuperusuario()) navigate("/");
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", fecha],
    queryFn: () => api.get<PelotonStats[]>(`/asistencias/dashboard?fecha=${fecha}`),
  });

  const totals = stats?.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      presentes: acc.presentes + s.presentes,
      ausentes: acc.ausentes + s.ausentes,
    }),
    { total: 0, presentes: 0, ausentes: 0 }
  ) ?? { total: 0, presentes: 0, ausentes: 0 };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart2 size={22} className="text-amber-400" />
              Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-1">Estadísticas globales de asistencia</p>
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

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Personal", value: totals.total, color: "text-white" },
            { label: "Presentes", value: totals.presentes, color: "text-green-400" },
            { label: "Ausentes", value: totals.ausentes, color: "text-red-400" },
          ].map((card) => (
            <div key={card.label} className="bg-[#1B2B3D] border border-white/10 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-gray-400 text-xs mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-amber-400" />
          </div>
        )}

        {stats && stats.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay datos para esta fecha</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {stats?.map((s) => (
            <PelotonCard key={s.pelotonId} stats={s} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
