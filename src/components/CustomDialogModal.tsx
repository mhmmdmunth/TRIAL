import React from 'react';
import { X, AlertTriangle, HelpCircle, Info } from 'lucide-react';

interface CustomDialogModalProps {
  isOpen: boolean;
  type: 'confirm' | 'alert';
  title: string;
  message: string;
  onConfirm?: () => void;
  onClose: () => void;
}

export const CustomDialogModal: React.FC<CustomDialogModalProps> = ({
  isOpen,
  type,
  title,
  message,
  onConfirm,
  onClose,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && (e.key === 'Escape' || e.key === 'Esc')) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              type === 'confirm' 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {type === 'confirm' ? (
                <HelpCircle className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-wide">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Body */}
        <div className="p-5 text-xs text-slate-600 leading-relaxed">
          {message}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          {type === 'confirm' ? (
            <>
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-lg transition-colors text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmClick}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs transition-colors text-xs flex items-center gap-1.5"
              >
                <span>Ya, Hapus/Lanjutkan</span>
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs transition-colors text-xs"
            >
              Mengerti
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
