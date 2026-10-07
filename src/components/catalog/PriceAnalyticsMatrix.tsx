import React, { useState } from 'react';
import { TonnageCalculator, MaterialTypeDefinition } from '../../utils/tonnageCalculator';
import { Tag, Sparkles, Wrench, Edit2, Check, TrendingUp } from 'lucide-react';

interface PriceAnalyticsMatrixProps {
  catalog: MaterialTypeDefinition[];
  onUpdatePrice: (code: string, newPrice: number) => void;
}

export const PriceAnalyticsMatrix: React.FC<PriceAnalyticsMatrixProps> = ({
  catalog,
  onUpdatePrice,
}) => {
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState<string>('');

  const handleStartEdit = (code: string, currentPrice: number) => {
    setEditingCode(code);
    setDraftPrice(String(currentPrice));
  };

  const handleSaveEdit = (code: string) => {
    const p = parseFloat(draftPrice);
    if (!isNaN(p)) {
      onUpdatePrice(code, Math.max(0, p));
    }
    setEditingCode(null);
  };

  // Helper to find price from catalog or fallback
  const getPrice = (code: string, fallback: number) => {
    const item = catalog.find((c) => c.code.toUpperCase() === code.toUpperCase());
    return item ? item.defaultUnitPrice : fallback;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Pelat Baja Komparasi Kelas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Komparasi Pelat Lambung &amp; Baja
            </h4>
            <Tag className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="space-y-2">
            {[
              { code: 'PL BKI', name: 'BKI Grade A (Klas Biro Klasifikasi)', defaultVal: 48000 },
              { code: 'PL ABS', name: 'ABS Class (IACS Internasional)', defaultVal: 52000 },
              { code: 'PL NC', name: 'Non-Class (Pelat Sekat Umum)', defaultVal: 42000 },
              { code: 'PL SS304', name: 'Stainless Steel SUS 304', defaultVal: 85000 },
            ].map((item) => {
              const currentPrice = getPrice(item.code, item.defaultVal);
              const isEditing = editingCode === item.code;

              return (
                <div
                  key={item.code}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900 font-mono">{item.code}</div>
                    <div className="text-[10px] text-slate-500">{item.name}</div>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={draftPrice}
                        onChange={(e) => setDraftPrice(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(item.code)}
                        autoFocus
                        className="w-24 px-1.5 py-0.5 text-xs font-mono font-bold bg-white border border-emerald-500 rounded text-right"
                      />
                      <button
                        onClick={() => handleSaveEdit(item.code)}
                        className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleStartEdit(item.code, currentPrice)}
                      className="cursor-pointer group flex items-center gap-1 font-mono font-bold text-xs text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded transition-colors"
                      title="Klik untuk edit harga langsung"
                    >
                      <span>{TonnageCalculator.formatRupiah(currentPrice)}/kg</span>
                      <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Jasa Blasting & Cat */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Tarif Blasting &amp; Pengecatan
            </h4>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div className="space-y-2">
            {[
              { code: 'BLAST SA 2.5', name: 'Sandblasting Sa 2.5 Standar ISO', unit: 'm²', defaultVal: 75000 },
              { code: 'BLAST SWEEP', name: 'Sweep Blasting Lambung', unit: 'm²', defaultVal: 45000 },
              { code: 'HP WASH', name: 'HP Water Wash 350 Bar', unit: 'm²', defaultVal: 20000 },
              { code: 'PAINT AC', name: 'Cat Anti-Corrosive (AC Primer)', unit: 'm²', defaultVal: 25000 },
              { code: 'PAINT AF', name: 'Cat Anti-Fouling (AF Finish)', unit: 'm²', defaultVal: 35000 },
            ].map((item) => {
              const currentPrice = getPrice(item.code, item.defaultVal);
              const isEditing = editingCode === item.code;

              return (
                <div
                  key={item.code}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900 font-mono">{item.code}</div>
                    <div className="text-[10px] text-slate-500">{item.name}</div>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={draftPrice}
                        onChange={(e) => setDraftPrice(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(item.code)}
                        autoFocus
                        className="w-24 px-1.5 py-0.5 text-xs font-mono font-bold bg-white border border-emerald-500 rounded text-right"
                      />
                      <button
                        onClick={() => handleSaveEdit(item.code)}
                        className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleStartEdit(item.code, currentPrice)}
                      className="cursor-pointer group flex items-center gap-1 font-mono font-bold text-xs text-amber-700 hover:bg-amber-50 px-1.5 py-0.5 rounded transition-colors"
                      title="Klik untuk edit harga langsung"
                    >
                      <span>{TonnageCalculator.formatRupiah(currentPrice)}/{item.unit}</span>
                      <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-amber-600 opacity-0 group-hover:opacity-100" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Jasa Galangan & Fasilitas Dok */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Fasilitas &amp; Jasa Khusus Dok
            </h4>
            <Wrench className="w-4 h-4 text-blue-600" />
          </div>
          <div className="space-y-2">
            {[
              { code: 'DOCKING', name: 'Sewa Graving / Slipway Dok', unit: 'day', defaultVal: 4500000 },
              { code: 'SHAFT DRAW', name: 'Cabut/Pasang Poros Kemudi/Propeller', unit: 'set', defaultVal: 15000000 },
              { code: 'PROP POLISH', name: 'Polishing Baling-baling (Propeller)', unit: 'set', defaultVal: 4500000 },
              { code: 'VALVE OH', name: 'Overhaul Katup Laut (Kingston Valve)', unit: 'unit', defaultVal: 1250000 },
              { code: 'ZINC ANODE', name: 'Zinc Anode Proteksi Katodik ZP-5', unit: 'pcs', defaultVal: 380000 },
            ].map((item) => {
              const currentPrice = getPrice(item.code, item.defaultVal);
              const isEditing = editingCode === item.code;

              return (
                <div
                  key={item.code}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900 font-mono">{item.code}</div>
                    <div className="text-[10px] text-slate-500">{item.name}</div>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={draftPrice}
                        onChange={(e) => setDraftPrice(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(item.code)}
                        autoFocus
                        className="w-24 px-1.5 py-0.5 text-xs font-mono font-bold bg-white border border-emerald-500 rounded text-right"
                      />
                      <button
                        onClick={() => handleSaveEdit(item.code)}
                        className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleStartEdit(item.code, currentPrice)}
                      className="cursor-pointer group flex items-center gap-1 font-mono font-bold text-xs text-blue-700 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors"
                      title="Klik untuk edit harga langsung"
                    >
                      <span>{TonnageCalculator.formatRupiah(currentPrice)}/{item.unit}</span>
                      <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-blue-600 opacity-0 group-hover:opacity-100" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
