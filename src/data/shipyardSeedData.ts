import { VesselSpec, ProjectSchedule, WorkCategory, WorkItem, DefectSurvey, Signatures } from '../types';

export const DEFAULT_VESSEL: VesselSpec = {
  id: 'vessel-ksa-bintang',
  name: 'TB. KSA BINTANG',
  dimension: '23,97 x 7,26 x 3,00 Meter',
  vesselType: 'Tug Boat',
  dockingType: 'Docking Repair',
  companyOwner: 'PT. PELAYARAN KARTIKA SAMUDRA ADIJAYA',
  projectNo: 'F-049',
  classification: 'BKI',
  kindOfSurvey: 'Intermediate Survey No. 5',
  photoUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=600&q=80',
};

export const DEFAULT_SCHEDULE: ProjectSchedule = {
  id: 'proj-f049',
  vesselId: 'vessel-ksa-bintang',
  arriveBgn: 'Kamis, 03 September 2026',
  startContract: 'Jumat, 04 September 2026',
  arrivalMeeting: '-',
  dockingDate: 'Senin, 07 September 2026',
  undockingDate: 'Kamis, 01 Oktober 2026',
  finishWork: 'Jumat, 02 Oktober 2026',
  sailOut: 'Senin, 05 Oktober 2026',
  dockingPosition: '#5',
  dockingDurationDays: 25,
  status: 'In Progress',
};

export const DEFAULT_CATEGORIES: WorkCategory[] = [
  { id: 'cat-1', code: 'I', name: 'Docking Undocking', sortOrder: 1 },
  { id: 'cat-2', code: 'II', name: 'General Service', sortOrder: 2 },
  { id: 'cat-3', code: 'III', name: 'Blasting & Painting', sortOrder: 3 },
  { id: 'cat-4', code: 'IV', name: 'Supply Paint', sortOrder: 4 },
  { id: 'cat-5', code: 'V', name: 'Cleaning', sortOrder: 5 },
  { id: 'cat-6', code: 'VI', name: 'Outfitting', sortOrder: 6 },
  { id: 'cat-7', code: 'VII', name: 'Steelwork', sortOrder: 7 },
  { id: 'cat-8', code: 'VIII', name: 'Piping work', sortOrder: 8 },
  { id: 'cat-9', code: 'IX', name: 'Mechanical Work', sortOrder: 9 },
  { id: 'cat-10', code: 'X', name: 'Electrical', sortOrder: 10 },
  { id: 'cat-11', code: 'XI', name: 'Carpentry', sortOrder: 11 },
  { id: 'cat-12', code: 'XII', name: 'Others', sortOrder: 12 },
];

export const DEFAULT_SIGNATURES: Signatures = {
  preparedByName: 'Muhammad Munthaha',
  preparedByTitle: 'PPC',
  reviewedByName: 'Muhammad Fadel R',
  reviewedByTitle: 'Project Leader',
  verifiedByName: 'Capt. Hendra Gunawan',
  verifiedByTitle: 'Owner Representative',
};

export const DEFAULT_WORK_ITEMS: WorkItem[] = [];

export const DEFAULT_DEFECT_SURVEYS: DefectSurvey[] = [
  {
    id: 'surv-1',
    projectId: 'proj-f049',
    locationZone: 'Bulwark PS (Fr. 14 - 18)',
    defectDescription: 'Pelat bulwark keropos berat terkorosi air laut, ketebalan tersisa < 4mm (degradasi > 50%)',
    length: 3.5,
    width: 1.0,
    thickness: 8.0,
    plateType: 'Grade BKI',
    calculatedWeightKg: 219.80,
    syncStatus: 0,
    createdAt: '2026-09-01 09:30',
    remedyAction: 'Crop & Renew Plate 8mm',
  },
  {
    id: 'surv-2',
    projectId: 'proj-f049',
    locationZone: 'Side Shell Stbd (Fr. 20 - 32)',
    defectDescription: 'Deformasi dan penipisan pelat lambung kanan akibat benturan dermaga',
    length: 8.5,
    width: 1.5,
    thickness: 10.0,
    plateType: 'Grade ABS',
    calculatedWeightKg: 1000.88,
    syncStatus: 0,
    createdAt: '2026-09-02 11:15',
    remedyAction: 'Replating Side Shell 10mm',
  },
  {
    id: 'surv-3',
    projectId: 'proj-f049',
    locationZone: 'Main Deck Area Fr. 25-28 (ps)',
    defectDescription: 'Pelat geladak aus dan bergelombang di sekitar winch',
    length: 3.0,
    width: 1.15,
    thickness: 10.0,
    plateType: 'Grade BKI',
    calculatedWeightKg: 270.83,
    syncStatus: 0,
    createdAt: '2026-09-03 14:00',
    remedyAction: 'Renew Deck Plate 10mm',
  },
  {
    id: 'surv-4',
    projectId: 'proj-f049',
    locationZone: 'Bottom Plate Stbd (Sludge Tank)',
    defectDescription: 'Pelat dasar lambung kanan keropos dan berlubang mikro dekat bilge well',
    length: 6.1,
    width: 1.83,
    thickness: 10.0,
    plateType: 'Grade NC',
    calculatedWeightKg: 876.30,
    syncStatus: 0,
    createdAt: '2026-09-04 16:45',
    remedyAction: 'Replating Bottom Plate 10mm + Bongkar pasang sludge tank',
  },
];
