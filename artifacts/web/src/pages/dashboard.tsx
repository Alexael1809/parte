import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { api, PelotonStats, ESTADO_CONFIG } from "@/lib/api";
import {
  BarChart2, Users, ChevronDown, ChevronUp, Loader2,
  Calendar, Share2, ChevronRight, X, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";

const STAT_ROWS = [
  { key: "presente",  label: "Presentes",  emoji: "✅", get: (s: PelotonStats) => ({ v: s.presentes,  h: s.presentesH,  m: s.presentesM  }) },
  { key: "ausente",   label: "Ausentes",   emoji: "❌", get: (s: PelotonStats) => ({ v: s.ausentes,   h: s.ausentesH,   m: s.ausentesM   }) },
  { key: "comision",  label: "Comisión",   emoji: "🔵", get: (s: PelotonStats) => ({ v: s.comisiones, h: s.comisionesH, m: s.comisionesM }) },
  { key: "permiso",   label: "Permiso",    emoji: "🔹", get: (s: PelotonStats) => ({ v: s.permisos,   h: s.permisosH,   m: s.permisosM   }) },
  { key: "pasantia",  label: "Pasantía",   emoji: "🟣", get: (s: PelotonStats) => ({ v: s.pasantias,  h: s.pasantiasH,  m: s.pasantiasM  }) },
  { key: "reposo",    label: "Reposo",     emoji: "🟠", get: (s: PelotonStats) => ({ v: s.reposos,    h: s.reposesH ?? 0, m: s.reposesM ?? 0 }) },
];

function buildWhatsAppText(stats: PelotonStats[], fecha: string, scope: "all" | number): string {
  const dateFormatted = new Date(fecha + "T12:00:00").toLocaleDateString("es-VE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  if (scope === "all") {
    const totals = stats.reduce((acc, s) => ({
      total:     acc.total     + s.total,
      presentes: acc.presentes + s.presentes, presentesH: acc.presentesH + s.presentesH, presentesM: acc.presentesM + s.presentesM,
      ausentes:  acc.ausentes  + s.ausentes,  ausentesH:  acc.ausentesH  + s.ausentesH,  ausentesM:  acc.ausentesM  + s.ausentesM,
      comisiones:acc.comisiones+ s.comisiones,comisionesH:acc.comisionesH+ s.comisionesH,comisionesM:acc.comisionesM+ s.comisionesM,
      permisos:  acc.permisos  + s.permisos,  permisosH:  acc.permisosH  + s.permisosH,  permisosM:  acc.permisosM  + s.permisosM,
      pasantias: acc.pasantias + s.pasantias, pasantiasH: acc.pasantiasH + s.pasantiasH, pasantiasM: acc.pasantiasM + s.pasantiasM,
      reposos:   acc.reposos   + s.reposos,   reposesH:   (acc.reposesH ?? 0) + (s.reposesH ?? 0), reposesM: (acc.reposesM ?? 0) + (s.reposesM ?? 0),
    }), {
      total:0, presentes:0, presentesH:0, presentesM:0,
      ausentes:0, ausentesH:0, ausentesM:0,
      comisiones:0, comisionesH:0, comisionesM:0,
      permisos:0, permisosH:0, permisosM:0,
      pasantias:0, pasantiasH:0, pasantiasM:0,
      reposos:0, reposesH:0, reposesM:0,
    } as PelotonStats & { total: number });

    const procesoNombre = stats[0]?.procesoNombre ?? "Proceso";

    const lines = [
      `📊 *Dashboard General — ${procesoNombre}*`,
      `📅 ${dateFormatted}`,
      ``,
      `👥 *Total General: ${totals.total}*`,
      ``,
      ...STAT_ROWS.map((r) => {
        const d = r.get(totals as unknown as PelotonStats);
        return `${r.emoji} *${r.label}:* ${d.v} _(H:${d.h} M:${d.m})_`;
      }),
      ``,
      `━━━ Desglose por Pelotón ━━━`,
      ``,
      ...stats.map((s) =>
        `📌 *${s.pelotonNombre}* — ${s.total} pax\n   ✅${s.presentes} ❌${s.ausentes} 🔵${s.comisiones} 🔹${s.permisos} 🟣${s.pasantias} 🟠${s.reposos}`
      ),
      ``,
      `_Generado vía Sistema de Asistencia_`,
    ];
    return lines.join("\n");
  } else {
    const s = stats.find((x) => x.pelotonId === scope);
    if (!s) return "";
    const lines = [
      `📊 *Dashboard — ${s.pelotonNombre}*`,
      `📅 ${dateFormatted}`,
      `🏫 ${s.pnfNombre} | ${s.procesoNombre}`,
      ``,
      `👥 *Total Personal: ${s.total}*`,
      ``,
      ...STAT_ROWS.map((r) => {
        const d = r.get(s);
        return `${r.emoji} *${r.label}:* ${d.v} _(H:${d.h} M:${d.m})_`;
      }),
      ``,
      `_Generado vía Sistema de Asistencia_`,
    ];
    return lines.join("\n");
  }
}

function WhatsAppExporter({ stats, fecha }: { stats: PelotonStats[]; fecha: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function share(scope: "all" | number) {
    const text = buildWhatsAppText(stats, fecha, scope);
    if (text) window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        onClick={() => setOpen(!open)}
        className="bg-green-600 hover:bg-green-500 text-white font-semibold h-9 px-3 text-sm"
      >
        <Share2 size={14} className="mr-1.5" />
        Exportar WhatsApp
        <ChevronDown size={12} className="ml-1.5" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#1B2B3D] border border-white/10 rounded-xl shadow-xl z-50 min-w-[220px] overflow-hidden">
          <button
            onClick={() => share("all")}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors border-b border-white/10"
          >
            <BarChart2 size={14} className="text-amber-400" />
            General (todos los pelotones)
          </button>
          {stats.map((s) => (
            <button
              key={s.pelotonId}
              onClick={() => share(s.pelotonId)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors"
            >
              <Users size={14} className="text-gray-500" />
              {s.pelotonNombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PelotonCard({ stats, fecha }: { stats: PelotonStats; fecha: string }) {
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();

  return (
    <div className="bg-[#1B2B3D] border border-white/10 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white leading-tight">{stats.pelotonNombre}</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{stats.procesoNombre} · {stats.pnfNombre}</p>
          </div>
          <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg flex-shrink-0">
            <Users size={12} className="text-amber-400" />
            <span className="text-amber-400 font-bold text-sm">{stats.total}</span>
          </div>
        </div>

        {/* All stats with H/M */}
        <div className="space-y-1.5">
          {STAT_ROWS.map((row) => {
            const d = row.get(stats);
            const pct = stats.total > 0 ? Math.round((d.v / stats.total) * 100) : 0;
            const cfg = ESTADO_CONFIG[row.key];
            return (
              <div key={row.key} className="flex items-center gap-2">
                <span
                  className="text-xs font-medium w-20 flex-shrink-0 px-1.5 py-0.5 rounded text-center"
                  style={{ color: cfg?.color, backgroundColor: cfg?.bg }}
                >
                  {row.label}
                </span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg?.color }} />
                </div>
                <span className="text-white font-bold text-sm w-5 text-right">{d.v}</span>
                <span className="text-gray-500 text-xs w-16 flex-shrink-0">H:{d.h} M:{d.m}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => navigate(`/asistencia/${stats.pelotonId}?fecha=${fecha}`)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-white/10 text-xs text-amber-400/70 hover:text-amber-400 hover:bg-white/5 transition-colors font-medium"
      >
        Ver registro individual
        <ChevronRight size={12} />
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { isSuperusuario, user } = useAuth();
  const [, navigate] = useLocation();
  const today = new Date().toISOString().split("T")[0];
  const [fecha, setFecha] = useState(today);

  useEffect(() => {
    if (!isSuperusuario() && !user?.isInvisible) navigate("/");
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", fecha],
    queryFn: () => api.get<PelotonStats[]>(`/asistencias/dashboard?fecha=${fecha}`),
  });

  const totals = stats?.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      presentes: acc.presentes + s.presentes,
      presentesH: acc.presentesH + s.presentesH,
      presentesM: acc.presentesM + s.presentesM,
      ausentes: acc.ausentes + s.ausentes,
      ausentesH: acc.ausentesH + s.ausentesH,
      ausentesM: acc.ausentesM + s.ausentesM,
      comisiones: acc.comisiones + s.comisiones,
      comisionesH: acc.comisionesH + s.comisionesH,
      comisionesM: acc.comisionesM + s.comisionesM,
      permisos: acc.permisos + s.permisos,
      permisosH: acc.permisosH + s.permisosH,
      permisosM: acc.permisosM + s.permisosM,
      pasantias: acc.pasantias + s.pasantias,
      pasantiasH: acc.pasantiasH + s.pasantiasH,
      pasantiasM: acc.pasantiasM + s.pasantiasM,
      reposos: acc.reposos + s.reposos,
      reposesH: (acc.reposesH ?? 0) + (s.reposesH ?? 0),
      reposesM: (acc.reposesM ?? 0) + (s.reposesM ?? 0),
    }),
    {
      total: 0, presentes: 0, presentesH: 0, presentesM: 0,
      ausentes: 0, ausentesH: 0, ausentesM: 0,
      comisiones: 0, comisionesH: 0, comisionesM: 0,
      permisos: 0, permisosH: 0, permisosM: 0,
      pasantias: 0, pasantiasH: 0, pasantiasM: 0,
      reposos: 0, reposesH: 0, reposesM: 0,
    } as PelotonStats
  );

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart2 size={22} className="text-amber-400" />
              Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Estadísticas globales de asistencia</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="bg-[#1B2B3D] border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500/50"
              />
            </div>
            {stats && stats.length > 0 && (
              <WhatsAppExporter stats={stats} fecha={fecha} />
            )}
          </div>
        </div>

        {/* Global summary */}
        {totals && (totals.total > 0 || (stats && stats.length > 0)) && (
          <div className="bg-[#1B2B3D] border border-white/10 rounded-xl p-4 mb-5">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">Resumen General</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totals.total}</div>
                <div className="text-gray-500 text-xs">Total</div>
              </div>
              {STAT_ROWS.slice(0, 3).map((row) => {
                const d = row.get(totals);
                return (
                  <div key={row.key} className="text-center">
                    <div className="text-xl font-bold" style={{ color: ESTADO_CONFIG[row.key]?.color }}>{d.v}</div>
                    <div className="text-gray-500 text-xs">{row.label}</div>
                    <div className="text-gray-600 text-xs">H:{d.h} M:{d.m}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
              {STAT_ROWS.slice(3).map((row) => {
                const d = row.get(totals);
                return (
                  <div key={row.key} className="text-center">
                    <div className="text-lg font-bold" style={{ color: ESTADO_CONFIG[row.key]?.color }}>{d.v}</div>
                    <div className="text-gray-500 text-xs">{row.label}</div>
                    <div className="text-gray-600 text-xs">H:{d.h} M:{d.m}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-amber-400" />
          </div>
        )}

        {stats && stats.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-400">
            <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay datos para esta fecha</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {stats?.map((s) => (
            <PelotonCard key={s.pelotonId} stats={s} fecha={fecha} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
