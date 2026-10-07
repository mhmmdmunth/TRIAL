import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Save,
  Plus,
  Box,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Search,
} from 'lucide-react';
import {
  ProjectMaterialEstimate,
  MaterialClassification,
  MaterialProcurementStatus,
  WorkItem,
  WorkCategory,
} from '../../types';
import {
  MATERIAL_CLASSIFICATIONS,
  MATERIAL_PROCUREMENT_STATUSES,
  calculateMaterialItemCost,
} from '../../services/materialEstimationService';

interface MaterialEstimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<ProjectMaterialEstimate>) => void;
  initialItem?: ProjectMaterialEstimate | null;
  workItems: WorkItem[];
  categories: WorkCategory[];
  defaultWorkItemId?: string;
}

export const MaterialEstimationModal: React.FC<MaterialEstimationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  workItems = [],
  categories = [],
  defaultWorkItemId,
}) => {
  const [materialCode, setMaterialCode] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [classification, setClassification] = useState<MaterialClassification>('steel_structure');
  const [specification, setSpecification] = useState('');
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');

  const [dimension1, setDimension1] = useState('');
  const [dimension2, setDimension2] = useState('');
  const [dimension3, setDimension3] = useState('');
  const [dimensionLen, setDimensionLen] = useState('');
  const [calculatedWeightKg, setCalculatedWeightKg] = useState<string>('');

  const [qtyRequired, setQtyRequired] = useState<string>('1');
  const [qtyBufferPercent, setQtyBufferPercent] = useState<string>('5');
  const [unit, setUnit] = useState<string>('lbr');
  const [unitPrice, setUnitPrice] = useState<string>('0');
  const [priceBasis, setPriceBasis] = useState<'qty' | 'weight'>('qty');

  const [brandOrStandard, setBrandOrStandard] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [procurementStatus, setProcurementStatus] = useState<MaterialProcurementStatus>('Estimasi');
  const [leadTimeDays, setLeadTimeDays] = useState<string>('5');
  const [locationOrTarget, setLocationOrTarget] = useState('');
  const [notes, setNotes] = useState('');

  // Search filter for work items in dropdown
  const [searchWorkItem, setSearchWorkItem] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (initialItem) {
      setMaterialCode(initialItem.materialCode || '');
      setMaterialName(initialItem.materialName || '');
      setClassification(initialItem.classification || 'steel_structure');
      setSpecification(initialItem.specification || '');
      setSelectedWorkItemId(initialItem.workItemId || '');
      setCategoryId(initialItem.categoryId || '');
      setDimension1(initialItem.dimension1 || '');
      setDimension2(initialItem.dimension2 || '');
      setDimension3(initialItem.dimension3 || '');
      setDimensionLen(initialItem.dimensionLen || '');
      setCalculatedWeightKg(initialItem.calculatedWeightKg ? String(initialItem.calculatedWeightKg) : '');
      setQtyRequired(String(initialItem.qtyRequired ?? 1));
      setQtyBufferPercent(String(initialItem.qtyBufferPercent ?? 5));
      setUnit(initialItem.unit || 'lbr');
      setUnitPrice(String(initialItem.unitPrice ?? 0));
      setPriceBasis(initialItem.priceBasis || 'qty');
      setBrandOrStandard(initialItem.brandOrStandard || '');
      setSupplierName(initialItem.supplierName || '');
      setProcurementStatus(initialItem.procurementStatus || 'Estimasi');
      setLeadTimeDays(String(initialItem.leadTimeDays ?? 5));
      setLocationOrTarget(initialItem.locationOrTarget || '');
      setNotes(initialItem.notes || '');
    } else {
      // New Item defaults
      const autoCode = `MAT-${Date.now().toString().slice(-4)}`;
      setMaterialCode(autoCode);
      setMaterialName('');
      setClassification('steel_structure');
      setSpecification('');
      setSelectedWorkItemId(defaultWorkItemId || '');
      
      const defaultItem = defaultWorkItemId ? (workItems || []).find((w) => w.id === defaultWorkItemId) : null;
      if (defaultItem) {
        setCategoryId(defaultItem.categoryId);
        setLocationOrTarget(defaultItem.notes || defaultItem.remark || defaultItem.description);
      } else {
        setCategoryId(categories?.[0]?.id || '');
        setLocationOrTarget('');
      }

      setDimension1('');
      setDimension2('');
      setDimension3('');
      setDimensionLen('');
      setCalculatedWeightKg('');
      setQtyRequired('1');
      setQtyBufferPercent('5');
      setUnit('lbr');
      setUnitPrice('0');
      setPriceBasis('qty');
      setBrandOrStandard('');
      setSupplierName('');
      setProcurementStatus('Estimasi');
      setLeadTimeDays('5');
      setNotes('');
    }
  }, [initialItem, isOpen, defaultWorkItemId, categories, workItems]);

  if (!isOpen) return null;

  // Calculation live preview
  const numReq = parseFloat(qtyRequired) || 0;
  const numBuffer = parseFloat(qtyBufferPercent) || 0;
  const numWeight = parseFloat(calculatedWeightKg) || 0;
  const numPrice = parseFloat(unitPrice) || 0;

  const { totalQtyWithBuffer, totalCost } = calculateMaterialItemCost({
    qtyRequired: numReq,
    qtyBufferPercent: numBuffer,
    calculatedWeightKg: numWeight,
    unitPrice: numPrice,
    priceBasis,
  });

  const selectedWorkItem = workItems.find((w) => w.id === selectedWorkItemId);
  const selectedCat = categories.find((c) => c.id === categoryId);

  const handleClassificationChange = (cls: MaterialClassification) => {
    setClassification(cls);
    const meta = MATERIAL_CLASSIFICATIONS.find((m) => m.id === cls);
    if (meta) {
      setUnit(meta.defaultUnit);
      if (cls === 'steel_structure') {
        setPriceBasis('weight');
      } else {
        setPriceBasis('qty');
      }
    }
  };

  const handleSelectWorkItem = (itemId: string) => {
    setSelectedWorkItemId(itemId);
    const item = workItems.find((w) => w.id === itemId);
    if (item) {
      setCategoryId(item.categoryId);
      if (!locationOrTarget) {
        setLocationOrTarget(item.description);
      }
      if (item.weightKg && !calculatedWeightKg) {
        setCalculatedWeightKg(String(item.weightKg));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim()) {
      alert('Mohon masukkan Nama Material.');
      return;
    }

    const payload: Partial<ProjectMaterialEstimate> = {
      ...(initialItem ? { id: initialItem.id } : {}),
      materialCode: materialCode.trim() || `MAT-${Math.floor(100 + Math.random() * 900)}`,
      materialName: materialName.trim(),
      classification,
      specification: specification.trim(),
      workItemId: selectedWorkItemId || undefined,
      workItemNo: selectedWorkItem?.itemNo,
      workItemDescription: selectedWorkItem?.description,
      categoryId: categoryId || selectedWorkItem?.categoryId || categories?.[0]?.id || 'cat-7',
      categoryCode: selectedCat?.code || selectedWorkItem?.categoryId || 'VII',
      categoryName: selectedCat?.name || 'Steelwork',
      dimension1: dimension1.trim() || undefined,
      dimension2: dimension2.trim() || undefined,
      dimension3: dimension3.trim() || undefined,
      dimensionLen: dimensionLen.trim() || undefined,
      calculatedWeightKg: numWeight > 0 ? numWeight : undefined,
      qtyRequired: numReq,
      qtyBufferPercent: numBuffer,
      totalQtyWithBuffer,
      unit: unit.trim() || 'pcs',
      unitPrice: numPrice,
      totalCost,
      priceBasis,
      brandOrStandard: brandOrStandard.trim() || undefined,
      supplierName: supplierName.trim() || undefined,
      procurementStatus,
      leadTimeDays: parseInt(leadTimeDays) || 0,
      locationOrTarget: locationOrTarget.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onSave(payload);
    onClose();
  };

  const filteredWorkItems = workItems
    .filter((w) => !w.isAreaHeader)
    .filter((w) => {
      if (!searchWorkItem) return true;
      const q = searchWorkItem.toLowerCase();
      return (
        w.itemNo.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        (w.type && w.type.toLowerCase().includes(q))
      );
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                {initialItem ? 'Edit Estimasi Material Proyek' : 'Tambah Estimasi Material Baru'}
              </h2>
              <p className="text-xs text-slate-300">
                Hubungkan material langsung ke item repair list untuk kalkulasi akurat (BOM).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Linked Repair List Item */}
          <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-700" />
                <span>Pilih Item Repair List Terkait (Work Item Proyek)</span>
                <span className="text-[10px] text-sky-700 font-normal">
                  (Material ini akan terhubung ke pekerjaan spesifik)
                </span>
              </label>
              {selectedWorkItem && (
                <button
                  type="button"
                  onClick={() => setSelectedWorkItemId('')}
                  className="text-[11px] text-sky-700 hover:text-sky-900 underline font-medium"
                >
                  Lepas Kaitan (General Material)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchWorkItem}
                    onChange={(e) => setSearchWorkItem(e.target.value)}
                    placeholder="Cari item repair list (No / deskripsi)..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-sky-300 rounded-lg text-slate-800"
                  />
                </div>
                <select
                  value={selectedWorkItemId}
                  onChange={(e) => handleSelectWorkItem(e.target.value)}
                  className="mt-1.5 w-full px-2.5 py-2 text-xs bg-white border border-sky-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Material Bebas / Umum (Seluruh Proyek) --</option>
                  {filteredWorkItems.map((w) => (
                    <option key={w.id} value={w.id}>
                      [{w.itemNo}] {w.description.substring(0, 70)}
                      {w.description.length > 70 ? '...' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview of Linked Item */}
              <div className="p-2.5 bg-white border border-sky-200 rounded-lg text-xs space-y-1">
                {selectedWorkItem ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 font-bold font-mono text-[10px] rounded">
                        No. {selectedWorkItem.itemNo}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Level: {selectedWorkItem.itemLevel === 2 ? 'Sub-system' : 'Komponen'}
                      </span>
                      {selectedWorkItem.type && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold font-mono text-[10px] rounded">
                          {selectedWorkItem.type}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-800 line-clamp-2">
                      {selectedWorkItem.description}
                    </div>
                    <div className="text-[11px] text-slate-500 flex gap-3 pt-0.5">
                      <span>Volume: {selectedWorkItem.qty || '-'} {selectedWorkItem.unit}</span>
                      {selectedWorkItem.weightKg ? <span>Berat: {selectedWorkItem.weightKg} kg</span> : null}
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 italic text-[11px] py-2">
                    Belum ada item repair list dipilih. Material ini akan dikategorikan sebagai material umum proyek.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Classification Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Klasifikasi &amp; Jenis Material Kapal
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {MATERIAL_CLASSIFICATIONS.map((cls) => {
                const isSelected = classification === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handleClassificationChange(cls.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs ring-2 ring-emerald-500/30'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="text-xs leading-snug">{cls.shortLabel}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                      {cls.description.substring(0, 30)}...
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kode Material (Internal / ERP)
              </label>
              <input
                type="text"
                value={materialCode}
                onChange={(e) => setMaterialCode(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
                placeholder="ex: MAT-PLT-001"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Material <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-400 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                placeholder="ex: Pelat Baja Lambung BKI Grade A (Tebal 10mm)"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Spesifikasi Teknis &amp; Standar Klas (BKI/ABS/JIS/ASTM)
            </label>
            <input
              type="text"
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
              placeholder="ex: Ukuran 1500 x 6000 x 10 mm (~707 kg/lbr), Mill Test Certificate BKI Grade A"
            />
          </div>

          {/* Dimensions & Weight (Optional for Plates/Pipes) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-slate-500" />
              <span>Dimensi &amp; Tonase Berat (Untuk Plat, Profil, atau Pipa)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">D1 (Lebar/OD mm)</label>
                <input
                  type="text"
                  value={dimension1}
                  onChange={(e) => setDimension1(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono text-center"
                  placeholder="1500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">D2 (Tebal/WT mm)</label>
                <input
                  type="text"
                  value={dimension2}
                  onChange={(e) => setDimension2(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono text-center"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">D3 (Flange/Web mm)</label>
                <input
                  type="text"
                  value={dimension3}
                  onChange={(e) => setDimension3(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono text-center"
                  placeholder="-"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Panjang (mm)</label>
                <input
                  type="text"
                  value={dimensionLen}
                  onChange={(e) => setDimensionLen(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono text-center"
                  placeholder="6000"
                />
              </div>
              <div>
                <label className="block text-[10px] text-amber-900 font-bold mb-0.5">Berat (Kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={calculatedWeightKg}
                  onChange={(e) => setCalculatedWeightKg(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-amber-50 border border-amber-300 rounded font-mono font-bold text-center text-amber-950"
                  placeholder="707"
                />
              </div>
            </div>
          </div>

          {/* Quantities, Buffer & Pricing */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-300/80 rounded-xl space-y-3">
            <div className="text-xs font-bold text-emerald-950 flex items-center justify-between">
              <span>Volume Kebutuhan, Cadangan Waste &amp; Estimasi Biaya</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-normal text-slate-600">Basis Harga:</span>
                <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="priceBasis"
                    checked={priceBasis === 'qty'}
                    onChange={() => setPriceBasis('qty')}
                  />
                  <span>Per Qty / Unit</span>
                </label>
                <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="priceBasis"
                    checked={priceBasis === 'weight'}
                    onChange={() => setPriceBasis('weight')}
                  />
                  <span>Per Kg Tonase</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Qty Bersih (Required)
                </label>
                <input
                  type="number"
                  step="any"
                  value={qtyRequired}
                  onChange={(e) => setQtyRequired(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Waste / Buffer Margin (%)
                </label>
                <input
                  type="number"
                  step="any"
                  value={qtyBufferPercent}
                  onChange={(e) => setQtyBufferPercent(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Satuan (Unit)
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-center font-bold"
                  placeholder="lbr / btg / kg / pail"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Harga Satuan (Rp {priceBasis === 'weight' ? '/ Kg' : `/${unit || 'Unit'}`})
                </label>
                <input
                  type="number"
                  step="any"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-right"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Live Calculation Preview Banner */}
            <div className="p-3 bg-white rounded-lg border border-emerald-300 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="text-xs text-slate-600">
                <span>Total Pesanan (termasuk buffer {numBuffer}%): </span>
                <strong className="text-slate-900 font-mono text-sm">
                  {totalQtyWithBuffer} {unit}
                </strong>
                {priceBasis === 'weight' && numWeight > 0 && (
                  <span className="text-[11px] text-amber-700 ml-2">
                    (Basis Tonase: {(numWeight * (1 + numBuffer / 100)).toFixed(1)} kg)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Estimasi Biaya:
                </span>
                <span className="font-mono font-extrabold text-emerald-800 text-base">
                  Rp {totalCost.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Procurement & Logistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status Pengadaan
              </label>
              <select
                value={procurementStatus}
                onChange={(e) => setProcurementStatus(e.target.value as MaterialProcurementStatus)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
              >
                {MATERIAL_PROCUREMENT_STATUSES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supplier / Toko / Vendor
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
                placeholder="ex: PT. Krakatau Steel / Toko Samudra"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lead Time Pengiriman (Hari)
              </label>
              <input
                type="number"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-center"
                placeholder="5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Merk / Standar Pabrik
              </label>
              <input
                type="text"
                value={brandOrStandard}
                onChange={(e) => setBrandOrStandard(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
                placeholder="ex: Krakatau Steel / Jotun / Kobelco"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Lokasi / Area Pasang
              </label>
              <input
                type="text"
                value={locationOrTarget}
                onChange={(e) => setLocationOrTarget(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
                placeholder="ex: Bottom Shell Fr. 12-18 / Main Deck"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan Khusus Estimasi Material
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 resize-none"
              placeholder="Catatan tambahan untuk tim logistik dan perencana (PPC)..."
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Simpan Estimasi Material</span>
          </button>
        </div>
      </div>
    </div>
  );
};
