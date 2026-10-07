import React, { useState } from 'react';
import { X, Calculator, Box, Flame, Users, Paintbrush, Plus, CheckCircle2, ArrowRight } from 'lucide-react';
import { ProjectResourceItem } from '../../types';

interface QuickCalculatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGeneratedResources: (items: Omit<ProjectResourceItem, 'id' | 'projectId' | 'totalCost'>[]) => void;
}

export const QuickCalculatorsModal: React.FC<QuickCalculatorsModalProps> = ({
  isOpen,
  onClose,
  onAddGeneratedResources,
}) => {
  const [activeCalcTab, setActiveCalcTab] = useState<'welding' | 'coating' | 'manpower'>('welding');

  // --- Calculator 1: Welding & Cutting Consumables ---
  const [steelTonnageTon, setSteelTonnageTon] = useState<number>(5.0); // e.g. 5 Ton
  const [electrodeType, setElectrodeType] = useState<'LB52' | 'FCAW'>('LB52');

  // --- Calculator 2: Blasting & Coating Consumables ---
  const [hullAreaM2, setHullAreaM2] = useState<number>(400); // 400 m²
  const [blastStandard, setBlastStandard] = useState<'Sa2.0' | 'Sa2.5'>('Sa2.5');
  const [coatsCount, setCoatsCount] = useState<number>(3); // Primer, Tie, AF

  // --- Calculator 3: Manpower Mandays ---
  const [targetDays, setTargetDays] = useState<number>(20); // 20 hari
  const [fitterCount, setFitterCount] = useState<number>(3);
  const [welderCount, setWelderCount] = useState<number>(3);
  const [blasterPainterCount, setBlasterPainterCount] = useState<number>(4);
  const [helperCount, setHelperCount] = useState<number>(4);

  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // --- Calculations ---
  // 1. Welding & Gas
  const steelKg = steelTonnageTon * 1000;
  // Electrode ratio: ~2.2% for stick welding, ~1.8% for FCAW
  const electrodeKg = Math.round(steelKg * (electrodeType === 'LB52' ? 0.022 : 0.018));
  // Oxygen: ~1 cylinder per 140 kg of cut/gouged plate
  const oxygenCylinders = Math.max(2, Math.round(steelKg / 140));
  // LPG: ~1 tabung 50kg per 500 kg plate cutting
  const lpgCylinders = Math.max(1, Math.round(steelKg / 500));
  // Grinding discs: ~1 disc cutting per 35 kg steel, 1 disc grinding per 50 kg steel
  const cuttingDiscs = Math.max(10, Math.round(steelKg / 35));
  const grindingDiscs = Math.max(10, Math.round(steelKg / 50));

  // 2. Blasting & Paint
  // Slag ratio: Sa 2.5 uses ~28 kg/m², Sa 2.0 uses ~22 kg/m²
  const slagKgPerM2 = blastStandard === 'Sa2.5' ? 28 : 22;
  const totalCopperSlagTon = parseFloat(((hullAreaM2 * slagKgPerM2) / 1000).toFixed(1));
  // Paint coverage: approx 5.5 m² per liter per coat -> 110 m² per 20L pail
  const pailsPerCoat = Math.ceil(hullAreaM2 / 110);
  const totalPaintPails = pailsPerCoat * coatsCount;
  // Thinner: ~10% of paint volume (20L pail = 2L thinner per pail)
  const thinnerLiters = totalPaintPails * 3;
  // Blasting duration: 1 blaster achieves approx 25-30 m² per day
  const blasterDays = Math.max(2, Math.ceil(hullAreaM2 / (3 * 25)));

  // 3. Manpower
  const totalFitterMandays = fitterCount * targetDays;
  const totalWelderMandays = welderCount * targetDays;
  const totalBlasterMandays = blasterPainterCount * Math.min(targetDays, 8);
  const totalHelperMandays = helperCount * targetDays;

  // Apply Action Handlers
  const handleApplyWeldingCalculations = () => {
    const itemsToAdd: Omit<ProjectResourceItem, 'id' | 'projectId' | 'totalCost'>[] = [
      {
        category: 'consumable',
        code: 'CNS-WLD-01',
        name: `Kawat Las ${electrodeType === 'LB52' ? 'Kobelco LB-52 (E7018)' : 'Flux Core FCAW E71T-1'} Dia 3.2mm`,
        specOrRole: `Dihitung dari estimasi ${steelTonnageTon} Ton baja (Rasio ${(electrodeType === 'LB52' ? 0.022 : 0.018) * 100}%)`,
        qty: electrodeKg,
        unit: 'kg',
        unitPrice: electrodeType === 'LB52' ? 52000 : 48000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi cepat kawat las',
      },
      {
        category: 'consumable',
        code: 'CNS-WLD-02',
        name: 'Gas Oksigen Industri 6 m³ (Cutting & Gouging)',
        specOrRole: `Estimasi pemotongan ${steelTonnageTon} Ton baja (${oxygenCylinders} Tabung)`,
        qty: oxygenCylinders,
        unit: 'tabung',
        unitPrice: 125000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi cepat gas oksigen',
      },
      {
        category: 'consumable',
        code: 'CNS-WLD-03',
        name: 'Gas LPG Industri 50 Kg untuk Cutting Torch',
        specOrRole: `Estimasi pemotongan ${steelTonnageTon} Ton baja (${lpgCylinders} Tabung)`,
        qty: lpgCylinders,
        unit: 'tabung',
        unitPrice: 850000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi cepat gas LPG',
      },
      {
        category: 'consumable',
        code: 'CNS-WLD-04',
        name: 'Batu Gerinda Potong 4" & 14" (Cutting Discs)',
        specOrRole: 'Pemotongan & Beveling Sambungan Baja',
        qty: cuttingDiscs,
        unit: 'pcs',
        unitPrice: 18000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi cepat batu potong',
      },
      {
        category: 'consumable',
        code: 'CNS-WLD-05',
        name: 'Batu Gerinda Asah Fleksibel 4" (Grinding Discs)',
        specOrRole: 'Pembersihan Root & Finishing Kampuh Las',
        qty: grindingDiscs,
        unit: 'pcs',
        unitPrice: 22000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi cepat batu asah',
      },
    ];

    onAddGeneratedResources(itemsToAdd);
    setAppliedNotice(`${itemsToAdd.length} item kebutuhan las & gas berhasil ditambahkan ke proyek!`);
    setTimeout(() => setAppliedNotice(null), 3500);
  };

  const handleApplyCoatingCalculations = () => {
    const itemsToAdd: Omit<ProjectResourceItem, 'id' | 'projectId' | 'totalCost'>[] = [
      {
        category: 'consumable',
        code: 'CNS-BLT-01',
        name: `Pasir Blasting Copper Slag ${blastStandard} (${totalCopperSlagTon} Ton)`,
        specOrRole: `Luas ${hullAreaM2} m² dengan rasio ${slagKgPerM2} kg/m²`,
        qty: totalCopperSlagTon,
        unit: 'ton',
        unitPrice: 1450000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi cepat pasir blasting',
      },
      {
        category: 'material',
        code: 'MAT-COT-01',
        name: `Cat Marine Epoxy Primer & Finish (${totalPaintPails} Pail @ 20L)`,
        specOrRole: `Untuk area ${hullAreaM2} m² (${coatsCount} Lapisan Cat)`,
        qty: totalPaintPails,
        unit: 'pail',
        unitPrice: 4200000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi cepat cat kapal',
      },
      {
        category: 'consumable',
        code: 'CNS-COT-02',
        name: 'Thinner Epoxy Marine Grade (Pengencer & Pencuci Spray)',
        specOrRole: `Kebutuhan pengencer TDS (~10% volume cat)`,
        qty: thinnerLiters,
        unit: 'liter',
        unitPrice: 38000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi cepat thinner',
      },
      {
        category: 'equipment',
        code: 'EQP-BLT-01',
        name: 'Air Compressor 375 CFM High Pressure (Diesel)',
        specOrRole: `Operasi blasting untuk area ${hullAreaM2} m² (${blasterDays} Hari)`,
        qty: blasterDays,
        unit: 'hari',
        unitPrice: 1850000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi cepat sewa kompresor',
      },
    ];

    onAddGeneratedResources(itemsToAdd);
    setAppliedNotice(`${itemsToAdd.length} item kebutuhan blasting & cat berhasil ditambahkan ke proyek!`);
    setTimeout(() => setAppliedNotice(null), 3500);
  };

  const handleApplyManpowerCalculations = () => {
    const itemsToAdd: Omit<ProjectResourceItem, 'id' | 'projectId' | 'totalCost'>[] = [
      {
        category: 'manpower',
        code: 'MAN-CALC-01',
        name: 'Fitter / Fabrikator Struktur Baja',
        specOrRole: `Alokasi ${fitterCount} Orang x ${targetDays} Hari`,
        qty: totalFitterMandays,
        unit: 'mandays',
        headcount: fitterCount,
        workDays: targetDays,
        dailyHours: 8,
        unitPrice: 320000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi mandays fitter',
      },
      {
        category: 'manpower',
        code: 'MAN-CALC-02',
        name: 'Welder 3G / 4G SMAW BKI Certified',
        specOrRole: `Alokasi ${welderCount} Orang x ${targetDays} Hari`,
        qty: totalWelderMandays,
        unit: 'mandays',
        headcount: welderCount,
        workDays: targetDays,
        dailyHours: 8,
        unitPrice: 350000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi mandays welder',
      },
      {
        category: 'manpower',
        code: 'MAN-CALC-03',
        name: 'Operator Sandblasting & Painting',
        specOrRole: `Alokasi ${blasterPainterCount} Orang x ${Math.min(targetDays, 8)} Hari`,
        qty: totalBlasterMandays,
        unit: 'mandays',
        headcount: blasterPainterCount,
        workDays: Math.min(targetDays, 8),
        dailyHours: 8,
        unitPrice: 300000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi mandays blaster & painter',
      },
      {
        category: 'manpower',
        code: 'MAN-CALC-04',
        name: 'Helper Lapangan & Rigger Scaffolding',
        specOrRole: `Alokasi ${helperCount} Orang x ${targetDays} Hari`,
        qty: totalHelperMandays,
        unit: 'mandays',
        headcount: helperCount,
        workDays: targetDays,
        dailyHours: 8,
        unitPrice: 220000,
        status: 'Rencana',
        remarks: 'Hasil kalkulasi mandays helper',
      },
    ];

    onAddGeneratedResources(itemsToAdd);
    setAppliedNotice(`${itemsToAdd.length} tim tenaga kerja berhasil ditambahkan ke estimasi proyek!`);
    setTimeout(() => setAppliedNotice(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Kalkulator Kebutuhan Lapangan Galangan
              </h3>
              <p className="text-xs text-slate-500">
                Estimasi cepat rasio kawat las, gas potong, pasir blasting, cat dan mandays tenaga kerja.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        {appliedNotice && (
          <div className="bg-emerald-600 text-white px-5 py-2.5 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{appliedNotice}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="px-5 pt-3 pb-0 border-b border-slate-200 flex gap-2 overflow-x-auto bg-white">
          <button
            type="button"
            onClick={() => setActiveCalcTab('welding')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeCalcTab === 'welding'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Kawat Las &amp; Gas Potong</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCalcTab('coating')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeCalcTab === 'coating'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Paintbrush className="w-4 h-4 text-emerald-500" />
            <span>Pasir Blasting &amp; Cat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCalcTab('manpower')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeCalcTab === 'manpower'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-blue-500" />
            <span>Alokasi Mandays Tenaga Kerja</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: WELDING & GAS */}
          {activeCalcTab === 'welding' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong>Standar Galangan Kapal:</strong> Kebutuhan kawat las umumnya berkisar antara{' '}
                <strong>1.8% s/d 2.5%</strong> dari total berat tonase pelat baja. Pemotongan membutuhkan gas oksigen &amp; LPG/asetilen serta batu gerinda finishing.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Estimasi Tonase Pelat Baja (Ton)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={steelTonnageTon}
                    onChange={(e) => setSteelTonnageTon(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    = {(steelTonnageTon * 1000).toLocaleString('id-ID')} Kg Baja
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Metode / Kawat Las Utama
                  </label>
                  <select
                    value={electrodeType}
                    onChange={(e) => setElectrodeType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="LB52">Stick SMAW (Kobelco LB-52 / E7018 - Rasio 2.2%)</option>
                    <option value="FCAW">Flux Core CO2 (FCAW AWS E71T-1 - Rasio 1.8%)</option>
                  </select>
                </div>
              </div>

              {/* Output Results Box */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Hasil Estimasi Kebutuhan Consumables:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Kawat Las</span>
                    <strong className="text-lg font-mono text-emerald-400">{electrodeKg}</strong>
                    <span className="text-[10px] text-slate-400 block">Kg ({Math.ceil(electrodeKg / 20)} dos)</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Gas Oksigen 6m³</span>
                    <strong className="text-lg font-mono text-sky-400">{oxygenCylinders}</strong>
                    <span className="text-[10px] text-slate-400 block">Tabung</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Gas LPG 50 Kg</span>
                    <strong className="text-lg font-mono text-amber-400">{lpgCylinders}</strong>
                    <span className="text-[10px] text-slate-400 block">Tabung</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Batu Gerinda</span>
                    <strong className="text-lg font-mono text-purple-400">{cuttingDiscs + grindingDiscs}</strong>
                    <span className="text-[10px] text-slate-400 block">Pcs (Potong+Asah)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Estimasi Nilai Consumables:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    Rp{' '}
                    {(
                      electrodeKg * 52000 +
                      oxygenCylinders * 125000 +
                      lpgCylinders * 850000 +
                      cuttingDiscs * 18000 +
                      grindingDiscs * 22000
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyWeldingCalculations}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-900/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambahkan 5 Item Kebutuhan Ini ke Daftar Proyek</span>
              </button>
            </div>
          )}

          {/* TAB 2: BLASTING & COATING */}
          {activeCalcTab === 'coating' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                <strong>Standar Blasting &amp; Painting:</strong> Sa 2.5 mengonsumsi sekitar{' '}
                <strong>28 kg pasir per m²</strong>. Satu pail cat kapal (20 Liter) memiliki daya sebar teoritis ~110 m² pada DFT standar.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Luas Area Lambung (m²)
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="1"
                    value={hullAreaM2}
                    onChange={(e) => setHullAreaM2(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Standar Kebersihan Blasting
                  </label>
                  <select
                    value={blastStandard}
                    onChange={(e) => setBlastStandard(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="Sa2.5">Sa 2.5 (Near White Metal - 28 kg/m²)</option>
                    <option value="Sa2.0">Sa 2.0 (Commercial Blast - 22 kg/m²)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Lapisan Cat (Coats)
                  </label>
                  <select
                    value={coatsCount}
                    onChange={(e) => setCoatsCount(parseInt(e.target.value) || 3)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="2">2 Lapis (Primer + Finish)</option>
                    <option value="3">3 Lapis (Primer + Intermediate + AF)</option>
                    <option value="4">4 Lapis (Full Marine Coating Spec)</option>
                  </select>
                </div>
              </div>

              {/* Output Results Box */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Hasil Estimasi Kebutuhan Blasting &amp; Cat:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Copper Slag</span>
                    <strong className="text-lg font-mono text-emerald-400">{totalCopperSlagTon}</strong>
                    <span className="text-[10px] text-slate-400 block">Ton Pasir</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Cat Kapal</span>
                    <strong className="text-lg font-mono text-sky-400">{totalPaintPails}</strong>
                    <span className="text-[10px] text-slate-400 block">Pail @ 20 Liter</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Thinner Marine</span>
                    <strong className="text-lg font-mono text-amber-400">{thinnerLiters}</strong>
                    <span className="text-[10px] text-slate-400 block">Liter</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Kompresor 375 CFM</span>
                    <strong className="text-lg font-mono text-purple-400">{blasterDays}</strong>
                    <span className="text-[10px] text-slate-400 block">Hari Kerja</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Estimasi Blasting &amp; Cat:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    Rp{' '}
                    {(
                      totalCopperSlagTon * 1450000 +
                      totalPaintPails * 4200000 +
                      thinnerLiters * 38000 +
                      blasterDays * 1850000
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyCoatingCalculations}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambahkan 4 Item Kebutuhan Blasting &amp; Cat ke Proyek</span>
              </button>
            </div>
          )}

          {/* TAB 3: MANPOWER & MANDAYS */}
          {activeCalcTab === 'manpower' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                <strong>Formula Mandays Galangan:</strong>{' '}
                $Total\ Mandays = Jumlah\ Personel \times Durasi\ Hari\ Kerja$. Kalkulasi ini menghitung kebutuhan tim produksi di lapangan beserta anggaran upah.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Durasi Pekerjaan / Docking (Hari)
                </label>
                <input
                  type="number"
                  min="1"
                  value={targetDays}
                  onChange={(e) => setTargetDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full sm:w-1/2 px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fitter / Fabrikator
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={fitterCount}
                    onChange={(e) => setFitterCount(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    = {totalFitterMandays} mandays
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Welder Certified
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={welderCount}
                    onChange={(e) => setWelderCount(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    = {totalWelderMandays} mandays
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Blaster &amp; Painter
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={blasterPainterCount}
                    onChange={(e) => setBlasterPainterCount(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    = {totalBlasterMandays} mandays
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Helper &amp; Rigger
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={helperCount}
                    onChange={(e) => setHelperCount(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    = {totalHelperMandays} mandays
                  </span>
                </div>
              </div>

              {/* Summary Box */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Kebutuhan Tenaga Kerja:</span>
                  <span className="font-mono font-bold text-sky-400 text-sm">
                    {totalFitterMandays + totalWelderMandays + totalBlasterMandays + totalHelperMandays} Mandays
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Estimasi Upah Tenaga Kerja:</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">
                    Rp{' '}
                    {(
                      totalFitterMandays * 320000 +
                      totalWelderMandays * 350000 +
                      totalBlasterMandays * 300000 +
                      totalHelperMandays * 220000
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyManpowerCalculations}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambahkan 4 Tim Tenaga Kerja Ini ke Estimasi Proyek</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
