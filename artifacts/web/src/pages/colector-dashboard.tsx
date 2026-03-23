import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { api, PelotonStats, ESTADO_CONFIG } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BarChart2, Users, Calendar, Share2, Loader2, CheckCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatRow {
  key: string;
  label: string;
  total: number;
  h: number;
  m: number;
}

export default function ColectorDashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const today = new Date().toISOString().split("T")[0];
  const [fecha, setFecha] = useState(today);

  const pelotonId = user?.pelotonId;

  const { data: statsArr, isLoading } = useQuery({
    queryKey: ["dashboard", fecha],
    queryFn: () => api.get<PelotonStats[]>(`/asistencias/dashboard?fecha=${fecha}`),
    enabled: !!pelotonId,
  });

  const stats = statsArr?.find((s) => s.pelotonId === pelotonId);

  const rows: StatRow[] = stats ? [
    { key: "presente",  label: "Presentes",  total: stats.presentes,  h: stats.presentesH,  m: stats.presentesM  },
    { key: "ausente",   label: "Ausentes",   total: stats.ausentes,   h: stats.ausentesH,   m: stats.ausentesM   },
    { key: "comision",  label: "Comisión",   total: stats.comisiones, h: stats.comisionesH, m: stats.comisionesM },
    { key: "permiso",   label: "Permiso",    total: stats.permisos,   h: stats.permisosH,   m: stats.permisosM   },
    { key: "pasantia",  label: "Pasantía",   total: stats.pasantias,  h: stats.pasantiasH,  m: stats.pasantiasM  },
    { key: "reposo",    label: "Reposo",     total: stats.reposos,    h: stats.reposesH ?? 0, m: stats.reposesM ?? 0 },
  ] : [];

  const asistenciaTomada = stats ? (stats.presentes + stats.ausentes + stats.comisiones + stats.permisos + stats.pasantias + stats.reposos) > 0 : false;

  function exportarWhatsApp() {
    if (!stats) return;
    const dateFormatted = new Date(fecha + "T12:00:00").toLocaleDateString("es-VE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    const lines = [
      `📊 *Dashboard - ${stats.pelotonNombre}*`,
      `📅 ${dateFormatted}`,
      `🏫 ${stats.pnfNombre} | ${stats.procesoNombre}`,
      ``,
      `👥 *Total Personal: ${stats.total}*`,
      ``,
      ...rows.map((r) => {
        const emoji: Record<string, string> = {
          presente: "✅", ausente: "❌", comision: "🔵", permiso: "🔹", pasantia: "🟣", reposo: "🟠",
        };
        return `${emoji[r.key] ?? "•"} *${r.label}:* ${r.total} _(H:${r.h} M:${r.m})_`;
      }),
      ``,
      `_Generado vía Sistema de Asistencia_`,
    ];

    const text = lines.join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  if (!pelotonId) {
    return (
      <Layout>
        <div className="p-6 max-w-xl mx-auto text-center py-16">
          <Users size={40} className="mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400">No tienes un pelotón asignado. Contacta al administrador.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart2 size={22} className="text-amber-400" />
              Dashboard
            </h1>
            {stats && (
              <p className="text-gray-400 text-sm mt-0.5">{stats.pelotonNombre} · {stats.pnfNombre}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-[#1B2B3D] border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Quick action */}
        <button
          onClick={() => navigate(`/asistencia/${pelotonId}`)}
          className="w-full mb-5 flex items-center justify-between bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl p-4 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <CheckCircle size={18} className="text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-amber-300 font-medium text-sm">Tomar Asistencia de Hoy</p>
              <p className="text-amber-400/60 text-xs">{today}</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-amber-400/60 group-hover:text-amber-400" />
        </button>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-amber-400" />
          </div>
        )}

        {!isLoading && !stats && (
          <div className="text-center py-12 text-gray-400">
            <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay datos para esta fecha</p>
            <p className="text-xs mt-1">Toma la asistencia para ver las estadísticas</p>
          </div>
        )}

        {stats && (
          <>
            {/* Total card */}
            <div className="bg-[#1B2B3D] border border-white/10 rounded-xl p-5 mb-4 text-center">
              <div className="text-4xl font-bold text-white mb-1">{stats.total}</div>
              <div className="text-gray-400 text-sm">Total Personal</div>
            </div>

            {/* Stats grid */}
            <div className="space-y-2 mb-5">
              {rows.map((row) => {
                const cfg = ESTADO_CONFIG[row.key];
                const pct = stats.total > 0 ? Math.round((row.total / stats.total) * 100) : 0;
                return (
                  <div
                    key={row.key}
                    className="bg-[#1B2B3D] border border-white/10 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded"
                          style={{ color: cfg?.color, backgroundColor: cfg?.bg }}
                        >
                          {row.label}
                        </span>
                      </div>
                      <span className="text-white font-bold text-lg">{row.total}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: cfg?.color }}
                      />
                    </div>
                    {/* H/M breakdown */}
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>
                        <span className="text-blue-400 font-medium">H</span>: {row.h}
                      </span>
                      <span>
                        <span className="text-pink-400 font-medium">M</span>: {row.m}
                      </span>
                      <span className="ml-auto text-gray-500">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* WhatsApp export */}
            <Button
              onClick={exportarWhatsApp}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold h-11"
            >
              <Share2 size={16} className="mr-2" />
              Exportar por WhatsApp
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}
