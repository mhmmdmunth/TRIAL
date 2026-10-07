import React, { useState } from 'react';
import {
  X,
  Scale,
  Check,
  Layers,
  CircleDot,
  Maximize2,
  Minimize2,
  Box,
  Compass,
  Grid,
  Info,
} from 'lucide-react';
import { MaterialCategory, SteelPlateGrade, STEEL_PLATE_GRADES } from '../types';
import {
  TonnageCalculator,
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
  STANDARD_CHANNELS,
} from '../utils/tonnageCalculator';

export interface CalculatedMaterialResult {
  category: MaterialCategory;
  name: string;
  typeCode: string;
  d1: string;
  d2: string;
  d3: string;
  dLen?: string;
  d4: string;
  qty: number;
  unit: string;
  weightKg: number;
  unitPrice?: number;
  description: string;
}

interface MaterialCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (result: CalculatedMaterialResult) => void;
  initialCategory?: MaterialCategory;
}

export const MaterialCalculatorModal: React.FC<MaterialCalculatorModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialCategory = 'pipe',
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && (e.key === 'Escape' || e.key === 'Esc')) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [selectedCat, setSelectedCat] = useState<MaterialCategory>(initialCategory);

  // --- PIPE STATES (Satuan mm) ---
  const [pipeNps, setPipeNps] = useState('2"');
  const [pipeSch, setPipeSch] = useState('Sch 40');
  const [pipeMaterialFinish, setPipeMaterialFinish] = useState<'cs' | 'galv'>('cs');
  const [pipeLengthStr, setPipeLengthStr] = useState('6000'); // standard 6000 mm (6 meter)
  const [pipeQtyStr, setPipeQtyStr] = useState('1');
  const [isCustomPipe, setIsCustomPipe] = useState(false);
  const [customOdStr, setCustomOdStr] = useState('60.3');
  const [customWtStr, setCustomWtStr] = useState('3.91');

  // --- H-BEAM STATES (Satuan mm) ---
  const [hbeamIdx, setHbeamIdx] = useState(2); // H 150x150
  const [hbeamLengthStr, setHbeamLengthStr] = useState('6000');
  const [hbeamQtyStr, setHbeamQtyStr] = useState('1');

  // --- ANGLE BAR (SIKU) STATES (Satuan mm) ---
  const [angleTypeMode, setAngleTypeMode] = useState<'equal' | 'unequal' | 'custom'>('equal');
  const [angleEqualIdx, setAngleEqualIdx] = useState(11); // L 50x50x5
  const [angleUnequalIdx, setAngleUnequalIdx] = useState(7); // L 100x75x7 (Unequal)
  const [angleCustomLegA, setAngleCustomLegA] = useState('75');
  const [angleCustomLegB, setAngleCustomLegB] = useState('50');
  const [angleCustomThick, setAngleCustomThick] = useState('6');
  const [angleLengthStr, setAngleLengthStr] = useState('6000');
  const [angleQtyStr, setAngleQtyStr] = useState('1');

  // --- FLAT BAR STATES (Satuan mm) ---
  const [flatIdx, setFlatIdx] = useState(0); // FB 50x4.5
  const [flatLengthStr, setFlatLengthStr] = useState('6000');
  const [flatQtyStr, setFlatQtyStr] = useState('1');

  // --- ROUND BAR STATES (Satuan mm) ---
  const [roundIdx, setRoundIdx] = useState(5); // D 25mm
  const [roundLengthStr, setRoundLengthStr] = useState('6000');
  const [roundQtyStr, setRoundQtyStr] = useState('1');

  // --- SQUARE BAR STATES (Satuan mm) ---
  const [squareIdx, setSquareIdx] = useState(2); // 16x16
  const [squareLengthStr, setSquareLengthStr] = useState('6000');
  const [squareQtyStr, setSquareQtyStr] = useState('1');

  // --- GRATING STATES (Satuan mm) ---
  const [gratingIdx, setGratingIdx] = useState(1); // 25x5 mm
  const [gratingLengthStr, setGratingLengthStr] = useState('1000');
  const [gratingWidthStr, setGratingWidthStr] = useState('1000');
  const [gratingQtyStr, setGratingQtyStr] = useState('1');

  // --- BORDES STATES (Satuan mm) ---
  const [bordesIdx, setBordesIdx] = useState(2); // 3.2 mm
  const [bordesLengthStr, setBordesLengthStr] = useState('2440'); // standard plate 8 ft (2440 mm)
  const [bordesWidthStr, setBordesWidthStr] = useState('1220'); // standard plate 4 ft (1220 mm)
  const [bordesQtyStr, setBordesQtyStr] = useState('1');

  // --- CHANNEL (UNP) STATES (Satuan mm) ---
  const [channelIdx, setChannelIdx] = useState(3); // UNP 100
  const [channelLengthStr, setChannelLengthStr] = useState('6000');
  const [channelQtyStr, setChannelQtyStr] = useState('1');

  // --- PLATE STATES (Satuan mm, 3 Opsi: ABS, BKI, NC) ---
  const [plateLengthStr, setPlateLengthStr] = useState('2000');
  const [plateWidthStr, setPlateWidthStr] = useState('1500');
  const [plateThickStr, setPlateThickStr] = useState('10');
  const [plateGrade, setPlateGrade] = useState<SteelPlateGrade>('BKI');
  const [plateQtyStr, setPlateQtyStr] = useState('1');

  if (!isOpen) return null;

  // --- CALCULATIONS (Semua dimensi dihitung dari Milimeter / mm) ---

  let calculatedWeight = 0;
  let formulaInfo = '';
  let unitWeightLabel = '';
  let resultToApply: CalculatedMaterialResult;

  if (selectedCat === 'pipe') {
    const selectedPipe = STANDARD_PIPES.find((p) => p.nps === pipeNps) || STANDARD_PIPES[5];
    const selectedSchedule =
      selectedPipe.schedules.find((s) => s.sch === pipeSch) || selectedPipe.schedules[0];

    const od = isCustomPipe ? parseFloat(customOdStr) || 0 : selectedPipe.odMm;
    const wt = isCustomPipe ? parseFloat(customWtStr) || 0 : selectedSchedule.wtMm;
    const lengthMm = parseFloat(pipeLengthStr) || 0;
    const lengthM = lengthMm / 1000;
    const qty = parseFloat(pipeQtyStr) || 1;

    calculatedWeight = TonnageCalculator.calculatePipeWeight({
      outerDiameterMm: od,
      wallThicknessMm: wt,
      lengthM,
      qty,
    });

    const kgPerM = (od - wt) * wt * 0.0246615;
    const finishName = pipeMaterialFinish === 'galv' ? 'Galvanis' : 'Baja Hitam';
    const finishCode = pipeMaterialFinish === 'galv' ? 'GALV' : 'CS';
    unitWeightLabel = `${kgPerM.toFixed(2)} kg/m (${finishName})`;
    formulaInfo = `Pipa ${finishName} OD ${od}mm × WT ${wt}mm × ${lengthMm}mm (${lengthM.toFixed(2)}m) × ${qty} btg`;

    resultToApply = {
      category: 'pipe',
      name: `Pipa ${finishName} ${isCustomPipe ? `OD ${od}x${wt}mm` : `${pipeNps} ${pipeSch}`}`,
      typeCode: pipeMaterialFinish === 'galv' ? 'PP G' : 'PP B',
      d1: isCustomPipe ? String(od) : pipeNps.replace(/"/g, ''),
      d2: isCustomPipe ? 'mm' : 'inch',
      d3: isCustomPipe ? `${wt}mm` : pipeSch.toLowerCase().replace(/\s+/g, '.'),
      dLen: String(Math.round(lengthMm)),
      d4: String(qty),
      qty,
      unit: 'kg',
      weightKg: calculatedWeight,
      unitPrice: pipeMaterialFinish === 'galv' ? 65000 : 52000,
      description: `Pipa ${finishName} ${pipeNps} ${pipeSch} (P: ${lengthMm} mm, OD: ${od} mm, WT: ${wt} mm, ${qty} btg)`,
    };
  } else if (selectedCat === 'hbeam') {
    const profile = STANDARD_HBEAMS[hbeamIdx] || STANDARD_HBEAMS[0];
    const lengthMm = parseFloat(hbeamLengthStr) || 0;
    const lengthM = lengthMm / 1000;
    const qty = parseFloat(hbeamQtyStr) || 1;

    calculatedWeight = TonnageCalculator.calculateHBeamWeight({
      weightKgM: profile.weightKgM,
      lengthM,
      qty,
    });

    unitWeightLabel = `${profile.weightKgM.toFixed(1)} kg/m`;
    formulaInfo = `${profile.name} (${profile.weightKgM} kg/m) × ${lengthMm}mm × ${qty} btg`;

    const sizeParts = profile.size.split('x');
    const h = sizeParts[0] || '0';
    const b = sizeParts[1] || '0';

    resultToApply = {
      category: 'hbeam',
      name: profile.name,
      typeCode: 'HB',
      d1: h,
      d2: '',
      d3: '',
      dLen: String(Math.round(lengthMm)),
      d4: String(qty),
      qty,
      unit: 'kg',
      weightKg: calculatedWeight,
      unitPrice: 52000,
      description: `${profile.name} (Ukuran: ${profile.size}, P: ${lengthMm} mm, ${qty} batang)`,
    };
  } else if (selectedCat === 'angle') {
    const lengthMm = parseFloat(angleLengthStr) || 0;
    const lengthM = lengthMm / 1000;
    const qty = parseFloat(angleQtyStr) || 1;

    let profileName = '';
    let typeCode = 'EA';
    let weightKgM = 0;
    let legAStr = '0';
    let legBStr = '0';
    let thickStr = '0';

    if (angleTypeMode === 'custom') {
      const legA = parseFloat(angleCustomLegA) || 0;
      const legB = parseFloat(angleCustomLegB) || 0;
      const thick = parseFloat(angleCustomThick) || 0;
      weightKgM = (legA + legB - thick) * thick * 0.00785;
      profileName = `L Custom ${legA}x${legB}x${thick} mm`;
      typeCode = legA === legB ? 'EA' : 'UA';
      legAStr = String(legA);
      legBStr = String(legB);
      thickStr = String(thick);
    } else if (angleTypeMode === 'unequal') {
      const profile = STANDARD_UNEQUAL_ANGLES[angleUnequalIdx] || STANDARD_UNEQUAL_ANGLES[0];
      weightKgM = profile.weightKgM;
      profileName = `Besi Siku Beda Sisi ${profile.name}`;
      typeCode = 'UA';
      const sizeParts = profile.size.split('x');
      legAStr = sizeParts[0] || '0';
      legBStr = sizeParts[1] || '0';
      thickStr = sizeParts[2] || '0';
    } else {
      const profile = STANDARD_EQUAL_ANGLES[angleEqualIdx] || STANDARD_EQUAL_ANGLES[0];
      weightKgM = profile.weightKgM;
      profileName = `Besi Siku Sama Sisi ${profile.name}`;
      typeCode = 'EA';
      const sizeParts = profile.size.split('x');
      legAStr = sizeParts[0] || '0';
      legBStr = sizeParts[1] || '0';
      thickStr = sizeParts[2] || '0';
    }

    calculatedWeight = Math.round(weightKgM * lengthM * qty * 100) / 100;

    unitWeightLabel = `${weightKgM.toFixed(2)} kg/m`;
    formulaInfo = `${profileName} (${weightKgM.toFixed(2)} kg/m) × ${lengthMm}mm (${lengthM.toFixed(2)}m) × ${qty} btg`;

    resultToApply = {
      category: 'angle',
      name: profileName,
      typeCode,
      d1: legAStr,
      d2: typeCode === 'UA' ? legBStr : '',
      d3: thickStr,
      dLen: String(Math.round(lengthMm)),
      d4: String(qty),
      qty,
      unit: 'kg',
      weightKg: calculatedWeight,
      unitPrice: angleTypeMode === 'unequal' ? 49500 : 48000,
      description: `${profileName} (Ukuran: ${legAStr}x${legBStr}x${thickStr} mm, P: ${lengthMm} mm, ${qty} btg)`,
    };
  } else if (selectedCat === 'flatbar') {
    const profile = STANDARD_FLATBARS[flatIdx] || STANDARD_FLATBARS[0];
    const lengthMm = parseFloat(flatLengthStr) || 0;
    const lengthM = lengthMm / 1000;
    const qty = parseFloat(flatQtyStr) || 1;

    calculatedWeight = Math.round(profile.weightKgM * lengthM * qty * 100) / 100;
    unitWeightLabel = `${profile.weightKgM.toFixed(2)} kg/m`;
    formulaInfo = `${profile.name} (${profile.weightKgM} kg/m) × ${lengthMm}mm × ${qty} btg`;

    const sizeParts = profile.size.split('x');
    const width = sizeParts[0] || '0';
    const thickness = sizeParts[1] || '0';

    resultToApply = {
      category: 'flatbar',
      name: `Flat Bar ${profile.name}`,
      typeCode: 'FB',
      d1: width,
      d2: '',
      d3: thickness,
      dLen: String(Math.round(lengthMm)),
      d4: String(qty),
      qty,
      unit: 'kg',
      weightKg: calculatedWeight,
      unitPrice: 48000,
      description: `Flat Bar ${profile.name} (P: ${lengthMm} mm, ${qty} batang)`,
    };
  } else if (selectedCat === 'roundbar') {
    const profile = STANDARD_ROUNDBARS[roundIdx] || STANDARD_ROUNDBARS[0];
    const lengthMm = parseFloat(roundLengthStr) || 0;
    const lengthM = lengthMm / 1000;
    const qty = parseFloat(roundQtyStr) || 1;

    calculatedWeight = Math.round(profile.weightKgM * lengthM * qty * 100) / 100;
    unitWeightLabel = `${profile.weightKgM.toFixed(2)} kg/m`;
    formulaInfo = `${profile.name} (${profile.dimensions}) × ${lengthMm}mm × ${qty} btg`;

    const sizeParts = profile.size.split('x');
    const diameter = sizeParts[0] || '0';

    resultToApply = {
      category: 'roundbar',
      name: profile.name,
      typeCode: 'RB MM',
      d1: diameter,
      d2: '',
      d3: '',
      dLen: String(Math.round(lengthMm)),
      d4: String(qty),
      qty,
      unit: 'kg',
      weightKg: calculatedWeight,
      unitPrice: 56000,
      description: `${profile.name} (P: ${lengthMm} mm, ${qty} batang)`,
    };
  } else if (selectedCat === 'squarebar') {
    const profile = STANDARD_SQUAREBARS[squareIdx] || STANDARD_SQUAREBARS[0];
    const lengthMm = parseFloat(squareLengthStr) || 0;
    const lengthM = lengthMm / 1000;
    const qty = parseFloat(squareQtyStr) || 1;

    calculatedWeight = Math.round(profile.weightKgM * lengthM * qty * 100) / 100;
    unitWeightLabel = `${profile.weightKgM.toFixed(2)} kg/m`;
    formulaInfo = `${profile.name} (${profile.dimensions}) × ${lengthMm}mm × ${qty} btg`;

    const sizeParts = profile.size.split('x');
    const side = sizeParts[0] || '0';

    resultToApply = {
      category: 'squarebar',
      name: profile.name,
      typeCode: 'SB',
      d1: side,
      d2: '',
      d3: '',
      dLen: String(Math.round(lengthMm)),
      d4: String(qty),
      qty,
      unit: 'kg',
      weightKg: calculatedWeight,
      unitPrice: 52000,
      description: `${profile.name} (P: ${lengthMm} mm, ${qty} batang)`,
    };
  } else if (selectedCat === 'grating') {
    const profile = STANDARD_GRATINGS[gratingIdx] || STANDARD_GRATINGS[0];
    const lengthMm = parseFloat(gratingLengthStr) || 0;
    const widthMm = parseFloat(gratingWidthStr) || 0;
    const lengthM = lengthMm / 1000;
    const widthM = widthMm / 1000;
    const qty = parseFloat(gratingQtyStr) || 1;

    calculatedWeight = TonnageCalculator.calculateGratingWeight({
      lengthM,
      widthM,
      weightKgM2: profile.weightKgM2,
      qty,
    });

    unitWeightLabel = `${profile.weightKgM2.toFixed(1)} kg/m²`;
    formulaInfo = `${lengthMm} mm × ${widthMm} mm (${(lengthM * widthM).toFixed(2)} m²) × ${profile.weightKgM2} kg/m² × ${qty}`;

    resultToApply = {
      category: 'grating',
      name: profile.name,
      typeCode: 'GR',
      d1: String(Math.round(lengthMm)),
      d2: String(Math.round(widthMm)),
      d3: '',
      dLen: '',
      d4: String(qty),
      qty,
      unit: 'kg',
      weightKg: calculatedWeight,
      unitPrice: 65000,
      description: `Pasang ${profile.name} (${lengthMm} mm × ${widthMm} mm, ${qty} lembar)`,
    };
  } else if (selectedCat === 'bordes') {
    const profile = STANDARD_BORDES[bordesIdx] || STANDARD_BORDES[0];
    const lengthMm = parseFloat(bordesLengthStr) || 0;
    const widthMm = parseFloat(bordesWidthStr) || 0;
    const lengthM = lengthMm / 1000;
    const widthM = widthMm / 1000;
    const qty = parseFloat(bordesQtyStr) || 1;

    calculatedWeight = TonnageCalculator.calculateBordesWeight({
      lengthM,
      widthM,
      weightKgM2: profile.weightKgM2,
      qty,
    });

    unitWeightLabel = `${profile.weightKgM2.toFixed(2)} kg/m²`;
    formulaInfo = `${lengthMm} mm × ${widthMm} mm (${(lengthM * widthM).toFixed(2)} m²) × ${profile.weightKgM2} kg/m² × ${qty}`;

    resultToApply = {
      category: 'bordes',
      name: profile.name,
      typeCode: 'CQR',
      d1: String(Math.round(lengthMm)),
      d2: String(Math.round(widthMm)),
      d3: `${profile.thicknessMm}`,
      dLen: '',
      d4: String(qty),
      qty,
      unit: 'kg',
      weightKg: calculatedWeight,
      unitPrice: 50000,
      description: `Pasang ${profile.name} Geladak (${lengthMm} mm × ${widthMm} mm × ${profile.thicknessMm} mm, ${qty} lembar)`,
    };
  } else if (selectedCat === 'channel') {
    const profile = STANDARD_CHANNELS[channelIdx] || STANDARD_CHANNELS[0];
    const lengthMm = parseFloat(channelLengthStr) || 0;
    const lengthM = lengthMm / 1000;
    const qty = parseFloat(channelQtyStr) || 1;

    calculatedWeight = TonnageCalculator.calculateChannelWeight({
      weightKgM: profile.weightKgM,
      lengthM,
      qty,
    });

    unitWeightLabel = `${profile.weightKgM.toFixed(2)} kg/m`;
    formulaInfo = `${profile.name} (${profile.weightKgM} kg/m) × ${lengthMm}mm × ${qty} btg`;

    const sizeParts = profile.size.split('x');
    const height = sizeParts[0] || '0';
    const flange = sizeParts[1] || '0';

    resultToApply = {
      category: 'channel',
      name: profile.name,
      typeCode: 'UNP',
      d1: height,
      d2: flange,
      d3: '',
      dLen: String(Math.round(lengthMm)),
      d4: String(qty),
      qty,
      unit: 'kg',
      weightKg: calculatedWeight,
      unitPrice: 49000,
      description: `Kanal UNP ${profile.name} (P: ${lengthMm} mm, ${qty} batang)`,
    };
  } else {
    // Standard Plate (3 Opsi: ABS, BKI, NC - Satuan mm)
    const lengthMm = parseFloat(plateLengthStr) || 0;
    const widthMm = parseFloat(plateWidthStr) || 0;
    const thickMm = parseFloat(plateThickStr) || 0;
    const qty = parseFloat(plateQtyStr) || 1;
    const gradeObj = STEEL_PLATE_GRADES.find((g) => g.grade === plateGrade) || STEEL_PLATE_GRADES[1];
    const density = gradeObj.density; // 7.85

    calculatedWeight = TonnageCalculator.calculatePlateWeightFromMm({
      lengthMm,
      widthMm,
      thicknessMm: thickMm,
      density,
      qty,
    });

    unitWeightLabel = `${(thickMm * density).toFixed(2)} kg/m²`;
    formulaInfo = `${lengthMm} mm × ${widthMm} mm × ${thickMm} mm × ${density} kg/dm³ × ${qty} (${gradeObj.fullName})`;

    resultToApply = {
      category: 'plate',
      name: `Pelat Baja Grade ${plateGrade}`,
      typeCode: `PL ${plateGrade}`,
      d1: String(Math.round(lengthMm)),
      d2: String(Math.round(widthMm)),
      d3: String(thickMm),
      dLen: '',
      d4: String(qty),
      qty,
      unit: 'kg',
      weightKg: calculatedWeight,
      unitPrice: gradeObj.unitPrice,
      description: `Crop & Replating Pelat Baja Grade ${plateGrade} (${lengthMm} mm × ${widthMm} mm × ${thickMm} mm)`,
    };
  }

  const handleApply = () => {
    onApply(resultToApply);
    onClose();
  };

  const categoriesList: { id: MaterialCategory; label: string; badge: string }[] = [
    { id: 'pipe', label: 'Pipa Baja & Sch', badge: 'OD/WT' },
    { id: 'hbeam', label: 'H-Beam & WF', badge: 'Profile' },
    { id: 'angle', label: 'Angle Bar (Siku L)', badge: 'L-Bar' },
    { id: 'flatbar', label: 'Flat Bar (Plat Strip)', badge: 'FB' },
    { id: 'roundbar', label: 'Round Bar (Besi As)', badge: 'D mm' },
    { id: 'squarebar', label: 'Square Bar (Nako)', badge: 'Nako' },
    { id: 'grating', label: 'Grating Plate', badge: 'm²' },
    { id: 'bordes', label: 'Plat Bordes', badge: 'Kembang' },
    { id: 'channel', label: 'Channel (UNP)', badge: 'UNP' },
    { id: 'plate', label: 'Pelat Baja Biasa', badge: 'Plate' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Katalog &amp; Kalkulator Material Galangan
              </h3>
              <p className="text-[11px] text-slate-500">
                Hitung tonase pipa, profil baja, grating, bordes, dan terapkan ke Repair List / Survey.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Material Category Selector Tabs */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Pilih Jenis Material Kapal
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {categoriesList.map((cat) => {
                const isSelected = selectedCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCat(cat.id)}
                    className={`px-2.5 py-2 rounded-xl text-left border transition-all text-xs font-semibold flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs ring-1 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate block font-medium">{cat.label}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono self-start mt-1 ${
                        isSelected
                          ? 'bg-emerald-200 text-emerald-900 font-bold'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {cat.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Configuration Form */}
          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200 space-y-3">
            {/* --- PIPA (PIPE) --- */}
            {selectedCat === 'pipe' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Spesifikasi Pipa Baja Karbon (ASTM / JIS / DIN)</span>
                  </h4>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCustomPipe}
                      onChange={(e) => setIsCustomPipe(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Ukuran OD/WT Kustom</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jenis Bahan / Finish
                    </label>
                    <select
                      value={pipeMaterialFinish}
                      onChange={(e) => setPipeMaterialFinish(e.target.value as 'cs' | 'galv')}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                    >
                      <option value="cs">Pipa Hitam (Carbon Steel - CS)</option>
                      <option value="galv">Pipa Galvanis (Hot Dip - GALV)</option>
                    </select>
                  </div>

                  {!isCustomPipe ? (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nominal Pipe Size (NPS)
                        </label>
                        <select
                          value={pipeNps}
                          onChange={(e) => {
                            const nps = e.target.value;
                            setPipeNps(nps);
                            const pipe = STANDARD_PIPES.find((p) => p.nps === nps);
                            if (pipe && !pipe.schedules.some((s) => s.sch === pipeSch)) {
                              setPipeSch(pipe.schedules[0].sch);
                            }
                          }}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
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
                          Schedule (Ketebalan)
                        </label>
                        <select
                          value={pipeSch}
                          onChange={(e) => setPipeSch(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                        >
                          {STANDARD_PIPES.find((p) => p.nps === pipeNps)?.schedules.map((s) => (
                            <option key={s.sch} value={s.sch}>
                              {s.sch} &bull; WT: {s.wtMm} mm &bull; {s.weightKgM} kg/m
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Outer Diameter (OD mm)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={customOdStr}
                          onChange={(e) => setCustomOdStr(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Wall Thickness (WT mm)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={customWtStr}
                          onChange={(e) => setCustomWtStr(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang per Batang / Jalur (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={pipeLengthStr}
                      onChange={(e) => setPipeLengthStr(e.target.value)}
                      placeholder="6.0"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah (Batang / Section)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={pipeQtyStr}
                      onChange={(e) => setPipeQtyStr(e.target.value)}
                      placeholder="1"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- H-BEAM / WF --- */}
            {selectedCat === 'hbeam' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Pilih Profil Baja H-Beam / Wide Flange (WF)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Profil Standar &amp; Berat per Meter
                    </label>
                    <select
                      value={hbeamIdx}
                      onChange={(e) => setHbeamIdx(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      {STANDARD_HBEAMS.map((h, i) => (
                        <option key={h.size} value={i}>
                          {h.name} &bull; {h.weightKgM} kg/m &bull; ({h.dimensions})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={hbeamLengthStr}
                      onChange={(e) => setHbeamLengthStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Batang
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={hbeamQtyStr}
                      onChange={(e) => setHbeamQtyStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-[11px] text-slate-500">
                      Biasanya digunakan untuk carling geladak, bottom frame, &amp; engine bed foundation.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* --- ANGLE BAR (SIKU) --- */}
            {selectedCat === 'angle' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Kalkulator Besi Siku / Angle Bar (Sama Sisi &amp; Beda Sisi)
                  </h4>
                  {/* Mode Selector Tabs */}
                  <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setAngleTypeMode('equal')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        angleTypeMode === 'equal'
                          ? 'bg-white text-emerald-800 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Siku Sama Sisi (Equal)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAngleTypeMode('unequal')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        angleTypeMode === 'unequal'
                          ? 'bg-white text-indigo-800 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Siku Beda Sisi (Unequal)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAngleTypeMode('custom')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        angleTypeMode === 'custom'
                          ? 'bg-white text-amber-800 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Custom Dimensi
                    </button>
                  </div>
                </div>

                {angleTypeMode === 'equal' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Pilih Ukuran Besi Siku Sama Sisi (L A x A x t)
                    </label>
                    <select
                      value={angleEqualIdx}
                      onChange={(e) => setAngleEqualIdx(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                    >
                      {STANDARD_EQUAL_ANGLES.map((a, i) => (
                        <option key={a.name + i} value={i}>
                          {a.name} &bull; {a.weightKgM.toFixed(2)} kg/m &bull; ({a.dimensions})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {angleTypeMode === 'unequal' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Pilih Ukuran Besi Siku Tidak Sama Sisi / Beda Sisi (L A x B x t)
                    </label>
                    <select
                      value={angleUnequalIdx}
                      onChange={(e) => setAngleUnequalIdx(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                    >
                      {STANDARD_UNEQUAL_ANGLES.map((a, i) => (
                        <option key={a.name + i} value={i}>
                          {a.name} &bull; {a.weightKgM.toFixed(2)} kg/m &bull; ({a.dimensions})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {angleTypeMode === 'custom' && (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Sayap A (mm)
                      </label>
                      <input
                        type="number"
                        value={angleCustomLegA}
                        onChange={(e) => setAngleCustomLegA(e.target.value)}
                        placeholder="75"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Sayap B (mm)
                      </label>
                      <input
                        type="number"
                        value={angleCustomLegB}
                        onChange={(e) => setAngleCustomLegB(e.target.value)}
                        placeholder="50"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tebal t (mm)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={angleCustomThick}
                        onChange={(e) => setAngleCustomThick(e.target.value)}
                        placeholder="6"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang per Batang (mm)
                    </label>
                    <input
                      type="number"
                      step="100"
                      value={angleLengthStr}
                      onChange={(e) => setAngleLengthStr(e.target.value)}
                      placeholder="6000"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Batang (Qty)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={angleQtyStr}
                      onChange={(e) => setAngleQtyStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- FLAT BAR (PLAT STRIP) --- */}
            {selectedCat === 'flatbar' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Pilih Flat Bar / Plat Strip (Face Plate &amp; Fender)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ukuran Strip (Lebar x Tebal)
                    </label>
                    <select
                      value={flatIdx}
                      onChange={(e) => setFlatIdx(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      {STANDARD_FLATBARS.map((f, i) => (
                        <option key={f.size} value={i}>
                          {f.name} &bull; {f.weightKgM} kg/m &bull; ({f.dimensions})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={flatLengthStr}
                      onChange={(e) => setFlatLengthStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Batang (Qty)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={flatQtyStr}
                      onChange={(e) => setFlatQtyStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-[11px] text-slate-500">
                      Umum digunakan untuk fender baja, penumpu tangga, &amp; face plate carling.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* --- ROUND BAR (BESI AS) --- */}
            {selectedCat === 'roundbar' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Pilih Round Bar / Besi As (Shaft &amp; Pin)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Diameter As &amp; Berat per Meter
                    </label>
                    <select
                      value={roundIdx}
                      onChange={(e) => setRoundIdx(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      {STANDARD_ROUNDBARS.map((r, i) => (
                        <option key={r.size} value={i}>
                          {r.name} &bull; {r.weightKgM} kg/m &bull; ({r.dimensions})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={roundLengthStr}
                      onChange={(e) => setRoundLengthStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Batang (Qty)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={roundQtyStr}
                      onChange={(e) => setRoundQtyStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-[11px] text-slate-500">
                      Rumus: 0.006165 &times; Dia(mm)&sup2; &times; Panjang(m)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* --- SQUARE BAR (NAKO) --- */}
            {selectedCat === 'squarebar' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Pilih Square Bar / Besi Nako (Kotak Padat)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ukuran Sisi &amp; Berat per Meter
                    </label>
                    <select
                      value={squareIdx}
                      onChange={(e) => setSquareIdx(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      {STANDARD_SQUAREBARS.map((s, i) => (
                        <option key={s.size} value={i}>
                          {s.name} &bull; {s.weightKgM} kg/m &bull; ({s.dimensions})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={squareLengthStr}
                      onChange={(e) => setSquareLengthStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Batang (Qty)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={squareQtyStr}
                      onChange={(e) => setSquareQtyStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-[11px] text-slate-500">
                      Rumus: Sisi(mm)&sup2; &times; 0.00785 &times; Panjang(m)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* --- GRATING PLATE --- */}
            {selectedCat === 'grating' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Pilih Grating Plate (Lantai Kamar Mesin &amp; Walkway)
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Spesifikasi Bearing Bar &amp; Berat per m&sup2;
                  </label>
                  <select
                    value={gratingIdx}
                    onChange={(e) => setGratingIdx(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {STANDARD_GRATINGS.map((g, i) => (
                      <option key={g.size} value={i}>
                        {g.name} &bull; {g.weightKgM2} kg/m&sup2; &bull; ({g.description})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={gratingLengthStr}
                      onChange={(e) => setGratingLengthStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Lebar (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={gratingWidthStr}
                      onChange={(e) => setGratingWidthStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Lembar
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={gratingQtyStr}
                      onChange={(e) => setGratingQtyStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- PLAT BORDES (CHEQUERED PLATE) --- */}
            {selectedCat === 'bordes' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Pilih Plat Bordes / Kembang Geladak (Chequered Deck Plate)
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Ketebalan Bordes &amp; Berat per m&sup2; (Termasuk Kembang)
                  </label>
                  <select
                    value={bordesIdx}
                    onChange={(e) => setBordesIdx(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {STANDARD_BORDES.map((b, i) => (
                      <option key={b.thicknessMm} value={i}>
                        {b.name} &bull; {b.weightKgM2} kg/m&sup2; &bull; ({b.description})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={bordesLengthStr}
                      onChange={(e) => setBordesLengthStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Lebar (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={bordesWidthStr}
                      onChange={(e) => setBordesWidthStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Lembar
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={bordesQtyStr}
                      onChange={(e) => setBordesQtyStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- CHANNEL (UNP) --- */}
            {selectedCat === 'channel' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Pilih Kanal U (UNP Channel Bar)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Profil UNP Standar &amp; Berat per Meter
                    </label>
                    <select
                      value={channelIdx}
                      onChange={(e) => setChannelIdx(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      {STANDARD_CHANNELS.map((c, i) => (
                        <option key={c.size} value={i}>
                          {c.name} &bull; {c.weightKgM} kg/m &bull; ({c.dimensions})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={channelLengthStr}
                      onChange={(e) => setChannelLengthStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Batang (Qty)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={channelQtyStr}
                      onChange={(e) => setChannelQtyStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-[11px] text-slate-500">
                      Biasa dipakai untuk galar / transverse beam, penopang crane &amp; winch.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* --- PELAT BAJA BIASA (STEEL PLATE) --- */}
            {selectedCat === 'plate' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Kalkulator Dimensi Pelat Baja Lambung &amp; Geladak
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={plateLengthStr}
                      onChange={(e) => setPlateLengthStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Lebar (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={plateWidthStr}
                      onChange={(e) => setPlateWidthStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tebal (mm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={plateThickStr}
                      onChange={(e) => setPlateThickStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* 3 Opsi Grade Pelat Baja: ABS, BKI, NC */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Grade Pelat Baja (3 Opsi: ABS, BKI, NC)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Density Standar: 7.85 kg/dm³
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {STEEL_PLATE_GRADES.map((g) => {
                      const isSelected = plateGrade === g.grade;
                      return (
                        <button
                          key={g.grade}
                          type="button"
                          onClick={() => setPlateGrade(g.grade)}
                          className={`p-2.5 rounded-xl text-left border transition-all ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                              {g.name}
                            </span>
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                g.grade === 'ABS'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : g.grade === 'BKI'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              {g.code}
                            </span>
                          </div>
                          <div className="text-[10px] font-semibold text-emerald-700 mt-1">
                            Rp {g.unitPrice.toLocaleString('id-ID')}/kg
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                            {g.grade === 'ABS'
                              ? 'Marine Class IACS'
                              : g.grade === 'BKI'
                              ? 'Standar Klas BKI'
                              : 'Non-Class Umum'}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jumlah Pelat (Qty)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={plateQtyStr}
                      onChange={(e) => setPlateQtyStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Calculation Output Card */}
          <div className="bg-amber-50/80 rounded-xl border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-950">{resultToApply.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-[10px] font-bold">
                    {resultToApply.typeCode}
                  </span>
                </div>
                <div className="text-[11px] text-amber-800 font-mono mt-0.5">
                  {formulaInfo}
                </div>
                <div className="text-[10px] text-amber-700 mt-1">
                  Unit Weight: <strong>{unitWeightLabel}</strong> &bull; Estimasi Biaya:{' '}
                  <strong>{TonnageCalculator.formatRupiah(calculatedWeight * (resultToApply.unitPrice || 48000))}</strong>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-lg font-black text-amber-950 block">
                {TonnageCalculator.formatWeight(calculatedWeight)}
              </span>
              <span className="text-[10px] font-medium text-amber-800">
                Total Tonase Material
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="text-xs text-slate-500 truncate max-w-md">
            Otomatis mengisi Type, D1, D2, D3, D4, dan Tonase ke form item.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Gunakan Spesifikasi Ini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
