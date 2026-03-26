import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle,
  Loader2, Download, ChevronDown, ChevronUp, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

const REQUIRED_COLS = ["cedula", "nombres", "apellidos", "genero", "pnf", "proceso"] as const;

type RawFila = Record<string, string>;
type Resultado = { fila: number; cedula: string; estado: "ok" | "error"; mensaje: string };

interface ImportResponse {
  total: number;
  importados: number;
  errores: number;
  resultados: Resultado[];
}

function descargarPlantilla() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["cedula", "nombres", "apellidos", "genero", "pnf", "proceso"],
    ["12345678", "Juan Carlos", "Pérez González", "M", "Derecho Penal", "IV Proceso"],
    ["87654321", "María Isabel", "Rodríguez López", "F", "Derecho Penal", "IV Proceso"],
  ]);
  ws["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 8 }, { wch: 24 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Personas");
  XLSX.writeFile(wb, "plantilla_importacion.xlsx");
}

export default function ImportarPage() {
  const { isSuperusuario } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => { if (!isSuperusuario()) navigate("/"); }, []);

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [filas, setFilas] = useState<RawFila[]>([]);
  const [colError, setColError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ImportResponse | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [preview, setPreview] = useState<RawFila[]>([]);

  function parseFile(file: File) {
    setResultado(null);
    setColError(null);
    setFilas([]);
    setPreview([]);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: RawFila[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rows.length === 0) {
          setColError("El archivo está vacío o no tiene datos.");
          return;
        }

        const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim());
        const missing = REQUIRED_COLS.filter((c) => !headers.includes(c));
        if (missing.length > 0) {
          setColError(`Columnas faltantes: ${missing.map((c) => `"${c}"`).join(", ")}. El archivo debe tener exactamente: ${REQUIRED_COLS.join(", ")}.`);
          return;
        }

        const normalized: RawFila[] = rows.map((r) => {
          const entry: RawFila = {};
          for (const col of REQUIRED_COLS) {
            const key = Object.keys(r).find((k) => k.toLowerCase().trim() === col) ?? col;
            entry[col] = String(r[key] ?? "").trim();
          }
          return entry;
        });

        setFilas(normalized);
        setPreview(normalized.slice(0, 5));
      } catch {
        setColError("No se pudo leer el archivo. Asegúrate de que sea un archivo Excel válido (.xlsx o .xls).");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }

  async function handleImportar() {
    if (filas.length === 0) return;
    setLoading(true);
    try {
      const res = await api.post<ImportResponse>("/personas/importar", { filas });
      setResultado(res);
      setShowAll(false);
    } catch (err: any) {
      setColError(err?.message ?? "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  const okCount = resultado?.resultados.filter((r) => r.estado === "ok").length ?? 0;
  const errCount = resultado?.resultados.filter((r) => r.estado === "error").length ?? 0;
  const visibleResultados = showAll
    ? (resultado?.resultados ?? [])
    : (resultado?.resultados ?? []).slice(0, 20);

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet size={22} className="text-amber-400" />
              Importar Personas
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Carga masiva desde archivo Excel (.xlsx / .xls)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={descargarPlantilla}
            className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
          >
            <Download size={14} className="mr-1.5" />
            Plantilla
          </Button>
        </div>

        {/* Columnas requeridas */}
        <div className="bg-[#1B2B3D] border border-white/10 rounded-xl p-4 mb-5 flex flex-wrap gap-2 items-center">
          <Info size={14} className="text-amber-400 flex-shrink-0" />
          <span className="text-gray-400 text-sm">Columnas requeridas:</span>
          {REQUIRED_COLS.map((c) => (
            <span key={c} className="bg-amber-500/10 text-amber-300 text-xs px-2 py-0.5 rounded font-mono">
              {c}
            </span>
          ))}
          <span className="text-gray-500 text-xs ml-1">
            · genero: <span className="text-white font-medium">M</span> o <span className="text-white font-medium">F</span>
          </span>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all mb-5 ${
            dragging
              ? "border-amber-400 bg-amber-500/10"
              : "border-white/15 hover:border-white/30 hover:bg-white/3"
          }`}
        >
          <Upload size={32} className={`mx-auto mb-3 ${dragging ? "text-amber-400" : "text-gray-500"}`} />
          {fileName ? (
            <>
              <p className="text-white font-medium">{fileName}</p>
              <p className="text-gray-400 text-sm mt-1">
                {filas.length} fila{filas.length !== 1 ? "s" : ""} detectada{filas.length !== 1 ? "s" : ""}
                {colError ? "" : " · haz clic para cambiar el archivo"}
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-300 font-medium">Arrastra el archivo aquí o haz clic para seleccionar</p>
              <p className="text-gray-500 text-sm mt-1">Formatos aceptados: .xlsx, .xls</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {/* Error de columnas */}
        {colError && (
          <div className="flex gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{colError}</p>
          </div>
        )}

        {/* Preview de datos */}
        {filas.length > 0 && !colError && !resultado && (
          <div className="bg-[#1B2B3D] border border-white/10 rounded-xl overflow-hidden mb-5">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <p className="text-white text-sm font-medium">
                Vista previa — {filas.length} fila{filas.length !== 1 ? "s" : ""} encontradas
              </p>
              {filas.length > 5 && (
                <span className="text-gray-500 text-xs">Mostrando primeras 5</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {REQUIRED_COLS.map((c) => (
                      <th key={c} className="text-left px-4 py-2.5 text-gray-400 font-medium text-xs uppercase tracking-wide">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      {REQUIRED_COLS.map((c) => (
                        <td key={c} className="px-4 py-2.5 text-gray-200 text-xs truncate max-w-[140px]">
                          {row[c] || <span className="text-gray-600 italic">vacío</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-white/10">
              <Button
                onClick={handleImportar}
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold"
              >
                {loading ? (
                  <><Loader2 size={15} className="mr-2 animate-spin" />Procesando...</>
                ) : (
                  <><Upload size={15} className="mr-2" />Importar {filas.length} fila{filas.length !== 1 ? "s" : ""}</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Resultados */}
        {resultado && (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-[#1B2B3D] border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">{resultado.total}</div>
                <div className="text-gray-400 text-xs">Total filas</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">{okCount}</div>
                <div className="text-gray-400 text-xs">Importadas</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-400 mb-1">{errCount}</div>
                <div className="text-gray-400 text-xs">Con errores</div>
              </div>
            </div>

            {/* Tabla de resultados */}
            <div className="bg-[#1B2B3D] border border-white/10 rounded-xl overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <p className="text-white text-sm font-medium">Resultado por fila</p>
                {resultado.resultados.length > 20 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                  >
                    {showAll ? <><ChevronUp size={12} /> Ver menos</> : <><ChevronDown size={12} /> Ver todos ({resultado.resultados.length})</>}
                  </button>
                )}
              </div>
              <div className="divide-y divide-white/5">
                {visibleResultados.map((r) => (
                  <div key={r.fila} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {r.estado === "ok"
                        ? <CheckCircle size={16} className="text-green-400" />
                        : <XCircle size={16} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-500 text-xs">Fila {r.fila}</span>
                        {r.cedula && (
                          <span className="text-gray-300 text-xs font-mono bg-white/5 px-1.5 py-0.5 rounded">
                            CI: {r.cedula}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm mt-0.5 ${r.estado === "ok" ? "text-green-300" : "text-red-300"}`}>
                        {r.mensaje}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones post-importación */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => { setResultado(null); setFilas([]); setFileName(null); setPreview([]); }}
                className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
              >
                Importar otro archivo
              </Button>
              {okCount > 0 && (
                <Button
                  onClick={() => navigate("/admin/personas")}
                  className="bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] font-semibold"
                >
                  Ver personas importadas
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
