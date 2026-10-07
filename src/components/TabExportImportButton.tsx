import React, { useState, useRef, useEffect } from 'react';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  FileCode,
  UploadCloud,
  Download,
  ChevronDown,
  Sliders,
  Sparkles,
} from 'lucide-react';

export interface TabExportImportButtonProps {
  tabName: 'repair-list' | 'defect-surveys' | 'cost-estimation' | 'material-catalog' | 'progress-tracking';
  onExportExcel?: () => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  onExportWord?: () => void;
  onOpenImportModal?: () => void;
  onDownloadTemplate?: () => void;
  onOpenFullModal?: (tab?: 'export' | 'import') => void;
  onOpenGoogleSheetsSync?: () => void;
  // Specific for catalog tab
  onExportJson?: () => void;
  onImportJson?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetCatalog?: () => void;
  className?: string;
  buttonSize?: 'sm' | 'md';
}

export const TabExportImportButton: React.FC<TabExportImportButtonProps> = ({
  tabName,
  onExportExcel,
  onExportCsv,
  onExportPdf,
  onExportWord,
  onOpenImportModal,
  onDownloadTemplate,
  onOpenFullModal,
  onOpenGoogleSheetsSync,
  onExportJson,
  onImportJson,
  onResetCatalog,
  className = '',
  buttonSize = 'sm',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTabLabel = () => {
    switch (tabName) {
      case 'repair-list':
        return 'Repair List';
      case 'defect-surveys':
        return 'Defect Survey';
      case 'cost-estimation':
        return 'RAB & Estimasi';
      case 'material-catalog':
        return 'Katalog Material';
      case 'progress-tracking':
        return 'Monitoring & Progres';
      default:
        return 'Data';
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Hidden File Input for JSON (Catalog tab) */}
      {onImportJson && (
        <input
          type="file"
          ref={jsonInputRef}
          onChange={onImportJson}
          accept=".json"
          className="hidden"
        />
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        id={`btn-tab-export-import-${tabName}`}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 font-semibold rounded-xl border transition-all cursor-pointer shadow-xs ${
          buttonSize === 'sm' ? 'px-3 py-1.5 text-xs min-h-[34px]' : 'px-3.5 py-2 text-xs min-h-[38px]'
        } bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200 hover:border-emerald-300`}
        title={`Ekspor & Impor Data ${getTabLabel()}`}
      >
        <FileDown className="w-3.5 h-3.5 text-emerald-600" />
        <span>Ekspor / Impor</span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Section: Ekspor */}
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-700">
              <FileDown className="w-3.5 h-3.5 text-emerald-600" />
              Ekspor {getTabLabel()}
            </span>
            <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
              Output
            </span>
          </div>

          <div className="space-y-1 mt-1">
            {/* Excel Export */}
            {onExportExcel && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportExcel();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-emerald-50/70 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 group-hover:text-emerald-800 block">
                      Microsoft Excel (.xlsx)
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Format spreadsheet lengkap rumus
                    </span>
                  </div>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
              </button>
            )}

            {/* CSV Export */}
            {onExportCsv && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportCsv();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-teal-50/70 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 group-hover:text-teal-800 block">
                      Universal CSV (.csv)
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Tabel fleksibel siap edit luar sistem
                    </span>
                  </div>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600" />
              </button>
            )}

            {/* PDF Export */}
            {onExportPdf && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportPdf();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-red-50/70 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 group-hover:text-red-800 block">
                      Adobe PDF (.pdf)
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Dokumen resmi siap cetak &amp; TTD
                    </span>
                  </div>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600" />
              </button>
            )}

            {/* Word Export */}
            {onExportWord && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportWord();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-blue-50/70 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <FileCode className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 group-hover:text-blue-800 block">
                      Microsoft Word (.doc)
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Scope of work &amp; Berita Acara
                    </span>
                  </div>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
              </button>
            )}

            {/* JSON Export for Catalog */}
            {onExportJson && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportJson();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-amber-50/70 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <FileCode className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 group-hover:text-amber-800 block">
                      Backup JSON (.json)
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Simpan backup database material
                    </span>
                  </div>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600" />
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="my-1.5 border-t border-slate-100" />

          {/* Section: Impor & Cloud Sync */}
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-700">
              <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
              Impor &amp; Live Sync
            </span>
            <span className="text-[10px] font-normal text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
              Cloud
            </span>
          </div>

          <div className="space-y-1 mt-1">
            {/* Google Sheets Live Sync */}
            {onOpenGoogleSheetsSync && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenGoogleSheetsSync();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 transition-colors flex items-center justify-between group cursor-pointer border border-emerald-200/80"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#03442C] text-amber-300 flex items-center justify-center">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-emerald-950 block flex items-center gap-1.5">
                      <span>Google Sheets Sync</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-emerald-700 text-white rounded font-mono font-normal">Live</span>
                    </span>
                    <span className="text-[10px] text-emerald-800 block">
                      Maintain online &amp; update inline
                    </span>
                  </div>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              </button>
            )}

            {/* Import Modal */}
            {onOpenImportModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenImportModal();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors">
                    <UploadCloud className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">
                      Impor File Excel / CSV
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Unggah berkas untuk tab ini
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* Import JSON for Catalog */}
            {onImportJson && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  jsonInputRef.current?.click();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors">
                    <UploadCloud className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">
                      Impor File JSON
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Pulihkan dari file JSON
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* Download Template */}
            {onDownloadTemplate && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onDownloadTemplate();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-emerald-50/50 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-emerald-800 block">
                      Download Template Excel
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Format standar siap isi
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* Full Hub Link */}
            {onOpenFullModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenFullModal('export');
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition-colors flex items-center justify-between group cursor-pointer mt-1 border border-slate-200/80"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold">Pusat Ekspor &amp; Impor Lengkap</span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
