import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, Download, Eye, ExternalLink, AlertCircle } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDataUrl: string;
  documentTitle: string;
  onDownload: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  pdfDataUrl,
  documentTitle,
  onDownload,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && (e.key === 'Escape' || e.key === 'Esc')) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setLoadError(false);
    }
  }, [isOpen, pdfDataUrl]);

  if (!isOpen) return null;

  const handlePrint = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      }
    } catch {
      // Fallback
    }
    window.open(pdfDataUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Pratinjau Cetak PDF</span>
                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium">
                  Ready to Print
                </span>
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-md">
                {documentTitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={pdfDataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              title="Buka PDF di tab baru jika pratinjau diblokir browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Tab Baru</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Tutup (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Body with Fallback */}
        <div className="flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
          {loadError ? (
            <div className="text-center p-6 bg-slate-800 rounded-xl border border-slate-700 max-w-md text-white space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm">Pratinjau Diblokir oleh Browser / Chrome</h4>
              <p className="text-xs text-slate-300">
                Keamanan browser atau ekstensi dapat memblokir pratinjau iframe. Anda dapat membuka PDF di tab baru atau langsung mengunduhnya.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <a
                  href={pdfDataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka PDF di Tab Baru</span>
                </a>
                <button
                  type="button"
                  onClick={onDownload}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File</span>
                </button>
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={`${pdfDataUrl}#view=FitH`}
              title={documentTitle}
              onError={() => setLoadError(true)}
              className="w-full h-full rounded-xl border border-slate-700 bg-white shadow-inner"
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Tips: Jika pratinjau bermasalah, gunakan tombol &quot;Buka di Tab Baru&quot; atau &quot;Cetak&quot;.
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <a
              href={pdfDataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden inline-flex items-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tab Baru</span>
            </a>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Print</span>
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
