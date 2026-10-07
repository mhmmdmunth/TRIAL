import { VesselSpec, ProjectSchedule, WorkCategory, WorkItem, Signatures, DefectSurvey } from '../types';
import { TonnageCalculator } from './tonnageCalculator';

export type WordDocumentType = 'repair-list' | 'bap' | 'cost-proposal' | 'progress-report';

export interface GenerateWordOptions {
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  categories: WorkCategory[];
  workItems: WorkItem[];
  surveys?: DefectSurvey[];
  defectSurveys?: DefectSurvey[];
  signatures: Signatures;
  includePrices?: boolean;
  docType?: WordDocumentType;
  customTitle?: string;
  notes?: string;
}

export async function exportShipyardWord(options: GenerateWordOptions): Promise<void> {
  const {
    vessel,
    schedule,
    categories,
    workItems,
    signatures,
    includePrices = false,
    docType = 'repair-list',
    customTitle,
    notes,
  } = options;

  const surveys = options.surveys || options.defectSurveys || [];

  const totalCost = workItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const totalWeightKg = workItems.reduce((sum, item) => sum + (item.weightKg || 0), 0);
  const totalWeightTon = totalWeightKg / 1000;
  const completedCount = workItems.filter(i => i.isCompleted || (i.progressPercent || 0) >= 100).length;
  const overallProgress = workItems.length > 0 ? Math.round((completedCount / workItems.length) * 100) : 0;

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let documentTitle = customTitle || 'REPAIR LIST & SCOPE OF WORK';
  let subtitle = `PROYEK DOCKING & REPARASI KAPAL - ${vessel.name.toUpperCase()}`;

  if (docType === 'bap') {
    documentTitle = 'BERITA ACARA PEMERIKSAAN & SURVEI KERUSAKAN KAPAL';
    subtitle = `OFFICIAL DAMAGE SURVEY & REPAIR RECOMMENDATION - ${vessel.name.toUpperCase()}`;
  } else if (docType === 'cost-proposal') {
    documentTitle = 'SURAT PENAWARAN & ESTIMASI BIAYA REPARASI KAPAL (RAB)';
    subtitle = `OWNER ESTIMATE & BUDGET BREAKDOWN - ${vessel.name.toUpperCase()}`;
  } else if (docType === 'progress-report') {
    documentTitle = 'LAPORAN MONITORING & PROGRES PEKERJAAN DOCKING';
    subtitle = `PROGRESS EVALUATION & WORK ACCOMPLISHMENT - ${vessel.name.toUpperCase()}`;
  }

  // Build HTML Table Content for Microsoft Word
  let tableRowsHtml = '';

  categories.forEach((cat) => {
    const catItems = workItems.filter((i) => i.categoryId === cat.id);
    if (catItems.length === 0) return;

    // Category Header Row
    tableRowsHtml += `
      <tr style="background-color: #0f172a; color: #ffffff;">
        <td colspan="${includePrices ? '9' : '7'}" style="padding: 8px 10px; font-weight: bold; font-size: 11pt; border: 1px solid #0f172a;">
          KATEGORI ${cat.code}: ${cat.name.toUpperCase()}
        </td>
      </tr>
    `;

    catItems.forEach((item) => {
      const isArea = item.isAreaHeader || item.itemLevel === 1;
      const isSub = item.itemLevel === 2;
      const isComp = item.itemLevel === 3;

      let rowBg = '#ffffff';
      let fontBold = 'normal';
      let indentPx = 5;

      if (isArea) {
        rowBg = '#e2e8f0';
        fontBold = 'bold';
        indentPx = 5;
      } else if (isSub) {
        rowBg = '#f8fafc';
        fontBold = '600';
        indentPx = 18;
      } else if (isComp) {
        rowBg = '#ffffff';
        fontBold = 'normal';
        indentPx = 30;
      }

      const dimensions = [item.d1, item.d2, item.d3, item.dLen, item.d4].filter(Boolean).join(' x ');
      const weightStr = item.weightKg && item.weightKg > 0 ? `${item.weightKg.toFixed(1)} kg` : '';
      const priceStr = item.unitPrice && item.unitPrice > 0 ? `Rp ${item.unitPrice.toLocaleString('id-ID')}` : '';
      const totalStr = item.totalPrice && item.totalPrice > 0 ? `Rp ${item.totalPrice.toLocaleString('id-ID')}` : '';
      const progressStr = `${item.progressPercent !== undefined ? item.progressPercent : (item.isCompleted ? 100 : 0)}%`;

      tableRowsHtml += `
        <tr style="background-color: ${rowBg};">
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-family: 'Courier New', monospace; font-weight: bold; text-align: left; vertical-align: top;">
            ${item.itemNo}
          </td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: ${fontBold}; padding-left: ${indentPx}px; vertical-align: top;">
            ${item.description}
            ${item.progressNotes ? `<br/><span style="font-size: 9pt; color: #047857; font-style: italic;">Catatan: ${item.progressNotes}</span>` : ''}
          </td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; vertical-align: top;">
            ${(item.type && item.type !== '0') ? item.type : ''}
          </td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; vertical-align: top;">
            ${dimensions || ''}
          </td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; vertical-align: top; white-space: nowrap;">
            ${item.qty && item.qty > 0 ? item.qty : ''}
          </td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; vertical-align: top; white-space: nowrap;">
            ${item.unit || ''}
          </td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; vertical-align: top; white-space: nowrap;">
            ${weightStr}
          </td>
          ${
            includePrices
              ? `
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; vertical-align: top; white-space: nowrap;">
              ${priceStr}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; vertical-align: top; white-space: nowrap;">
              ${totalStr}
            </td>
          `
              : ''
          }
        </tr>
      `;
    });
  });

  // Build Surveys Table if BAP mode or available
  let surveysSectionHtml = '';
  if (docType === 'bap' && surveys.length > 0) {
    let surveyRows = '';
    surveys.forEach((s) => {
      const dimStr = s.materialCategory === 'pipe'
        ? `OD ${s.outerDiameterMm || '-'}mm, WT ${s.wallThicknessMm || '-'}mm, L ${s.length}m`
        : `${s.length}m x ${s.width}m x ${s.thickness}mm`;
      surveyRows += `
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${s.id ? s.id.substring(0, 8) : 'SRV'}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${s.locationZone || '-'}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${s.defectDescription || '-'}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${dimStr}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${s.calculatedWeightKg ? s.calculatedWeightKg.toFixed(1) + ' kg' : '-'}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #047857;">${s.remedyAction || '-'}</td>
        </tr>
      `;
    });

    surveysSectionHtml = `
      <br/>
      <h3 style="color: #0f172a; font-size: 12pt; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-top: 20px;">
        DAFTAR TEMUAN SURVEY CACAT &amp; KERUSAKAN (DEFECT SURVEY LOG)
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 10px;" border="1">
        <thead>
          <tr style="background-color: #1e293b; color: #ffffff;">
            <th style="padding: 6px; border: 1px solid #1e293b;">Kode</th>
            <th style="padding: 6px; border: 1px solid #1e293b;">Zona / Area</th>
            <th style="padding: 6px; border: 1px solid #1e293b;">Uraian Cacat</th>
            <th style="padding: 6px; border: 1px solid #1e293b;">Dimensi</th>
            <th style="padding: 6px; border: 1px solid #1e293b;">Estimasi Berat</th>
            <th style="padding: 6px; border: 1px solid #1e293b;">Rekomendasi Penanganan</th>
          </tr>
        </thead>
        <tbody>
          ${surveyRows}
        </tbody>
      </table>
    `;
  }

  // Complete Word HTML Template
  const wordDocumentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${documentTitle}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 8.5in 11.0in;
          margin: 0.8in 0.8in 0.8in 0.8in;
          mso-header-margin: 0.5in;
          mso-footer-margin: 0.5in;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
          font-size: 10pt;
          color: #1e293b;
          line-height: 1.4;
        }
        h1, h2, h3, h4 {
          margin: 0;
          padding: 0;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- Document Header Banner -->
        <table style="width: 100%; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 15px;">
          <tr>
            <td style="width: 70%; vertical-align: top;">
              <h2 style="font-size: 14pt; color: #0f172a; font-weight: bold; letter-spacing: 0.5px;">
                ${documentTitle}
              </h2>
              <p style="font-size: 10pt; color: #475569; margin: 3px 0 0 0; font-weight: 600;">
                ${subtitle}
              </p>
              <p style="font-size: 9pt; color: #64748b; margin: 2px 0 0 0;">
                Dokumen Resmi Galangan &bull; Perencanaan &amp; Pengendalian Proyek (PPC)
              </p>
            </td>
            <td style="width: 30%; text-align: right; vertical-align: top; font-size: 9pt; color: #475569;">
              <strong>Tanggal Cetak:</strong> ${todayStr}<br/>
              <strong>No. Proyek:</strong> <span style="font-family: monospace; font-weight: bold;">${vessel.projectNo}</span><br/>
              <strong>Status Dokumen:</strong> <span style="color: #047857; font-weight: bold;">APPROVED</span>
            </td>
          </tr>
        </table>

        <!-- Vessel Specifications & Project Metadata Summary -->
        <table style="width: 100%; border: 1px solid #cbd5e1; background-color: #f8fafc; margin-bottom: 15px; font-size: 9.5pt;">
          <tr>
            <td style="padding: 8px 12px; width: 50%; vertical-align: top; border-right: 1px solid #cbd5e1;">
              <strong style="color: #0f172a; font-size: 10pt;">DATA TEKNIS KAPAL:</strong>
              <table style="width: 100%; margin-top: 5px; font-size: 9pt;">
                <tr><td style="width: 38%; color: #64748b;">Nama Kapal</td><td>: <strong>${vessel.name}</strong></td></tr>
                <tr><td style="color: #64748b;">Tipe Kapal</td><td>: ${vessel.vesselType || 'Tug Boat'}</td></tr>
                <tr><td style="color: #64748b;">Pemilik (Owner)</td><td>: ${vessel.companyOwner || '-'}</td></tr>
                <tr><td style="color: #64748b;">Ukuran Utama</td><td>: ${vessel.dimension || '-'}</td></tr>
                <tr><td style="color: #64748b;">Klasifikasi</td><td>: ${vessel.classification || 'BKI'}</td></tr>
                <tr><td style="color: #64748b;">Jenis Survey</td><td>: ${vessel.kindOfSurvey || 'Special Survey'}</td></tr>
              </table>
            </td>
            <td style="padding: 8px 12px; width: 50%; vertical-align: top;">
              <strong style="color: #0f172a; font-size: 10pt;">JADWAL DOCKING &amp; SUMMARY:</strong>
              <table style="width: 100%; margin-top: 5px; font-size: 9pt;">
                <tr><td style="width: 42%; color: #64748b;">Posisi Graving/Slip</td><td>: <strong>${schedule.dockingPosition || 'Slipway 01'}</strong></td></tr>
                <tr><td style="color: #64748b;">Periode Docking</td><td>: ${schedule.dockingDate} s/d ${schedule.undockingDate}</td></tr>
                <tr><td style="color: #64748b;">Durasi Pekerjaan</td><td>: <strong>${schedule.dockingDurationDays || 25} Hari Kalender</strong></td></tr>
                <tr><td style="color: #64748b;">Total Item Pekerjaan</td><td>: ${workItems.length} Pekerjaan</td></tr>
                <tr><td style="color: #64748b;">Total Estimasi Tonase</td><td>: <strong>${totalWeightTon.toFixed(2)} Ton (${totalWeightKg.toFixed(0)} kg)</strong></td></tr>
                ${includePrices ? `<tr><td style="color: #64748b;">Total Nilai RAB</td><td>: <strong style="color: #047857;">Rp ${totalCost.toLocaleString('id-ID')}</strong></td></tr>` : ''}
              </table>
            </td>
          </tr>
        </table>

        ${notes ? `
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 8px 12px; margin-bottom: 15px; font-size: 9pt; color: #1e3a8a;">
            <strong>Catatan / Ketentuan Khusus:</strong><br/>
            ${notes}
          </div>
        ` : ''}

        <!-- Main Repair List Table -->
        <h3 style="color: #0f172a; font-size: 11pt; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 8px;">
          RINCIAN ITEM PEKERJAAN REPARASI (SCOPE OF REPAIRS)
        </h3>

        <table style="width: 100%; border-collapse: collapse; font-size: 9pt;" border="1">
          <thead>
            <tr style="background-color: #1e293b; color: #ffffff; text-align: center; font-weight: bold;">
              <th style="padding: 7px 5px; border: 1px solid #1e293b; width: 9%;">No. Item</th>
              <th style="padding: 7px 8px; border: 1px solid #1e293b; text-align: left; width: 40%;">Uraian Pekerjaan / Spesifikasi Teknis</th>
              <th style="padding: 7px 5px; border: 1px solid #1e293b; width: 10%;">Tipe</th>
              <th style="padding: 7px 5px; border: 1px solid #1e293b; width: 12%;">Dimensi</th>
              <th style="padding: 7px 5px; border: 1px solid #1e293b; width: 8%;">Volume</th>
              <th style="padding: 7px 5px; border: 1px solid #1e293b; width: 6%;">Satuan</th>
              <th style="padding: 7px 5px; border: 1px solid #1e293b; width: 10%;">Tonase</th>
              ${includePrices ? `
                <th style="padding: 7px 5px; border: 1px solid #1e293b; width: 12%;">Harga Satuan</th>
                <th style="padding: 7px 5px; border: 1px solid #1e293b; width: 13%;">Total Harga</th>
              ` : ''}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
          ${includePrices ? `
            <tfoot>
              <tr style="background-color: #0f172a; color: #ffffff; font-weight: bold;">
                <td colspan="6" style="padding: 8px; text-align: right; border: 1px solid #0f172a;">
                  TOTAL KESELURUHAN ESTIMASI BIAYA (RAB):
                </td>
                <td style="padding: 8px; text-align: right; border: 1px solid #0f172a; white-space: nowrap;">
                  ${totalWeightTon.toFixed(2)} Ton
                </td>
                <td style="padding: 8px; text-align: right; border: 1px solid #0f172a;"></td>
                <td style="padding: 8px; text-align: right; border: 1px solid #0f172a; font-size: 10.5pt; white-space: nowrap;">
                  Rp ${totalCost.toLocaleString('id-ID')}
                </td>
              </tr>
            </tfoot>
          ` : ''}
        </table>

        <!-- Surveys Section if applicable -->
        ${surveysSectionHtml}

        <!-- Signatures Matrix Block -->
        <br/>
        <table style="width: 100%; border: 1px solid #cbd5e1; background-color: #ffffff; margin-top: 25px; page-break-inside: avoid; text-align: center; font-size: 9.5pt;">
          <tr style="background-color: #f1f5f9; font-weight: bold; color: #334155;">
            <td style="padding: 6px; width: 33.33%; border: 1px solid #cbd5e1;">Dipersiapkan Oleh (PPC)</td>
            <td style="padding: 6px; width: 33.33%; border: 1px solid #cbd5e1;">Diperiksa Oleh (Leader)</td>
            <td style="padding: 6px; width: 33.33%; border: 1px solid #cbd5e1;">Disetujui Oleh (Owner Rep / BKI)</td>
          </tr>
          <tr>
            <td style="padding: 40px 10px 10px 10px; border: 1px solid #cbd5e1; vertical-align: bottom;">
              <strong style="text-decoration: underline; color: #0f172a;">${signatures.preparedByName || 'Muhammad Munthaha'}</strong><br/>
              <span style="font-size: 8.5pt; color: #64748b;">${signatures.preparedByTitle || 'PPC Engineer'}</span>
            </td>
            <td style="padding: 40px 10px 10px 10px; border: 1px solid #cbd5e1; vertical-align: bottom;">
              <strong style="text-decoration: underline; color: #0f172a;">${signatures.reviewedByName || 'Muhammad Fadel R'}</strong><br/>
              <span style="font-size: 8.5pt; color: #64748b;">${signatures.reviewedByTitle || 'Project Leader'}</span>
            </td>
            <td style="padding: 40px 10px 10px 10px; border: 1px solid #cbd5e1; vertical-align: bottom;">
              <strong style="text-decoration: underline; color: #0f172a;">${signatures.verifiedByName || 'Owner Representative'}</strong><br/>
              <span style="font-size: 8.5pt; color: #64748b;">${signatures.verifiedByTitle || 'Owner Surveyor / BKI'}</span>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  // Create downloadable Blob for Microsoft Word (.doc format recognized by Word)
  const blob = new Blob(['\ufeff', wordDocumentHtml], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const cleanVesselName = vessel.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${docType.toUpperCase()}_${cleanVesselName}_${vessel.projectNo}.doc`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
