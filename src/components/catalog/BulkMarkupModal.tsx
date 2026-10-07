import React, { useState } from 'react';
import { Percent, X, AlertCircle, Check } from 'lucide-react';

interface BulkMarkupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (category: string, percentage: number) => void;
}

export const BulkMarkupModal: React.FC<BulkMarkupModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const [targetCategory, setTargetCategory] = useState('all');
  const [markupPercentage, setMarkupPercentage] = useState('5');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && (e.key === 'Escape' || e.key === 'Esc')) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(markupPercentage);
    if (!isNaN(pct)) {
      onApply(targetCategory, pct);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-600" />
            <span>Penyesuaian Tarif Massal (Markup / Margin)</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Kategori Sasaran
            </label>
            <select
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500"
            >
              <option value="all">Semua Kategori Material &amp; Jasa</option>
              <option value="plate">Khusus Pelat Baja (Plate)</option>
              <option value="pipe">Khusus Pipa Baja (Pipe)</option>
              <option value="profile">Khusus Profil Konstruksi (Angle/WF)</option>
              <option value="service">Khusus Jasa &amp; Docking</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Persentase Perubahan (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                value={markupPercentage}
                onChange={(e) => setMarkupPercentage(e.target.value)}
                placeholder="5"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold focus:bg-white focus:border-emerald-500"
                required
              />
              <span className="text-sm font-bold text-slate-600">%</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-[10px] text-slate-400 mr-1">Preset:</span>
              {[+5, +10, +15, -5, -10].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMarkupPercentage(String(p))}
                  className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 border border-slate-200 rounded font-mono transition-colors"
                >
                  {p > 0 ? `+${p}%` : `${p}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Perubahan akan langsung mengupdate tarif satuan pada database master katalog dan diterapkan secara real-time pada kalkulasi Repair List &amp; RAB.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan Penyesuaian</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
