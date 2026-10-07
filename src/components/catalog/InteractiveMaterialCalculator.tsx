import React, { useState } from 'react';
import {
  TonnageCalculator,
  MaterialTypeDefinition,
  STANDARD_PIPES,
  STANDARD_HBEAMS,
  STANDARD_ANGLES,
  STANDARD_EQUAL_ANGLES,
  STANDARD_UNEQUAL_ANGLES,
  STANDARD_FLATBARS,
  STANDARD_ROUNDBARS,
  STANDARD_SQUAREBARS,
  STANDARD_GRATINGS,
  STANDARD_BORDES,
} from '../../utils/tonnageCalculator';
import { MaterialCategory, SteelPlateGrade, STEEL_PLATE_GRADES } from '../../types';
import {
  Calculator,
  Tag,
  Wrench,
  Sparkles,
  Layers,
  Save,
  Plus,
  RotateCcw,
  Sliders,
  Scale,
  DollarSign,
  Box,
  Compass,
  FileSpreadsheet,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface InteractiveMaterialCalculatorProps {
  onSaveToCatalog: (item: MaterialTypeDefinition) => boolean;
  onNotify?: (msg: string) => void;
}

export const InteractiveMaterialCalculator: React.FC<InteractiveMaterialCalculatorProps> = ({
  onSaveToCatalog,
  onNotify,
}) => {
  const [calcCat, setCalcCat] = useState<MaterialCategory>('plate');

  // ===================== 1. PELAT BAJA (PLATE) STATE =====================
  const [plateGrade, setPlateGrade] = useState<SteelPlateGrade>('BKI');
  const [plateCustomCode, setPlateCustomCode] = useState('PL BKI');
  const [plateLengthMm, setPlateLengthMm] = useState('6000');
  const [plateWidthMm, setPlateWidthMm] = useState('1500');
  const [plateThickMm, setPlateThickMm] = useState('12');
  const [plateQty, setPlateQty] = useState('1');
  const [plateDensity, setPlateDensity] = useState('7.85');
  const [plateScrapPct, setPlateScrapPct] = useState('0');
  const [plateUnitPrice, setPlateUnitPrice] = useState('48000');

  // ===================== 2. PIPA BAJA (PIPE) STATE =====================
  const [pipeNps, setPipeNps] = useState('2"');
  const [pipeSch, setPipeSch] = useState('Sch 40');
  const [pipeMaterialFinish, setPipeMaterialFinish] = useState<'cs' | 'galv'>('cs');
  const [pipeCustomOdMm, setPipeCustomOdMm] = useState('60.3');
  const [pipeCustomWtMm, setPipeCustomWtMm] = useState('3.91');
  const [pipeWeightPerMeterManual, setPipeWeightPerMeterManual] = useState('5.44');
  const [pipeLengthMm, setPipeLengthMm] = useState('6000');
  const [pipeQty, setPipeQty] = useState('1');
  const [pipeUnitPricePerMeter, setPipeUnitPricePerMeter] = useState('290000');
  const [pipePricingMode, setPipePricingMode] = useState<'per-meter' | 'per-kg'>('per-meter');

  // ===================== 3. BESI SIKU L (ANGLE) STATE =====================
  const [angleTypeFilter, setAngleTypeFilter] = useState<'all' | 'equal' | 'unequal'>('all');
  const [angleIdx, setAngleIdx] = useState(3);
  const [angleSizeName, setAngleSizeName] = useState('L 50x50x5');
  const [angleFlangeAMm, setAngleFlangeAMm] = useState('50');
  const [angleFlangeBMm, setAngleFlangeBMm] = useState('50');
  const [angleThickMm, setAngleThickMm] = useState('5');
  const [angleWeightPerMeter, setAngleWeightPerMeter] = useState('3.77');
  const [angleLengthMm, setAngleLengthMm] = useState('6000');
  const [angleQty, setAngleQty] = useState('1');
  const [angleUnitPricePerKg, setAngleUnitPricePerKg] = useState('48000');

  // ===================== 4. H-BEAM / IWF GELADAK STATE =====================
  const [hbeamIdx, setHbeamIdx] = useState(2);
  const [hbeamSizeName, setHbeamSizeName] = useState('H 150x150');
  const [hbeamHeightMm, setHbeamHeightMm] = useState('150');
  const [hbeamFlangeMm, setHbeamFlangeMm] = useState('150');
  const [hbeamWebThickMm, setHbeamWebThickMm] = useState('7');
  const [hbeamFlangeThickMm, setHbeamFlangeThickMm] = useState('10');
  const [hbeamWeightPerMeter, setHbeamWeightPerMeter] = useState('31.5');
  const [hbeamLengthMm, setHbeamLengthMm] = useState('6000');
  const [hbeamQty, setHbeamQty] = useState('1');
  const [hbeamUnitPricePerKg, setHbeamUnitPricePerKg] = useState('50000');

  // ===================== 5. FLAT BAR (PLAT STRIP) STATE =====================
  const [flatIdx, setFlatIdx] = useState(0);
  const [flatWidthMm, setFlatWidthMm] = useState('50');
  const [flatThickMm, setFlatThickMm] = useState('4.5');
  const [flatLengthMm, setFlatLengthMm] = useState('6000');
  const [flatQty, setFlatQty] = useState('1');
  const [flatDensity, setFlatDensity] = useState('7.85');
  const [flatUnitPricePerKg, setFlatUnitPricePerKg] = useState('48000');

  // ===================== 6. ROUND BAR (BESI AS) STATE =====================
  const [roundDiaMm, setRoundDiaMm] = useState('50');
  const [roundLengthMm, setRoundLengthMm] = useState('6000');
  const [roundQty, setRoundQty] = useState('1');
  const [roundDensity, setRoundDensity] = useState('7.85');
  const [roundUnitPricePerKg, setRoundUnitPricePerKg] = useState('49000');

  // ===================== 7. PLAT BORDES & GRATING STATE =====================
  const [bordesThickMm, setBordesThickMm] = useState('3.2');
  const [bordesAreaSqm, setBordesAreaSqm] = useState('9.0'); // 6m x 1.5m
  const [bordesWeightPerSqm, setBordesWeightPerSqm] = useState('28.5');
  const [bordesQty, setBordesQty] = useState('1');
  const [bordesUnitPrice, setBordesUnitPrice] = useState('1350000'); // Rp per lembar/m2

  // Expandable Master Standards Table
  const [isStandardsOpen, setIsStandardsOpen] = useState(false);

  // =========================================================================
  // CALCULATIONS (100% DYNAMIC BASED ON EDITABLE INPUTS)
  // =========================================================================

  // 1. Plate Calculations
  const pLen = parseFloat(plateLengthMm) || 0;
  const pWid = parseFloat(plateWidthMm) || 0;
  const pThk = parseFloat(plateThickMm) || 0;
  const pQty = parseFloat(plateQty) || 0;
  const pDen = parseFloat(plateDensity) || 7.85;
  const pScrap = parseFloat(plateScrapPct) || 0;
  const pRate = parseFloat(plateUnitPrice) || 0;

  const plateAreaSqm = (pLen * pWid) / 1_000_000;
  const plateBaseWeightKg = (pLen * pWid * pThk * pDen) / 1_000_000 * pQty;
  const plateTotalWeightKg = plateBaseWeightKg * (1 + pScrap / 100);
  const plateTotalCostRp = plateTotalWeightKg * pRate;

  // 2. Pipe Calculations
  const piLenM = (parseFloat(pipeLengthMm) || 0) / 1000;
  const piQtyVal = parseFloat(pipeQty) || 1;
  const piWtPerM = parseFloat(pipeWeightPerMeterManual) || 0;
  const piRateVal = parseFloat(pipeUnitPricePerMeter) || 0;

  const pipeTotalWeightKg = piWtPerM * piLenM * piQtyVal;
  const pipeTotalCostRp =
    pipePricingMode === 'per-meter'
      ? piLenM * piQtyVal * piRateVal
      : pipeTotalWeightKg * piRateVal;

  // 3. Angle Calculations
  const angLenM = (parseFloat(angleLengthMm) || 0) / 1000;
  const angQtyVal = parseFloat(angleQty) || 1;
  const angWtPerM = parseFloat(angleWeightPerMeter) || 0;
  const angRateVal = parseFloat(angleUnitPricePerKg) || 0;

  const angleTotalWeightKg = angWtPerM * angLenM * angQtyVal;
  const angleTotalCostRp = angleTotalWeightKg * angRateVal;

  // 4. H-Beam Calculations
  const hbLenM = (parseFloat(hbeamLengthMm) || 0) / 1000;
  const hbQtyVal = parseFloat(hbeamQty) || 1;
  const hbWtPerM = parseFloat(hbeamWeightPerMeter) || 0;
  const hbRateVal = parseFloat(hbeamUnitPricePerKg) || 0;

  const hbeamTotalWeightKg = hbWtPerM * hbLenM * hbQtyVal;
  const hbeamTotalCostRp = hbeamTotalWeightKg * hbRateVal;

  // 5. Flat Bar Calculations
  const fbW = parseFloat(flatWidthMm) || 0;
  const fbT = parseFloat(flatThickMm) || 0;
  const fbL = (parseFloat(flatLengthMm) || 0) / 1000;
  const fbQ = parseFloat(flatQty) || 1;
  const fbDen = parseFloat(flatDensity) || 7.85;
  const fbRate = parseFloat(flatUnitPricePerKg) || 0;
  const fbWeightPerMeterCalc = (fbW * fbT * fbDen) / 1000;
  const flatTotalWeightKg = fbWeightPerMeterCalc * fbL * fbQ;
  const flatTotalCostRp = flatTotalWeightKg * fbRate;

  // 6. Round Bar Calculations
  const rbD = parseFloat(roundDiaMm) || 0;
  const rbL = (parseFloat(roundLengthMm) || 0) / 1000;
  const rbQ = parseFloat(roundQty) || 1;
  const rbDen = parseFloat(roundDensity) || 7.85;
  const rbRate = parseFloat(roundUnitPricePerKg) || 0;
  const rbWeightPerMeterCalc = (Math.PI * Math.pow(rbD / 2, 2) * rbDen) / 1000;
  const roundTotalWeightKg = rbWeightPerMeterCalc * rbL * rbQ;
  const roundTotalCostRp = roundTotalWeightKg * rbRate;

  // 7. Bordes / Grating Calculations
  const bdArea = parseFloat(bordesAreaSqm) || 0;
  const bdWtSqm = parseFloat(bordesWeightPerSqm) || 0;
  const bdQ = parseFloat(bordesQty) || 1;
  const bdRate = parseFloat(bordesUnitPrice) || 0;
  const bordesTotalWeightKg = bdArea * bdWtSqm * bdQ;
  const bordesTotalCostRp = bdArea * bdQ * bdRate;

  // =========================================================================
  // HANDLERS FOR PRESET SELECTORS
  // =========================================================================
  const handleSelectPlateGrade = (g: SteelPlateGrade) => {
    setPlateGrade(g);
    const gradeObj = STEEL_PLATE_GRADES.find((item) => item.grade === g);
    if (gradeObj) {
      setPlateUnitPrice(String(gradeObj.unitPrice));
      setPlateDensity(String(gradeObj.density));
      setPlateCustomCode(`PL ${g}`);
    }
  };

  const handleSelectPipePreset = (nps: string, sch: string) => {
    setPipeNps(nps);
    setPipeSch(sch);
    const pipeStd = STANDARD_PIPES.find((p) => p.nps === nps);
    if (pipeStd) {
      setPipeCustomOdMm(String(pipeStd.odMm));
      const schStd = pipeStd.schedules.find((s) => s.sch === sch) || pipeStd.schedules[0];
      if (schStd) {
        setPipeCustomWtMm(String(schStd.wtMm));
        setPipeWeightPerMeterManual(String(schStd.weightKgM));
      }
    }
  };

  const handleSelectAnglePreset = (index: number) => {
    setAngleIdx(index);
    const ang = STANDARD_ANGLES[index];
    if (ang) {
      setAngleSizeName(ang.size);
      setAngleWeightPerMeter(String(ang.weightKgM));
      // Parse dimensions if possible
      const parts = ang.size.replace('L ', '').split('x');
      if (parts.length >= 3) {
        setAngleFlangeAMm(parts[0]);
        setAngleFlangeBMm(parts[1]);
        setAngleThickMm(parts[2]);
      }
    }
  };

  const handleSelectHbeamPreset = (index: number) => {
    setHbeamIdx(index);
    const hb = STANDARD_HBEAMS[index];
    if (hb) {
      setHbeamSizeName(hb.size);
      setHbeamWeightPerMeter(String(hb.weightKgM));
    }
  };

  const handleSelectFlatbarPreset = (index: number) => {
    setFlatIdx(index);
    const fb = STANDARD_FLATBARS[index];
    if (fb) {
      const parts = fb.size.split('x');
      if (parts.length >= 2) {
        setFlatWidthMm(parts[0]);
        setFlatThickMm(parts[1]);
      }
    }
  };

  // =========================================================================
  // ACTION: SAVE CALCULATED MATERIAL TO CATALOG
  // =========================================================================
  const handleSaveCurrentToCatalog = () => {
    let newItem: MaterialTypeDefinition;

    if (calcCat === 'plate') {
      newItem = {
        code: plateCustomCode.trim().toUpperCase() || `PL ${plateThickMm}MM`,
        name: `Pelat Baja ${plateGrade} t=${plateThickMm}mm (${plateLengthMm}×${plateWidthMm}mm)`,
        category: 'plate',
        categoryLabel: 'Pelat Baja',
        defaultUnit: 'kg',
        defaultUnitPrice: pRate,
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        d1Label: 'P (mm)',
        d2Label: 'L (mm)',
        d3Label: 'T (mm)',
        d4Label: 'Pcs',
        defaultD1: pLen,
        defaultD2: pWid,
        defaultD3: pThk,
        defaultD4: pQty,
        density: pDen,
        isSteelTonnage: true,
        descriptionHint: `Replating Pelat Baja ${plateGrade} t=${plateThickMm}mm`,
      };
    } else if (calcCat === 'pipe') {
      const finishCode = pipeMaterialFinish === 'galv' ? 'GALV' : 'CS';
      const finishName = pipeMaterialFinish === 'galv' ? 'Galvanis' : 'Hitam';
      newItem = {
        code: `PIPE ${pipeNps} ${pipeSch} ${finishCode}`.toUpperCase(),
        name: `Pipa Baja ${finishName} ${pipeNps} ${pipeSch} (OD=${pipeCustomOdMm}mm WT=${pipeCustomWtMm}mm)`,
        category: 'pipe',
        categoryLabel: 'Pipa Baja',
        defaultUnit: pipePricingMode === 'per-meter' ? 'm' : 'kg',
        defaultUnitPrice: piRateVal,
        badgeBg: pipeMaterialFinish === 'galv' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-cyan-100 text-cyan-800 border-cyan-200',
        d1Label: 'OD (mm)',
        d2Label: 'WT (mm)',
        d3Label: 'P (mm)',
        d4Label: 'Qty (Btg)',
        defaultD1: parseFloat(pipeCustomOdMm),
        defaultD2: parseFloat(pipeCustomWtMm),
        defaultD3: parseFloat(pipeLengthMm),
        defaultD4: piQtyVal,
        weightPerMeterKg: piWtPerM,
        isSteelTonnage: true,
        descriptionHint: `Pemasangan/Perbaikan Pipa ${finishName} ${pipeNps} ${pipeSch}`,
      };
    } else if (calcCat === 'angle') {
      newItem = {
        code: angleSizeName.toUpperCase(),
        name: `Besi Siku ${angleSizeName} (${angleFlangeAMm}×${angleFlangeBMm}×${angleThickMm}mm)`,
        category: 'profile',
        categoryLabel: 'Profil Konstruksi',
        defaultUnit: 'kg',
        defaultUnitPrice: angRateVal,
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
        d1Label: 'A (mm)',
        d2Label: 'B (mm)',
        d3Label: 'T (mm)',
        d4Label: 'Qty (Btg)',
        defaultD1: parseFloat(angleFlangeAMm),
        defaultD2: parseFloat(angleFlangeBMm),
        defaultD3: parseFloat(angleThickMm),
        defaultD4: angQtyVal,
        weightPerMeterKg: angWtPerM,
        isSteelTonnage: true,
        descriptionHint: `Penggantian Profil Siku ${angleSizeName}`,
      };
    } else if (calcCat === 'hbeam') {
      newItem = {
        code: hbeamSizeName.toUpperCase(),
        name: `Profil ${hbeamSizeName} Geladak (${hbeamHeightMm}×${hbeamFlangeMm}mm)`,
        category: 'profile',
        categoryLabel: 'Profil Konstruksi',
        defaultUnit: 'kg',
        defaultUnitPrice: hbRateVal,
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        d1Label: 'H (mm)',
        d2Label: 'B (mm)',
        d3Label: 'P (mm)',
        d4Label: 'Qty (Btg)',
        defaultD1: parseFloat(hbeamHeightMm),
        defaultD2: parseFloat(hbeamFlangeMm),
        defaultD3: parseFloat(hbeamLengthMm),
        defaultD4: hbQtyVal,
        weightPerMeterKg: hbWtPerM,
        isSteelTonnage: true,
        descriptionHint: `Penggantian Beam/Girder ${hbeamSizeName}`,
      };
    } else if (calcCat === 'flatbar') {
      newItem = {
        code: `FB ${flatWidthMm}x${flatThickMm}`.toUpperCase(),
        name: `Flat Bar Plat Strip ${flatWidthMm}×${flatThickMm}mm`,
        category: 'profile',
        categoryLabel: 'Profil Konstruksi',
        defaultUnit: 'kg',
        defaultUnitPrice: fbRate,
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        d1Label: 'L (mm)',
        d2Label: 'T (mm)',
        d3Label: 'P (mm)',
        d4Label: 'Pcs',
        defaultD1: fbW,
        defaultD2: fbT,
        defaultD3: parseFloat(flatLengthMm),
        defaultD4: fbQ,
        weightPerMeterKg: fbWeightPerMeterCalc,
        isSteelTonnage: true,
        descriptionHint: `Pemasangan Plat Strip FB ${flatWidthMm}×${flatThickMm}mm`,
      };
    } else if (calcCat === 'roundbar') {
      newItem = {
        code: `RB DIA ${roundDiaMm}`.toUpperCase(),
        name: `Round Bar Besi As Ø${roundDiaMm}mm`,
        category: 'profile',
        categoryLabel: 'Profil Konstruksi',
        defaultUnit: 'kg',
        defaultUnitPrice: rbRate,
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        d1Label: 'Ø (mm)',
        d2Label: 'P (mm)',
        d3Label: '-',
        d4Label: 'Pcs',
        defaultD1: rbD,
        defaultD2: parseFloat(roundLengthMm),
        defaultD4: rbQ,
        weightPerMeterKg: rbWeightPerMeterCalc,
        isSteelTonnage: true,
        descriptionHint: `Besi As Solid Ø${roundDiaMm}mm`,
      };
    } else {
      newItem = {
        code: `BORDES ${bordesThickMm}MM`.toUpperCase(),
        name: `Plat Bordes Chequered t=${bordesThickMm}mm (${bordesWeightPerSqm} kg/m²)`,
        category: 'profile',
        categoryLabel: 'Profil Konstruksi',
        defaultUnit: 'm²',
        defaultUnitPrice: bdRate,
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
        d1Label: 'Area (m²)',
        d2Label: 'T (mm)',
        d3Label: 'Qty',
        d4Label: 'Lembar',
        defaultD1: bdArea,
        defaultD2: parseFloat(bordesThickMm),
        defaultD4: bdQ,
        weightPerSqmKg: bdWtSqm,
        isSteelTonnage: true,
        descriptionHint: `Pemasangan Plat Bordes Lantai t=${bordesThickMm}mm`,
      };
    }

    const success = onSaveToCatalog(newItem);
    if (success) {
      onNotify?.(`Spesifikasi "${newItem.code}" berhasil disimpan ke Database Master Katalog!`);
    } else {
      onNotify?.(`Gagal menyimpan "${newItem.code}". Kode sudah ada.`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Columns: Fully Editable Technical Inputs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>Pilih Bentuk / Profil Material (Semua Parameter Bisa Diedit)</span>
              </h3>
              <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                100% Parameter Editable
              </span>
            </div>

            {/* Shape Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
              {[
                { id: 'plate', label: 'Pelat Lambung', icon: Tag },
                { id: 'pipe', label: 'Pipa Baja', icon: Wrench },
                { id: 'angle', label: 'Besi Siku L', icon: Sparkles },
                { id: 'hbeam', label: 'H-Beam / WF', icon: Layers },
                { id: 'flatbar', label: 'Plat Strip', icon: Box },
                { id: 'roundbar', label: 'Besi As', icon: Compass },
                { id: 'bordes', label: 'Plat Bordes', icon: FileSpreadsheet },
              ].map((p) => {
                const Icon = p.icon;
                const isSelected = calcCat === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setCalcCat(p.id as MaterialCategory)}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-emerald-600" />
                    <span className="text-[11px] font-bold leading-tight">{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ========================================================================= */}
            {/* 1. PELAT BAJA EDITABLE FORM                                               */}
            {/* ========================================================================= */}
            {calcCat === 'plate' && (
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">Spesifikasi & Dimensi Pelat Baja</h4>
                  <div className="flex items-center gap-1">
                    {STEEL_PLATE_GRADES.map((g) => (
                      <button
                        key={g.grade}
                        onClick={() => handleSelectPlateGrade(g.grade)}
                        className={`px-2 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                          plateGrade === g.grade
                            ? 'bg-emerald-700 text-white'
                            : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {g.grade}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Kode / Tag Material
                    </label>
                    <input
                      type="text"
                      value={plateCustomCode}
                      onChange={(e) => setPlateCustomCode(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (mm)
                    </label>
                    <input
                      type="number"
                      value={plateLengthMm}
                      onChange={(e) => setPlateLengthMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Lebar (mm)
                    </label>
                    <input
                      type="number"
                      value={plateWidthMm}
                      onChange={(e) => setPlateWidthMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ketebalan (mm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={plateThickMm}
                      onChange={(e) => setPlateThickMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Lembar (Qty)
                    </label>
                    <input
                      type="number"
                      value={plateQty}
                      onChange={(e) => setPlateQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Densitas (kg/dm³)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={plateDensity}
                      onChange={(e) => setPlateDensity(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                      title="Baja Mild: 7.85, SS304: 7.93, Aluminium: 2.70"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Scrap / Loss (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={plateScrapPct}
                      onChange={(e) => setPlateScrapPct(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tarif per Kg (Rp)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={plateUnitPrice}
                      onChange={(e) => setPlateUnitPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-800 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. PIPA BAJA EDITABLE FORM                                                */}
            {/* ========================================================================= */}
            {calcCat === 'pipe' && (
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Spesifikasi & Dimensi Pipa Baja</h4>

                {/* Preset Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jenis Bahan / Finish
                    </label>
                    <select
                      value={pipeMaterialFinish}
                      onChange={(e) => setPipeMaterialFinish(e.target.value as 'cs' | 'galv')}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                    >
                      <option value="cs">Pipa Hitam (Carbon Steel CS)</option>
                      <option value="galv">Pipa Galvanis (Hot Dip GALV)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Pilih Standar Ukuran Nominal (NPS)
                    </label>
                    <select
                      value={pipeNps}
                      onChange={(e) => handleSelectPipePreset(e.target.value, pipeSch)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                    >
                      {STANDARD_PIPES.map((p) => (
                        <option key={p.nps} value={p.nps}>
                          {p.nps} (OD: {p.odMm} mm)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Pilih Schedule Ketebalan
                    </label>
                    <select
                      value={pipeSch}
                      onChange={(e) => handleSelectPipePreset(pipeNps, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                    >
                      {['Sch 40', 'Sch 80', 'Sch 160'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Editable Fields */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Outer Diameter (OD mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={pipeCustomOdMm}
                      onChange={(e) => setPipeCustomOdMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Wall Thickness (WT mm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={pipeCustomWtMm}
                      onChange={(e) => setPipeCustomWtMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Berat per Meter (kg/m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={pipeWeightPerMeterManual}
                      onChange={(e) => setPipeWeightPerMeterManual(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (mm)
                    </label>
                    <input
                      type="number"
                      value={pipeLengthMm}
                      onChange={(e) => setPipeLengthMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Batang (Qty)
                    </label>
                    <input
                      type="number"
                      value={pipeQty}
                      onChange={(e) => setPipeQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Metode Penarifan
                    </label>
                    <select
                      value={pipePricingMode}
                      onChange={(e) => setPipePricingMode(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                    >
                      <option value="per-meter">Tarif per Meter (Rp/m)</option>
                      <option value="per-kg">Tarif per Berat (Rp/kg)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tarif Satuan ({pipePricingMode === 'per-meter' ? 'Rp/m' : 'Rp/kg'})
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={pipeUnitPricePerMeter}
                      onChange={(e) => setPipeUnitPricePerMeter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. BESI SIKU L EDITABLE FORM                                              */}
            {/* ========================================================================= */}
            {calcCat === 'angle' && (
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900">Spesifikasi & Dimensi Besi Siku L (Equal &amp; Unequal)</h4>
                  <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setAngleTypeFilter('all')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        angleTypeFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua Siku
                    </button>
                    <button
                      type="button"
                      onClick={() => setAngleTypeFilter('equal')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        angleTypeFilter === 'equal'
                          ? 'bg-white text-emerald-800 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sama Sisi (Equal)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAngleTypeFilter('unequal')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        angleTypeFilter === 'unequal'
                          ? 'bg-white text-indigo-800 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Beda Sisi (Unequal)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pilih Standar Profil Siku ({angleTypeFilter === 'equal' ? 'Sama Sisi' : angleTypeFilter === 'unequal' ? 'Beda Sisi' : 'Semua Ukuran'})
                  </label>
                  <select
                    value={angleIdx}
                    onChange={(e) => handleSelectAnglePreset(parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                  >
                    {(angleTypeFilter === 'equal'
                      ? STANDARD_EQUAL_ANGLES
                      : angleTypeFilter === 'unequal'
                      ? STANDARD_UNEQUAL_ANGLES
                      : STANDARD_ANGLES
                    ).map((a, i) => {
                      const globalIdx = STANDARD_ANGLES.findIndex((x) => x.name === a.name);
                      return (
                        <option key={a.name + i} value={globalIdx >= 0 ? globalIdx : i}>
                          {a.name} &bull; {a.weightKgM.toFixed(2)} kg/m {a.dimensions ? `(${a.dimensions})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nama / Kode Profil
                    </label>
                    <input
                      type="text"
                      value={angleSizeName}
                      onChange={(e) => setAngleSizeName(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Sayap A (mm)
                    </label>
                    <input
                      type="number"
                      value={angleFlangeAMm}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAngleFlangeAMm(val);
                        const a = parseFloat(val) || 0;
                        const b = parseFloat(angleFlangeBMm) || 0;
                        const t = parseFloat(angleThickMm) || 0;
                        if (a > 0 && b > 0 && t > 0) {
                          const wt = ((a + b - t) * t * 0.00785).toFixed(2);
                          setAngleWeightPerMeter(wt);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Sayap B (mm)
                    </label>
                    <input
                      type="number"
                      value={angleFlangeBMm}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAngleFlangeBMm(val);
                        const a = parseFloat(angleFlangeAMm) || 0;
                        const b = parseFloat(val) || 0;
                        const t = parseFloat(angleThickMm) || 0;
                        if (a > 0 && b > 0 && t > 0) {
                          const wt = ((a + b - t) * t * 0.00785).toFixed(2);
                          setAngleWeightPerMeter(wt);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ketebalan t (mm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={angleThickMm}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAngleThickMm(val);
                        const a = parseFloat(angleFlangeAMm) || 0;
                        const b = parseFloat(angleFlangeBMm) || 0;
                        const t = parseFloat(val) || 0;
                        if (a > 0 && b > 0 && t > 0) {
                          const wt = ((a + b - t) * t * 0.00785).toFixed(2);
                          setAngleWeightPerMeter(wt);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Berat per Meter (kg/m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={angleWeightPerMeter}
                      onChange={(e) => setAngleWeightPerMeter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang Batang (mm)
                    </label>
                    <input
                      type="number"
                      value={angleLengthMm}
                      onChange={(e) => setAngleLengthMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Batang (Qty)
                    </label>
                    <input
                      type="number"
                      value={angleQty}
                      onChange={(e) => setAngleQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tarif per Kg (Rp)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={angleUnitPricePerKg}
                      onChange={(e) => setAngleUnitPricePerKg(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. H-BEAM / IWF EDITABLE FORM                                             */}
            {/* ========================================================================= */}
            {calcCat === 'hbeam' && (
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Spesifikasi & Dimensi H-Beam / IWF</h4>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pilih Standar Profil H-Beam
                  </label>
                  <select
                    value={hbeamIdx}
                    onChange={(e) => handleSelectHbeamPreset(parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    {STANDARD_HBEAMS.map((h, i) => (
                      <option key={h.size} value={i}>
                        {h.name} &bull; {h.weightKgM} kg/m &bull; ({h.dimensions})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nama Profil H-Beam
                    </label>
                    <input
                      type="text"
                      value={hbeamSizeName}
                      onChange={(e) => setHbeamSizeName(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tinggi H (mm)
                    </label>
                    <input
                      type="number"
                      value={hbeamHeightMm}
                      onChange={(e) => setHbeamHeightMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Lebar Sayap B (mm)
                    </label>
                    <input
                      type="number"
                      value={hbeamFlangeMm}
                      onChange={(e) => setHbeamFlangeMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Berat per Meter (kg/m)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={hbeamWeightPerMeter}
                      onChange={(e) => setHbeamWeightPerMeter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang Profil (mm)
                    </label>
                    <input
                      type="number"
                      value={hbeamLengthMm}
                      onChange={(e) => setHbeamLengthMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Batang (Qty)
                    </label>
                    <input
                      type="number"
                      value={hbeamQty}
                      onChange={(e) => setHbeamQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tarif per Kg (Rp)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={hbeamUnitPricePerKg}
                      onChange={(e) => setHbeamUnitPricePerKg(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 5. FLAT BAR (PLAT STRIP) EDITABLE FORM                                    */}
            {/* ========================================================================= */}
            {calcCat === 'flatbar' && (
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Spesifikasi Plat Strip (Flat Bar)</h4>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pilih Standar Flat Bar
                  </label>
                  <select
                    value={flatIdx}
                    onChange={(e) => handleSelectFlatbarPreset(parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    {STANDARD_FLATBARS.map((f, i) => (
                      <option key={f.size} value={i}>
                        {f.name} &bull; {f.weightKgM} kg/m &bull; ({f.dimensions})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Lebar Strip L (mm)
                    </label>
                    <input
                      type="number"
                      value={flatWidthMm}
                      onChange={(e) => setFlatWidthMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ketebalan T (mm)
                    </label>
                    <input
                      type="number"
                      value={flatThickMm}
                      onChange={(e) => setFlatThickMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (mm)
                    </label>
                    <input
                      type="number"
                      value={flatLengthMm}
                      onChange={(e) => setFlatLengthMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Batang (Qty)
                    </label>
                    <input
                      type="number"
                      value={flatQty}
                      onChange={(e) => setFlatQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Densitas (kg/dm³)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={flatDensity}
                      onChange={(e) => setFlatDensity(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tarif per Kg (Rp)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={flatUnitPricePerKg}
                      onChange={(e) => setFlatUnitPricePerKg(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 6. ROUND BAR (BESI AS) EDITABLE FORM                                      */}
            {/* ========================================================================= */}
            {calcCat === 'roundbar' && (
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Spesifikasi Besi As Solid (Round Bar)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Diameter As Ø (mm)
                    </label>
                    <input
                      type="number"
                      value={roundDiaMm}
                      onChange={(e) => setRoundDiaMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (mm)
                    </label>
                    <input
                      type="number"
                      value={roundLengthMm}
                      onChange={(e) => setRoundLengthMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Batang (Qty)
                    </label>
                    <input
                      type="number"
                      value={roundQty}
                      onChange={(e) => setRoundQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Densitas (kg/dm³)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={roundDensity}
                      onChange={(e) => setRoundDensity(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tarif per Kg (Rp)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={roundUnitPricePerKg}
                      onChange={(e) => setRoundUnitPricePerKg(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 7. PLAT BORDES & GRATING EDITABLE FORM                                    */}
            {/* ========================================================================= */}
            {calcCat === 'bordes' && (
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Spesifikasi Plat Bordes / Chequered</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Luas Total (m²)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={bordesAreaSqm}
                      onChange={(e) => setBordesAreaSqm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tebal Plat (mm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={bordesThickMm}
                      onChange={(e) => setBordesThickMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Berat Satuan (kg/m²)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={bordesWeightPerSqm}
                      onChange={(e) => setBordesWeightPerSqm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tarif per m² (Rp)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={bordesUnitPrice}
                      onChange={(e) => setBordesUnitPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Calculation Summary & Action to Master Database */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md space-y-4 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Hasil Kalkulasi Teknis
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live Formula
              </span>
            </div>

            {/* Tonase Weight Result */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Total Berat Tonase Material:</span>
              <div className="text-2xl font-black font-mono text-amber-400">
                {calcCat === 'plate' && `${TonnageCalculator.formatWeight(plateTotalWeightKg)} kg`}
                {calcCat === 'pipe' && `${TonnageCalculator.formatWeight(pipeTotalWeightKg)} kg`}
                {calcCat === 'angle' && `${TonnageCalculator.formatWeight(angleTotalWeightKg)} kg`}
                {calcCat === 'hbeam' && `${TonnageCalculator.formatWeight(hbeamTotalWeightKg)} kg`}
                {calcCat === 'flatbar' && `${TonnageCalculator.formatWeight(flatTotalWeightKg)} kg`}
                {calcCat === 'roundbar' && `${TonnageCalculator.formatWeight(roundTotalWeightKg)} kg`}
                {calcCat === 'bordes' && `${TonnageCalculator.formatWeight(bordesTotalWeightKg)} kg`}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {calcCat === 'plate' && `Setara ${(plateTotalWeightKg / 1000).toFixed(3)} Ton Metric (MT)`}
                {calcCat === 'pipe' && `Setara ${(pipeTotalWeightKg / 1000).toFixed(3)} Ton Metric (MT)`}
                {calcCat === 'angle' && `Setara ${(angleTotalWeightKg / 1000).toFixed(3)} Ton Metric (MT)`}
                {calcCat === 'hbeam' && `Setara ${(hbeamTotalWeightKg / 1000).toFixed(3)} Ton Metric (MT)`}
                {calcCat === 'flatbar' && `Setara ${(flatTotalWeightKg / 1000).toFixed(3)} Ton Metric (MT)`}
                {calcCat === 'roundbar' && `Setara ${(roundTotalWeightKg / 1000).toFixed(3)} Ton Metric (MT)`}
                {calcCat === 'bordes' && `Setara ${(bordesTotalWeightKg / 1000).toFixed(3)} Ton Metric (MT)`}
              </div>
            </div>

            {/* Linked Price & Total Cost */}
            <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Tarif Satuan:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {calcCat === 'plate' && `${TonnageCalculator.formatRupiah(pRate)} / kg`}
                  {calcCat === 'pipe' && `${TonnageCalculator.formatRupiah(piRateVal)} / ${pipePricingMode === 'per-meter' ? 'm' : 'kg'}`}
                  {calcCat === 'angle' && `${TonnageCalculator.formatRupiah(angRateVal)} / kg`}
                  {calcCat === 'hbeam' && `${TonnageCalculator.formatRupiah(hbRateVal)} / kg`}
                  {calcCat === 'flatbar' && `${TonnageCalculator.formatRupiah(fbRate)} / kg`}
                  {calcCat === 'roundbar' && `${TonnageCalculator.formatRupiah(rbRate)} / kg`}
                  {calcCat === 'bordes' && `${TonnageCalculator.formatRupiah(bdRate)} / m²`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-slate-700/60 pt-2">
                <span className="text-slate-300 font-semibold">Subtotal RAB Estimasi:</span>
                <span className="font-mono font-extrabold text-base text-emerald-300">
                  {calcCat === 'plate' && TonnageCalculator.formatRupiah(plateTotalCostRp)}
                  {calcCat === 'pipe' && TonnageCalculator.formatRupiah(pipeTotalCostRp)}
                  {calcCat === 'angle' && TonnageCalculator.formatRupiah(angleTotalCostRp)}
                  {calcCat === 'hbeam' && TonnageCalculator.formatRupiah(hbeamTotalCostRp)}
                  {calcCat === 'flatbar' && TonnageCalculator.formatRupiah(flatTotalCostRp)}
                  {calcCat === 'roundbar' && TonnageCalculator.formatRupiah(roundTotalCostRp)}
                  {calcCat === 'bordes' && TonnageCalculator.formatRupiah(bordesTotalCostRp)}
                </span>
              </div>
            </div>

            {/* Action: Save calculated spec into Master Catalog */}
            <button
              onClick={handleSaveCurrentToCatalog}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Spesifikasi Ini ke Master Database</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
