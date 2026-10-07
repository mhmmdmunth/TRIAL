import React, { useState, useEffect } from 'react';
import { X, Save, Plus, AlertCircle, Info, Calculator, Users, Box, Flame, Wrench, ShieldCheck, Building } from 'lucide-react';
import { ProjectResourceItem, ResourceCategory } from '../../types';
import {
  RESOURCE_CATEGORIES,
  RESOURCE_STATUSES,
  calculateResourceItemCost,
} from '../../services/projectResourceService';

interface ProjectResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<ProjectResourceItem, 'id' | 'projectId' | 'totalCost'>, editId?: string) => void;
  initialItem?: ProjectResourceItem | null;
  projectId: string;
}

export const ProjectResourceModal: React.FC<ProjectResourceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  projectId,
}) => {
  const [category, setCategory] = useState<ResourceCategory>('material');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [specOrRole, setSpecOrRole] = useState('');
  const [workCategoryCode, setWorkCategoryCode] = useState('');

  // Quantities
  const [qty, setQty] = useState<number>(1);
  const [unit, setUnit] = useState('kg');
  const [unitPrice, setUnitPrice] = useState<number>(0);

  // Manpower specific
  const [headcount, setHeadcount] = useState<number>(1);
  const [workDays, setWorkDays] = useState<number>(1);
  const [dailyHours, setDailyHours] = useState<number>(8);

  // Material specific
  const [weightKg, setWeightKg] = useState<number>(0);

  // Status & vendor
  const [status, setStatus] = useState<'Rencana' | 'Approved' | 'PO Issued' | 'On Yard' | 'Terpakai'>('Rencana');
  const [supplierOrSubcont, setSupplierOrSubcont] = useState('');
  const [remarks, setRemarks] = useState('');

  const [error, setError] = useState('');

  useEffect(() => {
    if (initialItem) {
      setCategory(initialItem.category || 'material');
      setCode(initialItem.code || '');
      setName(initialItem.name || '');
      setSpecOrRole(initialItem.specOrRole || '');
      setWorkCategoryCode(initialItem.workCategoryCode || '');
      setQty(initialItem.qty || 1);
      setUnit(initialItem.unit || 'unit');
      setUnitPrice(initialItem.unitPrice || 0);
      setHeadcount(initialItem.headcount || 1);
      setWorkDays(initialItem.workDays || 1);
      setDailyHours(initialItem.dailyHours || 8);
      setWeightKg(initialItem.weightKg || 0);
      setStatus(initialItem.status || 'Rencana');
      setSupplierOrSubcont(initialItem.supplierOrSubcont || '');
      setRemarks(initialItem.remarks || '');
    } else {
      // Default reset
      setCategory('material');
      setCode('');
      setName('');
      setSpecOrRole('');
      setWorkCategoryCode('VI');
      setQty(1);
      setUnit('kg');
      setUnitPrice(0);
      setHeadcount(1);
      setWorkDays(1);
      setDailyHours(8);
      setWeightKg(0);
      setStatus('Rencana');
      setSupplierOrSubcont('');
      setRemarks('');
    }
    setError('');
  }, [initialItem, isOpen]);

  // Adjust default units based on category
  const handleCategoryChange = (newCat: ResourceCategory) => {
    setCategory(newCat);
    if (newCat === 'manpower') {
      setUnit('mandays');
      if (unitPrice === 0) setUnitPrice(320000);
    } else if (newCat === 'material') {
      setUnit('kg');
      if (unitPrice === 0) setUnitPrice(22500);
    } else if (newCat === 'consumable') {
      setUnit('tabung');
      if (unitPrice === 0) setUnitPrice(125000);
    } else if (newCat === 'equipment') {
      setUnit('hari');
      if (unitPrice === 0) setUnitPrice(1500000);
    } else if (newCat === 'subcont') {
      setUnit('ls');
      if (unitPrice === 0) setUnitPrice(5000000);
    } else if (newCat === 'overhead') {
      setUnit('ls');
      if (unitPrice === 0) setUnitPrice(10000000);
    }
  };

  if (!isOpen) return null;

  // Live total preview
  const previewCost = calculateResourceItemCost({
    category,
    qty,
    unitPrice,
    headcount,
    workDays,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama kebutuhan atau pos anggaran wajib diisi.');
      return;
    }

    if (category === 'manpower') {
      if (headcount <= 0 || workDays <= 0) {
        setError('Jumlah orang dan hari kerja harus lebih dari 0.');
        return;
      }
    } else {
      if (qty <= 0) {
        setError('Kuantitas (Qty) harus lebih dari 0.');
        return;
      }
    }

    onSave(
      {
        category,
        code: code.trim(),
        name: name.trim(),
        specOrRole: specOrRole.trim(),
        workCategoryCode: workCategoryCode.trim(),
        qty: category === 'manpower' ? headcount * workDays : Number(qty) || 1,
        unit: category === 'manpower' ? 'mandays' : unit.trim(),
        unitPrice: Number(unitPrice) || 0,
        headcount: category === 'manpower' ? Number(headcount) || 1 : undefined,
        workDays: category === 'manpower' ? Number(workDays) || 1 : undefined,
        dailyHours: category === 'manpower' ? Number(dailyHours) || 8 : undefined,
        weightKg: category === 'material' ? Number(weightKg) || undefined : undefined,
        status,
        supplierOrSubcont: supplierOrSubcont.trim(),
        remarks: remarks.trim(),
      },
      initialItem ? initialItem.id : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BoxesIcon className="w-5 h-5 text-emerald-600" />
              <span>{initialItem ? 'Ubah Rencana Kebutuhan Proyek' : 'Tambah Kebutuhan Proyek Baru'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Input rincian material, tenaga kerja mandays, bahan habis pakai, alat berat atau subkontraktor.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kategori Kebutuhan <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {RESOURCE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 ${
                    category === cat.id
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500 text-emerald-950 font-bold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <span className="p-1.5 rounded-lg bg-white border border-slate-200 shrink-0 mt-0.5">
                    {cat.id === 'material' && <Box className="w-3.5 h-3.5 text-emerald-600" />}
                    {cat.id === 'manpower' && <Users className="w-3.5 h-3.5 text-blue-600" />}
                    {cat.id === 'consumable' && <Flame className="w-3.5 h-3.5 text-amber-600" />}
                    {cat.id === 'equipment' && <Wrench className="w-3.5 h-3.5 text-indigo-600" />}
                    {cat.id === 'subcont' && <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />}
                    {cat.id === 'overhead' && <Building className="w-3.5 h-3.5 text-slate-600" />}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs block truncate">{cat.shortLabel}</span>
                    <span className="text-[10px] text-slate-500 font-normal line-clamp-1">{cat.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Item Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode / No. Anggaran
              </label>
              <input
                type="text"
                placeholder="Contoh: MAT-001, MAN-002"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kebutuhan / Pos Anggaran <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={
                  category === 'material'
                    ? 'Contoh: Pelat Baja Lambung BKI Grade A'
                    : category === 'manpower'
                    ? 'Contoh: Welder 3G / 4G BKI Certified'
                    : category === 'consumable'
                    ? 'Contoh: Kawat Las Kobelco LB-52 3.2mm'
                    : category === 'equipment'
                    ? 'Contoh: Sewa Mobile Crane 25 Ton'
                    : 'Contoh: NDT Ultrasonic Thickness Measurement'
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                required
              />
            </div>
          </div>

          {/* Spec or Role Details */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Spesifikasi Teknis / Kualifikasi / Lingkup Pekerjaan
            </label>
            <input
              type="text"
              placeholder={
                category === 'material'
                  ? 'Contoh: Dimensi 1500 x 6000 x 12mm, Mill Certificate BKI'
                  : category === 'manpower'
                  ? 'Contoh: Sertifikasi BKI 3G/4G SMAW, pengalaman pelat bottom'
                  : category === 'consumable'
                  ? 'Contoh: Low Hydrogen AWS E7018, kemasan dos 20 kg'
                  : 'Contoh: Include operator & solar, kapasitas 25 ton'
              }
              value={specOrRole}
              onChange={(e) => setSpecOrRole(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* DYNAMIC CALCULATION SECTION */}
          {category === 'manpower' ? (
            /* MAN POWER DEDICATED INPUTS */
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Kalkulasi Alokasi Tenaga Kerja (Mandays & Upah)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Jumlah Personel (Orang)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={headcount}
                    onChange={(e) => setHeadcount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-blue-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Durasi Kerja (Hari)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={workDays}
                    onChange={(e) => setWorkDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-blue-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Total Mandays
                  </label>
                  <div className="w-full px-3 py-1.5 text-xs bg-blue-100/80 border border-blue-300 rounded-lg font-mono font-bold text-blue-900 flex items-center justify-between">
                    <span>{headcount * workDays}</span>
                    <span className="text-[10px] text-blue-700 font-normal">mandays</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tarif / Manday (Rp)
                  </label>
                  <input
                    type="number"
                    step="5000"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* STANDARD MATERIAL, CONSUMABLE, EQUIPMENT INPUTS */
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah (Kuantitas / Qty) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={qty}
                    onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Satuan (Unit)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="kg, btg, lbr, sak, tabung, pail, jam, hari"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Satuan / Tarif (Rp)
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {category === 'material' && (
                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Estimasi Berat / Tonase Baja (Kg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Otomatis dihitung jika unit kg"
                      value={weightKg || (unit.toLowerCase() === 'kg' ? qty : '')}
                      onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Kategori Scope Pekerjaan (I - XI)
                    </label>
                    <select
                      value={workCategoryCode}
                      onChange={(e) => setWorkCategoryCode(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="I">I - Docking & Fasilitas</option>
                      <option value="III">III - Pengecatan & Blasting</option>
                      <option value="VI">VI - Konstruksi & Pelat Lambung</option>
                      <option value="VII">VII - Outfitting & Konstruksi Atas</option>
                      <option value="VIII">VIII - Sistem Pemipaan Kapal</option>
                      <option value="IX">IX - Katup & Pemesinan Kapal</option>
                      <option value="X">X - Kelistrikan & Navigasi</option>
                      <option value="XII">XII - Lain-lain & Jasa Khusus</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATUS & SUPPLIER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Pengadaan / Lapangan
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                {RESOURCE_STATUSES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier / Vendor / Tim Pelaksana
              </label>
              <input
                type="text"
                placeholder="Contoh: PT. Krakatau Steel, Subcont Nusantara, Tim Internal"
                value={supplierOrSubcont}
                onChange={(e) => setSupplierOrSubcont(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan / Catatan Teknis Tambahan
            </label>
            <input
              type="text"
              placeholder="Contoh: Alokasi untuk bottom plate lajur P/S frame 15-25"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Real-time Calculation Cost Summary Box */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-2xs">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block">
                  Total Estimasi Biaya Item Ini
                </span>
                <span className="text-xs text-slate-600">
                  {category === 'manpower'
                    ? `${headcount} Orang × ${workDays} Hari × Rp ${unitPrice.toLocaleString('id-ID')}/manday`
                    : `${qty} ${unit} × Rp ${unitPrice.toLocaleString('id-ID')}`}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-900 block">
                Rp {previewCost.toLocaleString('id-ID')}
              </span>
              <span className="text-[10px] text-slate-500">Sudah dikalkulasi otomatis</span>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/10 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{initialItem ? 'Simpan Perubahan' : 'Tambahkan Kebutuhan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

function BoxesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l6 3.43a2 2 0 0 0 2.06 0l6-3.43a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L11.03 9.49a2 2 0 0 0-2.06 0l-6 3.43Z" />
      <path d="m12 21.25.03-8.3" />
      <path d="M21.03 9.49a2 2 0 0 0-2.06 0l-6 3.43a2 2 0 0 0-.97 1.71v3.24a2 2 0 0 0 .97 1.71l6 3.43a2 2 0 0 0 2.06 0l6-3.43a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L21.03 9.49Z" />
      <path d="m12 2.75 6 3.43a2 2 0 0 1 .97 1.71v3.24a2 2 0 0 1-.97 1.71l-6 3.43a2 2 0 0 1-2.06 0l-6-3.43a2 2 0 0 1-.97-1.71V7.89a2 2 0 0 1 .97-1.71l6-3.43a2 2 0 0 1 2.06 0Z" />
    </svg>
  );
}
