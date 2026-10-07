import { ProjectResourceItem, ResourceCategory, ResourceSummary, WorkItem, VesselSpec } from '../types';

const RESOURCE_STORAGE_PREFIX = 'shipyard_project_resources_v1_';

export const RESOURCE_CATEGORIES: Array<{
  id: ResourceCategory;
  label: string;
  shortLabel: string;
  iconName: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}> = [
  {
    id: 'material',
    label: 'Material (Bahan Baku Utama)',
    shortLabel: 'Material',
    iconName: 'Box',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    badgeText: 'text-emerald-700',
    description: 'Pelat baja BKI/ABS, pipa schedule, profil siku/UNP/WF, bordes, grating, katup, fitting & anoda',
  },
  {
    id: 'manpower',
    label: 'Man Power (Tenaga Kerja & Mandays)',
    shortLabel: 'Man Power',
    iconName: 'Users',
    color: 'blue',
    badgeBg: 'bg-blue-50 border-blue-200 text-blue-800',
    badgeText: 'text-blue-700',
    description: 'Fitter, Welder 3G/4G/6G, Blaster, Painter, Mekanik, Electrician, Helper, Foreman & QC',
  },
  {
    id: 'consumable',
    label: 'Consumables (Bahan Habis Pakai)',
    shortLabel: 'Consumables',
    iconName: 'Flame',
    color: 'amber',
    badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
    badgeText: 'text-amber-700',
    description: 'Kawat las LB-52/MIG, pasir blasting, oksigen, LPG/asetilen, batu gerinda, thinner, solar & APD',
  },
  {
    id: 'equipment',
    label: 'Equipment & Alat Bantu (Mesin/Sewa)',
    shortLabel: 'Equipment',
    iconName: 'Wrench',
    color: 'indigo',
    badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    badgeText: 'text-indigo-700',
    description: 'Mobile crane, kompresor blasting 375 CFM, mesin las inverter, genset, scaffolding & hydrotest pump',
  },
  {
    id: 'subcont',
    label: 'Subkontraktor & Jasa Spesialis',
    shortLabel: 'Subcont',
    iconName: 'ShieldCheck',
    color: 'purple',
    badgeBg: 'bg-purple-50 border-purple-200 text-purple-800',
    badgeText: 'text-purple-700',
    description: 'NDT UTM BKI, dynamic balancing propeller & kemudi, kalibrasi instrumen & uji beban jangkar',
  },
  {
    id: 'overhead',
    label: 'Overhead & Fasilitas Galangan',
    shortLabel: 'Overhead',
    iconName: 'Building',
    color: 'slate',
    badgeBg: 'bg-slate-100 border-slate-300 text-slate-800',
    badgeText: 'text-slate-700',
    description: 'Docking-undocking, shore power, air tawar, pembuangan limbah sludge B3 & fire watch dermaga',
  },
];

export const RESOURCE_STATUSES = [
  { id: 'Rencana', label: 'Rencana', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'Approved', label: 'Disetujui', color: 'bg-sky-50 text-sky-800 border-sky-300' },
  { id: 'PO Issued', label: 'PO Terbit', color: 'bg-amber-50 text-amber-800 border-amber-300' },
  { id: 'On Yard', label: 'Tersedia di Yard', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  { id: 'Terpakai', label: 'Sudah Digunakan', color: 'bg-indigo-50 text-indigo-800 border-indigo-300' },
];

export function calculateResourceItemCost(item: Partial<ProjectResourceItem>): number {
  if (item.category === 'manpower' && item.headcount && item.workDays) {
    const days = Number(item.workDays) || 0;
    const count = Number(item.headcount) || 0;
    const rate = Number(item.unitPrice) || 0;
    return count * days * rate;
  }
  const qty = Number(item.qty) || 0;
  const price = Number(item.unitPrice) || 0;
  return Math.round(qty * price);
}

export function calculateResourceSummary(
  items: ProjectResourceItem[],
  contingencyPercent = 10
): ResourceSummary {
  let totalMaterialCost = 0;
  let totalManpowerCost = 0;
  let totalConsumableCost = 0;
  let totalEquipmentCost = 0;
  let totalSubcontCost = 0;
  let totalOverheadCost = 0;
  let totalMandays = 0;
  let totalMaterialTonnageKg = 0;

  const itemCountByCategory: Record<ResourceCategory, number> = {
    material: 0,
    manpower: 0,
    consumable: 0,
    equipment: 0,
    subcont: 0,
    overhead: 0,
  };

  items.forEach((item) => {
    const cost = item.totalCost || calculateResourceItemCost(item);
    itemCountByCategory[item.category] = (itemCountByCategory[item.category] || 0) + 1;

    switch (item.category) {
      case 'material':
        totalMaterialCost += cost;
        if (item.weightKg) {
          totalMaterialTonnageKg += Number(item.weightKg) || 0;
        } else if (item.unit?.toLowerCase() === 'kg') {
          totalMaterialTonnageKg += Number(item.qty) || 0;
        }
        break;
      case 'manpower':
        totalManpowerCost += cost;
        if (item.headcount && item.workDays) {
          totalMandays += (Number(item.headcount) || 0) * (Number(item.workDays) || 0);
        } else if (item.unit?.toLowerCase().includes('manday')) {
          totalMandays += Number(item.qty) || 0;
        }
        break;
      case 'consumable':
        totalConsumableCost += cost;
        break;
      case 'equipment':
        totalEquipmentCost += cost;
        break;
      case 'subcont':
        totalSubcontCost += cost;
        break;
      case 'overhead':
        totalOverheadCost += cost;
        break;
    }
  });

  const grandTotalResourceCost =
    totalMaterialCost +
    totalManpowerCost +
    totalConsumableCost +
    totalEquipmentCost +
    totalSubcontCost +
    totalOverheadCost;

  const contingencyAmount = Math.round(grandTotalResourceCost * (contingencyPercent / 100));
  const finalProjectBudget = grandTotalResourceCost + contingencyAmount;

  return {
    totalMaterialCost,
    totalManpowerCost,
    totalConsumableCost,
    totalEquipmentCost,
    totalSubcontCost,
    totalOverheadCost,
    grandTotalResourceCost,
    totalMandays,
    totalMaterialTonnageKg,
    contingencyPercent,
    contingencyAmount,
    finalProjectBudget,
    itemCountByCategory,
  };
}

export const projectResourceService = {
  getResources(projectId: string): ProjectResourceItem[] {
    if (!projectId) return [];
    try {
      const raw = localStorage.getItem(`${RESOURCE_STORAGE_PREFIX}${projectId}`);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load project resources from storage:', e);
    }
    // If not found in localStorage, return default shipyard preset for this project
    const defaultItems = this.getStandardDockingPreset(projectId);
    this.saveResources(projectId, defaultItems);
    return defaultItems;
  },

  saveResources(projectId: string, items: ProjectResourceItem[]): void {
    if (!projectId) return;
    try {
      localStorage.setItem(`${RESOURCE_STORAGE_PREFIX}${projectId}`, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save project resources to storage:', e);
    }
  },

  addResource(
    projectId: string,
    item: Omit<ProjectResourceItem, 'id' | 'projectId' | 'totalCost'>
  ): ProjectResourceItem {
    const items = this.getResources(projectId);
    const totalCost = calculateResourceItemCost(item);
    const newItem: ProjectResourceItem = {
      ...item,
      id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      totalCost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...items];
    this.saveResources(projectId, updated);
    return newItem;
  },

  updateResource(projectId: string, item: ProjectResourceItem): void {
    const items = this.getResources(projectId);
    const totalCost = calculateResourceItemCost(item);
    const updated = items.map((i) =>
      i.id === item.id ? { ...item, totalCost, updatedAt: new Date().toISOString() } : i
    );
    this.saveResources(projectId, updated);
  },

  deleteResource(projectId: string, id: string): void {
    const items = this.getResources(projectId);
    const updated = items.filter((i) => i.id !== id);
    this.saveResources(projectId, updated);
  },

  clearAllResources(projectId: string): void {
    this.saveResources(projectId, []);
  },

  getStandardDockingPreset(projectId: string): ProjectResourceItem[] {
    const now = new Date().toISOString();
    return [
      // 1. MATERIAL
      {
        id: `mat-1-${projectId}`,
        projectId,
        category: 'material',
        code: 'MAT-001',
        name: 'Pelat Baja Lambung BKI Grade A (Tebal 10mm)',
        specOrRole: 'Dimensi 1500 x 6000 x 10mm (Berat ~707 kg/lbr)',
        qty: 6500,
        unit: 'kg',
        weightKg: 6500,
        unitPrice: 22500,
        totalCost: 6500 * 22500,
        status: 'Approved',
        supplierOrSubcont: 'PT. Gunung Raja Paksi / Krakatau Steel',
        workCategoryCode: 'VI',
        remarks: 'Replating Bottom Shell & Bilge Strake lajur P/S',
        createdAt: now,
      },
      {
        id: `mat-2-${projectId}`,
        projectId,
        category: 'material',
        code: 'MAT-002',
        name: 'Pelat Baja Lambung BKI Grade A (Tebal 12mm)',
        specOrRole: 'Dimensi 1500 x 6000 x 12mm (Sertifikasi Mill BKI)',
        qty: 4200,
        unit: 'kg',
        weightKg: 4200,
        unitPrice: 22800,
        totalCost: 4200 * 22800,
        status: 'Approved',
        supplierOrSubcont: 'PT. Krakatau Steel Tbk',
        workCategoryCode: 'VI',
        remarks: 'Replating Forepeak Tank & Side Shell Fr. 15-20',
        createdAt: now,
      },
      {
        id: `mat-3-${projectId}`,
        projectId,
        category: 'material',
        code: 'MAT-003',
        name: 'Pipa Seamless Carbon Steel ASTM A53 Gr. B 2" Sch 40',
        specOrRole: 'Panjang 6 Meter / Batang (OD 60.3mm x WT 3.91mm)',
        qty: 12,
        unit: 'btg',
        weightKg: 400,
        unitPrice: 950000,
        totalCost: 12 * 950000,
        status: 'Rencana',
        supplierOrSubcont: 'Distributor Pipa Baja Surabaya',
        workCategoryCode: 'VIII',
        remarks: 'Jalur Sounding & Air Vent Tanki Ballast #1 & #2',
        createdAt: now,
      },
      {
        id: `mat-4-${projectId}`,
        projectId,
        category: 'material',
        code: 'MAT-004',
        name: 'Pipa Seamless Carbon Steel ASTM A53 Gr. B 3" Sch 40',
        specOrRole: 'Panjang 6 Meter / Batang (OD 88.9mm x WT 5.49mm)',
        qty: 8,
        unit: 'btg',
        weightKg: 550,
        unitPrice: 1650000,
        totalCost: 8 * 1650000,
        status: 'Rencana',
        supplierOrSubcont: 'Distributor Pipa Baja Surabaya',
        workCategoryCode: 'VIII',
        remarks: 'Jalur Isap & Buang Bilge / Ballast Main Line',
        createdAt: now,
      },
      {
        id: `mat-5-${projectId}`,
        projectId,
        category: 'material',
        code: 'MAT-005',
        name: 'Baja Profil Siku L 100 x 100 x 10 mm (BKI)',
        specOrRole: 'Panjang 6 Meter / Batang (~15.0 kg/m)',
        qty: 10,
        unit: 'btg',
        weightKg: 900,
        unitPrice: 2050000,
        totalCost: 10 * 2050000,
        status: 'Approved',
        supplierOrSubcont: 'PT. Master Steel',
        workCategoryCode: 'VI',
        remarks: 'Penggantian Gading Web Frame & Stiffener Lambung',
        createdAt: now,
      },
      {
        id: `mat-6-${projectId}`,
        projectId,
        category: 'material',
        code: 'MAT-006',
        name: 'Cat Marine Epoxy Primer (High Solids Epoxy)',
        specOrRole: 'Jotun Jotamastic 90 / Chugoku Epicon (Pail 20 Ltr)',
        qty: 14,
        unit: 'pail',
        unitPrice: 3850000,
        totalCost: 14 * 3850000,
        status: 'Approved',
        supplierOrSubcont: 'PT. Jotun Indonesia / Chugoku Marine Paints',
        workCategoryCode: 'III',
        remarks: 'Primer Coat Underwater Hull & Topsides (Total 280 Ltr)',
        createdAt: now,
      },
      {
        id: `mat-7-${projectId}`,
        projectId,
        category: 'material',
        code: 'MAT-007',
        name: 'Cat Antifouling (AF) Copper Free Self-Polishing',
        specOrRole: 'Jotun SeaForce 60 / International Intersmooth (Pail 20 Ltr)',
        qty: 10,
        unit: 'pail',
        unitPrice: 4950000,
        totalCost: 10 * 4950000,
        status: 'Approved',
        supplierOrSubcont: 'PT. Jotun Indonesia',
        workCategoryCode: 'III',
        remarks: 'Lapisan Akhir Anti Teritip Underwater Bottom Hull',
        createdAt: now,
      },
      {
        id: `mat-8-${projectId}`,
        projectId,
        category: 'material',
        code: 'MAT-008',
        name: 'Zinc Anode Paduan Seng Korosi 10 Kg (Weld-on)',
        specOrRole: 'Tipe Las dengan Insert Plat Baja (Standar BKI/DNV)',
        qty: 24,
        unit: 'unit',
        weightKg: 240,
        unitPrice: 580000,
        totalCost: 24 * 580000,
        status: 'Approved',
        supplierOrSubcont: 'PT. Korosi Katoda Galangan',
        workCategoryCode: 'III',
        remarks: 'Proteksi Katodik Lambung Bawah Air, Sea Chest & Kemudi',
        createdAt: now,
      },

      // 2. MAN POWER
      {
        id: `man-1-${projectId}`,
        projectId,
        category: 'manpower',
        code: 'MAN-001',
        name: 'Fitter / Fabrikator Struktur Baja & Pelat',
        specOrRole: 'Senior Fitter Mark & Fit-up Konstruksi Kapal',
        qty: 56, // 4 orang x 14 hari
        headcount: 4,
        workDays: 14,
        dailyHours: 8,
        unit: 'mandays',
        unitPrice: 320000,
        totalCost: 4 * 14 * 320000,
        status: 'Approved',
        supplierOrSubcont: 'Tim Konstruksi Internal Galangan',
        workCategoryCode: 'VI',
        remarks: 'Fit-up pemotongan, beveling & perakitan pelat lambung',
        createdAt: now,
      },
      {
        id: `man-2-${projectId}`,
        projectId,
        category: 'manpower',
        code: 'MAN-002',
        name: 'Welder 3G / 4G SMAW BKI Certified',
        specOrRole: 'Welder Bersertifikat BKI / IACS untuk Pelat Lambung',
        qty: 56, // 4 orang x 14 hari
        headcount: 4,
        workDays: 14,
        dailyHours: 8,
        unit: 'mandays',
        unitPrice: 350000,
        totalCost: 4 * 14 * 350000,
        status: 'Approved',
        supplierOrSubcont: 'Tim Welder Certified Galangan',
        workCategoryCode: 'VI',
        remarks: 'Pengelasan seam & butt joint pelat bottom dan side shell',
        createdAt: now,
      },
      {
        id: `man-3-${projectId}`,
        projectId,
        category: 'manpower',
        code: 'MAN-003',
        name: 'Pipe Fitter & Welder 6G (Pemesinan & Pipa)',
        specOrRole: 'Fabrikasi Spool Pipa & Pengelasan Flange',
        qty: 16, // 2 orang x 8 hari
        headcount: 2,
        workDays: 8,
        dailyHours: 8,
        unit: 'mandays',
        unitPrice: 360000,
        totalCost: 2 * 8 * 360000,
        status: 'Approved',
        supplierOrSubcont: 'Divisi Piping & Machinery',
        workCategoryCode: 'VIII',
        remarks: 'Pemasangan jalur pipa ballast, bilge & hydrotest',
        createdAt: now,
      },
      {
        id: `man-4-${projectId}`,
        projectId,
        category: 'manpower',
        code: 'MAN-004',
        name: 'Operator Sandblaster (Sa 2.0 / Sa 2.5)',
        specOrRole: 'Blaster Berpengalaman Tangki & Lambung Kapal',
        qty: 24, // 4 orang x 6 hari
        headcount: 4,
        workDays: 6,
        dailyHours: 8,
        unit: 'mandays',
        unitPrice: 300000,
        totalCost: 4 * 6 * 300000,
        status: 'Approved',
        supplierOrSubcont: 'Subcont Blasting Nusantara',
        workCategoryCode: 'III',
        remarks: 'Blasting area bottom, boottop, dan topsides',
        createdAt: now,
      },
      {
        id: `man-5-${projectId}`,
        projectId,
        category: 'manpower',
        code: 'MAN-005',
        name: 'Marine Painter (Airless Spray Operator)',
        specOrRole: 'Aplikator Cat Kapal & Coating Sistem Galangan',
        qty: 20, // 4 orang x 5 hari
        headcount: 4,
        workDays: 5,
        dailyHours: 8,
        unit: 'mandays',
        unitPrice: 290000,
        totalCost: 4 * 5 * 290000,
        status: 'Approved',
        supplierOrSubcont: 'Subcont Painting Mitra Galangan',
        workCategoryCode: 'III',
        remarks: 'Aplikasi Touch-up, Primer, Intermediate & Antifouling',
        createdAt: now,
      },
      {
        id: `man-6-${projectId}`,
        projectId,
        category: 'manpower',
        code: 'MAN-006',
        name: 'Mekanik Mesin Kapal & Valve Specialist',
        specOrRole: 'Overhaul Katup Sea Chest, Overboard & Kemudi',
        qty: 16, // 2 orang x 8 hari
        headcount: 2,
        workDays: 8,
        dailyHours: 8,
        unit: 'mandays',
        unitPrice: 340000,
        totalCost: 2 * 8 * 340000,
        status: 'Approved',
        supplierOrSubcont: 'Bengkel Mesin Galangan',
        workCategoryCode: 'IX',
        remarks: 'Skir/lapping katup, ganti packing, test bocor katup',
        createdAt: now,
      },
      {
        id: `man-7-${projectId}`,
        projectId,
        category: 'manpower',
        code: 'MAN-007',
        name: 'Helper Umum / Rigger / Scaffolder',
        specOrRole: 'Bongkar pasang perancah, handling material & kebersihan',
        qty: 120, // 6 orang x 20 hari
        headcount: 6,
        workDays: 20,
        dailyHours: 8,
        unit: 'mandays',
        unitPrice: 220000,
        totalCost: 6 * 20 * 220000,
        status: 'Approved',
        supplierOrSubcont: 'Koperasi Tenaga Kerja Galangan',
        workCategoryCode: 'I',
        remarks: 'Support rigging, langsir pelat, fire watch, safety helper',
        createdAt: now,
      },
      {
        id: `man-8-${projectId}`,
        projectId,
        category: 'manpower',
        code: 'MAN-008',
        name: 'Foreman / Mandor Lapangan & Safety Officer (HSE)',
        specOrRole: 'Pengawas Lapangan & Inspeksi Keselamatan Kerja',
        qty: 48, // 2 orang x 24 hari
        headcount: 2,
        workDays: 24,
        dailyHours: 8,
        unit: 'mandays',
        unitPrice: 380000,
        totalCost: 2 * 24 * 380000,
        status: 'Approved',
        supplierOrSubcont: 'Staff Produksi & K3 Galangan',
        workCategoryCode: 'I',
        remarks: 'Supervisi teknis harian, checklist permit to work & APD',
        createdAt: now,
      },

      // 3. CONSUMABLES
      {
        id: `cns-1-${projectId}`,
        projectId,
        category: 'consumable',
        code: 'CNS-001',
        name: 'Kawat Las Kobelco LB-52 (AWS E7018) Dia 3.2mm',
        specOrRole: 'Low Hydrogen Electrode untuk Konstruksi Kapal (Dos 20 Kg)',
        qty: 320,
        unit: 'kg',
        unitPrice: 52000,
        totalCost: 320 * 52000,
        status: 'On Yard',
        supplierOrSubcont: 'PT. Kobe Welding Indonesia',
        workCategoryCode: 'VI',
        remarks: 'Kawat las utama sambungan pelat lambung & profil gading',
        createdAt: now,
      },
      {
        id: `cns-2-${projectId}`,
        projectId,
        category: 'consumable',
        code: 'CNS-002',
        name: 'Pasir Sandblasting Copper Slag Grit 1.5 - 2.5 mm',
        specOrRole: 'Abrasive Blasting Material (Kemasan Jumbo Bag / Sak 50 Kg)',
        qty: 18,
        unit: 'ton',
        unitPrice: 1450000,
        totalCost: 18 * 1450000,
        status: 'Approved',
        supplierOrSubcont: 'Supplier Pasir Blasting Cilegon',
        workCategoryCode: 'III',
        remarks: 'Blasting permukaan pelat lambung mencapai standar Sa 2.5',
        createdAt: now,
      },
      {
        id: `cns-3-${projectId}`,
        projectId,
        category: 'consumable',
        code: 'CNS-003',
        name: 'Gas Oksigen Industri 6 m³ (Tabung Tekanan Tinggi)',
        specOrRole: 'Isi Ulang Gas Oksigen Medis/Industri Kemasan Tabung',
        qty: 45,
        unit: 'tabung',
        unitPrice: 125000,
        totalCost: 45 * 125000,
        status: 'Approved',
        supplierOrSubcont: 'PT. Samator Gas Industri',
        workCategoryCode: 'VI',
        remarks: 'Pemotongan (blender potong) pelat rusak & gouging',
        createdAt: now,
      },
      {
        id: `cns-4-${projectId}`,
        projectId,
        category: 'consumable',
        code: 'CNS-004',
        name: 'Gas LPG Industri 50 Kg untuk Cutting Torch',
        specOrRole: 'LPG Tekanan Tinggi Tabung 50 Kg Pertamina',
        qty: 10,
        unit: 'tabung',
        unitPrice: 850000,
        totalCost: 10 * 850000,
        status: 'Approved',
        supplierOrSubcont: 'Agen Resmi Pertamina Gas',
        workCategoryCode: 'VI',
        remarks: 'Bahan bakar pemotongan pelat baja tebal 10-14mm',
        createdAt: now,
      },
      {
        id: `cns-5-${projectId}`,
        projectId,
        category: 'consumable',
        code: 'CNS-005',
        name: 'Batu Gerinda Potong 4" & 14" (Cutting Disc)',
        specOrRole: 'Resibon / Nippon Resibon 4" x 1.2mm & 14" x 3.0mm',
        qty: 180,
        unit: 'pcs',
        unitPrice: 18000,
        totalCost: 180 * 18000,
        status: 'On Yard',
        supplierOrSubcont: 'Toko Teknik Samudra Perkasa',
        workCategoryCode: 'VI',
        remarks: 'Pemotongan profil, pipa, beveling & trimming',
        createdAt: now,
      },
      {
        id: `cns-6-${projectId}`,
        projectId,
        category: 'consumable',
        code: 'CNS-006',
        name: 'Batu Gerinda Asah / Fleksibel 4" (Grinding Disc)',
        specOrRole: 'Resibon 4" x 6.0mm untuk Pembersihan Root & Slag Las',
        qty: 120,
        unit: 'pcs',
        unitPrice: 22000,
        totalCost: 120 * 22000,
        status: 'On Yard',
        supplierOrSubcont: 'Toko Teknik Samudra Perkasa',
        workCategoryCode: 'VI',
        remarks: 'Grinding root run, perapian kampuh las & flush finishing',
        createdAt: now,
      },
      {
        id: `cns-7-${projectId}`,
        projectId,
        category: 'consumable',
        code: 'CNS-007',
        name: 'Thinner Epoxy & Polyurethane (Drum 200 Liter / Jerigen)',
        specOrRole: 'Pelarut Cat Primer & Finish Grade Marine',
        qty: 140,
        unit: 'liter',
        unitPrice: 38000,
        totalCost: 140 * 38000,
        status: 'Approved',
        supplierOrSubcont: 'Distributor Jotun Paints',
        workCategoryCode: 'III',
        remarks: 'Pencuci spray gun, pengencer cat sesuai spesifikasi TDS',
        createdAt: now,
      },
      {
        id: `cns-8-${projectId}`,
        projectId,
        category: 'consumable',
        code: 'CNS-008',
        name: 'Solar HSD / BBM Genset & Kompresor Blasting',
        specOrRole: 'Solar Industri B35 Non-Subsidi untuk Operasional Lapangan',
        qty: 1600,
        unit: 'liter',
        unitPrice: 16500,
        totalCost: 1600 * 16500,
        status: 'Rencana',
        supplierOrSubcont: 'Bunker Solar Industri Galangan',
        workCategoryCode: 'I',
        remarks: 'Bahan bakar kompresor 375 CFM & genset standby 100 kVA',
        createdAt: now,
      },
      {
        id: `cns-9-${projectId}`,
        projectId,
        category: 'consumable',
        code: 'CNS-009',
        name: 'Alat Pelindung Diri (APD Las, Masker Dust & Sarung Tangan)',
        specOrRole: 'Sarung tangan kulit las, kacamata gerinda & masker karbon 3M',
        qty: 35,
        unit: 'set',
        unitPrice: 95000,
        totalCost: 35 * 95000,
        status: 'On Yard',
        supplierOrSubcont: 'Safety Store Galangan',
        workCategoryCode: 'I',
        remarks: 'Perlengkapan K3 tim fabrikasi, blasting & pengecatan',
        createdAt: now,
      },

      // 4. EQUIPMENT
      {
        id: `eqp-1-${projectId}`,
        projectId,
        category: 'equipment',
        code: 'EQP-001',
        name: 'Sewa Mobile Crane 25 Ton (Telescopic)',
        specOrRole: 'Kapasitas 25 Ton include Operator & Bahan Bakar',
        qty: 36,
        unit: 'jam',
        unitPrice: 650000,
        totalCost: 36 * 650000,
        status: 'Approved',
        supplierOrSubcont: 'PT. Samudra Crane Rental',
        workCategoryCode: 'I',
        remarks: 'Langsir pelat baja, bongkar pasang kemudi & propeller',
        createdAt: now,
      },
      {
        id: `eqp-2-${projectId}`,
        projectId,
        category: 'equipment',
        code: 'EQP-002',
        name: 'Air Compressor High Pressure 375 CFM (Diesel)',
        specOrRole: 'Tekanan Kerja 7 - 10 Bar untuk Sandblasting & Spray',
        qty: 6,
        unit: 'hari',
        unitPrice: 1850000,
        totalCost: 6 * 1850000,
        status: 'Approved',
        supplierOrSubcont: 'Rental Kompresor Industri Galangan',
        workCategoryCode: 'III',
        remarks: 'Penyediaan udara bertekanan untuk 2 blast pot simultan',
        createdAt: now,
      },
      {
        id: `eqp-3-${projectId}`,
        projectId,
        category: 'equipment',
        code: 'EQP-003',
        name: 'Mesin Las Inverter DC 400A (Include Kabel & Stang)',
        specOrRole: 'Duty Cycle 60% @ 400A untuk 4 Titik Pengelasan',
        qty: 4,
        unit: 'unit-bulan',
        unitPrice: 2200000,
        totalCost: 4 * 2200000,
        status: 'On Yard',
        supplierOrSubcont: 'Asset Peralatan Internal Galangan',
        workCategoryCode: 'VI',
        remarks: 'Sumber arus pengelasan SMAW pelat bottom & sekat',
        createdAt: now,
      },
      {
        id: `eqp-4-${projectId}`,
        projectId,
        category: 'equipment',
        code: 'EQP-004',
        name: 'Sewa & Pasang Scaffolding Tubular (Perancah Dermaga)',
        specOrRole: 'Pipa Galvanis 1.5", Swivel Clamp & Papan Injak Catwalk',
        qty: 80,
        unit: 'set-hari',
        unitPrice: 65000,
        totalCost: 80 * 65000,
        status: 'Approved',
        supplierOrSubcont: 'Subcont Scaffolding Handal',
        workCategoryCode: 'I',
        remarks: 'Akses kerja ketinggian lambung luar, bow & bulwark',
        createdAt: now,
      },
      {
        id: `eqp-5-${projectId}`,
        projectId,
        category: 'equipment',
        code: 'EQP-005',
        name: 'Pompa Hydrotest Bertekanan 250 Bar (High Pressure Pump)',
        specOrRole: 'Unit Pompa Hydrotest Lengkap Manometer Terkalibrasi',
        qty: 2,
        unit: 'hari',
        unitPrice: 1200000,
        totalCost: 2 * 1200000,
        status: 'Rencana',
        supplierOrSubcont: 'Bengkel Hydrotest Galangan',
        workCategoryCode: 'VIII',
        remarks: 'Pengujian kekuatan & kebocoran jalur pipa dan tangki ballast',
        createdAt: now,
      },

      // 5. SUBCONTRACTOR & SPECIALIZED SERVICES
      {
        id: `sub-1-${projectId}`,
        projectId,
        category: 'subcont',
        code: 'SUB-001',
        name: 'Jasa Ultrasonic Thickness Measurement (UTM) & Endorsement BKI',
        specOrRole: 'Surveyor Bersertifikat BKI untuk Pengukuran Ketebalan Pelat',
        qty: 1,
        unit: 'ls',
        unitPrice: 9500000,
        totalCost: 9500000,
        status: 'Approved',
        supplierOrSubcont: 'PT. Surveyor Marine Indonesia (BKI Approved)',
        workCategoryCode: 'XII',
        remarks: 'Pengukuran ketebalan pelat lambung, tanktop & laporan resmi',
        createdAt: now,
      },
      {
        id: `sub-2-${projectId}`,
        projectId,
        category: 'subcont',
        code: 'SUB-002',
        name: 'Dynamic Balancing Daun Kemudi & Baling-Baling (Propeller)',
        specOrRole: 'Uji Keseimbangan Dinamis di Bengkel Bubut Presisi',
        qty: 2,
        unit: 'unit',
        unitPrice: 4200000,
        totalCost: 2 * 4200000,
        status: 'Rencana',
        supplierOrSubcont: 'Bengkel Bubut Presisi Maritim',
        workCategoryCode: 'IX',
        remarks: 'Propeller Port & Starboard setelah perbaikan pitch & cupping',
        createdAt: now,
      },
      {
        id: `sub-3-${projectId}`,
        projectId,
        category: 'subcont',
        code: 'SUB-003',
        name: 'Kalibrasi Safety Valve, Pressure Gauge & Sertifikasi Disnaker',
        specOrRole: 'Kalibrasi Katup Pengaman Bejana Bertekanan & Alat Ukur',
        qty: 1,
        unit: 'ls',
        unitPrice: 5500000,
        totalCost: 5500000,
        status: 'Rencana',
        supplierOrSubcont: 'Balai Kalibrasi & Sertifikasi Maritim',
        workCategoryCode: 'X',
        remarks: 'Sertifikasi keselamatan katup uap & udara bertekanan',
        createdAt: now,
      },

      // 6. OVERHEAD & FASILITAS GALANGAN
      {
        id: `ovh-1-${projectId}`,
        projectId,
        category: 'overhead',
        code: 'OVH-001',
        name: 'Jasa Fasilitas Naik Dok & Turun Dok (Docking & Undocking)',
        specOrRole: 'Fasilitas Slipway / Graving Dock Termasuk Keel Blocks',
        qty: 1,
        unit: 'ls',
        unitPrice: 18000000,
        totalCost: 18000000,
        status: 'Approved',
        supplierOrSubcont: 'Operasional Galangan',
        workCategoryCode: 'I',
        remarks: 'Pengaturan bantalan dok (keel & bilge blocks), winch docking',
        createdAt: now,
      },
      {
        id: `ovh-2-${projectId}`,
        projectId,
        category: 'overhead',
        code: 'OVH-002',
        name: 'Sambungan Listrik Darat (Shore Connection) & Air Tawar',
        specOrRole: 'Listrik 3 Phase 380V (25 Hari) & Pengisian Air Tawar 60 Ton',
        qty: 25,
        unit: 'hari',
        unitPrice: 480000,
        totalCost: 25 * 480000,
        status: 'Approved',
        supplierOrSubcont: 'Utilitas Dermaga Galangan',
        workCategoryCode: 'II',
        remarks: 'Suplai power kapal selama generator kapal blackout/docking',
        createdAt: now,
      },
      {
        id: `ovh-3-${projectId}`,
        projectId,
        category: 'overhead',
        code: 'OVH-003',
        name: 'Pembuangan & Pengelolaan Limbah Sludge B3 (Oil Spill Control)',
        specOrRole: 'Penyedotan Sludge Tanki & Sertifikat Manifest Limbah B3',
        qty: 1,
        unit: 'ls',
        unitPrice: 6500000,
        totalCost: 6500000,
        status: 'Approved',
        supplierOrSubcont: 'Transporter Limbah B3 Berizin KLHK',
        workCategoryCode: 'V',
        remarks: 'Pengurasan sisa endapan bahan bakar/oli tangki kotor',
        createdAt: now,
      },
    ];
  },

  /**
   * Intelligently auto-generates estimation resources from the existing Repair List Work Items!
   */
  generateFromWorkItems(projectId: string, workItems: WorkItem[]): ProjectResourceItem[] {
    const now = new Date().toISOString();
    const generated: ProjectResourceItem[] = [];

    let totalSteelTonnageKg = 0;
    let totalBlastingAreaM2 = 0;
    let totalPaintingAreaM2 = 0;
    let totalPipeMeters = 0;
    let totalValveCount = 0;

    // Scan through work items to extract metrics
    workItems.forEach((item) => {
      const cat = (item.categoryId || '').toUpperCase();
      const desc = (item.description || '').toLowerCase();
      const unit = (item.unit || '').toLowerCase();

      // Steelwork (Cat VI, VII or keywords)
      if (cat === 'VI' || cat === 'VII' || desc.includes('pelat') || desc.includes('replating') || desc.includes('baja')) {
        const wt = Number(item.weightKg) || (unit === 'kg' ? Number(item.qty) || 0 : 0);
        if (wt > 0) totalSteelTonnageKg += wt;
      }

      // Blasting & Painting (Cat III, IV, V)
      if (cat === 'III' || cat === 'IV' || desc.includes('blast') || desc.includes('cat') || desc.includes('paint')) {
        const area = unit.includes('m2') || unit.includes('m²') ? Number(item.qty) || 0 : 0;
        if (desc.includes('blast')) totalBlastingAreaM2 += area;
        if (desc.includes('cat') || desc.includes('paint')) totalPaintingAreaM2 += area;
      }

      // Piping (Cat VIII)
      if (cat === 'VIII' || desc.includes('pipa') || desc.includes('pipe')) {
        if (unit === 'mtr' || unit === 'm' || unit === 'meter') {
          totalPipeMeters += Number(item.qty) || 0;
        }
      }

      // Valves & Machinery (Cat IX)
      if (cat === 'IX' || desc.includes('katup') || desc.includes('valve') || desc.includes('sea chest')) {
        totalValveCount += Number(item.qty) || 1;
      }
    });

    // Fallbacks if work items have no specific weights yet
    if (totalSteelTonnageKg === 0) totalSteelTonnageKg = 4500;
    if (totalBlastingAreaM2 === 0) totalBlastingAreaM2 = 350;
    if (totalPaintingAreaM2 === 0) totalPaintingAreaM2 = 450;
    if (totalPipeMeters === 0) totalPipeMeters = 30;

    // 1. Generate Steelwork Resources
    const steelRound = Math.round(totalSteelTonnageKg);
    generated.push({
      id: `gen-mat-plate-${Date.now()}`,
      projectId,
      category: 'material',
      code: 'MAT-GEN-01',
      name: `Pelat Baja BKI Grade A (${(steelRound / 1000).toFixed(1)} Ton)`,
      specOrRole: 'Dimensi Variatif 10mm - 14mm BKI Bersertifikat',
      qty: steelRound,
      unit: 'kg',
      weightKg: steelRound,
      unitPrice: 22500,
      totalCost: steelRound * 22500,
      status: 'Rencana',
      remarks: `Dihitung otomatis dari estimasi scope repair list (${steelRound} kg)`,
      createdAt: now,
    });

    // Consumables: Welding Rods (~2.2% of steel tonnage)
    const weldingRodsKg = Math.max(80, Math.round(totalSteelTonnageKg * 0.022));
    generated.push({
      id: `gen-cns-rod-${Date.now()}`,
      projectId,
      category: 'consumable',
      code: 'CNS-GEN-01',
      name: 'Kawat Las Kobelco LB-52 / E7018 Dia 3.2mm',
      specOrRole: `Rasio Standar Galangan 2.2% dari Berat Pelat (${weldingRodsKg} Kg)`,
      qty: weldingRodsKg,
      unit: 'kg',
      unitPrice: 52000,
      totalCost: weldingRodsKg * 52000,
      status: 'Rencana',
      remarks: 'Kebutuhan kawat las fabrikasi pelat',
      createdAt: now,
    });

    // Consumables: Oxygen & LPG
    const oxygenCylinders = Math.max(10, Math.round(totalSteelTonnageKg / 150));
    generated.push({
      id: `gen-cns-oxy-${Date.now()}`,
      projectId,
      category: 'consumable',
      code: 'CNS-GEN-02',
      name: 'Gas Oksigen Botol 6 m³ untuk Cutting & Gouging',
      specOrRole: `Kebutuhan Pemotongan Baja (${oxygenCylinders} Tabung)`,
      qty: oxygenCylinders,
      unit: 'tabung',
      unitPrice: 125000,
      totalCost: oxygenCylinders * 125000,
      status: 'Rencana',
      remarks: 'Gas pemotongan pelat',
      createdAt: now,
    });

    // Manpower: Fitters & Welders
    const fitterDays = Math.max(7, Math.ceil(totalSteelTonnageKg / 300));
    generated.push({
      id: `gen-man-fitter-${Date.now()}`,
      projectId,
      category: 'manpower',
      code: 'MAN-GEN-01',
      name: 'Fitter / Fabrikator Pelat Lambung',
      specOrRole: `Tim Fabrikator Baja (3 Orang x ${fitterDays} Hari)`,
      qty: 3 * fitterDays,
      headcount: 3,
      workDays: fitterDays,
      dailyHours: 8,
      unit: 'mandays',
      unitPrice: 320000,
      totalCost: 3 * fitterDays * 320000,
      status: 'Rencana',
      remarks: 'Fabrikasi dan fitting pelat baru',
      createdAt: now,
    });

    generated.push({
      id: `gen-man-welder-${Date.now()}`,
      projectId,
      category: 'manpower',
      code: 'MAN-GEN-02',
      name: 'Welder 3G / 4G BKI Certified',
      specOrRole: `Tim Pengelasan Pelat (3 Orang x ${fitterDays} Hari)`,
      qty: 3 * fitterDays,
      headcount: 3,
      workDays: fitterDays,
      dailyHours: 8,
      unit: 'mandays',
      unitPrice: 350000,
      totalCost: 3 * fitterDays * 350000,
      status: 'Rencana',
      remarks: 'Pengelasan seam & butt joint',
      createdAt: now,
    });

    // 2. Generate Blasting & Painting Resources
    const copperSlagTon = Math.max(4, Math.round((totalBlastingAreaM2 * 28) / 1000));
    generated.push({
      id: `gen-cns-slag-${Date.now()}`,
      projectId,
      category: 'consumable',
      code: 'CNS-GEN-03',
      name: `Pasir Blasting Copper Slag Sa 2.5 (${copperSlagTon} Ton)`,
      specOrRole: `Rasio 28 kg/m² untuk Area ${totalBlastingAreaM2} m²`,
      qty: copperSlagTon,
      unit: 'ton',
      unitPrice: 1450000,
      totalCost: copperSlagTon * 1450000,
      status: 'Rencana',
      remarks: 'Kebutuhan blasting lambung kapal',
      createdAt: now,
    });

    const paintPails = Math.max(4, Math.ceil(totalPaintingAreaM2 / 65));
    generated.push({
      id: `gen-mat-paint-${Date.now()}`,
      projectId,
      category: 'material',
      code: 'MAT-GEN-02',
      name: `Cat Marine Epoxy Primer (${paintPails} Pail @ 20L)`,
      specOrRole: `Coverage ~5 m²/L untuk Area Luas ${totalPaintingAreaM2} m²`,
      qty: paintPails,
      unit: 'pail',
      unitPrice: 3850000,
      totalCost: paintPails * 3850000,
      status: 'Rencana',
      remarks: 'Cat primer dasar anti karat',
      createdAt: now,
    });

    const blastDays = Math.max(3, Math.ceil(totalBlastingAreaM2 / 100));
    generated.push({
      id: `gen-man-blaster-${Date.now()}`,
      projectId,
      category: 'manpower',
      code: 'MAN-GEN-03',
      name: 'Operator Sandblasting & Painter',
      specOrRole: `Tim Blasting & Coating (4 Orang x ${blastDays} Hari)`,
      qty: 4 * blastDays,
      headcount: 4,
      workDays: blastDays,
      dailyHours: 8,
      unit: 'mandays',
      unitPrice: 300000,
      totalCost: 4 * blastDays * 300000,
      status: 'Rencana',
      remarks: 'Pembersihan karat dan pengecatan lambung',
      createdAt: now,
    });

    // 3. Equipment: Compressor & Crane
    generated.push({
      id: `gen-eqp-comp-${Date.now()}`,
      projectId,
      category: 'equipment',
      code: 'EQP-GEN-01',
      name: 'Air Compressor 375 CFM Diesel (Blasting)',
      specOrRole: `Durasi Operasi Blasting (${blastDays} Hari)`,
      qty: blastDays,
      unit: 'hari',
      unitPrice: 1850000,
      totalCost: blastDays * 1850000,
      status: 'Rencana',
      remarks: 'Kompresor udara bertekanan tinggi',
      createdAt: now,
    });

    generated.push({
      id: `gen-eqp-crane-${Date.now()}`,
      projectId,
      category: 'equipment',
      code: 'EQP-GEN-02',
      name: 'Mobile Crane 25 Ton (Penanganan Material & Langsir)',
      specOrRole: 'Lifting Pelat & Peralatan Kapal',
      qty: 24,
      unit: 'jam',
      unitPrice: 650000,
      totalCost: 24 * 650000,
      status: 'Rencana',
      remarks: 'Alat angkat berat galangan',
      createdAt: now,
    });

    // 4. Subcontractor & Overhead
    generated.push({
      id: `gen-sub-utm-${Date.now()}`,
      projectId,
      category: 'subcont',
      code: 'SUB-GEN-01',
      name: 'Jasa Ultrasonic Thickness Measurement (UTM) & BKI Endorsement',
      specOrRole: 'Pengukuran Ketebalan Pelat Lambung & Sertifikasi Klas',
      qty: 1,
      unit: 'ls',
      unitPrice: 9500000,
      totalCost: 9500000,
      status: 'Rencana',
      remarks: 'Laporan resmi survey ketebalan pelat',
      createdAt: now,
    });

    generated.push({
      id: `gen-ovh-dock-${Date.now()}`,
      projectId,
      category: 'overhead',
      code: 'OVH-GEN-01',
      name: 'Fasilitas Naik-Turun Dok (Docking & Undocking) & Utilitas',
      specOrRole: 'Penggunaan Fasilitas Slipway & Sambung Listrik Darat',
      qty: 1,
      unit: 'ls',
      unitPrice: 22000000,
      totalCost: 22000000,
      status: 'Approved',
      remarks: 'Overhead pokok docking galangan',
      createdAt: now,
    });

    this.saveResources(projectId, generated);
    return generated;
  },

  /**
   * Export items into clean CSV format ready for Excel
   */
  exportToCsv(items: ProjectResourceItem[], vessel: VesselSpec, summary: ResourceSummary): void {
    const vesselName = vessel?.name || 'KAPAL';
    const projectNo = vessel?.projectNo || 'PROJ';

    const headers = [
      'No',
      'Kategori',
      'Kode',
      'Nama Kebutuhan / Pos Anggaran',
      'Spesifikasi / Kualifikasi Teknis',
      'Jumlah (Qty)',
      'Satuan',
      'Headcount (Org)',
      'Hari Kerja',
      'Total Mandays',
      'Harga Satuan (Rp)',
      'Total Biaya (Rp)',
      'Status',
      'Vendor / Supplier',
      'Keterangan',
    ];

    const rows = items.map((item, idx) => {
      const mandays =
        item.headcount && item.workDays ? item.headcount * item.workDays : item.unit === 'mandays' ? item.qty : '-';
      return [
        idx + 1,
        `"${item.category.toUpperCase()}"`,
        `"${item.code || '-'}"`,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${(item.specOrRole || '').replace(/"/g, '""')}"`,
        item.qty || 0,
        `"${item.unit || '-'}"`,
        item.headcount || '-',
        item.workDays || '-',
        mandays,
        item.unitPrice || 0,
        item.totalCost || 0,
        `"${item.status || 'Rencana'}"`,
        `"${(item.supplierOrSubcont || '-').replace(/"/g, '""')}"`,
        `"${(item.remarks || '-').replace(/"/g, '""')}"`,
      ].join(',');
    });

    // Summary block
    const summaryBlock = [
      '',
      `"REKAPITULASI KEBUTUHAN PROYEK - ${vesselName} (${projectNo})"`,
      `"Total Biaya Material (Bahan Baku Utama)","Rp ${summary.totalMaterialCost.toLocaleString('id-ID')}"`,
      `"Total Biaya Man Power (Tenaga Kerja & Mandays)","Rp ${summary.totalManpowerCost.toLocaleString('id-ID')}"`,
      `"Total Biaya Consumables (Bahan Habis Pakai)","Rp ${summary.totalConsumableCost.toLocaleString('id-ID')}"`,
      `"Total Biaya Equipment & Sewa Alat","Rp ${summary.totalEquipmentCost.toLocaleString('id-ID')}"`,
      `"Total Biaya Subkontraktor & Jasa Spesialis","Rp ${summary.totalSubcontCost.toLocaleString('id-ID')}"`,
      `"Total Biaya Overhead & Fasilitas Galangan","Rp ${summary.totalOverheadCost.toLocaleString('id-ID')}"`,
      `"GRAND TOTAL KEBUTUHAN DASAR","Rp ${summary.grandTotalResourceCost.toLocaleString('id-ID')}"`,
      `"Buffer Kontingensi Proyek (${summary.contingencyPercent}%)","Rp ${summary.contingencyAmount.toLocaleString('id-ID')}"`,
      `"TOTAL ESTIMASI ANGGARAN KEBUTUHAN PROYEK","Rp ${summary.finalProjectBudget.toLocaleString('id-ID')}"`,
      `"Total Estimasi Mandays Tenaga Kerja","${summary.totalMandays} Mandays"`,
      `"Total Estimasi Tonase Material Baja","${(summary.totalMaterialTonnageKg / 1000).toFixed(2)} Ton"`,
    ];

    const csvContent =
      '\uFEFF' +
      [
        `"ESTIMASI KEBUTUHAN PROYEK GALANGAN KAPAL (BILL OF RESOURCES)"`,
        `"Nama Kapal: ${vesselName} | No. Proyek: ${projectNo} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}"`,
        '',
        headers.join(','),
        ...rows,
        '',
        ...summaryBlock,
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Estimasi_Kebutuhan_Material_Manpower_${vesselName.replace(/\s+/g, '_')}_${projectNo}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
