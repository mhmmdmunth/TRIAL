import React from 'react';
import { X, Keyboard, Command, Sparkles, CheckCircle2 } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keyCombo: string[];
  description: string;
  category: 'global' | 'spreadsheet' | 'clipboard';
}

const SHORTCUTS: ShortcutItem[] = [
  // Global
  { keyCombo: ['Ctrl', 'S'], description: 'Simpan data proyek manual ke SQLite', category: 'global' },
  { keyCombo: ['Ctrl', 'N'], description: 'Tambah item pekerjaan baru (Modal)', category: 'global' },
  { keyCombo: ['Ctrl', 'F'], description: 'Fokus ke kolom pencarian item', category: 'global' },
  { keyCombo: ['F1'], description: 'Buka panduan pintasan keyboard ini', category: 'global' },

  // Spreadsheet Navigation & Edit
  { keyCombo: ['Panah ▲ ▼ ◄ ►'], description: 'Navigasi pindah sel aktif', category: 'spreadsheet' },
  { keyCombo: ['Tab'], description: 'Pindah sel ke kanan & langsung edit', category: 'spreadsheet' },
  { keyCombo: ['Shift', 'Tab'], description: 'Pindah sel ke kiri & langsung edit', category: 'spreadsheet' },
  { keyCombo: ['Enter'], description: 'Simpan edit sel & pindah sel ke bawah', category: 'spreadsheet' },
  { keyCombo: ['F2'], description: 'Mulai edit sel terpilih', category: 'spreadsheet' },
  { keyCombo: ['Escape'], description: 'Batalkan mode edit / pilihan sel', category: 'spreadsheet' },
  { keyCombo: ['Ketik Teks'], description: 'Langsung timpa & edit isi sel', category: 'spreadsheet' },
  { keyCombo: ['Delete'], description: 'Bersihkan isi sel aktif', category: 'spreadsheet' },

  // Clipboard
  { keyCombo: ['Ctrl', 'C'], description: 'Salin sel / baris terpilih', category: 'clipboard' },
  { keyCombo: ['Ctrl', 'X'], description: 'Potong isi sel terpilih', category: 'clipboard' },
  { keyCombo: ['Ctrl', 'V'], description: 'Tempel dari Excel / Clipboard', category: 'clipboard' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#03442C] text-white px-6 py-4 flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800/80 rounded-xl border border-emerald-600/60 shadow-inner">
              <Keyboard className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
                <span>Pintasan Keyboard (Keyboard Shortcuts)</span>
                <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-mono font-medium">
                  Mode Cepat
                </span>
              </h3>
              <p className="text-xs text-emerald-200/80">
                Gunakan pintasan keyboard untuk bekerja efisien tanpa menggerakkan mouse
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800/80 rounded-lg transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs">
          {/* Main Global Shortcuts */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Command className="w-4 h-4 text-emerald-600" />
              <span>Pintasan Global Utama</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {SHORTCUTS.filter((s) => s.category === 'global').map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors"
                >
                  <span className="font-medium text-slate-800">{s.description}</span>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {s.keyCombo.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2 py-1 text-[11px] font-mono font-bold bg-white text-slate-800 border border-slate-300 rounded-md shadow-2xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spreadsheet Navigation & Editing */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Navigasi &amp; Pengeditan Spreadsheet (Excel Engine)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {SHORTCUTS.filter((s) => s.category === 'spreadsheet').map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors"
                >
                  <span className="font-medium text-slate-800">{s.description}</span>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {s.keyCombo.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2 py-1 text-[11px] font-mono font-bold bg-white text-slate-800 border border-slate-300 rounded-md shadow-2xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clipboard Shortcuts */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <span>Salin &amp; Tempel (Clipboard)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {SHORTCUTS.filter((s) => s.category === 'clipboard').map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors"
                >
                  <span className="font-medium text-slate-800">{s.description}</span>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {s.keyCombo.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2 py-1 text-[11px] font-mono font-bold bg-white text-slate-800 border border-slate-300 rounded-md shadow-2xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pintasan keyboard otomatis aktif pada tampilan tabel Repair List.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#03442C] hover:bg-[#04593A] text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
          >
            Mengerti &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
