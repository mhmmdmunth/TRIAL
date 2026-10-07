import ExcelJS from 'exceljs';
import {
  VesselSpec,
  ProjectSchedule,
  WorkCategory,
  WorkItem,
  Signatures,
  MaterialEstimateSummary,
} from '../types';
import { TonnageCalculator } from './tonnageCalculator';
import { generateImportTemplate } from './fileImport';

interface FlatTreeRow {
  item: WorkItem;
  type: 'area' | 'subsystem' | 'component';
  level: 1 | 2 | 3;
  rowIndex?: number;
  childRowIndices?: number[];
  childRowsCount?: number;
}

function getCategoryTree(categoryItems: WorkItem[]) {
  const getLevelOfItem = (item: WorkItem): 1 | 2 | 3 => {
    if (item.itemLevel === 1 || item.isAreaHeader) return 1;
    if (item.itemLevel === 2) return 2;
    if (item.itemLevel === 3) return 3;

    if (item.parentId) {
      const p = categoryItems.find(i => i.id === item.parentId);
      if (p) {
        const pLvl = getLevelOfItem(p);
        return pLvl === 1 ? 2 : 3;
      }
    }

    const parts = item.itemNo.trim().split('.');
    if (parts.length === 1 && (!item.type || item.type === '')) return 1;
    if (parts.length === 2) return 2;
    if (parts.length >= 3) return 3;
    return 3;
  };

  const areas: WorkItem[] = [];
  const subSystems: WorkItem[] = [];
  const components: WorkItem[] = [];

  categoryItems.forEach(item => {
    const lvl = getLevelOfItem(item);
    if (lvl === 1) areas.push(item);
    else if (lvl === 2) subSystems.push(item);
    else components.push(item);
  });

  return { areas, subSystems, components };
}

function calculateDynamicRowHeight(
  rowValues: Array<{ text: string | number | undefined | null; colWidth: number }>,
  baseHeight: number = 22,
  lineHeight: number = 14
): number {
  let maxLines = 1;
  for (const item of rowValues) {
    if (item.text === undefined || item.text === null || item.text === '') continue;
    const str = String(item.text);
    const paragraphs = str.split(/\r?\n/);
    let totalLinesForCell = 0;
    for (const p of paragraphs) {
      if (p.length === 0) {
        totalLinesForCell += 1;
        continue;
      }
      const effectiveColWidth = Math.max(8, item.colWidth - 2);
      const lines = Math.max(1, Math.ceil(p.length / effectiveColWidth));
      totalLinesForCell += lines;
    }
    if (totalLinesForCell > maxLines) {
      maxLines = totalLinesForCell;
    }
  }
  return Math.max(baseHeight, maxLines * lineHeight + 6);
}

function getWeightFormula(item: WorkItem, r: number): string | null {
  const matType = (item.type || '').toUpperCase();
  const descLower = (item.description || '').toLowerCase();

  // Columns in Excel: F: D1 (mm/m), G: D2 (mm), H: D3 (mm), I: Panjang dLen (mm), J: D4 (Qty/Profile), K: Qty, L: Satuan
  // 1. Pelat / Plate (PL)
  if (matType.startsWith('PL') || matType.includes('PLATE') || matType.includes('PELAT') || descLower.includes('pelat') || descLower.includes('plate')) {
    return `F${r}*G${r}*H${r}*0.00000785*K${r}`;
  }
  // 2. Chequered Plate / Bordes
  if (matType.startsWith('CQR') || matType.includes('BORDES') || matType.includes('CHEQUER') || descLower.includes('bordes')) {
    return `(F${r}*G${r}/1000000)*(IF(H${r}>0,H${r},12)*7.85+2.1014)*IF(J${r}>0,J${r},K${r})`;
  }
  // 3. Steel Grating
  if (matType.startsWith('GR') || matType.includes('GRATING') || descLower.includes('grating')) {
    return `(F${r}*G${r}/1000000)*(IF(H${r}>0,H${r},37.037))*IF(J${r}>0,J${r},K${r})`;
  }
  // 4. Pipe / Pipa (PP)
  if (matType.startsWith('PP') || matType.startsWith('PIPE') || matType.startsWith('PIPA') || descLower.includes('pipa')) {
    return `(G${r}-H${r})*H${r}*0.0246615*(IF(I${r}>0,I${r}/1000,IF(F${r}>100,F${r}/1000,6)))*IF(J${r}>0,J${r},K${r})`;
  }
  // 5. Round Bar / Besi As (RB)
  if (matType.startsWith('RB') || matType.startsWith('ROUND') || matType.startsWith('AS ') || descLower.includes('besi as')) {
    return `0.006165*F${r}*F${r}*(IF(I${r}>0,I${r}/1000,6))*IF(J${r}>0,J${r},K${r})`;
  }
  // 6. Flat Bar / Plat Strip (FB)
  if (matType.startsWith('FB') || matType.includes('FLAT') || descLower.includes('flat bar') || descLower.includes('plat strip')) {
    return `F${r}*H${r}*0.00785*(IF(I${r}>0,I${r}/1000,6))*IF(J${r}>0,J${r},K${r})`;
  }
  // 7. Square Bar / Nako (SB)
  if (matType.startsWith('SB') || matType.includes('SQUARE') || matType.includes('NAKO') || descLower.includes('nako')) {
    return `H${r}*H${r}*0.00785*(IF(I${r}>0,I${r}/1000,6))*IF(J${r}>0,J${r},K${r})`;
  }
  // 8. Angle Bar / Besi Siku (EA / UA / L)
  if (matType.startsWith('EA') || matType.startsWith('UA') || matType.startsWith('L') || matType.includes('ANGLE') || descLower.includes('siku')) {
    return `(F${r}+IF(G${r}>0,G${r},F${r})-H${r})*H${r}*0.00785*(IF(I${r}>0,I${r}/1000,6))*IF(J${r}>0,J${r},K${r})`;
  }

  // Fallback formula if unit is meter/m or general
  return `IF(OR(L${r}="m",L${r}="meter"), (I${r}*K${r})/1000, 0)`;
}

export interface GenerateExcelOptions {
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  categories: WorkCategory[];
  workItems: WorkItem[];
  signatures: Signatures;
  includePrices?: boolean;
  singleSheetOnly?: boolean;
}

export async function exportTemplate(
  categories: WorkCategory[],
  workItems?: WorkItem[],
  vesselName?: string
): Promise<void> {
  const sampleItems: WorkItem[] = (workItems && workItems.length > 0)
    ? workItems
    : [
        { id: 'tpl-1', projectId: 'sample-project', categoryId: 'cat-1', itemNo: '1', description: 'Pelayanan Docking & Undocking Kapal', itemLevel: 3, qty: 1, unit: 'ls', unitPrice: 35000000, totalPrice: 35000000, remark: 'Sesuai Kontrak' },
        { id: 'tpl-2', projectId: 'sample-project', categoryId: 'cat-7', itemNo: '1', description: 'PELAT KULIT LAMBUNG (SHELL PLATING)', itemLevel: 1, isAreaHeader: true, qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Hull Area' },
        { id: 'tpl-3', projectId: 'sample-project', categoryId: 'cat-7', itemNo: '1.1', description: 'BOTTOM PLATING FR. 20 - 35', itemLevel: 2, parentId: 'tpl-2', qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Plating' },
        { id: 'tpl-4', projectId: 'sample-project', categoryId: 'cat-7', itemNo: '1.1.1', description: 'Ganti Pelat Bottom Lajur A Tebal 12mm BKI Grade A', notes: 'Pelat Bottom', type: 'PL', d1: '6000', d2: '1500', d3: '12', dLen: '', d4: '', qty: 2, unit: 'lbr', parentId: 'tpl-3', itemLevel: 3, unitPrice: 28500, totalPrice: 48324600, remark: 'Material Galangan' },
        { id: 'tpl-5', projectId: 'sample-project', categoryId: 'cat-7', itemNo: '1.1.2', description: 'Ganti Besi Siku Frame Bottom L 75x75x9mm', notes: 'Besi Siku', type: 'EA', d1: '6000', d2: '75', d3: '9', dLen: '', d4: '', qty: 4, unit: 'btg', parentId: 'tpl-3', itemLevel: 3, unitPrice: 26000, totalPrice: 6312800, remark: 'Material Galangan' },
        { id: 'tpl-6', projectId: 'sample-project', categoryId: 'cat-8', itemNo: '1', description: 'SISTEM PERPIPAAN KAMAR MESIN', itemLevel: 1, isAreaHeader: true, qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Machinery Piping' },
        { id: 'tpl-7', projectId: 'sample-project', categoryId: 'cat-8', itemNo: '1.1', description: 'PIPA SEAWATER COOLING 3" SCH 40', itemLevel: 2, parentId: 'tpl-6', qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Cooling Line' },
        { id: 'tpl-8', projectId: 'sample-project', categoryId: 'cat-8', itemNo: '1.1.1', description: 'Fabrikasi & Pasang Pipa Galvanis 3" Sch 40', notes: 'Pipa Seamless', type: 'PP', d1: '6000', d2: '88.9', d3: '5.49', dLen: '', d4: '', qty: 3, unit: 'btg', parentId: 'tpl-7', itemLevel: 3, unitPrice: 32000, totalPrice: 6489600, remark: 'Ready Stock' },
      ];

  return exportShipyardExcel({
    vessel: {
      id: 'template-vessel',
      name: vesselName || 'TEMPLATE RESMI GALANGAN',
      dimension: '23,97 x 7,26 x 3,00 Meter',
      vesselType: 'Tug Boat',
      dockingType: 'Docking Repair',
      companyOwner: 'PT. PELAYARAN NASIONAL',
      projectNo: 'E-081',
      classification: 'BKI',
      kindOfSurvey: 'Intermediate Survey',
    },
    schedule: {
      id: 'template-schedule',
      vesselId: 'template-vessel',
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
    },
    categories,
    workItems: sampleItems,
    signatures: {
      preparedByName: 'PPC Engineer',
      preparedByTitle: 'Planning & Production Control',
      reviewedByName: 'Project Manager',
      reviewedByTitle: 'Pimpro Galangan',
      verifiedByName: 'Owner Surveyor',
      verifiedByTitle: 'Owner Representative',
    },
    includePrices: true,
    singleSheetOnly: true,
  });
}

export async function exportShipyardExcel(options: GenerateExcelOptions): Promise<void> {
  const { vessel, schedule, categories, workItems, signatures, includePrices = true, singleSheetOnly = true } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PPC Shipyard System';
  workbook.lastModifiedBy = 'PPC Shipyard System';
  workbook.created = new Date();

  // Color Palette - Unified with Application Repair List Theme (#03442C & #023321)
  const NAVY_HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF03442C' }, // Adaro Corporate Forest Green
  };

  const EMERALD_HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF03442C' }, // Table Column Header Green
  };

  const SECTION_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF023321' }, // Category Header Banner Dark Green
  };

  const LIGHT_GRAY_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }, // Slate 100
  };

  const HIGHLIGHT_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEF3C7' }, // Amber 100
  };

  const AREA_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF475569' }, // Slate 600
  };

  const SUBSYSTEM_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFECFDF5' }, // Emerald 50
  };

  const THIN_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } },
  };

  const DOUBLE_BOTTOM_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: '475569' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'double', color: { argb: '0F172A' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } },
  };

  const colEnd = includePrices ? 'O' : 'M';
  const totalCols = includePrices ? 15 : 13;

  const wsMain = workbook.addWorksheet('RAB & Repair List', {
    views: [{ showGridLines: true }],
  });

  // Set column widths
  wsMain.columns = includePrices ? [
    { width: 10 }, // A: No Item
    { width: 22 }, // B: Kategori
    { width: 36 }, // C: Deskripsi Pekerjaan
    { width: 22 }, // D: Keterangan
    { width: 20 }, // E: Material / Spesifikasi
    { width: 10 }, // F: D1 (L/P)
    { width: 10 }, // G: D2 (W/L)
    { width: 10 }, // H: D3 (Thick)
    { width: 12 }, // I: Panjang (dLen)
    { width: 10 }, // J: D4 (Factor)
    { width: 10 }, // K: Qty
    { width: 10 }, // L: Satuan
    { width: 18 }, // M: Harga Satuan (Rp)
    { width: 22 }, // N: Total Harga (Rp) [FORMULA]
    { width: 24 }, // O: Remark
  ] : [
    { width: 10 }, // A: No Item
    { width: 22 }, // B: Kategori
    { width: 36 }, // C: Deskripsi Pekerjaan
    { width: 22 }, // D: Keterangan
    { width: 20 }, // E: Material / Spesifikasi
    { width: 10 }, // F: D1 (L/P)
    { width: 10 }, // G: D2 (W/L)
    { width: 10 }, // H: D3 (Thick)
    { width: 12 }, // I: Panjang (dLen)
    { width: 10 }, // J: D4 (Factor)
    { width: 10 }, // K: Qty
    { width: 10 }, // L: Satuan
    { width: 24 }, // M: Remark
  ];

  // Title Header
  wsMain.mergeCells(`A1:${colEnd}1`);
  const titleCell = wsMain.getCell('A1');
  titleCell.value = includePrices ? 'REPAIR LIST & ESTIMASI BIAYA REPARASI KAPAL (RAB GALANGAN)' : 'REPAIR LIST KAPAL (DAFTAR PEKERJAAN)';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = NAVY_HEADER_FILL;
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsMain.getRow(1).height = 32;

  // Metadata Subheader
  wsMain.mergeCells(`A2:${colEnd}2`);
  const subCell = wsMain.getCell('A2');
  subCell.value = `Kapal: ${vessel.name} | No. Proyek: ${vessel.projectNo} | Kelas: ${vessel.classification} | Pemilik: ${vessel.companyOwner}`;
  subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Vessel Particulars & Schedule Section
  wsMain.addRow([]); // Blank row 3

  // Row 4: Section Banners
  wsMain.mergeCells('A4:F4');
  const leftHeaderCell = wsMain.getCell('A4');
  leftHeaderCell.value = 'SPESIFIKASI KAPAL';
  leftHeaderCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
  leftHeaderCell.fill = NAVY_HEADER_FILL;
  leftHeaderCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  wsMain.mergeCells(`H4:${colEnd}4`);
  const rightHeaderCell = wsMain.getCell('H4');
  rightHeaderCell.value = 'JADWAL PROYEK DOCKING';
  rightHeaderCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
  rightHeaderCell.fill = NAVY_HEADER_FILL;
  rightHeaderCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const specsLeft = [
    ['Nama Kapal', vessel.name || '-'],
    ['Tipe Kapal', vessel.vesselType || '-'],
    ['Pemilik Kapal', vessel.companyOwner || '-'],
    ['Klasifikasi', vessel.classification || '-'],
    ['Dimensi (L x B x H)', vessel.dimension || '-'],
    ['Metode Docking', vessel.dockingType || '-'],
    ['No. Registrasi Proyek', vessel.projectNo || '-'],
    ['Jenis Survey', vessel.kindOfSurvey || '-'],
  ];

  const specsRight = [
    ['Arrive @BGN', schedule.arriveBgn || '-'],
    ['Arrival Meeting', schedule.arrivalMeeting || '-'],
    ['Start Contract', schedule.startContract || '-'],
    ['Docking Date', schedule.dockingDate || '-'],
    ['Undocking Date', schedule.undockingDate || '-'],
    ['Finish Work', schedule.finishWork || '-'],
    ['Sail Out', schedule.sailOut || '-'],
    ['Lokasi / Posisi Dock', schedule.dockingPosition || '-'],
  ];

  let metaRowIdx = 5;
  for (let i = 0; i < 8; i++) {
    const row = wsMain.getRow(metaRowIdx);
    row.height = 20;

    // Left block: Spesifikasi Kapal
    wsMain.mergeCells(`A${metaRowIdx}:B${metaRowIdx}`);
    const lLabelCell = wsMain.getCell(`A${metaRowIdx}`);
    lLabelCell.value = specsLeft[i][0];
    lLabelCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF334155' } };
    lLabelCell.alignment = { horizontal: 'left', vertical: 'middle' };

    wsMain.mergeCells(`C${metaRowIdx}:F${metaRowIdx}`);
    const lValCell = wsMain.getCell(`C${metaRowIdx}`);
    lValCell.value = specsLeft[i][1];
    lValCell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF0F172A' } };
    lValCell.alignment = { horizontal: 'left', vertical: 'middle' };

    // Blank separator column G
    const sepCell = wsMain.getCell(`G${metaRowIdx}`);
    sepCell.value = '';

    // Right block: Jadwal Proyek Docking
    wsMain.mergeCells(`H${metaRowIdx}:I${metaRowIdx}`);
    const rLabelCell = wsMain.getCell(`H${metaRowIdx}`);
    rLabelCell.value = specsRight[i][0];
    rLabelCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF334155' } };
    rLabelCell.alignment = { horizontal: 'left', vertical: 'middle' };

    wsMain.mergeCells(`J${metaRowIdx}:${colEnd}${metaRowIdx}`);
    const rValCell = wsMain.getCell(`J${metaRowIdx}`);
    rValCell.value = specsRight[i][1];
    rValCell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF0F172A' } };
    rValCell.alignment = { horizontal: 'left', vertical: 'middle' };

    // Set thin borders for metadata row cells
    for (let c = 1; c <= totalCols; c++) {
      if (c !== 7) { // Skip blank column G
        row.getCell(c).border = THIN_BORDER;
      }
    }

    metaRowIdx++;
  }

  wsMain.addRow([]); // Blank row 13

  // Table Headers (Row 14)
  const headers = includePrices ? [
    'No. Item',
    'Kategori',
    'Deskripsi Pekerjaan',
    'Keterangan',
    'Material / Spesifikasi',
    'D1 (L/P)',
    'D2 (W/L)',
    'D3 (Tebal)',
    'Panjang (dLen)',
    'D4 (Faktor)',
    'Qty',
    'Satuan',
    'Harga Satuan (Rp)',
    'Total Harga (Rp)',
    'Remark',
  ] : [
    'No. Item',
    'Kategori',
    'Deskripsi Pekerjaan',
    'Keterangan',
    'Material / Spesifikasi',
    'D1 (L/P)',
    'D2 (W/L)',
    'D3 (Tebal)',
    'Panjang (dLen)',
    'D4 (Faktor)',
    'Qty',
    'Satuan',
    'Remark',
  ];

  const headerRow = wsMain.getRow(14);
  headerRow.height = 26;
  headers.forEach((h, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = EMERALD_HEADER_FILL;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });

  let currentRowIdx = 15;
  const categorySubtotalRowIndices: number[] = [];

  // Group work items by category
  categories.forEach((cat) => {
    const catItems = workItems.filter((item) => item.categoryId === cat.id);
    if (catItems.length === 0) return;

    // Category Header Row
    const catRow = wsMain.getRow(currentRowIdx);
    catRow.height = 22;
    wsMain.mergeCells(`A${currentRowIdx}:${colEnd}${currentRowIdx}`);
    const catCell = catRow.getCell(1);
    catCell.value = `${cat.code} - ${cat.name.toUpperCase()}`;
    catCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    catCell.fill = SECTION_FILL;
    catCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    catCell.border = THIN_BORDER;

    currentRowIdx++;

    // Build the hierarchical rows for this category
    const { areas, subSystems, components } = getCategoryTree(catItems);
    const flatRows: FlatTreeRow[] = [];

    areas.forEach((area) => {
      const areaRow: FlatTreeRow = { item: area, type: 'area', level: 1 };
      flatRows.push(areaRow);

      const areaSubSystems = subSystems.filter(s => s.parentId === area.id || s.itemNo.startsWith(area.itemNo + '.'));
      const areaComponents = components.filter(c => 
        (c.parentId === area.id || c.itemNo.startsWith(area.itemNo + '.')) && 
        !areaSubSystems.some(s => c.parentId === s.id || c.itemNo.startsWith(s.itemNo + '.'))
      );

      areaSubSystems.forEach((subSystem) => {
        const subComponents = components.filter(c => c.parentId === subSystem.id || c.itemNo.startsWith(subSystem.itemNo + '.'));
        const subSystemRow: FlatTreeRow = { 
          item: subSystem, 
          type: 'subsystem', 
          level: 2, 
          childRowsCount: subComponents.length 
        };
        flatRows.push(subSystemRow);

        subComponents.forEach((comp) => {
          flatRows.push({ item: comp, type: 'component', level: 3 });
        });
      });

      areaComponents.forEach((comp) => {
        flatRows.push({ item: comp, type: 'component', level: 3 });
      });
    });

    // Standalone sub-systems
    const orphanSubSystems = subSystems.filter(s => !areas.some(a => s.parentId === a.id || s.itemNo.startsWith(a.itemNo + '.')));
    orphanSubSystems.forEach((subSystem) => {
      const subComponents = components.filter(c => c.parentId === subSystem.id || c.itemNo.startsWith(subSystem.itemNo + '.'));
      const subSystemRow: FlatTreeRow = { 
        item: subSystem, 
        type: 'subsystem', 
        level: 2, 
        childRowsCount: subComponents.length 
      };
      flatRows.push(subSystemRow);

      subComponents.forEach((comp) => {
        flatRows.push({ item: comp, type: 'component', level: 3 });
      });
    });

    // Standalone components
    const orphanComponents = components.filter(c => 
      !areas.some(a => c.parentId === a.id || c.itemNo.startsWith(a.itemNo + '.')) && 
      !subSystems.some(s => c.parentId === s.id || c.itemNo.startsWith(s.itemNo + '.'))
    );
    orphanComponents.forEach((comp) => {
      flatRows.push({ item: comp, type: 'component', level: 3 });
    });

    // Pre-calculate row indices
    let tempRowIdx = currentRowIdx;
    flatRows.forEach((row) => {
      row.rowIndex = tempRowIdx;
      tempRowIdx++;
    });

    // Calculate child row indices for Area rows
    for (let i = 0; i < flatRows.length; i++) {
      if (flatRows[i].type === 'area') {
        const areaRow = flatRows[i];
        areaRow.childRowIndices = [];
        let j = i + 1;
        while (j < flatRows.length && flatRows[j].type !== 'area') {
          if (flatRows[j].type === 'subsystem') {
            areaRow.childRowIndices.push(flatRows[j].rowIndex!);
            j += (flatRows[j].childRowsCount || 0) + 1;
          } else {
            areaRow.childRowIndices.push(flatRows[j].rowIndex!);
            j++;
          }
        }
      }
    }

    // Write FlatRows to sheet
    flatRows.forEach((flatRow) => {
      const item = flatRow.item;
      const row = wsMain.getRow(currentRowIdx);

      const qty = item.qty || 1;
      const unitPrice = item.unitPrice || 0;

      // Clean description text without ASCII tree symbols
      let descVal = item.description;

      // Calculate dynamic row height for this row based on content length
      const rowHeight = calculateDynamicRowHeight([
        { text: item.itemNo, colWidth: 10 },
        { text: cat.name, colWidth: 24 },
        { text: descVal, colWidth: 40 },
        { text: item.notes, colWidth: 24 },
        { text: item.type, colWidth: 22 },
        { text: item.remark, colWidth: 24 },
      ], 22, 14);
      row.height = rowHeight;

      // Safe dimension values (preserve numbers as numbers, strings like "inch"/"sch.80" as strings)
      const parseDimensionVal = (val: string | number | undefined) => {
        if (val === undefined || val === null || val === '') return '';
        if (typeof val === 'number') return val;
        const num = Number(val);
        return !isNaN(num) ? num : val;
      };

      // Populate cells
      row.getCell(1).value = item.itemNo; // A: No. Item
      row.getCell(2).value = cat.name; // B: Kategori
      row.getCell(3).value = descVal; // C: Deskripsi Pekerjaan
      row.getCell(4).value = item.notes || ''; // D: Keterangan
      row.getCell(5).value = (item.type && item.type !== '-') ? item.type : ''; // E: Material
      row.getCell(6).value = parseDimensionVal(item.d1); // F: D1
      row.getCell(7).value = parseDimensionVal(item.d2); // G: D2
      row.getCell(8).value = parseDimensionVal(item.d3); // H: D3
      row.getCell(9).value = parseDimensionVal(item.dLen); // I: Panjang (dLen)
      row.getCell(10).value = parseDimensionVal(item.d4); // J: D4
      const isAreaOrSubsystem = flatRow.type === 'area' || flatRow.type === 'subsystem';
      if (isAreaOrSubsystem) {
        row.getCell(11).value = (item.qty && item.qty > 0) ? item.qty : ''; // K: Qty
        row.getCell(12).value = (item.unit && item.unit.trim() !== '' && item.unit !== '-') ? item.unit : ''; // L: Satuan
      } else {
        row.getCell(11).value = qty; // K: Qty
        row.getCell(12).value = item.unit || 'kg'; // L: Satuan
      }

      const r = currentRowIdx;

      if (flatRow.type === 'area') {
        if (includePrices) {
          row.getCell(13).value = ''; // M: Harga Satuan (kosong untuk area)
          const totalCell = row.getCell(14); // N: Total Harga
          if (item.totalPrice && item.totalPrice > 0) {
            totalCell.value = item.totalPrice;
          } else {
            totalCell.value = '';
          }
          totalCell.numFmt = '"Rp "#,##0';
          row.getCell(15).value = item.remark || ''; // O: Remark
        } else {
          row.getCell(13).value = item.remark || ''; // M: Remark
        }

        // Apply styled colors for Area rows
        for (let c = 1; c <= totalCols; c++) {
          const cell = row.getCell(c);
          cell.border = THIN_BORDER;
          cell.fill = AREA_FILL;
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          if ([1, 6, 7, 8, 9, 10, 11, 12].includes(c)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          } else if (includePrices && [13, 14].includes(c)) {
            cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          }
        }
      } 
      else if (flatRow.type === 'subsystem') {
        if (includePrices) {
          row.getCell(13).value = (item.unitPrice && item.unitPrice > 0) ? item.unitPrice : ''; // M: Harga Satuan
          row.getCell(13).numFmt = '"Rp "#,##0';
          const totalCell = row.getCell(14); // N: Total Harga
          if (item.totalPrice && item.totalPrice > 0) {
            totalCell.value = item.totalPrice;
          } else if (item.unitPrice && item.unitPrice > 0 && item.qty && item.qty > 0) {
            const rawPriceFormula = `IFERROR(IF(OR(L${r}="m", L${r}="meter"), ((I${r}*K${r})/1000)*M${r}, K${r}*M${r}), ${item.totalPrice || 0})`;
            totalCell.value = { formula: `IF(${rawPriceFormula}=0, "", ${rawPriceFormula})`, result: item.totalPrice || 0 };
          } else {
            totalCell.value = '';
          }
          totalCell.numFmt = '"Rp "#,##0';
          row.getCell(15).value = item.remark || ''; // O: Remark
        } else {
          row.getCell(13).value = item.remark || ''; // M: Remark
        }

        // Apply styling for Sub-systems
        for (let c = 1; c <= totalCols; c++) {
          const cell = row.getCell(c);
          cell.border = THIN_BORDER;
          cell.fill = SUBSYSTEM_FILL;
          cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF065F46' } };
          if ([1, 6, 7, 8, 9, 10, 11, 12].includes(c)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          } else if (includePrices && [13, 14].includes(c)) {
            cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          }
        }
      } 
      else {
        // Component Row (normal)
        if (includePrices) {
          row.getCell(13).value = (item.unitPrice && item.unitPrice > 0) ? item.unitPrice : ''; // M: Harga Satuan
          row.getCell(13).numFmt = '"Rp "#,##0';
          const totalCell = row.getCell(14); // N: Total Harga
          const rawCompPriceForm = `IFERROR(IF(OR(L${r}="m", L${r}="meter"), ((I${r}*K${r})/1000)*M${r}, K${r}*M${r}), ${item.totalPrice || 0})`;
          totalCell.value = { formula: `IF(${rawCompPriceForm}=0, "", ${rawCompPriceForm})`, result: item.totalPrice || 0 };
          totalCell.numFmt = '"Rp "#,##0';
          row.getCell(15).value = item.remark || ''; // O: Remark
        } else {
          row.getCell(13).value = item.remark || ''; // M: Remark
        }

        // Standard alignments, fonts and borders
        for (let c = 1; c <= totalCols; c++) {
          const cell = row.getCell(c);
          cell.border = THIN_BORDER;
          cell.font = { name: 'Arial', size: 8.5 };
          if ([1, 6, 7, 8, 9, 10, 11, 12].includes(c)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          } else if (includePrices && [13, 14].includes(c)) {
            cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          }
        }
      }

      currentRowIdx++;
    });

    // Subtotal Row per Category
    const subRow = wsMain.getRow(currentRowIdx);
    subRow.height = 22;

    subRow.getCell(2).value = cat.name;
    subRow.getCell(3).value = `SUBTOTAL ${cat.name.toUpperCase()}`;
    subRow.getCell(3).font = { name: 'Arial', size: 8.5, bold: true };
    subRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    const topLevelRowIndices = flatRows
      .filter((row) => {
        if (row.level === 1) return true;
        if (row.level === 2) {
          return !areas.some(a => row.item.parentId === a.id || row.item.itemNo.startsWith(a.itemNo + '.'));
        }
        if (row.level === 3) {
          return !areas.some(a => row.item.parentId === a.id || row.item.itemNo.startsWith(a.itemNo + '.')) &&
                 !subSystems.some(s => row.item.parentId === s.id || row.item.itemNo.startsWith(s.itemNo + '.'));
        }
        return false;
      })
      .map(r => r.rowIndex!);

    if (includePrices) {
      const subPriceCell = subRow.getCell(14); // N: Total Harga
      if (topLevelRowIndices.length > 0) {
        const catPriceSumFormula = topLevelRowIndices.map(idx => `N${idx}`).join('+');
        subPriceCell.value = {
          formula: catPriceSumFormula,
          result: catItems.reduce((acc, i) => acc + (i.totalPrice || 0), 0),
        };
      } else {
        subPriceCell.value = 0;
      }
      subPriceCell.font = { name: 'Arial', size: 8.5, bold: true };
      subPriceCell.numFmt = '"Rp "#,##0';
      subPriceCell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      subRow.getCell(15).value = '';
    }

    for (let c = 1; c <= totalCols; c++) {
      const cell = subRow.getCell(c);
      cell.fill = LIGHT_GRAY_FILL;
      cell.border = THIN_BORDER;
      if (![3, 14].includes(c)) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
    }

    categorySubtotalRowIndices.push(currentRowIdx);
    currentRowIdx++;
  });

  wsMain.addRow([]); // Blank row
  currentRowIdx++;

  // GRAND TOTAL SUMMARY BLOCK
  if (includePrices) {
    const gtCostRow = wsMain.getRow(currentRowIdx);
    gtCostRow.height = 26;
    gtCostRow.getCell(3).value = 'GRAND TOTAL ESTIMASI BIAYA REPARASI (RAB)';
    gtCostRow.getCell(3).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF047857' } };
    gtCostRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };

    const totalCost = workItems.reduce((acc, i) => acc + (i.totalPrice || 0), 0);
    const gtCostCell = gtCostRow.getCell(14); // N: Total Harga
    if (categorySubtotalRowIndices.length > 0) {
      const totalCostFormula = categorySubtotalRowIndices.map(idx => `N${idx}`).join('+');
      gtCostCell.value = {
        formula: totalCostFormula,
        result: totalCost,
      };
    } else {
      gtCostCell.value = 0;
    }
    gtCostCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF047857' } };
    gtCostCell.numFmt = '"Rp "#,##0';
    gtCostCell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    gtCostCell.fill = HIGHLIGHT_FILL;
    gtCostCell.border = DOUBLE_BOTTOM_BORDER;

    gtCostRow.getCell(15).value = '';
    gtCostRow.getCell(15).fill = HIGHLIGHT_FILL;
    gtCostRow.getCell(15).border = DOUBLE_BOTTOM_BORDER;

    currentRowIdx++;
  }

  currentRowIdx += 3;

  // Signatures Block
  const sigHeaderRow = wsMain.getRow(currentRowIdx);
  sigHeaderRow.height = 20;
  sigHeaderRow.getCell(2).value = 'Dipersiapkan Oleh,';
  sigHeaderRow.getCell(2).font = { bold: true, size: 9 };
  sigHeaderRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

  sigHeaderRow.getCell(7).value = 'Ditinjau Oleh,';
  sigHeaderRow.getCell(7).font = { bold: true, size: 9 };
  sigHeaderRow.getCell(7).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

  sigHeaderRow.getCell(12).value = 'Disetujui Oleh,';
  sigHeaderRow.getCell(12).font = { bold: true, size: 9 };
  sigHeaderRow.getCell(12).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

  currentRowIdx += 4; // Space for signature

  const sigNameRow = wsMain.getRow(currentRowIdx);
  sigNameRow.height = 32;

  sigNameRow.getCell(2).value = `${signatures.preparedByName}\n(${signatures.preparedByTitle})`;
  sigNameRow.getCell(2).font = { bold: true, size: 9 };
  sigNameRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

  sigNameRow.getCell(7).value = `${signatures.reviewedByName}\n(${signatures.reviewedByTitle})`;
  sigNameRow.getCell(7).font = { bold: true, size: 9 };
  sigNameRow.getCell(7).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

  sigNameRow.getCell(12).value = `${signatures.verifiedByName}\n(${signatures.verifiedByTitle})`;
  sigNameRow.getCell(12).font = { bold: true, size: 9 };
  sigNameRow.getCell(12).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

  if (singleSheetOnly) {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const safeVesselName = (vessel?.name || 'Kapal').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = includePrices
      ? `RAB_RepairList_${safeVesselName}_${dateStr}.xlsx`
      : `RepairList_${safeVesselName}_${dateStr}.xlsx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 300);
    return;
  }


  // =========================================================================
  // SHEET 2: INTERACTIVE MATERIAL CALCULATOR SCHEME (SKEMA KALKULATOR MATERIAL)
  // =========================================================================
  const wsCalc = workbook.addWorksheet('Kalkulator Material', {
    views: [{ showGridLines: true }],
  });

  wsCalc.columns = [
    { width: 8 },  // A: No
    { width: 22 }, // B: Kategori Material
    { width: 26 }, // C: Tipe / Spesifikasi
    { width: 14 }, // D: Dimensi L (mm/m)
    { width: 14 }, // E: Dimensi W (mm)
    { width: 14 }, // F: Dimensi T (mm)
    { width: 14 }, // G: Dimensi D/Faktor
    { width: 10 }, // H: Qty
    { width: 18 }, // I: Hasil Berat (kg) [EXCEL FORMULA]
    { width: 18 }, // J: Harga / kg (Rp)
    { width: 22 }, // K: Total Biaya (Rp) [EXCEL FORMULA]
    { width: 32 }, // L: Rumus Excel Yang Digunakan
  ];

  // Header Title
  wsCalc.mergeCells('A1:L1');
  const calcTitle = wsCalc.getCell('A1');
  calcTitle.value = 'SKEMA & SIMULATOR RUMUS KALKULATOR MATERIAL GALANGAN';
  calcTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  calcTitle.fill = NAVY_HEADER_FILL;
  calcTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsCalc.getRow(1).height = 30;

  // Description / Guide
  wsCalc.mergeCells('A2:L2');
  const calcDesc = wsCalc.getCell('A2');
  calcDesc.value = 'Lembar kerja ini memuat skema rumus standar marine steel density (7.85 kg/dm³). Anda dapat mengisi nilai pada kolom D sampai J untuk menghitung otomatis.';
  calcDesc.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF475569' } };
  calcDesc.alignment = { horizontal: 'center', vertical: 'middle' };

  wsCalc.addRow([]); // Blank row 3

  // Formula Standard Reference Box
  wsCalc.mergeCells('A4:L4');
  const refHeader = wsCalc.getCell('A4');
  refHeader.value = '1. STANDAR RUMUS MATEMATIS TONASE MATERIAL GALANGAN (BKI / IACS)';
  refHeader.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
  refHeader.fill = EMERALD_HEADER_FILL;
  refHeader.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const formulaGuides = [
    ['Pelat Baja (Steel Plate)', 'Panjang(mm) x Lebar(mm) x Tebal(mm) x 0.00000785 x Qty', '=D{r}*E{r}*F{r}*0.00000785*H{r}'],
    ['Plat Strip (Flat Bar)', 'Lebar(mm) x Tebal(mm) x 0.00785 x Panjang(m) x Qty', '=E{r}*F{r}*0.00785*D{r}*H{r}'],
    ['Besi As (Round Bar)', '0.006165 x Diameter(mm)² x Panjang(m) x Qty', '=0.006165*F{r}*F{r}*D{r}*H{r}'],
    ['Besi Nako (Square Bar)', 'Sisi(mm)² x 0.00785 x Panjang(m) x Qty', '=F{r}*F{r}*0.00785*D{r}*H{r}'],
    ['Besi Siku (Angle Bar)', '(LegA + LegB - Tebal) x Tebal x 0.00785 x Panjang(m) x Qty', '=(E{r}+F{r}-G{r})*G{r}*0.00785*D{r}*H{r}'],
    ['Pipa Baja (Steel Pipe)', '(OD - WT) x WT x 0.02466 x Panjang(m) x Qty', '=(E{r}-F{r})*F{r}*0.02466*D{r}*H{r}'],
  ];

  let calcGuideRow = 5;
  formulaGuides.forEach(([mat, desc, form]) => {
    const row = wsCalc.getRow(calcGuideRow);
    row.getCell(1).value = '•';
    row.getCell(2).value = mat;
    row.getCell(2).font = { bold: true, size: 8.5 };
    wsCalc.mergeCells(`C${calcGuideRow}:H${calcGuideRow}`);
    row.getCell(3).value = desc;
    row.getCell(3).font = { size: 8.5 };
    wsCalc.mergeCells(`I${calcGuideRow}:L${calcGuideRow}`);
    row.getCell(9).value = `Sintaks Excel: ${form}`;
    row.getCell(9).font = { name: 'Consolas', size: 8.5, color: { argb: 'FF0369A1' } };
    calcGuideRow++;
  });

  wsCalc.addRow([]); // Blank row 11

  // Interactive Live Calculator Table Header
  const calcTableStartRow = 12;
  wsCalc.mergeCells(`A${calcTableStartRow}:L${calcTableStartRow}`);
  const calcTableTitle = wsCalc.getCell(`A${calcTableStartRow}`);
  calcTableTitle.value = '2. SIMULATOR CALCULATOR INPUT LIVE (DENGAN RUMUS EXCEL OTOMATIS)';
  calcTableTitle.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
  calcTableTitle.fill = SECTION_FILL;
  calcTableTitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const calcHeaders = [
    'No',
    'Kategori Material',
    'Spesifikasi',
    'D1 / Panjang',
    'D2 / Lebar',
    'D3 / Tebal / Dia',
    'D4 / Faktor',
    'Qty',
    'Berat Tonase (kg)',
    'Harga / kg (Rp)',
    'Total Biaya (Rp)',
    'Rumus Excel Aktif',
  ];

  const calcHeaderRow = wsCalc.getRow(calcTableStartRow + 1);
  calcHeaderRow.height = 24;
  calcHeaders.forEach((h, colIdx) => {
    const cell = calcHeaderRow.getCell(colIdx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = EMERALD_HEADER_FILL;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });

  // Sample Interactive Inputs with Excel Formulas
  const sampleCalcRows = [
    { no: 1, cat: 'Pelat Baja', spec: 'PL 10mm BKI Grade A', d1: 6000, d2: 1500, d3: 10, d4: 0, qty: 2, price: 18500, form: 'D{r}*E{r}*F{r}*0.00000785*H{r}' },
    { no: 2, cat: 'Pelat Baja', spec: 'PL 12mm ABS Grade A', d1: 6000, d2: 1800, d3: 12, d4: 0, qty: 1, price: 19500, form: 'D{r}*E{r}*F{r}*0.00000785*H{r}' },
    { no: 3, cat: 'Flat Bar', spec: 'FB 50 x 6 mm', d1: 6, d2: 50, d3: 6, d4: 0, qty: 10, price: 17500, form: 'E{r}*F{r}*0.00785*D{r}*H{r}' },
    { no: 4, cat: 'Besi As / Round', spec: 'RB Dia 25 mm', d1: 6, d2: 0, d3: 25, d4: 0, qty: 5, price: 18000, form: '0.006165*F{r}*F{r}*D{r}*H{r}' },
    { no: 5, cat: 'Besi Nako', spec: 'SB 16 x 16 mm', d1: 6, d2: 0, d3: 16, d4: 0, qty: 8, price: 17800, form: 'F{r}*F{r}*0.00785*D{r}*H{r}' },
    { no: 6, cat: 'Besi Siku', spec: 'L 50 x 50 x 5 mm', d1: 6, d2: 50, d3: 50, d4: 5, qty: 4, price: 17200, form: '(E{r}+F{r}-G{r})*G{r}*0.00785*D{r}*H{r}' },
    { no: 7, cat: 'Pipa Baja', spec: 'Pipa 2" Sch 40 (60.3mm OD)', d1: 6, d2: 60.3, d3: 3.91, d4: 0, qty: 3, price: 21000, form: '(E{r}-F{r})*F{r}*0.02466*D{r}*H{r}' },
  ];

  let cRowIdx = calcTableStartRow + 2;
  const calcRowStart = cRowIdx;

  sampleCalcRows.forEach((item) => {
    const row = wsCalc.getRow(cRowIdx);
    row.height = 20;

    const r = cRowIdx;
    const excelWeightForm = item.form.replace(/\{r\}/g, String(r));

    row.getCell(1).value = item.no;
    row.getCell(2).value = item.cat;
    row.getCell(3).value = item.spec;
    row.getCell(4).value = item.d1;
    row.getCell(5).value = item.d2 || '';
    row.getCell(6).value = item.d3 || '';
    row.getCell(7).value = item.d4 || '';
    row.getCell(8).value = item.qty;

    // Weight Cell with Live Formula
    const wCell = row.getCell(9);
    wCell.value = { formula: excelWeightForm, result: 0 };
    wCell.numFmt = '#,##0.00 "kg"';
    wCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF92400E' } };

    // Price Cell
    const pCell = row.getCell(10);
    pCell.value = item.price;
    pCell.numFmt = '"Rp "#,##0';

    // Total Cost Cell with Formula = Weight * Price
    const tCell = row.getCell(11);
    tCell.value = { formula: `I${r}*J${r}`, result: 0 };
    tCell.numFmt = '"Rp "#,##0';
    tCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF047857' } };

    // Formula Text Display
    const fCell = row.getCell(12);
    fCell.value = `=${excelWeightForm}`;
    fCell.font = { name: 'Consolas', size: 8, color: { argb: 'FF475569' } };

    for (let col = 1; col <= 12; col++) {
      const cell = row.getCell(col);
      cell.border = THIN_BORDER;
      if ([1, 4, 5, 6, 7, 8].includes(col)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([9, 10, 11].includes(col)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    }

    cRowIdx++;
  });

  const calcRowEnd = cRowIdx - 1;

  // Simulator Total Row
  const totalSimRow = wsCalc.getRow(cRowIdx);
  totalSimRow.height = 22;
  totalSimRow.getCell(3).value = 'TOTAL HASIL SIMULASI KALKULATOR';
  totalSimRow.getCell(3).font = { name: 'Arial', size: 9, bold: true };
  totalSimRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };

  const simWCell = totalSimRow.getCell(9);
  simWCell.value = { formula: `SUM(I${calcRowStart}:I${calcRowEnd})`, result: 0 };
  simWCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
  simWCell.numFmt = '#,##0.00 "kg"';
  simWCell.fill = HIGHLIGHT_FILL;

  const simTCell = totalSimRow.getCell(11);
  simTCell.value = { formula: `SUM(K${calcRowStart}:K${calcRowEnd})`, result: 0 };
  simTCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF047857' } };
  simTCell.numFmt = '"Rp "#,##0';
  simTCell.fill = HIGHLIGHT_FILL;

  for (let c = 1; c <= 12; c++) {
    const cell = totalSimRow.getCell(c);
    cell.border = DOUBLE_BOTTOM_BORDER;
  }


  // =========================================================================
  // SHEET 3: KATALOG MATERIAL GALANGAN
  // =========================================================================
  const wsCat = workbook.addWorksheet('Katalog Material', {
    views: [{ showGridLines: true }],
  });

  wsCat.columns = [
    { width: 14 }, // A: Kode
    { width: 28 }, // B: Nama Material
    { width: 20 }, // C: Kategori
    { width: 12 }, // D: Satuan
    { width: 18 }, // E: Harga Default (Rp)
    { width: 38 }, // F: Catatan / Spesifikasi Standar
  ];

  wsCat.mergeCells('A1:F1');
  const catTitle = wsCat.getCell('A1');
  catTitle.value = 'KATALOG MATERIAL & PRICELIST STANDAR GALANGAN KAPAL';
  catTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  catTitle.fill = NAVY_HEADER_FILL;
  catTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsCat.getRow(1).height = 28;

  const catHeaders = ['Kode', 'Nama Material', 'Kategori', 'Satuan', 'Harga Default / kg (Rp)', 'Spesifikasi / Formula'];
  const catHeaderRow = wsCat.getRow(3);
  catHeaderRow.height = 22;
  catHeaders.forEach((h, colIdx) => {
    const cell = catHeaderRow.getCell(colIdx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = EMERALD_HEADER_FILL;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = THIN_BORDER;
  });

  const catalogList = TonnageCalculator.getAllMaterialTypes();
  let catRowIdx = 4;
  catalogList.forEach((m) => {
    const row = wsCat.getRow(catRowIdx);
    row.height = 19;
    row.getCell(1).value = m.code;
    row.getCell(2).value = m.name;
    row.getCell(3).value = m.categoryLabel;
    row.getCell(4).value = m.defaultUnit;

    const prCell = row.getCell(5);
    prCell.value = m.defaultUnitPrice;
    prCell.numFmt = '"Rp "#,##0';

    row.getCell(6).value = m.descriptionHint || '-';

    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.border = THIN_BORDER;
      cell.font = { name: 'Arial', size: 8.5 };
      if ([1, 4].includes(c)) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      else if (c === 5) cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
    catRowIdx++;
  });

  // Write and trigger download in browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const safeVesselName = vessel.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `RAB_RepairList_${safeVesselName}_${dateStr}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

/**
 * Export Bill of Materials & Consumables Estimation to Excel (.xlsx)
 */
export async function exportMaterialEstimationExcel(
  vessel: VesselSpec,
  schedule: ProjectSchedule,
  estimation: any,
  params: any,
  signatures?: Signatures
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PPC Shipyard Estimation Engine';
  workbook.lastModifiedBy = 'PPC Shipyard System';
  workbook.created = new Date();

  // Styles
  const NAVY_HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Slate 900
  };

  const EMERALD_HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF065F46' }, // Emerald 800
  };

  const CATEGORY_ROW_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }, // Slate 100
  };

  const THIN_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  const DOUBLE_BOTTOM_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF0F172A' } },
    bottom: { style: 'double', color: { argb: 'FF0F172A' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  // --- SHEET 1: BILL OF MATERIALS & CONSUMABLES ---
  const ws = workbook.addWorksheet('Estimasi Material & Consumable', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.views = [{ showGridLines: true }];

  // Column definitions
  ws.columns = [
    { key: 'no', width: 6 },
    { key: 'category', width: 22 },
    { key: 'name', width: 34 },
    { key: 'spec', width: 32 },
    { key: 'netQty', width: 14 },
    { key: 'scrap', width: 12 },
    { key: 'grossQty', width: 15 },
    { key: 'unit', width: 10 },
    { key: 'commercialPackage', width: 28 },
    { key: 'unitsNeeded', width: 16 },
    { key: 'unitPrice', width: 18 },
    { key: 'totalCost', width: 22 },
    { key: 'formula', width: 35 },
    { key: 'source', width: 35 },
  ];

  // Header Title
  ws.mergeCells('A1:N1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'ESTIMASI MATERIAL & CONSUMABLE GALANGAN (BILL OF MATERIALS)';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = NAVY_HEADER_FILL;
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // Subtitle / Project Information Block
  ws.mergeCells('A2:N2');
  const subCell = ws.getCell('A2');
  subCell.value = `Kapal: ${vessel.name} | Tipe: ${vessel.vesselType || '-'} | Dimensi: ${vessel.dimension || '-'} | Klas: ${vessel.classification || '-'} | Periode Docking: ${schedule.dockingDate || '-'} s/d ${schedule.undockingDate || '-'}`;
  subCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF334155' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // Executive KPI Summary Banner
  ws.mergeCells('A4:C4');
  ws.getCell('A4').value = `Total Baja Gross: ${(estimation.totalSteelTonnageGrossKg / 1000).toFixed(2)} Ton (${estimation.totalSteelTonnageGrossKg.toLocaleString('id-ID')} kg)`;
  ws.getCell('A4').font = { name: 'Arial', size: 9, bold: true };
  ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  ws.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('D4:F4');
  ws.getCell('D4').value = `Pelat Standar: ${estimation.totalSteelPlatesCount} lbr | Profil: ${estimation.totalProfilesCount} btg | Pipa: ${estimation.totalPipesLengthM} m`;
  ws.getCell('D4').font = { name: 'Arial', size: 9, bold: true };
  ws.getCell('D4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  ws.getCell('D4').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('G4:I4');
  ws.getCell('G4').value = `Kawat Las: ${estimation.totalWeldingElectrodesKg + estimation.totalWeldingWireKg} kg | Gas: ${estimation.totalIndustrialGasCylinders} tabung`;
  ws.getCell('G4').font = { name: 'Arial', size: 9, bold: true };
  ws.getCell('G4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  ws.getCell('G4').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('J4:L4');
  ws.getCell('J4').value = `Copper Slag: ${estimation.totalCopperSlagKg.toLocaleString('id-ID')} kg | Cat: ${estimation.totalPaintLiters} Liter`;
  ws.getCell('J4').font = { name: 'Arial', size: 9, bold: true };
  ws.getCell('J4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
  ws.getCell('J4').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('M4:N4');
  ws.getCell('M4').value = `Total Estimasi Pengadaan: Rp ${estimation.totalEstimatedProcurementCost.toLocaleString('id-ID')}`;
  ws.getCell('M4').font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF065F46' } };
  ws.getCell('M4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  ws.getCell('M4').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 24;

  // Table Column Headers
  const headerRowIdx = 6;
  const headerTitles = [
    'No',
    'Kategori Material',
    'Nama Material / Consumable',
    'Spesifikasi Standar',
    'Qty Netto',
    'Scrap (%)',
    'Qty Pengadaan',
    'Satuan',
    'Ukuran Kemasan Komersil',
    'Jumlah Kemasan',
    'Harga Satuan (IDR)',
    'Subtotal Anggaran (IDR)',
    'Formula Teknis Galangan',
    'Pemicu Item Repair List',
  ];

  const headerRow = ws.getRow(headerRowIdx);
  headerTitles.forEach((title, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = title;
    cell.fill = NAVY_HEADER_FILL;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 28;

  // Populate rows
  let curRowIdx = 7;
  let itemCounter = 1;

  estimation.items.forEach((item) => {
    const row = ws.getRow(curRowIdx);

    row.getCell(1).value = itemCounter++;
    row.getCell(2).value = item.category.toUpperCase().replace('-', ' ');
    row.getCell(3).value = item.name;
    row.getCell(4).value = item.specification;

    const netCell = row.getCell(5);
    netCell.value = item.netQuantity;
    netCell.numFmt = '#,##0.00';

    const scrapCell = row.getCell(6);
    scrapCell.value = item.scrapAllowancePercent > 0 ? `${item.scrapAllowancePercent}%` : '0%';

    const grossCell = row.getCell(7);
    grossCell.value = item.grossQuantity;
    grossCell.numFmt = '#,##0.00';

    row.getCell(8).value = item.unit;
    row.getCell(9).value = item.commercialPackageSize || '-';

    const unitsCell = row.getCell(10);
    unitsCell.value = item.commercialUnitsNeeded ? `${item.commercialUnitsNeeded} ${item.commercialUnitLabel || ''}` : '-';

    const priceCell = row.getCell(11);
    priceCell.value = item.estimatedUnitPrice;
    priceCell.numFmt = '"Rp "#,##0';

    const costCell = row.getCell(12);
    costCell.value = item.totalEstimatedCost;
    costCell.numFmt = '"Rp "#,##0';

    row.getCell(13).value = item.calculationFormula;
    row.getCell(14).value = item.sourceSummary || '-';

    // Borders & alignments
    for (let col = 1; col <= 14; col++) {
      const c = row.getCell(col);
      c.border = THIN_BORDER;
      c.font = { name: 'Arial', size: 8.5 };
      if ([1, 6, 8, 10].includes(col)) {
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([5, 7, 11, 12].includes(col)) {
        c.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        c.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }

    curRowIdx++;
  });

  // Total Summary Row
  const totalRow = ws.getRow(curRowIdx);
  totalRow.getCell(1).value = '';
  totalRow.getCell(2).value = 'TOTAL ESTIMASI ANGGARAN MATERIAL & CONSUMABLE';
  ws.mergeCells(`B${curRowIdx}:K${curRowIdx}`);

  const totalCostCell = totalRow.getCell(12);
  totalCostCell.value = estimation.totalEstimatedProcurementCost;
  totalCostCell.numFmt = '"Rp "#,##0';

  for (let c = 1; c <= 14; c++) {
    const cell = totalRow.getCell(c);
    cell.border = DOUBLE_BOTTOM_BORDER;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    if (c === 2) cell.alignment = { horizontal: 'left', vertical: 'middle' };
    if (c === 12) cell.alignment = { horizontal: 'right', vertical: 'middle' };
  }
  totalRow.height = 24;

  curRowIdx += 3;

  // Signatures Row
  if (signatures) {
    ws.mergeCells(`B${curRowIdx}:D${curRowIdx}`);
    ws.getCell(`B${curRowIdx}`).value = 'Dibuat Oleh (PPC):';
    ws.getCell(`B${curRowIdx}`).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(`B${curRowIdx}`).alignment = { horizontal: 'center' };

    ws.mergeCells(`F${curRowIdx}:H${curRowIdx}`);
    ws.getCell(`F${curRowIdx}`).value = 'Diperiksa (Project Leader):';
    ws.getCell(`F${curRowIdx}`).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(`F${curRowIdx}`).alignment = { horizontal: 'center' };

    ws.mergeCells(`K${curRowIdx}:M${curRowIdx}`);
    ws.getCell(`K${curRowIdx}`).value = 'Mengetahui (Owner Representative):';
    ws.getCell(`K${curRowIdx}`).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(`K${curRowIdx}`).alignment = { horizontal: 'center' };

    curRowIdx += 4;

    ws.mergeCells(`B${curRowIdx}:D${curRowIdx}`);
    ws.getCell(`B${curRowIdx}`).value = signatures.preparedByName || 'Muhammad Munthaha';
    ws.getCell(`B${curRowIdx}`).font = { name: 'Arial', size: 9, bold: true, underline: true };
    ws.getCell(`B${curRowIdx}`).alignment = { horizontal: 'center' };

    ws.mergeCells(`F${curRowIdx}:H${curRowIdx}`);
    ws.getCell(`F${curRowIdx}`).value = signatures.reviewedByName || 'Muhammad Fadel R';
    ws.getCell(`F${curRowIdx}`).font = { name: 'Arial', size: 9, bold: true, underline: true };
    ws.getCell(`F${curRowIdx}`).alignment = { horizontal: 'center' };

    ws.mergeCells(`K${curRowIdx}:M${curRowIdx}`);
    ws.getCell(`K${curRowIdx}`).value = signatures.verifiedByName || 'Owner Rep';
    ws.getCell(`K${curRowIdx}`).font = { name: 'Arial', size: 9, bold: true, underline: true };
    ws.getCell(`K${curRowIdx}`).alignment = { horizontal: 'center' };
  }

  // Trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const safeVesselName = (vessel.name || 'Proyek_Kapal').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Estimasi_Material_Consumable_${safeVesselName}_${dateStr}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

