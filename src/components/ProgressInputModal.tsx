import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Percent,
  Hash,
  Sliders,
  Calendar,
  FileText,
  AlertCircle,
  Layers,
  DollarSign,
  Scale,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { WorkItem } from '../types';
import { TonnageCalculator } from '../utils/tonnageCalculator';

interface ProgressInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WorkItem | null;
  childItemsCount?: number;
  onSaveProgress: (updatedItem: WorkItem, cascadeToChildren?: boolean) => void;
}

export const ProgressInputModal: React.FC<ProgressInputModalProps> = ({
  isOpen,
  onClose,
  item,
  childItemsCount = 0,
  onSaveProgress,
}) => {
  const [inputMode, setInputMode] = useState<'percent' | 'number'>('percent');
  const [percentValue, setPercentValue] = useState<number>(0);
  const [qtyValue, setQtyValue] = useState<number>(0);
  const [progressNotes, setProgressNotes] = useState<string>('');
  const [progressDate, setProgressDate] = useState<string>('');
  const [cascadeToChildren, setCascadeToChildren] = useState<boolean>(true);

  // Initialize values when item changes
  useEffect(() => {
    if (item && isOpen) {
      const currentPct = item.progressPercent !== undefined
        ? item.progressPercent
        : (item.isCompleted ? 100 : 0);
      
      const currentQty = item.progressQty !== undefined
        ? item.progressQty
        : ((currentPct / 100) * (item.qty || 1));

      setPercentValue(Math.min(100, Math.max(0, Math.round(currentPct))));
      setQtyValue(Number(currentQty.toFixed(2)));
      setProgressNotes(item.progressNotes || item.notes || '');
      
      const todayFormatted = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      setProgressDate(item.progressDate || todayFormatted);
      setCascadeToChildren(true);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  // Handle Percentage change
  const handlePercentChange = (newPct: number) => {
    const clampedPct = Math.min(100, Math.max(0, newPct));
    setPercentValue(clampedPct);
    if (item && item.qty > 0) {
      const calculatedQty = (clampedPct / 100) * item.qty;
      setQtyValue(Number(calculatedQty.toFixed(2)));
    }
  };

  // Handle Qty / Number change
  const handleQtyChange = (newQty: number) => {
    if (!item) return;
    const maxQty = item.qty > 0 ? item.qty : 1;
    const clampedQty = Math.max(0, Math.min(maxQty, newQty));
    setQtyValue(clampedQty);
    const calculatedPct = Math.min(100, Math.max(0, Math.round((clampedQty / maxQty) * 100)));
    setPercentValue(calculatedPct);
  };

  const handleSave = () => {
    if (!item) return;

    const isCompleted = percentValue >= 100;
    const updatedItem: WorkItem = {
      ...item,
      progressPercent: percentValue,
      progressQty: qtyValue,
      progressNotes: progressNotes.trim(),
      progressDate: progressDate,
      isCompleted: isCompleted,
    };

    onSaveProgress(updatedItem, childItemsCount > 0 ? cascadeToChildren : false);
    onClose();
  };

  // Calculation helpers
  const totalQty = item.qty || 1;
  const remainingQty = Math.max(0, totalQty - qtyValue);
  const realizedCost = (percentValue / 100) * (item.totalPrice || 0);
  const remainingCost = Math.max(0, (item.totalPrice || 0) - realizedCost);
  const totalWeightKg = item.weightKg || 0;
  const realizedWeightKg = (percentValue / 100) * totalWeightKg;

  const quickPresets = [0, 10, 25, 50, 75, 90, 100];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                Item {item.itemNo}
              </span>
              {item.type && (
                <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono text-[10px] uppercase">
                  {item.type}
                </span>
              )}
              {item.isAreaHeader && (
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                  Judul Area
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1">
              {item.description}
            </h2>
            <p className="text-xs text-slate-300">
              Total Target: <strong>{item.qty} {item.unit}</strong>
              {item.weightKg && item.weightKg > 0 ? ` (${TonnageCalculator.formatWeight(item.weightKg)})` : ''} &bull; Nilai RAB: <strong>{TonnageCalculator.formatRupiah(item.totalPrice)}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
          {/* Mode Selector Tabs */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Metode Input Progres
            </label>
            <div className="bg-slate-100 p-0.5 rounded-lg flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setInputMode('percent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${
                  inputMode === 'percent'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent className="w-3.5 h-3.5 text-emerald-600" />
                <span>Persentase (%)</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('number')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${
                  inputMode === 'number'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                <span>Angka / Volume ({item.unit})</span>
              </button>
            </div>
          </div>

          {/* Input Controls based on active mode */}
          {inputMode === 'percent' ? (
            /* Mode 1: Persentase */
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-slate-600">Progres Capaian (%)</span>
                  <p className="text-[11px] text-slate-500">Geser slider atau ketik nilai 0 - 100%</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={percentValue}
                    onChange={(e) => handlePercentChange(Number(e.target.value))}
                    className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-lg font-black text-slate-900 text-center focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="font-bold text-slate-700 text-base">%</span>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentValue}
                  onChange={(e) => handlePercentChange(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>0% (Mulai)</span>
                  <span>25%</span>
                  <span>50% (Separuh)</span>
                  <span>75%</span>
                  <span>100% (Selesai)</span>
                </div>
              </div>

              {/* Quick Preset Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Preset Cepat:</span>
                {quickPresets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePercentChange(p)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono transition-all border ${
                      percentValue === p
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p === 100 ? '100% (Selesai)' : `${p}%`}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Mode 2: Angka Riil / Volume */
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-slate-600">Volume / Kuantitas Riil ({item.unit})</span>
                  <p className="text-[11px] text-slate-500">
                    Kapasitas Total: <strong>{item.qty} {item.unit}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={item.qty}
                    value={qtyValue}
                    onChange={(e) => handleQtyChange(Number(e.target.value))}
                    className="w-28 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-lg font-black text-slate-900 text-center focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="font-bold text-slate-700 text-sm">{item.unit}</span>
                </div>
              </div>

              {/* Quick Stepper Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Penyesuaian:</span>
                <button
                  type="button"
                  onClick={() => handleQtyChange(0)}
                  className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-xs font-mono font-medium text-slate-700"
                >
                  0 {item.unit}
                </button>
                {item.qty >= 2 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleQtyChange(Math.max(0, qtyValue - 1))}
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-xs font-mono font-bold text-slate-700"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQtyChange(Math.min(item.qty, qtyValue + 1))}
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-xs font-mono font-bold text-slate-700"
                    >
                      +1
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleQtyChange(Number((item.qty / 2).toFixed(2)))}
                  className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-xs font-mono font-medium text-slate-700"
                >
                  50% ({(item.qty / 2).toFixed(1)} {item.unit})
                </button>
                <button
                  type="button"
                  onClick={() => handleQtyChange(item.qty)}
                  className="px-2.5 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-mono font-bold"
                >
                  Maks ({item.qty} {item.unit})
                </button>
              </div>

              {/* Equivalent percentage preview */}
              <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 flex items-center justify-between text-xs text-blue-900">
                <span className="font-medium">Setara dengan Persentase Progres:</span>
                <span className="text-sm font-black font-mono bg-blue-600 text-white px-2 py-0.5 rounded">
                  {percentValue}%
                </span>
              </div>
            </div>
          )}

          {/* Real-time Calculation Summary Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Ringkasan Realisasi Lapangan
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                percentValue === 100 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : percentValue > 0 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {percentValue === 100 ? 'Selesai 100%' : percentValue > 0 ? `Progres ${percentValue}%` : 'Belum Dimulai'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Realisasi Volume</span>
                <div className="text-xs font-bold text-slate-800 font-mono">
                  {qtyValue} / {item.qty} {item.unit}
                </div>
                <div className="text-[10px] text-slate-400">
                  Sisa: {remainingQty.toFixed(2)} {item.unit}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Realisasi Biaya RAB</span>
                <div className="text-xs font-bold text-emerald-700 font-mono">
                  {TonnageCalculator.formatRupiah(realizedCost)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Sisa: {TonnageCalculator.formatRupiah(remainingCost)}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Realisasi Tonase</span>
                <div className="text-xs font-bold text-amber-700 font-mono">
                  {totalWeightKg > 0 ? TonnageCalculator.formatWeight(realizedWeightKg) : '-'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {totalWeightKg > 0 ? `Total: ${TonnageCalculator.formatWeight(totalWeightKg)}` : 'Non-baja'}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Date & Notes Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Tanggal Update Realisasi
              </label>
              <input
                type="text"
                value={progressDate}
                onChange={(e) => setProgressDate(e.target.value)}
                placeholder="Contoh: 10 Sep 2026"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Catatan / Kendala Lapangan
              </label>
              <input
                type="text"
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                placeholder="Contoh: Pemasangan pelat selesai 75%, siap pengelasan"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Cascade to children option if parent Area / Sub-system has children */}
          {childItemsCount > 0 && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
              <input
                type="checkbox"
                id="cascadeCheckbox"
                checked={cascadeToChildren}
                onChange={(e) => setCascadeToChildren(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="cascadeCheckbox" className="text-xs text-emerald-950 font-medium cursor-pointer">
                <strong>Terapkan ke {childItemsCount} sub-pekerjaan di bawahnya (Cascade).</strong>
                <p className="text-[11px] text-emerald-800 font-normal mt-0.5">
                  Seluruh sub-item dan komponen dalam kelompok ini akan otomatis diselaraskan dengan progres {percentValue}%.
                </p>
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Progres ({percentValue}%)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
