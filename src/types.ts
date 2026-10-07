export interface VesselSpec {
  id: string;
  name: string;
  dimension: string; // e.g. "23,97 x 7,26 x 3,00 Meter"
  vesselType: string; // e.g. "Tug Boat"
  dockingType: string; // e.g. "Docking Repair"
  companyOwner: string; // e.g. "PT. PELAYARAN KARTIKA SAMUDRA ADIJAYA"
  projectNo: string; // e.g. "F-049"
  classification: string; // e.g. "BKI"
  kindOfSurvey: string; // e.g. "Intermediate Survey No. 5"
  photoUrl?: string; // URL or Base64 Data URL of vessel photo
}

export interface ProjectSchedule {
  id: string;
  vesselId: string;
  arriveBgn: string; // e.g. "Kamis, 03 September 2026"
  startContract: string; // e.g. "Jumat, 04 September 2026"
  arrivalMeeting: string; // e.g. "-"
  dockingDate: string; // e.g. "Senin, 07 September 2026"
  undockingDate: string; // e.g. "Kamis, 01 Oktober 2026"
  finishWork: string; // e.g. "Jumat, 02 Oktober 2026"
  sailOut: string; // e.g. "Senin, 05 Oktober 2026"
  dockingPosition: string; // e.g. "#5"
  dockingDurationDays: number; // e.g. 25
  status: 'In Progress' | 'Under Docking' | 'Completed' | 'Preparation';
  actualStartContract?: string;
  actualDockingDate?: string;
  actualUndockingDate?: string;
  actualFinishWork?: string;
  actualSailOut?: string;
}

export interface WorkCategory {
  id: string;
  code: string; // e.g. "I", "II", "III", "VII"
  name: string; // e.g. "Docking Undocking", "Steelwork"
  sortOrder: number;
}

export interface WorkItem {
  id: string;
  projectId: string;
  categoryId: string; // category code or id
  itemNo: string; // e.g. "1", "1.1", "1.1.1" or "a", "b"
  description: string;
  type?: string; // e.g. "PL ABS", "PL BKI", "PL NC", "PP B", "FB", "UA", "FLG"
  d1?: string; // Dimension 1 (Length or OD, etc.)
  d2?: string; // Dimension 2 (Width or WT, etc.)
  d3?: string; // Dimension 3 (Thickness mm or Schedule, etc.)
  dLen?: string; // Dimension Length (Ukuran Panjang Siku, Pipa, H-Beam, Round Bar, Flat Bar, Square Bar)
  d4?: string; // Dimension 4 (Pengali/Pcs, etc.)
  qty: number;
  unit: string; // e.g. "au", "day", "m²", "kg", "unit", "Pcs", "ls", "Set", "Ea"
  weightKg?: number; // Calculated steel/pipe tonnage in kg
  unitPrice: number; // Unit price in IDR for cost estimation
  priceBasis?: 'qty' | 'weight'; // Calculation basis: multiply unitPrice by qty OR weightKg
  totalPrice: number; // Calculated unitPrice * qty or unitPrice * weightKg
  remark?: string; // e.g. "1 Sep 2026", "7 Sep 2026", "material owner"
  remark2?: string;
  isCompleted?: boolean;
  notes?: string;
  parentId?: string; // ID of parent WorkItem (e.g. parent Area or parent Sub-system)
  itemLevel?: number; // 1 = Area Header (Judul Area), 2 = Sub-System / Pekerjaan Utama, 3 = Detail Komponen
  isAreaHeader?: boolean; // True if this item represents an Area/Header (e.g. "1. Bottom Area")
  progressPercent?: number; // 0 - 100 (%)
  progressQty?: number; // Angka riil kuantitas / volume yang terealisasi
  progressNotes?: string; // Catatan status / kendala progres lapangan
  progressDate?: string; // Tanggal update status progres
  startDate?: string; // YYYY-MM-DD e.g. "2026-09-07" (Plan Start)
  targetEndDate?: string; // YYYY-MM-DD e.g. "2026-09-20" (Plan Finish)
  actualStartDate?: string; // YYYY-MM-DD e.g. "2026-09-08" (Actual Start)
  actualEndDate?: string; // YYYY-MM-DD e.g. "2026-09-18" (Actual Finish)
  planPercent?: number; // 0 - 100 (%)
  weightFactor?: number; // Bobot persentase (%) item dalam proyek
  assignedTo?: string; // Pelaksana / Tim Bengkel / Subkontraktor
  subcontractor?: string; // Nama Vendor / Subkontraktor Pelaksana (alias/sinonim assignedTo)
  opnameStatus?: 'Belum Diperiksa' | 'Dalam Pemeriksaan' | 'Terverifikasi' | 'Revisi / Temuan' | 'Ditolak';
  opnameQty?: number; // Kuantitas / Volume hasil opname fisik di lapangan
  opnamePercent?: number; // Persentase opname fisik terverifikasi (0 - 100 %)
  opnameDate?: string; // Tanggal verifikasi opname (YYYY-MM-DD)
  opnameInspector?: string; // Auditor / QC Inspector / Surveyor Verifikator
  opnameNotes?: string; // Catatan hasil audit / temuan lapangan
  opnameBapoNo?: string; // Nomor Berita Acara Pemeriksaan Opname (BAPO)
  updatedAt?: string; // ISO 8601 string, e.g. "2026-09-13T14:30:00.000Z"
  updatedBy?: string; // e.g. "Muhammad Munthaha (PPC)"
  updatedByUserId?: string; // User ID
  updatedAction?: 'created' | 'updated' | 'dimension_changed' | 'progress_updated' | 'status_changed' | 'reordered' | 'deleted';
  dailyLogs?: Record<string, WorkItemDailyLog>; // Key: "YYYY-MM-DD" e.g. "2026-09-18"
  planLogs?: Record<string, number>; // Key: "YYYY-MM-DD" -> Plan % (0 - 100)
  isCustomRabItem?: boolean; // True if created as additional item directly in RAB tab
  hasValidationIssue?: boolean; // Flag to indicate if row has pre-import validation issues (empty description / invalid sequence)
  validationIssueMessage?: string; // Informative message describing the validation issue
}

export interface WorkItemDailyLog {
  dateStr: string; // "YYYY-MM-DD"
  percentAchieved: number; // Cumulative % at this date (0 - 100)
  dailyDeltaPercent?: number; // Delta progress achieved on this day (+%)
  dailyDeltaQty?: number; // Delta physical volume on this day
  notes?: string; // Daily remarks / technical notes
  manpower?: number; // Number of workers deployed
  weather?: 'Cerah' | 'Berawan' | 'Hujan Ringan' | 'Hujan Lebat' | 'Gelombang Tinggi';
  status?: 'Normal' | 'Behind' | 'Obstacle' | 'Completed';
  loggedBy?: string;
  loggedAt?: string;
}

export interface ProjectDailyReport {
  dateStr: string; // "YYYY-MM-DD"
  dayIndex: number; // 1, 2, ...
  weather?: 'Cerah' | 'Berawan' | 'Hujan Ringan' | 'Hujan Lebat' | 'Gelombang Tinggi';
  manpowerTotal?: number;
  shift?: 'Day' | 'Night' | '24h';
  generalNotes?: string;
  obstacles?: string;
  supervisorName?: string;
  reviewedByPpc?: boolean;
  updatedAt?: string;
}

export interface SCurveDataPoint {
  dayIndex: number; // 1, 2, 3, ...
  dateStr: string; // "2026-09-07"
  formattedDate: string; // "07 Sep 2026"
  dayName: string; // "Senin", "Selasa", dll.
  weekNumber: number; // 1, 2, 3, 4, ...
  
  // Cumulative percentages (0 - 100%)
  plannedCumulative: number; // % Rencana Kumulatif
  actualCumulative: number | null; // % Realisasi Kumulatif (null jika hari yang belum tiba)
  
  // Periodic / Daily percentages
  plannedDaily: number;
  actualDaily: number | null;
  
  // Variance
  deviation: number | null; // actualCumulative - plannedCumulative
  
  isToday: boolean;
  isPastOrToday: boolean;
  milestoneTitle?: string;
  milestoneDesc?: string;
}

export interface SCurveWeeklySummary {
  weekNumber: number;
  startDateStr: string;
  endDateStr: string;
  label: string; // "Minggu 1 (07 Sep - 13 Sep)"
  plannedWeekly: number;
  actualWeekly: number | null;
  plannedCumulative: number;
  actualCumulative: number | null;
  deviation: number | null;
  status: 'Ahead' | 'On Track' | 'Behind' | 'Upcoming';
}

export interface SCurveSummary {
  totalPlannedToDate: number;
  totalActualToDate: number;
  deviation: number; // positive = ahead, negative = behind
  scheduleStatus: 'Ahead' | 'On Track' | 'Behind' | 'Critical';
  totalCompletedItems: number;
  totalInProgressItems: number;
  totalNotStartedItems: number;
  totalItems: number;
  overallWeightSum: number;
  daysElapsed: number;
  daysRemaining: number;
  totalDurationDays: number;
  projectStartDate: string;
  projectEndDate: string;
  currentDayIndex: number;
}

export interface SCurveCategoryProgress {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  weightFactor: number; // Total bobot kategori (%)
  plannedCumulative: number;
  actualCumulative: number;
  deviation: number;
  completedCount: number;
  totalCount: number;
}

export interface WorkItemAuditLog {
  id: string;
  projectId?: string;
  workItemId: string;
  itemNo: string;
  description: string;
  action: 'created' | 'updated' | 'dimension_changed' | 'progress_updated' | 'status_changed' | 'reordered' | 'deleted';
  changedBy: string;
  changedByRole?: string;
  changedByUserId?: string;
  timestamp: string; // ISO timestamp
  details?: string;
  changesJson?: string;
}

export type MaterialCategory =
  | 'plate' // Pelat Baja Biasa (ABS / BKI / NC)
  | 'pipe' // Pipa Baja (Sch 40, Sch 80, Sch 160, dll)
  | 'hbeam' // H-Beam & WF Beam
  | 'angle' // Angle Bar / Besi Siku L
  | 'flatbar' // Flat Bar / Plat Strip
  | 'roundbar' // Round Bar / Besi As
  | 'squarebar' // Square Bar / Besi Nako
  | 'grating' // Grating Plate / Steel Grating
  | 'bordes' // Plate Bordes / Chequered Plate
  | 'channel'; // Channel Bar / UNP

export type SteelPlateGrade = 'ABS' | 'BKI' | 'NC';

export interface SteelPlateGradeOption {
  grade: SteelPlateGrade;
  name: string;
  fullName: string;
  code: string;
  density: number; // 7.85 kg/dm³
  unitPrice: number; // Estimasi harga Rp / kg
  badgeColor: string;
  description: string;
}

export const STEEL_PLATE_GRADES: SteelPlateGradeOption[] = [
  {
    grade: 'ABS',
    name: 'ABS',
    fullName: 'ABS (American Bureau of Shipping)',
    code: 'PL ABS',
    density: 7.85,
    unitPrice: 52000,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Sertifikasi Klasifikasi Internasional IACS (Marine Class ABS)',
  },
  {
    grade: 'BKI',
    name: 'BKI',
    fullName: 'BKI (Biro Klasifikasi Indonesia)',
    code: 'PL BKI',
    density: 7.85,
    unitPrice: 48000,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Sertifikasi Klasifikasi Nasional (Marine Class BKI Grade A)',
  },
  {
    grade: 'NC',
    name: 'NC',
    fullName: 'NC (Non-Class / Non-Komersil)',
    code: 'PL NC',
    density: 7.85,
    unitPrice: 42000,
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Pelat Baja Non-Class untuk konstruksi umum, sekat & lining',
  },
];

export interface MaterialOption {
  id: string;
  name: string;
  category: MaterialCategory;
  standard: string;
  nominalSize: string;
  schedule?: string;
  weightPerUnit: number; // kg per meter or kg per m²
  unitLabel: 'kg/m' | 'kg/m²';
  dimensions?: {
    d1?: string;
    d2?: string;
    d3?: string;
    dLen?: string;
    d4?: string;
  };
}

export interface DefectSurvey {
  id: string;
  projectId: string;
  locationZone: string; // e.g. "TK1", "Main Deck", "Bulwark PS Fr. 12-18"
  defectDescription: string; // e.g. "Pelat Keropos & Tipis", "Retak pada sambungan las"
  length: number; // in meters (from user's Flutter model)
  width: number; // in meters
  thickness: number; // in mm
  plateType?: string; // "Mild Steel (7.85)", "High Tensile (7.85)", "Stainless Steel (7.93)"
  calculatedWeightKg: number; // Real-time tonnage calculation
  syncStatus: number; // 0 = local/offline, 1 = synced
  photoUrl?: string;
  createdAt: string;
  transferredToWorkItemId?: string;
  remedyAction?: string; // e.g. "Crop & Renew Plate", "Doubler Plate", "Fairing"
  materialCategory?: MaterialCategory;
  materialName?: string;
  specDetails?: string;
  outerDiameterMm?: number;
  wallThicknessMm?: number;
  qty?: number;
}

export interface Signatures {
  preparedByName: string; // Muhammad Munthaha
  preparedByTitle: string; // PPC
  reviewedByName: string; // Muhammad Fadel R
  reviewedByTitle: string; // Project Leader
  verifiedByName: string; // Owner Representative
  verifiedByTitle: string; // Marine Superintendent / Inspector
}

export type UserRole =
  | 'PPC'
  | 'Project Leader'
  | 'Owner Representative'
  | 'BKI Surveyor'
  | 'Yard Manager'
  | 'Site Inspector';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  title: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
  initials: string;
}

export interface ShipyardProject {
  id: string;
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  categories: WorkCategory[];
  workItems: WorkItem[];
  opnameItems?: WorkItem[];
  defectSurveys: DefectSurvey[];
  signatures: Signatures;
  lastModified: string;
  createdAt: string;
  status: 'In Progress' | 'Under Docking' | 'Completed' | 'Preparation';
  totalItemsCount?: number;
  progressPercent?: number;
  estimatedCost?: number;
  materialEstimates?: ProjectMaterialEstimate[];
}

export interface CostSummary {
  totalTonnageKg: number;
  totalWorkItems: number;
  subtotalByCategory: Record<string, { name: string; amount: number; tonnage: number }>;
  totalBaseCost: number;
  marginPercent: number;
  ppnPercent: number;
  grandTotalCost: number;
  totalCost?: number;
}

export type ResourceCategory = 'material' | 'manpower' | 'consumable' | 'equipment' | 'subcont' | 'overhead';

export interface ProjectResourceItem {
  id: string;
  projectId: string;
  category: ResourceCategory; // 'material' | 'manpower' | 'consumable' | 'equipment' | 'subcont' | 'overhead'
  code?: string; // e.g. "MAT-001", "MAN-002", "CNS-003", "EQP-001"
  name: string; // e.g. "Pelat Baja BKI Grade A", "Welder 6G (SMAW)", "Kawat Las LB-52", "Mobile Crane 25T"
  specOrRole?: string; // e.g. "12mm x 1500 x 6000", "Sertifikasi BKI", "Dia 3.2mm / AWS E7018", "Termasuk Operator"
  workCategoryCode?: string; // Optional link to WorkCategory: 'VI', 'III', 'VIII', etc. or 'all'
  workItemId?: string; // Optional link to specific WorkItem
  
  // Quantity & Units
  qty: number; // e.g. 5000 (kg), 10 (orang), 50 (sak/roll), 24 (jam)
  unit: string; // e.g. "kg", "lembar", "btg", "orang", "mandays", "jam", "tabung", "sak", "pail", "unit-hari", "ls"
  
  // Specific Manpower fields
  headcount?: number; // Jumlah orang (misal 4 orang)
  workDays?: number; // Durasi hari kerja (misal 7 hari) -> total mandays = headcount * workDays
  dailyHours?: number; // Jam kerja per hari (default 8)
  
  // Specific Material fields
  weightKg?: number; // Jika material baja / pipa
  
  // Costing
  unitPrice: number; // Harga satuan (Rp/unit, Rp/manday, Rp/jam, Rp/kg)
  totalCost: number; // qty * unitPrice (or headcount * workDays * unitPrice for manpower)
  
  // Procurement / Operational status
  status?: 'Rencana' | 'Approved' | 'PO Issued' | 'On Yard' | 'Terpakai';
  supplierOrSubcont?: string; // Nama vendor / toko / supplier
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceSummary {
  totalMaterialCost: number;
  totalManpowerCost: number;
  totalConsumableCost: number;
  totalEquipmentCost: number;
  totalSubcontCost: number;
  totalOverheadCost: number;
  grandTotalResourceCost: number;
  totalMandays: number;
  totalMaterialTonnageKg: number;
  contingencyPercent: number;
  contingencyAmount: number;
  finalProjectBudget: number;
  itemCountByCategory: Record<ResourceCategory, number>;
}

export type MaterialClassification =
  | 'steel_structure' // Pelat Baja, Siku, UNP, H-Beam, Flat Bar, Round Bar
  | 'piping_fittings' // Pipa Baja Seamless, Flange, Elbow, Tee, Valve, Gasket
  | 'coating_blasting' // Cat Primer, Antifouling, Topcoat, Thinner, Copper Slag Grit
  | 'anodes_cathodic' // Zinc Anode, Aluminium Anode (Proteksi Katodik)
  | 'mechanical_propulsion' // Packing gland, Bushing, Propeller Nut, Shaft Seal, O-Ring
  | 'electrical_nav' // Kabel Marine, Lampu Navigasi, Breaker, Terminal
  | 'welding_consumable' // Kawat Las LB-52/E7018, Gas Oksigen, Gas LPG, Batu Gerinda
  | 'outfitting_hardware' // Baut Mur Marine SS316, Manhole Packing, Shackle, Wire Rope
  | 'timber_carpentry' // Kayu Balok Ganjal, Triplek Marine, Interior Wood
  | 'general_others'; // Material Lain-lain

export type MaterialProcurementStatus =
  | 'Estimasi'
  | 'Diusulkan'
  | 'Disetujui Pimpro'
  | 'PO Issued'
  | 'Tersedia di Yard'
  | 'Sebagian Terpakai'
  | 'Selesai Terpasang';

export interface ProjectMaterialEstimate {
  id: string;
  projectId: string;
  workItemId?: string; // Link to specific WorkItem in Repair List
  workItemNo?: string; // e.g. "1.1", "7.1", "8.2"
  workItemDescription?: string; // Description of the linked repair item
  categoryId: string; // e.g. "cat-7" or "VII"
  categoryCode: string; // "I", "II", "III", "VI", "VII", "VIII", "IX", "X", etc.
  categoryName?: string; // "Steelwork", "Piping work", etc.
  
  // Material details
  materialCode: string; // e.g. "MAT-ST-001", "MAT-PIP-002"
  materialName: string; // e.g. "Pelat Baja Lambung BKI Grade A (Tebal 10mm)"
  classification: MaterialClassification;
  specification: string; // e.g. "1500 x 6000 x 10mm (~707 kg/lbr) Sertifikat BKI"
  
  // Dimensions & Weight
  dimension1?: string; // Length / OD (mm)
  dimension2?: string; // Width / WT (mm)
  dimension3?: string; // Thickness (mm)
  dimensionLen?: string; // Length (mm/m)
  density?: number; // 7.85 kg/dm³
  calculatedWeightKg?: number; // Weight in kg
  
  // Quantities & Costing
  qtyRequired: number; // Jumlah yang dibutuhkan untuk repair
  qtyBufferPercent?: number; // Cadangan / waste factor (e.g. 5% - 10%)
  totalQtyWithBuffer: number; // qtyRequired * (1 + buffer%)
  unit: string; // "lbr", "btg", "kg", "ton", "pail", "liter", "pcs", "set", "roll", "tabung"
  unitPrice: number; // Estimasi harga satuan (Rp)
  totalCost: number; // totalQtyWithBuffer * unitPrice (or calculatedWeightKg * unitPrice)
  priceBasis?: 'qty' | 'weight'; // apakah harga per unit atau per kg
  
  // Procurement & Logistics
  brandOrStandard?: string; // e.g. "Krakatau Steel / BKI Grade A", "Jotun TDS", "Kobelco"
  supplierName?: string; // e.g. "PT. Krakatau Steel", "Distributor Jotun Surabaya"
  procurementStatus: MaterialProcurementStatus;
  leadTimeDays?: number; // Estimasi waktu pengiriman (hari)
  locationOrTarget?: string; // Target lokasi pemasangan (e.g. "Bottom Plate Fr. 12-18", "Sea Chest Main")
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialEstimateSummary {
  totalEstimatedCost: number;
  totalSteelWeightKg: number;
  totalSteelWeightTons: number;
  totalPaintLiters: number;
  totalAbrasiveTons: number;
  totalPipeMeters: number;
  totalAnodesCount: number;
  totalItemsCount: number;
  linkedWorkItemsCount: number;
  costByClassification: Record<MaterialClassification, number>;
  countByClassification: Record<MaterialClassification, number>;
  statusCounts: Record<MaterialProcurementStatus, number>;
}


