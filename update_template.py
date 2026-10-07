import sys

new_template_func = '''export async function generateImportTemplate(
  categories?: WorkCategory[],
  workItems?: WorkItem[],
  vesselOrName?: VesselSpec | string,
  schedule?: ProjectSchedule
): Promise<void> {
  const activeCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const activeWorkItems = workItems || [];

  let vessel: VesselSpec | undefined;
  let vesselName = 'KAPAL STANDAR';

  if (typeof vesselOrName === 'string') {
    vesselName = vesselOrName || 'KAPAL STANDAR';
    vessel = {
      id: 'vessel-template',
      name: vesselName,
      dimension: '23,97 x 7,26 x 3,00 Meter',
      vesselType: 'Tug Boat',
      dockingType: 'Docking Repair',
      companyOwner: 'PT. PELAYARAN NASIONAL INDONESIA',
      projectNo: 'E-081',
      classification: 'BKI',
      kindOfSurvey: 'Intermediate Survey No. 5',
    };
  } else if (vesselOrName) {
    vessel = vesselOrName;
    vesselName = vessel.name || 'KAPAL STANDAR';
  } else {
    vessel = {
      id: 'vessel-template',
      name: 'BG. CAKRAWALA I',
      dimension: '23,97 x 7,26 x 3,00 Meter',
      vesselType: 'Tug Boat',
      dockingType: 'Docking Repair',
      companyOwner: 'PT. CAKRAWALA NUSA BAHARI',
      projectNo: 'E-081',
      classification: 'BKI',
      kindOfSurvey: 'Intermediate Survey No. 5',
    };
    vesselName = vessel.name;
  }

  const projSchedule: ProjectSchedule = schedule || {
    id: 'sched-template',
    vesselId: vessel?.id || 'vessel-template',
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PPC Shipyard System';
  workbook.lastModifiedBy = 'PPC Shipyard System';
  workbook.created = new Date();

  // ---------------------------------------------------------------------------
  // SHEET 1: REPAIR LIST & SPEK KAPAL (Lengkap dengan Spek, Foto & Rumus Live)
  // ---------------------------------------------------------------------------
  const ws1 = workbook.addWorksheet('Repair List & Spek Kapal', {
    views: [{ showGridLines: true }],
  });

  ws1.columns = [
    { width: 9 },   // A: No
    { width: 38 },  // B: WORK ITEMS / SKEMA STRUKTUR HIERARKI
    { width: 22 },  // C: Keterangan
    { width: 14 },  // D: Type
    { width: 11 },  // E: D1
    { width: 11 },  // F: D2
    { width: 11 },  // G: D3
    { width: 13 },  // H: Panjang (dLen)
    { width: 10 },  // I: D4
    { width: 10 },  // J: Qty
    { width: 10 },  // K: Satuan
    { width: 20 },  // L: Berat Tonase (kg)
    { width: 18 },  // M: Harga Satuan (Rp)
    { width: 22 },  // N: Total Harga (Rp)
    { width: 22 },  // O: REMARK
  ];

  const totalCols = 15;

  // Row 1: Header Title
  ws1.mergeCells('A1:O1');
  const title1 = ws1.getCell('A1');
  title1.value = `TEMPLATE & DAFTAR PEKERJAAN REPAIR LIST - KAPAL ${vesselName.toUpperCase()}`;
  title1.font = { name: 'Arial', bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF03442C' } };
  title1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(1).height = 30;

  // Row 2: Subtitle
  ws1.mergeCells('A2:O2');
  const sub1 = ws1.getCell('A2');
  sub1.value = 'Dokumen Standar Repair List & Estimasi Tonase Galangan Kapal (Lengkap dengan Spesifikasi, Jadwal & Formula Live)';
  sub1.font = { name: 'Arial', italic: true, size: 9, color: { argb: 'FF334155' } };
  sub1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sub1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(2).height = 20;

  // Row 3: Blank
  ws1.getRow(3).height = 6;

  // Row 4-8: Vessel Specs & Project Schedule Header
  ws1.getCell('A4').value = 'SPESIFIKASI KAPAL (VESSEL PARTICULARS)';
  ws1.getCell('A4').font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF03442C' } };
  ws1.getCell('G4').value = 'JADWAL PROYEK DOCKING (MILESTONES)';
  ws1.getCell('G4').font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF03442C' } };
  ws1.getCell('L4').value = 'FOTO KAPAL (VESSEL PHOTO)';
  ws1.getCell('L4').font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF03442C' } };

  const specsLeft = [
    ['Nama Kapal', vessel?.name || vesselName, 'Dimensi (L x B x H)', vessel?.dimension || '23,97 x 7,26 x 3,00 M'],
    ['Tipe Kapal', vessel?.vesselType || 'Tug Boat', 'Metode Docking', vessel?.dockingType || 'Docking Repair'],
    ['Pemilik Kapal', vessel?.companyOwner || 'PT. PELAYARAN', 'No. Registrasi Proyek', vessel?.projectNo || 'E-081'],
    ['Klasifikasi', vessel?.classification || 'BKI', 'Jenis Survey', vessel?.kindOfSurvey || 'Intermediate Survey'],
  ];

  const specsRight = [
    ['Arrive @BGN', projSchedule.arriveBgn || '-', 'Start Contract', projSchedule.startContract || '-'],
    ['Arrival Meeting', projSchedule.arrivalMeeting || '-', 'Docking Date', projSchedule.dockingDate || '-'],
    ['Undocking Date', projSchedule.undockingDate || '-', 'Finish Work', projSchedule.finishWork || '-'],
    ['Sail Out', projSchedule.sailOut || '-', 'Posisi Dock', projSchedule.dockingPosition || '#5'],
  ];

  const specBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  let sRowIdx = 5;
  for (let i = 0; i < 4; i++) {
    const row = ws1.getRow(sRowIdx);
    row.height = 18;

    // Left specs
    row.getCell(1).value = specsLeft[i][0];
    row.getCell(1).font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF475569' } };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    row.getCell(1).border = specBorder;

    row.getCell(2).value = specsLeft[i][1];
    row.getCell(2).font = { name: 'Arial', bold: i === 0, size: 8.5, color: { argb: i === 0 ? 'FF03442C' : 'FF0F172A' } };
    row.getCell(2).border = specBorder;

    row.getCell(3).value = specsLeft[i][2];
    row.getCell(3).font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF475569' } };
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    row.getCell(3).border = specBorder;

    ws1.mergeCells(`D${sRowIdx}:F${sRowIdx}`);
    const cellD = row.getCell(4);
    cellD.value = specsLeft[i][3];
    cellD.font = { name: 'Arial', size: 8.5, color: { argb: 'FF0F172A' } };
    cellD.border = specBorder;

    // Right schedule
    row.getCell(7).value = specsRight[i][0];
    row.getCell(7).font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF475569' } };
    row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    row.getCell(7).border = specBorder;

    ws1.mergeCells(`H${sRowIdx}:I${sRowIdx}`);
    const cellH = row.getCell(8);
    cellH.value = specsRight[i][1];
    cellH.font = { name: 'Arial', size: 8.5, color: { argb: 'FF0F172A' } };
    cellH.border = specBorder;

    row.getCell(10).value = specsRight[i][2];
    row.getCell(10).font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF475569' } };
    row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    row.getCell(10).border = specBorder;

    row.getCell(11).value = specsRight[i][3];
    row.getCell(11).font = { name: 'Arial', size: 8.5, color: { argb: 'FF0F172A' } };
    row.getCell(11).border = specBorder;

    sRowIdx++;
  }

  // Vessel Photo area in rows 5-8, cols L-O
  ws1.mergeCells('L5:O8');
  const photoCell = ws1.getCell('L5');
  photoCell.border = {
    top: { style: 'medium', color: { argb: 'FF03442C' } },
    bottom: { style: 'medium', color: { argb: 'FF03442C' } },
    left: { style: 'medium', color: { argb: 'FF03442C' } },
    right: { style: 'medium', color: { argb: 'FF03442C' } },
  };
  photoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  photoCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // If photoUrl exists and is base64, embed it
  if (vessel?.photoUrl && vessel.photoUrl.startsWith('data:image/')) {
    try {
      const parts = vessel.photoUrl.split(',');
      const mimeMatch = vessel.photoUrl.match(/data:(image\/[a-zA-Z0-9]+);base64/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const ext = mime.includes('png') ? 'png' : 'jpeg';
      const base64Data = parts[1];

      const imgId = workbook.addImage({
        base64: base64Data,
        extension: ext as 'png' | 'jpeg',
      });

      ws1.addImage(imgId, {
        tl: { col: 11, row: 4 },
        br: { col: 15, row: 8 },
        editAs: 'oneCell',
      });
    } catch (e) {
      console.warn('Could not embed photo in Excel template:', e);
      photoCell.value = `[Foto Kapal: ${vessel.name}]\n(Gambar terpasang)`;
    }
  } else {
    photoCell.value = `[FOTO KAPAL - ${vessel?.name || 'VESSEL'}]\n(Sisipkan gambar kapal di sini)`;
    photoCell.font = { name: 'Arial', italic: true, size: 8.5, color: { argb: 'FF64748B' } };
  }

  // Row 9: Blank
  ws1.getRow(9).height = 8;

  // Row 10: Column Headers
  const headers = [
    'No.',
    'WORK ITEMS / SKEMA STRUKTUR HIERARKI',
    'Keterangan',
    'Type',
    'D1',
    'D2',
    'D3',
    'Panjang',
    'D4',
    'Qty',
    'Satuan',
    'Berat Tonase (kg)',
    'Harga Satuan (Rp)',
    'Total Harga (Rp)',
    'REMARK',
  ];

  const headerRow = ws1.getRow(10);
  headerRow.height = 26;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF03442C' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF023321' } },
      bottom: { style: 'medium', color: { argb: 'FF023321' } },
      left: { style: 'thin', color: { argb: 'FF023321' } },
      right: { style: 'thin', color: { argb: 'FF023321' } },
    };
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  const doubleBottomBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF475569' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'double', color: { argb: 'FF0F172A' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  const numberFormatKg = '#,##0.00 "kg";-#,##0.00 "kg";""';
  const currencyFormat = '"Rp "#,##0;- "Rp "#,##0;""';

  // Sample items to render if no work items exist
  const sampleTemplateItems: WorkItem[] = [
    { id: 'tpl-1', projectId: 'sample-project', categoryId: 'cat-1', itemNo: '1', description: 'Pelayanan Docking & Undocking Kapal', itemLevel: 3, qty: 1, unit: 'ls', unitPrice: 35000000, totalPrice: 35000000, remark: 'Sesuai Kontrak' },
    { id: 'tpl-2', projectId: 'sample-project', categoryId: 'cat-3', itemNo: '1', description: '[AREA] LAMBUNG KAPAL (HULL AREA)', itemLevel: 1, isAreaHeader: true, qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Area Lambung' },
    { id: 'tpl-3', projectId: 'sample-project', categoryId: 'cat-3', itemNo: '1.1', description: '[SUB-SYSTEM] BOTTOM & SIDE SHELL BLASTING', itemLevel: 2, parentId: 'tpl-2', qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Blasting Sa 2.0' },
    { id: 'tpl-4', projectId: 'sample-project', categoryId: 'cat-3', itemNo: '1.1.1', description: 'High Pressure Water Jetting & Spot Blasting Sa 2.0', itemLevel: 3, qty: 450, unit: 'm²', unitPrice: 85000, totalPrice: 38250000, parentId: 'tpl-3', remark: 'Area Bottom' },
    { id: 'tpl-5', projectId: 'sample-project', categoryId: 'cat-7', itemNo: '1', description: '[AREA] PELAT KULIT LAMBUNG & STRUKTUR BAJA', itemLevel: 1, isAreaHeader: true, qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Steel Repair' },
    { id: 'tpl-6', projectId: 'sample-project', categoryId: 'cat-7', itemNo: '1.1', description: '[SUB-SYSTEM] BOTTOM PLATING FR. 20 - 35', itemLevel: 2, parentId: 'tpl-5', qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Plating Bottom' },
    { id: 'tpl-7', projectId: 'sample-project', categoryId: 'cat-7', itemNo: '1.1.1', description: 'Ganti Pelat Bottom Lajur A Tebal 12mm BKI Grade A', type: 'PL', d1: '6000', d2: '1500', d3: '12', qty: 2, unit: 'lbr', weightKg: 1695.6, unitPrice: 28500, totalPrice: 48324600, parentId: 'tpl-6', itemLevel: 3, remark: 'Material Galangan' },
    { id: 'tpl-8', projectId: 'sample-project', categoryId: 'cat-7', itemNo: '1.1.2', description: 'Ganti Besi Siku Frame Bottom L 75x75x9mm', type: 'EA', d1: '6000', d2: '75', d3: '9', qty: 4, unit: 'btg', weightKg: 242.8, unitPrice: 26000, totalPrice: 6312800, parentId: 'tpl-6', itemLevel: 3, remark: 'Material Galangan' },
    { id: 'tpl-9', projectId: 'sample-project', categoryId: 'cat-8', itemNo: '1', description: '[AREA] SISTEM PERPIPAAN KAMAR MESIN', itemLevel: 1, isAreaHeader: true, qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Machinery Piping' },
    { id: 'tpl-10', projectId: 'sample-project', categoryId: 'cat-8', itemNo: '1.1', description: '[SUB-SYSTEM] PIPA SEAWATER COOLING 3" SCH 40', itemLevel: 2, parentId: 'tpl-9', qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Cooling Line' },
    { id: 'tpl-11', projectId: 'sample-project', categoryId: 'cat-8', itemNo: '1.1.1', description: 'Fabrikasi & Pasang Pipa Galvanis 3" Sch 40', type: 'PP', d1: '6000', d2: '88.9', d3: '5.49', qty: 3, unit: 'btg', weightKg: 202.8, unitPrice: 32000, totalPrice: 6489600, parentId: 'tpl-10', itemLevel: 3, remark: 'Ready Stock' },
  ];

  const itemsToRender: WorkItem[] = activeWorkItems.length > 0 ? activeWorkItems : sampleTemplateItems;

  let currentRowIdx = 11;
  const categorySubtotalRowIndices: number[] = [];

  const addCategoryBanner = (catText: string) => {
    const r = ws1.getRow(currentRowIdx);
    r.height = 22;
    ws1.mergeCells(`A${currentRowIdx}:O${currentRowIdx}`);
    const c = r.getCell(1);
    c.value = catText;
    c.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF023321' } };
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    c.border = thinBorder;
    currentRowIdx++;
    return r.number;
  };

  activeCategories.forEach((cat) => {
    const catItems = itemsToRender.filter((i) => i.categoryId === cat.id);
    if (catItems.length === 0) return;

    addCategoryBanner(`${cat.code} - ${cat.name.toUpperCase()}`);

    const categoryItemStartRow = currentRowIdx;

    catItems.forEach((item) => {
      const row = ws1.getRow(currentRowIdx);
      row.height = 20;
      const r = currentRowIdx;

      const isArea = item.itemLevel === 1 || item.isAreaHeader;
      const isSub = item.itemLevel === 2;

      row.getCell(1).value = item.itemNo;
      row.getCell(2).value = item.description;
      row.getCell(3).value = item.notes || '';
      row.getCell(4).value = item.type && item.type !== '-' ? item.type : '';
      row.getCell(5).value = item.d1 ? Number(item.d1) || item.d1 : '';
      row.getCell(6).value = item.d2 ? Number(item.d2) || item.d2 : '';
      row.getCell(7).value = item.d3 ? Number(item.d3) || item.d3 : '';
      row.getCell(8).value = item.dLen ? Number(item.dLen) || item.dLen : '';
      row.getCell(9).value = item.d4 ? Number(item.d4) || item.d4 : '';

      if (isArea || isSub) {
        row.getCell(10).value = item.qty && item.qty > 0 ? item.qty : '';
        row.getCell(11).value = item.unit && item.unit !== '-' ? item.unit : '';
      } else {
        row.getCell(10).value = item.qty || 1;
        row.getCell(11).value = item.unit || 'kg';
      }

      // Column L (12): Tonase Formula
      const wCell = row.getCell(12);
      if (isArea) {
        wCell.value = item.weightKg && item.weightKg > 0 ? item.weightKg : '';
      } else {
        // Dynamic Steel & Material Live Formula in Col L
        const tonaseForm = `IF(OR(D${r}="PL",D${r}="PL ABS",D${r}="PL BKI",D${r}="PLATE"), E${r}*F${r}*G${r}*0.00000785*J${r}, IF(OR(D${r}="EA",D${r}="UA",D${r}="L"), (E${r}+IF(F${r}>0,F${r},E${r})-G${r})*G${r}*0.00785*(IF(H${r}>0,H${r}/1000,6))*J${r}, IF(OR(D${r}="PP",D${r}="PIPE"), (F${r}-G${r})*G${r}*0.0246615*(IF(H${r}>0,H${r}/1000,6))*IF(I${r}>0,I${r},J${r}), IF(D${r}="FB", E${r}*G${r}*0.00785*(IF(H${r}>0,H${r}/1000,6))*J${r}, IF(D${r}="RB", 0.006165*E${r}*E${r}*(IF(H${r}>0,H${r}/1000,6))*J${r}, IF(D${r}="SB", G${r}*G${r}*0.00785*(IF(H${r}>0,H${r}/1000,6))*J${r}, IF(OR(K${r}="m",K${r}="meter"), (H${r}*J${r})/1000, IF(ISNUMBER(${item.weightKg || 0}), ${item.weightKg || 0}, 0))))))))`;
        wCell.value = {
          formula: `IFERROR(IF(${tonaseForm}=0, "", ${tonaseForm}), ${item.weightKg || 0})`,
          result: item.weightKg || 0,
        };
      }
      wCell.numFmt = numberFormatKg;

      // Column M (13): Unit Price
      row.getCell(13).value = item.unitPrice && item.unitPrice > 0 ? item.unitPrice : '';
      row.getCell(13).numFmt = currencyFormat;

      // Column N (14): Total Price Formula
      const pCell = row.getCell(14);
      const priceForm = `IFERROR(IF(AND(K${r}="kg", L${r}>0), L${r}*M${r}, IF(OR(K${r}="m", K${r}="meter"), ((H${r}*J${r})/1000)*M${r}, J${r}*M${r})), ${item.totalPrice || 0})`;
      pCell.value = {
        formula: `IFERROR(IF(${priceForm}=0, "", ${priceForm}), ${item.totalPrice || 0})`,
        result: item.totalPrice || 0,
      };
      pCell.numFmt = currencyFormat;

      // Column O (15): Remark
      row.getCell(15).value = item.remark || '';

      // Formatting
      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
        if (isArea) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E3B4E' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
        } else if (isSub) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
          cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF065F46' } };
        } else {
          cell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF1E293B' } };
        }

        if ([1, 4, 5, 6, 7, 8, 9, 10, 11].includes(c)) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        else if ([12, 13, 14].includes(c)) cell.alignment = { horizontal: 'right', vertical: 'middle' };
        else cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      currentRowIdx++;
    });

    // Subtotal Row
    const subRow = ws1.getRow(currentRowIdx);
    subRow.height = 20;
    subRow.getCell(2).value = `SUBTOTAL ${cat.name.toUpperCase()}`;
    subRow.getCell(2).font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF03442C' } };

    const subWCell = subRow.getCell(12);
    subWCell.value = {
      formula: `SUM(L${categoryItemStartRow}:L${currentRowIdx - 1})`,
      result: catItems.reduce((a, b) => a + (b.weightKg || 0), 0),
    };
    subWCell.font = { name: 'Arial', size: 8.5, bold: true };
    subWCell.numFmt = numberFormatKg;
    subWCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const subPCell = subRow.getCell(14);
    subPCell.value = {
      formula: `SUM(N${categoryItemStartRow}:N${currentRowIdx - 1})`,
      result: catItems.reduce((a, b) => a + (b.totalPrice || 0), 0),
    };
    subPCell.font = { name: 'Arial', size: 8.5, bold: true };
    subPCell.numFmt = currencyFormat;
    subPCell.alignment = { horizontal: 'right', vertical: 'middle' };

    for (let c = 1; c <= totalCols; c++) {
      const cell = subRow.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      cell.border = thinBorder;
    }

    categorySubtotalRowIndices.push(currentRowIdx);
    currentRowIdx++;
  });

  ws1.addRow([]);
  currentRowIdx++;

  // Grand Total Summary
  const gtWeightRow = ws1.getRow(currentRowIdx);
  gtWeightRow.height = 22;
  gtWeightRow.getCell(2).value = 'TOTAL TONASE BAJA (KG)';
  gtWeightRow.getCell(2).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
  gtWeightRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

  const gtWCell = gtWeightRow.getCell(12);
  gtWCell.value = categorySubtotalRowIndices.length > 0
    ? { formula: categorySubtotalRowIndices.map((idx) => `L${idx}`).join('+'), result: 0 }
    : 0;
  gtWCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF92400E' } };
  gtWCell.numFmt = numberFormatKg;
  gtWCell.alignment = { horizontal: 'right', vertical: 'middle' };
  gtWCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  gtWCell.border = doubleBottomBorder;

  currentRowIdx++;

  const gtCostRow = ws1.getRow(currentRowIdx);
  gtCostRow.height = 24;
  gtCostRow.getCell(2).value = 'GRAND TOTAL ESTIMASI BIAYA REPARASI (RP)';
  gtCostRow.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF047857' } };
  gtCostRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

  const gtCostCell = gtCostRow.getCell(14);
  gtCostCell.value = categorySubtotalRowIndices.length > 0
    ? { formula: categorySubtotalRowIndices.map((idx) => `N${idx}`).join('+'), result: 0 }
    : 0;
  gtCostCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF047857' } };
  gtCostCell.numFmt = currencyFormat;
  gtCostCell.alignment = { horizontal: 'right', vertical: 'middle' };
  gtCostCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  gtCostCell.border = doubleBottomBorder;

  // ---------------------------------------------------------------------------
  // SHEET 2: TEMPLATE COPY-PASTE (NO - REMARK)
  // ---------------------------------------------------------------------------
  const ws2 = workbook.addWorksheet('Format Copy-Paste (No-REMARK)', {
    views: [{ showGridLines: true }],
  });

  ws2.columns = [
    { width: 8 },   // A: No
    { width: 36 },  // B: WORK ITEMS / SKEMA STRUKTUR HIERARKI
    { width: 20 },  // C: Keterangan
    { width: 12 },  // D: Type
    { width: 10 },  // E: D1
    { width: 10 },  // F: D2
    { width: 10 },  // G: D3
    { width: 12 },  // H: Panjang
    { width: 10 },  // I: D4
    { width: 10 },  // J: Qty
    { width: 10 },  // K: Satuan
    { width: 18 },  // L: Berat Tonase (kg)
    { width: 16 },  // M: Harga Satuan (Rp)
    { width: 20 },  // N: Total Harga (Rp)
    { width: 20 },  // O: REMARK
  ];

  const headerRow2 = ws2.getRow(1);
  headerRow2.height = 24;
  headers.forEach((h, idx) => {
    const cell = headerRow2.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF03442C' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  let r2Idx = 2;
  itemsToRender.forEach((item) => {
    const row = ws2.getRow(r2Idx);
    row.height = 19;
    const r = r2Idx;

    row.getCell(1).value = item.itemNo;
    row.getCell(2).value = item.description;
    row.getCell(3).value = item.notes || '';
    row.getCell(4).value = item.type && item.type !== '-' ? item.type : '';
    row.getCell(5).value = item.d1 ? Number(item.d1) || item.d1 : '';
    row.getCell(6).value = item.d2 ? Number(item.d2) || item.d2 : '';
    row.getCell(7).value = item.d3 ? Number(item.d3) || item.d3 : '';
    row.getCell(8).value = item.dLen ? Number(item.dLen) || item.dLen : '';
    row.getCell(9).value = item.d4 ? Number(item.d4) || item.d4 : '';
    row.getCell(10).value = item.qty || 1;
    row.getCell(11).value = item.unit || 'kg';

    const tonaseForm = `IF(OR(D${r}="PL",D${r}="PL ABS",D${r}="PL BKI",D${r}="PLATE"), E${r}*F${r}*G${r}*0.00000785*J${r}, IF(OR(D${r}="EA",D${r}="UA",D${r}="L"), (E${r}+IF(F${r}>0,F${r},E${r})-G${r})*G${r}*0.00785*(IF(H${r}>0,H${r}/1000,6))*J${r}, IF(OR(D${r}="PP",D${r}="PIPE"), (F${r}-G${r})*G${r}*0.0246615*(IF(H${r}>0,H${r}/1000,6))*IF(I${r}>0,I${r},J${r}), IF(D${r}="FB", E${r}*G${r}*0.00785*(IF(H${r}>0,H${r}/1000,6))*J${r}, IF(D${r}="RB", 0.006165*E${r}*E${r}*(IF(H${r}>0,H${r}/1000,6))*J${r}, IF(D${r}="SB", G${r}*G${r}*0.00785*(IF(H${r}>0,H${r}/1000,6))*J${r}, IF(OR(K${r}="m",K${r}="meter"), (H${r}*J${r})/1000, IF(ISNUMBER(${item.weightKg || 0}), ${item.weightKg || 0}, 0))))))))`;
    const wCell = row.getCell(12);
    wCell.value = {
      formula: `IFERROR(IF(${tonaseForm}=0, "", ${tonaseForm}), ${item.weightKg || 0})`,
      result: item.weightKg || 0,
    };
    wCell.numFmt = numberFormatKg;

    row.getCell(13).value = item.unitPrice && item.unitPrice > 0 ? item.unitPrice : '';
    row.getCell(13).numFmt = currencyFormat;

    const priceForm = `IFERROR(IF(AND(K${r}="kg", L${r}>0), L${r}*M${r}, IF(OR(K${r}="m", K${r}="meter"), ((H${r}*J${r})/1000)*M${r}, J${r}*M${r})), ${item.totalPrice || 0})`;
    const pCell = row.getCell(14);
    pCell.value = {
      formula: `IFERROR(IF(${priceForm}=0, "", ${priceForm}), ${item.totalPrice || 0})`,
      result: item.totalPrice || 0,
    };
    pCell.numFmt = currencyFormat;

    row.getCell(15).value = item.remark || '';

    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.font = { name: 'Arial', size: 8.5 };
      if ([1, 4, 5, 6, 7, 8, 9, 10, 11].includes(c)) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      else if ([12, 13, 14].includes(c)) cell.alignment = { horizontal: 'right', vertical: 'middle' };
      else cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }

    r2Idx++;
  });

  // ---------------------------------------------------------------------------
  // SHEET 3: PANDUAN KODE MATERIAL & FORMULA
  // ---------------------------------------------------------------------------
  const ws3 = workbook.addWorksheet('Panduan & Rumus Material', {
    views: [{ showGridLines: true }],
  });

  ws3.columns = [
    { width: 14 }, // A: Kode Material
    { width: 26 }, // B: Nama Material
    { width: 14 }, // C: Satuan Standar
    { width: 42 }, // D: Parameter Dimensi
    { width: 48 }, // E: Rumus Excel Berat (kg)
  ];

  ws3.mergeCells('A1:E1');
  const t3 = ws3.getCell('A1');
  t3.value = 'PANDUAN KODE TIPE MATERIAL & FORMULA BERAT TONASE SHIPYARD';
  t3.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  t3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF03442C' } };
  t3.alignment = { vertical: 'middle', horizontal: 'center' };
  ws3.getRow(1).height = 26;

  const refHeaders = ['Kode Tipe', 'Nama Material', 'Satuan', 'Parameter Dimensi', 'Rumus Excel Perhitungan Tonase (kg)'];
  const refHeaderRow = ws3.getRow(2);
  refHeaderRow.height = 22;
  refHeaders.forEach((h, idx) => {
    const c = refHeaderRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF023321' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const refData = [
    ['PL / PL ABS', 'Pelat Baja Mild Steel (Marine Grade)', 'kg / lbr', 'D1: Panjang (mm), D2: Lebar (mm), D3: Tebal (mm)', '= D1 * D2 * D3 * 0.00000785 * Qty'],
    ['EA / UA / L', 'Besi Siku Equal / Unequal Angle', 'kg / btg', 'D1: Sayap 1 (mm), D2: Sayap 2 (mm), D3: Tebal (mm), Panjang: (mm)', '= (D1 + D2 - D3) * D3 * 0.00785 * (Panjang/1000) * Qty'],
    ['PP / PIPE', 'Pipa Baja Seamless / Welded', 'kg / btg / m', 'D2: Outer Diameter (mm), D3: Wall Thickness (mm), Panjang: (mm)', '= (D2 - D3) * D3 * 0.0246615 * (Panjang/1000) * Qty'],
    ['FB', 'Flat Bar / Plat Strip', 'kg / btg', 'D1: Lebar (mm), D3: Tebal (mm), Panjang: (mm)', '= D1 * D3 * 0.00785 * (Panjang/1000) * Qty'],
    ['RB', 'Round Bar / Besi As Bulat', 'kg / btg', 'D1: Diameter (mm), Panjang: (mm)', '= 0.006165 * D1 * D1 * (Panjang/1000) * Qty'],
    ['SB', 'Square Bar / Besi Nako Kotak', 'kg / btg', 'D3: Sisi Kotak (mm), Panjang: (mm)', '= D3 * D3 * 0.00785 * (Panjang/1000) * Qty'],
    ['CQR', 'Chequered Plate / Bordes', 'kg / lbr', 'D1: Panjang (mm), D2: Lebar (mm), D3: Tebal Dasar (mm)', '= (D1 * D2 / 1000000) * (D3 * 7.85 + 2.1014) * Qty'],
    ['GR', 'Steel Grating', 'kg / panel', 'D1: Panjang (mm), D2: Lebar (mm), D3: Tebal Bar (mm)', '= (D1 * D2 / 1000000) * 37.037 * Qty'],
  ];

  refData.forEach((rowVals, rIdx) => {
    const row = ws3.getRow(rIdx + 3);
    row.height = 20;
    rowVals.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;
      cell.border = thinBorder;
      cell.font = { name: 'Arial', size: 8.5 };
      if (cIdx === 0 || cIdx === 2) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      else cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileNameSlug = vesselName ? vesselName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() : '';
  link.download = fileNameSlug ? `TEMPLATE_REPAIR_LIST_${fileNameSlug}.xlsx` : 'TEMPLATE_REPAIR_LIST.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
'''

with open('src/utils/fileImport.ts', 'r') as f:
    full_content = f.read()

find_idx = full_content.find('export async function generateImportTemplate(')
if find_idx != -1:
    updated_content = full_content[:find_idx] + new_template_func
    with open('src/utils/fileImport.ts', 'w') as f:
        f.write(updated_content)
    print('Template updated successfully!')
else:
    print('Error: Could not find function')
