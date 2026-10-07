import React, { useState } from 'react';
import {
  Plus,
  CloudOff,
  Cloud,
  ArrowRightCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Search,
  Scale,
  Sparkles,
} from 'lucide-react';
import { DefectSurvey } from '../types';
import { TonnageCalculator } from '../utils/tonnageCalculator';
import { TabExportImportButton } from './TabExportImportButton';

interface DefectSurveyListProps {
  surveys: DefectSurvey[];
  onOpenAddModal: () => void;
  onEditSurvey: (survey: DefectSurvey) => void;
  onDeleteSurvey: (id: string) => void;
  onConvertToWorkItem: (id: string) => void;
  onSyncAll: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  onExportWord?: () => void;
  onOpenImportModal?: () => void;
  onDownloadTemplate?: () => void;
  onOpenFullModal?: (tab?: 'export' | 'import') => void;
}

export const DefectSurveyList: React.FC<DefectSurveyListProps> = ({
  surveys,
  onOpenAddModal,
  onEditSurvey,
  onDeleteSurvey,
  onConvertToWorkItem,
  onSyncAll,
  onExportExcel,
  onExportPdf,
  onExportWord,
  onOpenImportModal,
  onDownloadTemplate,
  onOpenFullModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'ALL' | 'ABS' | 'BKI' | 'NC'>('ALL');

  const filteredSurveys = surveys.filter((s) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      s.locationZone.toLowerCase().includes(query) ||
      s.defectDescription.toLowerCase().includes(query) ||
      (s.plateType && s.plateType.toLowerCase().includes(query)) ||
      (s.remedyAction && s.remedyAction.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (selectedGradeFilter !== 'ALL') {
      const pt = (s.plateType || '').toUpperCase();
      if (!pt.includes(selectedGradeFilter)) return false;
    }

    return true;
  });

  const totalCalculatedTonnage = surveys.reduce(
    (acc, s) => acc + (s.calculatedWeightKg || 0),
    0
  );

  const getGradeBadgeStyle = (plateType?: string) => {
    const pt = (plateType || '').toUpperCase();
    if (pt.includes('ABS')) {
      return {
        bg: 'bg-blue-50 text-blue-800 border-blue-200',
        label: plateType || 'Grade ABS',
      };
    }
    if (pt.includes('NC') || pt.includes('NON-CLASS') || pt.includes('NON CLASS')) {
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        label: plateType || 'Grade NC',
      };
    }
    if (pt.includes('BKI')) {
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        label: plateType || 'Grade BKI',
      };
    }
    return {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      label: plateType || 'Baja Standar',
    };
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Defect Survey Lapangan (PPC / Hull Inspector)
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              {surveys.length} Catatan
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Mencatat deformasi, penipisan, dan keretakan pelat lambung kapal dengan perhitungan tonase baja real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Grade filter pills */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs overflow-x-auto scrollbar-none">
            {(['ALL', 'ABS', 'BKI', 'NC'] as const).map((grade) => (
              <button
                key={grade}
                onClick={() => setSelectedGradeFilter(grade)}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-all min-h-[32px] whitespace-nowrap cursor-pointer ${
                  selectedGradeFilter === grade
                    ? grade === 'ABS'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : grade === 'BKI'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : grade === 'NC'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {grade === 'ALL' ? 'Semua' : `Grade ${grade}`}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari zona / kerusakan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 w-full sm:w-44 md:w-52 min-h-[34px]"
            />
          </div>

          <button
            onClick={onSyncAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-colors min-h-[34px] cursor-pointer"
            title="Sinkronisasi data offline SQLite"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sync ke Server</span>
          </button>

          {/* Export & Import Tools for Defect Survey */}
          <TabExportImportButton
            tabName="defect-surveys"
            onExportExcel={onExportExcel}
            onExportPdf={onExportPdf}
            onExportWord={onExportWord}
            onOpenImportModal={onOpenImportModal}
            onDownloadTemplate={onDownloadTemplate}
            onOpenFullModal={onOpenFullModal}
          />

          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors min-h-[34px] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Input Kerusakan</span>
          </button>
        </div>
      </div>

      {/* Tonnage & Defect Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-amber-900 block">Total Estimasi Pelat Kerusakan</span>
            <span className="text-base font-bold text-amber-800">
              {TonnageCalculator.formatWeight(totalCalculatedTonnage)}
            </span>
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-blue-900 block">Tersambung ke BoQ Galangan</span>
            <span className="text-base font-bold text-blue-800">
              {surveys.filter((s) => s.transferredToWorkItemId).length} dari {surveys.length} Ditransfer
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <CloudOff className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-700 block">Penyimpanan Offline</span>
            <span className="text-base font-bold text-slate-800">
              SQLite Local Storage Active
            </span>
          </div>
        </div>
      </div>

      {/* Empty State (Matching Flutter _buildEmptyState) */}
      {filteredSurveys.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Lambung Kapal Aman</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Belum ada catatan survey kerusakan yang sesuai kriteria pencarian. Klik &quot;Input Kerusakan&quot; untuk menambahkan temuan survey baru.
          </p>
          <button
            onClick={onOpenAddModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Input Kerusakan Baru</span>
          </button>
        </div>
      )}

      {/* Survey Cards Grid (Responsive across Phone, Tablet, PC) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {filteredSurveys.map((item) => {
          const weight =
            item.calculatedWeightKg && item.calculatedWeightKg > 0
              ? item.calculatedWeightKg
              : TonnageCalculator.calculatePlateWeight({
                  length: item.length,
                  width: item.width,
                  thickness: item.thickness,
                });
          const formattedWeight = TonnageCalculator.formatWeight(weight);
          const isTransferred = Boolean(item.transferredToWorkItemId);

          return (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-4 flex flex-col justify-between"
            >
              <div>
                {/* Header: Zone & Sync Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>{item.locationZone}</span>
                    </h3>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Tercatat: {item.createdAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Sync Status icon from Flutter */}
                    <div
                      title={item.syncStatus === 0 ? 'Tersimpan Offline di SQLite' : 'Tersinkron ke Server Galangan'}
                      className={`p-1.5 rounded-full ${
                        item.syncStatus === 0
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {item.syncStatus === 0 ? (
                        <CloudOff className="w-4 h-4" />
                      ) : (
                        <Cloud className="w-4 h-4" />
                      )}
                    </div>

                    <button
                      onClick={() => onEditSurvey(item)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                      title="Edit Survey"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteSurvey(item.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Hapus Survey"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtitle: Defect Condition & Dimensions */}
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="text-slate-700">
                    <span className="font-semibold text-slate-900">Kondisi:</span>{' '}
                    {item.defectDescription}
                  </div>
                  <div className="text-slate-600 flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-slate-900">Dimensi:</span>{' '}
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 text-[11px] font-mono">
                      {item.length}m &times; {item.width}m &times; {item.thickness}mm
                    </code>
                    <span
                      className={`border px-2 py-0.5 rounded text-[11px] font-semibold ${
                        getGradeBadgeStyle(item.plateType).bg
                      }`}
                    >
                      {getGradeBadgeStyle(item.plateType).label}
                    </span>
                  </div>

                  {item.remedyAction && (
                    <div className="text-slate-600">
                      <span className="font-semibold text-slate-900">Rencana Perbaikan:</span>{' '}
                      <span className="text-blue-700 font-medium">{item.remedyAction}</span>
                    </div>
                  )}

                  {/* Calculated Weight Badge (Matching Flutter yellow Container) */}
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 rounded-md text-amber-900 border border-amber-200">
                    <Scale className="w-3.5 h-3.5 text-amber-700" />
                    <span className="font-bold text-xs">Estimasi Material: {formattedWeight}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Action: Convert / Transfer to BoQ Work Item */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {isTransferred ? (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Sudah Masuk Repair List (BoQ)
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 italic">
                    Belum ditransfer ke BoQ
                  </span>
                )}

                {!isTransferred && (
                  <button
                    onClick={() => onConvertToWorkItem(item.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-md border border-blue-200 transition-colors"
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                    <span>Masuk ke BoQ (Repair List)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
