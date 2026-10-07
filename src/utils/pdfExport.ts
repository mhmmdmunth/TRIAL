import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  VesselSpec,
  ProjectSchedule,
  WorkCategory,
  WorkItem,
  Signatures,
  DefectSurvey,
} from '../types';
import { TonnageCalculator } from './tonnageCalculator';
import { getItemLevel } from './numberingUtils';
import { getResolvedVendorInfo } from '../components/OpnameVerificationTable';

export type PdfDocumentType = 'repair-list' | 'cost-estimation' | 'defect-survey';
export type PdfOrientation = 'portrait' | 'landscape';

export interface GeneratePdfOptions {
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  categories: WorkCategory[];
  workItems: WorkItem[];
  signatures: Signatures;
  defectSurveys?: DefectSurvey[];
  docType?: PdfDocumentType;
  orientation?: PdfOrientation;
  includePrices?: boolean;
  notes?: string;
}

async function getBase64Image(url: string): Promise<{ dataUrl: string; format: string } | null> {
  if (!url) return null;

  if (url.startsWith('data:image/')) {
    let format = 'JPEG';
    if (url.startsWith('data:image/png')) format = 'PNG';
    else if (url.startsWith('data:image/svg')) format = 'PNG';
    else if (url.startsWith('data:image/webp')) format = 'WEBP';
    else if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) format = 'JPEG';
    return { dataUrl: url, format };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 720;
        canvas.height = img.height || 220;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const isTransparent = url.includes('.png') || url.includes('.svg') || url.includes('image/svg') || url.includes('image/png');
          const dataUrl = canvas.toDataURL(isTransparent ? 'image/png' : 'image/jpeg', 0.95);
          resolve({ dataUrl, format: isTransparent ? 'PNG' : 'JPEG' });
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Inlined high-definition vector SVG for Adaro logo to guarantee instant offline rendering
const ADARO_LOGO_SVG_DATA_URI = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 110" width="360" height="110"><g fill="%2376787b"><path d="M 64 62 C 64 47 52 41 38 41 C 24 41 12 47 12 60 C 12 70 20 77 34 77 C 46 77 56 71 61 64 L 61 75 L 75 75 L 75 43 C 75 28 61 22 39 22 C 22 22 10 27 6 36 L 18 43 C 21 37 28 34 39 34 C 50 34 61 38 61 47 L 61 52 C 55 49 47 48 39 48 C 22 48 10 55 10 68 C 10 79 19 86 33 86 C 47 86 58 79 63 70 L 64 75 L 76 75 L 76 62 Z M 62 63 C 58 69 49 74 37 74 C 28 74 23 69 23 62 C 23 55 29 51 40 51 C 48 51 56 53 62 56 Z"/><path d="M 134 11 L 121 11 L 121 34 C 115 27 104 22 91 22 C 70 22 55 37 55 58 C 55 79 70 94 91 94 C 104 94 115 89 121 82 L 121 93 L 134 93 Z M 121 58 C 121 72 110 82 95 82 C 80 82 69 72 69 58 C 69 44 80 34 95 34 C 110 34 121 44 121 58 Z"/><path d="M 194 62 C 194 47 182 41 168 41 C 154 41 142 47 142 60 C 142 70 150 77 164 77 C 176 77 186 71 191 64 L 191 75 L 205 75 L 205 43 C 205 28 191 22 169 22 C 152 22 140 27 136 36 L 148 43 C 151 37 158 34 169 34 C 180 34 191 38 191 47 L 191 52 C 185 49 177 48 169 48 C 152 48 140 55 140 68 C 140 79 149 86 163 86 C 177 86 188 79 193 70 L 194 75 L 206 75 L 206 62 Z M 192 63 C 188 69 179 74 167 74 C 158 74 153 69 153 62 C 153 55 159 51 170 51 C 178 51 186 53 192 56 Z"/><path d="M 221 36 L 221 24 L 208 24 L 208 93 L 222 93 L 222 55 C 222 42 230 35 242 35 C 246 35 250 36 253 37 L 256 24 C 252 23 247 22 241 22 C 231 22 224 27 221 36 Z"/><path d="M 293 22 C 271 22 255 37 255 58 C 255 79 271 94 293 94 C 315 94 331 79 331 58 C 331 37 315 22 293 22 Z M 293 82 C 279 82 269 71 269 58 C 269 45 279 34 293 34 C 307 34 317 45 317 58 C 317 71 307 82 293 82 Z"/></g><g transform="translate(262, 5) scale(0.92)"><polygon points="56,0 30,28 50,45 80,18" fill="%23d2e42c"/><polygon points="80,18 50,45 74,54 94,36" fill="%23b9e7f5"/><polygon points="94,36 74,54 98,78 100,56" fill="%2304562c"/><polygon points="74,54 62,80 98,78" fill="%2300833e"/><polygon points="50,96 62,80 34,70 28,94" fill="%230b4822"/><polygon points="28,94 34,70 10,60 6,76" fill="%23147c38"/><polygon points="6,76 10,60 30,48 4,40" fill="%232da94d"/><polygon points="4,40 30,48 30,28 20,16" fill="%239cd624"/><polygon points="30,28 50,45 38,62 30,48" fill="%23a7e235"/><polygon points="50,45 74,54 62,80 38,62" fill="%23009344"/><polygon points="38,62 62,80 34,70" fill="%2308612d"/><polygon points="44,48 54,54 48,62 38,56" fill="%23ffffff"/></g></svg>`;

async function getAdaroLogo(): Promise<{ dataUrl: string; format: string } | null> {
  const fromFile = await getBase64Image('/adaro-logo.svg');
  if (fromFile) return fromFile;
  return getBase64Image(ADARO_LOGO_SVG_DATA_URI);
}

export async function buildShipyardPdfDoc(options: GeneratePdfOptions): Promise<jsPDF> {
  const {
    vessel,
    schedule,
    categories,
    workItems,
    signatures,
    defectSurveys = [],
    docType = 'repair-list',
    orientation = docType === 'cost-estimation' ? 'landscape' : 'landscape',
    includePrices = false,
  } = options;

  const photoInfo = vessel.photoUrl ? await getBase64Image(vessel.photoUrl) : null;
  const isCostBoQ = docType === 'cost-estimation' || includePrices;
  const isLandscape = orientation === 'landscape';

  // Initialize jsPDF with selected orientation
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm (Landscape) or 210mm (Portrait)
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm (Landscape) or 297mm (Portrait)
  const marginX = isLandscape ? 10 : 8;
  let currentY = 7;

  // --------------------------------------------------------------------------
  // 1. FORMAL HEADER & SHIPYARD BRANDING
  // --------------------------------------------------------------------------
  
  // Top primary color accent bar (Shipyard Dark Green #166534)
  doc.setFillColor(22, 101, 52);
  doc.rect(marginX, currentY, pageWidth - marginX * 2, 2, 'F');
  
  // Ample vertical spacing below the green bar so text never overlaps
  currentY += 8;

  // Document Title (Clean & Bold: REPAIR LIST - Centered)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 15 : 13.5);
  doc.setTextColor(15, 23, 42); // slate-900

  let docTitle = 'REPAIR LIST';
  if (docType === 'cost-estimation') {
    docTitle = 'ESTIMASI BIAYA & REPAIR LIST';
  } else if (docType === 'defect-survey') {
    docTitle = 'LAPORAN DEFECT SURVEY & TONASE';
  }
  // Title centered horizontally
  doc.text(docTitle, pageWidth / 2, currentY + 3.5, { align: 'center' });

  // Right Header: Clean ADARO text only
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 14 : 12.5);
  doc.setTextColor(22, 101, 52); // Shipyard green
  doc.text('ADARO', pageWidth - marginX, currentY + 3.5, { align: 'right' });

  currentY += 10.5;

  // --------------------------------------------------------------------------
  // 2. VESSEL SPECIFICATION & PROJECT SCHEDULE CARDS
  // --------------------------------------------------------------------------
  const hasPhoto = Boolean(photoInfo && photoInfo.dataUrl);
  const totalAvailableWidth = pageWidth - marginX * 2;
  const photoBoxWidth = hasPhoto ? (isLandscape ? 44 : 36) : 0;
  const specGap = 3;
  const remainingWidth = hasPhoto
    ? totalAvailableWidth - photoBoxWidth - specGap * 2
    : totalAvailableWidth - specGap;
  const boxWidth = remainingWidth / 2;
  const boxHeight = isLandscape ? 41 : 42;

  // Left Box: General Specification Vessel
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.2);
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(marginX, currentY, boxWidth, boxHeight, 1, 1, 'FD');

  // Left Box Header
  doc.setFillColor(22, 101, 52);
  doc.rect(marginX, currentY, boxWidth, 4.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);
  doc.text('GENERAL SPESIFICATION VESSEL', marginX + 2.5, currentY + 3.4);

  // Left Box Content
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  const leftSpecs = [
    ['Vessel Name', `: ${vessel.name || '-'}`],
    ['Dimension', `: ${vessel.dimension || '-'}`],
    ['Vessel Type', `: ${vessel.vesselType || '-'}`],
    ['Docking Type', `: ${vessel.dockingType || '-'}`],
    ['Company Owner', `: ${vessel.companyOwner || '-'}`],
    ['Project No', `: ${vessel.projectNo || '-'}`],
    ['Classification', `: ${vessel.classification || '-'}`],
    ['Kind of Survey', `: ${vessel.kindOfSurvey || '-'}`],
  ];

  let specY = currentY + 7.4;
  const labelX = marginX + 2.5;
  const valueX = marginX + (isLandscape ? 28 : 25);
  leftSpecs.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(lbl, labelX, specY);
    doc.setFont('helvetica', 'normal');
    doc.text(val, valueX, specY);
    specY += 3.6;
  });

  // Middle Box: Date of Project & Docking Schedule
  const rightX = marginX + boxWidth + specGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightX, currentY, boxWidth, boxHeight, 1, 1, 'FD');

  doc.setFillColor(22, 101, 52);
  doc.rect(rightX, currentY, boxWidth, 4.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);
  doc.text('DATE OF PROJECT & SCHEDULE', rightX + 2.5, currentY + 3.4);

  const rightSpecs = [
    ['Arrive @BGN', `: ${schedule.arriveBgn || '-'}`],
    ['Start Contract', `: ${schedule.startContract || '-'}`],
    ['Arrival Meeting', `: ${schedule.arrivalMeeting || '-'}`],
    ['Docking Date', `: ${schedule.dockingDate || '-'}`],
    ['Undocking Date', `: ${schedule.undockingDate || '-'}`],
    ['Finish Work', `: ${schedule.finishWork || '-'}`],
    ['Sail Out', `: ${schedule.sailOut || '-'}`],
    ['Docking Pos / Dur', `: ${schedule.dockingPosition || '-'} (${schedule.dockingDurationDays || 0} hari)`],
  ];

  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);

  specY = currentY + 7.4;
  const rightLabelX = rightX + 2.5;
  const rightValueX = rightX + (isLandscape ? 28 : 25);
  rightSpecs.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(lbl, rightLabelX, specY);
    doc.setFont('helvetica', 'normal');
    doc.text(val, rightValueX, specY);
    specY += 3.6;
  });

  // Right Box: Visual Kapal Photo (if available)
  if (hasPhoto && photoInfo) {
    const photoBoxX = rightX + boxWidth + specGap;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(photoBoxX, currentY, photoBoxWidth, boxHeight, 1, 1, 'FD');

    doc.setFillColor(22, 101, 52);
    doc.rect(photoBoxX, currentY, photoBoxWidth, 4.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(255, 255, 255);
    doc.text('VISUAL KAPAL', photoBoxX + 2.5, currentY + 3.4);

    try {
      doc.addImage(
        photoInfo.dataUrl,
        photoInfo.format,
        photoBoxX + 1.5,
        currentY + 5.5,
        photoBoxWidth - 3,
        boxHeight - 7,
        undefined,
        'FAST'
      );
    } catch (err) {
      console.warn('Failed to embed vessel image in PDF', err);
    }
  }

  currentY += boxHeight + 2.5;

  // --------------------------------------------------------------------------
  // 3. UNDER-MENTIONED WORK DECLARATION BANNER
  // --------------------------------------------------------------------------
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.rect(marginX, currentY, pageWidth - marginX * 2, 6.5, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(22, 101, 52);
  doc.text(
    'Item pekerjaan di bawah ini telah diselesaikan dengan baik dan memuaskan sesuai spesifikasi pekerjaan',
    pageWidth / 2,
    currentY + 2.7,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.0);
  doc.setTextColor(71, 85, 105);
  doc.text(
    '(The under mentioned works has been satisfactorily performed and completed following the jobs specification)',
    pageWidth / 2,
    currentY + 5.1,
    { align: 'center' }
  );

  currentY += 7.5;

  // --------------------------------------------------------------------------
  // 4. REPAIR LIST TABLE GENERATION (AUTHENTIC HIERARCHY & REPAIR SHEET STYLE)
  // --------------------------------------------------------------------------
  
  // Table Column Headers matching the Repair List Table format
  const tableHead = isCostBoQ
    ? [
        [
          'No',
          'W O R K   I T E M S  /  Description',
          'Keterangan',
          'Type',
          'D1',
          'D2',
          'D3',
          'D.Len',
          'D4',
          'Vol / Qty',
          'Satuan',
          'Tonase (kg)',
          'REMARK',
          'Tarif (Rp)',
          'Total (Rp)',
        ],
      ]
    : [
        [
          'No',
          'W O R K   I T E M S  /  Description',
          'Keterangan',
          'Type',
          'D1',
          'D2',
          'D3',
          'D.Len',
          'D4',
          'Vol / Qty',
          'Satuan',
          'Tonase (kg)',
          'REMARK',
        ],
      ];

  const tableBody: any[] = [];
  let grandTotalWeight = 0;
  let grandTotalCost = 0;
  const totalCols = isCostBoQ ? 15 : 13;

  // Iterate over each Category I to XI
  categories.forEach((cat) => {
    const itemsInCat = workItems.filter((w) => w.categoryId === cat.id);
    if (itemsInCat.length === 0) return;

    // 4.1. Category Separator Row (Full-width Forest Green header)
    const catTitle = `${cat.code}.  ${cat.name.toUpperCase()}`;
    tableBody.push([
      {
        content: catTitle,
        colSpan: totalCols,
        styles: {
          fillColor: [2, 51, 33], // #023321 Deep Corporate Green
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.0,
          halign: 'left',
          cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
        },
      },
    ]);

    let catWeight = 0;
    let catCost = 0;

    // Sort items by itemNo / hierarchy
    // Group into Area -> Sub-systems -> Components
    const areas = itemsInCat.filter((i) => getItemLevel(i, itemsInCat) === 1);
    const subSystems = itemsInCat.filter((i) => getItemLevel(i, itemsInCat) === 2);
    const components = itemsInCat.filter((i) => getItemLevel(i, itemsInCat) === 3);

    // Helper to format row data
    const formatItemRow = (item: WorkItem, level: 1 | 2 | 3, areaChildWeight?: number) => {
      const weight = item.weightKg || 0;
      const cost = item.totalPrice || 0;
      catWeight += weight;
      catCost += cost;
      grandTotalWeight += weight;
      grandTotalCost += cost;

      // Format description with hierarchical indent
      let descText = item.description;
      if (level === 1) {
        descText = `${item.description.toUpperCase()}`;
      } else if (level === 2) {
        descText = `   ${item.description}`;
      } else {
        descText = `      ${item.description}`;
      }

      const isArea = level === 1;
      const isSub = level === 2;

      // Format quantity & weight - Displays if qty & unit or weight are inputted (even on Area / Sub-system rows)
      let qtyWeightStr = '';
      if (weight > 0) {
        if (item.unit === 'kg') {
          qtyWeightStr = `${weight.toFixed(2)} kg`;
        } else {
          qtyWeightStr = `${item.qty || 1} ${item.unit || ''} (${weight.toFixed(2)} kg)`.trim();
        }
      } else if (item.qty && item.qty > 0 && item.unit && item.unit.trim() !== '') {
        const formattedQty = Number(item.qty).toFixed(item.qty % 1 !== 0 ? 2 : 0);
        qtyWeightStr = `${formattedQty} ${item.unit || ''}`.trim();
      }

      const formattedPrice =
        item.unitPrice && item.unitPrice > 0
          ? TonnageCalculator.formatRupiah(item.unitPrice).replace('Rp', '').trim()
          : '';

      const formattedTotal =
        item.totalPrice && item.totalPrice > 0
          ? TonnageCalculator.formatRupiah(item.totalPrice).replace('Rp', '').trim()
          : '';

      const rowStyles = isArea
        ? {
            fillColor: [226, 232, 240], // slate-200 for Area
            textColor: [15, 23, 42],
            fontStyle: 'bold',
          }
        : isSub
        ? {
            fillColor: [248, 250, 252], // slate-50 for Sub-system
            textColor: [30, 41, 59],
            fontStyle: 'bold',
          }
        : {
            fillColor: [255, 255, 255],
            textColor: [51, 65, 85],
            fontStyle: 'normal',
          };

      const cleanVal = (val: any) => {
        if (val === undefined || val === null) return '';
        const s = String(val).trim();
        if (s === '0' || s === '-' || s === '') return '';
        return s;
      };

      const getNotesContent = (itm: WorkItem) => {
        if (itm.notes && itm.notes.trim() !== '' && itm.notes !== '0' && itm.notes !== '-') {
          return itm.notes.trim();
        }
        return '';
      };

      const getRemarkContent = (itm: WorkItem) => {
        const parts: string[] = [];
        if (itm.remark && itm.remark.trim() !== '' && itm.remark !== '0' && itm.remark !== '-') {
          parts.push(itm.remark.trim());
        }
        if (itm.progressNotes && itm.progressNotes.trim() !== '' && itm.progressNotes !== '0' && itm.progressNotes !== '-') {
          parts.push(itm.progressNotes.trim());
        }
        return parts.join(' | ');
      };

      const cellNo = {
        content: item.itemNo || '',
        styles: { ...rowStyles, halign: 'center', valign: 'top', overflow: 'linebreak', fontStyle: isArea || isSub ? 'bold' : 'normal' },
      };
      const cellDesc = {
        content: descText,
        styles: { ...rowStyles, halign: 'left', valign: 'top', overflow: 'linebreak', fontStyle: isArea ? 'bold' : isSub ? 'bold' : 'normal' },
      };
      const cellNotes = {
        content: getNotesContent(item),
        styles: { ...rowStyles, halign: 'left', valign: 'top', overflow: 'linebreak', textColor: [71, 85, 105] },
      };
      const cellType = {
        content: cleanVal(item.type),
        styles: { ...rowStyles, halign: 'center', valign: 'top', overflow: 'linebreak', fontStyle: 'bold', textColor: [15, 23, 42] },
      };
      const cellD1 = {
        content: cleanVal(item.d1),
        styles: { ...rowStyles, halign: 'center', valign: 'top' },
      };
      const cellD2 = {
        content: cleanVal(item.d2),
        styles: { ...rowStyles, halign: 'center', valign: 'top' },
      };
      const cellD3 = {
        content: cleanVal(item.d3),
        styles: { ...rowStyles, halign: 'center', valign: 'top' },
      };
      const cellDLen = {
        content: cleanVal(item.dLen),
        styles: { ...rowStyles, halign: 'center', valign: 'top', fontStyle: item.dLen && item.dLen !== '0' && item.dLen !== '-' ? 'bold' : 'normal' },
      };
      const cellD4 = {
        content: cleanVal(item.d4),
        styles: { ...rowStyles, halign: 'center', valign: 'top' },
      };
      const cellQty = {
        content: item.qty !== undefined && item.qty !== null && item.qty > 0
          ? (item.qty % 1 !== 0 ? item.qty.toFixed(2) : String(item.qty))
          : '',
        styles: { ...rowStyles, halign: 'right', valign: 'top' },
      };
      const cellUnit = {
        content: item.unit && item.unit !== '-' ? item.unit : '',
        styles: { ...rowStyles, halign: 'center', valign: 'top' },
      };
      const cellWeight = {
        content: weight > 0 ? weight.toFixed(2) : '',
        styles: {
          ...rowStyles,
          halign: 'right',
          valign: 'top',
          fontStyle: weight > 0 ? 'bold' : 'normal',
          textColor: weight > 0 ? [120, 53, 15] : rowStyles.textColor,
        },
      };
      const cellRemark = {
        content: getRemarkContent(item),
        styles: { ...rowStyles, halign: 'left', valign: 'top', overflow: 'linebreak', textColor: [71, 85, 105] },
      };

      if (isCostBoQ) {
        const cellPrice = {
          content: formattedPrice,
          styles: { ...rowStyles, halign: 'right', valign: 'top', overflow: 'linebreak' },
        };
        const cellTotal = {
          content: formattedTotal,
          styles: {
            ...rowStyles,
            halign: 'right',
            valign: 'top',
            overflow: 'linebreak',
            fontStyle: cost > 0 ? 'bold' : 'normal',
            textColor: cost > 0 ? [22, 101, 52] : rowStyles.textColor,
          },
        };
        return [
          cellNo,
          cellDesc,
          cellNotes,
          cellType,
          cellD1,
          cellD2,
          cellD3,
          cellDLen,
          cellD4,
          cellQty,
          cellUnit,
          cellWeight,
          cellRemark,
          cellPrice,
          cellTotal,
        ];
      }

      return [
        cellNo,
        cellDesc,
        cellNotes,
        cellType,
        cellD1,
        cellD2,
        cellD3,
        cellDLen,
        cellD4,
        cellQty,
        cellUnit,
        cellWeight,
        cellRemark,
      ];
    };

    if (areas.length > 0) {
      // Tree-structured iteration
      areas.forEach((area) => {
        // Calculate child weights
        const areaSubs = subSystems.filter(
          (s) => s.parentId === area.id || s.itemNo.startsWith(`${area.itemNo}.`)
        );
        const areaComps = components.filter(
          (c) =>
            c.parentId === area.id ||
            areaSubs.some((s) => s.id === c.parentId) ||
            c.itemNo.startsWith(`${area.itemNo}.`)
        );
        const areaChildWeight =
          areaSubs.reduce((a, b) => a + (b.weightKg || 0), 0) +
          areaComps.reduce((a, b) => a + (b.weightKg || 0), 0);

        tableBody.push(formatItemRow(area, 1, areaChildWeight));

        areaSubs.forEach((sub) => {
          tableBody.push(formatItemRow(sub, 2));

          const subComps = components.filter(
            (c) => c.parentId === sub.id || c.itemNo.startsWith(`${sub.itemNo}.`)
          );
          subComps.forEach((comp) => {
            tableBody.push(formatItemRow(comp, 3));
          });
        });

        // Direct components of Area without subsystem
        const directComps = components.filter(
          (c) =>
            c.parentId === area.id &&
            !areaSubs.some((s) => s.id === c.parentId || c.itemNo.startsWith(`${s.itemNo}.`))
        );
        directComps.forEach((comp) => {
          tableBody.push(formatItemRow(comp, 3));
        });
      });

      // Remaining orphaned items in category
      const printedIds = new Set([
        ...areas.map((a) => a.id),
        ...subSystems.map((s) => s.id),
        ...components.map((c) => c.id),
      ]);
      const remainingItems = itemsInCat.filter((i) => !printedIds.has(i.id));
      remainingItems.forEach((rem) => {
        tableBody.push(formatItemRow(rem, 3));
      });
    } else {
      // Flat list inside category
      itemsInCat.forEach((item) => {
        const lvl = getItemLevel(item, itemsInCat);
        tableBody.push(formatItemRow(item, lvl));
      });
    }

    // 4.2. Category Subtotal Row (Clean emerald tint)
    if (catWeight > 0 || catCost > 0) {
      const subtotalColSpan = 9;
      tableBody.push([
        {
          content: `Subtotal ${cat.code} (${cat.name})`,
          colSpan: subtotalColSpan,
          styles: {
            fontStyle: 'bold',
            halign: 'right',
            fillColor: [240, 253, 244],
            textColor: [22, 101, 52],
            fontSize: 7.0,
          },
        },
        {
          content: `${catWeight.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`,
          styles: {
            fontStyle: 'bold',
            halign: 'right',
            fillColor: [240, 253, 244],
            textColor: [120, 53, 15],
            fontSize: 7.0,
          },
        },
        {
          content: '',
          styles: { fillColor: [240, 253, 244] },
        },
        ...(isCostBoQ
          ? [
              {
                content: '',
                styles: { fillColor: [240, 253, 244] },
              },
              {
                content: TonnageCalculator.formatRupiah(catCost),
                styles: {
                  fontStyle: 'bold',
                  halign: 'right',
                  fillColor: [240, 253, 244],
                  textColor: [22, 101, 52],
                  fontSize: 7.0,
                },
              },
            ]
          : []),
      ]);
    }
  });

  // --------------------------------------------------------------------------
  // 5. GRAND TOTAL TONNAGE & COST SUMMARY ROW
  // --------------------------------------------------------------------------
  const grandTotalColSpan = 11;
  tableBody.push([
    {
      content: 'GRAND TOTAL TONASE BAJA (STEELWEIGHT)',
      colSpan: grandTotalColSpan,
      styles: {
        fontStyle: 'bold',
        halign: 'right',
        fillColor: [254, 240, 138], // amber-200 accent
        textColor: [120, 53, 15], // amber-900
        fontSize: 7.8,
      },
    },
    {
      content: `${grandTotalWeight.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`,
      styles: {
        fontStyle: 'bold',
        halign: 'right',
        fillColor: [254, 240, 138],
        textColor: [120, 53, 15],
        fontSize: 8.0,
      },
    },
    {
      content: '',
      styles: { fillColor: [254, 240, 138] },
    },
    ...(isCostBoQ
      ? [
          {
            content: 'TOTAL RAB:',
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [220, 252, 231],
              textColor: [22, 101, 52],
              fontSize: 7.8,
            },
          },
          {
            content: TonnageCalculator.formatRupiah(grandTotalCost),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [220, 252, 231],
              textColor: [22, 101, 52],
              fontSize: 8.0,
            },
          },
        ]
      : []),
  ]);

  // Proportional Column Styles based on Landscape vs Portrait and Cost vs Standard
  let columnStyles: any = {};
  if (isLandscape) {
    if (isCostBoQ) {
      columnStyles = {
        0: { cellWidth: 9, halign: 'center', valign: 'top' }, // No
        1: { cellWidth: 48, halign: 'left', valign: 'top', overflow: 'linebreak' }, // Description
        2: { cellWidth: 24, halign: 'left', valign: 'top', overflow: 'linebreak' }, // Keterangan
        3: { cellWidth: 13, halign: 'center', valign: 'top', overflow: 'linebreak' }, // Type
        4: { cellWidth: 10, halign: 'center', valign: 'top' }, // D1
        5: { cellWidth: 10, halign: 'center', valign: 'top' }, // D2
        6: { cellWidth: 10, halign: 'center', valign: 'top' }, // D3
        7: { cellWidth: 11, halign: 'center', valign: 'top' }, // D.Len
        8: { cellWidth: 9, halign: 'center', valign: 'top' }, // D4
        9: { cellWidth: 13, halign: 'right', valign: 'top' }, // Vol / Qty
        10: { cellWidth: 11, halign: 'center', valign: 'top' }, // Satuan
        11: { cellWidth: 17, halign: 'right', valign: 'top' }, // Tonase
        12: { cellWidth: 28, halign: 'left', valign: 'top', overflow: 'linebreak' }, // REMARK
        13: { cellWidth: 24, halign: 'right', valign: 'top', overflow: 'linebreak' }, // Tarif
        14: { cellWidth: 30, halign: 'right', valign: 'top', overflow: 'linebreak' }, // Total
      };
    } else {
      columnStyles = {
        0: { cellWidth: 11, halign: 'center', valign: 'top' }, // No
        1: { cellWidth: 60, halign: 'left', valign: 'top', overflow: 'linebreak' }, // Description
        2: { cellWidth: 32, halign: 'left', valign: 'top', overflow: 'linebreak' }, // Keterangan
        3: { cellWidth: 15, halign: 'center', valign: 'top', overflow: 'linebreak' }, // Type
        4: { cellWidth: 12, halign: 'center', valign: 'top' }, // D1
        5: { cellWidth: 12, halign: 'center', valign: 'top' }, // D2
        6: { cellWidth: 12, halign: 'center', valign: 'top' }, // D3
        7: { cellWidth: 13, halign: 'center', valign: 'top' }, // D.Len
        8: { cellWidth: 11, halign: 'center', valign: 'top' }, // D4
        9: { cellWidth: 16, halign: 'right', valign: 'top' }, // Vol / Qty
        10: { cellWidth: 13, halign: 'center', valign: 'top' }, // Satuan
        11: { cellWidth: 20, halign: 'right', valign: 'top' }, // Tonase
        12: { cellWidth: 40, halign: 'left', valign: 'top', overflow: 'linebreak' }, // REMARK
      };
    }
  } else {
    // Portrait mode
    if (isCostBoQ) {
      columnStyles = {
        0: { cellWidth: 7, halign: 'center', valign: 'top' }, // No
        1: { cellWidth: 32, halign: 'left', valign: 'top', overflow: 'linebreak' }, // Description
        2: { cellWidth: 16, halign: 'left', valign: 'top', overflow: 'linebreak' }, // Keterangan
        3: { cellWidth: 9, halign: 'center', valign: 'top', overflow: 'linebreak' }, // Type
        4: { cellWidth: 7, halign: 'center', valign: 'top' }, // D1
        5: { cellWidth: 7, halign: 'center', valign: 'top' }, // D2
        6: { cellWidth: 7, halign: 'center', valign: 'top' }, // D3
        7: { cellWidth: 8, halign: 'center', valign: 'top' }, // D.Len
        8: { cellWidth: 7, halign: 'center', valign: 'top' }, // D4
        9: { cellWidth: 10, halign: 'right', valign: 'top' }, // Vol / Qty
        10: { cellWidth: 8, halign: 'center', valign: 'top' }, // Satuan
        11: { cellWidth: 12, halign: 'right', valign: 'top' }, // Tonase
        12: { cellWidth: 18, halign: 'left', valign: 'top', overflow: 'linebreak' }, // REMARK
        13: { cellWidth: 16, halign: 'right', valign: 'top', overflow: 'linebreak' }, // Tarif
        14: { cellWidth: 21, halign: 'right', valign: 'top', overflow: 'linebreak' }, // Total
      };
    } else {
      columnStyles = {
        0: { cellWidth: 8, halign: 'center', valign: 'top' }, // No
        1: { cellWidth: 42, halign: 'left', valign: 'top', overflow: 'linebreak' }, // Description
        2: { cellWidth: 22, halign: 'left', valign: 'top', overflow: 'linebreak' }, // Keterangan
        3: { cellWidth: 11, halign: 'center', valign: 'top', overflow: 'linebreak' }, // Type
        4: { cellWidth: 8, halign: 'center', valign: 'top' }, // D1
        5: { cellWidth: 8, halign: 'center', valign: 'top' }, // D2
        6: { cellWidth: 8, halign: 'center', valign: 'top' }, // D3
        7: { cellWidth: 9, halign: 'center', valign: 'top' }, // D.Len
        8: { cellWidth: 7, halign: 'center', valign: 'top' }, // D4
        9: { cellWidth: 13, halign: 'right', valign: 'top' }, // Vol / Qty
        10: { cellWidth: 10, halign: 'center', valign: 'top' }, // Satuan
        11: { cellWidth: 15, halign: 'right', valign: 'top' }, // Tonase
        12: { cellWidth: 29, halign: 'left', valign: 'top', overflow: 'linebreak' }, // REMARK
      };
    }
  }

  // Draw AutoTable
  autoTable(doc, {
    startY: currentY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    tableWidth: pageWidth - marginX * 2,
    styles: {
      font: 'helvetica',
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: [3, 68, 44], // Signature Adaro Forest Green #03442C
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 1.6, bottom: 1.6, left: 1.2, right: 1.2 },
      lineColor: [187, 247, 208],
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [30, 41, 59],
      cellPadding: { top: 1.3, bottom: 1.3, left: 1.4, right: 1.4 },
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      valign: 'top',
      overflow: 'linebreak',
    },
    columnStyles,
    margin: { left: marginX, right: marginX, bottom: 30 },
    didDrawPage: (data) => {
      // Formal page numbers and document tracking footer
      const totalPages = doc.getNumberOfPages();
      const pageStr = `Halaman ${data.pageNumber} dari ${totalPages}`;
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(pageStr, pageWidth - marginX, pageHeight - 6, { align: 'right' });
      doc.text(
        `Dokumen Resmi Galangan Kapal  |  Sistem Estimasi & Repair List PPC/Pimpro (${vessel.name} - ${vessel.projectNo || ''})`,
        marginX,
        pageHeight - 6
      );
    },
  });

  // --------------------------------------------------------------------------
  // 6. APPROVAL & SIGNATURES BLOCK (LEMBAR PENGESAHAN)
  // --------------------------------------------------------------------------
  let finalY = (doc as any).lastAutoTable.finalY + 6;
  const sigBoxHeight = 32;

  // If signatures would overflow current page, add new page cleanly
  if (finalY + sigBoxHeight > pageHeight - 15) {
    doc.addPage();
    finalY = 15;
  }

  const sigColWidth = (pageWidth - marginX * 2) / 3;

  // Background box for signatures
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, finalY, pageWidth - marginX * 2, sigBoxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);

  // Column 1: Prepared by: PPC
  const col1X = marginX + sigColWidth * 0.5;
  doc.setFont('helvetica', 'normal');
  doc.text('Prepared by / Dibuat oleh,', col1X, finalY + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('PPC (Perencana Perbaikan Kapal)', col1X, finalY + 8.5, { align: 'center' });
  
  // Dotted Line for signature
  doc.setDrawColor(148, 163, 184);
  doc.line(col1X - 25, finalY + 22, col1X + 25, finalY + 22);
  
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${signatures.preparedByName.toUpperCase()} )`, col1X, finalY + 25.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(signatures.preparedByTitle, col1X, finalY + 29, { align: 'center' });

  // Column 2: Reviewed by: Project Leader
  const col2X = marginX + sigColWidth * 1.5;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.text('Reviewed by / Diperiksa oleh,', col2X, finalY + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('Project Leader / Pimpro', col2X, finalY + 8.5, { align: 'center' });
  
  doc.line(col2X - 25, finalY + 22, col2X + 25, finalY + 22);
  
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${signatures.reviewedByName.toUpperCase()} )`, col2X, finalY + 25.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(signatures.reviewedByTitle, col2X, finalY + 29, { align: 'center' });

  // Column 3: Verified by: Owner Representative / Class
  const col3X = marginX + sigColWidth * 2.5;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.text('Verified by / Disetujui oleh,', col3X, finalY + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('Owner Representative / Surveyor', col3X, finalY + 8.5, { align: 'center' });
  
  doc.line(col3X - 25, finalY + 22, col3X + 25, finalY + 22);
  
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${signatures.verifiedByName.toUpperCase()} )`, col3X, finalY + 25.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(signatures.verifiedByTitle, col3X, finalY + 29, { align: 'center' });

  // --------------------------------------------------------------------------
  // 7. DEFECT SURVEY REPORT (IF REQUESTED)
  // --------------------------------------------------------------------------
  if (docType === 'defect-survey' && defectSurveys.length > 0) {
    doc.addPage();
    let survY = 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`CATATAN DEFECT SURVEY & PENGUKURAN PELAT (OFFLINE FIELD SURVEY)`, marginX, survY);
    survY += 6;

    const surveyRows = defectSurveys.map((s, idx) => [
      idx + 1,
      s.locationZone || '-',
      s.defectDescription || '-',
      `${s.length || 0} m`,
      `${s.width || 0} m`,
      `${s.thickness || 0} mm`,
      s.plateType || 'Mild Steel',
      `${(s.calculatedWeightKg || 0).toFixed(2)} kg`,
      s.remedyAction || 'Replating',
      s.syncStatus === 1 ? 'Synced' : 'Tersimpan',
    ]);

    autoTable(doc, {
      startY: survY,
      head: [
        [
          'No',
          'Zona Lokasi',
          'Deskripsi Kerusakan',
          'Panjang',
          'Lebar',
          'Tebal',
          'Material',
          'Estimasi Berat',
          'Rencana Tindakan',
          'Status',
        ],
      ],
      body: surveyRows,
      theme: 'grid',
      headStyles: {
        fillColor: [22, 101, 52],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.5,
      },
      bodyStyles: {
        fontSize: 6,
        cellPadding: 1.2,
      },
      margin: { left: marginX, right: marginX },
    });
  }

  return doc;
}

export async function exportShipyardPdf(options: GeneratePdfOptions): Promise<void> {
  const doc = await buildShipyardPdfDoc(options);
  const cleanName = (options.vessel.name || 'VESSEL').replace(/[^a-zA-Z0-9]/g, '_');
  const docType = options.docType || 'repair-list';
  const filename = `${cleanName}_${docType.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export async function getPdfBlobUrl(options: GeneratePdfOptions): Promise<string> {
  const doc = await buildShipyardPdfDoc(options);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

// --------------------------------------------------------------------------
// BAPO (BERITA ACARA PEMERIKSAAN OPNAME) PDF GENERATOR
// --------------------------------------------------------------------------
export interface GenerateBapoPdfOptions {
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  categories: WorkCategory[];
  workItems: WorkItem[];
  selectedVendor?: string;
  statusFilter?: string;
  categoryFilter?: string;
  viewMode?: 'full' | 'compact';
  signatures?: Signatures;
  currentUser?: { name: string; role: string };
}

export async function buildBapoPdfDoc(options: GenerateBapoPdfOptions): Promise<jsPDF> {
  const {
    vessel,
    schedule,
    categories,
    workItems,
    selectedVendor = 'all',
    statusFilter = 'all',
    categoryFilter = 'all',
    viewMode = 'full',
    signatures,
    currentUser,
  } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const marginX = 8;
  let currentY = 8;

  // 1. Header Document Title (Centered, Clean & Neat, No Logo)
  const vendorLabel = selectedVendor !== 'all' && selectedVendor !== 'unassigned' ? selectedVendor : selectedVendor === 'unassigned' ? 'Belum Ditentukan' : 'Semua Rekanan / Vendor';
  const vendorCode = selectedVendor !== 'all' && selectedVendor !== 'unassigned' ? selectedVendor.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().slice(0, 12) : 'ALL';
  const bapoNoStr = `BAPO/${vessel.projectNo || 'PRJ'}/${vendorCode}/${new Date().getFullYear()}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DOKUMEN RESMI AUDIT BERSAMA • JOINT INSPECTION REPORT', pageWidth / 2, currentY + 2, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(3, 68, 44);
  doc.text('BERITA ACARA PEMERIKSAAN OPNAME (BAPO)', pageWidth / 2, currentY + 7.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('VERIFIKASI FISIK & KEMAJUAN VOLUME PEKERJAAN REPARASI KAPAL (JOINT AUDIT OPNAME)', pageWidth / 2, currentY + 12, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(3, 68, 44);
  doc.text(`NO. DOKUMEN: ${bapoNoStr}`, pageWidth / 2, currentY + 16.5, { align: 'center' });

  currentY += 20;

  // 2. Metadata Box (Only: Nama Kapal, No. Proyek, Tanggal Cetak & Audit)
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 10, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  const colWidth = (pageWidth - marginX * 2) / 3;

  // Col 1: Nama Kapal
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('NAMA KAPAL:', marginX + 4, currentY + 6.5);
  doc.setTextColor(15, 23, 42);
  const vesselTypeStr = vessel.vesselType ? ` (${vessel.vesselType})` : '';
  doc.text(`${vessel.name || ''}${vesselTypeStr}`, marginX + 28, currentY + 6.5);

  // Col 2: No. Proyek
  const col2X = marginX + colWidth + 4;
  doc.setTextColor(71, 85, 105);
  doc.text('NO. PROYEK:', col2X, currentY + 6.5);
  doc.setTextColor(15, 23, 42);
  const dockPosStr = schedule.dockingPosition ? ` / Dock ${schedule.dockingPosition}` : '';
  doc.text(`${vessel.projectNo || ''}${dockPosStr}`, col2X + 24, currentY + 6.5);

  // Col 3: Tanggal Cetak & Audit
  const col3X = marginX + colWidth * 2 + 4;
  doc.setTextColor(71, 85, 105);
  doc.text('TANGGAL CETAK & AUDIT:', col3X, currentY + 6.5);
  doc.setTextColor(15, 23, 42);
  const printDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(printDateStr, col3X + 43, currentY + 6.5);

  currentY += 13.5;

  // Filter Items
  const filteredWorkItems = workItems.filter((item) => {
    if (categoryFilter && categoryFilter !== 'all') {
      const cat = categories.find((c) => c.id === categoryFilter || c.code === categoryFilter);
      if (cat) {
        const match = item.categoryId === cat.id || item.categoryId === cat.code;
        if (!match) return false;
      }
    }

    const resolved = getResolvedVendorInfo(item, workItems);
    const directVendor = (item.subcontractor || item.assignedTo || '').trim();
    const effectiveVendor = resolved.displayVendor || directVendor;

    if (selectedVendor === 'unassigned') {
      if (effectiveVendor !== '') return false;
    } else if (selectedVendor && selectedVendor !== 'all') {
      const target = selectedVendor.toLowerCase();
      const matchDirect = directVendor.toLowerCase() === target;
      const matchChild = resolved.childVendors.some((cv) => cv.toLowerCase() === target);
      const matchEffective = effectiveVendor.toLowerCase() === target;
      if (!matchDirect && !matchChild && !matchEffective) {
        return false;
      }
    }

    const currentStatus = item.opnameStatus || 'Belum Diperiksa';
    if (statusFilter === 'verified_only') {
      if (currentStatus !== 'Terverifikasi' && (item.opnamePercent || 0) < 100) return false;
    } else if (statusFilter === 'pending_only') {
      if (currentStatus === 'Terverifikasi' || (item.opnamePercent || 0) >= 100) return false;
    }

    return true;
  });

  // Calculate Executive Statistics
  let totalContractQty = 0;
  let totalOpnameQty = 0;
  let verifiedItemsCount = 0;
  let totalPercentSum = 0;
  let totalWeightKg = 0;

  filteredWorkItems.forEach((w) => {
    const isVerified = w.opnameStatus === 'Terverifikasi' || (w.opnamePercent || 0) >= 100;
    if (isVerified) verifiedItemsCount++;
    totalContractQty += Number(w.qty) || 0;
    totalOpnameQty += Number(w.opnameQty !== undefined && w.opnameQty !== null ? w.opnameQty : w.qty || 0);
    totalPercentSum += Number(w.opnamePercent || (isVerified ? 100 : 0));
    totalWeightKg += Number(w.weightKg) || 0;
  });

  const totalItems = filteredWorkItems.length;
  const averageProgress = totalItems > 0 ? Math.round(totalPercentSum / totalItems) : 0;
  const verifiedPercent = totalItems > 0 ? Math.round((verifiedItemsCount / totalItems) * 100) : 0;

  // 3. Highlighted Vendor & Executive Stats Cards Box
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 11, 1.5, 1.5, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 78, 59); // emerald-900
  doc.text(`PELAKSANA / VENDOR / SUBKONTRAKTOR: ${vendorLabel.toUpperCase()}`, marginX + 3, currentY + 7);

  // Executive Stats Badges on the Right
  const statsX = pageWidth - marginX - 115;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`Total: ${totalItems} Item`, statsX, currentY + 7);
  doc.text(`Terverifikasi: ${verifiedItemsCount} (${verifiedPercent}%)`, statsX + 26, currentY + 7);
  doc.text(`Tonase: ${totalWeightKg > 0 ? `${(totalWeightKg / 1000).toFixed(2)} Ton` : ''}`, statsX + 62, currentY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 68, 44);
  doc.text(`Rata-rata: ${averageProgress}%`, statsX + 92, currentY + 7);

  currentY += 14;

  // 4. Construct Tables based on viewMode ('full' vs 'compact')
  if (viewMode === 'full') {
    // FULL TABLE WITH CATEGORY HEADERS & 17 COLUMNS
    const fullTableRows: any[] = [];

    categories.forEach((cat) => {
      const catItems = filteredWorkItems.filter(
        (item) => item.categoryId === cat.id || item.categoryId === cat.code
      );
      if (catItems.length === 0) return;

      // Category Header Row
      fullTableRows.push([
        {
          content: `KATEGORI ${cat.code}. ${cat.name.toUpperCase()} (${catItems.length} ITEM)`,
          colSpan: 16,
          styles: {
            fillColor: [220, 252, 231], // emerald-100
            textColor: [3, 68, 44],
            fontStyle: 'bold',
            fontSize: 6.5,
            halign: 'left',
          },
        },
      ]);

      catItems.forEach((w) => {
        const resVendor = getResolvedVendorInfo(w, workItems);
        const rawVendor = resVendor.displayVendor || resVendor.directVendor || w.subcontractor || w.assignedTo || '';
        const vendorName = rawVendor.trim();
        const opQty = w.opnameQty !== undefined && w.opnameQty !== null ? w.opnameQty : w.qty;
        const diff = w.opnameQty !== undefined && w.opnameQty !== null ? w.opnameQty - w.qty : 0;
        const opPercent =
          w.opnamePercent !== undefined
            ? w.opnamePercent
            : w.opnameStatus === 'Terverifikasi'
            ? 100
            : w.qty > 0 && w.opnameQty !== undefined
            ? Math.round((w.opnameQty / w.qty) * 100)
            : 0;

        const descText = w.itemLevel === 2 ? `   ${w.description}` : w.itemLevel === 3 ? `      ${w.description}` : w.description;
        const qtyWeightStr = w.weightKg && w.weightKg > 0
          ? (w.unit === 'kg' ? `${w.weightKg.toFixed(2)} kg` : `${w.qty} ${w.unit || ''} (${w.weightKg.toFixed(2)} kg)`)
          : w.qty && w.qty > 0 ? `${w.qty} ${w.unit || ''}` : '';

        fullTableRows.push([
          w.itemNo,
          descText,
          w.notes || '',
          w.type && w.type !== '0' ? w.type : '',
          w.d1 && w.d1 !== '0' ? w.d1 : '',
          w.d2 && w.d2 !== '0' ? w.d2 : '',
          w.d3 && w.d3 !== '0' ? w.d3 : '',
          w.dLen && w.dLen !== '0' ? w.dLen : '',
          w.d4 && w.d4 !== '0' ? w.d4 : '',
          w.qty !== undefined && w.qty !== null && w.qty > 0 ? (w.qty % 1 !== 0 ? w.qty.toFixed(2) : String(w.qty)) : '-',
          w.unit || '-',
          w.weightKg && w.weightKg > 0 ? w.weightKg.toFixed(2) : '-',
          w.remark || '',
          w.opnameStatus || 'Belum Diperiksa',
          w.opnameDate || '',
          w.opnameNotes || w.remark || '',
        ]);
      });
    });

    // Add Recapitulation Footer Row
    fullTableRows.push([
      {
        content: 'REKAPITULASI TOTAL / RATA-RATA:',
        colSpan: 9,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] },
      },
      { content: `${totalContractQty.toLocaleString('id-ID')}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } },
      { content: '-', styles: { fillColor: [241, 245, 249], halign: 'center' } },
      { content: totalWeightKg > 0 ? `${totalWeightKg.toFixed(2)}` : '-', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } },
      { content: '', styles: { fillColor: [241, 245, 249] } },
      { content: `${verifiedItemsCount}/${totalItems} Selesai`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: 'Dokumen terverifikasi fisik di lapangan bersama Rekanan & QC Inspector', colSpan: 2, styles: { fillColor: [241, 245, 249], fontSize: 5, textColor: [71, 85, 105] } },
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          'No',
          'Uraian Item Pekerjaan Reparasi Kapal',
          'Keterangan',
          'Type',
          'D1',
          'D2',
          'D3',
          'Pjg',
          'D4',
          'Vol / Qty',
          'Satuan',
          'Tonase (kg)',
          'Remark',
          'Status Audit',
          'Tgl QC',
          'Catatan & Temuan QC',
        ],
      ],
      body: fullTableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [3, 68, 44], // #03442C
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6,
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 1.5, bottom: 1.5, left: 0.8, right: 0.8 },
      },
      bodyStyles: {
        fontSize: 5.5,
        textColor: [30, 41, 59],
        cellPadding: { top: 1, bottom: 1, left: 1, right: 1 },
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
        1: { cellWidth: 54 },
        2: { cellWidth: 24 },
        3: { halign: 'center', cellWidth: 10 },
        4: { halign: 'center', cellWidth: 8 },
        5: { halign: 'center', cellWidth: 8 },
        6: { halign: 'center', cellWidth: 8 },
        7: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
        8: { halign: 'center', cellWidth: 8 },
        9: { halign: 'right', cellWidth: 13, fontStyle: 'bold' },
        10: { halign: 'center', cellWidth: 10 },
        11: { halign: 'right', cellWidth: 15, fontStyle: 'bold' },
        12: { cellWidth: 20 },
        13: { halign: 'center', cellWidth: 20 },
        14: { halign: 'center', cellWidth: 16 },
        15: { cellWidth: 36 },
      },
      margin: { left: marginX, right: marginX, bottom: 32 },
      didDrawPage: (data) => {
        const totalPages = doc.getNumberOfPages();
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(`Halaman ${data.pageNumber} dari ${totalPages}`, pageWidth - marginX, pageHeight - 5, { align: 'right' });
        doc.text(
          `Dokumen BAPO Resmi Galangan Kapal | Kapal: ${vessel.name} (${vessel.projectNo || ''}) | Vendor: ${vendorLabel}`,
          marginX,
          pageHeight - 5
        );
      },
    });
  } else {
    // COMPACT TABLE (11 COLUMNS)
    const compactRows = filteredWorkItems.map((item, idx) => {
      const cat = categories.find((c) => c.id === item.categoryId || c.code === item.categoryId);
      const catCode = cat ? `${cat.code}` : item.categoryId || '';
      const resVendor = getResolvedVendorInfo(item, workItems);
      const vendor = (resVendor.displayVendor || resVendor.directVendor || item.subcontractor || item.assignedTo || '').trim();
      const opQty = item.opnameQty !== undefined && item.opnameQty !== null ? item.opnameQty : item.qty;
      const diff = item.opnameQty !== undefined && item.opnameQty !== null ? (item.opnameQty - item.qty).toFixed(2) : '0.00';
      const pct = item.opnamePercent !== undefined ? `${item.opnamePercent}%` : item.opnameStatus === 'Terverifikasi' ? '100%' : '0%';
      const status = item.opnameStatus || 'Belum Diperiksa';
      const notes = item.opnameNotes || item.remark || '';

      return [
        idx + 1,
        item.itemNo,
        item.description,
        catCode,
        item.qty !== undefined && item.qty !== null ? (item.qty % 1 !== 0 ? item.qty.toFixed(2) : String(item.qty)) : '-',
        item.unit || '-',
        item.weightKg && item.weightKg > 0 ? item.weightKg.toFixed(2) : '-',
        Number(diff) > 0 ? `+${diff}` : diff,
        status,
        notes,
      ];
    });

    // Add Recapitulation Footer Row for Compact View
    compactRows.push([
      { content: 'REKAPITULASI TOTAL / RATA-RATA:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: `${totalContractQty.toLocaleString('id-ID')}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } },
      { content: '-', styles: { fillColor: [241, 245, 249], halign: 'center' } },
      { content: totalWeightKg > 0 ? `${totalWeightKg.toFixed(2)} kg` : '-', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } },
      { content: (totalOpnameQty - totalContractQty).toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } },
      { content: `${verifiedItemsCount}/${totalItems} Selesai`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'center' } },
      { content: 'Dokumen terverifikasi fisik di lapangan', styles: { fillColor: [241, 245, 249] } },
    ] as any);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          'No',
          'No. Item',
          'Uraian Item Pekerjaan Perbaikan Kapal',
          'Kat',
          'Vol / Qty',
          'Satuan',
          'Tonase (kg)',
          'Selisih',
          'Status Audit',
          'Catatan Verifikasi & QC Inspector',
        ],
      ],
      body: compactRows,
      theme: 'grid',
      headStyles: {
        fillColor: [3, 68, 44], // #03442C
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.5,
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
      },
      bodyStyles: {
        fontSize: 6,
        textColor: [30, 41, 59],
        cellPadding: { top: 1.2, bottom: 1.2, left: 1.2, right: 1.2 },
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
        3: { halign: 'center', cellWidth: 16 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'right', cellWidth: 24 },
        6: { halign: 'center', cellWidth: 30 },
        7: { cellWidth: 60 },
      },
      margin: { left: marginX, right: marginX, bottom: 32 },
      didDrawPage: (data) => {
        const totalPages = doc.getNumberOfPages();
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(`Halaman ${data.pageNumber} dari ${totalPages}`, pageWidth - marginX, pageHeight - 5, { align: 'right' });
        doc.text(
          `Dokumen BAPO Resmi Galangan Kapal | Kapal: ${vessel.name} (${vessel.projectNo || ''}) | Vendor: ${vendorLabel}`,
          marginX,
          pageHeight - 5
        );
      },
    });
  }

  // 5. Official 4-Party Signatures Block
  let finalY = (doc as any).lastAutoTable.finalY + 5;
  const sigBoxHeight = 30;

  if (finalY + sigBoxHeight > pageHeight - 12) {
    doc.addPage();
    finalY = 12;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DIPERIKSA, DIVERIFIKASI, & DISETUJUI BERSAMA DALAM JOINT AUDIT OPNAME:', marginX, finalY);

  finalY += 3.5;

  const sigColWidth = (pageWidth - marginX * 2) / 4;

  // Background Box for Signatures
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, finalY, pageWidth - marginX * 2, sigBoxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(6);

  // 1. Pelaksana Pekerjaan (Subcont)
  const c1X = marginX + sigColWidth * 0.5;
  doc.setTextColor(71, 85, 105);
  doc.text('PELAKSANA / VENDOR', c1X, finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 68, 44);
  doc.text(vendorLabel.slice(0, 25), c1X, finalY + 7.5, { align: 'center' });
  doc.setDrawColor(148, 163, 184);
  doc.line(c1X - 22, finalY + 20, c1X + 22, finalY + 20);
  doc.setTextColor(15, 23, 42);
  doc.text(`( ${selectedVendor !== 'all' && selectedVendor !== 'unassigned' ? selectedVendor.slice(0, 22) : '.......................................'} )`, c1X, finalY + 23.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Subkontraktor / Rekanan', c1X, finalY + 26.5, { align: 'center' });

  // 2. QC Inspector Galangan
  const c2X = marginX + sigColWidth * 1.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Verifikator Mutu', c2X, finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 68, 44);
  doc.text('QC Inspector Galangan', c2X, finalY + 7.5, { align: 'center' });
  doc.line(c2X - 22, finalY + 20, c2X + 22, finalY + 20);
  doc.setTextColor(15, 23, 42);
  doc.text(`( ${currentUser?.name || 'QC Inspector Galangan'} )`, c2X, finalY + 23.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Quality Control Yard', c2X, finalY + 26.5, { align: 'center' });

  // 3. Project Manager Galangan
  const c3X = marginX + sigColWidth * 2.5;
  doc.setTextColor(71, 85, 105);
  doc.text('Pimpinan Proyek', c3X, finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 68, 44);
  doc.text('Project Manager Galangan', c3X, finalY + 7.5, { align: 'center' });
  doc.line(c3X - 22, finalY + 20, c3X + 22, finalY + 20);
  doc.setTextColor(15, 23, 42);
  doc.text(`( ${signatures?.reviewedByName || 'Project Manager Galangan'} )`, c3X, finalY + 23.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Pimpro Galangan', c3X, finalY + 26.5, { align: 'center' });

  // 4. Owner Superintendent
  const c4X = marginX + sigColWidth * 3.5;
  doc.setTextColor(71, 85, 105);
  doc.text('Pemilik Kapal (Owner)', c4X, finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 68, 44);
  doc.text((vessel.companyOwner || 'Owner Superintendent').slice(0, 25), c4X, finalY + 7.5, { align: 'center' });
  doc.line(c4X - 22, finalY + 20, c4X + 22, finalY + 20);
  doc.setTextColor(15, 23, 42);
  doc.text(`( ${signatures?.verifiedByName || 'Owner Superintendent'} )`, c4X, finalY + 23.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Owner Representative / Surveyor', c4X, finalY + 26.5, { align: 'center' });

  return doc;
}

export async function exportBapoPdf(options: GenerateBapoPdfOptions): Promise<void> {
  const doc = await buildBapoPdfDoc(options);
  const cleanName = (options.vessel.name || 'VESSEL').replace(/[^a-zA-Z0-9]/g, '_');
  const vendorSuffix = options.selectedVendor && options.selectedVendor !== 'all' ? `_${options.selectedVendor.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  const filename = `BAPO_${cleanName}${vendorSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
