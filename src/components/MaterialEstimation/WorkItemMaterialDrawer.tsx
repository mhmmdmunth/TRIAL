import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Box,
  Layers,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  DollarSign,
  PackageCheck,
  AlertCircle,
  Copy,
} from 'lucide-react';
import {
  WorkItem,
  ProjectMaterialEstimate,
  WorkCategory,
} from '../../types';
import {
  MATERIAL_CLASSIFICATIONS,
  MATERIAL_PROCUREMENT_STATUSES,
} from '../../services/materialEstimationService';

interface WorkItemMaterialDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workItem: WorkItem | null;
  category?: WorkCategory;
  materials: ProjectMaterialEstimate[];
  onAddMaterial: (item: Omit<ProjectMaterialEstimate, 'id' | 'projectId' | 'totalCost' | 'totalQtyWithBuffer' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateMaterial: (item: ProjectMaterialEstimate) => void;
  onDeleteMaterial: (id: string) => void;
  onOpenFullView: () => void;
  onEditMaterialInModal?: (item: ProjectMaterialEstimate) => void;
  onOpenAddModalWithWorkItem?: (workItemId: string) => void;
}

export const WorkItemMaterialDrawer: React.FC<WorkItemMaterialDrawerProps> = ({
  isOpen,
  onClose,
  workItem,
  category,
  materials,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onOpenFullView,
  onEditMaterialInModal,
  onOpenAddModalWithWorkItem,
}) => {
  if (!isOpen || !workItem) return null;

  // Filter materials for this work item
  const itemMaterials = materials.filter((m) => m.workItemId === workItem.id);
  const totalItemMaterialCost = itemMaterials.reduce((sum, m) => sum + (m.totalCost || 0), 0);
  const totalItemWeightKg = itemMaterials.reduce((sum, m) => sum + (m.calculatedWeightKg || 0), 0);

  const getStatusBadge = (status: string) => {
    const meta = MATERIAL_PROCUREMENT_STATUSES.find((s) => s.id === status);
    if (!meta) {
      return (
        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-full border border-slate-300">
          {status}
        </span>
      );
    }
    return (
      <span
        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border flex items-center gap-1.5 ${meta.badgeBg} ${meta.badgeBorder} ${meta.badgeText}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
        <span>{meta.label}</span>
      </span>
    );
  };

  const getClassificationMeta = (cls: string) => {
    return MATERIAL_CLASSIFICATIONS.find((m) => m.id === cls);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500 text-white font-mono font-bold text-xs rounded">
                  No. {workItem.itemNo}
                </span>
                <span className="text-xs text-slate-300">
                  {category ? `Kategori ${category.code}. ${category.name}` : 'Item Repair List'}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-1 line-clamp-1">
                Estimasi Material: {workItem.description}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Work Item Context Card */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Detail Pekerjaan Reparasi
              </div>
              <p className="text-xs text-slate-800 font-semibold mt-0.5">
                {workItem.description}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-slate-500">Volume / Tonase</div>
              <div className="font-mono font-bold text-xs text-slate-800">
                {workItem.qty || '-'} {workItem.unit}
                {workItem.weightKg ? ` (${workItem.weightKg} kg)` : ''}
              </div>
            </div>
          </div>

          {workItem.type && (
            <div className="flex items-center gap-2 text-xs pt-1">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-mono font-bold rounded text-[11px]">
                {workItem.type}
              </span>
              {(workItem.d1 || workItem.d2 || workItem.d3 || workItem.dLen) && (
                <span className="text-slate-600 font-mono text-[11px]">
                  Dimensi: {workItem.d1 || '-'} x {workItem.d2 || '-'} x {workItem.d3 || '-'}{' '}
                  {workItem.dLen ? `(Panjang: ${workItem.dLen}mm)` : ''}
                </span>
              )}
            </div>
          )}

          {/* Subtotal metrics */}
          <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500">
                Jumlah Material:{' '}
                <strong className="text-slate-800 font-bold">{itemMaterials.length} item</strong>
              </span>
              {totalItemWeightKg > 0 && (
                <span className="text-slate-500">
                  Total Tonase:{' '}
                  <strong className="text-amber-900 font-bold font-mono">
                    {totalItemWeightKg.toLocaleString('id-ID')} kg
                  </strong>
                </span>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase">
                Total Biaya Material
              </span>
              <span className="text-sm font-extrabold text-emerald-800 font-mono">
                Rp {totalItemMaterialCost.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar in Drawer */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs font-bold text-slate-700">
            Daftar Material yang Diperlukan (BOM)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAddModalWithWorkItem?.(workItem.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Material</span>
            </button>
          </div>
        </div>

        {/* Material List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {itemMaterials.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Box className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <h3 className="text-sm font-bold text-slate-700">
                Belum Ada Estimasi Material untuk Item Ini
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Klik tombol di bawah untuk menambahkan material (baja, pipa, cat, elektroda, dsb)
                yang dibutuhkan untuk menyelesaikan item pekerjaan ini.
              </p>
              <button
                type="button"
                onClick={() => onOpenAddModalWithWorkItem?.(workItem.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Material untuk Item Ini</span>
              </button>
            </div>
          ) : (
            itemMaterials.map((mat, idx) => {
              const clsMeta = getClassificationMeta(mat.classification);
              return (
                <div
                  key={mat.id}
                  className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 shadow-2xs hover:shadow-xs transition-all space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {mat.materialCode}
                        </span>
                        {clsMeta && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${clsMeta.badgeBg} ${clsMeta.badgeBorder} ${clsMeta.badgeText}`}
                          >
                            {clsMeta.shortLabel}
                          </span>
                        )}
                        {getStatusBadge(mat.procurementStatus)}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-950 transition-colors">
                        {mat.materialName}
                      </h4>

                      {mat.specification && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {mat.specification}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-emerald-800 font-mono">
                        Rp {mat.totalCost.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {mat.totalQtyWithBuffer} {mat.unit} @ Rp {mat.unitPrice.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  {/* Material Specs Details */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
                    <div className="flex items-center gap-3">
                      {mat.calculatedWeightKg && mat.calculatedWeightKg > 0 && (
                        <span>
                          Berat: <strong className="font-mono">{mat.calculatedWeightKg} kg</strong>
                        </span>
                      )}
                      {mat.qtyBufferPercent ? (
                        <span>
                          Margin Waste: <strong className="font-mono">{mat.qtyBufferPercent}%</strong>
                        </span>
                      ) : null}
                      {mat.supplierName && (
                        <span className="text-slate-500">
                          Supplier: <strong className="text-slate-700">{mat.supplierName}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 opacity-90">
                      <button
                        type="button"
                        onClick={() => onEditMaterialInModal?.(mat)}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Material"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMaterial(mat.id)}
                        className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Hapus Material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullView();
            }}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Buka Tab Estimasi Material Lengkap</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
