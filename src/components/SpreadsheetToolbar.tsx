import React, { useState } from 'react';
import {
  Scissors,
  Copy,
  ClipboardPaste,
  Plus,
  Trash2,
  Eraser,
  HelpCircle,
  X,
  Keyboard,
  Grid,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import { COLUMN_LABELS } from '../hooks/useSpreadsheetTable';
import { WorkItem } from '../types';

interface SpreadsheetToolbarProps {
  activeCell: { itemId: string; field: string } | null;
  items: WorkItem[];
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onClearCell: () => void;
  onInsertRowBelow?: (item: WorkItem) => void;
  onDeleteRow?: (itemId: string) => void;
  onOpenShortcutsModal?: () => void;
  onOpenGoogleSheetsSync?: () => void;
  toastMessage?: string | null;
}

export const SpreadsheetToolbar: React.FC<SpreadsheetToolbarProps> = ({
  activeCell,
  items,
  onCut,
  onCopy,
  onPaste,
  onClearCell,
  onInsertRowBelow,
  onDeleteRow,
  onOpenShortcutsModal,
  onOpenGoogleSheetsSync,
  toastMessage,
}) => {
  const [showGuide, setShowGuide] = useState(false);

  const activeItem = activeCell ? items.find((i) => i.id === activeCell.itemId) : null;
  const colLabel = activeCell ? COLUMN_LABELS[activeCell.field] || activeCell.field : null;
  const cellVal = activeItem && activeCell ? (activeItem as any)[activeCell.field] : null;

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl p-2 px-3 shadow-md mb-3 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs select-none">
      {/* Active Cell Coordinates & Preview */}
      <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1.5 rounded-lg min-w-[220px] max-w-full">
        <Grid className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        {activeCell && activeItem ? (
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded text-[10px] shrink-0">
              {activeItem.itemNo || 'Item'}
            </span>
            <span className="font-medium text-slate-300 shrink-0 text-[11px]">
              {colLabel}:
            </span>
            <span className="font-mono text-slate-100 truncate text-[11px] font-semibold">
              {cellVal !== null && cellVal !== undefined && cellVal !== ''
                ? String(cellVal)
                : '(Kosong)'}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px] italic">
            Klik sel di tabel untuk mode spreadsheet Excel
          </span>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onCut}
          disabled={!activeCell}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-medium rounded-lg border border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed text-[11px]"
          title="Potong isi sel (Ctrl+X)"
        >
          <Scissors className="w-3.5 h-3.5 text-amber-400" />
          <span>Potong</span>
          <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">(Ctrl+X)</span>
        </button>

        <button
          type="button"
          onClick={onCopy}
          disabled={!activeCell}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-medium rounded-lg border border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed text-[11px]"
          title="Salin isi sel / baris (Ctrl+C)"
        >
          <Copy className="w-3.5 h-3.5 text-sky-400" />
          <span>Salin</span>
          <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">(Ctrl+C)</span>
        </button>

        <button
          type="button"
          onClick={onPaste}
          disabled={!activeCell}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-medium rounded-lg border border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed text-[11px]"
          title="Tempel dari clipboard (Ctrl+V)"
        >
          <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tempel</span>
          <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">(Ctrl+V)</span>
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        <button
          type="button"
          onClick={onClearCell}
          disabled={!activeCell}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-medium rounded-lg border border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed text-[11px]"
          title="Bersihkan isi sel terfavorit (Del)"
        >
          <Eraser className="w-3.5 h-3.5 text-orange-400" />
          <span>Bersihkan Sel</span>
        </button>

        {onInsertRowBelow && activeItem && (
          <button
            type="button"
            onClick={() => onInsertRowBelow(activeItem)}
            className="px-2.5 py-1.5 bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 font-semibold rounded-lg border border-emerald-600 transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
            title="Sisipkan baris baru di bawah item aktif"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-300" />
            <span>+ Baris</span>
          </button>
        )}

        {onDeleteRow && activeCell && (
          <button
            type="button"
            onClick={() => onDeleteRow(activeCell.itemId)}
            className="px-2 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 font-semibold rounded-lg border border-rose-800 transition-colors flex items-center gap-1 cursor-pointer text-[11px]"
            title="Hapus baris terkurung"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Hapus Baris</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {onOpenGoogleSheetsSync && (
          <button
            type="button"
            onClick={onOpenGoogleSheetsSync}
            className="px-2.5 py-1.5 bg-emerald-800/90 hover:bg-emerald-700 text-white font-bold rounded-lg border border-emerald-500/70 transition-colors flex items-center gap-1.5 cursor-pointer text-[11px] shadow-xs"
            title="Maintain di Google Spreadsheet & Sinkronisasi Online (Two-Way Live Sync)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
            <span>Google Sheets</span>
            <span className="text-[9px] px-1 py-0.2 bg-emerald-950 text-amber-300 font-mono rounded font-semibold border border-emerald-700">Sync</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenShortcutsModal || (() => setShowGuide(!showGuide))}
          className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer ml-1 text-[11px]"
          title="Panduan Pintasan Keyboard Global (F1 / Shift+?)"
        >
          <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Shortcuts</span>
          <kbd className="hidden lg:inline px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono text-emerald-300">F1</kbd>
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="w-full bg-emerald-900/90 border border-emerald-600 text-emerald-100 text-xs px-3 py-1 rounded-lg animate-fade-in flex items-center justify-between">
          <span className="font-semibold">{toastMessage}</span>
          <span className="text-[10px] text-emerald-300 font-mono">Modul Spreadsheet Aktif</span>
        </div>
      )}

      {/* Keyboard Shortcut Modal / Popover */}
      {showGuide && (
        <div className="w-full mt-2 bg-slate-800/95 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 space-y-2 relative animate-fade-in">
          <button
            onClick={() => setShowGuide(false)}
            className="absolute top-2 right-2 text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm border-b border-slate-700 pb-1.5">
            <Keyboard className="w-4 h-4" />
            <span>Panduan Shortcut Spreadsheet Excel:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/60">
              <span className="font-mono font-bold text-emerald-300">Panah (▲ ▼ ◄ ►)</span>: Navigasi pindah sel
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/60">
              <span className="font-mono font-bold text-emerald-300">Enter / F2</span>: Edit sel / Simpan &amp; pindah bawah
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/60">
              <span className="font-mono font-bold text-emerald-300">Tab / Shift+Tab</span>: Pindah sel kanan / kiri
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/60">
              <span className="font-mono font-bold text-emerald-300">Ctrl + C</span>: Salin sel / baris
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/60">
              <span className="font-mono font-bold text-emerald-300">Ctrl + X</span>: Potong isi sel
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/60">
              <span className="font-mono font-bold text-emerald-300">Ctrl + V</span>: Tempel dari Excel / Clipboard
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/60">
              <span className="font-mono font-bold text-emerald-300">Delete / Backspace</span>: Hapus isi sel
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/60">
              <span className="font-mono font-bold text-emerald-300">Ketik Karakter</span>: Langsung ketik untuk edit sel
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/60">
              <span className="font-mono font-bold text-emerald-300">Klik Kanan</span>: Menu Konteks Spreadsheet
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
