import React, { useEffect, useRef } from 'react';
import {
  Scissors,
  Copy,
  ClipboardPaste,
  Plus,
  Trash2,
  Eraser,
  CornerDownRight,
  Edit3,
} from 'lucide-react';
import { WorkItem } from '../types';

interface SpreadsheetContextMenuProps {
  x: number;
  y: number;
  item: WorkItem;
  field?: string;
  onClose: () => void;
  onCut: () => void;
  onCopy: () => void;
  onCopyRow?: (item: WorkItem) => void;
  onPaste: () => void;
  onClearCell: () => void;
  onInsertRowAbove?: (item: WorkItem) => void;
  onInsertRowBelow?: (item: WorkItem) => void;
  onDeleteRow?: (itemId: string) => void;
  onEditRow?: (item: WorkItem) => void;
}

export const SpreadsheetContextMenu: React.FC<SpreadsheetContextMenuProps> = ({
  x,
  y,
  item,
  field,
  onClose,
  onCut,
  onCopy,
  onCopyRow,
  onPaste,
  onClearCell,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
  onEditRow,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust positioning to avoid going offscreen
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-56 bg-white border border-slate-300 rounded-xl shadow-xl py-1.5 text-xs text-slate-800 animate-fade-in select-none divide-y divide-slate-100 font-sans"
    >
      {/* Header Info */}
      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-mono text-slate-500 font-bold flex items-center justify-between">
        <span>SEL: {item.itemNo || 'Item'}</span>
        {field && <span className="uppercase text-emerald-700 bg-emerald-100 px-1 rounded">{field}</span>}
      </div>

      {/* Clipboard actions */}
      <div className="py-1">
        <button
          onClick={() => {
            onCut();
            onClose();
          }}
          className="w-full px-3 py-1.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Scissors className="w-3.5 h-3.5 text-amber-600" />
            <span>Potong (Cut)</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Ctrl+X</span>
        </button>

        <button
          onClick={() => {
            onCopy();
            onClose();
          }}
          className="w-full px-3 py-1.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-sky-600" />
            <span>Salin Sel (Copy)</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
        </button>

        {onCopyRow && (
          <button
            onClick={() => {
              onCopyRow(item);
              onClose();
            }}
            className="w-full px-3 py-1.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 flex items-center justify-between transition-colors cursor-pointer font-semibold"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-emerald-600" />
              <span>Salin Baris (No. s/d REMARK)</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-mono">12 Kolom</span>
          </button>
        )}

        <button
          onClick={() => {
            onPaste();
            onClose();
          }}
          className="w-full px-3 py-1.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tempel (Paste)</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Ctrl+V</span>
        </button>

        <button
          onClick={() => {
            onClearCell();
            onClose();
          }}
          className="w-full px-3 py-1.5 hover:bg-amber-50 text-slate-700 hover:text-amber-900 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Eraser className="w-3.5 h-3.5 text-orange-600" />
            <span>Bersihkan Isi Sel</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Del</span>
        </button>
      </div>

      {/* Row Insert/Delete actions */}
      <div className="py-1">
        {onInsertRowAbove && (
          <button
            onClick={() => {
              onInsertRowAbove(item);
              onClose();
            }}
            className="w-full px-3 py-1.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sisipkan Baris di Atas</span>
          </button>
        )}

        {onInsertRowBelow && (
          <button
            onClick={() => {
              onInsertRowBelow(item);
              onClose();
            }}
            className="w-full px-3 py-1.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <CornerDownRight className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sisipkan Baris di Bawah</span>
          </button>
        )}

        {onEditRow && (
          <button
            onClick={() => {
              onEditRow(item);
              onClose();
            }}
            className="w-full px-3 py-1.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Edit Full Baris Ini</span>
          </button>
        )}

        {onDeleteRow && (
          <button
            onClick={() => {
              onDeleteRow(item.id);
              onClose();
            }}
            className="w-full px-3 py-1.5 hover:bg-rose-50 text-rose-700 hover:text-rose-900 flex items-center gap-2 transition-colors cursor-pointer font-medium"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Hapus Baris Pekerjaan</span>
          </button>
        )}
      </div>
    </div>
  );
};
