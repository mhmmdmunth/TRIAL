import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Terminal,
  Download,
  Upload,
  RotateCcw,
  Play,
  Table as TableIcon,
  Check,
  AlertCircle,
  Code,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { sqliteService } from '../services/sqliteService';
import { PersistenceDiagnosticReport } from '../utils/persistenceDiagnostics';

interface SqliteConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vesselName: string;
  onConfirm?: (title: string, message: string, onConfirm: () => void) => void;
  onAlert?: (title: string, message: string) => void;
}

export const SqliteConsoleModal: React.FC<SqliteConsoleModalProps> = ({
  isOpen,
  onClose,
  vesselName,
  onConfirm,
  onAlert,
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'query' | 'backup' | 'diagnostics'>('tables');
  const [selectedTable, setSelectedTable] = useState<string>('work_items');
  const [sqlQuery, setSqlQuery] = useState<string>(
    'SELECT item_no, description, type, d1, d2, d3, qty, unit, weight_kg, total_price FROM work_items WHERE weight_kg > 0 ORDER BY weight_kg DESC LIMIT 15;'
  );
  const [queryResult, setQueryResult] = useState<{
    columns: string[];
    values: any[][];
    error?: string;
  } | null>(null);
  const [diagnosticReport, setDiagnosticReport] = useState<PersistenceDiagnosticReport | null>(null);

  const handleRunDiagnostics = () => {
    const report = sqliteService.verifyPersistence();
    setDiagnosticReport(report);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && (e.key === 'Escape' || e.key === 'Esc')) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tables = [
    { name: 'work_items', label: 'Work Items (Pekerjaan I - XI)' },
    { name: 'defect_surveys', label: 'Defect Surveys (Survey Lapangan)' },
    { name: 'work_categories', label: 'Work Categories' },
    { name: 'vessels', label: 'Vessel Specification' },
    { name: 'projects', label: 'Project Schedule' },
    { name: 'signatures', label: 'Signatures' },
  ];

  const handleRunQuery = (queryToRun?: string) => {
    const q = queryToRun || sqlQuery;
    const res = sqliteService.runRawQuery(q);
    setQueryResult(res);
  };

  const handleSelectTable = (tbl: string) => {
    setSelectedTable(tbl);
    const q = `SELECT * FROM ${tbl} LIMIT 25;`;
    setSqlQuery(q);
    handleRunQuery(q);
  };

  const handleDownloadBinary = () => {
    const bytes = sqliteService.exportDatabaseBinary();
    if (!bytes) return;
    const blob = new Blob([bytes], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipyard_${vesselName.replace(/[^a-zA-Z0-9]/g, '_')}.sqlite`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSql = () => {
    const dump = sqliteService.exportSqlDump();
    const blob = new Blob([dump], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipyard_${vesselName.replace(/[^a-zA-Z0-9]/g, '_')}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const buffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);
      await sqliteService.importDatabaseBinary(bytes);
      
      if (onAlert) {
        onAlert('Impor Berhasil', 'Database SQLite berhasil diimpor!');
      } else {
        alert('Database SQLite berhasil diimpor!');
      }
      
      handleRunQuery('SELECT * FROM work_items LIMIT 10;');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleResetDb = () => {
    const performReset = () => {
      sqliteService.resetDatabase();
      if (onAlert) {
        onAlert('Reset Berhasil', 'Database SQLite telah di-reset ke data default.');
      } else {
        alert('Database SQLite telah di-reset ke data default.');
      }
      handleRunQuery('SELECT * FROM work_items LIMIT 10;');
    };

    if (onConfirm) {
      onConfirm(
        'Reset Database Local',
        'Yakin ingin me-reset database SQLite local ke data awal standar TB. KSA BINTANG? Seluruh perubahan lokal Anda akan hilang.',
        performReset
      );
    } else if (confirm('Yakin ingin me-reset database ke data awal standar TB. KSA BINTANG?')) {
      performReset();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2.5 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full h-[90vh] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                SQLite Local Database Manager
              </h3>
              <p className="text-[11px] text-slate-400">
                Database relasional offline (WebAssembly SQLite) terintegrasi pada browser.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="px-3 sm:px-5 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2 text-xs font-medium shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('tables');
              handleSelectTable(selectedTable);
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'tables'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tabel Data</span>
          </button>

          <button
            onClick={() => setActiveTab('query')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'query'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SQL Query Console</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'backup'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor / Impor .sqlite</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('diagnostics');
              handleRunDiagnostics();
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'diagnostics'
                ? 'bg-emerald-800 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verifikasi Preservasi Data</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'tables' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {tables.map((tbl) => (
                  <button
                    key={tbl.name}
                    onClick={() => handleSelectTable(tbl.name)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      selectedTable === tbl.name
                        ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tbl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'query' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tulis Kueri SQL (SELECT, INSERT, UPDATE, DELETE):
                </label>
                <div className="relative">
                  <textarea
                    rows={4}
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    placeholder="SELECT * FROM work_items WHERE weight_kg > 0;"
                  />
                  <button
                    onClick={() => handleRunQuery()}
                    className="absolute right-3 bottom-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Jalankan SQL</span>
                  </button>
                </div>
              </div>

              {/* Sample Quick Queries */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Contoh Kueri:</span>
                <button
                  onClick={() => {
                    const q = 'SELECT category_id, COUNT(*) as jml_item, SUM(weight_kg) as total_kg, SUM(total_price) as total_rp FROM work_items GROUP BY category_id;';
                    setSqlQuery(q);
                    handleRunQuery(q);
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px]"
                >
                  Group Tonase per Kategori
                </button>
                <button
                  onClick={() => {
                    const q = 'SELECT location_zone, defect_description, calculated_weight_kg FROM defect_surveys;';
                    setSqlQuery(q);
                    handleRunQuery(q);
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px]"
                >
                  List Defect Surveys
                </button>
                <button
                  onClick={() => {
                    const q = 'SELECT item_no, description, weight_kg, total_price FROM work_items ORDER BY total_price DESC LIMIT 10;';
                    setSqlQuery(q);
                    handleRunQuery(q);
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px]"
                >
                  Top 10 Biaya Tertinggi
                </button>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4 max-w-xl">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Ekspor File Database SQLite</span>
                </h4>
                <p className="text-xs text-slate-600">
                  Unduh seluruh database dalam format biner asli <code>.sqlite</code> untuk dibuka di DB Browser for SQLite, DBeaver, atau Python/Backend.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleDownloadBinary}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh .sqlite (Binary)</span>
                  </button>
                  <button
                    onClick={handleDownloadSql}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Unduh .sql (Script DDL &amp; DML)</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Impor Database SQLite</span>
                </h4>
                <p className="text-xs text-slate-600">
                  Muat file <code>.sqlite</code> atau <code>.db</code> yang sudah ada untuk memperbarui semua data perbaikan kapal.
                </p>
                <input
                  type="file"
                  accept=".sqlite,.db,.sqlite3"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="p-4 bg-red-50/60 rounded-xl border border-red-200 space-y-2">
                <h4 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-red-600" />
                  <span>Reset ke Data Default TB. KSA BINTANG</span>
                </h4>
                <p className="text-xs text-red-700">
                  Kembalikan seluruh tabel ke data asli persis seperti dokumen PDF TB. KSA BINTANG.
                </p>
                <button
                  onClick={handleResetDb}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  Reset Database Sekarang
                </button>
              </div>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>Uji Diagnostik Preservasi Data (Memory vs SQLite)</span>
                  </h4>
                  <p className="text-xs text-slate-300">
                    Membandingkan state memori aplikasi dengan tabel fisik SQLite DB untuk memverifikasi transparansi dan integritas data.
                  </p>
                </div>
                <button
                  onClick={handleRunDiagnostics}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Jalankan Diagnostik
                </button>
              </div>

              {diagnosticReport && (
                <div className="space-y-3 font-mono text-xs">
                  <div className={`p-4 rounded-xl border ${diagnosticReport.isHealthy ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
                    <div className="flex items-center justify-between pb-2 border-b border-current/10">
                      <span className="font-black text-sm flex items-center gap-1.5">
                        {diagnosticReport.isHealthy ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
                        {diagnosticReport.summary}
                      </span>
                      <span className="text-[10px] opacity-75">{diagnosticReport.timestamp}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-center text-[11px]">
                      <div className="bg-white/60 p-2 rounded-lg border border-current/10">
                        <span className="text-[9px] uppercase font-bold block opacity-75">Work Items (Memory)</span>
                        <span className="text-base font-black">{diagnosticReport.totalMemoryWorkItems}</span>
                      </div>
                      <div className="bg-white/60 p-2 rounded-lg border border-current/10">
                        <span className="text-[9px] uppercase font-bold block opacity-75">Work Items (SQLite DB)</span>
                        <span className="text-base font-black">{diagnosticReport.totalDbWorkItems}</span>
                      </div>
                      <div className="bg-white/60 p-2 rounded-lg border border-current/10">
                        <span className="text-[9px] uppercase font-bold block opacity-75">Opname Items (Memory)</span>
                        <span className="text-base font-black">{diagnosticReport.totalMemoryOpnameItems}</span>
                      </div>
                      <div className="bg-white/60 p-2 rounded-lg border border-current/10">
                        <span className="text-[9px] uppercase font-bold block opacity-75">Opname Items (SQLite DB)</span>
                        <span className="text-base font-black">{diagnosticReport.totalDbOpnameItems}</span>
                      </div>
                    </div>
                  </div>

                  {diagnosticReport.discrepancies.length > 0 ? (
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Daftar Discrepancy Ditemukan ({diagnosticReport.discrepancies.length}):</h5>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {diagnosticReport.discrepancies.map((d, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-900 text-slate-200 rounded-lg border border-slate-800 text-[11px] space-y-1">
                            <div className="flex items-center justify-between text-amber-400 font-bold">
                              <span>[{d.severity.toUpperCase()}] Entity: {d.entityType} ({d.field})</span>
                              {d.id && <span className="text-[10px] text-slate-400 font-mono">ID: {d.id}</span>}
                            </div>
                            <p className="text-slate-300">{d.message}</p>
                            <div className="flex gap-4 text-[10px] text-slate-400 pt-1 border-t border-slate-800 font-mono">
                              <span>Memory: <code className="text-cyan-300">{JSON.stringify(d.memoryValue)}</code></span>
                              <span>SQLite DB: <code className="text-amber-300">{JSON.stringify(d.databaseValue)}</code></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 text-emerald-800 rounded-xl text-center text-xs font-sans">
                      🎉 Tidak ditemukan perbedaan antara state memori dan database SQLite. Seluruh data progres fisik, target rencana, dan log harian tersimpan dengan sempurna!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Query Results / Table Grid */}
          {queryResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Hasil Eksekusi:</span>
                <span className="font-mono text-slate-500 text-[11px]">
                  {queryResult.values.length} baris ditemukan
                </span>
              </div>

              {queryResult.error ? (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{queryResult.error}</span>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="max-h-72 overflow-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 font-bold text-slate-700">
                        <tr>
                          {queryResult.columns.map((col, idx) => (
                            <th key={idx} className="py-2 px-3 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {queryResult.values.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-slate-50">
                            {row.map((val: any, valIdx: number) => (
                              <td
                                key={valIdx}
                                className="py-1.5 px-3 whitespace-nowrap text-slate-800"
                              >
                                {val === null ? (
                                  <span className="text-slate-400 italic">NULL</span>
                                ) : (
                                  String(val)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
