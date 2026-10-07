import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Download,
  Printer,
  CheckSquare,
  ShieldCheck,
  UserCheck,
  Layout,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  VesselSpec,
  ProjectSchedule,
  WorkCategory,
  WorkItem,
  Signatures,
  DefectSurvey,
} from '../types';
import { exportShipyardPdf, getPdfBlobUrl, PdfDocumentType, PdfOrientation } from '../utils/pdfExport';
import { TonnageCalculator } from '../utils/tonnageCalculator';
import { PdfPreviewModal } from './PdfPreviewModal';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  categories: WorkCategory[];
  workItems: WorkItem[];
  signatures: Signatures;
  defectSurveys: DefectSurvey[];
  onSaveSignatures: (sig: Signatures) => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  vessel,
  schedule,
  categories,
  workItems,
  signatures,
  defectSurveys,
  onSaveSignatures,
}) => {
  const [docType, setDocType] = useState<PdfDocumentType>('repair-list');
  const [orientation, setOrientation] = useState<PdfOrientation>('landscape');
  const [includePrices, setIncludePrices] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  // Editable signatures state
  const [prepName, setPrepName] = useState(signatures.preparedByName);
  const [prepTitle, setPrepTitle] = useState(signatures.preparedByTitle);
  const [revName, setRevName] = useState(signatures.reviewedByName);
  const [revTitle, setRevTitle] = useState(signatures.reviewedByTitle);
  const [verName, setVerName] = useState(signatures.verifiedByName);
  const [verTitle, setVerTitle] = useState(signatures.verifiedByTitle);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPrepName(signatures.preparedByName || 'Muhammad Munthaha');
      setPrepTitle(signatures.preparedByTitle || 'PPC');
      setRevName(signatures.reviewedByName || 'Muhammad Fadel R');
      setRevTitle(signatures.reviewedByTitle || 'Project Leader');
      setVerName(signatures.verifiedByName || 'Owner Representative');
      setVerTitle(signatures.verifiedByTitle || 'Inspector');
    }
  }, [isOpen, signatures]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      const updatedSigs: Signatures = {
        preparedByName: prepName.trim() || 'Muhammad Munthaha',
        preparedByTitle: prepTitle.trim() || 'PPC',
        reviewedByName: revName.trim() || 'Muhammad Fadel R',
        reviewedByTitle: revTitle.trim() || 'Project Leader',
        verifiedByName: verName.trim() || 'Owner Representative',
        verifiedByTitle: verTitle.trim() || 'Inspector',
      };

      onSaveSignatures(updatedSigs);

      await exportShipyardPdf({
        vessel,
        schedule,
        categories,
        workItems,
        signatures: updatedSigs,
        defectSurveys,
        docType,
        orientation,
        includePrices: docType === 'cost-estimation' || includePrices,
      });

      onClose();
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewPdf = async () => {
    setIsPreviewLoading(true);
    try {
      const updatedSigs: Signatures = {
        preparedByName: prepName.trim() || 'Muhammad Munthaha',
        preparedByTitle: prepTitle.trim() || 'PPC',
        reviewedByName: revName.trim() || 'Muhammad Fadel R',
        reviewedByTitle: revTitle.trim() || 'Project Leader',
        verifiedByName: verName.trim() || 'Owner Representative',
        verifiedByTitle: verTitle.trim() || 'Inspector',
      };

      onSaveSignatures(updatedSigs);

      const dataUrl = await getPdfBlobUrl({
        vessel,
        schedule,
        categories,
        workItems,
        signatures: updatedSigs,
        defectSurveys,
        docType,
        orientation,
        includePrices: docType === 'cost-estimation' || includePrices,
      });

      setPreviewDataUrl(dataUrl);
      setIsPreviewOpen(true);
    } catch (e) {
      console.error('PDF preview error:', e);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const totalTonnage = workItems.reduce((acc, i) => acc + (i.weightKg || 0), 0);
  const totalCost = workItems.reduce((acc, i) => acc + (i.totalPrice || 0), 0);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Ekspor Laporan PDF Standar Repair List
                </h3>
                <p className="text-xs text-slate-500">
                  Format resmi galangan kapal Adaro / Dok ({vessel.name}).
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
            {/* Document Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Jenis Dokumen:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDocType('repair-list');
                    setIncludePrices(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    docType === 'repair-list' && !includePrices
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-xs ring-1 ring-emerald-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs block mb-0.5 text-emerald-950">Repair List Resmi</span>
                  <span className="text-[11px] text-slate-500 block leading-tight">
                    Format lembar kerja: Area, D1-D4, Qty, Tonase ({TonnageCalculator.formatWeight(totalTonnage)}).
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDocType('cost-estimation');
                    setIncludePrices(true);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    docType === 'cost-estimation'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs block mb-0.5 text-blue-950">Estimasi Biaya &amp; RAB</span>
                  <span className="text-[11px] text-slate-500 block leading-tight">
                    Lengkap dengan Tarif Satuan, Subtotal, dan Grand Total RAB.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocType('defect-survey')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    docType === 'defect-survey'
                      ? 'border-purple-600 bg-purple-50/80 text-purple-900 shadow-xs ring-1 ring-purple-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs block mb-0.5 text-purple-950">Defect Survey Field</span>
                  <span className="text-[11px] text-slate-500 block leading-tight">
                    Catatan kerusakan zona, dimensi pelat, dan tonase temuan lapangan.
                  </span>
                </button>
              </div>
            </div>

            {/* Orientation & Format Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-slate-500" />
                  <span>Orientasi Kertas:</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border text-center transition-all cursor-pointer ${
                      orientation === 'landscape'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Landscape (Lebar &amp; Rapi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border text-center transition-all cursor-pointer ${
                      orientation === 'portrait'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Portrait (Vertikal)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pilihan Kolom Tambahan:</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={docType === 'cost-estimation' || includePrices}
                    onChange={(e) => setIncludePrices(e.target.checked)}
                    disabled={docType === 'cost-estimation'}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium">Sertakan Kolom Harga &amp; Tarif (BoQ)</span>
                </label>
              </div>
            </div>

            {/* Document Content Details Preview */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Nama Kapal / Pemilik:</span>
                <span className="font-medium text-slate-900">{vessel.name} &bull; {vessel.companyOwner}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Jumlah Item Pekerjaan:</span>
                <span className="font-semibold text-slate-900">{workItems.length} Items (Hierarki Kategori &amp; Area)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Grand Total Tonase Baja:</span>
                <span className="font-bold text-amber-800">{TonnageCalculator.formatWeight(totalTonnage)}</span>
              </div>
              {(docType === 'cost-estimation' || includePrices) && (
                <div className="flex justify-between text-slate-600">
                  <span>Grand Total Estimasi Biaya:</span>
                  <span className="font-bold text-emerald-700">{TonnageCalculator.formatRupiah(totalCost)}</span>
                </div>
              )}
            </div>

            {/* Signatures Configuration */}
            <div className="border-t border-slate-200 pt-3">
              <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Verifikasi &amp; Tanda Tangan Dokumen (Lembar Pengesahan):</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                    Prepared by (PPC)
                  </label>
                  <input
                    type="text"
                    value={prepName}
                    onChange={(e) => setPrepName(e.target.value)}
                    placeholder="Muhammad Munthaha"
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={prepTitle}
                    onChange={(e) => setPrepTitle(e.target.value)}
                    placeholder="PPC"
                    className="w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                    Reviewed by (Pimpro)
                  </label>
                  <input
                    type="text"
                    value={revName}
                    onChange={(e) => setRevName(e.target.value)}
                    placeholder="Muhammad Fadel R"
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={revTitle}
                    onChange={(e) => setRevTitle(e.target.value)}
                    placeholder="Project Leader"
                    className="w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                    Verified by (Owner)
                  </label>
                  <input
                    type="text"
                    value={verName}
                    onChange={(e) => setVerName(e.target.value)}
                    placeholder="Owner Representative"
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={verTitle}
                    onChange={(e) => setVerTitle(e.target.value)}
                    placeholder="Owner Representative"
                    className="w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPreviewLoading || isGenerating}
                onClick={handlePreviewPdf}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isPreviewLoading ? 'Memproses Preview...' : 'Pratinjau Cetak'}</span>
              </button>
              <button
                type="button"
                disabled={isGenerating || isPreviewLoading}
                onClick={handleGeneratePdf}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Membuat PDF...' : 'Unduh Dokumen PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfDataUrl={previewDataUrl}
        documentTitle={`${vessel.name} - ${docType.toUpperCase()}`}
        onDownload={handleGeneratePdf}
      />
    </>
  );
};
