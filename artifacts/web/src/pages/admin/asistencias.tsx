import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { api, Peloton, ESTADO_CONFIG } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface DayStatus {
  fecha: string;
  totalRegistros: number;
  presentes: number;
  ausentes: number;
}

export default function AsistenciasCalendario() {
  const { isSuperusuario, user } = useAuth();
  const [, navigate] = useLocation();

  const canAccess = isSuperusuario() || user?.isInvisible;
  useEffect(() => { if (!canAccess) navigate("/"); }, [canAccess]);

  const today = new Date();
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedPeloton, setSelectedPeloton] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data: pelotones } = useQuery({ queryKey: ["pelotones"], queryFn: () => api.get<Peloton[]>("/pelotones") });

  const monthStart = new Date(viewDate.year, viewDate.month, 1).toISOString().split("T")[0];
  const monthEnd = new Date(viewDate.year, viewDate.month + 1, 0).toISOString().split("T")[0];

  const { data: monthData, isLoading } = useQuery({
    queryKey: ["asistencias-mes", viewDate.year, viewDate.month, selectedPeloton],
    queryFn: () => api.get<DayStatus[]>(`/asistencias/resumen-mes?fechaInicio=${monthStart}&fechaFin=${monthEnd}${selectedPeloton ? `&pelotonId=${selectedPeloton}` : ""}`),
  });

  const dayMap = monthData?.reduce((acc, d) => { acc[d.fecha] = d; return acc; }, {} as Record<string, DayStatus>) ?? {};

  function prevMonth() {
    setViewDate((v) => {
      if (v.month === 0) return { year: v.year - 1, month: 11 };
      return { year: v.year, month: v.month - 1 };
    });
  }
  function nextMonth() {
    setViewDate((v) => {
      if (v.month === 11) return { year: v.year + 1, month: 0 };
      return { year: v.year, month: v.month + 1 };
    });
  }

  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewDate.year, viewDate.month, 1).getDay();
  const monthName = new Date(viewDate.year, viewDate.month, 1).toLocaleString("es-VE", { month: "long", year: "numeric" });

  const days: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CalendarDays size={22} className="text-amber-400" />
              Calendario de Asistencias
            </h1>
          </div>
          {isSuperusuario() && (
            <select value={selectedPeloton} onChange={(e) => setSelectedPeloton(e.target.value)} className="bg-[#1B2B3D] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Todos los pelotones</option>
              {pelotones?.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          )}
        </div>

        <div className="bg-[#1B2B3D] border border-white/10 rounded-2xl overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-white rounded"><ChevronLeft size={18} /></button>
            <span className="text-white font-semibold capitalize">{monthName}</span>
            <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-white rounded"><ChevronRight size={18} /></button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-white/10">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
              <div key={d} className="text-center text-xs text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-amber-400" /></div>
          ) : (
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="h-14 border-b border-r border-white/5" />;
                const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayData = dayMap[dateStr];
                const isToday = dateStr === today.toISOString().split("T")[0];
                const isSelected = dateStr === selectedDay;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={`h-14 border-b border-r border-white/5 p-1 flex flex-col items-center justify-start gap-0.5 transition-colors
                      ${isSelected ? "bg-amber-500/10" : "hover:bg-white/5"}
                    `}
                  >
                    <span className={`text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center
                      ${isToday ? "bg-amber-500 text-[#0D1B2A]" : "text-gray-300"}
                    `}>{day}</span>
                    {dayData && dayData.totalRegistros > 0 && (
                      <div className="flex gap-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" title={`${dayData.presentes} presentes`} />
                        {dayData.ausentes > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-400" title={`${dayData.ausentes} ausentes`} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected day detail */}
        {selectedDay && dayMap[selectedDay] && (
          <div className="mt-4 bg-[#1B2B3D] border border-white/10 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3">{selectedDay}</h3>
            <div className="flex gap-4">
              {[
                { label: "Registros", value: dayMap[selectedDay].totalRegistros, color: "text-white" },
                { label: "Presentes", value: dayMap[selectedDay].presentes, color: "text-green-400" },
                { label: "Ausentes", value: dayMap[selectedDay].ausentes, color: "text-red-400" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-gray-500 text-xs">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400" /> Presentes</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /> Ausentes</div>
        </div>
      </div>
    </Layout>
  );
}
