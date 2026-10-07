import React, { useState, useEffect } from 'react';
import { MaterialTypeDefinition } from '../../utils/tonnageCalculator';
import { Tag, Save, X, Layers, AlertCircle } from 'lucide-react';

interface EditMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (oldCode: string, item: MaterialTypeDefinition) => boolean;
  initialItem?: MaterialTypeDefinition | null;
  mode: 'add' | 'edit';
}

export const EditMaterialModal: React.FC<EditMaterialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  mode,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'plate' | 'pipe' | 'profile' | 'service' | 'other'>('plate');
  const [categoryLabel, setCategoryLabel] = useState('Pelat Baja');
  const [defaultUnit, setDefaultUnit] = useState('kg');
  const [defaultUnitPrice, setDefaultUnitPrice] = useState('48000');
  const [d1Label, setD1Label] = useState('P (mm)');
  const [d2Label, setD2Label] = useState('L (mm)');
  const [d3Label, setD3Label] = useState('T (mm)');
  const [d4Label, setD4Label] = useState('Pcs');
  const [defaultD1, setDefaultD1] = useState('');
  const [defaultD2, setDefaultD2] = useState('');
  const [defaultD3, setDefaultD3] = useState('');
  const [defaultD4, setDefaultD4] = useState('1');
  const [density, setDensity] = useState('7.85');
  const [weightPerMeterKg, setWeightPerMeterKg] = useState('');
  const [weightPerSqmKg, setWeightPerSqmKg] = useState('');
  const [isSteelTonnage, setIsSteelTonnage] = useState(true);
  const [descriptionHint, setDescriptionHint] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const onCloseRef = React.useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialItem && mode === 'edit') {
      setCode(initialItem.code);
      setName(initialItem.name);
      setCategory(initialItem.category);
      setCategoryLabel(initialItem.categoryLabel);
      setDefaultUnit(initialItem.defaultUnit);
      setDefaultUnitPrice(String(initialItem.defaultUnitPrice));
      setD1Label(initialItem.d1Label || 'P (mm)');
      setD2Label(initialItem.d2Label || 'L (mm)');
      setD3Label(initialItem.d3Label || 'T (mm)');
      setD4Label(initialItem.d4Label || 'Pcs');
      setDefaultD1(initialItem.defaultD1 ? String(initialItem.defaultD1) : '');
      setDefaultD2(initialItem.defaultD2 ? String(initialItem.defaultD2) : '');
      setDefaultD3(initialItem.defaultD3 ? String(initialItem.defaultD3) : '');
      setDefaultD4(initialItem.defaultD4 ? String(initialItem.defaultD4) : '1');
      setDensity(initialItem.density ? String(initialItem.density) : '7.85');
      setWeightPerMeterKg(initialItem.weightPerMeterKg ? String(initialItem.weightPerMeterKg) : '');
      setWeightPerSqmKg(initialItem.weightPerSqmKg ? String(initialItem.weightPerSqmKg) : '');
      setIsSteelTonnage(initialItem.isSteelTonnage !== false);
      setDescriptionHint(initialItem.descriptionHint || '');
      setErrorMsg('');
    } else {
      setCode('');
      setName('');
      setCategory('plate');
      setCategoryLabel('Pelat Baja');
      setDefaultUnit('kg');
      setDefaultUnitPrice('48000');
      setD1Label('P (mm)');
      setD2Label('L (mm)');
      setD3Label('T (mm)');
      setD4Label('Pcs');
      setDefaultD1('6000');
      setDefaultD2('1500');
      setDefaultD3('12');
      setDefaultD4('1');
      setDensity('7.85');
      setWeightPerMeterKg('');
      setWeightPerSqmKg('');
      setIsSteelTonnage(true);
      setDescriptionHint('');
      setErrorMsg('');
    }
  }, [initialItem, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setErrorMsg('Kode dan Nama Material wajib diisi');
      return;
    }

    const priceNum = parseFloat(defaultUnitPrice) || 0;
    const catBadge =
      category === 'plate'
        ? 'bg-slate-100 text-slate-700 border-slate-200'
        : category === 'pipe'
        ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
        : category === 'profile'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : category === 'service'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';

    const itemObj: MaterialTypeDefinition = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      category,
      categoryLabel,
      defaultUnit: defaultUnit.trim() || 'kg',
      defaultUnitPrice: priceNum,
      badgeBg: catBadge,
      d1Label: d1Label.trim() || undefined,
      d2Label: d2Label.trim() || undefined,
      d3Label: d3Label.trim() || undefined,
      d4Label: d4Label.trim() || undefined,
      defaultD1: defaultD1 ? parseFloat(defaultD1) : undefined,
      defaultD2: defaultD2 ? parseFloat(defaultD2) : undefined,
      defaultD3: defaultD3 ? parseFloat(defaultD3) : undefined,
      defaultD4: defaultD4 ? parseFloat(defaultD4) : 1,
      density: density ? parseFloat(density) : 7.85,
      weightPerMeterKg: weightPerMeterKg ? parseFloat(weightPerMeterKg) : undefined,
      weightPerSqmKg: weightPerSqmKg ? parseFloat(weightPerSqmKg) : undefined,
      isSteelTonnage,
      descriptionHint: descriptionHint.trim() || undefined,
    };

    const oldCode = initialItem?.code || itemObj.code;
    const ok = onSave(oldCode, itemObj);
    if (ok) {
      onClose();
    } else {
      setErrorMsg(`Kode "${itemObj.code}" sudah ada di database, gunakan kode lain.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            <span>{mode === 'add' ? 'Tambah Item Material / Jasa Baru' : `Edit Spesifikasi: ${code}`}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Code & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Tipe Material (Bisa Diedit) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setErrorMsg('');
                }}
                placeholder='Contoh: PL BKI, PIPE 3" SCH40, L 50x50x5'
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as any;
                  setCategory(cat);
                  const catLabelMap: Record<string, string> = {
                    plate: 'Pelat Baja',
                    pipe: 'Pipa Baja',
                    profile: 'Profil Konstruksi',
                    service: 'Jasa & Docking',
                    other: 'Lainnya',
                  };
                  setCategoryLabel(catLabelMap[cat] || 'Umum');
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white"
              >
                <option value="plate">Pelat Baja (Steel Plate)</option>
                <option value="pipe">Pipa Baja (Pipe & Tubing)</option>
                <option value="profile">Profil Konstruksi (Siku/WF/Strip/Round)</option>
                <option value="service">Jasa & Docking (Blasting/Cat/Overhaul)</option>
                <option value="other">Lainnya / Material Khusus</option>
              </select>
            </div>
          </div>

          {/* Row 2: Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama & Spesifikasi Teknis Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Pelat Baja Marine BKI Grade A t=12mm (7.85 kg/dm³)"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Row 3: Price & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tarif Satuan Dasar (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="100"
                value={defaultUnitPrice}
                onChange={(e) => setDefaultUnitPrice(e.target.value)}
                placeholder="48000"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-emerald-800 focus:bg-white focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Satuan Standar (Unit) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={defaultUnit}
                onChange={(e) => setDefaultUnit(e.target.value)}
                placeholder="kg / m / m² / day / pcs / set / unit"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-semibold focus:bg-white focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Technical Specs: Density & Weight */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block">
              Parameter Teknis & Kalkulator
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-medium">Densitas (kg/dm³)</label>
                <input
                  type="number"
                  step="0.01"
                  value={density}
                  onChange={(e) => setDensity(e.target.value)}
                  placeholder="7.85"
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-medium">Berat Standar (kg/m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={weightPerMeterKg}
                  onChange={(e) => setWeightPerMeterKg(e.target.value)}
                  placeholder="Khusus Pipa/Profil"
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-medium">Berat Standar (kg/m²)</label>
                <input
                  type="number"
                  step="0.01"
                  value={weightPerSqmKg}
                  onChange={(e) => setWeightPerSqmKg(e.target.value)}
                  placeholder="Khusus Bordes/Grating"
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                />
              </div>
            </div>
          </div>

          {/* Dimension Labels & Default Values */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">
                Spesifikasi Dimensi Default D1 - D4
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Untuk Form & Kalkulator</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500">Label D1</label>
                <input
                  type="text"
                  value={d1Label}
                  onChange={(e) => setD1Label(e.target.value)}
                  placeholder="P (mm)"
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono mb-1"
                />
                <input
                  type="number"
                  value={defaultD1}
                  onChange={(e) => setDefaultD1(e.target.value)}
                  placeholder="Nilai D1"
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Label D2</label>
                <input
                  type="text"
                  value={d2Label}
                  onChange={(e) => setD2Label(e.target.value)}
                  placeholder="L (mm)"
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono mb-1"
                />
                <input
                  type="number"
                  value={defaultD2}
                  onChange={(e) => setDefaultD2(e.target.value)}
                  placeholder="Nilai D2"
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Label D3</label>
                <input
                  type="text"
                  value={d3Label}
                  onChange={(e) => setD3Label(e.target.value)}
                  placeholder="T (mm)"
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono mb-1"
                />
                <input
                  type="number"
                  value={defaultD3}
                  onChange={(e) => setDefaultD3(e.target.value)}
                  placeholder="Nilai D3"
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Label D4</label>
                <input
                  type="text"
                  value={d4Label}
                  onChange={(e) => setD4Label(e.target.value)}
                  placeholder="Pcs"
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono mb-1"
                />
                <input
                  type="number"
                  value={defaultD4}
                  onChange={(e) => setDefaultD4(e.target.value)}
                  placeholder="Nilai D4"
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                />
              </div>
            </div>
          </div>

          {/* Description Hint */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Petunjuk Deskripsi Standar (Description Hint)
            </label>
            <input
              type="text"
              value={descriptionHint}
              onChange={(e) => setDescriptionHint(e.target.value)}
              placeholder="Contoh: Replating Pelat Lambung BKI Grade A t=12mm"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500"
            />
          </div>

          {/* Steel Tonnage Calculation Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isSteelTonnageCheck"
              checked={isSteelTonnage}
              onChange={(e) => setIsSteelTonnage(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="isSteelTonnageCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
              Hitung sebagai Tonase Baja Struktural dalam Rekapitulasi Proyek
            </label>
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
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
              <Save className="w-4 h-4" />
              <span>Simpan ke Database</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
