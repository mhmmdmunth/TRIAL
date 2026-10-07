import { WorkCategory, WorkItem, VesselSpec } from '../types';
import { getGoogleAccessToken, clearGoogleAccessToken } from './googleAuthService';
import { parseImportFile, validateWorkItemsForSqlite } from '../utils/fileImport';

export interface LinkedSpreadsheet {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  sheetName: string;
  lastSyncedAt?: string;
  totalRows?: number;
}

const STORAGE_KEY_PREFIX = 'shipyard_linked_sheet_';

export class GoogleSheetsService {
  /**
   * Get currently linked spreadsheet for a given project
   */
  public getLinkedSpreadsheet(projectId: string): LinkedSpreadsheet | null {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to get linked spreadsheet', e);
    }
    return null;
  }

  /**
   * Save linked spreadsheet reference
   */
  public saveLinkedSpreadsheet(projectId: string, linked: LinkedSpreadsheet): void {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify(linked));
    } catch (e) {
      console.warn('Failed to save linked spreadsheet', e);
    }
  }

  /**
   * Remove linked spreadsheet reference
   */
  public unlinkSpreadsheet(projectId: string): void {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    } catch (e) {
      console.warn('Failed to unlink spreadsheet', e);
    }
  }

  /**
   * Extract Spreadsheet ID from full URL or return ID directly
   */
  public parseSpreadsheetId(urlOrId: string): string | null {
    if (!urlOrId) return null;
    const clean = urlOrId.trim();
    // Matches /spreadsheets/d/([a-zA-Z0-9-_]+)
    const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    // If it's already an ID (alphanumeric with - and _)
    if (/^[a-zA-Z0-9-_]{20,}$/.test(clean)) {
      return clean;
    }
    return null;
  }

  /**
   * Create a new formatted Google Spreadsheet for the Repair List
   */
  public async createRepairListSpreadsheet(
    vessel: VesselSpec,
    categories: WorkCategory[],
    workItems: WorkItem[]
  ): Promise<LinkedSpreadsheet> {
    const token = await getGoogleAccessToken();
    if (!token) {
      throw new Error('Autentikasi Google diperlukan. Silakan login ke Google terlebih dahulu.');
    }

    const title = `Repair List & RAB Kapal ${vessel.name || 'Shipyard'} (${vessel.projectNo || 'Proj'})`;
    const sheetTitle = 'Repair List & RAB';

    // 1. Create Spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title,
        },
        sheets: [
          {
            properties: {
              title: sheetTitle,
              gridProperties: {
                rowCount: Math.max(100, workItems.length + 50),
                columnCount: 16,
                frozenRowCount: 4,
              },
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      const msg = err.error?.message || '';
      if (createRes.status === 403 || msg.toLowerCase().includes('scope') || msg.toLowerCase().includes('permission')) {
        clearGoogleAccessToken();
        throw new Error('Izin akses Google Sheets diperlukan. Silakan klik "Sign in with Google" untuk memberikan izin akses.');
      }
      throw new Error(msg || 'Gagal membuat Google Spreadsheet baru.');
    }

    const createdData = await createRes.json();
    const spreadsheetId = createdData.spreadsheetId;
    const spreadsheetUrl = createdData.spreadsheetUrl;

    // 2. Prepare Data Rows
    const values: (string | number)[][] = [];

    // Title Row 1
    values.push([
      `REPAIR LIST & ESTIMASI BIAYA (RAB GALANGAN) - ${vessel.name.toUpperCase()}`,
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    ]);

    // Subtitle Row 2
    values.push([
      `Kapal: ${vessel.name} | No. Proyek: ${vessel.projectNo} | Kelas: ${vessel.classification} | Owner: ${vessel.companyOwner}`,
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    ]);

    // Blank Row 3
    values.push([]);

    // Header Row 4
    values.push([
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
      'Harga Satuan (Rp)',
      'Total Biaya (Rp)',
    ]);

    let rowPointer = 5;
    categories.forEach((cat) => {
      const catItems = workItems.filter((i) => i.categoryId === cat.id);
      if (catItems.length === 0) return;

      // Category Banner Row
      values.push([
        `${cat.code} - ${cat.name.toUpperCase()}`,
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      ]);
      rowPointer++;

      catItems.forEach((it) => {
        const isArea = it.isAreaHeader || it.itemLevel === 1;
        const isSub = it.itemLevel === 2;

        let descText = it.description;
        if (isArea && !descText.includes('[AREA]')) {
          descText = `[AREA] ${descText}`;
        } else if (isSub && !descText.includes('[SUB-SYSTEM]')) {
          descText = `[SUB-SYSTEM] ${descText}`;
        }

        const r = rowPointer;
        // Generate weight formula in cell M (Column 13)
        let weightFormula = '';
        const matType = (it.type || '').toUpperCase();
        if (matType.startsWith('PL') || matType.includes('PLATE') || matType.includes('PELAT')) {
          weightFormula = `=F${r}*G${r}*H${r}*0.00000785*K${r}`;
        } else if (matType.startsWith('PP') || matType.includes('PIPE') || matType.includes('PIPA')) {
          weightFormula = `=(G${r}-H${r})*H${r}*0.0246615*(IF(I${r}>0,I${r}/1000,IF(F${r}>100,F${r}/1000,6)))*IF(J${r}>0,J${r},K${r})`;
        } else if (matType.startsWith('RB') || matType.includes('ROUND') || matType.includes('AS ')) {
          weightFormula = `=0.006165*F${r}*F${r}*(IF(I${r}>0,I${r}/1000,6))*IF(J${r}>0,J${r},K${r})`;
        } else if (matType.startsWith('EA') || matType.startsWith('L') || matType.includes('ANGLE') || matType.includes('SIKU')) {
          weightFormula = `=(F${r}+IF(G${r}>0,G${r},F${r})-H${r})*H${r}*0.00785*(IF(I${r}>0,I${r}/1000,6))*IF(J${r}>0,J${r},K${r})`;
        } else {
          weightFormula = it.weightKg ? String(it.weightKg) : '';
        }

        const totalCostFormula = it.unitPrice ? `=K${r}*N${r}` : (it.totalPrice ? String(it.totalPrice) : '');

        values.push([
          it.itemNo || '',
          cat.name,
          descText,
          it.notes || '',
          it.type || '',
          it.d1 ? Number(it.d1) || it.d1 : '',
          it.d2 ? Number(it.d2) || it.d2 : '',
          it.d3 ? Number(it.d3) || it.d3 : '',
          it.dLen ? Number(it.dLen) || it.dLen : '',
          it.d4 ? Number(it.d4) || it.d4 : '',
          it.qty !== undefined && it.qty !== null ? it.qty : '',
          it.unit || '',
          weightFormula,
          it.unitPrice || '',
          totalCostFormula,
        ]);
        rowPointer++;
      });
    });

    // 3. Write Values to Spreadsheet
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        sheetTitle
      )}!A1:O${values.length}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      }
    );

    // 4. Format Styles (Corporate Forest Green #03442C Headers, Auto-resizing)
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            // Merge Title Row 1
            {
              mergeCells: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 15 },
                mergeType: 'MERGE_ALL',
              },
            },
            // Style Title Row 1 (#03442C, White Bold Text)
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 15 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.012, green: 0.267, blue: 0.173 }, // #03442C
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                    textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 13 },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
              },
            },
            // Style Header Row 4 (#03442C)
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 15 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.012, green: 0.267, blue: 0.173 }, // #03442C
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                    wrapStrategy: 'WRAP',
                    textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 9 },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
              },
            },
          ],
        }),
      });
    } catch (styleErr) {
      console.warn('Non-fatal error applying styles to Google Sheet', styleErr);
    }

    const linked: LinkedSpreadsheet = {
      spreadsheetId,
      spreadsheetUrl,
      title,
      sheetName: sheetTitle,
      lastSyncedAt: new Date().toISOString(),
      totalRows: workItems.length,
    };

    return linked;
  }

  /**
   * Read raw values from Google Spreadsheet with OAuth and Link-Shared fallback
   */
  public async fetchSpreadsheetRawData(spreadsheetId: string, sheetName?: string): Promise<{ sheetTitle: string; rows: string[][] }> {
    const token = await getGoogleAccessToken();

    // Strategy 1: If OAuth token is available, attempt official Google Sheets API v4
    if (token) {
      try {
        let targetSheet = sheetName;
        if (!targetSheet) {
          const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (metaRes.ok) {
            const meta = await metaRes.json();
            targetSheet = meta.sheets?.[0]?.properties?.title || 'Sheet1';
          }
        }

        if (targetSheet) {
          const range = encodeURIComponent(`${targetSheet}!A1:Z5000`);
          const valRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (valRes.ok) {
            const data = await valRes.json();
            const rows: string[][] = (data.values || []).map((row: any[]) =>
              row.map((cell) => (cell !== null && cell !== undefined ? String(cell).trim() : ''))
            );
            if (rows.length > 0) {
              return { sheetTitle: targetSheet, rows };
            }
          }
        }
      } catch (apiErr) {
        console.warn('API fetch attempt failed, trying link-shared fallback:', apiErr);
      }
    }

    // Strategy 2: Link-Shared / Web CSV Exporter fallback (Works seamlessly with any shared Google Sheet)
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${
        sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : ''
      }`;
      const exportRes = await fetch(gvizUrl);
      if (exportRes.ok) {
        const text = await exportRes.text();
        if (text && !text.includes('<!DOCTYPE html>') && text.length > 10) {
          // Parse CSV rows
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          const rows = lines.map((line) => {
            const cells: string[] = [];
            let inQuotes = false;
            let current = '';
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  current += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                cells.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            cells.push(current.trim());
            return cells;
          });

          if (rows.length > 0) {
            return { sheetTitle: sheetName || 'Google Sheet', rows };
          }
        }
      }
    } catch (csvErr) {
      console.warn('CSV export fallback failed:', csvErr);
    }

    // If both failed
    if (!token) {
      throw new Error(
        'Tidak dapat mengakses Google Spreadsheet. Pastikan Spreadsheet disetel ke "Siapa saja yang memiliki link dapat melihat" atau login dengan Google.'
      );
    } else {
      throw new Error(
        'Izin akses Google Sheets diperlukan atau spreadsheet tidak ditemukan. Silakan klik "Sign in with Google" untuk memberikan izin akses.'
      );
    }
  }

  /**
   * Pull and Parse Google Sheets rows directly into validated WorkItem[] array
   */
  public async pullAndParseWorkItems(
    spreadsheetId: string,
    projectId: string,
    categories: WorkCategory[],
    sheetName?: string
  ) {
    const { sheetTitle, rows } = await this.fetchSpreadsheetRawData(spreadsheetId, sheetName);

    if (rows.length === 0) {
      throw new Error('Google Spreadsheet kosong atau tidak memiliki data baris.');
    }

    // Convert 2D rows to a virtual CSV-like format to feed our unified robust parseImportFile parser
    const csvContent = rows
      .map((row) =>
        row
          .map((c) => {
            if (c.includes(',') || c.includes('"') || c.includes('\n')) {
              return `"${c.replace(/"/g, '""')}"`;
            }
            return c;
          })
          .join(',')
      )
      .join('\n');

    const virtualFile = new File([csvContent], `${sheetTitle}.csv`, { type: 'text/csv' });
    const parseResult = await parseImportFile(virtualFile, categories);

    return {
      sheetTitle,
      parseResult,
      rawRowCount: rows.length,
    };
  }

  /**
   * Push application work items directly to Google Sheets (Inline live update)
   */
  public async pushWorkItemsToSpreadsheet(
    spreadsheetId: string,
    sheetName: string,
    categories: WorkCategory[],
    workItems: WorkItem[]
  ): Promise<{ updatedCells: number }> {
    const token = await getGoogleAccessToken();
    if (!token) {
      throw new Error('Autentikasi Google diperlukan. Silakan login ke akun Google.');
    }

    const values: (string | number)[][] = [];

    // Header Row
    values.push([
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
      'Harga Satuan (Rp)',
      'Total Biaya (Rp)',
    ]);

    let rowPointer = 5;
    categories.forEach((cat) => {
      const catItems = workItems.filter((i) => i.categoryId === cat.id);
      if (catItems.length === 0) return;

      // Category Banner Row
      values.push([
        `${cat.code} - ${cat.name.toUpperCase()}`,
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      ]);
      rowPointer++;

      catItems.forEach((it) => {
        const isArea = it.isAreaHeader || it.itemLevel === 1;
        const isSub = it.itemLevel === 2;

        let descText = it.description;
        if (isArea && !descText.includes('[AREA]')) {
          descText = `[AREA] ${descText}`;
        } else if (isSub && !descText.includes('[SUB-SYSTEM]')) {
          descText = `[SUB-SYSTEM] ${descText}`;
        }

        const r = rowPointer;
        let weightFormula = '';
        const matType = (it.type || '').toUpperCase();
        if (matType.startsWith('PL') || matType.includes('PLATE') || matType.includes('PELAT')) {
          weightFormula = `=F${r}*G${r}*H${r}*0.00000785*K${r}`;
        } else if (matType.startsWith('PP') || matType.includes('PIPE') || matType.includes('PIPA')) {
          weightFormula = `=(G${r}-H${r})*H${r}*0.0246615*(IF(I${r}>0,I${r}/1000,IF(F${r}>100,F${r}/1000,6)))*IF(J${r}>0,J${r},K${r})`;
        } else if (matType.startsWith('RB') || matType.includes('ROUND') || matType.includes('AS ')) {
          weightFormula = `=0.006165*F${r}*F${r}*(IF(I${r}>0,I${r}/1000,6))*IF(J${r}>0,J${r},K${r})`;
        } else if (matType.startsWith('EA') || matType.startsWith('L') || matType.includes('ANGLE') || matType.includes('SIKU')) {
          weightFormula = `=(F${r}+IF(G${r}>0,G${r},F${r})-H${r})*H${r}*0.00785*(IF(I${r}>0,I${r}/1000,6))*IF(J${r}>0,J${r},K${r})`;
        } else {
          weightFormula = it.weightKg ? String(it.weightKg) : '';
        }

        const totalCostFormula = it.unitPrice ? `=K${r}*N${r}` : (it.totalPrice ? String(it.totalPrice) : '');

        values.push([
          it.itemNo || '',
          cat.name,
          descText,
          it.notes || '',
          it.type || '',
          it.d1 ? Number(it.d1) || it.d1 : '',
          it.d2 ? Number(it.d2) || it.d2 : '',
          it.d3 ? Number(it.d3) || it.d3 : '',
          it.dLen ? Number(it.dLen) || it.dLen : '',
          it.d4 ? Number(it.d4) || it.d4 : '',
          it.qty !== undefined && it.qty !== null ? it.qty : '',
          it.unit || '',
          weightFormula,
          it.unitPrice || '',
          totalCostFormula,
        ]);
        rowPointer++;
      });
    });

    // Clear and write from A4
    const range = encodeURIComponent(`${sheetName}!A4:O${Math.max(values.length + 10, 500)}`);
    // First clear old contents
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        sheetName
      )}!A4:O${3 + values.length}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      const msg = err.error?.message || '';
      if (updateRes.status === 403 || msg.toLowerCase().includes('scope') || msg.toLowerCase().includes('permission')) {
        clearGoogleAccessToken();
        throw new Error('Izin akses Google Sheets diperlukan. Silakan klik "Sign in with Google" untuk memberikan izin.');
      }
      throw new Error(msg || 'Gagal mengirim pembaruan data ke Google Sheets.');
    }

    const resData = await updateRes.json();
    return { updatedCells: resData.updatedCells || values.length * 15 };
  }
}

export const googleSheetsService = new GoogleSheetsService();
