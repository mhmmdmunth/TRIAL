import ExcelJS from 'exceljs';
import {
  ProjectMaterialEstimate,
  MaterialClassification,
  MaterialProcurementStatus,
  MaterialEstimateSummary,
  WorkItem,
  VesselSpec,
  ProjectSchedule,
  WorkCategory,
} from '../types';

export type { ProjectMaterialEstimate };
import { TonnageCalculator } from '../utils/tonnageCalculator';

const MATERIAL_STORAGE_PREFIX = 'shipyard_material_estimates_v1_';

export interface ClassificationMeta {
  id: MaterialClassification;
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  iconName: string;
  description: string;
  defaultUnit: string;
}

export const MATERIAL_CLASSIFICATIONS: ClassificationMeta[] = [
  {
    id: 'steel_structure',
    label: 'Pelat Baja & Profil Konstruksi',
    shortLabel: 'Baja & Profil',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    badgeText: 'text-blue-800',
    iconName: 'Layers',
    description: 'Pelat lambung BKI/ABS, siku L, UNP, flat bar, round bar, bordes & grating',
    defaultUnit: 'kg',
  },
  {
    id: 'piping_fittings',
    label: 'Pipa Baja, Flange & Katup',
    shortLabel: 'Pipa & Katup',
    badgeBg: 'bg-cyan-50',
    badgeBorder: 'border-cyan-200',
    badgeText: 'text-cyan-800',
    iconName: 'Pipette',
    description: 'Pipa seamless ASTM A53 Sch 40/80, flange JIS/ANSI, elbow, tee & butterfly/globe valve',
    defaultUnit: 'btg',
  },
  {
    id: 'coating_blasting',
    label: 'Cat Marine & Sandblasting',
    shortLabel: 'Cat & Blasting',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-800',
    iconName: 'Paintbrush',
    description: 'Epoxy primer, tie coat, antifouling, polyurethane finish, thinner & copper slag grit',
    defaultUnit: 'pail',
  },
  {
    id: 'anodes_cathodic',
    label: 'Anoda Seng (Katodik Proteksi)',
    shortLabel: 'Zinc Anode',
    badgeBg: 'bg-teal-50',
    badgeBorder: 'border-teal-200',
    badgeText: 'text-teal-800',
    iconName: 'Shield',
    description: 'Zinc sacrificial anode lambung, sea chest, rudder, propeller shaft & box cooler',
    defaultUnit: 'pcs',
  },
  {
    id: 'welding_consumable',
    label: 'Consumable Las & Pemotongan',
    shortLabel: 'Kawat Las & Gas',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-800',
    iconName: 'Flame',
    description: 'Kawat las LB-52/E7018, kawat las stainless, tabung oksigen, tabung LPG & batu gerinda',
    defaultUnit: 'kg',
  },
  {
    id: 'mechanical_propulsion',
    label: 'Mekanikal, Poros & Kemudi',
    shortLabel: 'Mekanikal',
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
    badgeText: 'text-indigo-800',
    iconName: 'Cog',
    description: 'Bushing thordon/karet, packing gland stern tube, O-ring, mechanical seal & baut kopling',
    defaultUnit: 'set',
  },
  {
    id: 'outfitting_hardware',
    label: 'Outfitting & Alat Apung',
    shortLabel: 'Outfitting',
    badgeBg: 'bg-violet-50',
    badgeBorder: 'border-violet-200',
    badgeText: 'text-violet-800',
    iconName: 'Anchor',
    description: 'Manhole rubber gasket, bollard, fairlead, rantai jangkar, shackle & turnbuckle',
    defaultUnit: 'pcs',
  },
  {
    id: 'electrical_nav',
    label: 'Kabel & Elektrikal Kapal',
    shortLabel: 'Elektrikal',
    badgeBg: 'bg-yellow-50',
    badgeBorder: 'border-yellow-300',
    badgeText: 'text-yellow-900',
    iconName: 'Zap',
    description: 'Marine cable tinned copper, circuit breaker, flood light IP67, terminal lug & saklar',
    defaultUnit: 'meter',
  },
  {
    id: 'timber_carpentry',
    label: 'Kayu & Akomodasi Interior',
    shortLabel: 'Kayu & Interior',
    badgeBg: 'bg-stone-50',
    badgeBorder: 'border-stone-200',
    badgeText: 'text-stone-800',
    iconName: 'TreePine',
    description: 'Kayu balok ganjal keel block, triplek marine tebal, peredam rockwool & panel interior',
    defaultUnit: 'lbr',
  },
  {
    id: 'general_others',
    label: 'Material Umum & Perlengkapan Lain',
    shortLabel: 'Lain-lain',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-300',
    badgeText: 'text-slate-800',
    iconName: 'Package',
    description: 'Baut mur galvanis/SS316, lem perapat silicon, majun, solar test & perlengkapan umum',
    defaultUnit: 'ls',
  },
];

export const MATERIAL_PROCUREMENT_STATUSES: Array<{
  id: MaterialProcurementStatus;
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
}> = [
  {
    id: 'Estimasi',
    label: 'Estimasi / Draft',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-300',
    badgeText: 'text-slate-700',
    dotColor: 'bg-slate-400',
  },
  {
    id: 'Diusulkan',
    label: 'Diusulkan ke PPC',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-300',
    badgeText: 'text-amber-800',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'Disetujui Pimpro',
    label: 'Disetujui Pimpro',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-300',
    badgeText: 'text-blue-800',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'PO Issued',
    label: 'PO Diterbitkan (Procurement)',
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-300',
    badgeText: 'text-purple-800',
    dotColor: 'bg-purple-500',
  },
  {
    id: 'Tersedia di Yard',
    label: 'Tersedia di Gudang Yard',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-300',
    badgeText: 'text-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'Sebagian Terpakai',
    label: 'Sebagian Terpakai',
    badgeBg: 'bg-sky-50',
    badgeBorder: 'border-sky-300',
    badgeText: 'text-sky-800',
    dotColor: 'bg-sky-500',
  },
  {
    id: 'Selesai Terpasang',
    label: 'Selesai Terpasang di Kapal',
    badgeBg: 'bg-teal-50',
    badgeBorder: 'border-teal-300',
    badgeText: 'text-teal-900',
    dotColor: 'bg-teal-600',
  },
];

export function calculateMaterialItemCost(
  item: Partial<ProjectMaterialEstimate>
): { totalQtyWithBuffer: number; totalCost: number } {
  const req = Number(item.qtyRequired) || 0;
  const buffer = Number(item.qtyBufferPercent) || 0;
  const totalQtyWithBuffer = Math.round((req * (1 + buffer / 100)) * 100) / 100;
  const price = Number(item.unitPrice) || 0;

  let totalCost = 0;
  if (item.priceBasis === 'weight' && item.calculatedWeightKg && item.calculatedWeightKg > 0) {
    totalCost = Math.round(item.calculatedWeightKg * price * (1 + buffer / 100));
  } else {
    totalCost = Math.round(totalQtyWithBuffer * price);
  }

  return { totalQtyWithBuffer, totalCost };
}

export function calculateMaterialSummary(
  items: ProjectMaterialEstimate[]
): MaterialEstimateSummary {
  let totalEstimatedCost = 0;
  let totalSteelWeightKg = 0;
  let totalPaintLiters = 0;
  let totalAbrasiveTons = 0;
  let totalPipeMeters = 0;
  let totalAnodesCount = 0;
  const linkedWorkItemIds = new Set<string>();

  const costByClassification: Record<MaterialClassification, number> = {
    steel_structure: 0,
    piping_fittings: 0,
    coating_blasting: 0,
    anodes_cathodic: 0,
    mechanical_propulsion: 0,
    electrical_nav: 0,
    welding_consumable: 0,
    outfitting_hardware: 0,
    timber_carpentry: 0,
    general_others: 0,
  };

  const countByClassification: Record<MaterialClassification, number> = {
    steel_structure: 0,
    piping_fittings: 0,
    coating_blasting: 0,
    anodes_cathodic: 0,
    mechanical_propulsion: 0,
    electrical_nav: 0,
    welding_consumable: 0,
    outfitting_hardware: 0,
    timber_carpentry: 0,
    general_others: 0,
  };

  const statusCounts: Record<MaterialProcurementStatus, number> = {
    Estimasi: 0,
    Diusulkan: 0,
    'Disetujui Pimpro': 0,
    'PO Issued': 0,
    'Tersedia di Yard': 0,
    'Sebagian Terpakai': 0,
    'Selesai Terpasang': 0,
  };

  items.forEach((item) => {
    const cost = item.totalCost || calculateMaterialItemCost(item).totalCost;
    totalEstimatedCost += cost;

    if (item.workItemId) {
      linkedWorkItemIds.add(item.workItemId);
    }

    if (item.classification && costByClassification[item.classification] !== undefined) {
      costByClassification[item.classification] += cost;
      countByClassification[item.classification] += 1;
    }

    if (item.procurementStatus && statusCounts[item.procurementStatus] !== undefined) {
      statusCounts[item.procurementStatus] += 1;
    }

    // Specific metric extractions
    if (item.classification === 'steel_structure') {
      if (item.calculatedWeightKg && item.calculatedWeightKg > 0) {
        totalSteelWeightKg += Number(item.calculatedWeightKg);
      } else if (item.unit?.toLowerCase() === 'kg') {
        totalSteelWeightKg += Number(item.totalQtyWithBuffer || item.qtyRequired);
      }
    }

    if (item.classification === 'coating_blasting') {
      const nameLower = (item.materialName || '').toLowerCase();
      if (nameLower.includes('cat') || nameLower.includes('paint') || nameLower.includes('primer') || nameLower.includes('antifouling')) {
        const qty = Number(item.totalQtyWithBuffer || item.qtyRequired) || 0;
        if (item.unit?.toLowerCase() === 'pail') {
          totalPaintLiters += qty * 20; // 1 Pail = 20 Ltr standard
        } else if (item.unit?.toLowerCase() === 'liter' || item.unit?.toLowerCase() === 'ltr') {
          totalPaintLiters += qty;
        }
      }
      if (nameLower.includes('slag') || nameLower.includes('pasir') || nameLower.includes('grit') || nameLower.includes('abrasive')) {
        const qty = Number(item.totalQtyWithBuffer || item.qtyRequired) || 0;
        if (item.unit?.toLowerCase() === 'ton') {
          totalAbrasiveTons += qty;
        } else if (item.unit?.toLowerCase() === 'kg') {
          totalAbrasiveTons += qty / 1000;
        }
      }
    }

    if (item.classification === 'piping_fittings') {
      const nameLower = (item.materialName || '').toLowerCase();
      if (nameLower.includes('pipa') || nameLower.includes('pipe')) {
        const qty = Number(item.totalQtyWithBuffer || item.qtyRequired) || 0;
        if (item.unit?.toLowerCase() === 'meter' || item.unit?.toLowerCase() === 'm') {
          totalPipeMeters += qty;
        } else if (item.unit?.toLowerCase() === 'btg' || item.unit?.toLowerCase() === 'batang') {
          totalPipeMeters += qty * 6; // Standard 6m length per bar
        }
      }
    }

    if (item.classification === 'anodes_cathodic') {
      totalAnodesCount += Number(item.totalQtyWithBuffer || item.qtyRequired) || 0;
    }
  });

  return {
    totalEstimatedCost,
    totalSteelWeightKg: Math.round(totalSteelWeightKg * 100) / 100,
    totalSteelWeightTons: Math.round((totalSteelWeightKg / 1000) * 100) / 100,
    totalPaintLiters: Math.round(totalPaintLiters),
    totalAbrasiveTons: Math.round(totalAbrasiveTons * 10) / 10,
    totalPipeMeters: Math.round(totalPipeMeters),
    totalAnodesCount: Math.round(totalAnodesCount),
    totalItemsCount: items.length,
    linkedWorkItemsCount: linkedWorkItemIds.size,
    costByClassification,
    countByClassification,
    statusCounts,
  };
}

export const materialEstimationService = {
  getMaterialEstimates(projectId: string): ProjectMaterialEstimate[] {
    if (!projectId) return [];
    try {
      const raw = localStorage.getItem(`${MATERIAL_STORAGE_PREFIX}${projectId}`);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load project material estimates from storage:', e);
    }
    return [];
  },

  saveMaterialEstimates(projectId: string, items: ProjectMaterialEstimate[]): void {
    if (!projectId) return;
    try {
      localStorage.setItem(`${MATERIAL_STORAGE_PREFIX}${projectId}`, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save project material estimates to storage:', e);
    }
  },

  addMaterialEstimate(
    projectId: string,
    item: Omit<ProjectMaterialEstimate, 'id' | 'projectId' | 'totalCost' | 'totalQtyWithBuffer' | 'createdAt' | 'updatedAt'>
  ): ProjectMaterialEstimate {
    const items = this.getMaterialEstimates(projectId);
    const { totalQtyWithBuffer, totalCost } = calculateMaterialItemCost(item);
    const now = new Date().toISOString();
    const newItem: ProjectMaterialEstimate = {
      ...item,
      id: `mat-est-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      totalQtyWithBuffer,
      totalCost,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newItem, ...items];
    this.saveMaterialEstimates(projectId, updated);
    return newItem;
  },

  updateMaterialEstimate(projectId: string, item: ProjectMaterialEstimate): void {
    const items = this.getMaterialEstimates(projectId);
    const { totalQtyWithBuffer, totalCost } = calculateMaterialItemCost(item);
    const updated = items.map((i) =>
      i.id === item.id
        ? {
            ...item,
            totalQtyWithBuffer,
            totalCost,
            updatedAt: new Date().toISOString(),
          }
        : i
    );
    this.saveMaterialEstimates(projectId, updated);
  },

  deleteMaterialEstimate(projectId: string, id: string): void {
    const items = this.getMaterialEstimates(projectId);
    const updated = items.filter((i) => i.id !== id);
    this.saveMaterialEstimates(projectId, updated);
  },

  deleteMaterialEstimatesBatch(projectId: string, ids: string[]): void {
    const idSet = new Set(ids);
    const items = this.getMaterialEstimates(projectId);
    const updated = items.filter((i) => !idSet.has(i.id));
    this.saveMaterialEstimates(projectId, updated);
  },

  clearAllMaterialEstimates(projectId: string): void {
    this.saveMaterialEstimates(projectId, []);
  },

  /**
   * Intelligently parses the project's repair list (WorkItems)
   * and generates accurate, detailed Shipyard Material Estimates (BOM / Material Take-Off)
   * directly linked to each repair item!
   */
  generateFromRepairList(
    projectId: string,
    workItems: WorkItem[],
    categories: WorkCategory[],
    mode: 'replace' | 'append' = 'replace'
  ): ProjectMaterialEstimate[] {
    const now = new Date().toISOString();
    const newEstimates: ProjectMaterialEstimate[] = [];
    const catMap = new Map(categories.map((c) => [c.id, c]));

    let counter = 1;
    const generateCode = (prefix: string) => {
      const code = `${prefix}-${String(counter).padStart(3, '0')}`;
      counter++;
      return code;
    };

    // Filter non-header work items that have a description
    const validItems = workItems.filter(
      (w) => !w.isAreaHeader && w.description?.trim()
    );

    validItems.forEach((item) => {
      const catObj = catMap.get(item.categoryId);
      const catCode = (catObj?.code || item.categoryId || '').toUpperCase();
      const descLower = (item.description || '').toLowerCase();
      const typeUpper = (item.type || '').toUpperCase();
      const unitLower = (item.unit || '').toLowerCase();
      const notesLower = (item.notes || '').toLowerCase();

      // -------------------------------------------------------------
      // 1. STEELWORK REPLATING & PLATES (Cat VII, VI, or Steel Keywords)
      // -------------------------------------------------------------
      if (
        catCode === 'VII' ||
        catCode === 'VI' ||
        typeUpper.startsWith('PL') ||
        typeUpper === 'FB' ||
        typeUpper === 'UA' ||
        descLower.includes('replating') ||
        descLower.includes('pelat') ||
        descLower.includes('plate') ||
        descLower.includes('gading') ||
        descLower.includes('stiffener')
      ) {
        const wtKg = Number(item.weightKg) || (unitLower === 'kg' ? Number(item.qty) || 0 : 0);
        const thickMm = parseFloat(item.d3 || item.d2 || '10') || 10;
        const lengthMm = parseFloat(item.d1 || '1500') || 1500;
        const widthMm = parseFloat(item.d2 || '6000') || 6000;

        let grade = 'BKI Grade A';
        let unitPricePerKg = 22500;

        if (typeUpper.includes('ABS') || descLower.includes('abs')) {
          grade = 'ABS Marine Grade';
          unitPricePerKg = 24500;
        } else if (typeUpper.includes('NC') || descLower.includes('nc') || descLower.includes('non class')) {
          grade = 'Non-Class Commercial';
          unitPricePerKg = 19500;
        }

        const standardSheetWeightKg = Math.round(1.5 * 6.0 * thickMm * 7.85);
        const estWeight = wtKg > 0 ? wtKg : Math.max(350, standardSheetWeightKg);
        const sheetsNeeded = Math.max(1, Math.ceil(estWeight / standardSheetWeightKg));
        const electrodeKg = Math.max(10, Math.round(estWeight * 0.022));
        const oxyCylinders = Math.max(1, Math.ceil(estWeight / 450));

        const plateCost = Math.round(estWeight * 1.07 * unitPricePerKg);
        const weldingCost = Math.round(electrodeKg * 1.05 * 52000);
        const gasCost = oxyCylinders * 125000;
        const totalAccumulatedCost = plateCost + weldingCost + gasCost;

        newEstimates.push({
          id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          projectId,
          workItemId: item.id,
          workItemNo: item.itemNo,
          workItemDescription: item.description,
          categoryId: item.categoryId,
          categoryCode: catCode,
          categoryName: catObj?.name || 'Steelwork',
          materialCode: generateCode('MAT-ST'),
          materialName: `Pelat Baja Lambung ${grade} t=${thickMm}mm (${sheetsNeeded} Lbr / ${estWeight} kg)`,
          classification: 'steel_structure',
          specification: `Ukuran 1500x6000x${thickMm}mm | Inc. Kawat Las LB-52 (${electrodeKg}kg) & Gas Cut (${oxyCylinders} Tabung)`,
          dimension1: String(lengthMm),
          dimension2: String(widthMm),
          dimension3: String(thickMm),
          dimensionLen: '6000',
          density: 7.85,
          calculatedWeightKg: estWeight,
          qtyRequired: sheetsNeeded,
          qtyBufferPercent: 7,
          totalQtyWithBuffer: Math.round(sheetsNeeded * 1.07 * 100) / 100,
          unit: 'lbr',
          unitPrice: Math.round(totalAccumulatedCost / Math.max(1, sheetsNeeded)),
          totalCost: totalAccumulatedCost,
          priceBasis: 'weight',
          brandOrStandard: `Krakatau Steel / ${grade}`,
          supplierName: 'PT. Krakatau Steel / Distributor Baja Surabaya',
          procurementStatus: 'Estimasi',
          leadTimeDays: 7,
          locationOrTarget: item.notes || item.remark || item.description,
          notes: `Akumulasi material & consumable untuk struktur no. ${item.itemNo}`,
          createdAt: now,
          updatedAt: now,
        });
        return;
      }

      // -------------------------------------------------------------
      // 2. BLASTING & PAINTING (Cat III, IV, V or Paint Keywords)
      // -------------------------------------------------------------
      if (
        catCode === 'III' ||
        catCode === 'IV' ||
        catCode === 'V' ||
        descLower.includes('blast') ||
        descLower.includes('cat') ||
        descLower.includes('paint') ||
        descLower.includes('coating') ||
        descLower.includes('antifouling')
      ) {
        const areaM2 = unitLower.includes('m2') || unitLower.includes('m²') ? Number(item.qty) || 150 : 150;
        const isBlasting = descLower.includes('blast') || catCode === 'III';
        const slagTon = isBlasting ? Math.max(1, Math.round((areaM2 * 28) / 1000)) : 0;
        const primerPails = Math.max(1, Math.ceil(areaM2 / 90));
        const isAF = descLower.includes('af') || descLower.includes('antifouling') || descLower.includes('bottom') || descLower.includes('lambung bawah');
        const afPails = isAF ? Math.max(1, Math.ceil(areaM2 / 85)) : 0;

        const slagCost = Math.round(slagTon * 1.05 * 1450000);
        const primerCost = Math.round(primerPails * 1.08 * 3850000);
        const afCost = Math.round(afPails * 1.08 * 4650000);
        const totalAccumulatedCost = slagCost + primerCost + afCost;

        const matTitle = isBlasting
          ? `Paket Blasting (Slag ${slagTon} Ton) & Cat Marine Primer (${primerPails} Pail${afPails ? ` + AF ${afPails} Pail` : ''})`
          : `Cat Marine Epoxy Primer (${primerPails} Pail${afPails ? ` + Antifouling ${afPails} Pail` : ''})`;

        newEstimates.push({
          id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          projectId,
          workItemId: item.id,
          workItemNo: item.itemNo,
          workItemDescription: item.description,
          categoryId: item.categoryId,
          categoryCode: catCode,
          categoryName: catObj?.name || 'Blasting & Painting',
          materialCode: generateCode('MAT-PNT'),
          materialName: matTitle,
          classification: 'coating_blasting',
          specification: `Kebutuhan Luasan Area ${areaM2} m² | Standard Sa 2.5 & Coating High Solid`,
          qtyRequired: areaM2,
          qtyBufferPercent: 5,
          totalQtyWithBuffer: Math.round(areaM2 * 1.05),
          unit: 'm²',
          unitPrice: Math.round(totalAccumulatedCost / Math.max(1, areaM2)),
          totalCost: totalAccumulatedCost,
          priceBasis: 'qty',
          brandOrStandard: 'Jotun / Chugoku / Copper Slag Grit',
          supplierName: 'Distributor Resmi Jotun Marine Surabaya',
          procurementStatus: 'Estimasi',
          leadTimeDays: 4,
          locationOrTarget: item.notes || item.description,
          notes: `Akumulasi material blasting & cat untuk item ${item.itemNo}`,
          createdAt: now,
          updatedAt: now,
        });
        return;
      }

      // -------------------------------------------------------------
      // 3. PIPING WORK (Cat VIII or Pipe Keywords)
      // -------------------------------------------------------------
      if (
        catCode === 'VIII' ||
        typeUpper.startsWith('PP') ||
        descLower.includes('pipa') ||
        descLower.includes('pipe') ||
        descLower.includes('sounding') ||
        descLower.includes('air vent')
      ) {
        const pipeQty = Number(item.qty) || 6;
        const pipeSize = item.d1 ? `${item.d1}"` : '2"';
        const isMeters = unitLower === 'meter' || unitLower === 'm' || unitLower === 'mtr';
        const barsNeeded = isMeters ? Math.max(1, Math.ceil(pipeQty / 6)) : Math.max(1, Math.round(pipeQty));
        const flangeCount = Math.max(2, barsNeeded * 2);

        const pipeCost = Math.round(barsNeeded * 1.1 * 1250000);
        const flangeCost = Math.round(flangeCount * 1.05 * 185000);
        const totalAccumulatedCost = pipeCost + flangeCost;

        newEstimates.push({
          id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          projectId,
          workItemId: item.id,
          workItemNo: item.itemNo,
          workItemDescription: item.description,
          categoryId: item.categoryId,
          categoryCode: catCode,
          categoryName: catObj?.name || 'Piping work',
          materialCode: generateCode('MAT-PIP'),
          materialName: `Pipa Seamless CS ASTM A53 ${pipeSize} Sch 40 (${barsNeeded} Btg) & Flange JIS 10K (${flangeCount} Set)`,
          classification: 'piping_fittings',
          specification: `Pipa Black Steel Seamless 6.0m/btg, Flange JIS 10K, Neoprene Gasket & Stud Bolts`,
          qtyRequired: barsNeeded,
          qtyBufferPercent: 10,
          totalQtyWithBuffer: Math.round(barsNeeded * 1.1),
          unit: 'btg',
          unitPrice: Math.round(totalAccumulatedCost / Math.max(1, barsNeeded)),
          totalCost: totalAccumulatedCost,
          priceBasis: 'qty',
          brandOrStandard: 'ASTM A53 Gr. B / API 5L',
          supplierName: 'Distributor Pipa Baja Surabaya',
          procurementStatus: 'Estimasi',
          leadTimeDays: 5,
          locationOrTarget: item.notes || item.description,
          notes: `Akumulasi pipa & perlengkapan flange untuk item ${item.itemNo}`,
          createdAt: now,
          updatedAt: now,
        });
        return;
      }

      // -------------------------------------------------------------
      // 4. ZINC ANODES & CORROSION PROTECTION
      // -------------------------------------------------------------
      if (
        descLower.includes('anoda') ||
        descLower.includes('anode') ||
        descLower.includes('zinc') ||
        typeUpper.includes('ANODE')
      ) {
        const count = Number(item.qty) || 12;
        newEstimates.push({
          id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          projectId,
          workItemId: item.id,
          workItemNo: item.itemNo,
          workItemDescription: item.description,
          categoryId: item.categoryId,
          categoryCode: catCode,
          categoryName: catObj?.name || 'Outfitting',
          materialCode: generateCode('MAT-AND'),
          materialName: 'Zinc Anode Paduan Murni Tipe Z-4 (~10 Kg / Pcs)',
          classification: 'anodes_cathodic',
          specification: 'Paduan Seng US Mil-Spec A-18001K Termasuk Plat Insert Baja Las',
          qtyRequired: count,
          qtyBufferPercent: 0,
          totalQtyWithBuffer: count,
          unit: 'pcs',
          unitPrice: 650000,
          totalCost: count * 650000,
          priceBasis: 'qty',
          brandOrStandard: 'Korosi Guard US Mil-Spec',
          supplierName: 'Pabrik Anoda Proteksi Surabaya',
          procurementStatus: 'Estimasi',
          leadTimeDays: 4,
          locationOrTarget: item.notes || item.description,
          notes: `Akumulasi anoda katodik untuk item ${item.itemNo}`,
          createdAt: now,
          updatedAt: now,
        });
        return;
      }

      // -------------------------------------------------------------
      // 5. MECHANICAL & VALVES
      // -------------------------------------------------------------
      if (
        catCode === 'IX' ||
        descLower.includes('katup') ||
        descLower.includes('valve') ||
        descLower.includes('propeller') ||
        descLower.includes('kemudi') ||
        descLower.includes('rudder') ||
        descLower.includes('sea chest')
      ) {
        const valveQty = Number(item.qty) || 2;
        const totalCost = Math.max(1, valveQty) * 450000;
        newEstimates.push({
          id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          projectId,
          workItemId: item.id,
          workItemNo: item.itemNo,
          workItemDescription: item.description,
          categoryId: item.categoryId,
          categoryCode: catCode,
          categoryName: catObj?.name || 'Mechanical Work',
          materialCode: generateCode('MAT-MEC'),
          materialName: `Material Overhaul Seal & Gland Packing PTFE / Klingersil Sheet (${item.description})`,
          classification: 'mechanical_propulsion',
          specification: 'High Pressure Non-Asbestos Gasket Sheet Klingersil C-4400 3mm & PTFE Packing 1/2"',
          qtyRequired: Math.max(1, valveQty),
          qtyBufferPercent: 10,
          totalQtyWithBuffer: Math.round(Math.max(1, valveQty) * 1.1),
          unit: 'set',
          unitPrice: Math.round(totalCost / Math.max(1, valveQty)),
          totalCost,
          priceBasis: 'qty',
          brandOrStandard: 'Klinger / Chesterton Marine',
          supplierName: 'Distributor Seal & Gasket Maritim',
          procurementStatus: 'Estimasi',
          leadTimeDays: 2,
          locationOrTarget: item.description,
          notes: `Material mekanikal overhaul untuk item ${item.itemNo}`,
          createdAt: now,
          updatedAt: now,
        });
        return;
      }

      // -------------------------------------------------------------
      // 6. ELECTRICAL
      // -------------------------------------------------------------
      if (
        catCode === 'X' ||
        descLower.includes('listrik') ||
        descLower.includes('kabel') ||
        descLower.includes('cable') ||
        descLower.includes('lampu') ||
        descLower.includes('genset')
      ) {
        const lengthMtr = Number(item.qty) || 50;
        const totalCost = Math.round(lengthMtr * 1.1 * 75000);
        newEstimates.push({
          id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          projectId,
          workItemId: item.id,
          workItemNo: item.itemNo,
          workItemDescription: item.description,
          categoryId: item.categoryId,
          categoryCode: catCode,
          categoryName: catObj?.name || 'Electrical',
          materialCode: generateCode('MAT-ELC'),
          materialName: `Kabel Marine Flame Retardant 0.6/1kV DPYC-2.5 (${lengthMtr} Meter)`,
          classification: 'electrical_nav',
          specification: 'Tinned Copper Marine Cable Sertifikasi BKI (JIS C 3410)',
          qtyRequired: lengthMtr,
          qtyBufferPercent: 10,
          totalQtyWithBuffer: Math.round(lengthMtr * 1.1),
          unit: 'meter',
          unitPrice: 75000,
          totalCost,
          priceBasis: 'qty',
          brandOrStandard: 'Kukdong / Fujikura Marine Cable',
          supplierName: 'Distributor Kabel Kapal Surabaya',
          procurementStatus: 'Estimasi',
          leadTimeDays: 4,
          locationOrTarget: item.description,
          createdAt: now,
          updatedAt: now,
        });
        return;
      }

      // -------------------------------------------------------------
      // 7. TANK CLEANING & GAS FREEING
      // -------------------------------------------------------------
      if (
        catCode === 'XI' ||
        descLower.includes('cuci') ||
        descLower.includes('clean') ||
        descLower.includes('tangki') ||
        descLower.includes('gas free') ||
        descLower.includes('sludge')
      ) {
        newEstimates.push({
          id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          projectId,
          workItemId: item.id,
          workItemNo: item.itemNo,
          workItemDescription: item.description,
          categoryId: item.categoryId,
          categoryCode: catCode,
          categoryName: catObj?.name || 'Tank Cleaning',
          materialCode: generateCode('MAT-CLN'),
          materialName: `Cairan Degreaser / Chemical Tank Cleaner Heavy Duty (2 Pail @ 20L)`,
          classification: 'general_others',
          specification: 'Marine Biodegradable Chemical Cleaner & Oil Spill Dispersant',
          qtyRequired: 2,
          qtyBufferPercent: 0,
          totalQtyWithBuffer: 2,
          unit: 'pail',
          unitPrice: 1250000,
          totalCost: 2500000,
          priceBasis: 'qty',
          brandOrStandard: 'Unitor / Drew Marine',
          supplierName: 'Supplier Bahan Kimia Kapal Surabaya',
          procurementStatus: 'Estimasi',
          leadTimeDays: 2,
          locationOrTarget: item.description,
          createdAt: now,
          updatedAt: now,
        });
        return;
      }

      // -------------------------------------------------------------
      // 8. OUTFITTING & HULL FITTINGS
      // -------------------------------------------------------------
      if (
        catCode === 'VI' ||
        descLower.includes('pintu') ||
        descLower.includes('door') ||
        descLower.includes('manhole') ||
        descLower.includes('hatch') ||
        descLower.includes('jendela') ||
        descLower.includes('outfitting')
      ) {
        newEstimates.push({
          id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          projectId,
          workItemId: item.id,
          workItemNo: item.itemNo,
          workItemDescription: item.description,
          categoryId: item.categoryId,
          categoryCode: catCode,
          categoryName: catObj?.name || 'Outfitting',
          materialCode: generateCode('MAT-OUTF'),
          materialName: `Karet Gasket Neoprene Kedap Air & Hardware Outfitting (${item.description})`,
          classification: 'outfitting_hardware',
          specification: 'High Density Marine Rubber Seal 10mm x 50mm & Fasteners Galvanis',
          qtyRequired: 10,
          qtyBufferPercent: 10,
          totalQtyWithBuffer: 11,
          unit: 'meter',
          unitPrice: 120000,
          totalCost: 1320000,
          priceBasis: 'qty',
          brandOrStandard: 'Marine Rubber Seal Grade A',
          supplierName: 'Distributor Karet Industri',
          procurementStatus: 'Estimasi',
          leadTimeDays: 3,
          locationOrTarget: item.description,
          createdAt: now,
          updatedAt: now,
        });
        return;
      }

      // -------------------------------------------------------------
      // 9. GENERAL HARDWARE & CONSUMABLES FALLBACK (1 Row per item)
      // -------------------------------------------------------------
      newEstimates.push({
        id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        projectId,
        workItemId: item.id,
        workItemNo: item.itemNo,
        workItemDescription: item.description,
        categoryId: item.categoryId,
        categoryCode: catCode,
        categoryName: catObj?.name || 'Material Umum',
        materialCode: generateCode('MAT-GEN'),
        materialName: `Consumable & Fasteners Pendukung (${item.description})`,
        classification: 'outfitting_hardware',
        specification: 'Baut Galvanis Grade 8.8, Batu Gerinda Potong 4" Resibon & Perlengkapan Kerja',
        qtyRequired: 1,
        qtyBufferPercent: 0,
        totalQtyWithBuffer: 1,
        unit: 'set',
        unitPrice: 650000,
        totalCost: 650000,
        priceBasis: 'qty',
        brandOrStandard: 'Nippon Resibon / Fastener Standard',
        supplierName: 'Toko Baut & Teknik Surabaya',
        procurementStatus: 'Estimasi',
        leadTimeDays: 2,
        locationOrTarget: item.description,
        notes: `Akumulasi material pendukung untuk item ${item.itemNo}`,
        createdAt: now,
        updatedAt: now,
      });
    });

    // If repair list had very few items or no specific technical items, provide shipyard standard package
    if (newEstimates.length === 0) {
      const fallbackPreset = this.getStandardPresetForProject(projectId);
      if (mode === 'replace') {
        this.saveMaterialEstimates(projectId, fallbackPreset);
        return fallbackPreset;
      } else {
        const existing = this.getMaterialEstimates(projectId);
        const combined = [...existing, ...fallbackPreset];
        this.saveMaterialEstimates(projectId, combined);
        return combined;
      }
    }

    if (mode === 'replace') {
      this.saveMaterialEstimates(projectId, newEstimates);
      return newEstimates;
    } else {
      const existing = this.getMaterialEstimates(projectId);
      const combined = [...newEstimates, ...existing];
      this.saveMaterialEstimates(projectId, combined);
      return combined;
    }
  },

  getStandardPresetForProject(projectId: string): ProjectMaterialEstimate[] {
    const now = new Date().toISOString();
    return [
      {
        id: `mat-pre-1-${projectId}`,
        projectId,
        materialCode: 'MAT-PLT-001',
        materialName: 'Pelat Baja Lambung BKI Grade A (Tebal 10 mm)',
        classification: 'steel_structure',
        specification: 'Ukuran Standard 1500 x 6000 x 10 mm (~707 kg/lbr) Sertifikat Mill BKI',
        categoryCode: 'VII',
        categoryId: 'cat-7',
        categoryName: 'Steelwork',
        dimension1: '1500',
        dimension2: '6000',
        dimension3: '10',
        dimensionLen: '6000',
        density: 7.85,
        calculatedWeightKg: 4242,
        qtyRequired: 6,
        qtyBufferPercent: 5,
        totalQtyWithBuffer: 6.3,
        unit: 'lbr',
        unitPrice: 15900000,
        totalCost: 6.3 * 15900000,
        priceBasis: 'weight',
        brandOrStandard: 'Krakatau Steel / BKI Grade A',
        supplierName: 'PT. Krakatau Steel Tbk',
        procurementStatus: 'Disetujui Pimpro',
        leadTimeDays: 7,
        locationOrTarget: 'Bottom Plate & Bilge Strake Frame 12 - 18',
        notes: 'Alokasi replating plat dasar kamar mesin',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `mat-pre-2-${projectId}`,
        projectId,
        materialCode: 'MAT-PLT-002',
        materialName: 'Pelat Baja Lambung BKI Grade A (Tebal 12 mm)',
        classification: 'steel_structure',
        specification: 'Ukuran Standard 1500 x 6000 x 12 mm (~848 kg/lbr) Sertifikat Mill BKI',
        categoryCode: 'VII',
        categoryId: 'cat-7',
        categoryName: 'Steelwork',
        dimension1: '1500',
        dimension2: '6000',
        dimension3: '12',
        dimensionLen: '6000',
        density: 7.85,
        calculatedWeightKg: 2544,
        qtyRequired: 3,
        qtyBufferPercent: 5,
        totalQtyWithBuffer: 3.15,
        unit: 'lbr',
        unitPrice: 19100000,
        totalCost: 3.15 * 19100000,
        priceBasis: 'weight',
        brandOrStandard: 'Krakatau Steel / BKI Grade A',
        supplierName: 'PT. Krakatau Steel Tbk',
        procurementStatus: 'PO Issued',
        leadTimeDays: 7,
        locationOrTarget: 'Side Shell Stbd Fr. 20 - 32',
        notes: 'Replating plat lambung samping kanan benturan dermaga',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `mat-pre-3-${projectId}`,
        projectId,
        materialCode: 'MAT-WLD-001',
        materialName: 'Kawat Las Kobelco LB-52 (AWS E7018) Dia 3.2mm',
        classification: 'welding_consumable',
        specification: 'Low Hydrogen Heavy Marine Electrode (Kemasan Dus 20 Kg)',
        categoryCode: 'VII',
        categoryId: 'cat-7',
        categoryName: 'Steelwork',
        qtyRequired: 180,
        qtyBufferPercent: 5,
        totalQtyWithBuffer: 189,
        unit: 'kg',
        unitPrice: 52000,
        totalCost: 189 * 52000,
        priceBasis: 'qty',
        brandOrStandard: 'Kobelco LB-52',
        supplierName: 'PT. Kobe Welding Indonesia',
        procurementStatus: 'Tersedia di Yard',
        leadTimeDays: 2,
        locationOrTarget: 'Pengelasan Kampuh Butt & Fillet Lambung',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `mat-pre-4-${projectId}`,
        projectId,
        materialCode: 'MAT-SND-001',
        materialName: 'Pasir Blasting Copper Slag Grit Sa 2.5 (Kemasan Jumbo Bag)',
        classification: 'coating_blasting',
        specification: 'Ukuran Butir 1.5 - 2.5 mm High Productivity (Kadar Garam Nol)',
        categoryCode: 'III',
        categoryId: 'cat-3',
        categoryName: 'Blasting & Painting',
        qtyRequired: 12,
        qtyBufferPercent: 5,
        totalQtyWithBuffer: 12.6,
        unit: 'ton',
        unitPrice: 1450000,
        totalCost: 12.6 * 1450000,
        priceBasis: 'qty',
        brandOrStandard: 'Copper Slag Cilegon',
        supplierName: 'Supplier Pasir Blasting Cilegon',
        procurementStatus: 'PO Issued',
        leadTimeDays: 4,
        locationOrTarget: 'Underwater Hull & Topside Lambung',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `mat-pre-5-${projectId}`,
        projectId,
        materialCode: 'MAT-PNT-001',
        materialName: 'Cat Marine Epoxy Primer Jotamastic 90 (Pail 20 Ltr)',
        classification: 'coating_blasting',
        specification: 'Surface Tolerant Epoxy Primer Dua Komponen Marine High Solid',
        categoryCode: 'IV',
        categoryId: 'cat-4',
        categoryName: 'Supply Paint',
        qtyRequired: 8,
        qtyBufferPercent: 5,
        totalQtyWithBuffer: 8.4,
        unit: 'pail',
        unitPrice: 3850000,
        totalCost: 8.4 * 3850000,
        priceBasis: 'qty',
        brandOrStandard: 'Jotun Jotamastic 90',
        supplierName: 'Distributor Resmi Jotun Marine Surabaya',
        procurementStatus: 'Disetujui Pimpro',
        leadTimeDays: 3,
        locationOrTarget: 'Seluruh Permukaan Pelat Lambung Hasil Blasting',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `mat-pre-6-${projectId}`,
        projectId,
        materialCode: 'MAT-PNT-002',
        materialName: 'Cat Marine Antifouling SeaQuantum Ultra S (Pail 20 Ltr)',
        classification: 'coating_blasting',
        specification: 'Silylated Acrylate Selesai Polishing Antifouling High Performance (36 Bulan)',
        categoryCode: 'IV',
        categoryId: 'cat-4',
        categoryName: 'Supply Paint',
        qtyRequired: 6,
        qtyBufferPercent: 5,
        totalQtyWithBuffer: 6.3,
        unit: 'pail',
        unitPrice: 4800000,
        totalCost: 6.3 * 4800000,
        priceBasis: 'qty',
        brandOrStandard: 'Jotun SeaQuantum',
        supplierName: 'Distributor Resmi Jotun Marine Surabaya',
        procurementStatus: 'Disetujui Pimpro',
        leadTimeDays: 3,
        locationOrTarget: 'Pelat Dasar & Sisi Lambung di Bawah Garis Air (Bottom Shell)',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `mat-pre-7-${projectId}`,
        projectId,
        materialCode: 'MAT-PIP-001',
        materialName: 'Pipa Seamless Carbon Steel ASTM A53 Gr. B 2" Sch 40',
        classification: 'piping_fittings',
        specification: 'Panjang 6.0 Meter / Batang (OD 60.3 mm x WT 3.91 mm)',
        categoryCode: 'VIII',
        categoryId: 'cat-8',
        categoryName: 'Piping work',
        qtyRequired: 10,
        qtyBufferPercent: 10,
        totalQtyWithBuffer: 11,
        unit: 'btg',
        unitPrice: 950000,
        totalCost: 11 * 950000,
        priceBasis: 'qty',
        brandOrStandard: 'ASTM A53 Gr. B',
        supplierName: 'Distributor Pipa Baja Surabaya',
        procurementStatus: 'Tersedia di Yard',
        leadTimeDays: 2,
        locationOrTarget: 'Pipa Sounding & Udara Tanki Air Ballast',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `mat-pre-8-${projectId}`,
        projectId,
        materialCode: 'MAT-AND-001',
        materialName: 'Zinc Anode Paduan Murni Tipe Z-4 (Berat ~10 Kg / Pcs)',
        classification: 'anodes_cathodic',
        specification: 'US Mil-Spec A-18001K Termasuk Plat Insert Baja untuk Dilas ke Lambung',
        categoryCode: 'VI',
        categoryId: 'cat-6',
        categoryName: 'Outfitting',
        qtyRequired: 16,
        qtyBufferPercent: 0,
        totalQtyWithBuffer: 16,
        unit: 'pcs',
        unitPrice: 650000,
        totalCost: 16 * 650000,
        priceBasis: 'qty',
        brandOrStandard: 'Korosi Guard US Mil-Spec',
        supplierName: 'Pabrik Anoda Proteksi Surabaya',
        procurementStatus: 'Tersedia di Yard',
        leadTimeDays: 2,
        locationOrTarget: 'Lambung Bawah, Daun Kemudi & Kotak Sea Chest',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `mat-pre-9-${projectId}`,
        projectId,
        materialCode: 'MAT-MEC-001',
        materialName: 'Rubber Bushing Daun Kemudi & Thordon Bearing Rudder Stock',
        classification: 'mechanical_propulsion',
        specification: 'Custom Machined Diameter 140 mm x Panjang 280 mm Marine Grade',
        categoryCode: 'IX',
        categoryId: 'cat-9',
        categoryName: 'Mechanical Work',
        qtyRequired: 2,
        qtyBufferPercent: 0,
        totalQtyWithBuffer: 2,
        unit: 'set',
        unitPrice: 4200000,
        totalCost: 2 * 4200000,
        priceBasis: 'qty',
        brandOrStandard: 'Thordon Bearings Marine',
        supplierName: 'Bengkel Bubut Presisi Maritim',
        procurementStatus: 'PO Issued',
        leadTimeDays: 5,
        locationOrTarget: 'Rudder Stock Port & Starboard',
        createdAt: now,
        updatedAt: now,
      },
    ];
  },

  /**
   * Generates a professional Excel file (.xlsx) formatted for Shipyard Material Requisition / BOM
   */
  async exportToExcel(
    vessel: VesselSpec,
    schedule: ProjectSchedule,
    materials: ProjectMaterialEstimate[],
    categories: WorkCategory[]
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Shipyard Repair List & Cost Estimator';
    workbook.lastModifiedBy = 'PPC Shipyard Engineer';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Estimasi Material Proyek', {
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
      views: [{ showGridLines: true }],
    });

    // Columns setup
    sheet.columns = [
      { key: 'no', width: 6 },
      { key: 'code', width: 14 },
      { key: 'name', width: 34 },
      { key: 'spec', width: 38 },
      { key: 'repairItem', width: 22 },
      { key: 'category', width: 16 },
      { key: 'qtyReq', width: 12 },
      { key: 'buffer', width: 10 },
      { key: 'totalQty', width: 12 },
      { key: 'unit', width: 8 },
      { key: 'weightKg', width: 13 },
      { key: 'unitPrice', width: 16 },
      { key: 'totalCost', width: 18 },
      { key: 'status', width: 18 },
      { key: 'supplier', width: 24 },
      { key: 'location', width: 22 },
    ];

    // Title & Header Block
    sheet.mergeCells('A1:P1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'DAFTAR ESTIMASI KEBUTUHAN MATERIAL PROYEK REPARASI KAPAL (BILL OF MATERIALS)';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 28;

    sheet.mergeCells('A2:P2');
    const subTitleCell = sheet.getCell('A2');
    subTitleCell.value = `DEPARTEMEN PLANNING, PRODUCTION & CONTROL (PPC) - STANDAR BKI & IACS`;
    subTitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 18;

    // Vessel & Project Specs Block
    sheet.getCell('A4').value = 'Nama Kapal:';
    sheet.getCell('A4').font = { bold: true, size: 9 };
    sheet.getCell('B4').value = vessel.name || '-';
    sheet.getCell('B4').font = { bold: true, size: 9 };

    sheet.getCell('E4').value = 'No. Proyek:';
    sheet.getCell('E4').font = { bold: true, size: 9 };
    sheet.getCell('F4').value = vessel.projectNo || '-';

    sheet.getCell('I4').value = 'Perusahaan Pemilik:';
    sheet.getCell('I4').font = { bold: true, size: 9 };
    sheet.getCell('J4').value = vessel.companyOwner || '-';

    sheet.getCell('M4').value = 'Tanggal Docking:';
    sheet.getCell('M4').font = { bold: true, size: 9 };
    sheet.getCell('N4').value = schedule.dockingDate || '-';

    sheet.getCell('A5').value = 'Jenis Kapal:';
    sheet.getCell('A5').font = { bold: true, size: 9 };
    sheet.getCell('B5').value = vessel.vesselType || '-';

    sheet.getCell('E5').value = 'Dimensi Kapal:';
    sheet.getCell('E5').font = { bold: true, size: 9 };
    sheet.getCell('F5').value = vessel.dimension || '-';

    sheet.getCell('I5').value = 'Klasifikasi:';
    sheet.getCell('I5').font = { bold: true, size: 9 };
    sheet.getCell('J5').value = `${vessel.classification || 'BKI'} (${vessel.kindOfSurvey || '-'})`;

    sheet.getCell('M5').value = 'Target Selesai:';
    sheet.getCell('M5').font = { bold: true, size: 9 };
    sheet.getCell('N5').value = schedule.finishWork || '-';

    // Summary KPI Block
    const summary = calculateMaterialSummary(materials);
    sheet.mergeCells('A7:D7');
    sheet.getCell('A7').value = `Total Estimasi Biaya: Rp ${summary.totalEstimatedCost.toLocaleString('id-ID')}`;
    sheet.getCell('A7').font = { bold: true, size: 10, color: { argb: 'FF065F46' } };
    sheet.getCell('A7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };

    sheet.mergeCells('E7:H7');
    sheet.getCell('E7').value = `Total Tonase Baja: ${summary.totalSteelWeightTons.toFixed(2)} Ton (${summary.totalSteelWeightKg.toLocaleString('id-ID')} Kg)`;
    sheet.getCell('E7').font = { bold: true, size: 10, color: { argb: 'FF1E40AF' } };
    sheet.getCell('E7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };

    sheet.mergeCells('I7:L7');
    sheet.getCell('I7').value = `Total Cat: ${summary.totalPaintLiters} Liter | Pasir Blasting: ${summary.totalAbrasiveTons} Ton`;
    sheet.getCell('I7').font = { bold: true, size: 10, color: { argb: 'FF854D0E' } };
    sheet.getCell('I7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };

    sheet.mergeCells('M7:P7');
    sheet.getCell('M7').value = `Total Item Material: ${summary.totalItemsCount} Item (${summary.linkedWorkItemsCount} Item Repair Terkait)`;
    sheet.getCell('M7').font = { bold: true, size: 10, color: { argb: 'FF374151' } };
    sheet.getCell('M7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

    // Table Header Row
    const headers = [
      'NO',
      'KODE MAT',
      'NAMA MATERIAL',
      'SPESIFIKASI TEKNIS / STANDAR',
      'ITEM REPAIR LIST',
      'KATEGORI',
      'QTY REQ',
      'WASTE %',
      'TOTAL QTY',
      'SATUAN',
      'BERAT (KG)',
      'HARGA SATUAN (RP)',
      'TOTAL BIAYA (RP)',
      'STATUS PENGADAAN',
      'SUPPLIER / VENDOR',
      'TARGET PASANG',
    ];

    const headerRow = sheet.getRow(9);
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FF0F172A' } },
      };
    });
    headerRow.height = 28;

    // Populate Data Rows
    let currentRowIdx = 10;
    materials.forEach((item, idx) => {
      const row = sheet.getRow(currentRowIdx);
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      row.getCell(1).value = idx + 1;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(2).value = item.materialCode || '-';
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).font = { name: 'Consolas', size: 9, bold: true };

      row.getCell(3).value = item.materialName || '-';
      row.getCell(3).font = { name: 'Arial', size: 9, bold: true };

      row.getCell(4).value = item.specification || '-';
      row.getCell(4).font = { name: 'Arial', size: 8.5 };

      row.getCell(5).value = item.workItemNo ? `${item.workItemNo}. ${item.workItemDescription || ''}` : '-';
      row.getCell(5).font = { name: 'Arial', size: 8.5, color: { argb: 'FF0369A1' } };

      row.getCell(6).value = item.categoryName || item.categoryCode || '-';
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(7).value = item.qtyRequired || 0;
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(7).numFmt = '#,##0.##';

      row.getCell(8).value = item.qtyBufferPercent ? `${item.qtyBufferPercent}%` : '0%';
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(9).value = item.totalQtyWithBuffer || item.qtyRequired || 0;
      row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(9).numFmt = '#,##0.##';
      row.getCell(9).font = { bold: true };

      row.getCell(10).value = item.unit || '-';
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(11).value = item.calculatedWeightKg && item.calculatedWeightKg > 0 ? item.calculatedWeightKg : '-';
      row.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
      if (typeof row.getCell(11).value === 'number') {
        row.getCell(11).numFmt = '#,##0.00';
      }

      row.getCell(12).value = item.unitPrice || 0;
      row.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(12).numFmt = '#,##0';

      row.getCell(13).value = item.totalCost || 0;
      row.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(13).numFmt = '#,##0';
      row.getCell(13).font = { bold: true, color: { argb: 'FF065F46' } };

      row.getCell(14).value = item.procurementStatus || 'Estimasi';
      row.getCell(14).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(15).value = item.supplierName || '-';

      row.getCell(16).value = item.locationOrTarget || '-';

      for (let c = 1; c <= 16; c++) {
        const cell = row.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }
      row.height = 22;
      currentRowIdx++;
    });

    // Grand Total Row
    const totalRow = sheet.getRow(currentRowIdx);
    sheet.mergeCells(`A${currentRowIdx}:L${currentRowIdx}`);
    totalRow.getCell(1).value = 'TOTAL ESTIMASI BIAYA MATERIAL (EXCLUDE PPN):';
    totalRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
    totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

    totalRow.getCell(13).value = summary.totalEstimatedCost;
    totalRow.getCell(13).numFmt = '#,##0';
    totalRow.getCell(13).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF065F46' } };
    totalRow.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };

    for (let c = 1; c <= 16; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF065F46' } },
        bottom: { style: 'double', color: { argb: 'FF065F46' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    }
    totalRow.height = 26;

    // Signatures Block
    const sigStartRow = currentRowIdx + 3;
    sheet.mergeCells(`B${sigStartRow}:D${sigStartRow}`);
    sheet.getCell(`B${sigStartRow}`).value = 'Dipersiapkan Oleh (PPC):';
    sheet.getCell(`B${sigStartRow}`).alignment = { horizontal: 'center' };
    sheet.getCell(`B${sigStartRow}`).font = { bold: true, size: 9 };

    sheet.mergeCells(`G${sigStartRow}:I${sigStartRow}`);
    sheet.getCell(`G${sigStartRow}`).value = 'Ditinjau & Disetujui (Pimpro):';
    sheet.getCell(`G${sigStartRow}`).alignment = { horizontal: 'center' };
    sheet.getCell(`G${sigStartRow}`).font = { bold: true, size: 9 };

    sheet.mergeCells(`L${sigStartRow}:N${sigStartRow}`);
    sheet.getCell(`L${sigStartRow}`).value = 'Bagian Pengadaan / Logistik:';
    sheet.getCell(`L${sigStartRow}`).alignment = { horizontal: 'center' };
    sheet.getCell(`L${sigStartRow}`).font = { bold: true, size: 9 };

    sheet.mergeCells(`B${sigStartRow + 4}:D${sigStartRow + 4}`);
    sheet.getCell(`B${sigStartRow + 4}`).value = 'Muhammad Munthaha (PPC)';
    sheet.getCell(`B${sigStartRow + 4}`).alignment = { horizontal: 'center' };
    sheet.getCell(`B${sigStartRow + 4}`).font = { bold: true, size: 9 };

    sheet.mergeCells(`G${sigStartRow + 4}:I${sigStartRow + 4}`);
    sheet.getCell(`G${sigStartRow + 4}`).value = 'Muhammad Fadel R (Project Leader)';
    sheet.getCell(`G${sigStartRow + 4}`).alignment = { horizontal: 'center' };
    sheet.getCell(`G${sigStartRow + 4}`).font = { bold: true, size: 9 };

    sheet.mergeCells(`L${sigStartRow + 4}:N${sigStartRow + 4}`);
    sheet.getCell(`L${sigStartRow + 4}`).value = '( Purchasing & Yard Storage )';
    sheet.getCell(`L${sigStartRow + 4}`).alignment = { horizontal: 'center' };
    sheet.getCell(`L${sigStartRow + 4}`).font = { italic: true, size: 9 };

    // Export & Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedVesselName = (vessel.name || 'Kapal').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `Estimasi_Material_${sanitizedVesselName}_${vessel.projectNo || 'F00'}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
