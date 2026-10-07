import ExcelJS from 'exceljs';
import { WorkCategory, WorkItem, VesselSpec, ProjectSchedule, DefectSurvey, Signatures } from '../types';
import { TonnageCalculator } from './tonnageCalculator';
import { DEFAULT_CATEGORIES } from '../data/shipyardSeedData';
import { resequenceCategoryItems } from './numberingUtils';

export type ValidationIssueType = 'EMPTY_DESCRIPTION' | 'INVALID_ITEM_NO' | 'SUSPICIOUS_ROW';

export interface ImportValidationIssue {
  id: string;
  rowNumber: number;
  sheetName?: string;
  itemNo: string;
  description: string;
  issueType: ValidationIssueType;
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
  field: 'description' | 'itemNo';
}

export interface ImportValidationSummary {
  isValid: boolean;
  totalChecked: number;
  totalIssues: number;
  emptyDescriptionCount: number;
  invalidItemNoCount: number;
  issues: ImportValidationIssue[];
  canAutoFix: boolean;
}

export interface RawExtractedRow {
  rowNumber?: number;
  sheetName?: string;
  itemNo: string;
  categoryText: string;
  description: string;
  notes: string;
  remark?: string;
  type: string;
  d1: string;
  d2: string;
  d3: string;
  dLen: string;
  d4: string;
  qty: number;
  unit: string;
  weight: number;
  unitPrice: number;
  totalPrice: number;
  progress?: number;
  isExplicitCategoryBanner?: boolean;
}

export interface ParseResult {
  success: boolean;
  importedItems: WorkItem[];
  vesselSpec?: Partial<VesselSpec>;
  projectSchedule?: Partial<ProjectSchedule>;
  vesselPhotoUrl?: string;
  warnings: string[];
  errors: string[];
  validation?: ImportValidationSummary;
  rawRows?: RawExtractedRow[];
  rawMatrix?: string[][];
  detectedColMap?: DetectedColMap;
  summary: {
    totalItems: number;
    categoriesFound: string[];
    areaHeadersCount: number;
    totalWeightKg: number;
    totalCost: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers for safe value unwrapping & flexible parsing
// ---------------------------------------------------------------------------

export function extractCellString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val).trim();
  if (typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (val.result !== undefined && val.result !== null) {
      if (typeof val.result === 'object' && val.result.error) return '';
      return String(val.result).trim();
    }
    if (val.text !== undefined && val.text !== null) return String(val.text).trim();
    if (Array.isArray(val.richText)) {
      return val.richText.map((rt: any) => rt.text || '').join('').trim();
    }
    if (val.hyperlink) return String(val.text || val.hyperlink).trim();
    return '';
  }
  return String(val).trim();
}

/**
 * Parses numbers with tolerance for Indonesian (1.500.000,50 or 12,5)
 * and US/English (1,500,000.50 or 12.5) formatting, currency symbols (Rp, IDR, $),
 * percentages, and Excel cell objects.
 */
export function parseFlexibleNumber(
  val: any,
  context: 'dimension' | 'currency' | 'quantity' | 'general' = 'general'
): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  // If it's an Excel cell object with formula evaluation result
  if (typeof val === 'object') {
    if (val.result !== undefined && val.result !== null) {
      if (typeof val.result === 'number') return isNaN(val.result) ? 0 : val.result;
      val = val.result;
    } else {
      val = extractCellString(val);
    }
  }

  let str = String(val).trim();
  if (!str) return 0;

  // Strip currency prefixes, units, and symbols
  str = str
    .replace(/^[\s\S]*?(Rp|IDR|\$|€|¥|USD|EUR)\.?\s*/i, '')
    .replace(/\s*(kg|ton|mtr?|meter|pcs|ls|set|btg|lbr|%)\s*$/i, '')
    .trim();

  if (!str) return 0;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Indonesian / European: 1.500.000,50 -> dot is thousand separator, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US / English: 1,500,000.50 -> comma is thousand separator, dot is decimal
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only comma present
    const commaParts = str.split(',');
    if (commaParts.length > 2) {
      // e.g. 1,000,000
      str = str.replace(/,/g, '');
    } else if (commaParts.length === 2) {
      const decimals = commaParts[1];
      if (decimals.length === 3 && context === 'currency' && parseInt(commaParts[0], 10) > 0) {
        // In currency context, e.g. "25,000" might be twenty-five thousand
        str = str.replace(',', '');
      } else {
        // e.g. 12,5 or 0,75 or 125,50 -> decimal separator
        str = `${commaParts[0]}.${commaParts[1]}`;
      }
    }
  } else if (hasDot) {
    // Only dot present
    const dotParts = str.split('.');
    if (dotParts.length > 2) {
      // e.g. 1.500.000 (Indonesian thousand dots)
      str = str.replace(/\./g, '');
    } else if (dotParts.length === 2) {
      const decimals = dotParts[1];
      // If 3 digits after dot and context is currency or large integer, e.g. "25.000" -> 25000
      if (decimals.length === 3 && (context === 'currency' || parseInt(dotParts[0], 10) >= 100)) {
        str = str.replace('.', '');
      }
    }
  }

  // Clean any remaining non-numeric characters except leading - and single .
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalizes material type code aliases to official shipyard codes (PL, EA, PP, FB, RB, SB, CQR, GR, UNP, INP, WF)
 */
export function normalizeMaterialType(val: any): string {
  if (val === null || val === undefined) return '';
  let str = extractCellString(val).toUpperCase().trim();
  if (!str || str === '-' || str === '--') return '';

  // Clean common prefixes
  str = str.replace(/^(TIPE|TYPE|PROFIL|PROFILE|KODE|GRADE)\s*[:=]?\s*/i, '').trim();

  // Alias mapping
  const aliases: Record<string, string> = {
    'PLATE': 'PL',
    'PELAT': 'PL',
    'PLAT': 'PL',
    'PL ABS': 'PL',
    'PL A': 'PL',
    'PL BKI': 'PL',
    'STEEL PLATE': 'PL',
    'PELAT BAJA': 'PL',

    'ANGLE': 'EA',
    'SIKU': 'EA',
    'BESI SIKU': 'EA',
    'EQUAL ANGLE': 'EA',
    'UNEQUAL ANGLE': 'UA',
    'L': 'EA',
    'UA': 'UA',

    'PIPE': 'PP',
    'PIPA': 'PP',
    'PIPING': 'PP',
    'SCH 40': 'PP',
    'SCH 80': 'PP',
    'SEAMLESS': 'PP',
    'GALVANIS': 'PP',
    'PIPA BAJA': 'PP',

    'FLATBAR': 'FB',
    'FLAT BAR': 'FB',
    'STRIP': 'FB',
    'PLAT STRIP': 'FB',
    'PELAT STRIP': 'FB',

    'ROUNDBAR': 'RB',
    'ROUND BAR': 'RB',
    'AS': 'RB',
    'BESI AS': 'RB',
    'AS BULAT': 'RB',
    'ROD': 'RB',

    'SQUAREBAR': 'SB',
    'SQUARE BAR': 'SB',
    'NAKO': 'SB',
    'BESI NAKO': 'SB',
    'KOTAK': 'SB',

    'CHEQUERED': 'CQR',
    'CHECKERED': 'CQR',
    'BORDES': 'CQR',
    'PELAT BORDES': 'CQR',
    'PLAT BORDES': 'CQR',

    'GRATING': 'GR',
    'STEEL GRATING': 'GR',

    'CHANNEL': 'UNP',
    'KANAL U': 'UNP',
    'U-CHANNEL': 'UNP',

    'I-BEAM': 'INP',
    'INP': 'INP',
    'BEAM': 'INP',

    'H-BEAM': 'WF',
    'WIDE FLANGE': 'WF',
    'WF': 'WF',
  };

  if (aliases[str]) return aliases[str];

  // If starts with any recognized prefix
  for (const [alias, code] of Object.entries(aliases)) {
    if (str.startsWith(alias) && str.length <= alias.length + 6) {
      return code;
    }
  }

  // If it's short (<= 8 chars) like PL, EA, PP, keep uppercase
  if (str.length <= 8 && /^[A-Z0-9\-_ /]+$/.test(str)) {
    return str;
  }

  return str.substring(0, 10);
}

/**
 * Standardizes unit strings and abbreviations (m², m³, btg, lbr, kg, ton, ls, pcs, set)
 */
export function normalizeUnitString(val: any, itemLevel?: number): string {
  if (val === null || val === undefined) return itemLevel === 1 || itemLevel === 2 ? '' : 'kg';
  let str = extractCellString(val).toLowerCase().trim();
  if (!str || str === '-' || str === '--') {
    return itemLevel === 1 || itemLevel === 2 ? '' : 'kg';
  }

  const unitMap: Record<string, string> = {
    'm2': 'm²',
    'm^2': 'm²',
    'sqm': 'm²',
    'meter persegi': 'm²',
    'm3': 'm³',
    'm^3': 'm³',
    'cbm': 'm³',
    'meter kubik': 'm³',
    'mtr': 'm',
    'meter': 'm',
    'm\'': 'm',
    'lbr': 'lbr',
    'lembar': 'lbr',
    'sheet': 'lbr',
    'pl': 'lbr',
    'btg': 'btg',
    'batang': 'btg',
    'stick': 'btg',
    'bar': 'btg',
    'pipe': 'btg',
    'kg': 'kg',
    'kgs': 'kg',
    'kilo': 'kg',
    'kilogram': 'kg',
    'ton': 'ton',
    'tonne': 'ton',
    'mt': 'ton',
    'ls': 'ls',
    'lot': 'ls',
    'lumpsum': 'ls',
    'lump sum': 'ls',
    'pkt': 'ls',
    'paket': 'ls',
    'pcs': 'pcs',
    'pc': 'pcs',
    'buah': 'pcs',
    'bh': 'pcs',
    'biji': 'pcs',
    'ea': 'pcs',
    'each': 'pcs',
    'set': 'set',
    'unit': 'unit',
    'unt': 'unit',
    'ttk': 'ttk',
    'titik': 'ttk',
    'point': 'ttk',
    'joint': 'joint',
    'sambungan': 'joint',
    'seksi': 'seksi',
    'panel': 'panel',
    'pnl': 'panel',
    'roll': 'roll',
    'rol': 'roll',
    'kaleng': 'klg',
    'klg': 'klg',
    'pail': 'pail',
    'drum': 'drum',
  };

  if (unitMap[str]) return unitMap[str];
  return str;
}

/**
 * Normalizes dimension input (e.g. "6000", "6.000", "12,5" -> "12.5", 3" -> 88.9)
 */
export function normalizeDimensionString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    if (isNaN(val) || val === 0) return '';
    return String(Math.round(val * 1000) / 1000);
  }

  let str = extractCellString(val).trim();
  if (!str || str === '-' || str === '--') return '';

  // Check nominal pipe inch notation (e.g. 3", 2 1/2", 1/2")
  const inchMatch = str.match(/^(\d+(?:\s+\d+\/\d+|\/\d+)?)\s*(?:"|in|inch|inci)$/i);
  if (inchMatch) {
    const inchStr = inchMatch[1].trim();
    const pipeMap: Record<string, string> = {
      '1/2': '21.3',
      '3/4': '26.7',
      '1': '33.4',
      '1 1/4': '42.2',
      '1 1/2': '48.3',
      '2': '60.3',
      '2 1/2': '73.0',
      '3': '88.9',
      '3 1/2': '101.6',
      '4': '114.3',
      '5': '141.3',
      '6': '168.3',
      '8': '219.1',
      '10': '273.0',
      '12': '323.8',
    };
    if (pipeMap[inchStr]) return pipeMap[inchStr];
  }

  // Strip unit suffixes like mm, m, cm
  str = str.replace(/\s*(mm|cm|mtr|meter|m)\s*$/i, '').trim();

  // If purely digits, return as is
  if (/^\d+$/.test(str)) return str;

  // Indonesian thousand dot with 3 zeroes (e.g. "6.000" -> "6000", "1.500" -> "1500")
  if (/^\d{1,3}\.000$/.test(str)) {
    return str.replace('.', '');
  }

  // Comma decimal format (e.g. "12,5" -> "12.5", "0,75" -> "0.75")
  if (/^-?\d+,\d+$/.test(str)) {
    return str.replace(',', '.');
  }

  // Indonesian thousand dot + comma decimal (e.g. "6.000,5" -> "6000.5")
  if (/^\d{1,3}\.\d{3},\d+$/.test(str)) {
    return str.replace(/\./g, '').replace(',', '.');
  }

  // Standard float
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    return str;
  }

  return str;
}

// ---------------------------------------------------------------------------
// CSV Parsing Utility (RFC 4180 compliant with auto-delimiter detection)
// ---------------------------------------------------------------------------

export function parseCsvText(text: string): string[][] {
  if (!text) return [];

  // Strip UTF-8 BOM if present
  let cleanText = text.replace(/^\uFEFF/, '');

  // Detect delimiter: If text contains tabs (\t), it is 100% TSV from clipboard/Excel/Sheets!
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const sampleLines = lines.slice(0, 10);

  let tabCount = 0;
  let semiCount = 0;
  let commaCount = 0;

  sampleLines.forEach((line) => {
    tabCount += (line.match(/\t/g) || []).length;
    semiCount += (line.match(/;/g) || []).length;
    commaCount += (line.match(/,/g) || []).length;
  });

  // Spreadsheets (Excel, Google Sheets, LibreOffice, WPS, Numbers) ALWAYS use Tab (\t) when copying to clipboard.
  // Even if user data contains commas or semicolons inside description cells, tab is the primary column separator.
  let delimiter = '\t';
  if (tabCount > 0) {
    delimiter = '\t';
  } else if (semiCount > commaCount && semiCount >= lines.length - 1) {
    delimiter = ';';
  } else if (commaCount > 0) {
    delimiter = ',';
  } else {
    delimiter = '\t';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((cell) => cell.length > 0));
}

// ---------------------------------------------------------------------------
// Column Mapping & Header Detection
// ---------------------------------------------------------------------------

export interface DetectedColMap {
  itemNo: number;
  category?: number;
  description: number;
  notes?: number;
  remark?: number;
  type?: number;
  d1?: number;
  d2?: number;
  d3?: number;
  dLen?: number;
  d4?: number;
  qty?: number;
  unit?: number;
  weight?: number;
  unitPrice?: number;
  totalPrice?: number;
  progress?: number;
}

function detectColumnMapping(headers: string[]): DetectedColMap | null {
  const colMap: Partial<DetectedColMap> = {};
  const assignedCols = new Set<number>();

  // Helper to test normalized header
  const cleanHeaders = headers.map((h) =>
    (h || '')
      .toLowerCase()
      .replace(/[\r\n]+/g, ' ')
      .replace(/[():/\\_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );

  const tryAssign = (key: keyof DetectedColMap, index: number): boolean => {
    if (assignedCols.has(index)) return false;
    if (colMap[key] === undefined) {
      colMap[key] = index;
      assignedCols.add(index);
      return true;
    }
    return false;
  };

  // PASS 1: Total Price / Total Biaya (Priority: Distinguish from Unit Price and Weight)
  cleanHeaders.forEach((s, idx) => {
    if (!s || assignedCols.has(idx)) return;
    if (
      s.includes('total biaya') ||
      s.includes('total harga') ||
      s.includes('jumlah total') ||
      s.includes('total rp') ||
      s.includes('total price') ||
      s.includes('total cost') ||
      s.includes('total amount') ||
      s.includes('sub total') ||
      s.includes('subtotal') ||
      s === 'total' ||
      s === 'jumlah' ||
      s === 'amount'
    ) {
      tryAssign('totalPrice', idx);
    }
  });

  // PASS 2: Unit Price / Harga Satuan
  cleanHeaders.forEach((s, idx) => {
    if (!s || assignedCols.has(idx)) return;
    if (
      s.includes('harga satuan') ||
      s.includes('unit price') ||
      s.includes('price unit') ||
      s.includes('rate') ||
      s.includes('tarif') ||
      s.includes('rp kg') ||
      s.includes('idr kg') ||
      s.includes('biaya satuan') ||
      s === 'harga' ||
      s === 'price' ||
      s === 'cost'
    ) {
      tryAssign('unitPrice', idx);
    }
  });

  // PASS 3: Weight / Tonase (kg)
  cleanHeaders.forEach((s, idx) => {
    if (!s || assignedCols.has(idx)) return;
    if (
      s.includes('berat tonase') ||
      s.includes('berat') ||
      s.includes('tonase') ||
      s.includes('tonnage') ||
      s.includes('weight') ||
      s.includes('bobot') ||
      s.includes('kg') ||
      s === 'wt' ||
      s === 'w'
    ) {
      tryAssign('weight', idx);
    }
  });

  // PASS 4: Quantity & Unit
  cleanHeaders.forEach((s, idx) => {
    if (!s || assignedCols.has(idx)) return;
    if (
      s === 'qty' ||
      s === 'quantity' ||
      s === 'kuantitas' ||
      s === 'kuantiti' ||
      s === 'vol' ||
      s === 'volume' ||
      s === 'jumlah item' ||
      s === 'banyaknya' ||
      s === 'jml' ||
      s.includes('qty') ||
      s.includes('volume')
    ) {
      tryAssign('qty', idx);
    } else if (
      s === 'satuan' ||
      s === 'unit' ||
      s === 'sat' ||
      s === 'uom' ||
      s === 'satuan pekerjaan' ||
      s === 'unit of measure'
    ) {
      tryAssign('unit', idx);
    }
  });

  // PASS 5: Dimensions (dLen/Panjang, d1, d2, d3, d4)
  // First match dLen (Panjang / Length / Pjg)
  cleanHeaders.forEach((s, idx) => {
    if (!s || assignedCols.has(idx)) return;
    if (
      s.includes('panjang dlen') ||
      s.includes('dlen') ||
      s.includes('d len') ||
      s === 'panjang' ||
      s === 'length' ||
      s === 'pjg' ||
      s.includes('panjang mm') ||
      s.includes('panjang profil') ||
      s.includes('panjang pipa') ||
      s.includes('panjang batang') ||
      s.includes('panjang m') ||
      s.endsWith('panjang')
    ) {
      tryAssign('dLen', idx);
    }
  });

  cleanHeaders.forEach((s, idx) => {
    if (!s || assignedCols.has(idx)) return;
    if (
      s.includes('d1') ||
      s === 'd1' ||
      s.includes('l p') ||
      s.includes('dimensi 1') ||
      s.includes('dimensi 1 d1') ||
      s.includes('panjang d1')
    ) {
      tryAssign('d1', idx);
    } else if (
      s.includes('d2') ||
      s === 'd2' ||
      s.includes('w l') ||
      s.includes('dimensi 2') ||
      s.includes('lebar') ||
      s.includes('width') ||
      s.includes('sayap') ||
      s.includes('dia') ||
      s.includes('diameter') ||
      s.includes('od')
    ) {
      tryAssign('d2', idx);
    } else if (
      s.includes('d3') ||
      s === 'd3' ||
      s.includes('tebal') ||
      s.includes('thk') ||
      s.includes('thickness') ||
      s.includes('dimensi 3') ||
      s.includes('wall thk') ||
      s.includes('sisi')
    ) {
      tryAssign('d3', idx);
    } else if (
      s.includes('d4') ||
      s === 'd4' ||
      s.includes('faktor') ||
      s.includes('factor') ||
      s.includes('pengali') ||
      s.includes('dimensi 4')
    ) {
      tryAssign('d4', idx);
    }
  });

  // PASS 6: Material / Type
  cleanHeaders.forEach((s, idx) => {
    if (!s || assignedCols.has(idx)) return;
    if (
      s.includes('material') ||
      s.includes('spesifikasi') ||
      s.includes('bahan') ||
      s.includes('profile') ||
      s.includes('profil') ||
      s.includes('spec') ||
      s.includes('tipe') ||
      s === 'type' ||
      s === 'grade'
    ) {
      tryAssign('type', idx);
    }
  });

  // PASS 7: Notes, Remark & Progress
  cleanHeaders.forEach((s, idx) => {
    if (!s || assignedCols.has(idx)) return;
    if (s.includes('remark') || s.includes('remarks') || s.includes('catatan galangan')) {
      tryAssign('remark', idx);
    } else if (
      s.includes('keterangan') ||
      s.includes('catatan') ||
      s.includes('notes') ||
      s === 'ket'
    ) {
      tryAssign('notes', idx);
    } else if (
      s.includes('progress') ||
      s.includes('kemajuan') ||
      s.includes('realisasi') ||
      s === '%'
    ) {
      tryAssign('progress', idx);
    }
  });

  // PASS 8: Category
  cleanHeaders.forEach((s, idx) => {
    if (!s || assignedCols.has(idx)) return;
    if (
      s.includes('kategori') ||
      s.includes('category') ||
      s.includes('dept') ||
      s.includes('bagian') ||
      s.includes('divisi') ||
      s.includes('kelompok')
    ) {
      tryAssign('category', idx);
    }
  });

  // PASS 9: Description / Uraian Pekerjaan
  cleanHeaders.forEach((s, idx) => {
    if (!s || assignedCols.has(idx)) return;
    if (
      s.includes('deskripsi') ||
      s.includes('uraian') ||
      s.includes('description') ||
      s.includes('pekerjaan') ||
      s.includes('work items') ||
      s.includes('scope') ||
      s.includes('item pekerjaan') ||
      s.includes('rincian') ||
      s.includes('skema struktur') ||
      s.includes('nama pekerjaan')
    ) {
      tryAssign('description', idx);
    }
  });

  // PASS 10: Item Number
  cleanHeaders.forEach((s, idx) => {
    if (!s || assignedCols.has(idx)) return;
    if (
      s === 'no' ||
      s === 'no.' ||
      s === 'pos' ||
      s === 'item' ||
      s === 'item no' ||
      s === 'item no.' ||
      s === 'no. item' ||
      s === 'nomor' ||
      s === 'kode' ||
      s === 'no item' ||
      s === 'wbs' ||
      s.startsWith('no.') ||
      s.startsWith('no ')
    ) {
      tryAssign('itemNo', idx);
    }
  });

  // Fallbacks if Description or ItemNo still unassigned
  if (colMap.description === undefined) {
    for (let i = 0; i < cleanHeaders.length; i++) {
      if (!assignedCols.has(i) && cleanHeaders[i].length > 0) {
        colMap.description = i;
        assignedCols.add(i);
        break;
      }
    }
  }

  if (colMap.itemNo === undefined) {
    if (!assignedCols.has(0)) {
      colMap.itemNo = 0;
      assignedCols.add(0);
    } else if (!assignedCols.has(1)) {
      colMap.itemNo = 1;
      assignedCols.add(1);
    } else {
      colMap.itemNo = 0;
    }
  }

  if (colMap.itemNo === undefined && colMap.description === undefined) {
    return null;
  }

  return {
    itemNo: colMap.itemNo ?? 0,
    category: colMap.category,
    description: colMap.description ?? 1,
    notes: colMap.notes,
    remark: colMap.remark,
    type: colMap.type,
    d1: colMap.d1,
    d2: colMap.d2,
    d3: colMap.d3,
    dLen: colMap.dLen,
    d4: colMap.d4,
    qty: colMap.qty,
    unit: colMap.unit,
    weight: colMap.weight,
    unitPrice: colMap.unitPrice,
    totalPrice: colMap.totalPrice,
    progress: colMap.progress,
  };
}

// ---------------------------------------------------------------------------
// Category Matching Helper
// ---------------------------------------------------------------------------

export function matchCategory(
  rawText: string | undefined | null,
  categories: WorkCategory[]
): WorkCategory | undefined {
  if (!rawText) return undefined;
  const s = rawText.toLowerCase().replace(/[\s\-_:]+/g, ' ').trim();
  if (!s) return undefined;

  // 1. Direct ID match
  const directId = categories.find((c) => c.id.toLowerCase() === s);
  if (directId) return directId;

  // 2. Exact match against category code or name
  const exact = categories.find(
    (c) => c.name.toLowerCase().trim() === s || c.code.toLowerCase().trim() === s
  );
  if (exact) return exact;

  // 3. Name contains or is contained in s (with length guard to prevent short false positives)
  for (const c of categories) {
    const cName = c.name.toLowerCase().trim();
    if (cName.length >= 5 && (s.includes(cName) || cName.includes(s))) {
      return c;
    }
  }

  // 4. Roman numeral code matching with word boundaries, sorted descending by length
  // e.g. "VIII", "VII", "VI", "IV", "IX", "III", "II", "X", "V", "I"
  const sortedByCodeDesc = [...categories].sort((a, b) => b.code.length - a.code.length);
  for (const c of sortedByCodeDesc) {
    const code = c.code.toLowerCase().trim();
    const regexes = [
      new RegExp(`(?:^|\\b|kategori|category|dept|bagian)\\s*${code}(?:\\b|\\s*[-:–—]|$)`, 'i'),
      new RegExp(`^${code}\\s*[-:–—]`, 'i'),
      new RegExp(`\\b${code}\\b`, 'i'),
    ];
    if (regexes.some((rx) => rx.test(s))) {
      return c;
    }
  }

  // 5. Arabic number match based on sortOrder (e.g. "Kategori 7" or "Cat 7" or "7. Steelwork")
  for (const c of categories) {
    const order = String(c.sortOrder);
    const regexes = [
      new RegExp(`(?:kategori|category|dept|bagian)\\s*${order}(?:\\b|\\s*[-:–—]|$)`, 'i'),
      new RegExp(`^${order}\\s*[-:–—.]`, 'i'),
    ];
    if (regexes.some((rx) => rx.test(s))) {
      return c;
    }
  }

  // 6. Common Indonesian/English maritime domain synonyms
  const domainSynonyms: Record<string, string[]> = {
    'cat-1': ['docking', 'undocking', 'pengedokan', 'graving', 'slipway', 'floating dock'],
    'cat-2': ['pelayanan umum', 'general service', 'fasilitas', 'crane', 'listrik darat'],
    'cat-3': ['cleaning', 'painting', 'pengecatan', 'blasting', 'cuci', 'washing', 'water jet', 'coating', 'anti fouling'],
    'cat-4': ['cathodic', 'anoda', 'zinc anode', 'katodik', 'icc', 'anode'],
    'cat-5': ['sea chest', 'seachest', 'katup', 'valve', 'kerangan', 'kotak laut', 'strainer'],
    'cat-6': ['kemudi', 'rudder', 'propeller', 'baling-baling', 'poros', 'shaft', 'stern tube', 'propulsi'],
    'cat-7': ['steelwork', 'replating', 'pelat', 'plate', 'lambung', 'hull', 'baja', 'konstruksi lambung', 'bottom', 'deck'],
    'cat-8': ['piping', 'pipa', 'pipe', 'fitting', 'flange', 'spool', 'sanitary'],
    'cat-9': ['machinery', 'mesin', 'engine', 'pompa', 'pump', 'kompresor', 'auxiliary'],
    'cat-10': ['electrical', 'listrik', 'kabel', 'cable', 'generator', 'panel', 'switchboard', 'navigasi'],
    'cat-11': ['outfitting', 'akomodasi', 'interior', 'furniture', 'pintu', 'door', 'manhole', 'ladder', 'tangga'],
    'cat-12': ['others', 'lain-lain', 'lain', 'miscellaneous', 'additional', 'pekerjaan lain', 'housekeeping', 'safety', 'keselamatan', 'liferaft', 'sekoci', 'pemadam kebakaran', 'fire fighting', 'alat keselamatan'],
    'cat-13': ['survei', 'survey', 'inspeksi', 'ut', 'ndt', 'thickness gauging', 'pemeriksaan kelas', 'bki'],
    'cat-14': ['special', 'khusus', 'pekerjaan khusus', 'lain-lain', 'miscellaneous', 'additional'],
  };

  for (const [catId, keywords] of Object.entries(domainSynonyms)) {
    if (keywords.some((kw) => s.includes(kw))) {
      const found = categories.find((c) => c.id === catId);
      if (found) return found;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Category Banner & Summary Row Filters
// ---------------------------------------------------------------------------

export function isCategoryBannerRow(
  rowValues: string[],
  categories: WorkCategory[]
): { isBanner: boolean; matchedCategory?: WorkCategory } {
  const nonEmpty = rowValues.map((v) => extractCellString(v)).filter(Boolean);
  if (nonEmpty.length === 0) return { isBanner: false };

  const joined = nonEmpty.join(' ').trim();
  const joinedLow = joined.toLowerCase();

  // If starts with "--- KATEGORI" or "KATEGORI ..." or "CATEGORY ..."
  const hasBannerMarker =
    joinedLow.startsWith('kategori') ||
    joinedLow.startsWith('category') ||
    joinedLow.startsWith('---') ||
    /^[ivxlcdm]+\s*[-:–—]/i.test(joined);

  if (hasBannerMarker) {
    const matched = matchCategory(joined, categories);
    if (matched) return { isBanner: true, matchedCategory: matched };
  }

  // If very few cells filled (e.g. 1 or 2 cells) and matches category
  if (nonEmpty.length <= 2) {
    const matched = matchCategory(joined, categories);
    if (matched) {
      return { isBanner: true, matchedCategory: matched };
    }
  }

  return { isBanner: false };
}

export function isSummaryOrBlankRow(rowValues: string[]): boolean {
  const nonEmpty = rowValues.map((v) => extractCellString(v)).filter(Boolean);
  if (nonEmpty.length === 0) return true;

  const joined = nonEmpty.join(' ').toUpperCase().trim();

  // Check specific subtotal and grand total summary patterns (without false-positive matching work items like "Total Overhaul")
  const summaryPrefixes = [
    'SUBTOTAL',
    'SUB TOTAL',
    'TOTAL BIAYA',
    'TOTAL HARGA',
    'GRAND TOTAL',
    'TOTAL TONASE',
    'TOTAL BERAT',
    'JUMLAH TOTAL',
  ];

  if (summaryPrefixes.some((p) => joined.startsWith(p) || joined === p)) {
    return true;
  }

  // Exact standalone total/subtotal markers
  if (joined === 'TOTAL' || joined === 'SUBTOTAL' || joined === 'SUB TOTAL' || joined === 'GRAND TOTAL') {
    return true;
  }

  // All cells are dashes, zeroes, or blanks
  const isOnlyDashesOrZeros = nonEmpty.every(
    (v) => v === '-' || v === '--' || v === '0' || v === '0.00' || v === 'Rp 0'
  );
  if (isOnlyDashesOrZeros) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Pre-Import Validation Utility: Empty Description & Invalid Sequence Number
// ---------------------------------------------------------------------------

export function createEmptyValidationSummary(): ImportValidationSummary {
  return {
    isValid: true,
    totalChecked: 0,
    totalIssues: 0,
    emptyDescriptionCount: 0,
    invalidItemNoCount: 0,
    issues: [],
    canAutoFix: false,
  };
}

/**
 * Checks whether a row's description is empty, whitespace only, or a meaningless placeholder.
 */
export function isBlankDescription(desc: string | undefined | null): boolean {
  if (!desc) return true;
  const trimmed = desc.trim();
  if (!trimmed) return true;

  const placeholders = new Set([
    '-',
    '--',
    '---',
    '.',
    '..',
    '...',
    'none',
    'null',
    'undefined',
    'nan',
    'n/a',
    'na',
    'kosong',
    'tanpa uraian',
    'no desc',
    'no description',
    '(kosong)',
    '[kosong]',
  ]);

  return placeholders.has(trimmed.toLowerCase());
}

/**
 * Validates sequence numbering format against shipyard standard patterns.
 * Supports: integers (1, 2), hierarchical (1.1, 1.1.1, 1.2.3.4), alphanumeric codes (1a, A.1, I, II).
 * Detects: formula errors (#REF!, #VALUE!), invalid characters, consecutive dots (1..2),
 * trailing/leading dots (1., .1), spaces within numbers, commas instead of dots,
 * empty dot segments, or excessive nesting.
 */
export function validateSequenceNumberFormat(itemNo: string | undefined | null): {
  isValid: boolean;
  reason?: string;
} {
  if (!itemNo || !itemNo.trim()) {
    // Blank item numbers will be auto-generated sequentially by the system
    return { isValid: true };
  }

  const trimmed = itemNo.trim();

  // 1. Excel formula errors
  const formulaErrors = ['#REF!', '#VALUE!', '#N/A', '#NAME?', '#NUM!', '#DIV/0!', '#NULL!', '#ERROR!'];
  for (const err of formulaErrors) {
    if (trimmed.toUpperCase().includes(err)) {
      return { isValid: false, reason: `Mengandung kode kesalahan formula Excel (${err})` };
    }
  }

  // 2. Program artifacts
  if (['undefined', 'nan', 'null'].includes(trimmed.toLowerCase())) {
    return { isValid: false, reason: `Berisi nilai artefak program (${trimmed})` };
  }

  // 3. Leading / trailing / consecutive dots or dashes
  if (trimmed.startsWith('.')) {
    return { isValid: false, reason: 'Diawali dengan karakter titik (.) tanpa nomor induk' };
  }
  if (trimmed.endsWith('.')) {
    return { isValid: false, reason: 'Berakhiran dengan karakter titik (.) tanpa rincian sub-pekerjaan' };
  }
  if (trimmed.startsWith('-')) {
    return { isValid: false, reason: 'Diawali dengan karakter strip (-) tanpa nomor urut valid' };
  }
  if (trimmed.endsWith('-')) {
    return { isValid: false, reason: 'Berakhiran dengan karakter strip (-) tanpa nomor rincian' };
  }
  if (/\.{2,}/.test(trimmed)) {
    return { isValid: false, reason: 'Mengandung titik ganda (..) pada nomor urut' };
  }
  if (/\-{2,}/.test(trimmed)) {
    return { isValid: false, reason: 'Mengandung tanda strip ganda (--)' };
  }
  if (/\.\s+\./.test(trimmed)) {
    return { isValid: false, reason: 'Terdapat spasi kosong di antara titik hierarki' };
  }
  if (/\s+/.test(trimmed)) {
    return { isValid: false, reason: 'Mengandung karakter spasi di tengah nomor urut (contoh tidak valid: "1. 1")' };
  }
  if (/,/.test(trimmed)) {
    return { isValid: false, reason: 'Menggunakan tanda koma (,) alih-alih titik (.) sebagai pemisah hierarki' };
  }

  // 4. Prohibited characters / malformed symbols
  if (/[#$@^&*~<>{}|\\?=!]/.test(trimmed)) {
    return { isValid: false, reason: 'Mengandung karakter simbol tidak diizinkan (? # $ @ !)' };
  }

  // 5. Check valid hierarchical / alphanumeric pattern
  // Matches: 1, 1.1, 1.1.1, 1-1, 1a, A.1, II.1, IV.2.1
  const validPattern = /^(?:[A-Za-z0-9]+)(?:[.\-][A-Za-z0-9]+)*$/;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, reason: 'Format karakter nomor urut tidak sesuai pola standar galangan' };
  }

  // 6. Check nesting depth (max 5 levels, e.g. 1.1.1.1.1)
  const segments = trimmed.split(/[.\-]/);
  if (segments.length > 5) {
    return { isValid: false, reason: 'Kedalaman hierarki melebihi batas maksimal (maksimum 5 tingkat)' };
  }

  return { isValid: true };
}

/**
 * Validates all extracted rows from Excel or clipboard paste for empty descriptions and invalid numbering.
 */
export function validateImportRows(
  rows: RawExtractedRow[],
  categories: WorkCategory[]
): ImportValidationSummary {
  const issues: ImportValidationIssue[] = [];
  let emptyDescCount = 0;
  let invalidItemNoCount = 0;

  rows.forEach((r, idx) => {
    const rowNum = r.rowNumber || idx + 1;

    // Skip category banner rows
    if (r.isExplicitCategoryBanner) return;
    const bannerCheck = isCategoryBannerRow([r.description, r.categoryText], categories);
    if (bannerCheck.isBanner) return;

    // Skip summary / blank rows
    const rowCells = [r.itemNo, r.description, r.categoryText, r.notes, r.remark, String(r.qty || '')];
    if (isSummaryOrBlankRow(rowCells)) return;

    // 1. Check Empty Description
    if (isBlankDescription(r.description)) {
      emptyDescCount++;
      issues.push({
        id: `val-desc-${rowNum}-${idx}`,
        rowNumber: rowNum,
        sheetName: r.sheetName,
        itemNo: r.itemNo || '-',
        description: r.description || '(Kosong)',
        issueType: 'EMPTY_DESCRIPTION',
        severity: 'error',
        field: 'description',
        message: `Baris ${rowNum}${r.sheetName ? ` [Sheet: ${r.sheetName}]` : ''}: Deskripsi / uraian pekerjaan kosong atau berupa placeholder tidak valid.`,
        suggestion: 'Isi uraian pekerjaan yang jelas, atau gunakan opsi Lewati / Koreksi Otomatis.',
      });
    }

    // 2. Check Invalid Item Number Format
    const numValidation = validateSequenceNumberFormat(r.itemNo);
    if (!numValidation.isValid) {
      invalidItemNoCount++;
      issues.push({
        id: `val-num-${rowNum}-${idx}`,
        rowNumber: rowNum,
        sheetName: r.sheetName,
        itemNo: r.itemNo,
        description: r.description || '-',
        issueType: 'INVALID_ITEM_NO',
        severity: 'error',
        field: 'itemNo',
        message: `Baris ${rowNum}${r.sheetName ? ` [Sheet: ${r.sheetName}]` : ''}: Format nomor urut "${r.itemNo}" tidak valid (${numValidation.reason}).`,
        suggestion: 'Gunakan angka bulat (1, 2) atau bertingkat (1.1, 1.1.1) tanpa simbol terlarang, spasi, atau titik ganda.',
      });
    }
  });

  return {
    isValid: issues.length === 0,
    totalChecked: rows.length,
    totalIssues: issues.length,
    emptyDescriptionCount: emptyDescCount,
    invalidItemNoCount: invalidItemNoCount,
    issues,
    canAutoFix: issues.length > 0,
  };
}

/**
 * Filters out raw rows that have validation failures (empty descriptions, invalid numbering, or both)
 */
export function filterValidRawRows(
  rows: RawExtractedRow[],
  issues: ImportValidationIssue[],
  filterType?: 'ALL' | 'EMPTY_DESCRIPTION' | 'INVALID_ITEM_NO'
): RawExtractedRow[] {
  const invalidRowKeys = new Set(
    issues
      .filter((i) => !filterType || filterType === 'ALL' || i.issueType === filterType)
      .map((i) => `${i.sheetName || ''}_${i.rowNumber}`)
  );
  return rows.filter((r, idx) => !invalidRowKeys.has(`${r.sheetName || ''}_${r.rowNumber || idx + 1}`));
}

/**
 * Automatically corrects validation issues on raw rows:
 * - Fills in empty descriptions with standard contextual descriptions
 * - Sanitizes and normalizes invalid item numbers into clean format
 */
export function autoFixRawRows(
  rows: RawExtractedRow[],
  issues: ImportValidationIssue[]
): RawExtractedRow[] {
  const issueMap = new Map<string, ImportValidationIssue[]>();
  issues.forEach((iss) => {
    const key = `${iss.sheetName || ''}_${iss.rowNumber}`;
    if (!issueMap.has(key)) issueMap.set(key, []);
    issueMap.get(key)!.push(iss);
  });

  return rows.map((r, idx) => {
    const rowNum = r.rowNumber || idx + 1;
    const key = `${r.sheetName || ''}_${rowNum}`;
    const rowIssues = issueMap.get(key);
    if (!rowIssues || rowIssues.length === 0) return r;

    let newDesc = r.description;
    let newItemNo = r.itemNo;

    for (const iss of rowIssues) {
      if (iss.issueType === 'EMPTY_DESCRIPTION') {
        const typeInfo = r.type ? ` [${r.type}]` : '';
        const itemLabel = r.itemNo && r.itemNo !== '-' ? `Item #${r.itemNo}` : `Baris #${rowNum}`;
        newDesc = `[Koreksi Otomatis] Pekerjaan ${itemLabel}${typeInfo}`;
      }
      if (iss.issueType === 'INVALID_ITEM_NO') {
        // Strip formula error and illegal characters
        let cleaned = r.itemNo
          .replace(/#REF!|#VALUE!|#N\/A|#NAME\?|#NUM!|#DIV\/0!|#NULL!|#ERROR!|undefined|NaN|null/gi, '')
          .replace(/[#$@^&*~<>{}|\\?=!]/g, '')
          .replace(/\.{2,}/g, '.')
          .replace(/^\.+|\.+$/g, '')
          .trim();
        if (!cleaned) {
          cleaned = String(rowNum);
        }
        newItemNo = cleaned;
      }
    }

    return {
      ...r,
      description: newDesc,
      itemNo: newItemNo,
    };
  });
}

// ---------------------------------------------------------------------------
// SQLite Schema Data Type Validation & Sanitization Utility
// ---------------------------------------------------------------------------

export function validateWorkItemsForSqlite(
  rawItems: WorkItem[],
  categories: WorkCategory[]
): {
  validItems: WorkItem[];
  warnings: string[];
  errors: string[];
} {
  const validItems: WorkItem[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const validCatIds = new Set(categories.map((c) => c.id));
  const fallbackCat =
    categories.find((c) => c.id === 'cat-12') ||
    categories[categories.length - 1] || { id: 'cat-12', code: 'XII', name: 'Others', sortOrder: 12 };

  rawItems.forEach((item, idx) => {
    // 1. Description validation (TEXT NOT NULL in SQLite)
    let desc = extractCellString(item.description).trim();
    if (!desc) {
      desc = item.isAreaHeader || item.itemLevel === 1 ? 'AREA PEKERJAAN' : item.itemLevel === 2 ? 'SUB-SISTEM' : 'Item Pekerjaan Tanpa Uraian';
      warnings.push(`Baris ${idx + 1} (${item.itemNo || 'Tanpa No'}): Deskripsi kosong disesuaikan menjadi "${desc}"`);
    }

    // 2. Category mapping & validation (TEXT Foreign Key)
    let categoryId = extractCellString(item.categoryId).trim();
    if (!validCatIds.has(categoryId)) {
      const matched = matchCategory(categoryId, categories);
      if (matched) {
        categoryId = matched.id;
      } else {
        categoryId = fallbackCat.id;
        warnings.push(`Baris ${idx + 1} (${item.itemNo || desc}): Kategori "${item.categoryId || 'Kosong'}" disesuaikan ke ${fallbackCat.name}`);
      }
    }

    // 3. SQLite REAL numeric fields enforcement
    let qty = parseFlexibleNumber(item.qty, 'quantity');
    if (isNaN(qty) || qty < 0) qty = 0;
    if (qty === 0 && item.itemLevel === 3 && !item.isAreaHeader) {
      qty = 1;
    }

    let weightKg = parseFlexibleNumber(item.weightKg, 'general');
    if (isNaN(weightKg) || weightKg < 0) weightKg = 0;
    weightKg = Math.round(weightKg * 100) / 100;

    let unitPrice = parseFlexibleNumber(item.unitPrice, 'currency');
    if (isNaN(unitPrice) || unitPrice < 0) unitPrice = 0;
    unitPrice = Math.round(unitPrice);

    let totalPrice = parseFlexibleNumber(item.totalPrice, 'currency');
    if (isNaN(totalPrice) || totalPrice < 0) totalPrice = 0;

    if (totalPrice === 0 && unitPrice > 0) {
      const isWeightBasis = item.priceBasis === 'weight' || (item.unit && item.unit.toLowerCase() === 'kg' && weightKg > 0);
      if (isWeightBasis && weightKg > 0) {
        totalPrice = Math.round(weightKg * unitPrice);
      } else if (qty > 0) {
        totalPrice = Math.round(qty * unitPrice);
      }
    }

    let progressPercent = parseFlexibleNumber(item.progressPercent, 'general');
    if (isNaN(progressPercent)) progressPercent = item.isCompleted ? 100 : 0;
    progressPercent = Math.min(100, Math.max(0, progressPercent));

    // 4. SQLite INTEGER/TEXT level & boolean fields enforcement
    const itemLevel = (item.itemLevel === 1 || item.itemLevel === 2 || item.itemLevel === 3) ? item.itemLevel : 3;
    const isAreaHeader = itemLevel === 1 || Boolean(item.isAreaHeader);
    const isCompleted = progressPercent >= 100 || Boolean(item.isCompleted);

    const validatedItem: WorkItem = {
      id: extractCellString(item.id) || `work-imp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      projectId: extractCellString(item.projectId) || 'proj-f049',
      categoryId,
      itemNo: extractCellString(item.itemNo),
      description: desc,
      type: extractCellString(item.type),
      d1: normalizeDimensionString(item.d1),
      d2: normalizeDimensionString(item.d2),
      d3: normalizeDimensionString(item.d3),
      dLen: normalizeDimensionString(item.dLen),
      d4: normalizeDimensionString(item.d4),
      qty,
      unit: extractCellString(item.unit) || (isAreaHeader || itemLevel === 2 ? '' : 'kg'),
      weightKg,
      unitPrice,
      totalPrice,
      remark: extractCellString(item.remark),
      remark2: extractCellString(item.remark2),
      notes: extractCellString(item.notes),
      parentId: item.parentId ? extractCellString(item.parentId) : undefined,
      itemLevel,
      isAreaHeader,
      progressPercent,
      progressQty: item.progressQty !== undefined ? parseFlexibleNumber(item.progressQty, 'quantity') : undefined,
      progressNotes: extractCellString(item.progressNotes) || undefined,
      progressDate: extractCellString(item.progressDate) || undefined,
      isCompleted,
      hasValidationIssue: item.hasValidationIssue,
      validationIssueMessage: item.validationIssueMessage,
    };

    validItems.push(validatedItem);
  });

  return { validItems, warnings, errors };
}

// ---------------------------------------------------------------------------
// Unified Raw Row Parser & Hierarchy Reconstructor
// ---------------------------------------------------------------------------

export function processExtractedRows(
  rows: RawExtractedRow[],
  categories: WorkCategory[],
  validation?: ImportValidationSummary
): {
  items: WorkItem[];
  categoriesFound: Set<string>;
  warnings: string[];
} {
  const items: WorkItem[] = [];
  const categoriesFound = new Set<string>();
  const warnings: string[] = [];

  // Group rows by active category while tracking banners
  let currentCategoryId = categories[0]?.id || 'cat-1';
  const categoryBuckets: Map<string, RawExtractedRow[]> = new Map();

  for (const r of rows) {
    // 1. Check if row is category banner
    if (r.isExplicitCategoryBanner) {
      const bannerMatch = matchCategory(r.description || r.categoryText, categories);
      if (bannerMatch) {
        currentCategoryId = bannerMatch.id;
        categoriesFound.add(bannerMatch.code);
        continue; // Do not include category banner row as a work item
      }
    }

    // 2. Check if row itself is a summary or subtotal
    const rowCells = [
      r.itemNo,
      r.categoryText,
      r.description,
      r.notes,
      r.type,
      r.d1,
      r.d2,
      r.d3,
      r.dLen,
      r.d4,
      String(r.qty || ''),
      r.unit,
      String(r.weight || ''),
      String(r.unitPrice || ''),
      String(r.totalPrice || ''),
    ];
    if (isSummaryOrBlankRow(rowCells)) {
      continue;
    }

    // Check banner check for rows where description looks like "--- KATEGORI VII: STEELWORK ---"
    const inlineBanner = isCategoryBannerRow([r.description, r.categoryText], categories);
    if (inlineBanner.isBanner && inlineBanner.matchedCategory) {
      currentCategoryId = inlineBanner.matchedCategory.id;
      categoriesFound.add(inlineBanner.matchedCategory.code);
      continue;
    }

    // 3. Determine row's target category
    let rowCatId = currentCategoryId;
    if (r.categoryText && r.categoryText.trim()) {
      const matched = matchCategory(r.categoryText, categories);
      if (matched) {
        rowCatId = matched.id;
        currentCategoryId = matched.id;
        categoriesFound.add(matched.code);
      }
    } else if (r.sheetName) {
      const matchedSheet = matchCategory(r.sheetName, categories);
      if (matchedSheet) {
        rowCatId = matchedSheet.id;
        categoriesFound.add(matchedSheet.code);
      }
    }

    if (!categoryBuckets.has(rowCatId)) {
      categoryBuckets.set(rowCatId, []);
    }
    categoryBuckets.get(rowCatId)!.push(r);
  }

  // Process each category bucket
  for (const [catId, catRows] of categoryBuckets.entries()) {
    const catObj = categories.find((c) => c.id === catId);
    if (catObj) categoriesFound.add(catObj.code);

    // Analyze category structure: does it use dotted numbering or explicit area/sub-system tags?
    const hasHierarchyDots = catRows.some(
      (r) => (r.itemNo.match(/\./g) || []).length >= 1
    );
    const hasExplicitHierarchyTags = catRows.some((r) => {
      const u = r.description.toUpperCase();
      return (
        u.includes('[AREA]') ||
        u.includes('(AREA)') ||
        u.includes('[SUB-SYSTEM]') ||
        u.includes('[SUBSYSTEM]')
      );
    });
    const isHierarchicalCategory = hasHierarchyDots || hasExplicitHierarchyTags;

    const itemNoToIdMap = new Map<string, string>();
    let currentArea: { id: string; itemNo: string } | null = null;
    let currentSubsystem: { id: string; itemNo: string } | null = null;
    let areaCounter = 0;
    let subCounter = 0;
    let compCounter = 0;

    const categoryResultItems: WorkItem[] = [];

    catRows.forEach((r, rowIdx) => {
      const itemId = `work-imp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Clean description: strip [AREA], [SUB-SYSTEM], [KOMPONEN], tree branches
      const cleanDesc = r.description
        .replace(/^[├│└─\s]+(\[SUB-SYSTEM\]|\[SUBSYSTEM\]|\[AREA\]|\[KOMPONEN\]|\[COMPONENT\])?\s*/i, '')
        .replace(/^(\[SUB-SYSTEM\]|\[SUBSYSTEM\]|\[AREA\]|\[KOMPONEN\]|\[COMPONENT\])\s*/i, '')
        .replace(/^[\s\-•*]+\s*/, '')
        .trim();

      const descUpper = r.description.toUpperCase();
      const isTaggedArea = descUpper.includes('[AREA]') || descUpper.startsWith('(AREA)');
      const isTaggedSub =
        descUpper.includes('[SUB-SYSTEM]') ||
        descUpper.includes('[SUBSYSTEM]') ||
        descUpper.startsWith('(SUB)');
      const isTaggedComp = descUpper.includes('[KOMPONEN]') || descUpper.startsWith('(KOMPONEN)');

      // Normalize data types upfront
      const normalizedType = normalizeMaterialType(r.type);
      const d1 = normalizeDimensionString(r.d1);
      const d2 = normalizeDimensionString(r.d2);
      const d3 = normalizeDimensionString(r.d3);
      const dLen = normalizeDimensionString(r.dLen);
      const d4 = normalizeDimensionString(r.d4);

      // Physical attribute checks (material type and dimensions define a physical component)
      const hasMaterial = Boolean(normalizedType && normalizedType.trim() !== '' && normalizedType.trim() !== '-');
      const hasDims = Boolean(
        (d1 && d1.trim() !== '') ||
        (d2 && d2.trim() !== '') ||
        (d3 && d3.trim() !== '') ||
        (dLen && dLen.trim() !== '')
      );
      const isPhysicalWorkItem = hasMaterial || hasDims;

      const trimmedItemNo = r.itemNo.trim();
      const dotCount = (trimmedItemNo.match(/\./g) || []).length;

      // Check if subsequent items have itemNo starting with `${trimmedItemNo}.`
      const hasChildren =
        trimmedItemNo.length > 0 &&
        catRows.slice(rowIdx + 1, rowIdx + 15).some((next) =>
          next.itemNo.trim().startsWith(trimmedItemNo + '.')
        );

      let itemLevel: 1 | 2 | 3 = 3;
      let isAreaHeader = false;

      if (isTaggedArea) {
        itemLevel = 1;
        isAreaHeader = true;
      } else if (isTaggedSub) {
        itemLevel = 2;
        isAreaHeader = false;
      } else if (isTaggedComp) {
        itemLevel = 3;
        isAreaHeader = false;
      } else if (isPhysicalWorkItem) {
        // Any item with physical material, dimensions, or weight is ALWAYS a Level 3 component!
        itemLevel = 3;
        isAreaHeader = false;
      } else if (!isHierarchicalCategory) {
        // Flat category (like Docking/Undocking, General Service)
        itemLevel = 3;
        isAreaHeader = false;
      } else if (hasChildren) {
        // Has children in hierarchy
        if (dotCount === 0) {
          itemLevel = 1;
          isAreaHeader = true;
        } else if (dotCount === 1) {
          itemLevel = 2;
          isAreaHeader = false;
        } else {
          itemLevel = 3;
          isAreaHeader = false;
        }
      } else {
        // No explicit tag, no physical dims, no detected children
        if (dotCount === 0) {
          const hasAreaKeywords = /area|bagian|zone|daerah|lambung|bottom|deck|geladak|seksi|tank|hold|ruang/i.test(cleanDesc);
          if (hasAreaKeywords || !currentArea) {
            itemLevel = 1;
            isAreaHeader = true;
          } else {
            itemLevel = 3;
            isAreaHeader = false;
          }
        } else if (dotCount === 1) {
          const nextHasTwoDots = catRows.slice(rowIdx + 1, rowIdx + 8).some((nr) => (nr.itemNo.match(/\./g) || []).length >= 2);
          if (nextHasTwoDots || !currentSubsystem) {
            itemLevel = 2;
            isAreaHeader = false;
          } else {
            itemLevel = 3;
            isAreaHeader = false;
          }
        } else {
          itemLevel = 3;
          isAreaHeader = false;
        }
      }

      // Establish parent relationships with prefix fallback
      let parentId: string | undefined = undefined;
      if (itemLevel === 1) {
        currentArea = { id: itemId, itemNo: trimmedItemNo || String(areaCounter + 1) };
        currentSubsystem = null;
        if (trimmedItemNo) itemNoToIdMap.set(trimmedItemNo, itemId);
        areaCounter++;
        subCounter = 0;
        compCounter = 0;
        parentId = undefined;
      } else if (itemLevel === 2) {
        const dotIdx = trimmedItemNo.lastIndexOf('.');
        const parentAreaPrefix = dotIdx > 0 ? trimmedItemNo.substring(0, dotIdx) : '';
        parentId = (parentAreaPrefix && itemNoToIdMap.get(parentAreaPrefix)) || (currentArea ? currentArea.id : undefined);

        currentSubsystem = { id: itemId, itemNo: trimmedItemNo || `${currentArea?.itemNo || '1'}.${subCounter + 1}` };
        if (trimmedItemNo) itemNoToIdMap.set(trimmedItemNo, itemId);
        subCounter++;
        compCounter = 0;
      } else {
        compCounter++;
        const dotIdx = trimmedItemNo.lastIndexOf('.');
        const parentSubPrefix = dotIdx > 0 ? trimmedItemNo.substring(0, dotIdx) : '';
        const parentSubId = parentSubPrefix ? itemNoToIdMap.get(parentSubPrefix) : undefined;

        if (parentSubId) {
          parentId = parentSubId;
        } else if (currentSubsystem) {
          parentId = currentSubsystem.id;
        } else if (currentArea) {
          parentId = currentArea.id;
        } else {
          parentId = undefined;
        }
      }

      const normalizedUnit = normalizeUnitString(r.unit, itemLevel);

      // Calculate weight if physical component has dimensions
      let finalWeight = r.weight || 0;
      if (finalWeight === 0 && normalizedType && (d1 || dLen)) {
        try {
          const calcRes = TonnageCalculator.calculateItemTonnageAndPrice({
            typeCode: normalizedType,
            d1: d1,
            d2: d2,
            d3: d3,
            dLen: dLen,
            d4: d4,
            qty: r.qty || 1,
          });
          finalWeight = calcRes.weightKg;
        } catch {
          finalWeight = 0;
        }
      }

      // Calculate total price
      let finalTotalPrice = r.totalPrice || 0;
      if (finalTotalPrice === 0 && r.unitPrice > 0) {
        if (normalizedUnit === 'kg' && finalWeight > 0) {
          finalTotalPrice = r.unitPrice * finalWeight;
        } else {
          finalTotalPrice = r.unitPrice * (r.qty || 1);
        }
      }

      // Generate clean item number if missing
      let cleanItemNo = trimmedItemNo;
      if (!cleanItemNo) {
        if (itemLevel === 1) {
          cleanItemNo = String(areaCounter);
        } else if (itemLevel === 2) {
          const aNo = currentArea ? currentArea.itemNo : '1';
          cleanItemNo = `${aNo}.${subCounter}`;
        } else {
          if (currentSubsystem) {
            cleanItemNo = `${currentSubsystem.itemNo}.${compCounter}`;
          } else if (currentArea) {
            cleanItemNo = `${currentArea.itemNo}.${compCounter}`;
          } else {
            cleanItemNo = String(compCounter);
          }
        }
      }

      const rowNum = r.rowNumber || rowIdx + 1;
      const matchedIssue = validation?.issues.find(
        (iss) =>
          iss.rowNumber === rowNum &&
          (!iss.sheetName || !r.sheetName || iss.sheetName === r.sheetName)
      );

      const isAreaOrSub = itemLevel === 1 || itemLevel === 2;

      const newItem: WorkItem = {
        id: itemId,
        projectId: 'project-f049',
        categoryId: catId,
        itemNo: cleanItemNo,
        description: cleanDesc || (itemLevel === 1 ? 'AREA PEKERJAAN' : itemLevel === 2 ? 'SUB-SISTEM' : 'Item Pekerjaan'),
        type: isAreaOrSub && (!normalizedType || normalizedType === '-') ? '' : normalizedType,
        d1: d1,
        d2: d2,
        d3: d3,
        dLen: dLen,
        d4: d4,
        qty: isAreaOrSub && (!r.qty || r.qty === 0) ? undefined : (r.qty || 1),
        unit: isAreaOrSub && (!normalizedUnit || normalizedUnit === '-') ? '' : normalizedUnit,
        weightKg: finalWeight,
        unitPrice: r.unitPrice || 0,
        totalPrice: finalTotalPrice,
        parentId: parentId,
        itemLevel: itemLevel,
        isAreaHeader: itemLevel === 1,
        notes: r.notes || '',
        remark: r.remark || '',
        progressPercent: r.progress !== undefined && !isNaN(r.progress) ? Math.min(100, Math.max(0, r.progress)) : undefined,
        progressNotes: r.remark || r.notes || undefined,
        isCompleted: r.progress !== undefined && r.progress >= 100,
        hasValidationIssue: Boolean(matchedIssue),
        validationIssueMessage: matchedIssue?.message,
      };

      categoryResultItems.push(newItem);
    });

    // Run resequencing to guarantee 100% harmonious numbers if hierarchical
    let finalizedCategoryItems = categoryResultItems;
    try {
      finalizedCategoryItems = resequenceCategoryItems(categoryResultItems, catId);
    } catch {
      finalizedCategoryItems = categoryResultItems;
    }

    items.push(...finalizedCategoryItems);
  }

  // Enforce strict SQLite data type validation & mapping on all extracted items
  const { validItems, warnings: valWarnings } = validateWorkItemsForSqlite(items, categories);
  warnings.push(...valWarnings);

  return { items: validItems, categoriesFound, warnings };
}

/**
 * Remaps a 2D text matrix using custom column mapping parameters
 */
export function remapRawRowsWithCustomColMap(
  rawMatrix: string[][],
  colMap: DetectedColMap,
  categories: WorkCategory[]
): RawExtractedRow[] {
  const rawRows: RawExtractedRow[] = [];

  for (let r = 0; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    if (!row || row.length === 0) continue;

    const strValues = row.map((v) => extractCellString(v).trim());
    if (isSummaryOrBlankRow(strValues)) continue;

    const itemNoStr = colMap.itemNo !== undefined && colMap.itemNo >= 0 ? strValues[colMap.itemNo] || '' : '';
    const descStr = colMap.description !== undefined && colMap.description >= 0 ? strValues[colMap.description] || '' : '';
    const notesStr = colMap.notes !== undefined && colMap.notes >= 0 ? strValues[colMap.notes] || '' : '';
    const typeStr = colMap.type !== undefined && colMap.type >= 0 ? strValues[colMap.type] || '' : '';
    const d1Str = colMap.d1 !== undefined && colMap.d1 >= 0 ? normalizeDimensionString(strValues[colMap.d1]) : '';
    const d2Str = colMap.d2 !== undefined && colMap.d2 >= 0 ? normalizeDimensionString(strValues[colMap.d2]) : '';
    const d3Str = colMap.d3 !== undefined && colMap.d3 >= 0 ? normalizeDimensionString(strValues[colMap.d3]) : '';
    const dLenStr = colMap.dLen !== undefined && colMap.dLen >= 0 ? normalizeDimensionString(strValues[colMap.dLen]) : '';
    const d4Str = colMap.d4 !== undefined && colMap.d4 >= 0 ? normalizeDimensionString(strValues[colMap.d4]) : '';
    const qtyNum = colMap.qty !== undefined && colMap.qty >= 0 ? parseFlexibleNumber(strValues[colMap.qty], 'quantity') : 1;
    const unitStr = colMap.unit !== undefined && colMap.unit >= 0 ? strValues[colMap.unit] || '' : '';
    const weightNum = colMap.weight !== undefined && colMap.weight >= 0 ? parseFlexibleNumber(strValues[colMap.weight], 'general') : 0;
    const unitPriceNum = colMap.unitPrice !== undefined && colMap.unitPrice >= 0 ? parseFlexibleNumber(strValues[colMap.unitPrice], 'currency') : 0;
    const totalPriceNum = colMap.totalPrice !== undefined && colMap.totalPrice >= 0 ? parseFlexibleNumber(strValues[colMap.totalPrice], 'currency') : 0;
    const remarkStr = colMap.remark !== undefined && colMap.remark >= 0 ? strValues[colMap.remark] || '' : '';

    const bannerCheck = isCategoryBannerRow(row, categories);

    if (!bannerCheck.isBanner && !itemNoStr && !descStr && !typeStr && !d1Str) continue;

    rawRows.push({
      rowNumber: r + 1,
      sheetName: 'Custom Re-Mapped',
      itemNo: itemNoStr,
      categoryText: bannerCheck.matchedCategory ? bannerCheck.matchedCategory.name : '',
      description: descStr || (bannerCheck.matchedCategory ? bannerCheck.matchedCategory.name : ''),
      notes: notesStr,
      remark: remarkStr,
      type: typeStr,
      d1: d1Str,
      d2: d2Str,
      d3: d3Str,
      dLen: dLenStr,
      d4: d4Str,
      qty: qtyNum > 0 ? qtyNum : 1,
      unit: unitStr,
      weight: weightNum,
      unitPrice: unitPriceNum,
      totalPrice: totalPriceNum,
      isExplicitCategoryBanner: bannerCheck.isBanner,
    });
  }

  return rawRows;
}

/**
 * Reprocesses raw rows through the hierarchy generator and validation pipeline.
 * Used for instant preview updating when user skips invalid rows or applies auto-fix.
 */
export function reprocessRawRows(
  rows: RawExtractedRow[],
  categories: WorkCategory[],
  extraMetadata?: {
    vesselSpec?: Partial<VesselSpec>;
    projectSchedule?: Partial<ProjectSchedule>;
    vesselPhotoUrl?: string;
  }
): ParseResult {
  const validation = validateImportRows(rows, categories);
  const warnings: string[] = [];
  if (!validation.isValid) {
    if (validation.emptyDescriptionCount > 0) {
      warnings.push(`Terdeteksi ${validation.emptyDescriptionCount} baris dengan deskripsi/uraian pekerjaan kosong.`);
    }
    if (validation.invalidItemNoCount > 0) {
      warnings.push(`Terdeteksi ${validation.invalidItemNoCount} baris dengan format nomor urut tidak valid.`);
    }
  }

  const { items, categoriesFound, warnings: procWarnings } = processExtractedRows(rows, categories, validation);
  warnings.push(...procWarnings);
  const totalWeightKg = items.reduce((acc, i) => acc + (i.weightKg || 0), 0);
  const totalCost = items.reduce((acc, i) => acc + (i.totalPrice || 0), 0);
  const areaCount = items.filter((i) => i.isAreaHeader || i.itemLevel === 1).length;

  return {
    success: items.length > 0,
    importedItems: items,
    rawRows: rows,
    validation,
    vesselSpec: extraMetadata?.vesselSpec,
    projectSchedule: extraMetadata?.projectSchedule,
    vesselPhotoUrl: extraMetadata?.vesselPhotoUrl,
    warnings,
    errors: items.length > 0 ? [] : ['Tidak ada baris pekerjaan valid yang ditemukan.'],
    summary: {
      totalItems: items.length,
      categoriesFound: Array.from(categoriesFound),
      areaHeadersCount: areaCount,
      totalWeightKg,
      totalCost,
    },
  };
}

// ---------------------------------------------------------------------------
// Main File Parser: Supports .xlsx, .xls, .csv, .json, .txt
// ---------------------------------------------------------------------------

export function extractVesselSpecAndScheduleFromWorkbook(workbook: ExcelJS.Workbook): {
  vesselSpec?: Partial<VesselSpec>;
  projectSchedule?: Partial<ProjectSchedule>;
  vesselPhotoUrl?: string;
} {
  const extractedVessel: Partial<VesselSpec> = {};
  const extractedSchedule: Partial<ProjectSchedule> = {};
  let extractedPhotoUrl: string | undefined = undefined;

  try {
    // 1. Extract Photo if present in workbook worksheets or media
    for (const ws of workbook.worksheets) {
      const images = (ws as any).getImages?.() || [];
      if (images && images.length > 0) {
        for (const img of images) {
          try {
            const imgId = Number(img.imageId);
            const imgData = workbook.getImage(imgId);
            if (imgData && imgData.buffer) {
              const bytes = new Uint8Array(imgData.buffer);
              let binary = '';
              const chunkSize = 8192;
              for (let i = 0; i < bytes.length; i += chunkSize) {
                const chunk = bytes.subarray(i, i + chunkSize);
                binary += String.fromCharCode.apply(null, chunk as any);
              }
              const base64 = btoa(binary);
              const ext = (imgData.extension || 'jpeg').toLowerCase();
              const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
              extractedPhotoUrl = `data:${mime};base64,${base64}`;
              break;
            }
          } catch (e) {
            console.warn('Image extraction warning:', e);
          }
        }
      }
      if (extractedPhotoUrl) break;
    }

    if (!extractedPhotoUrl) {
      const media = (workbook as any).model?.media || [];
      if (Array.isArray(media) && media.length > 0) {
        for (const m of media) {
          if (m && m.buffer) {
            const bytes = new Uint8Array(m.buffer);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.subarray(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, chunk as any);
            }
            const base64 = btoa(binary);
            const ext = (m.extension || 'jpeg').toLowerCase();
            const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
            extractedPhotoUrl = `data:${mime};base64,${base64}`;
            break;
          }
        }
      }
    }

    // 2. Scan cells in top 35 rows for vessel and schedule metadata
    for (const ws of workbook.worksheets) {
      ws.eachRow((row, rowNumber) => {
        if (rowNumber > 35) return;
        const values = (row.values as any[]) || [];
        for (let c = 1; c < values.length; c++) {
          const rawKey = extractCellString(values[c]).toLowerCase().replace(/[:=_\-\s]+/g, ' ').trim();
          if (!rawKey) continue;

          const rawVal = extractCellString(values[c + 1] || values[c + 2] || '');
          if (!rawVal || rawVal === '-') continue;

          // Vessel Name
          if ((rawKey.includes('nama kapal') || rawKey.includes('vessel name') || rawKey === 'kapal') && !extractedVessel.name) {
            extractedVessel.name = rawVal;
          }
          // Dimension
          else if ((rawKey.includes('dimensi') || rawKey.includes('ukuran utama') || rawKey.includes('dimension')) && !extractedVessel.dimension) {
            extractedVessel.dimension = rawVal;
          }
          // Vessel Type
          else if ((rawKey.includes('tipe kapal') || rawKey.includes('jenis kapal') || rawKey.includes('vessel type')) && !extractedVessel.vesselType) {
            extractedVessel.vesselType = rawVal;
          }
          // Docking Method
          else if ((rawKey.includes('metode docking') || rawKey.includes('jenis docking') || rawKey.includes('docking type') || rawKey.includes('tipe docking')) && !extractedVessel.dockingType) {
            extractedVessel.dockingType = rawVal;
          }
          // Owner
          else if ((rawKey.includes('pemilik') || rawKey.includes('owner') || rawKey.includes('customer')) && !extractedVessel.companyOwner) {
            extractedVessel.companyOwner = rawVal;
          }
          // Project No
          else if ((rawKey.includes('registrasi proyek') || rawKey.includes('no proyek') || rawKey.includes('no. proyek') || rawKey.includes('project no')) && !extractedVessel.projectNo) {
            extractedVessel.projectNo = rawVal;
          }
          // Classification
          else if ((rawKey.includes('klasifikasi') || rawKey.includes('classification') || rawKey === 'kelas' || rawKey === 'class') && !extractedVessel.classification) {
            extractedVessel.classification = rawVal;
          }
          // Kind of Survey
          else if ((rawKey.includes('jenis survey') || rawKey.includes('kind of survey') || rawKey.includes('survey')) && !extractedVessel.kindOfSurvey) {
            extractedVessel.kindOfSurvey = rawVal;
          }
          // Schedule fields
          else if ((rawKey.includes('arrive') || rawKey.includes('tiba')) && !extractedSchedule.arriveBgn) {
            extractedSchedule.arriveBgn = rawVal;
          }
          else if ((rawKey.includes('start contract') || rawKey.includes('mulai kontrak')) && !extractedSchedule.startContract) {
            extractedSchedule.startContract = rawVal;
          }
          else if (rawKey.includes('arrival meeting') && !extractedSchedule.arrivalMeeting) {
            extractedSchedule.arrivalMeeting = rawVal;
          }
          else if ((rawKey.includes('docking date') || rawKey.includes('naik dok') || rawKey.includes('tgl docking')) && !extractedSchedule.dockingDate) {
            extractedSchedule.dockingDate = rawVal;
          }
          else if ((rawKey.includes('undocking date') || rawKey.includes('turun dok') || rawKey.includes('tgl undocking')) && !extractedSchedule.undockingDate) {
            extractedSchedule.undockingDate = rawVal;
          }
          else if ((rawKey.includes('finish work') || rawKey.includes('selesai')) && !extractedSchedule.finishWork) {
            extractedSchedule.finishWork = rawVal;
          }
          else if ((rawKey.includes('sail out') || rawKey.includes('berlayar')) && !extractedSchedule.sailOut) {
            extractedSchedule.sailOut = rawVal;
          }
          else if ((rawKey.includes('posisi dock') || rawKey.includes('lokasi dock') || rawKey.includes('docking position')) && !extractedSchedule.dockingPosition) {
            extractedSchedule.dockingPosition = rawVal;
          }
        }
      });
    }
  } catch (err) {
    console.warn('Error extracting vessel metadata:', err);
  }

  return {
    vesselSpec: Object.keys(extractedVessel).length > 0 ? extractedVessel : undefined,
    projectSchedule: Object.keys(extractedSchedule).length > 0 ? extractedSchedule : undefined,
    vesselPhotoUrl: extractedPhotoUrl,
  };
}

/**
 * Extracts vessel specifications and project schedule from top rows of any text matrix (CSV, TXT, or pasted text)
 */
export function extractVesselSpecAndScheduleFromTextMatrix(matrix: string[][]): {
  vesselSpec?: Partial<VesselSpec>;
  projectSchedule?: Partial<ProjectSchedule>;
} {
  const extractedVessel: Partial<VesselSpec> = {};
  const extractedSchedule: Partial<ProjectSchedule> = {};

  try {
    const scanLimit = Math.min(35, matrix.length);
    for (let r = 0; r < scanLimit; r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      for (let c = 0; c < row.length; c++) {
        const rawCell = extractCellString(row[c]);
        if (!rawCell) continue;

        const rawKey = rawCell.toLowerCase().replace(/[:=_\-\s]+/g, ' ').trim();
        if (!rawKey) continue;

        let rawVal = extractCellString(row[c + 1] || row[c + 2] || row[c + 3] || '');
        if (!rawVal || rawVal === '-') continue;

        // Vessel Name
        if ((rawKey.includes('vessel name') || rawKey.includes('nama kapal') || rawKey === 'kapal') && !extractedVessel.name) {
          extractedVessel.name = rawVal;
        }
        // Dimension
        else if ((rawKey.includes('vessel dimension') || rawKey.includes('dimensi kapal') || rawKey.includes('ukuran utama')) && !extractedVessel.dimension) {
          extractedVessel.dimension = rawVal;
        }
        // Vessel Type
        else if ((rawKey.includes('vessel type') || rawKey.includes('tipe kapal') || rawKey.includes('jenis kapal')) && !extractedVessel.vesselType) {
          extractedVessel.vesselType = rawVal;
        }
        // Docking Type
        else if ((rawKey.includes('docking type') || rawKey.includes('jenis docking') || rawKey.includes('metode docking')) && !extractedVessel.dockingType) {
          extractedVessel.dockingType = rawVal;
        }
        // Owner
        else if ((rawKey.includes('company owner') || rawKey.includes('pemilik') || rawKey.includes('owner')) && !extractedVessel.companyOwner) {
          extractedVessel.companyOwner = rawVal;
        }
        // Project No
        else if ((rawKey.includes('project no') || rawKey.includes('no proyek') || rawKey.includes('registrasi proyek')) && !extractedVessel.projectNo) {
          extractedVessel.projectNo = rawVal;
        }
        // Classification
        else if ((rawKey.includes('classification') || rawKey.includes('klasifikasi') || rawKey === 'class') && !extractedVessel.classification) {
          extractedVessel.classification = rawVal;
        }
        // Kind of Survey
        else if ((rawKey.includes('kind of survey') || rawKey.includes('jenis survey') || rawKey.includes('survey')) && !extractedVessel.kindOfSurvey) {
          extractedVessel.kindOfSurvey = rawVal;
        }
        // Arrive
        else if ((rawKey.includes('arrive') || rawKey.includes('tiba')) && !extractedSchedule.arriveBgn) {
          extractedSchedule.arriveBgn = rawVal;
        }
        // Start Contract
        else if ((rawKey.includes('start contract') || rawKey.includes('mulai kontrak')) && !extractedSchedule.startContract) {
          extractedSchedule.startContract = rawVal;
        }
        // Arrival Meeting
        else if (rawKey.includes('arrival meeting') && !extractedSchedule.arrivalMeeting) {
          extractedSchedule.arrivalMeeting = rawVal;
        }
        // Docking Date
        else if ((rawKey.includes('docking') && !rawKey.includes('type') && !rawKey.includes('undocking') && !rawKey.includes('position')) && !extractedSchedule.dockingDate) {
          extractedSchedule.dockingDate = rawVal;
        }
        // Undocking Date
        else if (rawKey.includes('undocking') && !extractedSchedule.undockingDate) {
          extractedSchedule.undockingDate = rawVal;
        }
        // Finish Work
        else if ((rawKey.includes('finish work') || rawKey.includes('selesai')) && !extractedSchedule.finishWork) {
          extractedSchedule.finishWork = rawVal;
        }
        // Sail Out
        else if ((rawKey.includes('sail out') || rawKey.includes('berlayar')) && !extractedSchedule.sailOut) {
          extractedSchedule.sailOut = rawVal;
        }
        // Position
        else if ((rawKey.includes('position') || rawKey.includes('posisi')) && !extractedSchedule.dockingPosition) {
          extractedSchedule.dockingPosition = rawVal;
        }
      }
    }
  } catch (e) {
    console.warn('Error extracting vessel metadata from text matrix:', e);
  }

  return {
    vesselSpec: Object.keys(extractedVessel).length > 0 ? extractedVessel : undefined,
    projectSchedule: Object.keys(extractedSchedule).length > 0 ? extractedSchedule : undefined,
  };
}

function isMaterialTypeCode(code: string): boolean {
  if (!code) return false;
  const s = code.trim().toUpperCase();
  const known = new Set([
    'PL', 'PL NC', 'PL AB', 'EA', 'UA', 'L', 'HB', 'FB',
    'PP', 'PP-B', 'RB', 'RB MM', 'RB IN', 'RB MS', 'SB',
    'SL', 'ME', 'EL', 'PA', 'RE', 'PI', 'TK', 'OU', 'IN', 'ST', 'OT'
  ]);
  return known.has(s) || /^(PL|EA|UA|HB|FB|PP|RB|SB|SL)\b/i.test(s);
}

function isRecognizedUnit(str: string): boolean {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  const known = new Set([
    'kg', 'ton', 'lbr', 'btg', 'pcs', 'pc', 'unit', 'set',
    'au', 'day', 'tank', 'spot', 'meter', 'm', 'm2', 'm3', 'ls',
    'lot', 'joint', 'panel', 'roll', 'klg', 'pail', 'drum', 'length',
    'ea', 'each', 'layer', 'hole'
  ]);
  return known.has(s);
}

/**
 * Specialized parser for Shipyard CSV matrices (handles semicolons, bullet points, Roman numerals, Qty inline units, etc.)
 */
export function parseShipyardCsvMatrix(
  csvRows: string[][],
  categories: WorkCategory[]
): RawExtractedRow[] {
  const rawRows: RawExtractedRow[] = [];

  for (let r = 0; r < csvRows.length; r++) {
    const row = csvRows[r];
    if (!row || row.length === 0) continue;

    const strValues = row.map((v) => extractCellString(v).trim());

    // Skip summary / signature / disclaimer / empty rows
    if (isSummaryOrBlankRow(strValues)) continue;

    // Check if category banner (e.g. ;I;Docking Undocking;;... or ;VII;Steel Work;;...)
    const bannerCheck = isCategoryBannerRow(strValues, categories);
    if (bannerCheck.isBanner) {
      rawRows.push({
        rowNumber: r + 1,
        sheetName: 'CSV Import',
        itemNo: strValues[1] || strValues[0] || '',
        categoryText: bannerCheck.matchedCategory ? bannerCheck.matchedCategory.id : strValues.filter(Boolean).join(' '),
        description: bannerCheck.matchedCategory ? `${bannerCheck.matchedCategory.code} - ${bannerCheck.matchedCategory.name}` : strValues.filter(Boolean).join(' '),
        notes: '',
        remark: '',
        type: '',
        d1: '',
        d2: '',
        d3: '',
        dLen: '',
        d4: '',
        qty: 1,
        unit: '',
        weight: 0,
        unitPrice: 0,
        totalPrice: 0,
        isExplicitCategoryBanner: true,
      });
      continue;
    }

    // Skip top header metadata rows (Vessel Name, Document Date, disclaimer text, column headers like No;WORK ITEMS)
    const joinedRow = strValues.join(' ').toLowerCase();
    if (
      joinedRow.includes('vessel name') ||
      joinedRow.includes('vessel dimension') ||
      joinedRow.includes('general spesification') ||
      joinedRow.includes('under mentioned works') ||
      joinedRow.includes('document date') ||
      joinedRow.includes('prepared by') ||
      joinedRow.includes('reviewed by') ||
      joinedRow.includes('approved by') ||
      joinedRow.includes('grand total tonnage') ||
      (joinedRow.includes('work items') && joinedRow.includes('remark'))
    ) {
      continue;
    }

    let itemNo = '';
    let description = '';
    let notes = '';
    let remark = '';
    let type = '';
    let d1 = '';
    let d2 = '';
    let d3 = '';
    let dLen = '';
    let d4 = '';
    let qty = 1;
    let unit = '';
    let weight = 0;
    let unitPrice = 0;
    let totalPrice = 0;

    let firstNonEmptyIdx = strValues.findIndex((c) => c !== '');
    if (firstNonEmptyIdx === -1) continue;

    // 1. Detect Item Number (e.g. "1", "1.1", "5.1", "a.", "b.", "3.1")
    const candidateNo = strValues[firstNonEmptyIdx];
    const isNumberPattern = /^(\d+(\.\d+)*|[a-z]\.|[A-Z]\.|[IVXLCDM]+)$/i.test(candidateNo);

    if (isNumberPattern && firstNonEmptyIdx <= 3) {
      itemNo = candidateNo;
      firstNonEmptyIdx++;
    }

    // 2. Find Description: skip bullet points like "-", "--", "*"
    while (
      firstNonEmptyIdx < strValues.length &&
      (strValues[firstNonEmptyIdx] === '-' ||
        strValues[firstNonEmptyIdx] === '--' ||
        strValues[firstNonEmptyIdx] === '*' ||
        strValues[firstNonEmptyIdx] === '')
    ) {
      firstNonEmptyIdx++;
    }

    if (firstNonEmptyIdx >= strValues.length) continue;

    description = strValues[firstNonEmptyIdx];

    // Check if next cells contain notes/sub-descriptions before type
    const typeIndex = strValues.findIndex((c, idx) => idx > firstNonEmptyIdx && isMaterialTypeCode(c));

    if (typeIndex !== -1) {
      const notesBetween = strValues.slice(firstNonEmptyIdx + 1, typeIndex).filter((c) => c && c !== '-').join(' - ');
      if (notesBetween) notes = notesBetween;

      type = strValues[typeIndex];
      d1 = normalizeDimensionString(strValues[typeIndex + 1]);
      d2 = normalizeDimensionString(strValues[typeIndex + 2]);
      d3 = normalizeDimensionString(strValues[typeIndex + 3]);
      dLen = normalizeDimensionString(strValues[typeIndex + 4]);

      const qtyRaw = strValues[typeIndex + 5] || '';
      const qtyMatch = qtyRaw.match(/^([\d.,]+)\s*(?:\(([^)]+)\))?$/);
      if (qtyMatch) {
        qty = parseFlexibleNumber(qtyMatch[1], 'quantity');
      } else {
        qty = parseFlexibleNumber(qtyRaw, 'quantity');
      }

      const volRaw = strValues[typeIndex + 6] || '';
      weight = parseFlexibleNumber(volRaw, 'general');

      unit = strValues[typeIndex + 7] || '';
      if (!unit && qtyMatch && qtyMatch[2]) {
        unit = qtyMatch[2];
      }

      remark = strValues.slice(typeIndex + 8).filter((c) => c && c !== '-').join(' ');
    } else {
      const cellsAfterDesc = strValues.slice(firstNonEmptyIdx + 1);

      let foundUnit = '';
      let foundVol = 0;
      const notesParts: string[] = [];

      cellsAfterDesc.forEach((cell) => {
        if (!cell || cell === '-') return;

        if (isRecognizedUnit(cell)) {
          foundUnit = cell;
        } else {
          const numVal = parseFlexibleNumber(cell, 'general');
          if (numVal > 0 && foundVol === 0) {
            foundVol = numVal;
          } else if (cell !== '0' && cell !== '0.00') {
            notesParts.push(cell);
          }
        }
      });

      if (foundUnit) unit = foundUnit;
      if (foundVol > 0) {
        if (unit.toLowerCase() === 'kg' || unit.toLowerCase() === 'ton') {
          weight = foundVol;
          qty = 1;
        } else {
          qty = foundVol;
        }
      }
      if (notesParts.length > 0) {
        notes = notesParts.join(' - ');
      }
    }

    if (!description) continue;

    rawRows.push({
      rowNumber: r + 1,
      sheetName: 'CSV Import',
      itemNo,
      categoryText: '',
      description,
      notes,
      remark,
      type,
      d1,
      d2,
      d3,
      dLen,
      d4,
      qty: qty > 0 ? qty : 1,
      unit: unit || 'kg',
      weight,
      unitPrice: 0,
      totalPrice: 0,
      isExplicitCategoryBanner: false,
    });
  }

  return rawRows;
}

export function generateTemplateCopyText(categories?: WorkCategory[], workItems?: WorkItem[]): string {
  const activeCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const items = workItems && workItems.length > 0 ? workItems : [];

  const headers = [
    'No',
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

  const rows: string[] = [headers.join('	')];

  if (items.length > 0) {
    items.forEach((item) => {
      const rowVals = [
        item.itemNo || '',
        item.description || '',
        item.notes || '',
        item.type || '',
        item.d1 || '',
        item.d2 || '',
        item.d3 || '',
        item.dLen || '',
        item.d4 || '',
        item.qty !== undefined && item.qty !== null ? String(item.qty) : '',
        item.unit || '',
        item.weightKg ? String(item.weightKg) : '',
        item.unitPrice ? String(item.unitPrice) : '',
        item.totalPrice ? String(item.totalPrice) : '',
        item.remark || '',
      ];
      rows.push(rowVals.join('	'));
    });
  } else {
    // Sample template rows from No to REMARK
    const sampleRows = [
      ['1', '[AREA] PEKERJAAN DOK & FASILITAS UMUM', 'Area Galangan', '', '', '', '', '', '', '', '', '', '', '', 'General'],
      ['1.1', '[SUB-SYSTEM] PENGEDOKAN KAPAL', 'Tarif Docking', '', '', '', '', '', '', '', '', '', '', '', 'Tarif Utama'],
      ['1.1.1', 'Pelayanan Docking & Undocking Kapal', 'Fasilitas Graving Dock', '', '', '', '', '', '', '1', 'ls', '', '35000000', '35000000', 'Sesuai Kontrak'],
      ['2', '[AREA] LAMBUNG & STRUKTUR BAJA (HULL REPAIR)', 'Area Lambung', '', '', '', '', '', '', '', '', '', '', '', 'Steelwork'],
      ['2.1', '[SUB-SYSTEM] BOTTOM PLATING FR. 20 - 35', 'Pelat Dasar', '', '', '', '', '', '', '', '', '', '', '', 'BKI Class'],
      ['2.1.1', 'Ganti Pelat Kulit Bottom Tebal 12mm BKI Grade A', 'Pelat BKI Grade A', 'PL', '6000', '1500', '12', '', '', '2', 'lbr', '1695.6', '28500', '48324600', 'Material Galangan'],
      ['2.1.2', 'Ganti Profil Siku Frame Bottom L 75x75x9mm', 'Besi Siku', 'EA', '6000', '75', '9', '', '', '4', 'btg', '242.8', '26000', '6312800', 'Material Galangan'],
      ['3', '[AREA] SISTEM PERPIPAAN KAMAR MESIN', 'Piping System', '', '', '', '', '', '', '', '', '', '', '', 'Machinery'],
      ['3.1', '[SUB-SYSTEM] PIPA SEAWATER COOLING 3" SCH 40', 'Pipa Pendingin', '', '', '', '', '', '', '', '', '', '', '', 'Cooling Line'],
      ['3.1.1', 'Fabrikasi & Pasang Pipa Galvanis 3" Sch 40', 'Pipa Seamless Galvanized', 'PP', '6000', '88.9', '5.49', '', '', '3', 'btg', '202.8', '32000', '6489600', 'Ready Stock'],
    ];
    sampleRows.forEach((r) => rows.push(r.join('\t')));
  }

  return rows.join('\n');
}

export async function parseImportFile(
  file: File,
  categories: WorkCategory[],
  existingWorkItems: WorkItem[] = []
): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();
  const fileExt = fileName.substring(fileName.lastIndexOf('.'));

  // 1. Handle JSON file import
  if (fileExt === '.json' || file.type === 'application/json') {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      let rawItemList: any[] = [];
      if (Array.isArray(parsed)) {
        rawItemList = parsed;
      } else if (parsed && Array.isArray(parsed.workItems)) {
        rawItemList = parsed.workItems;
      } else if (parsed && typeof parsed === 'object') {
        const potentialArray = Object.values(parsed).find((val) => Array.isArray(val));
        if (potentialArray) rawItemList = potentialArray as any[];
      }

      if (rawItemList.length === 0) {
        return {
          success: false,
          importedItems: [],
          warnings: [],
          errors: ['File JSON tidak berisi daftar pekerjaan (workItems) yang dapat diekstrak.'],
          summary: { totalItems: 0, categoriesFound: [], areaHeadersCount: 0, totalWeightKg: 0, totalCost: 0 },
        };
      }

      const rawRows: RawExtractedRow[] = rawItemList.map((it: any) => ({
        itemNo: String(it.itemNo || it.no || it.code || ''),
        categoryText: String(it.categoryId || it.category || it.categoryName || ''),
        description: String(it.description || it.uraian || it.name || ''),
        notes: String(it.progressNotes || it.remark || it.notes || ''),
        type: String(it.type || it.material || ''),
        d1: normalizeDimensionString(it.d1),
        d2: normalizeDimensionString(it.d2),
        d3: normalizeDimensionString(it.d3),
        dLen: normalizeDimensionString(it.dLen),
        d4: normalizeDimensionString(it.d4),
        qty: parseFlexibleNumber(it.qty, 'quantity'),
        unit: String(it.unit || 'kg'),
        weight: parseFlexibleNumber(it.weightKg || it.weight || it.tonase, 'general'),
        unitPrice: parseFlexibleNumber(it.unitPrice || it.hargaSatuan, 'currency'),
        totalPrice: parseFlexibleNumber(it.totalPrice || it.totalBiaya, 'currency'),
        progress: it.progressPercent !== undefined ? parseFlexibleNumber(it.progressPercent, 'general') : undefined,
      }));

      const validation = validateImportRows(rawRows, categories);
      const warnings: string[] = [];

      if (!validation.isValid) {
        if (validation.emptyDescriptionCount > 0) {
          warnings.push(`Terdeteksi ${validation.emptyDescriptionCount} baris dengan deskripsi/uraian pekerjaan kosong pada JSON.`);
        }
        if (validation.invalidItemNoCount > 0) {
          warnings.push(`Terdeteksi ${validation.invalidItemNoCount} baris dengan format nomor urut tidak valid pada JSON.`);
        }
      }

      const { items, categoriesFound, warnings: procWarnings } = processExtractedRows(rawRows, categories, validation);
      warnings.push(...procWarnings);
      const totalWeightKg = items.reduce((acc, i) => acc + (i.weightKg || 0), 0);
      const totalCost = items.reduce((acc, i) => acc + (i.totalPrice || 0), 0);
      const areaCount = items.filter((i) => i.isAreaHeader || i.itemLevel === 1).length;

      return {
        success: items.length > 0,
        importedItems: items,
        rawRows,
        validation,
        warnings,
        errors: items.length > 0 ? [] : ['Tidak ada item yang berhasil diekstrak dari JSON.'],
        summary: {
          totalItems: items.length,
          categoriesFound: Array.from(categoriesFound),
          areaHeadersCount: areaCount,
          totalWeightKg,
          totalCost,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        importedItems: [],
        warnings: [],
        errors: [`Gagal memproses file JSON: ${err?.message || 'Format JSON tidak valid'}`],
        summary: { totalItems: 0, categoriesFound: [], areaHeadersCount: 0, totalWeightKg: 0, totalCost: 0 },
      };
    }
  }

  // 2. Handle CSV / Plain Text import
  if (fileExt === '.csv' || fileExt === '.txt' || file.type === 'text/csv' || file.type === 'text/plain') {
    try {
      const text = await file.text();
      const csvRows = parseCsvText(text);

      if (csvRows.length < 2) {
        return {
          success: false,
          importedItems: [],
          warnings: [],
          errors: ['File CSV kosong atau tidak memiliki baris data yang cukup.'],
          summary: { totalItems: 0, categoriesFound: [], areaHeadersCount: 0, totalWeightKg: 0, totalCost: 0 },
        };
      }

      // 1. Extract Vessel Specifications & Schedule Metadata if present in CSV/TXT
      const { vesselSpec, projectSchedule } = extractVesselSpecAndScheduleFromTextMatrix(csvRows);

      // 2. Parse Raw Rows using Shipyard Matrix Parser
      let rawRows: RawExtractedRow[] = parseShipyardCsvMatrix(csvRows, categories);

      // Fallback if shipyard parser yields no rows: try column mapping detection
      if (rawRows.length === 0) {
        let headerRowIndex = 0;
        let colMap: DetectedColMap | null = null;
        let bestScore = 0;

        for (let i = 0; i < Math.min(csvRows.length, 25); i++) {
          const detected = detectColumnMapping(csvRows[i]);
          if (detected) {
            const score = Object.keys(detected).length;
            if (score > bestScore) {
              bestScore = score;
              headerRowIndex = i;
              colMap = detected;
            }
          }
        }

        if (!colMap || bestScore < 2) {
          colMap = {
            itemNo: 0,
            category: 1,
            description: 2,
            notes: 3,
            type: 4,
            d1: 5,
            d2: 6,
            d3: 7,
            dLen: 8,
            d4: 9,
            qty: 10,
            unit: 11,
            weight: 12,
            unitPrice: 13,
            totalPrice: 14,
          };
        }

        for (let i = headerRowIndex + 1; i < csvRows.length; i++) {
          const row = csvRows[i];
          if (!row || row.length === 0) continue;
          if (isSummaryOrBlankRow(row)) continue;

          const bannerCheck = isCategoryBannerRow(row, categories);
          const isCatBanner = bannerCheck.isBanner;

          const rawItemNo = row[colMap.itemNo] || '';
          const rawDesc = row[colMap.description] || '';
          if (!isCatBanner && !rawItemNo && !rawDesc) continue;

          const finalDesc =
            rawDesc ||
            (isCatBanner && bannerCheck.matchedCategory
              ? `${bannerCheck.matchedCategory.code} - ${bannerCheck.matchedCategory.name}`
              : row.filter(Boolean).join(' '));

          rawRows.push({
            itemNo: rawItemNo,
            categoryText:
              isCatBanner && bannerCheck.matchedCategory
                ? bannerCheck.matchedCategory.id
                : colMap.category !== undefined
                ? row[colMap.category] || ''
                : '',
            description: finalDesc,
            notes: colMap.notes !== undefined ? row[colMap.notes] || '' : '',
            remark: colMap.remark !== undefined ? row[colMap.remark] || '' : '',
            type: colMap.type !== undefined ? row[colMap.type] || '' : '',
            d1: colMap.d1 !== undefined ? normalizeDimensionString(row[colMap.d1]) : '',
            d2: colMap.d2 !== undefined ? normalizeDimensionString(row[colMap.d2]) : '',
            d3: colMap.d3 !== undefined ? normalizeDimensionString(row[colMap.d3]) : '',
            dLen: colMap.dLen !== undefined ? normalizeDimensionString(row[colMap.dLen]) : '',
            d4: colMap.d4 !== undefined ? normalizeDimensionString(row[colMap.d4]) : '',
            qty: colMap.qty !== undefined ? parseFlexibleNumber(row[colMap.qty], 'quantity') : 1,
            unit: colMap.unit !== undefined ? row[colMap.unit] || 'kg' : 'kg',
            weight: colMap.weight !== undefined ? parseFlexibleNumber(row[colMap.weight], 'general') : 0,
            unitPrice: colMap.unitPrice !== undefined ? parseFlexibleNumber(row[colMap.unitPrice], 'currency') : 0,
            totalPrice: colMap.totalPrice !== undefined ? parseFlexibleNumber(row[colMap.totalPrice], 'currency') : 0,
            progress: colMap.progress !== undefined ? parseFlexibleNumber(row[colMap.progress], 'general') : undefined,
            isExplicitCategoryBanner: isCatBanner,
          });
        }
      }

      const validation = validateImportRows(rawRows, categories);
      const warnings: string[] = [];

      if (!validation.isValid) {
        if (validation.emptyDescriptionCount > 0) {
          warnings.push(`Terdeteksi ${validation.emptyDescriptionCount} baris dengan deskripsi/uraian pekerjaan kosong pada CSV.`);
        }
        if (validation.invalidItemNoCount > 0) {
          warnings.push(`Terdeteksi ${validation.invalidItemNoCount} baris dengan format nomor urut tidak valid pada CSV.`);
        }
      }

      const { items, categoriesFound, warnings: procWarnings } = processExtractedRows(rawRows, categories, validation);
      warnings.push(...procWarnings);
      const totalWeightKg = items.reduce((acc, i) => acc + (i.weightKg || 0), 0);
      const totalCost = items.reduce((acc, i) => acc + (i.totalPrice || 0), 0);
      const areaCount = items.filter((i) => i.isAreaHeader || i.itemLevel === 1).length;

      return {
        success: items.length > 0,
        importedItems: items,
        rawRows,
        rawMatrix: csvRows,
        validation,
        vesselSpec,
        projectSchedule,
        warnings,
        errors: items.length > 0 ? [] : ['Tidak ada item yang berhasil diekstrak dari CSV.'],
        summary: {
          totalItems: items.length,
          categoriesFound: Array.from(categoriesFound),
          areaHeadersCount: areaCount,
          totalWeightKg,
          totalCost,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        importedItems: [],
        warnings: [],
        errors: [`Gagal membaca file CSV: ${err?.message || 'Format tidak valid'}`],
        summary: { totalItems: 0, categoriesFound: [], areaHeadersCount: 0, totalWeightKg: 0, totalCost: 0 },
      };
    }
  }

  // 3. Handle Excel (.xlsx, .xls) import with Multi-Sheet scanning
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    if (!workbook.worksheets || workbook.worksheets.length === 0) {
      return {
        success: false,
        importedItems: [],
        warnings: [],
        errors: ['File Excel tidak memiliki lembar kerja (worksheet) yang valid.'],
        summary: { totalItems: 0, categoriesFound: [], areaHeadersCount: 0, totalWeightKg: 0, totalCost: 0 },
      };
    }

    const rawRows: RawExtractedRow[] = [];

    // Filter worksheets that contain repair list work items
    const candidateSheets = workbook.worksheets.filter((ws) => {
      const name = ws.name.toLowerCase();
      // Exclude calculation/catalog reference sheets if they don't have work items
      if (name.includes('katalog') || name.includes('catalog') || name.includes('petunjuk') || name.includes('instruksi')) {
        return false;
      }
      return true;
    });

    const sheetsToProcess = candidateSheets.length > 0 ? candidateSheets : workbook.worksheets;

    sheetsToProcess.forEach((worksheet) => {
      let headerRowIndex = -1;
      let colMap: DetectedColMap | null = null;
      let bestScore = 0;

      // Scan rows 1 to 35 for the header row with the highest score
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 35) return;
        const values = (row.values as any[]) || [];
        const strValues = values.map((v) => extractCellString(v));
        const detected = detectColumnMapping(strValues);
        if (detected) {
          const score = Object.keys(detected).length;
          if (score > bestScore) {
            bestScore = score;
            headerRowIndex = rowNumber;
            colMap = detected;
          }
        }
      });

      if (!colMap || bestScore < 2) {
        // Fallback default mapping for standard repair list layout
        colMap = {
          itemNo: 1,
          category: 2,
          description: 3,
          notes: 4,
          type: 5,
          d1: 6,
          d2: 7,
          d3: 8,
          dLen: 9,
          d4: 10,
          qty: 11,
          unit: 12,
          weight: 13,
          unitPrice: 14,
          totalPrice: 15,
        };
        headerRowIndex = 4; // default header row in template
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowIndex) return;
        const values = (row.values as any[]) || [];
        if (!values || values.length <= 1) return;

        const strValues = values.map((v) => extractCellString(v));

        // Skip summary, subtotal, and empty rows
        if (isSummaryOrBlankRow(strValues)) return;

        // Check if banner row
        const bannerCheck = isCategoryBannerRow(strValues, categories);
        const isCatBanner = bannerCheck.isBanner;

        const rawItemNo = extractCellString(values[colMap!.itemNo]);
        const rawDesc = extractCellString(values[colMap!.description]);

        if (!isCatBanner && !rawItemNo && !rawDesc) return;

        const finalDesc =
          rawDesc ||
          (isCatBanner
            ? bannerCheck.matchedCategory
              ? `${bannerCheck.matchedCategory.code} - ${bannerCheck.matchedCategory.name}`
              : strValues.filter(Boolean).join(' ')
            : '');

        const hasAnyCellData = Boolean(
          rawItemNo ||
          finalDesc ||
          extractCellString(values[colMap!.type]) ||
          extractCellString(values[colMap!.notes]) ||
          extractCellString(values[colMap!.remark]) ||
          extractCellString(values[colMap!.d1]) ||
          extractCellString(values[colMap!.dLen])
        );

        if (!hasAnyCellData) return;

        rawRows.push({
          rowNumber,
          sheetName: worksheet.name,
          itemNo: rawItemNo,
          categoryText:
            isCatBanner && bannerCheck.matchedCategory
              ? bannerCheck.matchedCategory.id
              : colMap!.category
              ? extractCellString(values[colMap!.category])
              : worksheet.name,
          description: finalDesc,
          notes: colMap!.notes ? extractCellString(values[colMap!.notes]) : '',
          remark: colMap!.remark ? extractCellString(values[colMap!.remark]) : '',
          type: colMap!.type ? extractCellString(values[colMap!.type]) : '',
          d1: colMap!.d1 ? normalizeDimensionString(values[colMap!.d1]) : '',
          d2: colMap!.d2 ? normalizeDimensionString(values[colMap!.d2]) : '',
          d3: colMap!.d3 ? normalizeDimensionString(values[colMap!.d3]) : '',
          dLen: colMap!.dLen ? normalizeDimensionString(values[colMap!.dLen]) : '',
          d4: colMap!.d4 ? normalizeDimensionString(values[colMap!.d4]) : '',
          qty: colMap!.qty ? parseFlexibleNumber(values[colMap!.qty], 'quantity') : 1,
          unit: colMap!.unit ? extractCellString(values[colMap!.unit]) || 'kg' : 'kg',
          weight: colMap!.weight ? parseFlexibleNumber(values[colMap!.weight], 'general') : 0,
          unitPrice: colMap!.unitPrice ? parseFlexibleNumber(values[colMap!.unitPrice], 'currency') : 0,
          totalPrice: colMap!.totalPrice ? parseFlexibleNumber(values[colMap!.totalPrice], 'currency') : 0,
          progress: colMap!.progress ? parseFlexibleNumber(values[colMap!.progress], 'general') : undefined,
          isExplicitCategoryBanner: isCatBanner,
        });
      });
    });

    if (rawRows.length === 0) {
      return {
        success: false,
        importedItems: [],
        warnings: [],
        errors: ['Tidak ada data baris pekerjaan yang berhasil diekstrak dari file Excel ini.'],
        validation: createEmptyValidationSummary(),
        rawRows: [],
        summary: { totalItems: 0, categoriesFound: [], areaHeadersCount: 0, totalWeightKg: 0, totalCost: 0 },
      };
    }

    // 1. Run Pre-Import Validation on all extracted raw rows
    const validation = validateImportRows(rawRows, categories);
    const warnings: string[] = [];

    if (!validation.isValid) {
      if (validation.emptyDescriptionCount > 0) {
        warnings.push(`Terdeteksi ${validation.emptyDescriptionCount} baris dengan deskripsi/uraian pekerjaan kosong.`);
      }
      if (validation.invalidItemNoCount > 0) {
        warnings.push(`Terdeteksi ${validation.invalidItemNoCount} baris dengan format nomor urut tidak valid.`);
      }
    }

    // 2. Process extracted rows with validation flags
    const { items, categoriesFound, warnings: procWarnings } = processExtractedRows(rawRows, categories, validation);
    warnings.push(...procWarnings);

    const totalWeightKg = items.reduce((acc, i) => acc + (i.weightKg || 0), 0);
    const totalCost = items.reduce((acc, i) => acc + (i.totalPrice || 0), 0);
    const areaCount = items.filter((i) => i.isAreaHeader || i.itemLevel === 1).length;

    const { vesselSpec, projectSchedule, vesselPhotoUrl } = extractVesselSpecAndScheduleFromWorkbook(workbook);

    return {
      success: items.length > 0,
      importedItems: items,
      rawRows,
      validation,
      vesselSpec,
      projectSchedule,
      vesselPhotoUrl,
      warnings,
      errors: items.length > 0 ? [] : ['Tidak ada baris pekerjaan valid yang ditemukan.'],
      summary: {
        totalItems: items.length,
        categoriesFound: Array.from(categoriesFound),
        areaHeadersCount: areaCount,
        totalWeightKg,
        totalCost,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      importedItems: [],
      warnings: [],
      errors: [`Gagal memproses file Excel: ${err?.message || 'Format file tidak didukung.'}`],
      validation: createEmptyValidationSummary(),
      rawRows: [],
      summary: { totalItems: 0, categoriesFound: [], areaHeadersCount: 0, totalWeightKg: 0, totalCost: 0 },
    };
  }
}

// Backward-compatible alias
export const parseExcelFile = parseImportFile;

/**
 * Parses raw text pasted from clipboard (e.g. copied from Excel table No. s/d REMARK)
 */
export function parseClipboardTableText(
  rawText: string,
  categories: WorkCategory[]
): ParseResult {
  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      importedItems: [],
      warnings: [],
      errors: ['Teks clipboard kosong. Silakan salin tabel dari Excel atau spreadsheet terlebih dahulu.'],
      summary: { totalItems: 0, categoriesFound: [], areaHeadersCount: 0, totalWeightKg: 0, totalCost: 0 },
    };
  }

  try {
    const rawRowsMatrix = parseCsvText(rawText);
    if (rawRowsMatrix.length === 0) {
      return {
        success: false,
        importedItems: [],
        warnings: [],
        errors: ['Tidak ada baris data yang dapat dibaca dari teks yang ditempel.'],
        summary: { totalItems: 0, categoriesFound: [], areaHeadersCount: 0, totalWeightKg: 0, totalCost: 0 },
      };
    }

    // 1. Extract Vessel Specifications & Schedule Metadata if present in text
    const { vesselSpec, projectSchedule } = extractVesselSpecAndScheduleFromTextMatrix(rawRowsMatrix);

    // 2. First attempt Shipyard CSV Matrix Parser
    let rawRows: RawExtractedRow[] = parseShipyardCsvMatrix(rawRowsMatrix, categories);

    // Fallback to column mapping if shipyard matrix parser yields no rows
    if (rawRows.length === 0) {
      let headerRowIdx = -1;
      let colMap: DetectedColMap | null = null;

      for (let r = 0; r < Math.min(6, rawRowsMatrix.length); r++) {
        const rowStrings = rawRowsMatrix[r].map((c) => extractCellString(c));
        const detected = detectColumnMapping(rowStrings);
        if (detected) {
          headerRowIdx = r;
          colMap = detected;
          break;
        }
      }

      if (!colMap) {
        const firstRow = rawRowsMatrix[0] || [];
        const colCount = firstRow.length;

        if (colCount >= 15) {
          colMap = {
            itemNo: 0,
            description: 1,
            notes: 2,
            type: 3,
            d1: 4,
            d2: 5,
            d3: 6,
            dLen: 7,
            d4: 8,
            qty: 9,
            unit: 10,
            weight: 11,
            unitPrice: 12,
            totalPrice: 13,
            remark: 14,
          };
        } else if (colCount === 14) {
          colMap = {
            itemNo: 0,
            description: 1,
            notes: 2,
            type: 3,
            d1: 4,
            d2: 5,
            d3: 6,
            dLen: 7,
            d4: 8,
            qty: 9,
            unit: 10,
            unitPrice: 11,
            totalPrice: 12,
            remark: 13,
          };
        } else if (colCount === 13) {
          colMap = {
            itemNo: 0,
            description: 1,
            notes: 2,
            type: 3,
            d1: 4,
            d2: 5,
            d3: 6,
            dLen: 7,
            d4: 8,
            qty: 9,
            unit: 10,
            weight: 11,
            remark: 12,
          };
        } else if (colCount === 11) {
          colMap = {
            itemNo: 0,
            description: 1,
            notes: 2,
            type: 3,
            d1: 4,
            d2: 5,
            d3: 6,
            dLen: 7,
            qty: 8,
            unit: 9,
            remark: 10,
          };
        } else if (colCount === 10) {
          colMap = {
            itemNo: 0,
            description: 1,
            type: 2,
            d1: 3,
            d2: 4,
            d3: 5,
            dLen: 6,
            qty: 7,
            unit: 8,
            remark: 9,
          };
        } else {
          colMap = {
            itemNo: 0,
            description: 1,
            notes: 2,
            type: 3,
            d1: 4,
            d2: 5,
            d3: 6,
            dLen: 7,
            d4: 8,
            qty: 9,
            unit: 10,
            remark: 11,
          };
        }
        headerRowIdx = -1;
      }

      const startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;

      for (let r = startIdx; r < rawRowsMatrix.length; r++) {
        const row = rawRowsMatrix[r];
        if (!row || row.length === 0) continue;

        const itemNoStr = colMap.itemNo !== undefined ? extractCellString(row[colMap.itemNo]) : '';
        const descStr = colMap.description !== undefined ? extractCellString(row[colMap.description]) : '';

        const typeStr = colMap.type !== undefined ? extractCellString(row[colMap.type]) : '';
        const notesStr = colMap.notes !== undefined ? extractCellString(row[colMap.notes]) : '';
        const remarkStr = colMap.remark !== undefined ? extractCellString(row[colMap.remark]) : '';
        const d1Str = colMap.d1 !== undefined ? normalizeDimensionString(row[colMap.d1]) : '';
        const d2Str = colMap.d2 !== undefined ? normalizeDimensionString(row[colMap.d2]) : '';
        const d3Str = colMap.d3 !== undefined ? normalizeDimensionString(row[colMap.d3]) : '';
        const dLenStr = colMap.dLen !== undefined ? normalizeDimensionString(row[colMap.dLen]) : '';
        const d4Str = colMap.d4 !== undefined ? normalizeDimensionString(row[colMap.d4]) : '';
        const qtyNum = colMap.qty !== undefined ? parseFlexibleNumber(row[colMap.qty], 'quantity') : 1;
        const unitStr = colMap.unit !== undefined ? extractCellString(row[colMap.unit]) : '';
        const weightNum = colMap.weight !== undefined ? parseFlexibleNumber(row[colMap.weight], 'general') : 0;
        const unitPriceNum = colMap.unitPrice !== undefined ? parseFlexibleNumber(row[colMap.unitPrice], 'currency') : 0;
        const totalPriceNum = colMap.totalPrice !== undefined ? parseFlexibleNumber(row[colMap.totalPrice], 'currency') : 0;
        const progressNum = colMap.progress !== undefined ? parseFlexibleNumber(row[colMap.progress], 'general') : undefined;

        const hasAnyData = Boolean(
          itemNoStr ||
          descStr ||
          typeStr ||
          notesStr ||
          remarkStr ||
          d1Str ||
          dLenStr
        );

        if (!hasAnyData) continue;

        const bannerCheck = isCategoryBannerRow(row, categories);

        rawRows.push({
          rowNumber: r + 1,
          sheetName: 'Clipboard Paste',
          itemNo: itemNoStr,
          categoryText: bannerCheck.matchedCategory ? bannerCheck.matchedCategory.name : '',
          description: descStr,
          notes: notesStr,
          remark: remarkStr,
          type: typeStr,
          d1: d1Str,
          d2: d2Str,
          d3: d3Str,
          dLen: dLenStr,
          d4: d4Str,
          qty: qtyNum,
          unit: unitStr,
          weight: weightNum,
          unitPrice: unitPriceNum,
          totalPrice: totalPriceNum,
          progress: progressNum,
          isExplicitCategoryBanner: bannerCheck.isBanner,
        });
      }
    }

    if (rawRows.length === 0) {
      return {
        success: false,
        importedItems: [],
        warnings: [],
        errors: ['Tidak ada data baris pekerjaan yang valid dalam teks clipboard.'],
        validation: createEmptyValidationSummary(),
        rawRows: [],
        summary: { totalItems: 0, categoriesFound: [], areaHeadersCount: 0, totalWeightKg: 0, totalCost: 0 },
      };
    }

    // 1. Run Pre-Import Validation on pasted raw rows
    const validation = validateImportRows(rawRows, categories);
    const warnings: string[] = [];

    if (!validation.isValid) {
      if (validation.emptyDescriptionCount > 0) {
        warnings.push(`Terdeteksi ${validation.emptyDescriptionCount} baris dengan deskripsi kosong dari data paste.`);
      }
      if (validation.invalidItemNoCount > 0) {
        warnings.push(`Terdeteksi ${validation.invalidItemNoCount} baris dengan format nomor urut tidak valid.`);
      }
    }

    // 2. Process extracted rows with validation flags
    const { items, categoriesFound, warnings: procWarnings } = processExtractedRows(rawRows, categories, validation);
    warnings.push(...procWarnings);

    const totalWeightKg = items.reduce((acc, i) => acc + (i.weightKg || 0), 0);
    const totalCost = items.reduce((acc, i) => acc + (i.totalPrice || 0), 0);
    const areaCount = items.filter((i) => i.isAreaHeader || i.itemLevel === 1).length;

    return {
      success: items.length > 0,
      importedItems: items,
      rawRows,
      rawMatrix: rawRowsMatrix,
      validation,
      vesselSpec,
      projectSchedule,
      warnings,
      errors: items.length > 0 ? [] : ['Tidak ada baris pekerjaan valid yang ditemukan.'],
      summary: {
        totalItems: items.length,
        categoriesFound: Array.from(categoriesFound),
        areaHeadersCount: areaCount,
        totalWeightKg,
        totalCost,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      importedItems: [],
      warnings: [],
      errors: [`Gagal memproses data paste: ${err?.message || 'Format tidak dikenali'}`],
      validation: createEmptyValidationSummary(),
      rawRows: [],
      summary: { totalItems: 0, categoriesFound: [], areaHeadersCount: 0, totalWeightKg: 0, totalCost: 0 },
    };
  }
}

/**
 * Generates TSV (Tab Separated Values) template text ready to copy into Excel or clipboard
 * Containing columns from No. to REMARK
 */
export function generateTsvTemplateString(
  categories?: WorkCategory[],
  workItems?: WorkItem[]
): string {
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
    'REMARK',
  ];

  const lines: string[] = [headers.join('\t')];

  const sampleItems: Array<{
    no: string;
    desc: string;
    notes: string;
    type: string;
    d1: string;
    d2: string;
    d3: string;
    dLen: string;
    d4: string;
    qty: string;
    unit: string;
    remark: string;
  }> = (workItems && workItems.length > 0)
    ? workItems.map((item) => ({
        no: item.itemNo || '',
        desc: item.description || '',
        notes: item.notes || '',
        type: item.type && item.type !== '-' ? item.type : '',
        d1: item.d1 ? String(item.d1) : '',
        d2: item.d2 ? String(item.d2) : '',
        d3: item.d3 ? String(item.d3) : '',
        dLen: item.dLen ? String(item.dLen) : '',
        d4: item.d4 ? String(item.d4) : '',
        qty: item.qty ? String(item.qty) : '',
        unit: item.unit || '',
        remark: item.remark || '',
      }))
    : [
        { no: '1', desc: 'Pelayanan Docking & Undocking Kapal', notes: '', type: '', d1: '', d2: '', d3: '', dLen: '', d4: '', qty: '1', unit: 'ls', remark: 'Sesuai Kontrak' },
        { no: '1', desc: '[AREA] LAMBUNG KAPAL (HULL AREA)', notes: '', type: '', d1: '', d2: '', d3: '', dLen: '', d4: '', qty: '', unit: '', remark: 'Area Lambung' },
        { no: '1.1', desc: '[SUB-SYSTEM] BOTTOM & SIDE SHELL BLASTING', notes: '', type: '', d1: '', d2: '', d3: '', dLen: '', d4: '', qty: '', unit: '', remark: 'Blasting Sa 2.0' },
        { no: '1.1.1', desc: 'High Pressure Water Jetting & Spot Blasting Sa 2.0', notes: 'Spot Blasting', type: '', d1: '', d2: '', d3: '', dLen: '', d4: '', qty: '450', unit: 'm²', remark: 'Area Bottom' },
        { no: '1', desc: '[AREA] PELAT KULIT LAMBUNG & STRUKTUR BAJA', notes: '', type: '', d1: '', d2: '', d3: '', dLen: '', d4: '', qty: '', unit: '', remark: 'Steel Repair' },
        { no: '1.1', desc: '[SUB-SYSTEM] BOTTOM PLATING FR. 20 - 35', notes: '', type: '', d1: '', d2: '', d3: '', dLen: '', d4: '', qty: '', unit: '', remark: 'Plating Bottom' },
        { no: '1.1.1', desc: 'Ganti Pelat Bottom Lajur A Tebal 12mm BKI Grade A', notes: 'Marine Grade A', type: 'PL', d1: '6000', d2: '1500', d3: '12', dLen: '', d4: '', qty: '2', unit: 'lbr', remark: 'Material Galangan' },
        { no: '1.1.2', desc: 'Ganti Besi Siku Frame Bottom L 75x75x9mm', notes: 'Profil Siku', type: 'EA', d1: '6000', d2: '75', d3: '9', dLen: '', d4: '', qty: '4', unit: 'btg', remark: 'Material Galangan' },
        { no: '1', desc: '[AREA] SISTEM PERPIPAAN KAMAR MESIN', notes: '', type: '', d1: '', d2: '', d3: '', dLen: '', d4: '', qty: '', unit: '', remark: 'Machinery Piping' },
        { no: '1.1', desc: '[SUB-SYSTEM] PIPA SEAWATER COOLING 3" SCH 40', notes: '', type: '', d1: '', d2: '', d3: '', dLen: '', d4: '', qty: '', unit: '', remark: 'Cooling Line' },
        { no: '1.1.1', desc: 'Fabrikasi & Pasang Pipa Galvanis 3" Sch 40', notes: 'Galvanized Sch 40', type: 'PP', d1: '6000', d2: '88.9', d3: '5.49', dLen: '', d4: '', qty: '3', unit: 'btg', remark: 'Ready Stock' },
      ];

  sampleItems.forEach((r) => {
    lines.push(
      [
        r.no,
        r.desc,
        r.notes,
        r.type,
        r.d1,
        r.d2,
        r.d3,
        r.dLen,
        r.d4,
        r.qty,
        r.unit,
        r.remark,
      ].join('\t')
    );
  });

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Export to CSV Function
// ---------------------------------------------------------------------------

export async function exportShipyardCsv(options: {
  categories: WorkCategory[];
  workItems: WorkItem[];
  vesselName?: string;
  includePrices?: boolean;
}): Promise<void> {
  const { categories, workItems, vesselName = 'Kapal', includePrices = true } = options;

  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
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
    'Berat Tonase (kg)',
  ];

  if (includePrices) {
    headers.push('Harga Satuan (Rp)', 'Total Biaya (Rp)');
  }

  const rows: string[][] = [headers];

  categories.forEach((cat) => {
    const catItems = workItems.filter((i) => i.categoryId === cat.id);
    if (catItems.length === 0) return;

    // Category row banner
    const catRow = [
      '',
      cat.name,
      `--- KATEGORI ${cat.code}: ${cat.name.toUpperCase()} ---`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ];
    if (includePrices) catRow.push('', '');
    rows.push(catRow);

    catItems.forEach((item) => {
      const isArea = item.isAreaHeader || item.itemLevel === 1;
      const isSub = item.itemLevel === 2;
      const isAreaOrSub = isArea || isSub;

      // Clean description without redundant [AREA] or [SUB-SYSTEM] tags
      const desc = item.description
        .replace(/^(\[AREA\]|\[SUB-SYSTEM\]|\[SUBSYSTEM\]|\[KOMPONEN\])\s*/i, '')
        .trim();

      const itemType = isAreaOrSub && (!item.type || item.type === '-') ? '' : item.type || '';
      const itemQty =
        item.qty !== undefined && item.qty > 0
          ? String(item.qty)
          : isAreaOrSub
          ? ''
          : '1';
      const itemUnit = isAreaOrSub && !item.unit ? '' : item.unit || (isAreaOrSub ? '' : 'kg');
      const itemWeight =
        item.weightKg && item.weightKg > 0 ? item.weightKg.toFixed(2) : '';

      const itemRow = [
        item.itemNo || '',
        cat.name,
        desc,
        item.progressNotes || item.remark || '',
        itemType,
        item.d1 || '',
        item.d2 || '',
        item.d3 || '',
        item.dLen || '',
        item.d4 || '',
        itemQty,
        itemUnit,
        itemWeight,
      ];

      if (includePrices) {
        itemRow.push(
          item.unitPrice ? String(item.unitPrice) : '',
          item.totalPrice ? String(item.totalPrice) : ''
        );
      }

      rows.push(itemRow);
    });
  });

  // UTF-8 BOM (\uFEFF) ensures Excel opens Indonesian & accents without garbled text
  const csvContent = '\uFEFF' + rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileNameSlug = vesselName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  link.download = `REPAIR_LIST_${fileNameSlug}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Export to JSON Function
// ---------------------------------------------------------------------------

export async function exportShipyardJson(options: {
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  categories: WorkCategory[];
  workItems: WorkItem[];
  surveys?: DefectSurvey[];
  signatures?: Signatures;
}): Promise<void> {
  const { vessel, schedule, categories, workItems, surveys, signatures } = options;

  const exportPayload = {
    exportDate: new Date().toISOString(),
    systemVersion: 'PPC Shipyard 2026.1',
    vessel,
    schedule,
    categories,
    workItems,
    defectSurveys: surveys || [],
    signatures: signatures || null,
    statistics: {
      totalItems: workItems.length,
      totalWeightKg: workItems.reduce((sum, i) => sum + (i.weightKg || 0), 0),
      totalCost: workItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0),
    },
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileNameSlug = vessel.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  link.download = `DATA_PROJECT_${fileNameSlug}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Download Template Functions (CSV & JSON)
// ---------------------------------------------------------------------------

export function generateCsvImportTemplate(
  categories?: WorkCategory[],
  workItems?: WorkItem[],
  vesselName?: string
): void {
  exportShipyardCsv({
    categories: categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES,
    workItems: workItems || [],
    vesselName: vesselName || 'TEMPLATE',
    includePrices: true,
  });
}

export function generateJsonImportTemplate(
  categories?: WorkCategory[],
  workItems?: WorkItem[],
  vesselName?: string
): void {
  const sampleItems: WorkItem[] = (workItems && workItems.length > 0)
    ? workItems
    : [
        {
          id: 'tpl-1',
          projectId: 'sample-project',
          categoryId: 'cat-7',
          itemNo: '1',
          description: '[AREA] PELAT KULIT LAMBUNG (SHELL PLATING)',
          type: '',
          d1: '',
          d2: '',
          d3: '',
          dLen: '',
          d4: '',
          qty: undefined,
          unit: '',
          weightKg: 0,
          unitPrice: 0,
          totalPrice: 0,
          itemLevel: 1,
          isAreaHeader: true,
        },
        {
          id: 'tpl-2',
          projectId: 'sample-project',
          categoryId: 'cat-7',
          itemNo: '1.1',
          description: '[SUB-SYSTEM] BOTTOM PLATING FR 45-55',
          type: '',
          d1: '',
          d2: '',
          d3: '',
          dLen: '',
          d4: '',
          qty: undefined,
          unit: '',
          weightKg: 0,
          unitPrice: 0,
          totalPrice: 0,
          parentId: 'tpl-1',
          itemLevel: 2,
        },
        {
          id: 'tpl-3',
          projectId: 'sample-project',
          categoryId: 'cat-7',
          itemNo: '1.1.1',
          description: 'Ganti Pelat Bottom Tebal 12mm BKI Grade A',
          type: 'PL',
          d1: '6000',
          d2: '1500',
          d3: '12',
          dLen: '',
          d4: '',
          qty: 2,
          unit: 'lbr',
          weightKg: 1695.6,
          unitPrice: 28500,
          totalPrice: 48324600,
          parentId: 'tpl-2',
          itemLevel: 3,
        },
      ];

  const payload = {
    templateVersion: '1.0',
    description: 'Template Impor Daftar Pekerjaan Repair List Kapal',
    vesselName: vesselName || 'CONTOH KAPAL',
    workItems: sampleItems,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TEMPLATE_REPAIR_LIST_${vesselName ? vesselName.replace(/[^a-zA-Z0-9]/g, '_') : 'STANDAR'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Template Excel Generator with Live Formulas & Area/Subsystem Clean Layout
// ---------------------------------------------------------------------------

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
      const p = categoryItems.find((i) => i.id === item.parentId);
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

  categoryItems.forEach((item) => {
    const lvl = getLevelOfItem(item);
    if (lvl === 1) areas.push(item);
    else if (lvl === 2) subSystems.push(item);
    else components.push(item);
  });

  return { areas, subSystems, components };
}

function getWeightFormula(item: WorkItem, r: number): string | null {
  const matType = (item.type || '').toUpperCase();
  const descLower = (item.description || '').toLowerCase();

  if (
    matType.startsWith('PL') ||
    matType.includes('PLATE') ||
    matType.includes('PELAT') ||
    descLower.includes('pelat') ||
    descLower.includes('plate')
  ) {
    return `F${r}*G${r}*H${r}*0.00000785*K${r}`;
  }
  if (
    matType.startsWith('CQR') ||
    matType.includes('BORDES') ||
    matType.includes('CHEQUER') ||
    descLower.includes('bordes')
  ) {
    return `(F${r}*G${r}/1000000)*(IF(H${r}>0,H${r},12)*7.85+2.1014)*IF(J${r}>0,J${r},K${r})`;
  }
  if (matType.startsWith('GR') || matType.includes('GRATING') || descLower.includes('grating')) {
    return `(F${r}*G${r}/1000000)*(IF(H${r}>0,H${r},37.037))*IF(J${r}>0,J${r},K${r})`;
  }
  if (
    matType.startsWith('PP') ||
    matType.startsWith('PIPE') ||
    matType.startsWith('PIPA') ||
    descLower.includes('pipa')
  ) {
    return `(G${r}-H${r})*H${r}*0.0246615*(IF(I${r}>0,I${r}/1000,IF(F${r}>100,F${r}/1000,6)))*IF(J${r}>0,J${r},K${r})`;
  }
  if (
    matType.startsWith('RB') ||
    matType.startsWith('ROUND') ||
    matType.startsWith('AS ') ||
    descLower.includes('besi as')
  ) {
    return `0.006165*F${r}*F${r}*(IF(I${r}>0,I${r}/1000,6))*IF(J${r}>0,J${r},K${r})`;
  }
  if (
    matType.startsWith('FB') ||
    matType.includes('FLAT') ||
    descLower.includes('flat bar') ||
    descLower.includes('plat strip')
  ) {
    return `F${r}*H${r}*0.00785*(IF(I${r}>0,I${r}/1000,6))*IF(J${r}>0,J${r},K${r})`;
  }
  if (
    matType.startsWith('SB') ||
    matType.includes('SQUARE') ||
    matType.includes('NAKO') ||
    descLower.includes('nako')
  ) {
    return `H${r}*H${r}*0.00785*(IF(I${r}>0,I${r}/1000,6))*IF(J${r}>0,J${r},K${r})`;
  }
  if (
    matType.startsWith('EA') ||
    matType.startsWith('UA') ||
    matType.startsWith('L') ||
    matType.includes('ANGLE') ||
    descLower.includes('siku')
  ) {
    return `(F${r}+IF(G${r}>0,G${r},F${r})-H${r})*H${r}*0.00785*(IF(I${r}>0,I${r}/1000,6))*IF(J${r}>0,J${r},K${r})`;
  }

  return `IF(OR(L${r}="m",L${r}="meter"), (I${r}*K${r})/1000, 0)`;
}

export async function generateImportTemplate(
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
  // SHEET 1: REPAIR LIST & SPEK KAPAL (Lengkap dengan Spek & Foto Kapal)
  // ---------------------------------------------------------------------------
  const ws1 = workbook.addWorksheet('Repair List & Spek Kapal', {
    views: [{ showGridLines: true }],
  });

  ws1.columns = [
    { width: 9 },   // A: No
    { width: 42 },  // B: WORK ITEMS / SKEMA STRUKTUR HIERARKI
    { width: 24 },  // C: Keterangan
    { width: 14 },  // D: Type
    { width: 12 },  // E: D1
    { width: 12 },  // F: D2
    { width: 12 },  // G: D3
    { width: 14 },  // H: Panjang (dLen)
    { width: 12 },  // I: D4
    { width: 12 },  // J: Qty
    { width: 12 },  // K: Satuan
    { width: 28 },  // L: REMARK
  ];

  const totalCols = 12;

  // Row 1: Header Title
  ws1.mergeCells('A1:L1');
  const title1 = ws1.getCell('A1');
  title1.value = `TEMPLATE & DAFTAR PEKERJAAN REPAIR LIST - KAPAL ${vesselName.toUpperCase()}`;
  title1.font = { name: 'Arial', bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF03442C' } };
  title1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(1).height = 30;

  // Row 2: Subtitle
  ws1.mergeCells('A2:L2');
  const sub1 = ws1.getCell('A2');
  sub1.value = 'Dokumen Standar Repair List Galangan Kapal (Lengkap dengan Spesifikasi Kapal, Jadwal & Foto)';
  sub1.font = { name: 'Arial', italic: true, size: 9, color: { argb: 'FF334155' } };
  sub1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sub1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(2).height = 20;

  // Row 3: Blank
  ws1.getRow(3).height = 6;

  // Row 4-8: Vessel Specs & Project Schedule Header
  ws1.getCell('A4').value = 'SPESIFIKASI KAPAL (VESSEL PARTICULARS)';
  ws1.getCell('A4').font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF03442C' } };
  ws1.getCell('F4').value = 'JADWAL PROYEK DOCKING';
  ws1.getCell('F4').font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF03442C' } };
  ws1.getCell('J4').value = 'FOTO KAPAL (VESSEL PHOTO)';
  ws1.getCell('J4').font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF03442C' } };

  const specsLeft = [
    ['Nama Kapal', vessel?.name || vesselName, 'Dimensi', vessel?.dimension || '23,97 x 7,26 x 3,00 M'],
    ['Tipe Kapal', vessel?.vesselType || 'Tug Boat', 'Metode', vessel?.dockingType || 'Docking Repair'],
    ['Pemilik', vessel?.companyOwner || 'PT. PELAYARAN', 'No. Reg', vessel?.projectNo || 'E-081'],
    ['Klasifikasi', vessel?.classification || 'BKI', 'Survey', vessel?.kindOfSurvey || 'Intermediate Survey'],
  ];

  const specsRight = [
    ['Arrive @BGN', projSchedule.arriveBgn || '-', 'Contract', projSchedule.startContract || '-'],
    ['Meeting', projSchedule.arrivalMeeting || '-', 'Docking', projSchedule.dockingDate || '-'],
    ['Undocking', projSchedule.undockingDate || '-', 'Finish', projSchedule.finishWork || '-'],
    ['Sail Out', projSchedule.sailOut || '-', 'Posisi', projSchedule.dockingPosition || '#5'],
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

    ws1.mergeCells(`D${sRowIdx}:E${sRowIdx}`);
    const cellD = row.getCell(4);
    cellD.value = specsLeft[i][3];
    cellD.font = { name: 'Arial', size: 8.5, color: { argb: 'FF0F172A' } };
    cellD.border = specBorder;

    // Right schedule
    row.getCell(6).value = specsRight[i][0];
    row.getCell(6).font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF475569' } };
    row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    row.getCell(6).border = specBorder;

    row.getCell(7).value = specsRight[i][1];
    row.getCell(7).font = { name: 'Arial', size: 8.5, color: { argb: 'FF0F172A' } };
    row.getCell(7).border = specBorder;

    row.getCell(8).value = specsRight[i][2];
    row.getCell(8).font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF475569' } };
    row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    row.getCell(8).border = specBorder;

    row.getCell(9).value = specsRight[i][3];
    row.getCell(9).font = { name: 'Arial', size: 8.5, color: { argb: 'FF0F172A' } };
    row.getCell(9).border = specBorder;

    sRowIdx++;
  }

  // Vessel Photo area in rows 5-8, cols J-L
  ws1.mergeCells('J5:L8');
  const photoCell = ws1.getCell('J5');
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
        tl: { col: 9, row: 4 },
        br: { col: 12, row: 8 },
        editAs: 'oneCell',
      } as any);
    } catch (e) {
      console.warn('Could not embed photo in Excel template:', e);
      photoCell.value = `[Foto Kapal: ${vessel.name}]
(Gambar terpasang)`;
    }
  } else {
    photoCell.value = `[FOTO KAPAL - ${vessel?.name || 'VESSEL'}]
(Sisipkan gambar kapal di sini)`;
    photoCell.font = { name: 'Arial', italic: true, size: 8.5, color: { argb: 'FF64748B' } };
  }

  // Row 9: Blank
  ws1.getRow(9).height = 8;

  // Row 10: Column Headers (12 Columns: No. s/d REMARK)
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

  // Sample items to render if no work items exist
  const sampleTemplateItems: WorkItem[] = [
    { id: 'tpl-1', projectId: 'sample-project', categoryId: 'cat-1', itemNo: '1', description: 'Pelayanan Docking & Undocking Kapal', itemLevel: 3, qty: 1, unit: 'ls', unitPrice: 0, totalPrice: 0, remark: 'Sesuai Kontrak' },
    { id: 'tpl-2', projectId: 'sample-project', categoryId: 'cat-3', itemNo: '1', description: '[AREA] LAMBUNG KAPAL (HULL AREA)', itemLevel: 1, isAreaHeader: true, qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Area Lambung' },
    { id: 'tpl-3', projectId: 'sample-project', categoryId: 'cat-3', itemNo: '1.1', description: '[SUB-SYSTEM] BOTTOM & SIDE SHELL BLASTING', itemLevel: 2, parentId: 'tpl-2', qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Blasting Sa 2.0' },
    { id: 'tpl-4', projectId: 'sample-project', categoryId: 'cat-3', itemNo: '1.1.1', description: 'High Pressure Water Jetting & Spot Blasting Sa 2.0', itemLevel: 3, qty: 450, unit: 'm²', parentId: 'tpl-3', unitPrice: 0, totalPrice: 0, remark: 'Area Bottom' },
    { id: 'tpl-5', projectId: 'sample-project', categoryId: 'cat-7', itemNo: '1', description: '[AREA] PELAT KULIT LAMBUNG & STRUKTUR BAJA', itemLevel: 1, isAreaHeader: true, qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Steel Repair' },
    { id: 'tpl-6', projectId: 'sample-project', categoryId: 'cat-7', itemNo: '1.1', description: '[SUB-SYSTEM] BOTTOM PLATING FR. 20 - 35', itemLevel: 2, parentId: 'tpl-5', qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Plating Bottom' },
    { id: 'tpl-7', projectId: 'sample-project', categoryId: 'cat-7', itemNo: '1.1.1', description: 'Ganti Pelat Bottom Lajur A Tebal 12mm BKI Grade A', type: 'PL', d1: '6000', d2: '1500', d3: '12', qty: 2, unit: 'lbr', parentId: 'tpl-6', itemLevel: 3, unitPrice: 0, totalPrice: 0, remark: 'Material Galangan' },
    { id: 'tpl-8', projectId: 'sample-project', categoryId: 'cat-7', itemNo: '1.1.2', description: 'Ganti Besi Siku Frame Bottom L 75x75x9mm', type: 'EA', d1: '6000', d2: '75', d3: '9', qty: 4, unit: 'btg', parentId: 'tpl-6', itemLevel: 3, unitPrice: 0, totalPrice: 0, remark: 'Material Galangan' },
    { id: 'tpl-9', projectId: 'sample-project', categoryId: 'cat-8', itemNo: '1', description: '[AREA] SISTEM PERPIPAAN KAMAR MESIN', itemLevel: 1, isAreaHeader: true, qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Machinery Piping' },
    { id: 'tpl-10', projectId: 'sample-project', categoryId: 'cat-8', itemNo: '1.1', description: '[SUB-SYSTEM] PIPA SEAWATER COOLING 3" SCH 40', itemLevel: 2, parentId: 'tpl-9', qty: 0, unit: '', unitPrice: 0, totalPrice: 0, remark: 'Cooling Line' },
    { id: 'tpl-11', projectId: 'sample-project', categoryId: 'cat-8', itemNo: '1.1.1', description: 'Fabrikasi & Pasang Pipa Galvanis 3" Sch 40', type: 'PP', d1: '6000', d2: '88.9', d3: '5.49', qty: 3, unit: 'btg', parentId: 'tpl-10', itemLevel: 3, unitPrice: 0, totalPrice: 0, remark: 'Ready Stock' },
  ];

  const itemsToRender: WorkItem[] = activeWorkItems.length > 0 ? activeWorkItems : sampleTemplateItems;

  let currentRowIdx = 11;

  const addCategoryBanner = (catText: string) => {
    const r = ws1.getRow(currentRowIdx);
    r.height = 22;
    ws1.mergeCells(`A${currentRowIdx}:L${currentRowIdx}`);
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

    catItems.forEach((item) => {
      const row = ws1.getRow(currentRowIdx);
      row.height = 20;

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

      // Column L (12): Remark
      row.getCell(12).value = item.remark || '';

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
        else cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      currentRowIdx++;
    });
  });

  // ---------------------------------------------------------------------------
  // SHEET 2: TEMPLATE COPY-PASTE (NO - REMARK)
  // ---------------------------------------------------------------------------
  const ws2 = workbook.addWorksheet('Format Copy-Paste (No-REMARK)', {
    views: [{ showGridLines: true }],
  });

  ws2.columns = [
    { width: 8 },   // A: No
    { width: 38 },  // B: WORK ITEMS / SKEMA STRUKTUR HIERARKI
    { width: 22 },  // C: Keterangan
    { width: 12 },  // D: Type
    { width: 10 },  // E: D1
    { width: 10 },  // F: D2
    { width: 10 },  // G: D3
    { width: 12 },  // H: Panjang
    { width: 10 },  // I: D4
    { width: 10 },  // J: Qty
    { width: 10 },  // K: Satuan
    { width: 24 },  // L: REMARK
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
    row.getCell(12).value = item.remark || '';

    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.font = { name: 'Arial', size: 8.5 };
      if ([1, 4, 5, 6, 7, 8, 9, 10, 11].includes(c)) cell.alignment = { horizontal: 'center', vertical: 'middle' };
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
