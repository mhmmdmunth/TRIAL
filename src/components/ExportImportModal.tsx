import React, { useState, useEffect, useRef } from 'react';
import {
  FileDown,
  FileUp,
  FileSpreadsheet,
  FileText,
  FileCode,
  Check,
  AlertCircle,
  Download,
  Upload,
  RefreshCw,
  X,
  Layers,
  Sparkles,
  HelpCircle,
  FolderOpen,
  ArrowRight,
  Database,
  DollarSign,
  Scale,
  Eye,
  CheckCircle2,
  Trash2,
  ChevronDown,
  Table,
  Copy,
  Code,
} from 'lucide-react';
import {
  VesselSpec,
  ProjectSchedule,
  WorkCategory,
  WorkItem,
  Signatures,
  DefectSurvey,
} from '../types';
import { exportShipyardExcel } from '../utils/excelExport';
import { exportShipyardPdf, PdfDocumentType } from '../utils/pdfExport';
import { exportShipyardWord, WordDocumentType } from '../utils/wordExport';
import {
  parseImportFile,
  generateImportTemplate,
  generateCsvImportTemplate,
  generateJsonImportTemplate,
  exportShipyardCsv,
  exportShipyardJson,
  ParseResult,
} from '../utils/fileImport';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'export' | 'import';
  initialTab?: 'export' | 'import';
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  categories: WorkCategory[];
  workItems: WorkItem[];
  surveys?: DefectSurvey[];
  defectSurveys?: DefectSurvey[];
  signatures: Signatures;
  onImportWorkItems: (
    newItems: WorkItem[],
    mode: 'replace' | 'append',
    extra?: {
      vesselSpec?: Partial<VesselSpec>;
      projectSchedule?: Partial<ProjectSchedule>;
      vesselPhotoUrl?: string;
    }
  ) => void;
  onNotify?: (msg: string) => void;
  onOpenPdfModal?: () => void;
  onExportExcel?: () => void;
  onConfirm?: (title: string, message: string, onConfirm: () => void) => void;
  onAlert?: (title: string, message: string) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'export',
  initialTab,
  vessel,
  schedule,
  categories,
  workItems,
  surveys = [],
  defectSurveys,
  signatures,
  onImportWorkItems,
  onNotify,
  onOpenPdfModal,
  onExportExcel,
  onConfirm,
  onAlert,
}) => {
  const activeSurveys = defectSurveys || surveys;
  // Active Tab: Export or Import
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab || defaultTab);

  // Sync active tab if initialTab changes when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || defaultTab);
    }
  }, [isOpen, initialTab, defaultTab]);

  // Export options: Excel, CSV, PDF, Word, JSON, Source Code
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'csv' | 'pdf' | 'word' | 'json' | 'source-code'>('excel');
  const [pdfDocType, setPdfDocType] = useState<PdfDocumentType>('repair-list');
  const [wordDocType, setWordDocType] = useState<WordDocumentType>('repair-list');
  const [includePrices, setIncludePrices] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [customWordNotes, setCustomWordNotes] = useState<string>('');
  const [isCopiedSource, setIsCopiedSource] = useState<boolean>(false);

  // Import options
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedResult, setParsedResult] = useState<ParseResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [detectedFileType, setDetectedFileType] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && (e.key === 'Escape' || e.key === 'Esc')) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close template dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setShowTemplateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Handle Export Trigger
  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      if (selectedFormat === 'excel') {
        await exportShipyardExcel({
          vessel,
          schedule,
          categories,
          workItems,
          signatures,
          includePrices,
        });
        onNotify?.('File Excel (.xlsx) dengan formula live berhasil diunduh!');
      } else if (selectedFormat === 'csv') {
        await exportShipyardCsv({
          categories,
          workItems,
          vesselName: vessel.name,
          includePrices,
        });
        onNotify?.('File CSV (.csv) fleksibel UTF-8 berhasil diunduh!');
      } else if (selectedFormat === 'pdf') {
        await exportShipyardPdf({
          vessel,
          schedule,
          categories,
          workItems,
          defectSurveys: activeSurveys,
          signatures,
          docType: pdfDocType,
          includePrices,
        });
        onNotify?.('Dokumen PDF (.pdf) resmi berhasil diunduh!');
      } else if (selectedFormat === 'word') {
        await exportShipyardWord({
          vessel,
          schedule,
          categories,
          workItems,
          surveys: activeSurveys,
          signatures,
          includePrices,
          docType: wordDocType,
          notes: customWordNotes,
        });
        onNotify?.('Dokumen Word (.doc) yang dapat diedit berhasil diunduh!');
      } else if (selectedFormat === 'json') {
        await exportShipyardJson({
          vessel,
          schedule,
          categories,
          workItems,
          surveys: activeSurveys,
          signatures,
        });
        onNotify?.('Backup data terstruktur JSON (.json) berhasil diunduh!');
      } else if (selectedFormat === 'source-code') {
        const link = document.createElement('a');
        link.href = '/SOURCE_CODE_LENGKAP.txt';
        link.download = 'SOURCE_CODE_LENGKAP.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onNotify?.('File SOURCE_CODE_LENGKAP.txt berhasil diunduh!');
      }
    } catch (err: any) {
      console.error('Export error:', err);
      onNotify?.(`Gagal mengekspor: ${err?.message || 'Error tidak diketahui'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopySourceCode = async () => {
    try {
      const res = await fetch('/SOURCE_CODE_LENGKAP.txt');
      if (!res.ok) throw new Error('File tidak ditemukan');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setIsCopiedSource(true);
      onNotify?.('Seluruh script koding aplikasi berhasil disalin ke clipboard!');
      setTimeout(() => setIsCopiedSource(false), 3000);
    } catch (err) {
      console.error('Copy source code error:', err);
      onNotify?.('Gagal menyalin langsung. Silakan gunakan tombol Unduh File.');
    }
  };

  // Process File for Import (handles File object)
  const processUploadedFile = async (file: File) => {
    setSelectedFileName(file.name);
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') setDetectedFileType('Microsoft Excel');
    else if (ext === '.csv' || ext === '.txt') setDetectedFileType('Spreadsheet CSV');
    else if (ext === '.json') setDetectedFileType('Struktur Data JSON');
    else setDetectedFileType('File Dokumen');

    setIsParsing(true);
    setParsedResult(null);

    try {
      const result = await parseImportFile(file, categories, workItems);
      setParsedResult(result);
      if (result.success) {
        setShowPreview(true);
      }
    } catch (err: any) {
      setParsedResult({
        success: false,
        importedItems: [],
        warnings: [],
        errors: [`Gagal membaca file: ${err?.message || 'Format tidak valid'}`],
        summary: { totalItems: 0, categoriesFound: [], areaHeadersCount: 0, totalWeightKg: 0, totalCost: 0 },
      });
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  // Commit imported items
  const handleApplyImport = () => {
    if (!parsedResult || !parsedResult.success || parsedResult.importedItems.length === 0) return;

    onImportWorkItems(parsedResult.importedItems, importMode, {
      vesselSpec: parsedResult.vesselSpec,
      projectSchedule: parsedResult.projectSchedule,
      vesselPhotoUrl: parsedResult.vesselPhotoUrl,
    });
    onNotify?.(
      `Berhasil mengimpor ${parsedResult.importedItems.length} item pekerjaan ${
        parsedResult.vesselSpec?.name ? `proyek "${parsedResult.vesselSpec.name}" ` : ''
      }(${importMode === 'replace' ? 'Menimpa data' : 'Menambahkan data'})`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Pusat Ekspor &amp; Impor Dokumen Fleksibel
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-semibold">
                  Excel &bull; CSV &bull; Word &bull; PDF &bull; JSON
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                {vessel.name} &bull; Proyek <span className="font-mono text-emerald-300">{vessel.projectNo}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector: Ekspor vs Impor & Download Template */}
        <div className="px-5 pt-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('export')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'export'
                  ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileDown className="w-4 h-4" />
              <span>Ekspor Dokumen (Output)</span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'import'
                  ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileUp className="w-4 h-4" />
              <span>Impor Data Fleksibel</span>
            </button>
          </div>

          {/* Download Template Dropdown Menu */}
          <div className="relative" ref={templateMenuRef}>
            <button
              type="button"
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              title="Download Template Format Siap Edit Luar Sistem"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-semibold px-2.5 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download Template</span>
              <span className="sm:hidden">Template</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showTemplateDropdown && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in">
                <div className="px-3 py-1 font-bold text-slate-400 text-[10px] uppercase">Pilih Format Template:</div>
                <button
                  type="button"
                  onClick={() => {
                    generateImportTemplate(categories, workItems, vessel.name);
                    setShowTemplateDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-semibold block">Template Excel (.xlsx)</span>
                    <span className="text-[10px] text-slate-400">Lengkap rumus tonase live</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    generateCsvImportTemplate(categories, workItems, vessel.name);
                    setShowTemplateDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 text-slate-700 hover:text-teal-800 flex items-center gap-2 cursor-pointer"
                >
                  <Table className="w-4 h-4 text-teal-600" />
                  <div>
                    <span className="font-semibold block">Template CSV (.csv)</span>
                    <span className="text-[10px] text-slate-400">Ringan &amp; universal UTF-8</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    generateJsonImportTemplate(categories, workItems, vessel.name);
                    setShowTemplateDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-amber-50 text-slate-700 hover:text-amber-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="font-semibold block">Template JSON (.json)</span>
                    <span className="text-[10px] text-slate-400">Struktur data lengkap</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'export' ? (
            /* =================== EXPORT TAB =================== */
            <div className="space-y-5">
              {/* Step 1: Format Selector Cards (5 formats) */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  1. Pilih Format File Ekspor
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {/* Excel Card */}
                  <div
                    onClick={() => setSelectedFormat('excel')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedFormat === 'excel'
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 mb-1.5">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      {selectedFormat === 'excel' && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">Excel (.xlsx)</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Spreadsheet lengkap rumus &amp; multi-sheet
                      </p>
                    </div>
                  </div>

                  {/* CSV Card */}
                  <div
                    onClick={() => setSelectedFormat('csv')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedFormat === 'csv'
                        ? 'border-teal-500 bg-teal-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700 mb-1.5">
                        <Table className="w-5 h-5" />
                      </div>
                      {selectedFormat === 'csv' && (
                        <span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">CSV (.csv)</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Format universal ringan UTF-8 untuk Excel / Sheets
                      </p>
                    </div>
                  </div>

                  {/* Word Card */}
                  <div
                    onClick={() => setSelectedFormat('word')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedFormat === 'word'
                        ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 mb-1.5">
                        <FileCode className="w-5 h-5" />
                      </div>
                      {selectedFormat === 'word' && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">Word (.doc)</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Bisa diedit langsung untuk SOW &amp; Berita Acara
                      </p>
                    </div>
                  </div>

                  {/* PDF Card */}
                  <div
                    onClick={() => setSelectedFormat('pdf')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedFormat === 'pdf'
                        ? 'border-red-500 bg-red-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-1.5 rounded-lg bg-red-100 text-red-700 mb-1.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      {selectedFormat === 'pdf' && (
                        <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">Adobe PDF</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Dokumen resmi siap cetak dengan tanda tangan
                      </p>
                    </div>
                  </div>

                  {/* JSON Card */}
                  <div
                    onClick={() => setSelectedFormat('json')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedFormat === 'json'
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 mb-1.5">
                        <Database className="w-5 h-5" />
                      </div>
                      {selectedFormat === 'json' && (
                        <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">JSON (.json)</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Backup data lengkap untuk portabilitas &amp; API
                      </p>
                    </div>
                  </div>

                  {/* Source Code (.txt) Card */}
                  <div
                    onClick={() => setSelectedFormat('source-code')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedFormat === 'source-code'
                        ? 'border-purple-500 bg-purple-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 mb-1.5">
                        <Code className="w-5 h-5" />
                      </div>
                      {selectedFormat === 'source-code' && (
                        <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">Koding (.txt)</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Semua file source code siap salin sekaligus
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Format Specific Configurations */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Pengaturan Konten Dokumen
                  </span>
                  {selectedFormat !== 'json' && selectedFormat !== 'source-code' && (
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={includePrices}
                        onChange={(e) => setIncludePrices(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                      />
                      <span>Sertakan Kolom Harga / RAB</span>
                    </label>
                  )}
                </div>

                {/* Source Code Specific Option */}
                {selectedFormat === 'source-code' && (
                  <div className="space-y-3 bg-purple-50/70 p-4 rounded-xl border border-purple-200 text-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-purple-950 flex items-center gap-1.5">
                          <Code className="w-4 h-4 text-purple-600" />
                          <span>Bundle Source Code Lengkap Aplikasi (.txt)</span>
                        </h4>
                        <p className="text-[11px] text-purple-900 mt-0.5">
                          Berisi seluruh 35+ file kode lengkap (TypeScript, React, Vite, SQLite, Express, CSS, komponen &amp; kalkulator tonase).
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleCopySourceCode}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          {isCopiedSource ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin ke Clipboard</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs font-mono space-y-1.5 border border-slate-800">
                      <div className="text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
                        # Cara Otomatis Ekstrak di Komputer Lokal:
                      </div>
                      <div className="text-slate-300 text-[11px]">
                        1. Jalankan script extractor:
                      </div>
                      <div className="bg-slate-950 p-1.5 rounded text-amber-300 font-semibold text-[11px] select-all">
                        node unpack.cjs SOURCE_CODE_LENGKAP.txt
                      </div>
                      <div className="text-slate-300 text-[11px] pt-1">
                        2. Instal &amp; jalankan proyek:
                      </div>
                      <div className="bg-slate-950 p-1.5 rounded text-sky-300 font-semibold text-[11px] select-all">
                        npm install &amp;&amp; npm run dev
                      </div>
                    </div>
                  </div>
                )}

                {/* PDF Specific Option */}
                {selectedFormat === 'pdf' && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-600 font-medium">Jenis Dokumen PDF:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 p-2.5 rounded-lg border bg-white border-slate-200 hover:border-slate-300 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="pdfDocType"
                          checked={pdfDocType === 'repair-list'}
                          onChange={() => setPdfDocType('repair-list')}
                          className="text-emerald-600"
                        />
                        <div>
                          <span className="font-bold text-slate-800">Repair List Standar</span>
                          <p className="text-[10px] text-slate-500">Daftar item pekerjaan &amp; tonase</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border bg-white border-slate-200 hover:border-slate-300 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="pdfDocType"
                          checked={pdfDocType === 'cost-estimation'}
                          onChange={() => setPdfDocType('cost-estimation')}
                          className="text-emerald-600"
                        />
                        <div>
                          <span className="font-bold text-slate-800">RAB &amp; Estimasi Biaya</span>
                          <p className="text-[10px] text-slate-500">Rincian harga satuan &amp; subtotal</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border bg-white border-slate-200 hover:border-slate-300 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="pdfDocType"
                          checked={pdfDocType === 'defect-surveys'}
                          onChange={() => setPdfDocType('defect-surveys')}
                          className="text-emerald-600"
                        />
                        <div>
                          <span className="font-bold text-slate-800">Laporan Defect Survey</span>
                          <p className="text-[10px] text-slate-500">Foto kerusakan &amp; kalkulasi tonase</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border bg-white border-slate-200 hover:border-slate-300 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="pdfDocType"
                          checked={pdfDocType === 'progress-report'}
                          onChange={() => setPdfDocType('progress-report')}
                          className="text-emerald-600"
                        />
                        <div>
                          <span className="font-bold text-slate-800">Laporan Progres Kerja</span>
                          <p className="text-[10px] text-slate-500">Status penyelesaian &amp; kurva-s</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Word Specific Option */}
                {selectedFormat === 'word' && (
                  <div className="space-y-3">
                    <label className="text-xs text-slate-600 font-medium">Jenis Dokumen Word:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 p-2.5 rounded-lg border bg-white border-slate-200 hover:border-slate-300 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="wordDocType"
                          checked={wordDocType === 'repair-list'}
                          onChange={() => setWordDocType('repair-list')}
                          className="text-blue-600"
                        />
                        <div>
                          <span className="font-bold text-slate-800">Scope of Work (SOW)</span>
                          <p className="text-[10px] text-slate-500">Spesifikasi reparasi &amp; rincian teknis</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border bg-white border-slate-200 hover:border-slate-300 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="wordDocType"
                          checked={wordDocType === 'bap'}
                          onChange={() => setWordDocType('bap')}
                          className="text-blue-600"
                        />
                        <div>
                          <span className="font-bold text-slate-800">Berita Acara Pemeriksaan (BAP)</span>
                          <p className="text-[10px] text-slate-500">Survei bersama Owner &amp; Galangan</p>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label className="text-xs text-slate-600 font-medium block mb-1">
                        Catatan Khusus / Syarat &amp; Ketentuan Tambahan (Opsional):
                      </label>
                      <textarea
                        value={customWordNotes}
                        onChange={(e) => setCustomWordNotes(e.target.value)}
                        placeholder="Contoh: Pekerjaan di luar repair list ini akan dituangkan dalam Berita Acara Pekerjaan Tambah/Kurang tersendiri..."
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none h-16"
                      />
                    </div>
                  </div>
                )}

                {/* Info Note for External Editing */}
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Dukungan Fleksibel Edit Luar Sistem:</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      File hasil ekspor dapat dibuka dan diedit di Microsoft Excel, Google Sheets, LibreOffice Calc, atau
                      teks editor. Anda dapat menambah baris pekerjaan, mengubah dimensi, atau mengubah harga, kemudian
                      mengunggahnya kembali ke sistem tanpa kendala.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =================== IMPORT TAB =================== */
            <div className="space-y-5">
              {/* Step 1: Upload Box with Drag-and-Drop */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  1. Pilih File Hasil Edit Luar Sistem (.xlsx, .xls, .csv, .json, .txt)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50 scale-[1.01]'
                      : 'border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, .json, .txt"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Klik atau Drag &amp; Drop File Excel, CSV, atau JSON di sini
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Mendukung format kolom standar maupun custom: No. Item, Uraian Pekerjaan, Tipe Material, Dimensi,
                      Qty, Satuan, Tonase, &amp; Harga.
                    </p>
                  </div>
                  {selectedFileName && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {selectedFileName} {detectedFileType && `(${detectedFileType})`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Parsing State */}
              {isParsing && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3 text-blue-800 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Sedang menganalisis struktur data dan merekonstruksi pohon hirarki pekerjaan...</span>
                </div>
              )}

              {/* Parsing Errors or Warnings */}
              {parsedResult && !parsedResult.success && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Gagal Memproses File</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                    {parsedResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Parsing Success & Preview */}
              {parsedResult && parsedResult.success && (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-emerald-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Data Berhasil Diekstrak ({parsedResult.summary.totalItems} Pekerjaan Mapped)
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-mono font-bold border border-emerald-300">
                          <Database className="w-3 h-3 text-emerald-700" />
                          Validasi Tipe Data SQLite OK
                        </span>
                        <button
                          onClick={() => setShowPreview(!showPreview)}
                          className="text-xs text-emerald-800 hover:text-emerald-900 font-semibold underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{showPreview ? 'Sembunyikan' : 'Preview'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded bg-white border border-emerald-200/80">
                        <span className="text-slate-500 block text-[10px]">Total Item</span>
                        <strong className="text-slate-900 text-sm">{parsedResult.summary.totalItems}</strong>
                      </div>
                      <div className="p-2 rounded bg-white border border-emerald-200/80">
                        <span className="text-slate-500 block text-[10px]">Judul Area</span>
                        <strong className="text-slate-900 text-sm">{parsedResult.summary.areaHeadersCount}</strong>
                      </div>
                      <div className="p-2 rounded bg-white border border-emerald-200/80">
                        <span className="text-slate-500 block text-[10px]">Total Tonase</span>
                        <strong className="text-slate-900 text-sm">
                          {(parsedResult.summary.totalWeightKg / 1000).toFixed(2)} Ton
                        </strong>
                      </div>
                      <div className="p-2 rounded bg-white border border-emerald-200/80">
                        <span className="text-slate-500 block text-[10px]">Total Nilai RAB</span>
                        <strong className="text-emerald-700 text-sm">
                          Rp {parsedResult.summary.totalCost.toLocaleString('id-ID')}
                        </strong>
                      </div>
                    </div>

                    {/* SQLite Schema Mapping Details */}
                    <div className="p-2.5 rounded-lg bg-white/80 border border-emerald-200/80 text-[11px] text-slate-700 space-y-1">
                      <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wider flex items-center justify-between">
                        <span>Pemetaan Kolom &amp; Tipe SQLite (Table: work_items):</span>
                        <span className="text-emerald-700 font-semibold">100% Type Safe</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-slate-600">
                        <span><strong className="text-slate-800">id, item_no, category_id, description, type, unit:</strong> TEXT</span>
                        <span>&bull;</span>
                        <span><strong className="text-slate-800">qty, weight_kg, unit_price, total_price, progress_percent:</strong> REAL</span>
                        <span>&bull;</span>
                        <span><strong className="text-slate-800">item_level, is_area_header, is_completed:</strong> INTEGER</span>
                      </div>
                    </div>

                    {parsedResult.warnings.length > 0 && (
                      <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                        <span className="font-bold block text-amber-900 text-[10px] uppercase">Catatan Penyesuaian Data ({parsedResult.warnings.length}):</span>
                        <ul className="list-disc list-inside max-h-20 overflow-y-auto space-y-0.5 text-[10.5px]">
                          {parsedResult.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Import Strategy Selector */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      2. Mode Penerapan Data ke Sistem
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-white border-slate-200 hover:border-slate-300 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="mt-0.5 text-emerald-600"
                        />
                        <div>
                          <span className="font-bold text-slate-900">Tambahkan (Append / Merge)</span>
                          <p className="text-[10px] text-slate-500">
                            Menambahkan item baru tanpa menghapus data pekerjaan yang sudah ada sebelumnya.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-white border-slate-200 hover:border-slate-300 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5 text-red-600"
                        />
                        <div>
                          <span className="font-bold text-slate-900">Gantikan Semua (Replace All)</span>
                          <p className="text-[10px] text-slate-500">
                            Menghapus seluruh daftar pekerjaan saat ini dan menggantinya penuh dari file yang diimpor.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Interactive Preview Table - Fully Aligned with RepairListTable Format */}
                  {showPreview && (
                    <div className="border-2 border-[#03442C]/30 rounded-xl overflow-hidden shadow-xs bg-white">
                      <div className="p-2.5 bg-[#023321] text-white font-bold text-xs flex justify-between items-center border-b border-emerald-950">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Preview Struktur Hirarki Repair List ({Math.min(15, parsedResult.importedItems.length)} dari {parsedResult.importedItems.length} baris):</span>
                        </span>
                        <span className="text-[11px] text-emerald-200 font-mono font-semibold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700/60">
                          {parsedResult.summary.categoriesFound.length} Kategori Ditemukan
                        </span>
                      </div>
                      <div className="max-h-64 overflow-x-auto overflow-y-auto scrollbar-thin">
                        <table className="w-full text-xs text-left border-collapse border border-slate-200">
                          <thead className="bg-[#03442C] text-white font-bold uppercase text-[10px] tracking-wider align-middle sticky top-0 z-10 border-b-2 border-emerald-950">
                            <tr>
                              <th className="py-2 px-2 w-12 text-center border-r border-emerald-800/60 font-mono">No</th>
                              <th className="py-2 px-3 min-w-[220px] border-r border-emerald-800/60">WORK ITEMS / URAIAN PEKERJAAN</th>
                              <th className="py-2 px-2 min-w-[120px] border-r border-emerald-800/60">Keterangan</th>
                              <th className="py-2 px-2 w-16 text-center border-r border-emerald-800/60 font-mono">Type</th>
                              <th className="py-2 px-1 w-10 text-center border-r border-emerald-800/60 font-mono" title="D1 (Tebal/Dia)">D1</th>
                              <th className="py-2 px-1 w-10 text-center border-r border-emerald-800/60 font-mono" title="D2 (Lebar)">D2</th>
                              <th className="py-2 px-1 w-10 text-center border-r border-emerald-800/60 font-mono" title="D3 (Tebal)">D3</th>
                              <th className="py-2 px-1 w-14 text-center bg-[#07593D] text-amber-300 border-x border-amber-400/70 font-mono font-extrabold shadow-inner" title="Panjang Lajur">Panjang</th>
                              <th className="py-2 px-1 w-10 text-center border-r border-emerald-800/60 font-mono" title="D4 (Pengali)">D4</th>
                              <th className="py-2 px-2 w-16 text-right border-r border-emerald-800/60 font-mono">Qty</th>
                              <th className="py-2 px-2 w-14 text-center border-r border-emerald-800/60 font-mono">Satuan</th>
                              <th className="py-2 px-2 w-24 text-right border-r border-emerald-800/60 font-mono">Tonase (kg)</th>
                              <th className="py-2 px-2 w-28 text-right font-mono">Total (Rp)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {parsedResult.importedItems.slice(0, 15).map((it, idx) => {
                              const isArea = it.isAreaHeader || it.itemLevel === 1;
                              const isSub = it.itemLevel === 2;

                              return (
                                <tr
                                  key={idx}
                                  className={
                                    isArea
                                      ? 'bg-[#03442C]/10 font-extrabold border-y border-[#03442C]/20 text-[#03442C]'
                                      : isSub
                                      ? 'bg-emerald-50/80 font-bold border-y border-emerald-100 text-emerald-900'
                                      : 'hover:bg-slate-50 text-slate-800 border-b border-slate-100'
                                  }
                                >
                                  <td className="py-1.5 px-2 text-center font-mono text-xs border-r border-slate-200 font-bold">
                                    {it.itemNo}
                                  </td>
                                  <td className="py-1.5 px-3 border-r border-slate-200">
                                    <div className="flex items-center gap-1.5">
                                      {isArea && (
                                        <span className="px-1.5 py-0.5 rounded bg-[#03442C] text-white text-[9px] font-extrabold uppercase shrink-0">
                                          Area
                                        </span>
                                      )}
                                      {isSub && (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-bold uppercase shrink-0">
                                          Sub
                                        </span>
                                      )}
                                      <span className={isArea ? 'font-extrabold text-slate-900' : isSub ? 'font-bold text-emerald-950' : 'text-slate-800'}>
                                        {it.description}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-2 border-r border-slate-200 text-slate-600 text-[11px] truncate max-w-[120px]">
                                    {it.notes || '-'}
                                  </td>
                                  <td className="py-1.5 px-2 text-center font-mono text-[11px] font-bold uppercase border-r border-slate-200 text-slate-700">
                                    {it.type || '-'}
                                  </td>
                                  <td className="py-1.5 px-1 text-center font-mono text-[11px] border-r border-slate-200 text-slate-600">
                                    {it.d1 || '-'}
                                  </td>
                                  <td className="py-1.5 px-1 text-center font-mono text-[11px] border-r border-slate-200 text-slate-600">
                                    {it.d2 || '-'}
                                  </td>
                                  <td className="py-1.5 px-1 text-center font-mono text-[11px] border-r border-slate-200 text-slate-600">
                                    {it.d3 || '-'}
                                  </td>
                                  <td className="py-1.5 px-1 text-center font-mono text-[11px] font-bold bg-amber-50 text-amber-900 border-x border-amber-200">
                                    {it.dLen || '-'}
                                  </td>
                                  <td className="py-1.5 px-1 text-center font-mono text-[11px] border-r border-slate-200 text-slate-600">
                                    {it.d4 || '-'}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono text-xs font-bold border-r border-slate-200 text-slate-900">
                                    {it.qty !== undefined && it.qty !== null ? it.qty : '-'}
                                  </td>
                                  <td className="py-1.5 px-2 text-center font-mono text-[11px] font-bold border-r border-slate-200 text-slate-600">
                                    {it.unit || '-'}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono text-xs font-bold border-r border-slate-200 text-amber-900">
                                    {it.weightKg ? `${it.weightKg.toFixed(1)} kg` : '-'}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono text-xs font-bold text-emerald-700">
                                    {it.totalPrice ? `Rp ${it.totalPrice.toLocaleString('id-ID')}` : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>

          {activeTab === 'export' ? (
            <button
              onClick={handleExecuteExport}
              disabled={isExporting}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer ${
                selectedFormat === 'excel'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  : selectedFormat === 'csv'
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/20'
                  : selectedFormat === 'pdf'
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
                  : selectedFormat === 'word'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                  : selectedFormat === 'source-code'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
              }`}
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sedang Mengekspor Dokumen...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>
                    Unduh File{' '}
                    {selectedFormat === 'excel'
                      ? 'Excel (.xlsx)'
                      : selectedFormat === 'csv'
                      ? 'CSV (.csv)'
                      : selectedFormat === 'pdf'
                      ? 'PDF (.pdf)'
                      : selectedFormat === 'word'
                      ? 'Word (.doc)'
                      : selectedFormat === 'source-code'
                      ? 'Koding (SOURCE_CODE_LENGKAP.txt)'
                      : 'JSON (.json)'}
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleApplyImport}
              disabled={!parsedResult || !parsedResult.success || parsedResult.importedItems.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                Terapkan {parsedResult?.importedItems.length || 0} Data ke Aplikasi
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
