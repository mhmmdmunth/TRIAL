import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  RotateCcw,
  ArrowRight,
  Ship,
  Calendar,
  Check,
  ClipboardPaste,
} from 'lucide-react';
import { WorkCategory, WorkItem, VesselSpec, ProjectSchedule } from '../types';
import { parseImportFile, parseClipboardTableText, ParseResult } from '../utils/fileImport';
import { exportTemplate } from '../utils/excelExport';

interface RepairListExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: WorkCategory[];
  workItems: WorkItem[];
  vessel?: VesselSpec;
  schedule?: ProjectSchedule;
  onImportWorkItems?: (
    newItems: WorkItem[],
    mode: 'replace' | 'append',
    extra?: {
      vesselSpec?: Partial<VesselSpec>;
      projectSchedule?: Partial<ProjectSchedule>;
      vesselPhotoUrl?: string;
    }
  ) => void;
  onNotify?: (msg: string) => void;
}

export const RepairListExcelImportModal: React.FC<RepairListExcelImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  workItems,
  vessel,
  schedule,
  onImportWorkItems,
  onNotify,
}) => {
  const [inputMethod, setInputMethod] = useState<'file' | 'paste'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [includeVesselMetadata, setIncludeVesselMetadata] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'table'>('summary');
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPastedText('');
      setParseResult(null);
      setParseError(null);
      setActiveTab('summary');
      setInputMethod('file');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);
    setParseResult(null);

    try {
      const res = await parseImportFile(file, categories, workItems);
      if (res.success && res.importedItems.length > 0) {
        setParseResult(res);
      } else {
        setParseError(
          res.errors.length > 0
            ? res.errors.join('\n')
            : 'File tidak memiliki data pekerjaan yang valid untuk diimpor.'
        );
      }
    } catch (err: any) {
      setParseError(`Terjadi kesalahan saat memproses file: ${err?.message || 'Format tidak valid'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handlePasteProcess = () => {
    if (!pastedText.trim()) {
      setParseError('Teks tempel (clipboard) kosong. Salin tabel dari Excel lalu tempel di sini.');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setParseResult(null);

    try {
      const res = parseClipboardTableText(pastedText, categories);
      if (res.success && res.importedItems.length > 0) {
        setParseResult(res);
      } else {
        setParseError(
          res.errors.length > 0
            ? res.errors.join('\n')
            : 'Data tempel tidak berisi baris pekerjaan valid. Pastikan format kolom sesuai.'
        );
      }
    } catch (err: any) {
      setParseError(`Gagal memproses teks tempel: ${err?.message || 'Format tidak dikenali'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleReadClipboardButton = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setPastedText(text);
          const res = parseClipboardTableText(text, categories);
          if (res.success && res.importedItems.length > 0) {
            setParseResult(res);
            if (onNotify) onNotify(`Berhasil membaca ${res.importedItems.length} baris dari clipboard!`);
          } else {
            setParseError('Teks dari clipboard tidak memiliki format tabel repair list yang valid.');
          }
        } else {
          setParseError('Clipboard kosong. Silakan salin (Copy) tabel dari Excel terlebih dahulu.');
        }
      } else {
        setParseError('Browser tidak mengizinkan pembacaan otomatis clipboard. Silakan gunakan Ctrl + V di area teks.');
      }
    } catch (e: any) {
      setParseError('Tidak dapat membaca clipboard. Tempel manual dengan Ctrl + V ke dalam kotak teks.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await exportTemplate(categories, workItems, vessel?.name);
      if (onNotify) {
        onNotify('Template Excel 15-kolom resmi berhasil diunduh.');
      }
    } catch (err: any) {
      console.error('Download template error:', err);
    }
  };

  const handleExecuteImport = () => {
    if (!parseResult || parseResult.importedItems.length === 0) return;

    if (onImportWorkItems) {
      onImportWorkItems(parseResult.importedItems, importMode, {
        vesselSpec: includeVesselMetadata ? parseResult.vesselSpec : undefined,
        projectSchedule: includeVesselMetadata ? parseResult.projectSchedule : undefined,
        vesselPhotoUrl: includeVesselMetadata ? parseResult.vesselPhotoUrl : undefined,
      });
    }

    if (onNotify) {
      const count = parseResult.importedItems.length;
      const modeText = importMode === 'replace' ? 'ditimpa (ganti semua)' : 'ditambahkan';
      onNotify(`Berhasil mengimpor ${count} item pekerjaan repair list (${modeText}).`);
    }

    onClose();
  };

  const areasCount = parseResult?.importedItems.filter((i) => i.itemLevel === 1 || i.isAreaHeader).length || 0;
  const subSystemsCount = parseResult?.importedItems.filter((i) => i.itemLevel === 2).length || 0;
  const componentsCount = parseResult?.importedItems.filter((i) => i.itemLevel === 3 || (!i.itemLevel && !i.isAreaHeader)).length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#03442C] to-[#023321] text-white flex items-center justify-between border-b border-emerald-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800/80 border border-emerald-700 rounded-lg text-emerald-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Impor Data Repair List Excel / CSV</h2>
              <p className="text-xs text-emerald-200/90 font-medium">
                Sinkronisasi data tabel dengan format standar galangan (15 Kolom) tanpa merusak hierarki
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold border border-emerald-500/50 transition-colors cursor-pointer shadow-xs"
              title="Unduh Template Excel 15 Kolom yang Selaras dengan Aplikasi"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template Resmi</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Method Selector Tabs */}
          {!parseResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setInputMethod('file'); setParseError(null); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    inputMethod === 'file'
                      ? 'bg-white text-emerald-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>1. Unggah File (.xlsx / .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setInputMethod('paste'); setParseError(null); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    inputMethod === 'paste'
                      ? 'bg-white text-emerald-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4 text-emerald-600" />
                  <span>2. Tempel Langsung (Ctrl + V dari Excel)</span>
                </button>
              </div>

              {inputMethod === 'file' ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    dragActive
                      ? 'border-emerald-500 bg-emerald-50/80 scale-[0.99]'
                      : 'border-slate-300 hover:border-emerald-600 bg-slate-50/60 hover:bg-emerald-50/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv,.txt,.json"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="p-3.5 rounded-full bg-emerald-100 text-emerald-800 shadow-inner">
                    {isParsing ? (
                      <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {isParsing ? 'Sedang membaca dan menganalisis struktur file...' : 'Klik untuk memilih file atau tarik file ke sini'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Mendukung file Microsoft Excel (<code className="text-emerald-700 font-semibold">.xlsx / .xls</code>), CSV (<code className="text-emerald-700 font-semibold">.csv / .tsv</code>), dan JSON
                    </p>
                  </div>

                  <div className="flex items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadTemplate();
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Belum punya format? Unduh Template Excel Resmi di sini</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Tempel Data Tabel Excel / Google Sheets</p>
                      <p className="text-[11px] text-slate-500">
                        Salin (Copy) sel tabel di Excel atau Google Sheets, lalu tempel (Ctrl + V) ke kotak di bawah ini.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleReadClipboardButton}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Baca dari Clipboard</span>
                    </button>
                  </div>

                  <textarea
                    ref={pasteTextareaRef}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Klik di sini lalu tekan Ctrl + V untuk menempelkan data tabel dari Excel..."
                    rows={7}
                    className="w-full p-3 font-mono text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      {pastedText.trim() ? `${pastedText.split('\n').length} baris teks terdeteksi` : 'Kotak tempel kosong'}
                    </span>
                    <button
                      type="button"
                      disabled={!pastedText.trim() || isParsing}
                      onClick={handlePasteProcess}
                      className={`px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                        !pastedText.trim() || isParsing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isParsing ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 text-emerald-300" />
                      )}
                      <span>Proses & Pratinjau Tabel</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-900">Gagal memproses file</p>
                <p className="mt-0.5 whitespace-pre-line text-rose-700">{parseError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setParseError(null);
                    fileInputRef.current?.click();
                  }}
                  className="mt-2.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  Pilih File Lain
                </button>
              </div>
            </div>
          )}

          {/* Parse Success Preview */}
          {parseResult && (
            <div className="space-y-4 animate-fadeIn">
              {/* File Info Bar */}
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-xs">{selectedFile?.name}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                        {((selectedFile?.size || 0) / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Struktur tabel terbaca sukses dan tersinkronisasi 100% dengan modul Repair List.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setParseResult(null);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium hover:underline inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ganti File</span>
                </button>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 font-medium block">Total Pekerjaan</span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5 block">{parseResult.summary.totalItems} item</span>
                  <span className="text-[10px] text-slate-500">{parseResult.summary.categoriesFound.length} kategori</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 font-medium block">Hierarki Struktur</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mt-1">
                    <span className="text-slate-900">{areasCount} Area</span>
                    <span>&bull;</span>
                    <span className="text-emerald-700">{subSystemsCount} Sub</span>
                    <span>&bull;</span>
                    <span className="text-blue-700">{componentsCount} Item</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">Tersusun Rapi</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 font-medium block">Total Estimasi Biaya</span>
                  <span className="text-sm font-bold text-emerald-700 mt-1 block">
                    Rp {parseResult.summary.totalCost.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-slate-500">Kalkulasi Otomatis</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 font-medium block">Metadata Tambahan</span>
                  <div className="text-[11px] font-semibold text-slate-700 mt-1">
                    {parseResult.vesselSpec?.name ? (
                      <span className="text-emerald-700 font-bold block truncate">Kapal: {parseResult.vesselSpec.name}</span>
                    ) : (
                      <span className="text-slate-400">Tanpa Spek Kapal</span>
                    )}
                    {parseResult.projectSchedule?.dockingDate && (
                      <span className="text-slate-500 text-[10px] block truncate">Dock: {parseResult.projectSchedule.dockingDate}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mode Selection & Options */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Pilihan Metode Impor Data:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`p-3 rounded-lg border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                      importMode === 'replace'
                        ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-500/30'
                        : 'bg-white border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Ganti Semua Data (Replace)</span>
                      <span className="text-slate-500 text-[11px] mt-0.5 block leading-snug">
                        Menghapus data repair list saat ini dan menggantikannya dengan isi file Excel baru secara bersih.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-lg border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                      importMode === 'append'
                        ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-500/30'
                        : 'bg-white border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Tambahkan Data (Append)</span>
                      <span className="text-slate-500 text-[11px] mt-0.5 block leading-snug">
                        Menggabungkan item pekerjaan dari file Excel ke bawah daftar yang sudah ada tanpa menghapus data lama.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Vessel metadata checkbox */}
                {parseResult.vesselSpec && parseResult.vesselSpec.name && (
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={includeVesselMetadata}
                      onChange={(e) => setIncludeVesselMetadata(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span>
                      Perbarui juga data <strong>Spesifikasi Kapal ({parseResult.vesselSpec.name})</strong> dan Jadwal Proyek jika ada di file.
                    </span>
                  </label>
                )}
              </div>

              {/* View Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'summary'
                        ? 'border-emerald-600 text-emerald-800'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Ringkasan Validasi
                  </button>
                  <button
                    onClick={() => setActiveTab('table')}
                    className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'table'
                        ? 'border-emerald-600 text-emerald-800'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>Pratinjau Tabel ({parseResult.importedItems.length})</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Ringkasan Validasi */}
              {activeTab === 'summary' && (
                <div className="space-y-2.5 text-xs">
                  {parseResult.warnings.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                      <span className="font-bold block mb-1">Catatan Parser:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                        {parseResult.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1">
                    <p className="font-semibold text-slate-800">Kesesuaian Struktur:</p>
                    <p>&bull; <strong>15 Kolom Standar</strong> teridentifikasi otomatis (No, Kategori, Uraian, Keterangan, Tipe, D1-D4, Qty, Satuan, Harga Satuan, Total Harga, Remark).</p>
                    <p>&bull; Baris <code>SUBTOTAL</code>, <code>GRAND TOTAL</code>, dan blok tanda tangan otomatis diabaikan agar tidak menduplikasi data.</p>
                  </div>
                </div>
              )}

              {/* Tab 2: Pratinjau Tabel */}
              {activeTab === 'table' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-x-auto overflow-y-auto text-xs scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#03442C] text-white font-bold text-[10px] uppercase sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-2 border-r border-emerald-800/60 w-12 text-center font-mono">No</th>
                        <th className="py-2 px-3 border-r border-emerald-800/60 min-w-[200px]">Deskripsi Pekerjaan</th>
                        <th className="py-2 px-2 border-r border-emerald-800/60 w-24">Keterangan</th>
                        <th className="py-2 px-2 border-r border-emerald-800/60 w-16 text-center">Type</th>
                        <th className="py-2 px-2 border-r border-emerald-800/60 w-12 text-center font-mono">D1</th>
                        <th className="py-2 px-2 border-r border-emerald-800/60 w-12 text-center font-mono">D2</th>
                        <th className="py-2 px-2 border-r border-emerald-800/60 w-12 text-center font-mono">D3</th>
                        <th className="py-2 px-2 border-r border-emerald-800/60 w-14 text-center font-mono">Panjang</th>
                        <th className="py-2 px-2 border-r border-emerald-800/60 w-12 text-center font-mono">D4</th>
                        <th className="py-2 px-2 border-r border-emerald-800/60 w-14 text-right font-mono">Qty</th>
                        <th className="py-2 px-2 border-r border-emerald-800/60 w-14 text-center font-mono">Satuan</th>
                        <th className="py-2 px-2 border-r border-emerald-800/60 w-20 text-right font-mono">Harga (Rp)</th>
                        <th className="py-2 px-2 border-r border-emerald-800/60 w-24 text-right font-mono">Total (Rp)</th>
                        <th className="py-2 px-2 w-28">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {parseResult.importedItems.slice(0, 100).map((item, idx) => {
                        const isArea = item.itemLevel === 1 || item.isAreaHeader;
                        const isSub = item.itemLevel === 2;
                        return (
                          <tr
                            key={idx}
                            className={`${
                              isArea
                                ? 'bg-slate-700 text-white font-bold'
                                : isSub
                                ? 'bg-emerald-50 text-emerald-950 font-semibold'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200/60">{item.itemNo}</td>
                            <td className="py-1.5 px-3 border-r border-slate-200/60">
                              <span className={isArea ? 'text-white' : isSub ? 'text-emerald-900' : 'text-slate-800'}>
                                {item.description}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-200/60 truncate max-w-[120px]">{item.notes || '-'}</td>
                            <td className="py-1.5 px-2 text-center font-mono uppercase border-r border-slate-200/60">{item.type || '-'}</td>
                            <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200/60">{item.d1 || '-'}</td>
                            <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200/60">{item.d2 || '-'}</td>
                            <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200/60">{item.d3 || '-'}</td>
                            <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200/60">{item.dLen || '-'}</td>
                            <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200/60">{item.d4 || '-'}</td>
                            <td className="py-1.5 px-2 text-right font-mono border-r border-slate-200/60">{item.qty || '-'}</td>
                            <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200/60">{item.unit || '-'}</td>
                            <td className="py-1.5 px-2 text-right font-mono border-r border-slate-200/60">
                              {item.unitPrice ? item.unitPrice.toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono border-r border-slate-200/60">
                              {item.totalPrice ? item.totalPrice.toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="py-1.5 px-2 truncate max-w-[140px]">{item.remark || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {parseResult.importedItems.length > 100 && (
                    <div className="p-2 text-center text-xs text-slate-500 bg-slate-50">
                      Menampilkan 100 dari {parseResult.importedItems.length} item pekerjaan.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            Batal
          </button>

          <div className="flex items-center gap-2">
            {parseResult && (
              <button
                type="button"
                onClick={handleExecuteImport}
                className="px-5 py-2 bg-[#03442C] hover:bg-[#04593A] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer hover:shadow-lg"
              >
                <Check className="w-4 h-4 text-emerald-300" />
                <span>
                  {importMode === 'replace'
                    ? `Ganti & Simpan ${parseResult.importedItems.length} Item`
                    : `Tambahkan ${parseResult.importedItems.length} Item ke Tabel`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
